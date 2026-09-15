// components/notebook/watercolor.ts — the watercolour pass from docs/notebook-design.md.
//
// A single WebGL2 fullscreen-triangle program paints a source image as a
// cold-pressed watercolour wash. One 3x3 neighbourhood (nine taps at 1.5 CSS px)
// is fetched once and shared by every stage, plus one mip-level tap for the
// wet-edge mask, so the whole pass costs ten texture reads and a handful of
// value-noise evaluations per fragment.
//
// Stage order (the doc numbers them 1–7; the colour step runs before the
// granulation, bloom and paper stages so that they stay visible inside the
// lifted blacks — on pure black a multiplicative grain would vanish):
//   7. polar swirl of the sampling coordinates (hero only)
//   1. soft simplification — 5-tap cross blur, mixed 60/40 with the source
//   2. edge darkening — Sobel magnitude, colour *= 1 - 0.55 * edge
//   6. colour — desaturate 15 %, lift blacks toward --wash-space (#243A5E)
//   3. pigment granulation — two octaves of value noise, ±6 % luminance in darks
//   4. wet-edge bloom — darken the dark side of a boundary where luminance rises
//   5. paper — procedural grain (fine noise + faint fibres), strength `paper`
//
// Without WebGL2 the painter falls back to a plain cover-fit 2D draw and reports
// mode 'fallback'; the hero adds the CSS paper multiply in that case.

export type WatercolorMode = 'webgl2' | 'fallback';

export interface WatercolorOptions {
  /** Slowly turn the accretion-disk band around the image centre (hero only). */
  swirl?: boolean;
  /** Paper grain strength, 0–1. The design doc asks for 0.18. */
  paper?: number;
}

export interface WatercolorPainter {
  /** Size the backing store to `w` x `h` CSS pixels at `dpr`. */
  resize(w: number, h: number, dpr: number): void;
  /** Paint one frame; `timeSeconds` drives the swirl. */
  render(timeSeconds: number): void;
  /** Release GPU resources and listeners. The painter is unusable afterwards. */
  dispose(): void;
  readonly mode: WatercolorMode;
}

const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_res;      // canvas size, device px
uniform vec2 u_uvScale;  // cover-fit: uv = frag / u_res * u_uvScale + u_uvOffset
uniform vec2 u_uvOffset;
uniform vec2 u_pxuv;     // uv delta for one CSS pixel
uniform float u_dpr;
uniform float u_aspect;  // image height / width
uniform float u_time;
uniform float u_swirl;
uniform float u_paper;

out vec4 fragColor;

const vec3 WASH = vec3(0.1412, 0.2275, 0.3686); // #243A5E
const vec3 LUMA = vec3(0.299, 0.587, 0.114);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 7. Slow polar swirl around the image centre. Radius is measured in
// half-widths in an aspect-corrected (circular) space; the falloff is full
// inside the 0.18–0.55 ring, zero at the centre and fades out beyond the ring
// (the fade is wide so the shear never reads as a tear in the disk edge).
vec2 swirl(vec2 uv) {
  vec2 q = (uv - 0.5) * vec2(2.0, 2.0 * u_aspect);
  float r = length(q);
  float fall = smoothstep(0.0, 0.18, r) * (1.0 - smoothstep(0.55, 0.88, r));
  float a = u_time * 0.02 * fall * u_swirl;
  float s = sin(a);
  float c = cos(a);
  q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  return q / vec2(2.0, 2.0 * u_aspect) + 0.5;
}

// Neighbourhood taps read one mip level down (a 2x2 box) so the render's
// stair-stepped silhouettes do not turn into a sawtooth under the Sobel.
vec3 soft(vec2 uv) {
  return textureLod(u_image, uv, 1.0).rgb;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = swirl(frag / u_res * u_uvScale + u_uvOffset);
  vec2 d = u_pxuv * 1.5;

  vec3 c0 = texture(u_image, uv).rgb;
  vec3 cN = soft(uv + vec2(0.0, d.y));
  vec3 cS = soft(uv - vec2(0.0, d.y));
  vec3 cE = soft(uv + vec2(d.x, 0.0));
  vec3 cW = soft(uv - vec2(d.x, 0.0));
  vec3 cNE = soft(uv + d);
  vec3 cSW = soft(uv - d);
  vec3 cNW = soft(uv + vec2(-d.x, d.y));
  vec3 cSE = soft(uv + vec2(d.x, -d.y));

  // 1. Soft simplification.
  vec3 blur = (c0 + cN + cS + cE + cW) * 0.2;
  vec3 col = mix(c0, blur, 0.6);

  // 2. Sobel edge darkening.
  float lN = dot(cN, LUMA);
  float lS = dot(cS, LUMA);
  float lE = dot(cE, LUMA);
  float lW = dot(cW, LUMA);
  float lNE = dot(cNE, LUMA);
  float lSW = dot(cSW, LUMA);
  float lNW = dot(cNW, LUMA);
  float lSE = dot(cSE, LUMA);
  float gx = (lNE + 2.0 * lE + lSE) - (lNW + 2.0 * lW + lSW);
  float gy = (lNW + 2.0 * lN + lNE) - (lSW + 2.0 * lS + lSE);
  float edge = smoothstep(0.03, 0.45, length(vec2(gx, gy)));
  col *= 1.0 - 0.55 * edge;
  float lumWash = dot(col, LUMA);

  // 6. Colour: desaturate 15 %, lift blacks toward the space wash.
  col = mix(col, vec3(lumWash), 0.15);
  float lift = 1.0 - clamp(lumWash, 0.0, 1.0);
  col += WASH * lift * lift;
  float lum = dot(col, LUMA);

  // 3. Pigment granulation inside the darks: two octaves of value noise, with
  // a faint low-frequency pooling everywhere so the wash never reads as flat.
  vec2 px = frag / u_dpr;
  float grain = vnoise(px / 26.0) * 0.6 + vnoise(px / 9.0 + 17.3) * 0.4;
  float pool = vnoise(px / 150.0 + 5.9) * 0.6 + vnoise(px / 60.0 + 23.1) * 0.4;
  float dark = 1.0 - smoothstep(0.16, 0.5, lum);
  col *= 1.0 + 0.06 * (grain * 2.0 - 1.0) * dark + 0.035 * (pool * 2.0 - 1.0);

  // 4. Wet-edge bloom: a mip-blurred luminance mask; where the neighbourhood
  // is brighter than the pixel (luminance rises across the boundary) pigment
  // pools on the dark side and the ring darkens.
  float lumBlur = dot(textureLod(u_image, uv, 2.5).rgb, LUMA);
  float rise = smoothstep(0.02, 0.35, lumBlur - lumWash);
  col *= 1.0 - 0.32 * rise;

  // 5. Paper: fine grain plus faint horizontal and vertical fibres.
  float fine = vnoise(px * 0.48) * 0.7 + vnoise(px * 1.1 + 41.7) * 0.3;
  float fib1 = vnoise(px * vec2(0.05, 0.9) + 3.1);
  float fib2 = vnoise(px * vec2(0.85, 0.045) + 7.7);
  float paper = (fine - 0.5) * 1.5 + (fib1 - 0.5) * 0.5 + (fib2 - 0.5) * 0.3;
  col *= 1.0 + u_paper * paper;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

interface Fit {
  width: number;
  height: number;
  dpr: number;
}

function coverFit(image: HTMLImageElement, fit: Fit) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const W = Math.max(1, Math.round(fit.width * fit.dpr));
  const H = Math.max(1, Math.round(fit.height * fit.dpr));
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (W - dw) / 2;
  const oy = (H - dh) / 2;
  return { iw, ih, W, H, dw, dh, ox, oy };
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[watercolor] shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[watercolor] program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function uploadTexture(gl: WebGL2RenderingContext, image: HTMLImageElement): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

interface GlState {
  program: WebGLProgram;
  texture: WebGLTexture;
  uniforms: {
    res: WebGLUniformLocation | null;
    uvScale: WebGLUniformLocation | null;
    uvOffset: WebGLUniformLocation | null;
    pxuv: WebGLUniformLocation | null;
    dpr: WebGLUniformLocation | null;
    aspect: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    swirl: WebGLUniformLocation | null;
    paper: WebGLUniformLocation | null;
    image: WebGLUniformLocation | null;
  };
}

function createGlState(gl: WebGL2RenderingContext, image: HTMLImageElement): GlState | null {
  const program = buildProgram(gl);
  if (!program) return null;
  const texture = uploadTexture(gl, image);
  if (!texture) {
    gl.deleteProgram(program);
    return null;
  }
  const u = (name: string) => gl.getUniformLocation(program, name);
  return {
    program,
    texture,
    uniforms: {
      res: u('u_res'),
      uvScale: u('u_uvScale'),
      uvOffset: u('u_uvOffset'),
      pxuv: u('u_pxuv'),
      dpr: u('u_dpr'),
      aspect: u('u_aspect'),
      time: u('u_time'),
      swirl: u('u_swirl'),
      paper: u('u_paper'),
      image: u('u_image'),
    },
  };
}

function createGlPainter(
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: WatercolorOptions,
): WatercolorPainter | null {
  let state = createGlState(gl, image);
  if (!state) return null;

  const swirl = options.swirl ? 1 : 0;
  const paper = Math.min(1, Math.max(0, options.paper ?? 0.18));
  let fit: Fit | null = null;
  let lost = false;
  let disposed = false;

  const applyStatic = (s: GlState) => {
    gl.useProgram(s.program);
    gl.uniform1i(s.uniforms.image, 0);
    gl.uniform1f(s.uniforms.swirl, swirl);
    gl.uniform1f(s.uniforms.paper, paper);
    const aspect = (image.naturalHeight || image.height) / (image.naturalWidth || image.width);
    gl.uniform1f(s.uniforms.aspect, aspect);
  };

  const applyFit = (s: GlState, f: Fit) => {
    const { W, H, dw, dh, ox, oy } = coverFit(image, f);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    gl.viewport(0, 0, W, H);
    gl.useProgram(s.program);
    gl.uniform2f(s.uniforms.res, W, H);
    const sx = W / dw;
    const sy = H / dh;
    gl.uniform2f(s.uniforms.uvScale, sx, sy);
    gl.uniform2f(s.uniforms.uvOffset, -ox / dw, -oy / dh);
    gl.uniform2f(s.uniforms.pxuv, (sx * f.dpr) / W, (sy * f.dpr) / H);
    gl.uniform1f(s.uniforms.dpr, f.dpr);
  };

  applyStatic(state);

  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    state = null;
  };
  const onRestored = () => {
    if (disposed) return;
    const next = createGlState(gl, image);
    if (!next) return;
    state = next;
    lost = false;
    applyStatic(next);
    if (fit) applyFit(next, fit);
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    mode: 'webgl2',
    resize(w, h, dpr) {
      if (disposed) return;
      fit = { width: w, height: h, dpr };
      if (state && !lost) applyFit(state, fit);
    },
    render(timeSeconds) {
      if (disposed || lost || !state || !fit) return;
      gl.useProgram(state.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, state.texture);
      gl.uniform1f(state.uniforms.time, timeSeconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (state && !lost) {
        gl.deleteTexture(state.texture);
        gl.deleteProgram(state.program);
      }
      state = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

function createFallbackPainter(canvas: HTMLCanvasElement, image: HTMLImageElement): WatercolorPainter {
  // A canvas that already handed out a WebGL2 context cannot give a 2D one;
  // in that case the hero's still image stays visible and this painter is inert.
  const ctx = canvas.getContext('2d');
  let fit: Fit | null = null;
  let drawn = false;
  let disposed = false;

  const draw = () => {
    if (!ctx || !fit || disposed) return;
    const { W, H, dw, dh, ox, oy } = coverFit(image, fit);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(image, ox, oy, dw, dh);
    drawn = true;
  };

  return {
    mode: 'fallback',
    resize(w, h, dpr) {
      fit = { width: w, height: h, dpr };
      drawn = false;
      draw();
    },
    render() {
      if (!drawn) draw();
    },
    dispose() {
      disposed = true;
    },
  };
}

function getWebGL2(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  try {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    return gl instanceof WebGL2RenderingContext ? gl : null;
  } catch {
    return null;
  }
}

/**
 * Paint `image` onto `canvas` as a watercolour wash. The image must be fully
 * loaded (and ideally decoded) before calling. Call `resize` before `render`.
 */
export function createWatercolorPainter(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: WatercolorOptions = {},
): WatercolorPainter {
  const gl = typeof WebGL2RenderingContext === 'undefined' ? null : getWebGL2(canvas);
  if (gl) {
    const painter = createGlPainter(gl, canvas, image, options);
    if (painter) return painter;
  }
  return createFallbackPainter(canvas, image);
}

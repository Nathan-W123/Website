/**
 * Plate compositor — layer 2 of the cinematic experience
 * (docs/photoreal-spec.md, "Compositor canvas").
 *
 * Raw WebGL2: one fullscreen triangle, one program, exactly two RGBA textures
 * that only re-upload when the HTMLImageElement identity changes. Fragment
 * pipeline: cover-fit sample A and B → per-slot baked-text suppression and
 * drive-underglow dim → mix → highlight flicker → lens droplets → chromatic
 * aberration → film grain → scanlines → vignette. Output is sRGB with no tone
 * mapping. When WebGL2 is unavailable the same API drives a Canvas2D crossfade
 * with all effects off.
 */

export type CoverFit = { scale: number; tx: number; ty: number };

/**
 * tl, tr, br, bl in normalised plate coordinates (0–1, origin top-left): the
 * convention of keyframes.ts and of the UV the fragment shader samples with.
 */
export type PlateQuad = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
];

/** Degenerate quad: the shader's inside test is 0 everywhere for it. */
export const ZERO_QUAD: PlateQuad = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];

export type RenderParams = {
  mix: number;
  zoomA: number;
  zoomB: number;
  offsetA: [number, number];
  offsetB: [number, number];
  time: number;
  flicker: number;
  grain: number;
  /** Reserved (0–1 drive speed). The optional background blur is not applied. */
  speed: number;
  still: boolean;
  /**
   * Keyframe quad of the plate in slot A / B: the region whose baked yellow
   * windshield text is knocked back to dark glass when `killA` / `killB` is
   * above 0. Defaults to ZERO_QUAD / 0 (drive frames, plate 10). Each slot is
   * masked with its own geometry before the crossfade, so a dissolve between
   * two orbit plates shows neither baked text. Ignored by the Canvas2D fallback.
   */
  quadA?: PlateQuad;
  quadB?: PlateQuad;
  killA?: number;
  killB?: number;
  /**
   * 0–1 dimming of the sill underglow and road hotspot (bright pixels in the
   * lower part of the plate) for a drive frame in slot A / B; 0 for orbit
   * plates. Ignored by the Canvas2D fallback.
   */
  dimA?: number;
  dimB?: number;
};

export type Compositor = {
  resize(width: number, height: number, dpr: number): void;
  /** Uploads only when an element's identity differs from the one currently held. */
  setImages(a: HTMLImageElement | null, b: HTMLImageElement | null): void;
  render(params: RenderParams): void;
  dispose(): void;
  readonly mode: 'webgl2' | 'canvas2d';
};

/**
 * Cover-fit mapping from plate pixels to view pixels. The fragment shader's
 * `coverUv()` mirrors this line for line, and the neon overlay (neon.ts) uses
 * it to place HTML on the same screen pixels the shader samples.
 *
 *   scale = max(viewW / texW, viewH / texH) * zoom
 *   tx    = (viewW - texW * scale) / 2 + offset[0] * viewW
 *   ty    = (viewH - texH * scale) / 2 + offset[1] * viewH
 *
 * Image pixel (ix, iy) lands on view pixel (ix * scale + tx, iy * scale + ty);
 * the inverse is ((sx - tx) / scale, (sy - ty) / scale). Both spaces use a
 * top-left origin with y down. The image is scaled about the view centre, so
 * zoom = 1 equals CSS `object-fit: cover` and zoom > 1 pushes in without
 * drifting. `offset` is a pan expressed as a fraction of the view size:
 * offset[0] = 0.02 moves the image right by 2 % of the view width, positive
 * offset[1] moves it down. Units are whatever viewW/viewH are given in (CSS px
 * for the overlay, device px for the drawing buffer); the result matches.
 */
export function coverFit(
  texW: number,
  texH: number,
  viewW: number,
  viewH: number,
  zoom: number,
  offset: readonly [number, number],
): CoverFit {
  const scale = Math.max(viewW / texW, viewH / texH) * zoom;
  const tx = (viewW - texW * scale) * 0.5 + offset[0] * viewW;
  const ty = (viewH - texH * scale) * 0.5 + offset[1] * viewH;
  return { scale, tx, ty };
}

// Screenshots are taken with puppeteer's page.screenshot(), which captures the
// composited page rather than reading the drawing buffer back, so the buffer
// need not be preserved (that costs an extra copy per frame on tiled GPUs).
// 'default' lets the browser pick the GPU instead of forcing a discrete one.
const CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  antialias: false,
  alpha: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
};

const BLACK_PIXEL = new Uint8Array([0, 0, 0, 255]);

const VERTEX_SHADER = `#version 300 es
// Fullscreen triangle from gl_VertexID: (-1,-1) (3,-1) (-1,3). No buffers.
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uMix;
uniform float uZoomA;
uniform float uZoomB;
uniform vec2 uOffsetA;
uniform vec2 uOffsetB;
uniform vec2 uResolution;
uniform vec2 uTexSizeA;
uniform vec2 uTexSizeB;
uniform float uTime;
uniform float uFlicker;
uniform float uGrain;
uniform bool uStill;
// Baked-text suppression: keyframe quad (tl, tr, br, bl in plate UV) and
// strength per slot; drive-underglow dim per slot.
uniform vec2 uQuadA[4];
uniform vec2 uQuadB[4];
uniform float uKillA;
uniform float uKillB;
uniform float uDimA;
uniform float uDimB;

out vec4 fragColor;

const float PI = 3.14159265;
const vec2 DROP_GRID = vec2(12.0, 7.0);
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
// The keyframe quad is grown by this factor about its centre (the baked glow
// spills a little past the measured glyph extents) ...
const float QUAD_GROW = 1.12;
// ... and feathered to zero over this many plate widths outside the grown edge.
const float QUAD_EDGE = 0.025;
// Yellow test: (min(r, g) - b) * YELLOW_GAIN, gated by luma between these two
// levels. Measured on the graded plates: the glyph cores sit at luma > 0.9 and
// their yellow halo at 0.05-0.4 (min(r, g) - b of 0.1-0.3), while the glass
// between them is near black (median 0.01) and the rain droplets on it are
// cool white (min(r, g) - b <= 0), so a high gain and a low gate take the whole
// glyph plus halo and leave the droplets.
const float YELLOW_GAIN = 6.0;
const float YELLOW_LUMA_LO = 0.06;
const float YELLOW_LUMA_HI = 0.2;
// Killed text becomes glass at this fraction of its own luma: a 0.95 core lands
// at 0.04, the glass's own upper quartile.
const float KILL_GLASS = 0.04;

// Mirrors coverFit() in compositor.ts. screenPx is in view pixels with a
// top-left origin; the result is the texture UV (v = 0 at the image top).
vec2 coverUv(vec2 screenPx, vec2 texSize, float zoom, vec2 offset) {
  float s = max(uResolution.x / texSize.x, uResolution.y / texSize.y) * zoom;
  vec2 size = texSize * s;
  vec2 t = (uResolution - size) * 0.5 + offset * uResolution;
  return (screenPx - t) / size;
}

uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

// Uniform in [0, 1). Integer hash: identical on every GPU, no sin() cliffs.
float hash(uvec2 p, uint salt) {
  return float(pcg(p.x ^ pcg(p.y ^ pcg(salt)))) * (1.0 / 4294967296.0);
}

// 1 inside the convex quad (tl, tr, br, bl in plate UV, origin top-left) grown by
// QUAD_GROW about its centre, feathering to 0 over QUAD_EDGE outside the grown
// edge. v is scaled by the plate aspect so distances are in plate widths on
// both axes. Four signed edge-distance tests; the centre picks the inside sign
// so the winding does not matter. A degenerate (zero) quad yields 0.
float insideQuad(vec2 uv, vec2 quad[4], float aspect) {
  vec2 s = vec2(1.0, aspect);
  vec2 c = (quad[0] + quad[1] + quad[2] + quad[3]) * 0.25;
  vec2 p = uv * s;
  vec2 cs = c * s;
  float inside = 1.0;
  for (int i = 0; i < 4; i++) {
    vec2 a = (c + (quad[i] - c) * QUAD_GROW) * s;
    vec2 b = (c + (quad[(i + 1) % 4] - c) * QUAD_GROW) * s;
    vec2 e = b - a;
    float len = length(e);
    if (len < 1e-5) return 0.0;
    float d = (e.x * (p.y - a.y) - e.y * (p.x - a.x)) / len;
    float dc = e.x * (cs.y - a.y) - e.y * (cs.x - a.x);
    inside *= smoothstep(-QUAD_EDGE, 0.0, d * sign(dc));
  }
  return inside;
}

// One slot's plate colour at plate UV uv: the baked yellow windshield text
// inside the slot's keyframe quad is knocked back to dark glass (kill) and, for
// a drive frame, the sill underglow and road hotspot are dimmed (dim). Both run
// before the crossfade so each slot is masked with its own geometry.
vec3 slotColor(vec3 col, vec2 uv, vec2 quad[4], float aspect, float kill, float dim) {
  float luma = dot(col, LUMA);
  if (kill > 0.0) {
    float yellow = clamp((min(col.r, col.g) - col.b) * YELLOW_GAIN, 0.0, 1.0)
      * smoothstep(YELLOW_LUMA_LO, YELLOW_LUMA_HI, luma);
    col = mix(col, vec3(luma * KILL_GLASS), insideQuad(uv, quad, aspect) * yellow * kill);
  }
  col *= 1.0 - dim * smoothstep(0.35, 0.8, luma) * smoothstep(0.5, 0.62, uv.y);
  return col;
}

// Crossfaded plate colour at a view pixel (2 taps).
vec3 plate(vec2 px) {
  vec2 uvA = coverUv(px, uTexSizeA, uZoomA, uOffsetA);
  vec2 uvB = coverUv(px, uTexSizeB, uZoomB, uOffsetB);
  vec3 a = slotColor(texture(uTexA, uvA).rgb, uvA, uQuadA, uTexSizeA.y / uTexSizeA.x, uKillA, uDimA);
  vec3 b = slotColor(texture(uTexB, uvB).rgb, uvB, uQuadB, uTexSizeB.y / uTexSizeB.x, uKillB, uDimB);
  return mix(a, b, uMix);
}

// Procedural lens droplets: 12x7 cell grid, one droplet per cell, ~1 in 3
// cells active, slow downward drift that fades in and out at the cell ends so
// the wrap never pops. Returns the refraction displacement in view pixels and
// writes the droplet coverage and glint (both 0..1).
vec2 droplets(vec2 px, out float mask, out float glint) {
  mask = 0.0;
  glint = 0.0;
  if (uStill) return vec2(0.0);
  vec2 cellSize = uResolution / DROP_GRID;
  vec2 cellId = floor(px / cellSize);
  uvec2 id = uvec2(cellId);
  if (hash(id, 1u) > 0.34) return vec2(0.0);
  float radius = cellSize.y * (0.09 + 0.11 * hash(id, 2u));
  float speed = 0.012 + 0.024 * hash(id, 3u); // cell heights per second
  float phase = fract(hash(id, 4u) + uTime * speed);
  float life = sin(phase * PI);
  vec2 centre = vec2(
    mix(radius, cellSize.x - radius, hash(id, 5u)),
    mix(radius, cellSize.y - radius, phase)
  );
  vec2 d = px - cellId * cellSize - centre;
  float dist = length(d);
  float m = smoothstep(radius, radius * 0.55, dist) * life;
  mask = m;
  glint = smoothstep(radius * 0.45, 0.0, length(d + radius * 0.38)) * life;
  return -d * (0.5 * m); // pull the sample toward the droplet centre
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 q = px / uResolution * 2.0 - 1.0;
  float r2 = dot(q, q);

  // Droplet refraction and chromatic aberration are UV displacements, so they
  // are folded into the sampling stage: 3 channel taps x 2 plates = 6 taps.
  float dropMask;
  float dropGlint;
  vec2 disp = droplets(px, dropMask, dropGlint);
  vec2 base = px + disp;
  // Chromatic aberration: |ca| = 0.0012 * r^3 * min(W, H). Scaling by the SHORT
  // side keeps the fringe the same fraction of the frame on a portrait phone
  // as on a desktop; scaling by height alone rainbowed tall device-pixel
  // screens at the edges.
  vec2 ca = q * (0.0012 * r2) * min(uResolution.x, uResolution.y);
  vec3 col = vec3(plate(base + ca).r, plate(base).g, plate(base - ca).b);

  // Highlight flicker: only bright windows and neon respond, never the car.
  float luma = dot(col, LUMA);
  col += col * smoothstep(0.55, 0.9, luma) * (uFlicker - 1.0);

  // Droplet shading at 0.35 opacity: faint darkening plus a glint.
  col *= 1.0 - 0.35 * 0.18 * dropMask;
  col += 0.35 * 0.22 * dropGlint;

  // Film grain: hash noise with a new seed every frame unless still.
  uint frame = uStill ? 0u : uint(mod(floor(uTime * 60.0), 8192.0));
  float n = hash(uvec2(gl_FragCoord.xy), 7u + frame);
  col += (n * 2.0 - 1.0) * (0.045 * uGrain);

  // Scanlines: every 4th device-pixel row darkened by 1.5 %. Static (not
  // time-based) so it also applies when uStill; replaces the CSS scanline layer.
  col *= 1.0 - 0.015 * step(fract(gl_FragCoord.y / 4.0), 0.25);

  // Vignette: x0.72 at the frame edges.
  col *= 1.0 - 0.28 * smoothstep(0.25, 1.0, r2);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

type Uniforms = {
  mix: WebGLUniformLocation | null;
  zoomA: WebGLUniformLocation | null;
  zoomB: WebGLUniformLocation | null;
  offsetA: WebGLUniformLocation | null;
  offsetB: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  texSizeA: WebGLUniformLocation | null;
  texSizeB: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  flicker: WebGLUniformLocation | null;
  grain: WebGLUniformLocation | null;
  still: WebGLUniformLocation | null;
  quadA: WebGLUniformLocation | null;
  quadB: WebGLUniformLocation | null;
  killA: WebGLUniformLocation | null;
  killB: WebGLUniformLocation | null;
  dimA: WebGLUniformLocation | null;
  dimB: WebGLUniformLocation | null;
};

/** Packs a quad into `out` (x0, y0, x1, y1, ...) for uniform2fv. */
function packQuad(quad: PlateQuad, out: Float32Array): Float32Array {
  for (let i = 0; i < 4; i += 1) {
    out[i * 2] = quad[i][0];
    out[i * 2 + 1] = quad[i][1];
  }
  return out;
}

type TextureSlot = {
  texture: WebGLTexture;
  /** The image currently uploaded; null means the 1x1 black placeholder. */
  uploaded: HTMLImageElement | null;
  width: number;
  height: number;
};

type GlResources = {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  slotA: TextureSlot;
  slotB: TextureSlot;
  uniforms: Uniforms;
};

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** True when the element can be drawn or uploaded right now. */
function usable(img: HTMLImageElement | null): img is HTMLImageElement {
  return (
    img !== null &&
    img.complete &&
    img.naturalWidth > 0 &&
    img.naturalHeight > 0
  );
}

function resizeBackingStore(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
): void {
  const w = Math.max(1, Math.round(width * dpr));
  const h = Math.max(1, Math.round(height * dpr));
  // Assigning width/height clears the buffer, so only touch them on change.
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}

/** Returns null only when the context was lost mid-compile. */
function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    if (gl.isContextLost()) return null;
    throw new Error('compositor: createShader failed');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (gl.isContextLost()) return null;
    const log = gl.getShaderInfoLog(shader) ?? '';
    gl.deleteShader(shader);
    throw new Error(`compositor: shader compile failed\n${log}`);
  }
  return shader;
}

/** Returns null only when the context was lost mid-link. */
function linkProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vert || !frag) return null;
  // Typed non-null by lib.dom, but a lost context returns null at runtime and
  // attachShader(null) would throw.
  const program: WebGLProgram | null = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  // Shaders are owned by the program once linked; flag them for deletion.
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (gl.isContextLost()) return null;
    const log = gl.getProgramInfoLog(program) ?? '';
    gl.deleteProgram(program);
    throw new Error(`compositor: program link failed\n${log}`);
  }
  return program;
}

function createSlot(gl: WebGL2RenderingContext, unit: number): TextureSlot {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    BLACK_PIXEL,
  );
  return { texture, uploaded: null, width: 1, height: 1 };
}

/** Uploads `img` (or the black placeholder) if it differs from what the slot holds. */
function syncSlot(
  gl: WebGL2RenderingContext,
  unit: number,
  slot: TextureSlot,
  img: HTMLImageElement | null,
): void {
  if (img === slot.uploaded) return;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, slot.texture);
  if (img) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    slot.width = img.naturalWidth;
    slot.height = img.naturalHeight;
  } else {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      BLACK_PIXEL,
    );
    slot.width = 1;
    slot.height = 1;
  }
  slot.uploaded = img;
}

function createWebGL2Compositor(
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
): Compositor {
  /** The images the caller wants shown (decoded ones only). */
  let wantA: HTMLImageElement | null = null;
  let wantB: HTMLImageElement | null = null;
  let resources: GlResources | null = null;
  let lost = false;
  let disposed = false;
  // Scratch for the vec2[4] quad uniforms; reused every frame.
  const quadScratchA = new Float32Array(8);
  const quadScratchB = new Float32Array(8);

  const build = (): void => {
    if (gl.isContextLost()) return;
    const program = linkProgram(gl);
    if (!program) return;

    // The shader samples with v = 0 at the image top, which is the natural
    // row order of an HTMLImageElement upload, so no Y flip is needed.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    // Keep the browser's default colour handling so the first composited
    // frame matches the CSS poster underneath it.
    gl.pixelStorei(
      gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
      gl.BROWSER_DEFAULT_WEBGL,
    );
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    const vao = gl.createVertexArray();
    const slotA = createSlot(gl, 0);
    const slotB = createSlot(gl, 1);

    const loc = (name: string): WebGLUniformLocation | null =>
      gl.getUniformLocation(program, name);
    gl.useProgram(program);
    gl.uniform1i(loc('uTexA'), 0);
    gl.uniform1i(loc('uTexB'), 1);

    resources = {
      program,
      vao,
      slotA,
      slotB,
      uniforms: {
        mix: loc('uMix'),
        zoomA: loc('uZoomA'),
        zoomB: loc('uZoomB'),
        offsetA: loc('uOffsetA'),
        offsetB: loc('uOffsetB'),
        resolution: loc('uResolution'),
        texSizeA: loc('uTexSizeA'),
        texSizeB: loc('uTexSizeB'),
        time: loc('uTime'),
        flicker: loc('uFlicker'),
        grain: loc('uGrain'),
        still: loc('uStill'),
        quadA: loc('uQuadA'),
        quadB: loc('uQuadB'),
        killA: loc('uKillA'),
        killB: loc('uKillB'),
        dimA: loc('uDimA'),
        dimB: loc('uDimB'),
      },
    };
    syncSlot(gl, 0, slotA, wantA);
    syncSlot(gl, 1, slotB, wantB);
  };

  const release = (): void => {
    if (!resources) return;
    if (!gl.isContextLost()) {
      gl.useProgram(null);
      gl.bindVertexArray(null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.deleteTexture(resources.slotA.texture);
      gl.deleteTexture(resources.slotB.texture);
      gl.deleteVertexArray(resources.vao);
      gl.deleteProgram(resources.program);
    }
    resources = null;
  };

  const onContextLost = (event: Event): void => {
    // preventDefault tells the browser we will handle restoration.
    event.preventDefault();
    lost = true;
    // GPU objects are already gone; drop the handles without deleting.
    resources = null;
  };

  const onContextRestored = (): void => {
    lost = false;
    build();
  };

  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  if (gl.isContextLost()) {
    lost = true;
  } else {
    build();
  }

  return {
    mode: 'webgl2',

    resize(width, height, dpr) {
      resizeBackingStore(canvas, width, height, dpr);
    },

    setImages(a, b) {
      wantA = usable(a) ? a : null;
      wantB = usable(b) ? b : null;
      if (disposed || lost || !resources) return;
      // A one-frame step, (A,B) -> (B,C) or (Z,A) <- (A,B), leaves one wanted
      // image resident in the other slot. Swap the slot objects (texture plus
      // bookkeeping) so it is reused rather than re-uploaded. render() binds
      // slotA -> TEXTURE0 and slotB -> TEXTURE1 and reads sizes from the slots
      // every frame, so the unit assignment follows the swap.
      const { slotA, slotB } = resources;
      if (
        wantA !== wantB &&
        (wantA === slotB.uploaded || wantB === slotA.uploaded)
      ) {
        resources.slotA = slotB;
        resources.slotB = slotA;
      }
      syncSlot(gl, 0, resources.slotA, wantA);
      syncSlot(gl, 1, resources.slotB, wantB);
    },

    render(params) {
      if (disposed || lost || !resources) return;
      const { program, vao, slotA, slotB, uniforms } = resources;
      const width = canvas.width;
      const height = canvas.height;

      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, slotA.texture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, slotB.texture);

      gl.uniform1f(uniforms.mix, clamp01(params.mix));
      gl.uniform1f(uniforms.zoomA, Math.max(params.zoomA, 1e-4));
      gl.uniform1f(uniforms.zoomB, Math.max(params.zoomB, 1e-4));
      gl.uniform2f(uniforms.offsetA, params.offsetA[0], params.offsetA[1]);
      gl.uniform2f(uniforms.offsetB, params.offsetB[0], params.offsetB[1]);
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform2f(uniforms.texSizeA, slotA.width, slotA.height);
      gl.uniform2f(uniforms.texSizeB, slotB.width, slotB.height);
      gl.uniform1f(uniforms.time, params.time);
      gl.uniform1f(uniforms.flicker, params.flicker);
      gl.uniform1f(uniforms.grain, clamp01(params.grain));
      gl.uniform1i(uniforms.still, params.still ? 1 : 0);
      gl.uniform2fv(
        uniforms.quadA,
        packQuad(params.quadA ?? ZERO_QUAD, quadScratchA),
      );
      gl.uniform2fv(
        uniforms.quadB,
        packQuad(params.quadB ?? ZERO_QUAD, quadScratchB),
      );
      gl.uniform1f(uniforms.killA, clamp01(params.killA ?? 0));
      gl.uniform1f(uniforms.killB, clamp01(params.killB ?? 0));
      gl.uniform1f(uniforms.dimA, clamp01(params.dimA ?? 0));
      gl.uniform1f(uniforms.dimB, clamp01(params.dimB ?? 0));

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      release();
      wantA = null;
      wantB = null;
      // The context itself stays with the canvas: forcing loseContext() here
      // would poison a re-mount on the same element (React StrictMode).
    },
  };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  viewW: number,
  viewH: number,
  zoom: number,
  offset: readonly [number, number],
  alpha: number,
): void {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const fit = coverFit(w, h, viewW, viewH, zoom, offset);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, fit.tx, fit.ty, w * fit.scale, h * fit.scale);
}

function createCanvas2dCompositor(canvas: HTMLCanvasElement): Compositor {
  const ctx = canvas.getContext('2d', { alpha: false });
  let heldA: HTMLImageElement | null = null;
  let heldB: HTMLImageElement | null = null;
  let disposed = false;

  return {
    mode: 'canvas2d',

    resize(width, height, dpr) {
      resizeBackingStore(canvas, width, height, dpr);
    },

    setImages(a, b) {
      heldA = usable(a) ? a : null;
      heldB = usable(b) ? b : null;
    },

    render(params) {
      if (disposed || !ctx) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (heldA) {
        drawCover(ctx, heldA, width, height, params.zoomA, params.offsetA, 1);
      }
      const mix = clamp01(params.mix);
      if (heldB && mix > 0) {
        drawCover(ctx, heldB, width, height, params.zoomB, params.offsetB, mix);
      }
      ctx.globalAlpha = 1;
    },

    dispose() {
      disposed = true;
      heldA = null;
      heldB = null;
    },
  };
}

/**
 * Creates the compositor on `canvas`. Uses WebGL2 when available, otherwise a
 * Canvas2D crossfade with effects off. Call `dispose()` on unmount.
 */
export function createCompositor(canvas: HTMLCanvasElement): Compositor {
  const gl = canvas.getContext('webgl2', CONTEXT_ATTRIBUTES);
  return gl
    ? createWebGL2Compositor(canvas, gl)
    : createCanvas2dCompositor(canvas);
}

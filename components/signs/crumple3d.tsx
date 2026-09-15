'use client';

import { useEffect, useRef } from 'react';

/**
 * A sheet of lined paper (matching the page background) that buckles, wraps
 * itself into a crumpled wad, drops, bounces once and rolls off screen.
 * Raw WebGL2: a plane grid morphs toward a noisy sphere in the vertex shader
 * and the fragment shader flat-shades every facet from screen-space
 * derivatives, so the wad reads as folded paper with lit and shadowed faces.
 */

export const hasWebGL2 = () => {
  if (typeof document === 'undefined') return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

const VS = `#version 300 es
precision highp float;
in vec2 aUv;
uniform float uAspect, uT, uRotY, uRotZ;
uniform vec3 uPos;
uniform mat4 uProj;
out vec3 vPos;
out vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.13 + 1.7; a *= 0.5; } return v; }
void main() {
  vec2 uv = aUv;
  vec3 plane = vec3((uv.x * 2.0 - 1.0) * uAspect, uv.y * 2.0 - 1.0, 0.0);
  float th = uv.x * 6.2831853, ph = uv.y * 3.1415926;
  vec3 dir = vec3(cos(th) * sin(ph), cos(ph), sin(th) * sin(ph));
  // big soft folds, sharp ridges, fine texture
  float n = fbm(uv * vec2(3.2, 2.3)) - 0.5;
  float ridge = 1.0 - abs(2.0 * vnoise(uv * vec2(7.0, 5.0) + 2.3) - 1.0);
  float ridge2 = 1.0 - abs(2.0 * vnoise(uv * vec2(13.0, 9.0) + 7.1) - 1.0);
  float n3 = fbm(uv * vec2(21.0, 15.0) + 9.1) - 0.5;
  float t = uT;
  float k = smoothstep(0.0, 1.0, t);
  vec3 wad = dir * 0.42 * (1.0 + n * 0.8 + (ridge - 0.5) * 0.5 + (ridge2 - 0.5) * 0.25 + n3 * 0.12);
  // the flat sheet buckles first (folds grow in, ridges sharpen), then wraps up into the wad
  float lift = sin(t * 3.1415926) * 0.55 + k * 0.3;
  float folds = n * 1.3 + (ridge - 0.5) * 0.7 + (ridge2 - 0.5) * 0.3 + n3 * 0.15;
  vec3 buckled = plane * (1.0 - 0.35 * k) + vec3(n3 * 0.15 * lift, (ridge - 0.5) * 0.12 * lift, folds * lift);
  vec3 p = mix(buckled, wad, k);
  float cy = cos(uRotY), sy = sin(uRotY);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  float cz = cos(uRotZ), sz = sin(uRotZ);
  p.xy = mat2(cz, -sz, sz, cz) * p.xy;
  p += uPos;
  vPos = p;
  vUv = uv;
  gl_Position = uProj * vec4(p, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vPos;
in vec2 vUv;
uniform vec2 uSize;
uniform float uLineStep, uMarginX, uHoles, uScroll, uAlpha;
out vec4 o;
void main() {
  vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
  // face the normal toward the camera (the wrap mirrors the winding, so gl_FrontFacing is no guide)
  if (dot(n, vec3(0.0, 0.0, 3.0) - vPos) < 0.0) n = -n;
  vec3 L = normalize(vec3(-0.35, 0.55, 0.85));
  float diff = max(dot(n, L), 0.0) / 0.79;
  float light = 0.42 + 0.58 * min(diff, 1.0);
  float px = vUv.x * uSize.x, py = (1.0 - vUv.y) * uSize.y + uScroll;
  vec3 col = vec3(1.0);
  float line = step(uLineStep - 2.0, mod(py, uLineStep));
  col = mix(col, vec3(0.863), line);
  float margin = step(uMarginX, px) * step(px, uMarginX + 2.0);
  col = mix(col, vec3(0.741), margin);
  float alpha = 1.0;
  if (uHoles > 0.5) {
    for (int i = 0; i < 3; i++) {
      vec2 c = vec2(34.0, uSize.y * (0.22 + float(i) * 0.28) + uScroll);
      float d = distance(vec2(px, py), c);
      if (d < 9.5) col = vec3(1.0);
      else if (d < 12.5) col = vec3(0.725);
    }
  }
  vec3 rgb = col * light;
  o = vec4(rgb * uAlpha, alpha * uAlpha);
}`;

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const easeIn = (x: number) => x * x;

export function Crumple3D({ duration = 2.1, onDone }: { duration?: number; onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return run(canvas, duration, () => done.current?.());
  }, [duration]);
  return <canvas ref={ref} className="sg-crumple3d" aria-hidden="true" />;
}

/** Builds the mesh, runs the choreography, returns a cleanup. */
function run(canvas: HTMLCanvasElement, duration: number, onDone: () => void) {
  {
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const aspect = W / H;
    const mobile = W <= 720;
    const page = document.querySelector('.sg-page');
    const scroll = page ? page.scrollTop : 0;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    gl.useProgram(prog);

    // plane grid
    const NX = 72, NY = 48;
    const uvs = new Float32Array((NX + 1) * (NY + 1) * 2);
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const k = (j * (NX + 1) + i) * 2;
      uvs[k] = i / NX;
      uvs[k + 1] = j / NY;
    }
    const idx = new Uint32Array(NX * NY * 6);
    let q = 0;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aUv');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    // camera 3 units back; tan(fov/2) = 1/3 so the flat sheet fills the viewport exactly
    const near = 0.1, far = 30, dist = 3, tanH = 1 / dist;
    const proj = new Float32Array([
      1 / (aspect * tanH), 0, 0, 0,
      0, 1 / tanH, 0, 0,
      0, 0, -(far + near) / (far - near), -1,
      0, 0, -(2 * far * near) / (far - near), 0,
    ]);
    // view translate(0,0,-dist) folded into the projection: column-major, translation in the last column
    const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -dist, 1]);
    const mul = (a: Float32Array, b: Float32Array) => {
      const r = new Float32Array(16);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
        r[i * 4 + j] = s;
      }
      return r;
    };
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uProj'), false, mul(proj, view));
    gl.uniform1f(gl.getUniformLocation(prog, 'uAspect'), aspect);
    gl.uniform2f(gl.getUniformLocation(prog, 'uSize'), W, H);
    gl.uniform1f(gl.getUniformLocation(prog, 'uLineStep'), mobile ? 31 : 35);
    gl.uniform1f(gl.getUniformLocation(prog, 'uMarginX'), mobile ? 44 : 84);
    gl.uniform1f(gl.getUniformLocation(prog, 'uHoles'), mobile ? 0 : 1);
    gl.uniform1f(gl.getUniformLocation(prog, 'uScroll'), scroll);
    const uT = gl.getUniformLocation(prog, 'uT');
    const uRotY = gl.getUniformLocation(prog, 'uRotY');
    const uRotZ = gl.getUniformLocation(prog, 'uRotZ');
    const uPos = gl.getUniformLocation(prog, 'uPos');
    const uAlpha = gl.getUniformLocation(prog, 'uAlpha');

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const R = 0.42;
    const floor = -1 + R * 0.8;
    let raf = 0;
    const t0 = performance.now();
    // debug: window.__CRUMPLE_SLOW = 4 plays the choreography at quarter speed
    const slow = (window as unknown as { __CRUMPLE_SLOW?: number }).__CRUMPLE_SLOW || 1;
    const frame = () => {
      const s = (performance.now() - t0) / 1000 / slow;
      // choreography: crumple, drop, bounce, roll off to the left
      let t = 1, x = 0, y = 0, rotY = 0, rotZ = 0;
      if (s < 0.75) {
        t = easeInOut(s / 0.75);
        rotY = 1.1 * t;
        y = 0.12 * t;
      } else if (s < 1.05) {
        const u = easeIn((s - 0.75) / 0.3);
        rotY = 1.1;
        y = 0.12 + (floor - 0.12) * u;
        x = -0.25 * u;
      } else if (s < 1.4) {
        const u = (s - 1.05) / 0.35;
        rotY = 1.1 + u * 0.4;
        y = floor + 0.42 * 4 * u * (1 - u);
        x = -0.25 - 0.6 * u;
      } else {
        const u = easeIn(Math.min(1, (s - 1.4) / (duration - 1.4)));
        rotY = 1.5;
        x = -0.85 - (aspect + 1.2) * u;
        y = floor - 0.05 * u;
      }
      rotZ = -x / R;
      const alpha = Math.min(1, s / 0.12);
      gl.uniform1f(uT, t);
      gl.uniform1f(uRotY, rotY);
      gl.uniform1f(uRotZ, rotZ);
      gl.uniform3f(uPos, x, y, 0);
      gl.uniform1f(uAlpha, alpha);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);
      if (s < duration) raf = requestAnimationFrame(frame);
      else onDone();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      gl.deleteBuffer(vbo);
      gl.deleteBuffer(ibo);
      gl.deleteProgram(prog);
    };
  }
}

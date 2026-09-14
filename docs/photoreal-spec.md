# Photoreal cinematic — build spec

Project: `C:\Users\nward\OneDrive\Documents\ChatGPT\PersonalWebsite` (vinext = Next.js-style app on Vite, React 19, TypeScript strict, Tailwind 4, deployed to Cloudflare Workers). Dev server already running at http://localhost:3000 with HMR. Windows 11; shell is Git Bash. ffmpeg binary: `node_modules/ffmpeg-static/ffmpeg.exe`. `sharp` is installed.

## Goal

Make the landing experience **photorealistic** using only free assets already on disk. The user's vision (verbatim intent):

> Front of a hyper-realistic black supercar in the rain. The windshield reflects a neon sign with my name and credentials. As you scroll, the shot pans from the front to the side of the same car, then the car starts driving; the more you scroll, the more it drives past buildings whose windows showcase my projects. Rain animated, background lights flicker occasionally. One single continuous shot. Scrolling does not scroll the page; it drives the animation. Greyscale palette with yellow highlights.

The previous attempt (a three.js scene with an untextured Ferrari GLB and box buildings) cannot look photoreal and is being replaced. The replacement is a **photographic plate pipeline**: real/AI-rendered frames scrubbed by scroll, composited with live effects.

## Assets on disk (do not regenerate; we cannot create new AI images or video)

- `public/orbit/frame-00.webp … frame-11.webp` — 12 AI-generated plates, 1280×720, of the SAME dark coupe at night in rain, cool-blue city. frame-00 = head-on front with yellow neon "NATHAN W. / SOFTWARE DEVELOPER • BUILDER" reflected in the windshield; frames step around to a full side view; frame-10 is a side view with a tree/pole/wall background made to match the drive video; **frame-11 is identical to the first frame of the drive video** (the seam).
- `public/free-supercar-drive.mp4` — 3840×2160, 60 fps, 9.8 s, H.264. Side-on shot of the same coupe driving through a rainy night street, background buildings/windows passing, RGB neon underglow on the sills (off-brand colour, must be graded toward neutral/cool).
- `public/cinematic-drive-free.mp4` — 1280×720 re-encode of the same video (yuv444p). Redundant.
- `public/cinematic-master-front.png`, `public/supercar-*-rain.png` — a DIFFERENT (Lamborghini-style, warm-toned) car; 3 views only, no video. Not used in the sequence. Leave in place (og.png uses that look).
- `public/models/supercar.glb`, `public/draco/*` — the old 3D pipeline. No longer imported after this work. Leave files in place; do not delete.
- `sequence-work/*` — scratch from the previous attempt. Ignore. The big mp4s in `public/` should be MOVED (not deleted) into `sequence-work/` once frames are extracted so they are not deployed.

## Experience timeline (progress p ∈ [0,1], driven by wheel/touch/keys exactly as today)

| p range | phase label | what is on screen |
|---|---|---|
| 0.00–0.03 | READY | Hero: orbit plate 0, slow idle push-in (scale 1.00→1.03 over ~12 s, sinusoidal), live rain, highlight flicker, neon overlay on the windshield. |
| 0.03–0.42 | CAMERA ORBIT | Orbit plates 0→10 crossfaded. Plate index f = 10 · smoothstep(0.03, 0.42, p). Display = mix(plate[floor f], plate[ceil f], fract f). During every crossfade both plates get a continuous, matched push-in (scale 1.02→1.06 across each interval, reset per interval is NOT allowed — use a global slowly increasing zoom so there is never a visible pop). Neon overlay tracks the windshield with per-plate keyframed quads and fades to 0 between plates 8 and 10. |
| 0.42–1.00 | DRIVING | Drive frames 0→N−1. Frame index g = (N−1) · smoothstep-ish ease (use easeInOutSine on a linear map so wheels visibly "start" turning). Display = mix(frame[floor g], frame[ceil g], fract g). The bridge from orbit plate 10 to drive frame 0 is the last orbit crossfade (plate 10 → drive frame 0 == old frame-11). Project window-cards slide across in sync. Velocity HUD = round(268 · easeOut(local progress)). |

Reverse scrolling must work symmetrically. `Home`/`End` jump to 0/1.

### URL parameters (for automated screenshots and deep links)
- `?p=0.55` sets initial target AND current progress (no easing on first paint).
- `?still=1` freezes time-based effects (rain paused, no flicker, static grain seed) so screenshots are deterministic.

## Layers (bottom → top, all `position:fixed; inset:0`)

1. **Poster** — CSS background `url(/plates/poster.webp)` on the shell so the hero paints before JS. Hidden once the compositor draws its first frame.
2. **Compositor canvas** (`<canvas class="plate-canvas">`) — raw **WebGL2** (NO three.js; remove the three imports. Keep the npm dep installed, just unused). One fullscreen triangle, one program. Uniforms: `uTexA`, `uTexB`, `uMix`, `uZoomA`, `uZoomB`, `uOffsetA`, `uOffsetB` (vec2, normalized pan), `uResolution`, `uTexSize` (plates may differ in size; use cover-fit), `uTime`, `uFlicker` (float, computed on CPU), `uGrain` (0–1), `uSpeed` (0–1, drive speed for a cheap 5-tap horizontal blur of the background only — skip if it costs quality; it is optional), `uStill`.
   Fragment effects, in order: cover-fit sample A and B with zoom/offset → mix → **highlight flicker** (`col += col * smoothstep(0.55, 0.9, luma) * (uFlicker − 1.0)`; uFlicker is 1.0 nearly all the time, with rare 80–200 ms dips to 0.6–0.85 and rarer spikes to 1.15, scheduled on the CPU with a seeded RNG; this makes only bright windows/neon flicker, never the car) → **lens rain droplets** (procedural: a 12×7 cell grid, each cell owns one droplet with a slow downward drift; refraction = small UV offset toward the droplet centre, drop opacity 0.35; ~1 in 3 cells active; disabled when uStill) → subtle **chromatic aberration** at edges (0.0025 · r²) → **film grain** (hash noise, strength 0.045, animated per frame unless uStill) → **vignette** (radial, edges ×0.72). Output sRGB, no tone mapping.
   WebGL fallback: if WebGL2 is unavailable, draw with a 2D context: `drawImage(A)` then `globalAlpha=mix; drawImage(B)`; effects off.
3. **Rain canvas** (`<canvas class="rain-canvas">`, 2D, `mix-blend-mode: screen`, `pointer-events:none`) — 220 streaks on desktop, 90 on mobile; each streak: x, y, length 18–70 px, speed 900–1900 px/s, alpha 0.08–0.28, slight lean (−6°). Three depth bands (far: short/dim/slow, near: long/bright/fast). Wrap at bottom. Paused when `prefers-reduced-motion` or `?still=1`. DPR capped at 1.5.
4. **Neon sign overlay** (`<div class="neon-sign">` HTML) — crisp yellow neon text "NATHAN W." (large) and "SOFTWARE DEVELOPER • BUILDER" (small), `mix-blend-mode: screen`, glow via layered text-shadow, slight blur(0.3px), a faint neon buzz (opacity 0.96–1.0 noise every ~2 s, off when still). Positioned with `transform: matrix3d(...)` computed from a 4-point quad (normalized image coords: tl, tr, br, bl) of the windshield text block for each orbit plate 0…10, mapped through the same cover-fit transform as the compositor so it lands on the plate pixels. Quads come from `components/cinematic/keyframes.ts` (filled by the analysis step). Between plates, interpolate the four corners linearly. Per-plate opacity multiplier also comes from keyframes (use it to hide the overlay where the baked text is unreadable or the quad is uncertain). Fully faded by plate 10.
5. **Project window-cards** (`.window-track` > `.window-card` × 6) — during DRIVING, cards slide right→left in sync with g: `translateX((index − activeIndexFloat) · 82vw)`, active card centred at x = 50%, positioned in the upper-middle band (top ≈ 12%, height ≈ 46vh, width min(440px, 38vw)). Styled as a backlit building window seen through rain: dark smoked-glass panel `rgba(10,12,14,.72)` with `backdrop-filter: blur(14px) saturate(.7)`, thin light mullions (1px `rgba(255,255,255,.14)` cross lines), warm interior glow at the top edge (`inset 0 2px 0 var(--signal)`, plus a soft radial `rgba(255,213,47,.10)` at top-left), a rain-streak overlay (`repeating-linear-gradient` at −6°, 3% opacity, animated slowly unless still), an oversized ghost number (01…06) at 5% white, monospace topline (code · category), big title, 1–2 line description, stack line, "View repository ↗" link. Cards ease-in from 0.6 opacity/scale .96 to 1 when active. Before DRIVING the whole track sits off-screen right.
6. **HUD** — keep the existing nav (NW. brand, "NathanW.me / 2026", Contact), sequence HUD (phase, progress meter, velocity KM/H), vertical scroll instruction, loader. Remove the "3D model / vicent091036" credit and the GLB attribution reference (no longer used). Loader shows plates progress: "Preparing the shot".
7. **Vignette/scanline overlay** — keep the existing `.scene-vignette` but reduce the scanline opacity to .06.

## Asset pipeline — `scripts/build-plates.mjs` (Node ESM; run with `npm run plates`)

Inputs: `public/orbit/frame-00..10.webp`, `public/free-supercar-drive.mp4`.
Outputs:
- `public/plates/orbit/00.webp … 10.webp` — 1280×720, graded, webp q80.
- `public/plates/drive/000.webp … NNN.webp` — extracted from the mp4 at **20 fps** between the trim points recommended by the video analysis (default: full 0–9.8 s ⇒ 196 frames), scaled to **1600×900** with lanczos, graded, webp q72. Frame 000 must correspond to video t=0 (which equals orbit frame-11).
- `public/plates/poster.webp` — orbit plate 00 graded, 1280×720, q70.
- `public/plates/manifest.json` — `{ "orbit": { "count": 11, "width": 1280, "height": 720, "pattern": "/plates/orbit/{i2}.webp" }, "drive": { "count": N, "width": 1600, "height": 900, "pattern": "/plates/drive/{i3}.webp", "fps": 20 } }`.
Grade: one ffmpeg filter string applied identically to orbit plates and drive frames (the analysis step picks it by testing candidates and comparing orbit plate 10 against video frame 0). Baseline candidate: `eq=contrast=1.06:brightness=-0.012:saturation=0.60,colorbalance=rs=-0.03:gs=-0.01:bs=0.05:rm=0.0:gm=0.0:bm=0.02:rh=0.06:gh=0.035:bh=-0.05,unsharp=5:5:0.3:5:5:0.0`. The drive video's RGB underglow must end up reading as a neutral/cool glow, not magenta/red/green.
Also: move `public/free-supercar-drive.mp4` and `public/cinematic-drive-free.mp4` to `sequence-work/` after extraction (script does this only when the outputs exist; `git mv` is not needed, nothing is committed).
Total drive payload target: ≤ 12 MB.

## Loading strategy (in `components/cinematic/plates.ts`)

- Fetch `manifest.json`. Preload orbit plates 0–10 as `HTMLImageElement` with `await img.decode()`; keep them referenced for the session. Progress → loader (0–40%).
- Then load drive frames sequentially in chunks of 8 (`Promise.all` per chunk) into an array; loader 40–100%. The experience becomes interactive as soon as orbit plates are ready; if the user scrubs into DRIVING before frame k is loaded, clamp the displayed frame to the last contiguous loaded index and show "buffering" in the HUD phase slot.
- Textures: exactly two WebGL textures. When the pair (floor, ceil) changes, upload only the image(s) that changed (`texImage2D` from the HTMLImageElement). Track which image each texture currently holds to avoid redundant uploads. Never keep more than 2 textures alive. Never create ImageBitmaps for the whole set.
- On unmount: delete textures/program, cancel rAF, remove listeners, restore overflow.

## Module contract (files under `components/cinematic/`)

```ts
// keyframes.ts
export type Quad = [[number,number],[number,number],[number,number],[number,number]]; // tl,tr,br,bl in normalized plate coords (0–1, origin top-left)
export const NEON_KEYFRAMES: { quad: Quad; opacity: number }[]; // length 11 (orbit plates 0..10)
export const PROJECTS: { code: string; name: string; category: string; description: string; stack: string; href: string }[]; // 6 entries; reuse the current placeholder projects

// compositor.ts
export type Compositor = {
  resize(width: number, height: number, dpr: number): void;
  setImages(a: HTMLImageElement | null, b: HTMLImageElement | null): void; // uploads only when the element identity changes
  render(params: { mix: number; zoomA: number; zoomB: number; offsetA: [number,number]; offsetB: [number,number]; time: number; flicker: number; grain: number; speed: number; still: boolean }): void;
  dispose(): void;
  readonly mode: 'webgl2' | 'canvas2d';
};
export function createCompositor(canvas: HTMLCanvasElement): Compositor;
// Also export coverFit(texW, texH, viewW, viewH, zoom, offset) → { scale, tx, ty } used by BOTH the shader math (mirrored in GLSL) and the neon overlay so they agree.

// plates.ts
export type PlateSet = { images: (HTMLImageElement | null)[]; count: number; width: number; height: number };
export function loadPlates(onProgress: (fraction: number, stage: 'orbit' | 'drive') => void, signal: AbortSignal): Promise<{ orbit: PlateSet; drive: PlateSet; driveReady: () => number /* contiguous loaded count */ }>;

// rain.ts
export function createRain(canvas: HTMLCanvasElement, opts: { density: number; still: boolean }): { resize(): void; step(dt: number): void; dispose(): void };

// neon.ts
export function quadToMatrix3d(quad: Quad, plateW: number, plateH: number, viewW: number, viewH: number, zoom: number, offset: [number,number], elemW: number, elemH: number): string; // returns a CSS matrix3d(...) string mapping the element's box onto the quad in screen space (cover-fit aware)
export function lerpQuad(a: Quad, b: Quad, t: number): Quad;
export function makeFlicker(seed: number): (time: number) => number; // returns uFlicker for a given time in seconds
```

`components/cinematic-experience.tsx` composes these. Keep the input handling (wheel/touch/keyboard, easing `1 − exp(−dt·5.8)`, overflow lock) from the current file. State that changes text (phase, active project, load progress, buffering) goes through React state with change-guards; everything per-frame (transforms, canvas) is done imperatively via refs.

## Quality bar / acceptance

- First paint shows the hero plate (poster) immediately; compositor takes over without a visible jump.
- At p = 0, 0.15, 0.3, 0.42, 0.5, 0.75, 1.0 the frame is a full-bleed photographic image with no black bars, no stretched pixels, no double/ghost text on the windshield, and the neon overlay sits on the windshield text within ~1% of the frame width.
- The orbit→drive seam (p ≈ 0.42) shows no brightness/colour jump larger than a normal crossfade.
- Reverse scroll returns to the exact hero.
- `npx tsc --noEmit` and `npm run lint` pass (no new errors beyond any that pre-exist in untouched files).
- No console errors in the browser.
- 375×812 viewport: hero car still visible and centred, cards full-width, HUD readable.
- prefers-reduced-motion: rain/flicker/grain off; scrubbing still works.

## Style tokens (unchanged)

`--background:#020304; --foreground:#f3f2ec; --signal:#f2d32f; --muted:#989891; --border: rgba(243,242,236,.18)`. Fonts: Geist Sans / Geist Mono via `next/font/google` (already in layout).

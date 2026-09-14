# Cinematic landing page — how it works

The landing page is one scroll-driven photographic shot: a head-on hero of a black coupe in the rain with a neon reflection of the name in the windshield, an orbit to the side view, then the car driving past buildings while project cards slide by. Scrolling never scrolls the page; it scrubs the sequence.

## Runtime layers (`components/cinematic-experience.tsx`)

| Layer | File | What it does |
|---|---|---|
| Poster | `app/globals.css` (`.cinematic-shell` background) | `/plates/poster.webp` paints before JS so the hero is instant. |
| Compositor | `components/cinematic/compositor.ts` | Raw WebGL2 fullscreen shader: cover-fit of two plates, crossfade, highlight flicker, lens droplets, chromatic aberration, grain, scanlines, vignette, baked-text suppression under the neon overlay, drive-glow ramp. Canvas2D fallback when WebGL2 is unavailable. |
| Plates | `components/cinematic/plates.ts` | Loads `/plates/manifest.json`, the 11 orbit plates first (interactive as soon as they decode), then the 196 drive frames in chunks. Only two GPU textures ever exist. |
| Rain | `components/cinematic/rain.ts` | 2D canvas streak rain in three depth bands; leans with speed while driving. Off under `prefers-reduced-motion`. |
| Neon sign | `components/cinematic/neon.ts` + `keyframes.ts` | Crisp HTML/SVG neon text mapped onto the windshield with a per-plate homography (`NEON_KEYFRAMES`). |
| Cards / HUD | `cinematic-experience.tsx` + `globals.css` | Six project "window" panels slide by while driving; HUD shows phase, progress and velocity. Projects live in `components/cinematic/keyframes.ts` (`PROJECTS`). |

Timeline: `p` 0–0.03 READY, 0.03–0.42 CAMERA ORBIT (plates 0…8,10 crossfaded, plate 9 skipped because it breaks the orbit), 0.42–1 DRIVING (frames scrubbed with an ease so the car "starts").

URL parameters: `?p=0.55` starts at that progress, `&still=1` freezes time-based effects (used for screenshots).

## Assets

- `public/orbit/frame-00..11.webp` — AI-generated source plates (from the ChatGPT session). Keep: the pipeline reads them.
- `sequence-work/free-supercar-drive.mp4` — source drive clip (4K, 9.8 s). Moved out of `public/` so it is not deployed.
- `public/plates/**` — GENERATED. Do not hand-edit; rebuild with `npm run plates`.
- `sequence-work/legacy-public/` — the earlier Lamborghini-style renders, the Ferrari GLB and the Draco decoder from the old three.js prototype. Unreferenced; kept for reference only.

## Commands

```bash
npm run dev            # vinext dev server on :3000
npm run plates         # rebuild public/plates from the orbit frames + drive clip (~6-10 min; needs ffmpeg-static, installed)
npm run shots          # headless screenshots at fixed progress points -> work/shots/ (needs Chrome installed)
npm run shots -- --mobile --p=0.15,0.5 --label=test
npx tsc --noEmit -p .  # typecheck
npm run lint           # oxlint (public/, work/, sequence-work/ are ignored)
```

`scripts/build-plates.mjs` applies one colour grade to every plate, then drive-only corrections (band darkening, sill soft-knee, seam calibration to orbit plate 10) so the two sources read as one film stock. Run it again after changing any of its constants.

## Dev-server note (vinext 1.0.0-beta.5)

`node_modules/vinext/dist/shims/internal/work-unit-async-storage.js` is patched locally: the original created a new AsyncLocalStorage on every hot reload and registered it in a global set, so after a few hundred HMR updates every request failed with `Maximum call stack size exceeded`. The patch routes it through the shared singleton. `npm install` will overwrite the patch; if the error returns, either re-apply it or upgrade vinext (1.0.0-beta.9 was current on 2026-09-14) and restart `npm run dev`.

## Known limits

- Portrait phones see a 16:9 plate cover-fitted, so the hero shows windshield + hood and the drive shows the rear wheel, sill and tail; the sequence pans to keep the sign and car in frame.
- The orbit is a crossfade of 10 AI stills, not true motion; the dissolves are short, zoomed and masked to read as camera motion.
- `npm run lint` still reports pre-existing findings in the scaffolded `components/ui/*` shadcn files.

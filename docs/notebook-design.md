# "A lab notebook, painted" — design plan (draft 1)

The portfolio becomes a painted field notebook of computational work. Every wash depicts one of Nathan's actual subjects (a black hole, wind-tunnel streamlines, a molecule, a chess knight) and every page pastes in a real output of the project. It must read as a scientist's notebook, never as a poetry site.

## Subject, audience, job
- Subject: Nathan W., who builds simulators (physics, chemistry) and the things that learn and work inside them (RL agents, coordination systems, games).
- Audience: engineers, researchers and founders deciding whether to talk to Nathan. They skim first, then read one case study.
- Job of the page: land the thesis in five seconds, get one project opened, get the GitHub or contact link clicked.

## Colour (cold-pressed paper, not cream)
| token | hex | use |
|---|---|---|
| `--paper` | `#F1F2EE` | page ground, slightly cool like cold-pressed watercolour paper |
| `--paper-deep` | `#E4E6DF` | pooled areas, print mats |
| `--ink` | `#1B1D1F` | text, ink lines |
| `--ink-soft` | `#5E6166` | annotations, captions |
| `--wash-space` | `#243A5E` | deep blue-black wash (astrophysics) |
| `--wash-fluid` | `#2F6FA8` | cobalt (fluids) |
| `--wash-chem` | `#6D4EA1` | violet (chemistry) |
| `--wash-umber` | `#8B5A2B` | umber (games, chess) |
| `--mark` | `#D9A93B` | yellow-ochre: the one accent (links, ticks, the "scroll" rule). Carries over the yellow from the earlier identity. |

Dark theme: the notebook is deliberately single-theme (a paper object). Paint the background explicitly so it holds on any host.

## Type
- Display: **Fraunces** (Google Fonts), optical size on, weight 500–600, tight tracking. Its slight wonk suits a hand-made notebook.
- Body: **Newsreader** 400/500, 17px, 65ch measure, line-height 1.55.
- Data / annotations: **Geist Mono** (already loaded), 11–12px, letter-spacing .08em, uppercase for labels.
- Headings get `text-wrap: balance`. Numbers use `font-variant-numeric: tabular-nums`.

## Layout
A single long page with a sticky, thin chapter rail. Three chapters that are true to the work:
1. **Simulate** — Black Hole Sim, Aero, HF-SCF Engine, Quantize, Formulate.
2. **Learn** — Gambit, Siege.
3. **Coordinate & make** — Kumi, Kumi Website, Nonstandard Conditions, Voice Agents (Clip), Nathan's World (the retired playable map, kept as an experiment).

Each project is a notebook "page": a print of the real output (screenshot or render) pasted with two tape corners, a painted vignette of the subject beside it, an ink annotation block (name, one-line, stack, three notes, link). Pages alternate print-left / print-right. Margins are generous; nothing is a card.

Hero: full-bleed painted black hole (Nathan's own composite render passed through the watercolour shader, disk slowly turning), the name set large in Fraunces, one sentence of thesis, and "Scroll to explore" as a short ochre rule.

## Motion (motion.dev, `motion/react`)
- Scroll-linked wash reveals: prints and washes appear through a brush-edged mask (`clip-path` on an inset circle/ellipse animated with `useScroll` + `useTransform`), never a plain fade.
- Ink lines draw themselves: SVG orbits, streamlines and bond lines animate `pathLength` 0→1 when in view.
- Text arrives like ink drying: word-level stagger, `filter: blur(6px)→0`, opacity, 40ms per word.
- Hover on prints: spring lift of 4px and a slight rotate, `whileHover`.
- Chapter rail: layout-animated indicator.
- Everything respects `prefers-reduced-motion` (Motion's `useReducedMotion`): reveals become instant, the hero disk stops.
- Nothing is parked at opacity 0 waiting for an observer: initial state is visible when JS is off; animations run from a visible resting state.

## Watercolour shader (hero and any real render)
WebGL2 fragment pass over the source image:
1. Soft simplification: 5-tap cross blur at 1.5px then mix 60/40 with the source.
2. Edge darkening: Sobel magnitude multiplies colour by `1 - 0.55 * edge`.
3. Pigment granulation: two octaves of value noise modulate luminance ±6% inside dark areas.
4. Wet-edge bloom: a slightly blurred luminance mask; where luminance rises across a boundary, darken the boundary ring.
5. Paper: multiply by a paper grain texture generated procedurally (fine noise + faint fibres), strength 0.18.
6. Colour: desaturate 15%, lift blacks to `--wash-space` so nothing is pure black.
7. Hero only: slow polar swirl of the accretion-disk band (angle = time × 0.02 rad/s × radial falloff) so the disk turns.
Fallback: if WebGL2 is unavailable, show the source image with a CSS paper multiply.

## Illustrations (two routes, both free)
- Route A: Nathan generates twelve ink-and-wash vignettes with ChatGPT from `docs/illustration-prompts.md` (one style guide, twelve prompts, identical framing rules). Transparent or paper-white background, 1024×1024, subject only.
- Route B: the shader paints real renders (black hole, Aero, the HF-SCF UI). Used for the hero and any print that benefits.
Until Route A images arrive, pages use a procedural wash placeholder in the project's wash colour (a soft blob with granulation), clearly a placeholder, never a broken image.

## Mobile
Paper texture at low strength, no full-viewport shaders below 700px wide except the hero (rendered at half resolution), prints full-width, annotations below prints, 16px gutters, tap targets ≥ 44px.

## Acceptance for draft 1
- Hero paints Nathan's real black hole with a visibly turning disk, on desktop and phone, with a static fallback.
- Twelve pages with real prints, taglines and notes, chapter rail working.
- Scroll reveals, ink drawing and word reveals present and calm; reduced motion respected.
- Typecheck clean; no console errors; page under 6 MB total.

# Notebook vignettes — style guide and twelve prompts

Twelve ink-and-wash vignettes for the painted field notebook, one per project. Generate them with ChatGPT image generation, one prompt per image, in a single conversation so the model keeps the style. Save each PNG at the path given under its prompt; the page loads `public/notebook/vignettes/<id>.png` and shows a procedural wash blob until the file exists.

## Style guide (applies to every image)

**Medium.** Dip-pen ink line drawing with a loose transparent watercolour wash on cold-pressed watercolour paper. The wash sits slightly inside or slightly past the ink line, never exactly on it. Visible pigment granulation and one or two wet-edge blooms. No cross-hatching heavier than a few sparse strokes.

**Line.** One consistent line weight across the set: a fine, slightly broken line, about 2 px at 1024 px, with a small hand wobble. Ink colour is near-black `#1B1D1F`, never pure black. Lines are open where the wash carries the form.

**Palette.** Muted. Each image uses one wash colour (given per prompt) in two or three dilutions, plus a single small touch of yellow-ochre `#D9A93B` as the only warm accent. No other saturated colour. No black wash; shadows are the wash colour laid twice.

| wash  | hex       | projects                                                   |
|-------|-----------|------------------------------------------------------------|
| space | `#243A5E` | Black Hole Sim                                             |
| fluid | `#2F6FA8` | Aero, Voice Agents                                         |
| chem  | `#6D4EA1` | HF–SCF Engine, Quantize, Formulate, Nonstandard Conditions |
| umber | `#8B5A2B` | Gambit, Siege, Kumi, Kumi Website, Nathan's World          |

**Lighting.** Soft, diffuse daylight from the upper left. One layer of wash for shadow on the lower right of the subject. No cast shadow on the ground, no highlights painted in white.

**Framing.** A single subject, centred, occupying the middle 60 % of the canvas with roughly 20 % clear margin on every side. Square, 1024 × 1024. Background is either transparent (preferred) or flat paper-white `#F1F2EE` with no texture, no vignette darkening and no horizon line; the page multiplies the image onto its own paper, so a paper-white background disappears. Nothing touches the edge of the canvas.

**Never.** No text, letters, numbers, labels or captions. No frame, border, mat or panel. No signature or watermark. No second subject. No photorealism, 3D render, glossy highlights, neon, gradients or drop shadows.

**Shared negative prompt** (append to every request):

> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

**Workflow.**
1. Paste the style guide once at the top of the conversation, then send the twelve prompts one at a time.
2. Ask for a transparent PNG at 1024 × 1024. If the model returns a white background, that is also fine.
3. Check each result against the checklist below before saving. Regenerate rather than edit.
4. Save as `public/notebook/vignettes/<id>.png` using the exact filename under each prompt.

**Checklist per image.** One subject, centred, clear margin on all sides; one wash colour plus one small ochre touch; even line weight; nothing written on it; background transparent or flat white; square.

---

## Prompts

Each prompt below is self-contained. Copy the whole block including the negative line.

### 01 · Black Hole Sim — `black-hole`

Save as: `public/notebook/vignettes/black-hole.png`
Wash: space `#243A5E`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a Schwarzschild black hole seen from slightly above, with a thin accretion disk tilted about twenty degrees, the far side of the disk lensed up and over the top of the shadow, and a fine bright photon ring hugging the dark circle. The disk is drawn as a few concentric pen lines with a deep blue-black wash `#243A5E` in two dilutions; the shadow is the darkest wash, not solid black. One small touch of yellow-ochre `#D9A93B` on the near edge of the disk where it is brightest. Fine even ink line, soft light from the upper left, granulated wash, no stars, no glow.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 02 · Aero — `aero`

Save as: `public/notebook/vignettes/aero.png`
Wash: fluid `#2F6FA8`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a side view of a circular cylinder in a wind tunnel, with seven or eight streamlines flowing left to right, bending smoothly around the cylinder and closing into a pair of small recirculating eddies behind it. The streamlines are single fine ink lines; the wake and the eddies carry a cobalt wash `#2F6FA8` in two dilutions, denser near the cylinder. One small touch of yellow-ochre `#D9A93B` at the front stagnation point. No tunnel walls, no arrows, no grid. Fine even ink line, soft light from the upper left, granulated wash.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 03 · HF–SCF Engine — `hf-scf`

Save as: `public/notebook/vignettes/hf-scf.png`
Wash: chem `#6D4EA1`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a single water molecule, one large oxygen sphere with two smaller hydrogen spheres at the familiar bent angle, drawn ball-and-stick in fine ink, with two soft translucent orbital lobes rising from the oxygen like a pair of rounded petals. The lobes and the oxygen carry a violet wash `#6D4EA1` in two dilutions; the hydrogens are left mostly paper with a thin wash rim. One small touch of yellow-ochre `#D9A93B` on one hydrogen. Fine even ink line, soft light from the upper left, granulated wash, no labels on the atoms.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 04 · Quantize — `quantize`

Save as: `public/notebook/vignettes/quantize.png`
Wash: chem `#6D4EA1`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a small bent three-atom molecule drawn ball-and-stick, floating just above a short baseline from which rise about fifteen thin vertical pen strokes of varying height, spaced like the lines of a rotational spectrum. The molecule carries a violet wash `#6D4EA1` in two dilutions; the spectral lines are ink only with a faint violet wash pooled at their feet. One small touch of yellow-ochre `#D9A93B` on the single tallest line. The molecule and the spectrum read as one object. Fine even ink line, soft light from the upper left, granulated wash, no axis labels, no numbers.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 05 · Formulate — `formulate`

Save as: `public/notebook/vignettes/formulate.png`
Wash: chem `#6D4EA1`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a glass laboratory funnel drawn in fine ink, with six or seven tiny hexagonal ring molecules tumbling into its wide mouth from above and one single larger ring molecule emerging from the narrow stem below. The funnel glass is a pale violet wash `#6D4EA1`, the small molecules are ink only, and the one molecule at the bottom carries the fuller violet wash. One small touch of yellow-ochre `#D9A93B` on the emerging molecule. Fine even ink line, soft light from the upper left, granulated wash, no bench, no hands, no labels.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 06 · Gambit — `gambit`

Save as: `public/notebook/vignettes/gambit.png`
Wash: umber `#8B5A2B`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a single Staunton chess knight standing on one dark square, the square shown as a shallow tilted diamond of umber wash `#8B5A2B` beneath the piece and nothing else of the board. The knight is drawn in fine ink with the umber wash in two dilutions, denser in the mane and under the jaw. One small touch of yellow-ochre `#D9A93B` in the eye. Fine even ink line, soft light from the upper left, granulated wash, no other pieces, no clock.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 07 · Siege — `siege`

Save as: `public/notebook/vignettes/siege.png`
Wash: umber `#8B5A2B`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a single Clash Royale-style arena tower, a squat round stone tower with a crenellated top, a small conical roof and one pennant flag, standing on a small round patch of ground. The stone carries an umber wash `#8B5A2B` in two dilutions with the roof left paler; the ground patch is a thin wash. One small touch of yellow-ochre `#D9A93B` on the flag. Fine even ink line, soft light from the upper left, granulated wash, no characters, no river, no second tower.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 08 · Kumi — `kumi`

Save as: `public/notebook/vignettes/kumi.png`
Wash: umber `#8B5A2B`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: two simple seated figures at opposite ends of one long desk, seen from the side, passing a single index card between them across the desk; their outstretched arms and the card form the centre of the image. Figures and desk are drawn in fine ink with a light umber wash `#8B5A2B` on the desk and the figures' clothing in two dilutions, faces left as paper with a single line each. The card is paper-white with one small touch of yellow-ochre `#D9A93B` on its corner. No chairs beyond a hint, no screens, no room. Fine even ink line, soft light from the upper left, granulated wash.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 09 · Kumi Website — `kumi-site`

Save as: `public/notebook/vignettes/kumi-site.png`
Wash: umber `#8B5A2B`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a small tabletop hand letterpress, the kind with an iron frame, a round ink disc and a lever, with one blank printed sheet lifting off the bed. The iron frame carries an umber wash `#8B5A2B` in two dilutions; the sheet is left as paper with a thin wash shadow under its lifted edge. One small touch of yellow-ochre `#D9A93B` on the tip of the lever handle. No table, no type visible, nothing printed on the sheet. Fine even ink line, soft light from the upper left, granulated wash.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 10 · Nonstandard Conditions — `nonstandard`

Save as: `public/notebook/vignettes/nonstandard.png`
Wash: chem `#6D4EA1`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a single slender lighthouse on a small outcrop of rock, drawn in fine ink, with a lantern room at the top and a low railing. The tower carries a pale violet wash `#6D4EA1` in two dilutions with the rock in the fuller wash; the sky and sea are left empty paper, no horizon line, no waves beyond two short strokes at the base. One small touch of yellow-ochre `#D9A93B` in the lantern glass. Fine even ink line, soft light from the upper left, granulated wash, no light beams, no birds, no boats.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 11 · Voice Agents — `voice-agents`

Save as: `public/notebook/vignettes/voice-agents.png`
Wash: fluid `#2F6FA8`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a single classic broadcast microphone on a short stand, drawn in fine ink, with three or four concentric arcs of sound waves leaving the grille to the right, each arc a single broken pen line. The microphone body carries a cobalt wash `#2F6FA8` in two dilutions; the sound arcs are ink with a faint cobalt wash between the two nearest arcs. One small touch of yellow-ochre `#D9A93B` on the stand's base. No cable, no phone, no table. Fine even ink line, soft light from the upper left, granulated wash.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

### 12 · Nathan's World — `website`

Save as: `public/notebook/vignettes/website.png`
Wash: umber `#8B5A2B`

> Ink line drawing with a loose watercolour wash on cold-pressed paper. Single subject, centred, 20 % clear margin, square 1024 × 1024, transparent background, no text. Subject: a small pixel-art village on a low rounded hill, drawn as a single cluster of five or six blocky square-cornered houses with stepped roofs, a tiny blocky tree or two and one winding path down the hill, the whole thing sketched in fine ink so the pixel edges read as tiny stair-steps. The hill and roofs carry an umber wash `#8B5A2B` in two dilutions; house walls are left as paper. One small touch of yellow-ochre `#D9A93B` in one window. No sky, no clouds, no characters, no grid. Fine even ink line, soft light from the upper left, granulated wash.
>
> Negative: text, letters, numbers, labels, captions, watermark, signature, frame, border, panel, multiple subjects, cropped subject, photorealistic, 3D render, CGI, glossy, neon, gradient background, dark background, drop shadow, heavy cross-hatching, black wash, extra colours, blurred, low detail.

---

## Filenames at a glance

| id             | file                                          | wash  |
|----------------|-----------------------------------------------|-------|
| `black-hole`   | `public/notebook/vignettes/black-hole.png`    | space |
| `aero`         | `public/notebook/vignettes/aero.png`          | fluid |
| `hf-scf`       | `public/notebook/vignettes/hf-scf.png`        | chem  |
| `quantize`     | `public/notebook/vignettes/quantize.png`      | chem  |
| `formulate`    | `public/notebook/vignettes/formulate.png`     | chem  |
| `gambit`       | `public/notebook/vignettes/gambit.png`        | umber |
| `siege`        | `public/notebook/vignettes/siege.png`         | umber |
| `kumi`         | `public/notebook/vignettes/kumi.png`          | umber |
| `kumi-site`    | `public/notebook/vignettes/kumi-site.png`     | umber |
| `nonstandard`  | `public/notebook/vignettes/nonstandard.png`   | chem  |
| `voice-agents` | `public/notebook/vignettes/voice-agents.png`  | fluid |
| `website`      | `public/notebook/vignettes/website.png`       | umber |

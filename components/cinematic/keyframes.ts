/**
 * Neon-sign keyframes for the camera-orbit plates (public/orbit/frame-00..10.webp, 1280x720).
 *
 * Each quad is the bounding quadrilateral of the baked yellow windshield text block
 * ("NATHAN W." + "SOFTWARE DEVELOPER • BUILDER", both lines together) measured on the
 * plate, as [tl, tr, br, bl] in normalized plate coordinates (x / 1280, y / 720,
 * origin top-left). The quads follow the perspective of the text on the curved glass,
 * so opposite edges are not necessarily parallel. `opacity` is a per-plate multiplier
 * for the crisp HTML neon overlay drawn on top of the baked text: 1 where the overlay
 * aligns cleanly, lower where the baked text is distorted or partly hidden, and 0 where
 * the windshield is edge-on or the plate has no usable text. Between plates the four
 * corners and the opacity are interpolated linearly.
 *
 * Measured from 3x/4x crops of each plate (see docs/photoreal-spec.md, layer 4). Plates 2, 3,
 * 5, 6 and 7 were re-fitted by aligning plate 0's yellow-text mask (warped through the box
 * homography) to each plate's own mask, so the glyph layout below lands on the baked letters.
 */

/** tl, tr, br, bl in normalized plate coords (0-1, origin top-left). */
export type Quad = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

export type NeonKeyframe = { quad: Quad; opacity: number };

export const PLATE_WIDTH = 1280;
export const PLATE_HEIGHT = 720;

/** One entry per orbit plate, index 0..10. */
export const NEON_KEYFRAMES: NeonKeyframe[] = [
  // plate 00 - head-on hero; text crisp and level, block spans x528-751
  // px: (528,153) (745,158) (751,210) (527,197)
  {
    quad: [
      [0.4125, 0.2125],
      [0.582, 0.2194],
      [0.5867, 0.2917],
      [0.4117, 0.2736],
    ],
    opacity: 1,
  },
  // plate 01 - slight orbit; text crisp, mild clockwise tilt
  // px: (500,161) (687,166) (698,211) (507,201)
  {
    quad: [
      [0.3906, 0.2236],
      [0.5367, 0.2306],
      [0.5453, 0.2931],
      [0.3961, 0.2792],
    ],
    opacity: 1,
  },
  // plate 02 - text begins to arch on the glass; bottom line ends left of the top line
  // px: (507,161) (655,158) (630,213) (477,197)
  {
    quad: [
      [0.3961, 0.2229],
      [0.5113, 0.2194],
      [0.4922, 0.2958],
      [0.3727, 0.2736],
    ],
    opacity: 0.95,
  },
  // plate 03 - stronger perspective; first N and S distorted at the A-pillar
  // px: (474,191) (634,172) (617,217) (452,223)
  {
    quad: [
      [0.3699, 0.2653],
      [0.4953, 0.2382],
      [0.4816, 0.3007],
      [0.3527, 0.3097],
    ],
    opacity: 0.8,
  },
  // plate 04 - leading "SOF"/N hidden behind the A-pillar reflection; bl extrapolated.
  // Known residual: at p ~ 0.2 the baked role line shows ~5 view px above the overlay's even
  // when the quad is set from the plate's measured text extents (title rows 166-183, role
  // 186-207, right edge ~632), i.e. this plate's baked line gap differs from the overlay's
  // SVG layout and a homography cannot close it; moving the quad only trades one ghost for another.
  // px: (497,169) (635,165) (628,208) (485,198)
  {
    quad: [
      [0.3883, 0.2347],
      [0.4961, 0.2292],
      [0.4906, 0.2889],
      [0.3789, 0.275],
    ],
    opacity: 0.7,
  },
  // plate 05 - clean text; bottom line shifted ~14px left of the top line (shear)
  // px: (543,167) (696,168) (674,215) (523,199)
  {
    quad: [
      [0.4242, 0.2319],
      [0.5434, 0.2333],
      [0.5262, 0.2979],
      [0.4086, 0.2757],
    ],
    opacity: 0.9,
  },
  // plate 06 - counter-clockwise tilt, bottom line wider than top
  // px: (505,177) (659,168) (631,222) (475,212)
  {
    quad: [
      [0.3945, 0.2458],
      [0.5145, 0.2326],
      [0.4926, 0.3083],
      [0.3707, 0.2944],
    ],
    opacity: 0.85,
  },
  // plate 07 - strongest legible tilt (~6deg ccw)
  // px: (497,199) (632,172) (623,215) (476,226)
  {
    quad: [
      [0.3883, 0.2757],
      [0.4938, 0.2382],
      [0.4867, 0.2986],
      [0.3715, 0.3139],
    ],
    opacity: 0.8,
  },
  // plate 08 - near-side view; baked text garbled and foreshortened, low confidence
  // px: (413,229) (512,199) (494,233) (398,253)
  {
    quad: [
      [0.3227, 0.3181],
      [0.4, 0.2764],
      [0.3859, 0.3236],
      [0.3109, 0.3514],
    ],
    opacity: 0.35,
  },
  // plate 09 - plate jumps back to a 3/4 view; overlay forced off
  // px: (456,187) (589,182) (576,234) (444,225)
  {
    quad: [
      [0.3563, 0.2597],
      [0.4602, 0.2528],
      [0.45, 0.325],
      [0.3469, 0.3125],
    ],
    opacity: 0,
  },
  // plate 10 - full side profile, windshield edge-on, no baked text; quad extrapolated
  // px: (445,205) (520,190) (505,235) (425,250)
  {
    quad: [
      [0.3477, 0.2847],
      [0.4063, 0.2639],
      [0.3945, 0.3264],
      [0.332, 0.3472],
    ],
    opacity: 0,
  },
];

/** SVG user-unit box of the neon overlay: the frame every keyframe quad maps onto (tl = 0,0). */
export const NEON_BOX_UNITS: [number, number] = [220, 50];

export type NeonGlyph = {
  line: 'name' | 'role';
  text: string;
  /** Left end of the baseline, in NEON_BOX_UNITS. */
  x: number;
  y: number;
  /** Advance the glyph is stretched to (textLength), in NEON_BOX_UNITS. */
  width: number;
};

/**
 * Per-glyph layout of the baked windshield text on plate 0, in NEON_BOX_UNITS. The baked
 * lines arch with the curved glass and use a different face, so a straight string of Geist
 * never coincides with them; each glyph is therefore placed on its own measured baseline and
 * stretched to its measured advance. Measured from the column/row profile of
 * public/orbit/frame-00.webp and mapped through NEON_KEYFRAMES[0].quad
 * (work/integ/neonlayout.mjs in the integration QA notes).
 */
export const NEON_GLYPHS: NeonGlyph[] = [
  { line: 'name', text: 'N', x: 0.8, y: 32.6, width: 27.5 },
  { line: 'name', text: 'A', x: 31.6, y: 29, width: 29.6 },
  { line: 'name', text: 'T', x: 61.2, y: 25.7, width: 22.3 },
  { line: 'name', text: 'H', x: 87.7, y: 24.6, width: 26.5 },
  { line: 'name', text: 'A', x: 116.2, y: 23.4, width: 24.5 },
  { line: 'name', text: 'N', x: 145.4, y: 23.3, width: 22.6 },
  { line: 'name', text: 'W', x: 180.5, y: 25.6, width: 29.2 },
  { line: 'name', text: '.', x: 211.6, y: 23.8, width: 4.3 },
  { line: 'role', text: 'S', x: -1, y: 54.2, width: 9.2 },
  { line: 'role', text: 'O', x: 8.1, y: 52.6, width: 9.1 },
  { line: 'role', text: 'F', x: 18.3, y: 49.9, width: 7.8 },
  { line: 'role', text: 'T', x: 26.1, y: 47.3, width: 7.8 },
  { line: 'role', text: 'W', x: 35, y: 45.6, width: 12.1 },
  { line: 'role', text: 'A', x: 48.1, y: 43.8, width: 10.8 },
  { line: 'role', text: 'R', x: 58.9, y: 42.3, width: 7.5 },
  { line: 'role', text: 'E', x: 67.5, y: 39.7, width: 7.4 },
  { line: 'role', text: 'D', x: 81.1, y: 39, width: 9.3 },
  { line: 'role', text: 'E', x: 91.4, y: 38.5, width: 7.1 },
  { line: 'role', text: 'V', x: 99.6, y: 38.1, width: 8.1 },
  { line: 'role', text: 'E', x: 108.6, y: 37.6, width: 7 },
  { line: 'role', text: 'L', x: 117.6, y: 37.2, width: 6.9 },
  { line: 'role', text: 'O', x: 125.5, y: 36.7, width: 8.7 },
  { line: 'role', text: 'P', x: 135.2, y: 36.2, width: 7.7 },
  { line: 'role', text: 'E', x: 143.8, y: 35.8, width: 6.6 },
  { line: 'role', text: 'R', x: 151.3, y: 36.4, width: 7.5 },
  // The bullet is drawn as a circle: x/width give its extent, y its centre.
  { line: 'role', text: '•', x: 164.4, y: 32.9, width: 4.6 },
  { line: 'role', text: 'B', x: 173.3, y: 38.2, width: 7.2 },
  { line: 'role', text: 'U', x: 181.3, y: 38.8, width: 7.1 },
  { line: 'role', text: 'I', x: 189.2, y: 40.4, width: 2.7 },
  { line: 'role', text: 'L', x: 192.5, y: 42, width: 6.1 },
  { line: 'role', text: 'D', x: 199.5, y: 42.6, width: 6.9 },
  { line: 'role', text: 'E', x: 207, y: 45, width: 6 },
  { line: 'role', text: 'R', x: 213.2, y: 51.2, width: 5.9 },
];

export type Project = {
  code: string;
  name: string;
  category: string;
  description: string;
  stack: string;
  href: string;
};

/** Placeholder projects shown in the window-cards during the DRIVING phase. */
export const PROJECTS: Project[] = [
  {
    code: 'NW–001',
    name: 'Velocity Lab',
    category: 'Digital product',
    description:
      'A modular interface system for expressive, motion-led products.',
    stack: 'React / TypeScript / Motion',
    href: 'https://github.com/',
  },
  {
    code: 'NW–002',
    name: 'Northstar',
    category: 'Creative tool',
    description:
      'A focused planning environment that turns ideas into clear action.',
    stack: 'Next.js / AI / Systems',
    href: 'https://github.com/',
  },
  {
    code: 'NW–003',
    name: 'Signal',
    category: 'Experiment',
    description: 'A real-time study in data, sound, and ambient interfaces.',
    stack: 'WebGL / Audio / Data',
    href: 'https://github.com/',
  },
  {
    code: 'NW–004',
    name: 'Relay',
    category: 'Developer tool',
    description: 'Lightweight automations that connect everyday workflows.',
    stack: 'Node.js / APIs / Automation',
    href: 'https://github.com/',
  },
  {
    code: 'NW–005',
    name: 'Lumen',
    category: 'AI experiment',
    description: 'Visual studies exploring image, language, and interaction.',
    stack: 'AI / Creative code / UX',
    href: 'https://github.com/',
  },
  {
    code: 'NW–006',
    name: 'Index',
    category: 'Knowledge product',
    description:
      'A fast home for notes, references, code, and unfinished ideas.',
    stack: 'Search / Design / Web',
    href: 'https://github.com/',
  },
];

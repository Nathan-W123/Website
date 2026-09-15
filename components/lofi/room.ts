/**
 * The room is a painted illustration plus an animation layer drawn in the
 * illustration's own pixel coordinates. Swap the image and update the
 * coordinates below when the final artwork arrives.
 */

export type Rect = { x: number; y: number; w: number; h: number };

export type RoomArt = {
  /** Served from public/; the artifact bundle prefixes it with its own base. */
  src: string;
  width: number;
  height: number;
  /** On wide screens, at least this fraction of the painting's height stays visible (0–1). */
  minVisibleHeight: number;
  /** Which point of the picture to keep in view when the viewport crops it (0–1). */
  focus: { landscape: { x: number; y: number }; portrait: { x: number; y: number } };
  /** Sky visible through the window, where birds and clouds live. */
  windowOpening: Rect;
  /** Where the horizon glow sits. */
  sun: { x: number; y: number; r: number };
  /** Lamp head, for its glow. */
  lamp: { x: number; y: number; r: number } | null;
  /** Rim of the mug, where steam starts. */
  mug: { x: number; y: number } | null;
  /** Region the sunlight falls on, where dust motes drift. */
  lightBeam: Rect;
  hotspots: { laptop: Rect; sketchbook: Rect };
  /** On portrait screens keep this x-range of the painting in view (letterboxing if needed). */
  portraitSpan: [number, number];
  /** Affine map from the sketchbook cover's local 135x62 box to the painting, or null if the cover already has a title. */
  bookTitle: [number, number, number, number, number, number] | null;
  /** PROJECTS sticker on the laptop lid, or null when the painting has its own. */
  laptopSticker: { x: number; y: number; rotate: number } | null;
  /** Wall whiteboard box and the wall patch it hangs on (shelves painted over), or null for the floating fallback. */
  whiteboard: { x: number; y: number; w: number; h: number; wall: { x: number; y: number; w: number; h: number } } | null;
  /** A post and base for the lamp (x of the post, top at the arm hinge, bottom on the desk), or null when the painting's lamp has one. */
  lampStand: { x: number; top: number; bottom: number } | null;
};

/**
 * The room painting now includes the blank wall whiteboard and the complete
 * desk lamp. Interactive lettering and ambient motion remain separate so the
 * board can receive real links later and the scene stays alive.
 */
export const ROOM: RoomArt = {
  src: '/lofi/room-integrated-v3.png',
  width: 2290,
  height: 1288,
  minVisibleHeight: 0.92,
  focus: { landscape: { x: 0.5, y: 0.56 }, portrait: { x: 0.5, y: 0.5 } },
  portraitSpan: [500, 1640],
  windowOpening: { x: 905, y: 100, w: 470, h: 660 },
  sun: { x: 1110, y: 620, r: 330 },
  lamp: { x: 600, y: 640, r: 150 },
  mug: { x: 1042, y: 952 },
  lightBeam: { x: 750, y: 250, w: 700, h: 780 },
  hotspots: {
    laptop: { x: 1160, y: 710, w: 470, h: 360 },
    sketchbook: { x: 540, y: 965, w: 200, h: 135 },
  },
  bookTitle: null,
  laptopSticker: { x: 1462, y: 842, rotate: 3 },
  whiteboard: null,
  lampStand: null,
};

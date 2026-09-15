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
  /** Inner surface of the whiteboard painted into the room, where the contact details are written. */
  boardWriting: { x: number; y: number; w: number; h: number } | null;
};

/**
 * The regenerated 1672x941 room includes the blank whiteboard, the finished
 * lamp and the title painted directly onto the sketchbook.
 */
export const ROOM: RoomArt = {
  src: '/lofi/room-integrated-v4.png',
  width: 1672,
  height: 941,
  minVisibleHeight: 0.92,
  focus: { landscape: { x: 0.5, y: 0.5 }, portrait: { x: 0.5, y: 0.5 } },
  portraitSpan: [380, 1180],
  windowOpening: { x: 668, y: 62, w: 334, h: 500 },
  sun: { x: 830, y: 470, r: 230 },
  lamp: { x: 450, y: 430, r: 110 },
  mug: { x: 760, y: 712 },
  lightBeam: { x: 520, y: 180, w: 520, h: 640 },
  hotspots: {
    laptop: { x: 850, y: 530, w: 330, h: 260 },
    sketchbook: { x: 405, y: 712, w: 115, h: 85 },
  },
  bookTitle: null,
  laptopSticker: { x: 1058, y: 628, rotate: 2 },
  whiteboard: null,
  lampStand: null,
  boardWriting: { x: 1262, y: 178, w: 374, h: 272 },
};

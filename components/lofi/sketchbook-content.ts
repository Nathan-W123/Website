/**
 * Content of the art sketchbook. Each section is one two-page scrapbook
 * spread. Items are placed in page-percent coordinates; images live in
 * public/art/<section>/ (web-sized WebP made from Nathan's photos).
 */

export const OWNER = {
  name: 'Nathan W.',
  /** Replace with the real handle. */
  instagram: 'nathan.w.art',
};

export type ScrapItem = {
  /** Which page of the spread. */
  page: 'left' | 'right';
  /** Position and size in percent of the page box. */
  x: number;
  y: number;
  w: number;
  /** Aspect ratio width/height of the photo. */
  ratio?: number;
  rotate?: number;
  caption?: string;
  image?: string;
  /** Fastening: tape strips or a pin. */
  fix?: 'tape' | 'pin' | 'corners';
  tone?: 'peach' | 'sage' | 'lilac' | 'sky';
};

export type ScrapDoodle = {
  page: 'left' | 'right';
  x: number;
  y: number;
  kind: 'star' | 'arrow' | 'heart' | 'squiggle' | 'note';
  text?: string;
  rotate?: number;
};

export type Section = {
  id: string;
  title: string;
  blurb: string;
  /** Page number printed in the contents (the spread's left page). */
  pageNumber: number;
  items: ScrapItem[];
  doodles: ScrapDoodle[];
};

const art = (section: string, name: string) => `/art/${section}/${name}.webp`;

export const SECTIONS: Section[] = [
  {
    id: 'shoes',
    title: 'Shoes',
    blurb: 'Custom pairs, painted by hand.',
    pageNumber: 3,
    items: [
      { page: 'left', x: 6, y: 20, w: 46, ratio: 1.0, rotate: -5, caption: 'blue doodle court visions', image: art('shoes', 'blue-doodle'), fix: 'tape' },
      { page: 'left', x: 50, y: 14, w: 44, ratio: 1.097, rotate: 4, caption: 'shinx', image: art('shoes', 'shinx'), fix: 'pin' },
      { page: 'left', x: 24, y: 58, w: 50, ratio: 1.338, rotate: -2, caption: 'graffiti air force 1s', image: art('shoes', 'graffiti'), fix: 'corners' },
      { page: 'right', x: 8, y: 10, w: 46, ratio: 1.003, rotate: 3, caption: 'great wave + dragon', image: art('shoes', 'wave-dragon'), fix: 'tape' },
      { page: 'right', x: 52, y: 22, w: 42, ratio: 0.988, rotate: -4, caption: 'strawberries', image: art('shoes', 'strawberries'), fix: 'pin' },
      { page: 'right', x: 18, y: 56, w: 44, ratio: 0.963, rotate: 2, caption: 'purple monster', image: art('shoes', 'purple-monster'), fix: 'tape' },
    ],
    doodles: [
      { page: 'left', x: 80, y: 62, kind: 'star', rotate: 12 },
      { page: 'right', x: 66, y: 80, kind: 'note', text: 'acrylic on leather', rotate: -6 },
      { page: 'left', x: 8, y: 82, kind: 'arrow', rotate: 20 },
    ],
  },
  {
    id: 'doodles',
    title: 'Doodles',
    blurb: 'Copic markers and a lot of little faces.',
    pageNumber: 5,
    items: [
      { page: 'left', x: 6, y: 18, w: 34, ratio: 0.856, rotate: -6, caption: 'eagle', image: art('doodles', 'eagle'), fix: 'tape' },
      { page: 'left', x: 42, y: 10, w: 34, ratio: 0.809, rotate: 4, caption: 'elephant', image: art('doodles', 'elephant'), fix: 'pin' },
      { page: 'left', x: 62, y: 44, w: 34, ratio: 0.81, rotate: -3, caption: 'dragon, three sheets', image: art('doodles', 'dragon'), fix: 'corners' },
      { page: 'left', x: 8, y: 58, w: 36, ratio: 1.01, rotate: 3, caption: 'sea turtle, stipple', image: art('doodles', 'turtle'), fix: 'tape' },
      { page: 'left', x: 38, y: 62, w: 28, ratio: 0.803, rotate: -8, caption: 'heart', image: art('doodles', 'heart'), fix: 'pin' },
      { page: 'right', x: 8, y: 10, w: 40, ratio: 1.017, rotate: 5, caption: '不安', image: art('doodles', 'kanji'), fix: 'tape' },
      { page: 'right', x: 52, y: 8, w: 40, ratio: 1.01, rotate: -4, caption: 'squid', image: art('doodles', 'squid'), fix: 'corners' },
      { page: 'right', x: 10, y: 54, w: 36, ratio: 0.927, rotate: -3, caption: 'daydream', image: art('doodles', 'daydream'), fix: 'pin' },
      { page: 'right', x: 52, y: 52, w: 38, ratio: 0.948, rotate: 4, caption: 'flower pot', image: art('doodles', 'flower-pot'), fix: 'tape' },
    ],
    doodles: [
      { page: 'right', x: 46, y: 46, kind: 'heart', rotate: -10 },
      { page: 'left', x: 46, y: 50, kind: 'star', rotate: 8 },
      { page: 'right', x: 6, y: 92, kind: 'note', text: 'markers on bristol', rotate: 3 },
    ],
  },
  {
    id: 'drawing',
    title: 'Drawing',
    blurb: 'Full pieces in marker and ink.',
    pageNumber: 7,
    items: [
      { page: 'left', x: 12, y: 14, w: 74, ratio: 0.854, rotate: -2, caption: 'carnage', image: art('drawing', 'carnage'), fix: 'tape' },
      { page: 'right', x: 14, y: 12, w: 72, ratio: 0.817, rotate: 3, caption: 'flower pot guy', image: art('drawing', 'flower-pot-guy'), fix: 'corners' },
    ],
    doodles: [
      { page: 'right', x: 8, y: 90, kind: 'note', text: 'copic sketch', rotate: -4 },
      { page: 'left', x: 82, y: 8, kind: 'star', rotate: -14 },
      { page: 'right', x: 80, y: 84, kind: 'squiggle', rotate: -8 },
    ],
  },
];

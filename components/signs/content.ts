import { CHAPTERS, type NotebookProject } from '@/components/notebook/content';
import { SECTIONS } from '@/components/lofi/sketchbook-content';
import { GALLERY, type Shot } from './gallery';
import { STUDIES, type Study } from './studies';

export const NAME = 'Nathan W.';

/** The about page: a one-liner, a paragraph, a photo and where I am. */
export const ABOUT = {
  tagline: 'Learning by building.',
  /**
   * `{key|words}` marks a phrase that carries a small picture inline and shows
   * a few more when you hover it. The keys are defined in SPOTS below.
   */
  paragraphs: [
    "Hi, I'm Nathan. I study civil engineering and chemistry at UC Davis, where I do {quantum|quantum research} most weeks.",
    "In Winter 2027 I'm joining {forming|Machina Labs} as a simulation engineer.",
    'I also run an art business, painting {shoes|custom shoes} for people and organisations.',
    'Before transferring, I placed in the top 1% in the nation on the 2025 organic chemistry ACS exam.',
    'I like building fast, and working at the frontier.',
  ],






  based: 'based in Davis',
  /** Drop the portrait at public/about/nathan.jpg; the frame hides itself until it exists. */
  photo: '/about/nathan.jpg',
};

/** Commissions and clients, listed on an index card on the art board. */
export const WORKED_WITH = ['Lodi Fire Department', 'Pacific Coast Producers', 'NewSongs School of Music', 'Akers Real Estate', 'FAM (Foster Adoption Ministry)'];

/** The bench: things just finished or in progress, shown under the landing page. */
export type Recent = { kind: 'project'; id: string; status: string } | { kind: 'art'; section: string; image: string; title: string; status: string };
export const RECENT: Recent[] = [
  { kind: 'project', id: 'quantize', status: 'building now' },
  { kind: 'project', id: 'machina', status: 'building now' },
  { kind: 'project', id: 'aero', status: 'just finished' },
  { kind: 'art', section: 'shoes', image: '/art/shoes/purple-monster.webp', title: 'Gengar shoes', status: 'just finished' },
];

/** What sits inline in the About copy, and what fans out of it on hover. */
export const SPOTS: Record<string, { icon: string; shots: string[] }> = {
  quantum: {
    icon: '/tiles/hf-scf.webp',
    shots: ['/projects/quantize/1.webp', '/projects/hf-scf/3.webp', '/projects/quantize/3.webp'],
  },
  forming: {
    icon: '/tiles/machina.webp',
    shots: ['/projects/machina/1.webp', '/projects/machina/2.webp', '/projects/machina/4.webp'],
  },
  shoes: {
    icon: '/art/shoes/purple-monster.webp',
    shots: ['/art/shoes/wave-dragon.webp', '/art/shoes/graffiti.webp', '/art/shoes/strawberries.webp'],
  },
};

export const CONTACTS = [
  { id: 'instagram', label: 'Instagram', handle: '@naze_draws', href: 'https://instagram.com/naze_draws' },
  { id: 'linkedin', label: 'LinkedIn', handle: 'linkedin.com/in/nathan-ward-', href: 'https://www.linkedin.com/in/nathan-ward-' },
  { id: 'github', label: 'GitHub', handle: 'Nathan-W123', href: 'https://github.com/Nathan-W123' },
  { id: 'email', label: 'Email', handle: 'ncward@ucdavis.edu', href: 'mailto:ncward@ucdavis.edu' },
];

/** What the pieces are made with, shown beside an expanded artwork. */
const MARKERS = ['Copic markers', 'Copic blender card', 'Sakura Jelly Roll pen', '0.3 mm and 0.5 mm Micron fineliners'];
const PENCILS = ['Staedtler 2H and HB pencils'];
const SHOES = ['Nike Air Force 1', 'Sandpaper', 'Isopropyl alcohol', 'Angelus leather paint'];
/** Pieces that mix pencil rendering with the markers. */
const PENCIL_WORK = ['daydream', 'eagle', 'elephant', 'turtle'];
const materialsFor = (section: string, image: string) => {
  if (section === 'shoes') return SHOES;
  const name = image.split('/').pop()?.split('.')[0] ?? '';
  return PENCIL_WORK.includes(name) ? [...MARKERS, ...PENCILS] : MARKERS;
};

export type ArtItem = { image: string; caption: string; ratio: number; materials: string[] };

/** Art sections come from the sketchbook content: Drawings, Shoes, Doodles. */
export const ART = [
  { id: 'drawing', label: 'Drawings' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'doodles', label: 'Doodles' },
].map((s) => {
  const sec = SECTIONS.find((x) => x.id === s.id);
  const items: ArtItem[] = sec ? sec.items.filter((it) => it.image).map((it) => ({ image: it.image as string, caption: it.caption ?? '', ratio: it.ratio ?? 1, materials: materialsFor(s.id, it.image as string) })) : [];
  return { ...s, items };
});

const all: NotebookProject[] = CHAPTERS.flatMap((c) => c.projects);
const pick = (ids: string[]) => ids.map((id) => all.find((p) => p.id === id)).filter((p): p is NotebookProject => !!p);

export type Card = { id: string; title: string; line: string; tag: string; stack: string[]; href?: string; image?: string; notes: string[]; images: Shot[]; study?: Study };

/** Gallery images come from ./gallery (1-4 per project); the first one is the card cover. */
/** Two or three words under a tile on the home page: what the thing is, nothing more. */
const TAGS: Record<string, string> = {
  machina: 'Sheet-forming solver',
  siege: 'Reinforcement-learning agent',
  ignis: 'Rocket propulsion engine',
  sparlab: 'Finite-element solver',
  aether6: 'Fixed-wing flight simulator',
  quantize: 'Molecular geometry fitting',
  aero: 'Lattice-Boltzmann CFD',
  formulate: 'Formulation search',
  'black-hole': 'Relativistic ray tracer',
  'hf-scf': 'Hartree-Fock engine',
  'high-risk-roads': 'Traffic safety analysis',
};

const toCard = (p: NotebookProject): Card => {
  const images = GALLERY[p.id] ?? (p.image ? [{ src: p.image, caption: p.name }] : []);
  return { id: p.id, title: p.name, line: p.tagline, tag: TAGS[p.id] ?? p.tagline, stack: p.stack.split(' · '), href: p.href, image: images[0]?.src ?? p.image, notes: p.notes, images, study: STUDIES[p.id] };
};

export const PROJECT_GROUPS: { id: string; label: string; cards: Card[] }[] = [
  {
    id: 'ml-ai',
    label: 'ML / AI',
    cards: pick(['machina', 'siege']).map(toCard),
  },
  {
    id: 'numerical',
    label: 'Numerical models',
    cards: pick(['ignis', 'sparlab', 'aether6', 'quantize', 'aero', 'formulate', 'black-hole', 'hf-scf']).map(toCard),
  },
  {
    id: 'gis',
    label: 'GIS',
    cards: pick(['high-risk-roads']).map(toCard),
  },
];

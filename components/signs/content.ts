import { CHAPTERS, type NotebookProject } from '@/components/notebook/content';
import { SECTIONS } from '@/components/lofi/sketchbook-content';
import { GALLERY, type Shot } from './gallery';
import { STUDIES, type Study } from './studies';

export const NAME = 'Nathan W.';

/** The about-me card on the landing page. */
export const ABOUT = {
  title: 'about me',
  paragraphs: [
    "Hi, I'm Nathan, at UC Davis. I like building things that compute: a Hartree-Fock engine written from the integrals up, a lattice-Boltzmann wind tunnel, a black-hole ray tracer, a chess net that plays bullet on Lichess, and the backend that lets teams of coding agents share one repo.",
    'Away from the keyboard I draw: Copic doodles, pencil animals and hand-painted Air Force 1s. The signs and photos on this site are how I like to show it.',
  ],
};

export const CONTACTS = [
  { id: 'instagram', label: 'Instagram', handle: '@naze_draws', href: 'https://instagram.com/naze_draws' },
  { id: 'linkedin', label: 'LinkedIn', handle: 'linkedin.com/in/nathan-ward', href: 'https://www.linkedin.com/in/nathan-ward' },
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

export type Card = { id: string; title: string; line: string; stack: string[]; href?: string; image?: string; notes: string[]; images: Shot[]; study?: Study };

/** Gallery images come from ./gallery (1-4 per project); the first one is the card cover. */
const toCard = (p: NotebookProject): Card => {
  const images = GALLERY[p.id] ?? (p.image ? [{ src: p.image, caption: p.name }] : []);
  return { id: p.id, title: p.name, line: p.tagline, stack: p.stack.split(' · '), href: p.href, image: images[0]?.src ?? p.image, notes: p.notes, images, study: STUDIES[p.id] };
};

export const PROJECT_GROUPS: { id: string; label: string; cards: Card[] }[] = [
  {
    id: 'ml-ai',
    label: 'ML / AI',
    cards: pick(['gambit', 'siege', 'kumi', 'voice-agents']).map(toCard),
  },
  {
    id: 'education',
    label: 'Education',
    cards: pick(['nonstandard']).map(toCard),
  },
  {
    id: 'numerical',
    label: 'Numerical models',
    cards: pick(['black-hole', 'aero', 'hf-scf', 'quantize', 'formulate']).map(toCard),
  },
];

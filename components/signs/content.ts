import { CHAPTERS, type NotebookProject } from '@/components/notebook/content';
import { SECTIONS } from '@/components/lofi/sketchbook-content';
import { GALLERY, type Shot } from './gallery';

export const NAME = 'Nathan W.';

export const CONTACTS = [
  { id: 'instagram', label: 'Instagram', handle: '@nathan.w.art', href: 'https://instagram.com/nathan.w.art', note: 'replace with the real handle' },
  { id: 'linkedin', label: 'LinkedIn', handle: 'Nathan Ward', href: 'https://www.linkedin.com/in/', note: 'replace with the real profile' },
  { id: 'github', label: 'GitHub', handle: 'Nathan-W123', href: 'https://github.com/Nathan-W123' },
  { id: 'email', label: 'Email', handle: 'ncward@ucdavis.edu', href: 'mailto:ncward@ucdavis.edu' },
];

/** Art sections come from the sketchbook content: Drawings, Shoes, Doodles. */
export const ART = [
  { id: 'drawing', label: 'Drawings' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'doodles', label: 'Doodles' },
].map((s) => {
  const sec = SECTIONS.find((x) => x.id === s.id);
  return { ...s, items: sec ? sec.items.filter((it) => it.image).map((it) => ({ image: it.image as string, caption: it.caption ?? '', ratio: it.ratio ?? 1 })) : [] };
});

const all: NotebookProject[] = CHAPTERS.flatMap((c) => c.projects);
const pick = (ids: string[]) => ids.map((id) => all.find((p) => p.id === id)).filter((p): p is NotebookProject => !!p);

export type Card = { id: string; title: string; line: string; stack: string[]; href?: string; image?: string; notes: string[]; images: Shot[] };

/** Gallery images come from ./gallery (1-4 per project); the first one is the card cover. */
const toCard = (p: NotebookProject): Card => {
  const images = GALLERY[p.id] ?? (p.image ? [{ src: p.image, caption: p.name }] : []);
  return { id: p.id, title: p.name, line: p.tagline, stack: p.stack.split(' · '), href: p.href, image: images[0]?.src ?? p.image, notes: p.notes, images };
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

import { CHAPTERS, type NotebookProject } from '@/components/notebook/content';
import { SECTIONS } from '@/components/lofi/sketchbook-content';

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

export type Card = { id: string; title: string; line: string; stack: string[]; href?: string; image?: string };

const toCard = (p: NotebookProject): Card => ({ id: p.id, title: p.name, line: p.tagline, stack: p.stack.split(' · '), href: p.href, image: p.image });

export const PROJECT_GROUPS: { id: string; label: string; cards: Card[] }[] = [
  {
    id: 'ml-ai',
    label: 'ML / AI',
    cards: pick(['gambit', 'siege', 'kumi', 'voice-agents', 'kumi-site']).map(toCard),
  },
  {
    id: 'education',
    label: 'Education',
    cards: [
      { id: 'ucd', title: 'UC Davis', line: 'Degree, major and years go here.', stack: ['fill me in'] },
      { id: 'coursework', title: 'Coursework', line: 'The classes worth naming: numerical methods, machine learning, quantum chemistry.', stack: ['fill me in'] },
      { id: 'teaching', title: 'Teaching / research', line: 'Any lab, TA or research work goes here.', stack: ['fill me in'] },
    ],
  },
  {
    id: 'numerical',
    label: 'Numerical models',
    cards: pick(['black-hole', 'aero', 'hf-scf', 'quantize', 'formulate', 'nonstandard']).map(toCard),
  },
];

import { CHAPTERS, type NotebookProject } from '@/components/notebook/content';
import { SECTIONS } from '@/components/lofi/sketchbook-content';
import { GALLERY, type Shot } from './gallery';
import { STUDIES, type Study } from './studies';

export const NAME = 'Nathan W.';

/** About me: one short paragraph on the landing card, the full page adds education and skills. */
export const ABOUT = {
  title: 'about me',
  paragraphs: [
    "I'm a chemistry student at UC Davis who likes building the software and engineering tools that scientific problems need: a Hartree-Fock engine written from the integrals up, a wind tunnel that runs on a laptop, inverse tools that turn a spectrum or a target property into a molecule. The same hands draw Copic doodles and paint Air Force 1s.",
  ],
  education: [{ school: 'UC Davis', degree: 'B.S. Chemistry', when: 'expected graduation year to fill in' }],
  /** Skills, grouped so they can be read at a glance. */
  skills: [
    { group: 'Software', items: ['Python', 'C/C++', 'React', 'Next.js', 'Node.js', 'PostgreSQL'] },
    { group: 'ML / data', items: ['PyTorch', 'scikit-learn', 'NumPy', 'SciPy', 'pandas'] },
    { group: 'Chemistry', items: ['NMR', 'mass spectrometry', 'synthesis', 'chromatography'] },
    { group: 'Computational chemistry', items: ['Gaussian', 'Psi4', 'PySCF', 'RDKit'] },
    { group: 'Engineering', items: ['AutoCAD', 'CFD', 'GIS', 'sensors / embedded systems'] },
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

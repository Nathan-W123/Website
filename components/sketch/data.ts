import { CHAPTERS, SITE, type NotebookProject } from '@/components/notebook/content';

export type GalleryProject = NotebookProject & {
  /** Stack tokens for the TECH STACK row. */
  stackTokens: string[];
  /** 1-based index along the gallery wall. */
  index: number;
  chapterTitle: string;
};

/** The twelve projects as one row of posters, in chapter order. */
export const GALLERY: GalleryProject[] = CHAPTERS.flatMap((chapter) =>
  chapter.projects.map((p) => ({
    ...p,
    stackTokens: p.stack.split(' · ').map((s) => s.trim()).filter(Boolean),
    index: 0,
    chapterTitle: chapter.title,
  })),
).map((p, i) => ({ ...p, index: i + 1 }));

export const OWNER = {
  name: SITE.name,
  role: 'simulation & systems engineer',
  line: 'I build simulators of spacetime, air and molecules, and the agents and tools that learn and work inside them.',
  github: SITE.contact.github,
  email: SITE.contact.email,
};

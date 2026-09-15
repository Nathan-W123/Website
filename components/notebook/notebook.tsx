'use client';

// "A lab notebook, painted" — the long page: painted hero, a sticky chapter
// rail, three chapters of project pages (print + painted vignette + ink
// annotation) and a contact footer. See docs/notebook-design.md.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import {
  MotionConfig,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import type { MotionValue } from 'motion/react';
import PaintedHero from '@/components/notebook/painted-hero';
import { CHAPTERS, SITE } from '@/components/notebook/content';
import { INK_TICK, InkPath, InkUnderline, InkWords, useHydrated } from '@/components/notebook/ink';

type Chapter = (typeof CHAPTERS)[number];
type NotebookProject = Chapter['projects'][number];
type Wash = NotebookProject['wash'];
type Side = 'left' | 'right';

/** Every page in reading order; folios run across chapters so sides alternate continuously. */
const PAGES = CHAPTERS.flatMap((chapter) => chapter.projects);
const FOLIO = new Map(PAGES.map((project, index) => [project.id, index + 1]));

const pad = (value: number) => String(value).padStart(2, '0');

function resolveSrc(image: string): string {
  if (image.startsWith('/') || image.startsWith('http') || image.startsWith('data:')) return image;
  return `/${image}`;
}

function resolveGithub(value: string): { href: string; handle: string } {
  const href = value.startsWith('http') ? value : `https://github.com/${value.replace(/^@/, '')}`;
  const handle = href.replace(/\/+$/, '').split('/').pop() ?? 'GitHub';
  return { href, handle };
}

/**
 * Ink marks drawn over each placeholder wash while the real illustrations are
 * pending: a photon ring and tilted disk, streamlines around a cylinder, a
 * benzene ring, a knight's move on a board. All in a 128×128 box.
 */
const WASH_MARKS: Record<Wash, string[]> = {
  space: [
    'M64 62 m -13 0 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0',
    'M10 66 C 18 52, 110 52, 118 66 C 110 80, 18 80, 10 66',
    'M44 50 C 50 38, 78 38, 84 50',
  ],
  fluid: [
    'M10 34 C 40 34, 50 30, 64 30 S 88 34, 118 34',
    'M10 52 C 40 52, 46 40, 64 40 S 88 52, 118 52',
    'M64 64 m -11 0 a 11 11 0 1 0 22 0 a 11 11 0 1 0 -22 0',
    'M10 76 C 40 76, 46 88, 64 88 S 88 76, 118 76',
    'M10 94 C 40 94, 50 98, 64 98 S 88 94, 118 94',
  ],
  chem: [
    'M64 34 L90 49 L90 79 L64 94 L38 79 L38 49 Z',
    'M66 41 L84 51.5',
    'M84 76.5 L66 87',
    'M44 76 L44 52',
    'M90 49 L110 38',
  ],
  umber: [
    'M28 28 H100 M28 52 H100 M28 76 H100 M28 100 H100',
    'M28 28 V100 M52 28 V100 M76 28 V100 M100 28 V100',
    'M40 88 L40 40 L64 40',
    'M58 34 L64 40 L58 46',
  ],
};

/**
 * Brush growth as a mask-size percentage. The blob's solid core spans ~0.4 of
 * its box, so ~180% reaches the corners of the element; the range is mapped
 * with a gentle ease-out so the wash pools a little faster than it settles.
 */
const brushSize = (progress: number, from: number, to: number) => {
  const p = Math.min(1, Math.max(0, progress));
  return from + (to - from) * (1 - Math.pow(1 - p, 1.6));
};
/** `mask-size` value for a brush blob of `percent` of the box on both axes. */
const maskSize = (percent: number) => `${percent.toFixed(2)}% ${percent.toFixed(2)}%`;

/* ----------------------------------------------------------------------------
   Shared SVG filters (granulation for the placeholder washes).
   ------------------------------------------------------------------------- */
function NotebookDefs() {
  return (
    <svg className="nb-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <defs>
        <filter
          id="nb-granulate"
          x="-4%"
          y="-4%"
          width="108%"
          height="108%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            seed="11"
            stitchTiles="stitch"
            result="fine"
          />
          <feColorMatrix
            in="fine"
            type="matrix"
            values="0.3 0 0 0 0.7  0.3 0 0 0 0.7  0.3 0 0 0 0.7  0 0 0 0 1"
            result="fineTone"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves="2"
            seed="4"
            stitchTiles="stitch"
            result="pool"
          />
          <feColorMatrix
            in="pool"
            type="matrix"
            values="0.45 0 0 0 0.62  0.45 0 0 0 0.62  0.45 0 0 0 0.62  0 0 0 0 1"
            result="poolTone"
          />
          <feBlend in="SourceGraphic" in2="fineTone" mode="multiply" result="g1" />
          <feBlend in="g1" in2="poolTone" mode="multiply" result="g2" />
          <feComposite in="g2" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

/* ----------------------------------------------------------------------------
   Chapter rail — sticky, thin, layout-animated indicator.
   ------------------------------------------------------------------------- */
function ChapterRail({ active, progress }: { active: string; progress: MotionValue<number> }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // On narrow screens the rail can scroll sideways; keep the active chapter
  // in view without ever scrolling the page itself.
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || inner.scrollWidth <= inner.clientWidth + 1) return;
    const item = inner.querySelector<HTMLElement>('.nb-rail__item.is-active');
    if (!item) return;
    const delta = item.getBoundingClientRect().left - inner.getBoundingClientRect().left;
    const left = Math.max(0, inner.scrollLeft + delta - 16);
    inner.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  }, [active, reduced]);

  return (
    <nav className="nb-rail" aria-label="Chapters">
      <div className="nb-rail__inner" ref={innerRef}>
        <a className="nb-rail__home" href="#top">
          <span className="nb-rail__name">{SITE.name}</span>
          <span className="nb-rail__sep" aria-hidden="true">
            ·
          </span>
          <span className="nb-rail__kind">Field notebook</span>
        </a>
        <ul className="nb-rail__list">
          {CHAPTERS.map((chapter, index) => {
            const isActive = chapter.id === active;
            return (
              <li key={chapter.id} className="nb-rail__cell">
                <a
                  className={isActive ? 'nb-rail__item is-active' : 'nb-rail__item'}
                  href={`#${chapter.id}`}
                  aria-current={isActive ? 'location' : undefined}
                >
                  <span className="nb-rail__num">{pad(index + 1)}</span>
                  <span className="nb-rail__label">{chapter.title}</span>
                  {isActive ? (
                    <motion.span
                      layoutId="nb-rail-ink"
                      className="nb-rail__ink"
                      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                    />
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
        <a className="nb-rail__contact" href="#contact">
          Contact
        </a>
      </div>
      <motion.span className="nb-rail__progress" style={{ scaleX: progress }} aria-hidden="true" />
    </nav>
  );
}

/* ----------------------------------------------------------------------------
   Chapter section
   ------------------------------------------------------------------------- */
function ChapterSection({
  chapter,
  index,
  children,
}: {
  chapter: Chapter;
  index: number;
  children: ReactNode;
}) {
  return (
    <section id={chapter.id} className="nb-chapter" aria-labelledby={`${chapter.id}-title`}>
      <header className="nb-chapter__head">
        <p className="nb-eyebrow">
          <span className="nb-eyebrow__num">Chapter {pad(index + 1)}</span>
          <span className="nb-eyebrow__sep" aria-hidden="true">
            ·
          </span>
          <span>
            {chapter.projects.length} {chapter.projects.length === 1 ? 'page' : 'pages'}
          </span>
        </p>
        <h2 id={`${chapter.id}-title`} className="nb-chapter__title">
          <span className="nb-chapter__numeral" aria-hidden="true">
            {pad(index + 1)}
          </span>
          <InkWords text={chapter.title} />
        </h2>
        <p className="nb-chapter__lede">{chapter.lede}</p>
      </header>
      <div className="nb-chapter__pages">{children}</div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Print — the real output, pasted with two tape corners, revealed through a
   brush-edged mask that grows from the centre as the page scrolls in.
   ------------------------------------------------------------------------- */
function Print({
  project,
  folio,
  side,
  maskSize,
  masked,
  lift,
}: {
  project: NotebookProject;
  folio: number;
  side: Side;
  maskSize: MotionValue<string>;
  masked: boolean;
  lift: boolean;
}) {
  return (
    <figure className="nb-print">
      <motion.div
        className={masked ? 'nb-print__reveal is-masked' : 'nb-print__reveal'}
        style={{ maskSize, WebkitMaskSize: maskSize }}
        whileHover={lift ? { y: -4, rotate: side === 'left' ? -0.7 : 0.7 } : undefined}
        transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.7 }}
      >
        <div className="nb-print__sheet">
          {/* unoptimized: plain <img> from public/, no image service on Workers */}
          <Image
            className="nb-print__img"
            src={resolveSrc(project.image)}
            alt={`${project.name}: a print of the real output`}
            width={1440}
            height={900}
            loading={folio === 1 ? 'eager' : 'lazy'}
            unoptimized
          />
        </div>
      </motion.div>
      <figcaption className="nb-print__caption">
        <span className="nb-print__fig">Fig. {pad(folio)}</span> {project.name}, real output
      </figcaption>
    </figure>
  );
}

/* ----------------------------------------------------------------------------
   Vignette — a painted blob of the subject. Procedural placeholder until the
   ink-and-wash illustrations arrive; pass `src` to replace it.
   ------------------------------------------------------------------------- */
function Vignette({
  wash,
  name,
  src,
  maskSize,
  masked,
}: {
  wash: Wash;
  name: string;
  src?: string;
  maskSize: MotionValue<string>;
  masked: boolean;
}) {
  return (
    <motion.div
      className={masked ? 'nb-vignette is-masked' : 'nb-vignette'}
      data-wash={wash}
      style={{ maskSize, WebkitMaskSize: maskSize }}
    >
      {src ? (
        <Image
          className="nb-vignette__img"
          src={resolveSrc(src)}
          alt={`Ink-and-wash vignette for ${name}`}
          width={1024}
          height={1024}
          loading="lazy"
          unoptimized
        />
      ) : (
        <div className="nb-vignette__wash" aria-hidden="true">
          <span className="nb-vignette__pool" />
          <InkPath
            className="nb-vignette__marks"
            viewBox="0 0 128 128"
            d={WASH_MARKS[wash]}
            strokeWidth={1.6}
            duration={0.9}
            stagger={0.28}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ----------------------------------------------------------------------------
   Annotation — the ink block beside the print.
   ------------------------------------------------------------------------- */
function Annotation({
  project,
  chapter,
  folio,
}: {
  project: NotebookProject;
  chapter: Chapter;
  folio: number;
}) {
  const isGithub = project.href.includes('github.com');
  return (
    <div className="nb-note">
      <p className="nb-folio">
        <span className="nb-swatch" aria-hidden="true" />
        <span className="nb-folio__page">
          p. {pad(folio)} / {pad(PAGES.length)}
        </span>
        <span className="nb-folio__sep" aria-hidden="true">
          ·
        </span>
        <span className="nb-folio__chapter">{chapter.title}</span>
      </p>
      <h3 className="nb-name" id={`${project.id}-name`}>
        <InkWords text={project.name} />
      </h3>
      <p className="nb-tagline">
        <InkWords text={project.tagline} delay={0.12} />
      </p>
      <p className="nb-stack">{project.stack}</p>
      <ul className="nb-notes">
        {project.notes.map((note, index) => (
          <li key={note} className="nb-notes__item">
            <InkPath d={INK_TICK} className="nb-notes__tick" delay={index * 0.14} duration={0.5} />
            <span className="nb-notes__text">{note}</span>
          </li>
        ))}
      </ul>
      <a
        className="nb-link"
        href={project.href}
        target="_blank"
        rel="noreferrer"
        aria-describedby={`${project.id}-name`}
      >
        <span className="nb-link__text">
          {isGithub ? 'Open on GitHub' : 'Open the project'}{' '}
          <span className="nb-link__arrow" aria-hidden="true">
            ↗
          </span>
        </span>
        <InkUnderline />
      </a>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Page — one project: print, vignette and annotation. Alternates sides.
   ------------------------------------------------------------------------- */
type PageStyle = CSSProperties & { '--accent': string };

function NotebookPage({
  project,
  chapter,
  folio,
  side,
}: {
  project: NotebookProject;
  chapter: Chapter;
  folio: number;
  side: Side;
}) {
  const ref = useRef<HTMLElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const animated = hydrated && !reduced;

  // Scroll-linked reveal: the page starts opening as its top clears the
  // bottom of the viewport and is fully open once it reaches the middle.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 98%', 'start 38%'] });
  const printMask = useTransform(scrollYProgress, (p) => maskSize(brushSize(p, 14, 205)));
  const washMask = useTransform(scrollYProgress, (p) =>
    maskSize(brushSize((p - 0.12) / 0.88, 18, 205)),
  );

  const style: PageStyle = { '--accent': project.accentHex };

  return (
    <article
      ref={ref}
      id={`page-${project.id}`}
      className={`nb-page nb-page--${side}`}
      data-wash={project.wash}
      style={style}
      aria-labelledby={`${project.id}-name`}
    >
      <Print project={project} folio={folio} side={side} maskSize={printMask} masked={animated} lift={animated} />
      <div className="nb-page__aside">
        <Vignette wash={project.wash} name={project.name} maskSize={washMask} masked={animated} />
        <Annotation project={project} chapter={chapter} folio={folio} />
      </div>
    </article>
  );
}

/* ----------------------------------------------------------------------------
   Footer — contact.
   ------------------------------------------------------------------------- */
function NotebookFooter() {
  const github = resolveGithub(SITE.contact.github);
  return (
    <footer className="nb-footer" id="contact">
      <div className="nb-footer__inner">
        <p className="nb-eyebrow">Contact</p>
        <h2 className="nb-footer__title">
          <InkWords text="Questions, collaborations, hiring: write." />
        </h2>
        <ul className="nb-footer__links">
          <li>
            <a className="nb-link nb-link--large" href={github.href} target="_blank" rel="noreferrer">
              <span className="nb-link__text">
                GitHub · {github.handle}{' '}
                <span className="nb-link__arrow" aria-hidden="true">
                  ↗
                </span>
              </span>
              <InkUnderline />
            </a>
          </li>
          <li>
            <a className="nb-link nb-link--large" href={`mailto:${SITE.contact.email}`}>
              <span className="nb-link__text">{SITE.contact.email}</span>
              <InkUnderline />
            </a>
          </li>
        </ul>
        <p className="nb-colophon">
          Every print on these pages is real output from the project beside it. Set in Fraunces and
          Newsreader on cold-pressed paper.
        </p>
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------------------------
   The notebook.
   ------------------------------------------------------------------------- */
export default function Notebook() {
  const [active, setActive] = useState<string>(CHAPTERS[0]?.id ?? '');
  const { scrollY, scrollYProgress } = useScroll();

  // The active chapter is the last one whose top has passed the upper half
  // of the viewport — derived from position, so hash jumps and rail clicks
  // can never leave it stale.
  const updateActive = useCallback(() => {
    const line = window.innerHeight * 0.45;
    let current = CHAPTERS[0]?.id ?? '';
    for (const chapter of CHAPTERS) {
      const section = document.getElementById(chapter.id);
      if (section && section.getBoundingClientRect().top <= line) current = chapter.id;
    }
    setActive((previous) => (previous === current ? previous : current));
  }, []);
  useMotionValueEvent(scrollY, 'change', updateActive);
  useEffect(() => {
    // Settle the initial position (a hash load, a restored scroll) on the next frame.
    const frame = window.requestAnimationFrame(updateActive);
    window.addEventListener('resize', updateActive);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateActive);
    };
  }, [updateActive]);

  // The site's global stylesheet pins html/body to the viewport for the
  // playable map; the notebook is a scrolling document. notebook.css lifts
  // that with :has(); this class is the fallback for browsers without it.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('nb-doc');
    return () => root.classList.remove('nb-doc');
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="notebook" id="top">
        <NotebookDefs />
        <PaintedHero
          title={SITE.name}
          thesis={SITE.thesis}
          eyebrow={`Field notebook · ${PAGES.length} pages`}
        />
        <ChapterRail active={active} progress={scrollYProgress} />
        <main className="nb-main">
          {CHAPTERS.map((chapter, index) => (
            <ChapterSection key={chapter.id} chapter={chapter} index={index}>
              {chapter.projects.map((project) => {
                const folio = FOLIO.get(project.id) ?? 1;
                return (
                  <NotebookPage
                    key={project.id}
                    project={project}
                    chapter={chapter}
                    folio={folio}
                    side={folio % 2 === 1 ? 'left' : 'right'}
                  />
                );
              })}
            </ChapterSection>
          ))}
        </main>
        <NotebookFooter />
      </div>
    </MotionConfig>
  );
}

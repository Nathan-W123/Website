'use client';

// components/notebook/painted-hero.tsx — the full-bleed painted black hole that
// opens the notebook (docs/notebook-design.md, "Hero"). Nathan's own render is
// passed through the watercolour shader with the disk slowly turning; the name,
// one thesis sentence and a short ochre "Scroll to explore" rule sit on top.

import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { Fragment, useEffect, useRef, useState } from 'react';
import { createWatercolorPainter, type WatercolorPainter } from './watercolor';

const HERO_IMAGE = '/notebook/black-hole.png';
const PAPER_STRENGTH = 0.18;
// The SVG turbulence tile has less contrast than the shader grain, so the CSS
// multiply (loading state and fallback) needs more opacity to read the same.
const CSS_PAPER_OPACITY = 0.34;
const PHONE_MAX_WIDTH = 700;
const WORD_STAGGER = 0.04;
const FRAME_INTERVAL_MS = 30;

export interface PaintedHeroProps {
  title: string;
  thesis: string;
  eyebrow: string;
}

type PaintState = 'loading' | 'webgl2' | 'fallback';

// Procedural paper for the loading state and the no-WebGL2 fallback: an SVG
// turbulence tile multiplied over the still image.
const PAPER_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.88 0 0 0 0 0.88 0 0 0 0 0.86 0 0 0 0.55 0.6'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")";

const CSS = `
.nb-hero {
  --nb-paper: var(--paper, #F1F2EE);
  --nb-mark: var(--mark, #D9A93B);
  --nb-wash: var(--wash-space, #243A5E);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  height: clamp(560px, 100svh, 1080px);
  background: var(--nb-wash);
  color: var(--nb-paper);
}
.nb-hero__paint {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.nb-hero__still,
.nb-hero__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
.nb-hero__still {
  object-fit: cover;
  object-position: center;
}
.nb-hero__canvas {
  opacity: 0;
  transition: opacity 700ms ease;
}
.nb-hero--webgl2 .nb-hero__canvas {
  opacity: 1;
}
.nb-hero__lift,
.nb-hero__paper {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 700ms ease, visibility 0s linear 700ms;
}
.nb-hero__lift {
  background: var(--nb-wash);
  mix-blend-mode: lighten;
}
.nb-hero__paper {
  background-image: ${PAPER_SVG};
  background-size: 240px 240px;
  mix-blend-mode: multiply;
  opacity: ${CSS_PAPER_OPACITY};
}
.nb-hero--webgl2 .nb-hero__lift,
.nb-hero--webgl2 .nb-hero__paper {
  opacity: 0;
  visibility: hidden;
}
.nb-hero__shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to top, rgba(14, 20, 34, 0.68) 0%, rgba(14, 20, 34, 0.32) 36%, rgba(14, 20, 34, 0) 64%),
    linear-gradient(to right, rgba(14, 20, 34, 0.42) 0%, rgba(14, 20, 34, 0) 58%);
}
.nb-hero__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 1.1rem;
  padding: clamp(1.5rem, 4vw, 3.5rem) clamp(1rem, 6vw, 6rem) clamp(2rem, 6vh, 4.5rem);
  max-width: 60rem;
}
.nb-hero__eyebrow,
.nb-hero__scroll {
  margin: 0;
  font-family: var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(241, 242, 238, 0.82);
}
.nb-hero__title {
  margin: 0;
  font-family: var(--font-fraunces, Fraunces, 'Iowan Old Style', Georgia, serif);
  font-weight: 560;
  font-size: clamp(2.75rem, 2rem + 6vw, 7rem);
  line-height: 0.96;
  letter-spacing: -0.025em;
  font-variation-settings: 'SOFT' 40, 'WONK' 1;
  text-wrap: balance;
  color: var(--nb-paper);
}
.nb-hero__thesis {
  margin: 0.2rem 0 0;
  max-width: 34rem;
  font-family: var(--font-newsreader, Newsreader, 'Iowan Old Style', Georgia, serif);
  font-size: clamp(1.05rem, 0.95rem + 0.5vw, 1.35rem);
  line-height: 1.45;
  font-weight: 400;
  text-wrap: pretty;
  color: rgba(241, 242, 238, 0.92);
}
.nb-hero__scroll {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.4rem;
  color: var(--nb-mark);
}
.nb-hero__rule {
  display: inline-block;
  width: 3.5rem;
  height: 2px;
  background: var(--nb-mark);
  transform-origin: left center;
}
.nb-hero__word {
  display: inline-block;
  will-change: opacity, filter;
}
@media (max-width: ${PHONE_MAX_WIDTH - 1}px) {
  .nb-hero__overlay {
    padding: 1.5rem 1rem 2.5rem;
    gap: 0.9rem;
  }
  .nb-hero__title {
    line-height: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .nb-hero__canvas {
    transition: none;
  }
}
`;

const JS_OFF_CSS = `
.nb-hero__word, .nb-hero__rule, .nb-hero__scroll { opacity: 1 !important; filter: none !important; transform: none !important; }
`;

const INK_EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

// Word-level ink reveal. The `initial` state is identical on the server and
// the client (so hydration never disagrees); reduced motion only zeroes the
// transition so the words appear at once. With JS off the <noscript> style
// below forces every word visible.
function InkWords({ text, delay, reduced }: { text: string; delay: number; reduced: boolean }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${index}-${word}`}>
          {index > 0 ? ' ' : null}
          <motion.span
            className="nb-hero__word"
            initial={{ opacity: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={
              reduced
                ? { duration: 0 }
                : { delay: delay + index * WORD_STAGGER, duration: 0.75, ease: INK_EASE }
            }
          >
            {word}
          </motion.span>
        </Fragment>
      ))}
    </>
  );
}

// The swirl clock. The painter turns the disk at 0.02 rad/s per unit of time;
// feeding it A·sin(t/A) keeps that rate on arrival but bounds the twist to
// ±A·0.02 rad (about ±8°) so a static render never shears apart while the
// page sits open — the disk turns for ~20 s, then eases back.
const SWIRL_BOUND = 7;
function swirlClock(seconds: number): number {
  return SWIRL_BOUND * Math.sin(seconds / SWIRL_BOUND);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.decoding = 'async';
    img.onload = () => {
      img.decode().then(
        () => resolve(img),
        () => resolve(img),
      );
    };
    img.onerror = () => reject(new Error(`[painted-hero] could not load ${src}`));
    img.src = src;
  });
}

export default function PaintedHero({ title, thesis, eyebrow }: PaintedHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const reduced = reducedMotion === true;
  const [paintState, setPaintState] = useState<PaintState>('loading');

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    let painter: WatercolorPainter | null = null;
    let frame = 0;
    let disposed = false;
    let inView = true;
    let started = 0;

    const measure = () => {
      if (!painter) return;
      const rect = section.getBoundingClientRect();
      const cap = rect.width < PHONE_MAX_WIDTH ? 1 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, cap);
      painter.resize(rect.width, rect.height, dpr);
    };

    const paint = () => {
      if (!painter || disposed) return;
      painter.render(reduced ? 0 : swirlClock((performance.now() - started) / 1000));
    };

    // The disk turns at 0.02 rad/s, so ~30 fps is indistinguishable from 60
    // and halves the GPU time on laptops.
    let lastPaint = 0;
    const tick = (now: number) => {
      frame = 0;
      if (disposed || !painter) return;
      if (now - lastPaint >= FRAME_INTERVAL_MS) {
        lastPaint = now;
        paint();
      }
      if (!reduced && inView && painter.mode === 'webgl2') frame = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (frame === 0 && !disposed && painter && !reduced && inView && painter.mode === 'webgl2') {
        frame = requestAnimationFrame(tick);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (frame === 0) paint();
    });
    resizeObserver.observe(section);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        if (inView) schedule();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(section);

    loadImage(HERO_IMAGE).then(
      (image) => {
        if (disposed) return;
        painter = createWatercolorPainter(canvas, image, { swirl: !reduced, paper: PAPER_STRENGTH });
        started = performance.now();
        measure();
        paint();
        setPaintState(painter.mode);
        schedule();
      },
      (error: unknown) => {
        console.error(error);
        if (!disposed) setPaintState('fallback');
      },
    );

    return () => {
      disposed = true;
      if (frame !== 0) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      painter?.dispose();
      painter = null;
    };
  }, [reduced]);

  const titleWords = title.split(/\s+/).filter(Boolean).length;
  const thesisWords = thesis.split(/\s+/).filter(Boolean).length;
  const titleDelay = 0.35;
  const thesisDelay = titleDelay + titleWords * WORD_STAGGER + 0.25;
  const scrollDelay = thesisDelay + thesisWords * WORD_STAGGER + 0.35;

  const classes = ['nb-hero'];
  if (paintState !== 'loading') classes.push(`nb-hero--${paintState}`);

  return (
    <section ref={sectionRef} className={classes.join(' ')} aria-label="Introduction">
      <style href="notebook-painted-hero" precedence="default">
        {CSS}
      </style>
      <noscript>
        <style>{JS_OFF_CSS}</style>
      </noscript>
      <div className="nb-hero__paint" aria-hidden="true">
        <Image className="nb-hero__still" src={HERO_IMAGE} alt="" fill priority unoptimized sizes="100vw" />
        <canvas ref={canvasRef} className="nb-hero__canvas" />
        <div className="nb-hero__lift" />
        <div className="nb-hero__paper" />
        <div className="nb-hero__shade" />
      </div>
      <div className="nb-hero__overlay">
        <p className="nb-hero__eyebrow">
          <InkWords text={eyebrow} delay={0.1} reduced={reduced} />
        </p>
        <h1 className="nb-hero__title">
          <InkWords text={title} delay={titleDelay} reduced={reduced} />
        </h1>
        <p className="nb-hero__thesis">
          <InkWords text={thesis} delay={thesisDelay} reduced={reduced} />
        </p>
        <motion.p
          className="nb-hero__scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduced ? { duration: 0 } : { delay: scrollDelay, duration: 0.6, ease: INK_EASE }}
        >
          <motion.span
            className="nb-hero__rule"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={reduced ? { duration: 0 } : { delay: scrollDelay, duration: 0.9, ease: INK_EASE }}
          />
          Scroll to explore
        </motion.p>
      </div>
    </section>
  );
}

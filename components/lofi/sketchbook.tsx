'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { OWNER, SECTIONS, type ScrapDoodle, type ScrapItem } from './sketchbook-content';

/** Painted textures generated in the room's style (work/lofi-gen/gen.py). */
const base = () => (typeof window !== 'undefined' && window.__LOFI_BASE) || '';
import './sketchbook.css';

/**
 * The art sketchbook: a closed book that swings open, a contents page, and
 * one scrapbook spread per section. Spread 0 is the contents; spread i is
 * SECTIONS[i - 1]. Moving between spreads riffles one sheet at a time.
 */

type Flip = { a: number; b: number; dir: 1 | -1 };
const LAST = SECTIONS.length;

/*
 * Geometry. The book lives in "book units": the front cover is the rectangle
 * (0,0)-(1000,900) with the spine along x=0; the left page is (-1000,0)-(0,900).
 * The painted book (public/lofi/sb-base.png, the room's book upscaled 16x with
 * its cover face removed) is placed in those units by the inverse of the affine
 * map that its cover parallelogram makes: this is what keeps the animated book
 * pixel-identical to the painted one before it opens.
 */
const COVER_H = 900;
/** cover parallelogram in cut-out pixels (1000x725 image): origin and basis per book unit */
const O_CUT = { x: 451.9, y: 26.25 };
const U = { x: 0.5469, y: -0.00375 };
const V = { x: -0.2924, y: 0.5069 };
const DET = U.x * V.y - V.x * U.y;
/** cut-out px -> book units */
const INV = { a: V.y / DET, b: -U.y / DET, c: -V.x / DET, d: U.x / DET };
/** cut-out px -> room px */
const CUT_TO_ROOM = { scale: 0.1, x: 405.5, y: 721.375 };

type Stage = 'desk' | 'opening' | 'spread' | 'closing';

/** ?cover=deg freezes the cover at that angle and ?pose=desk|read freezes the pose (QC only). */
const debugParam = (name: string) => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(name));

/** ?slow=N stretches the whole sequence N times, for frame-by-frame checking. */
const slowFactor = () => {
  if (typeof window === 'undefined') return 1;
  const v = Number(new URLSearchParams(window.location.search).get('slow'));
  return v > 0 ? v : 1;
};

export function Sketchbook({ onClose, unit, hotspot }: { onClose: () => void; unit: number; hotspot: { x: number; y: number; w: number; h: number } }) {
  const [stage, setStage] = useState<Stage>('desk');
  const [shown, setShown] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const [riffle, setRiffle] = useState(false);
  const target = useRef(0);
  const [vp, setVp] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  // Sequence: room zoom -> the painted book (as our object) -> its cover swings open on the desk
  // -> the open book straightens and grows to the reading pose.
  const k = slowFactor();
  useEffect(() => {
    // the room's zoom (a 0.9s tween in lofi.tsx) must have settled before our book replaces the painted one
    const ts = [
      window.setTimeout(() => setShown(true), 1000 * k),
      window.setTimeout(() => {
        setStage('opening');
        setCoverOpen(true);
      }, 1400 * k),
      window.setTimeout(() => setStage('spread'), (1400 + 950) * k),
    ];
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [k]);

  const step = useCallback((from: number) => {
    const to = target.current;
    if (to === from) return;
    setFlip(to > from ? { a: from, b: from + 1, dir: 1 } : { a: from - 1, b: from, dir: -1 });
  }, []);

  const goTo = (to: number) => {
    if (flip || stage !== 'spread') return;
    const clamped = Math.max(0, Math.min(LAST, to));
    target.current = clamped;
    setRiffle(Math.abs(clamped - spread) > 1);
    step(spread);
  };

  const onFlipDone = () => {
    if (!flip) return;
    const landed = flip.dir === 1 ? flip.b : flip.a;
    setSpread(landed);
    setFlip(null);
    if (target.current !== landed) window.setTimeout(() => step(landed), 20);
  };

  const close = () => {
    if (stage === 'closing') return;
    setStage('closing');
    window.setTimeout(() => setCoverOpen(false), 1000 * k);
    window.setTimeout(() => setShown(false), (1000 + 1100) * k);
    window.setTimeout(onClose, (1000 + 1100 + 200) * k);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') goTo(spread + 1);
      if (e.key === 'ArrowLeft') goTo(spread - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ----- poses -----
  const hc = { x: hotspot.x + hotspot.w / 2, y: hotspot.y + hotspot.h / 2 };
  const s = unit * CUT_TO_ROOM.scale; // screen px per cut-out px
  const originRoom = { x: CUT_TO_ROOM.x + O_CUT.x * CUT_TO_ROOM.scale, y: CUT_TO_ROOM.y + O_CUT.y * CUT_TO_ROOM.scale };
  const deskPose = `matrix(${U.x * s}, ${U.y * s}, ${V.x * s}, ${V.y * s}, ${(originRoom.x - hc.x) * unit}, ${(originRoom.y - hc.y) * unit})`;
  const sB = Math.min((vp.w * 0.7) / 2000, (vp.h - 170) / COVER_H, 1180 / 2000);
  const readPose = `matrix(${sB}, 0, 0, ${sB}, 0, ${-COVER_H / 2 * sB})`;
  const dbgPose = debugParam('pose');
  const dbgCover = debugParam('cover');
  const reading = dbgPose ? dbgPose === 'read' : stage === 'spread';
  const pose = reading ? readPose : deskPose;
  const coverAngle = dbgCover !== null ? Number(dbgCover) : coverOpen ? -180 : 0;

  const leftUnder = flip ? flip.a : spread;
  const rightUnder = flip ? flip.b : spread;
  const basePx = base();

  return (
    <motion.div className="sb-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <button type="button" className="sb-scrim" aria-label="Close the sketchbook" onClick={close} />
      <div className="sbx-stage">
        <div className={`sbx${reading ? ' is-reading' : ''}`} style={{ transform: pose, visibility: shown ? 'visible' : 'hidden', transitionDuration: `${1 * k}s` }}>
          {/* the painted book minus its cover, placed so its cover parallelogram is the (0,0)-(1000,900) rectangle */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="sbx-base"
            src={basePx + '/lofi/sb-base-soft.png'}
            alt=""
            draggable={false}
            style={{ transform: `matrix(${INV.a}, ${INV.b}, ${INV.c}, ${INV.d}, 0, 0) translate(${-O_CUT.x}px, ${-O_CUT.y}px)` }}
          />
          {/* reading pose furniture: the opened hardcover board, spine and page stack */}
          <div className="sbx-board" style={{ backgroundImage: `url(${basePx + '/lofi/sb-board.jpg'})` }} />
          <div className="sbx-stack"><i /><i /></div>
          <div className="sbx-spine" />

          <div className="sbx-page sbx-page-right" style={{ backgroundImage: `url(${basePx + '/lofi/sb-board.jpg'})` }}>
            <div className="sbx-paper"><RightPage index={rightUnder} goTo={goTo} /></div>
          </div>

          {flip && (
            <motion.div
              key={`${flip.a}-${flip.b}-${flip.dir}`}
              className="sbx-sheet"
              initial={{ rotateY: flip.dir === 1 ? 0 : -180 }}
              animate={{ rotateY: flip.dir === 1 ? -180 : 0 }}
              transition={{ duration: riffle ? 0.3 : 0.6, ease: [0.45, 0, 0.2, 1] }}
              onAnimationComplete={onFlipDone}
            >
              <div className="sb-face sb-face-front">
                <div className="sbx-paper"><RightPage index={flip.a} goTo={goTo} /></div>
                <div className="sb-face-shade" />
              </div>
              <div className="sb-face sb-face-back">
                <div className="sbx-paper"><LeftPage index={flip.b} goTo={goTo} /></div>
                <div className="sb-face-shade sb-face-shade-back" />
              </div>
            </motion.div>
          )}

          {/* the front cover: the painting's own cover face, hinged on the spine */}
          <motion.div className="sbx-cover" initial={{ rotateY: 0 }} animate={{ rotateY: coverAngle }} transition={{ duration: 1.05 * k, ease: [0.5, 0, 0.25, 1] }}>
            <div className="sb-face sb-face-front sbx-cover-front" style={{ backgroundImage: `url(${basePx + '/lofi/sb-coverface-soft.jpg'})` }}>
              <i className="sbx-sharp" style={{ backgroundImage: `url(${basePx + '/lofi/sb-coverface.jpg'})` }} />
            </div>
            <div className="sb-face sb-face-back sbx-cover-inside" style={{ backgroundImage: `url(${basePx + '/lofi/sb-board.jpg'})` }}>
              <div className="sbx-paper"><LeftPage index={leftUnder} goTo={goTo} /></div>
            </div>
          </motion.div>
        </div>
      </div>
      <button type="button" className="sb-close" onClick={close}>
        ← back to the desk
      </button>
    </motion.div>
  );
}

/* ---------- pages ---------- */

function LeftPage({ index, goTo }: { index: number; goTo: (i: number) => void }) {
  if (index === 0) return <Paper side="left" />;
  const s = SECTIONS[index - 1];
  return (
    <Paper side="left" number={s.pageNumber}>
      <header className="sb-section-head">
        <h2>{s.title}</h2>
        <p>{s.blurb}</p>
      </header>
      <Scraps section={index - 1} page="left" />
      <button type="button" className="sb-nav sb-nav-prev" onClick={() => goTo(index - 1)}>
        ‹ {index === 1 ? 'contents' : SECTIONS[index - 2].title}
      </button>
    </Paper>
  );
}

function RightPage({ index, goTo }: { index: number; goTo: (i: number) => void }) {
  if (index === 0) return <Contents goTo={goTo} />;
  const s = SECTIONS[index - 1];
  const next = SECTIONS[index];
  return (
    <Paper side="right" number={s.pageNumber + 1}>
      <Scraps section={index - 1} page="right" />
      {next ? (
        <button type="button" className="sb-nav sb-nav-next" onClick={() => goTo(index + 1)}>
          {next.title} ›
        </button>
      ) : (
        <button type="button" className="sb-nav sb-nav-next" onClick={() => goTo(0)}>
          contents ›
        </button>
      )}
    </Paper>
  );
}

function Paper({ side, number, children }: { side: 'left' | 'right'; number?: number; children?: ReactNode }) {
  return (
    <div className={`sb-page sb-page-${side}`} style={{ backgroundImage: `url(${base() + '/lofi/sb-spread.jpg'})` }}>
      <div className="sb-grain" />
      {children}
      {number !== undefined && <span className="sb-pagenum">{number}</span>}
    </div>
  );
}

function Contents({ goTo }: { goTo: (i: number) => void }) {
  return (
    <Paper side="right" number={1}>
      <div className="sb-toc">
        <h1 className="sb-name">{OWNER.name}</h1>
        <a className="sb-ig" href={`https://instagram.com/${OWNER.instagram}`} target="_blank" rel="noreferrer">
          @{OWNER.instagram}
        </a>
        <svg className="sb-rule" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 2 7 q 40 -8 80 0 t 80 0 t 80 0 t 56 -2" fill="none" stroke="#c9553f" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <p className="sb-toc-label">table of contents</p>
        <ol className="sb-toc-list">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <button type="button" onClick={() => goTo(i + 1)}>
                <span className="sb-toc-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="sb-toc-title">{s.title}</span>
                <span className="sb-toc-dots" />
                <span className="sb-toc-page">{s.pageNumber}</span>
              </button>
            </li>
          ))}
        </ol>
        <Doodle kind="squiggle" x={62} y={86} rotate={-4} />
        <Doodle kind="star" x={84} y={80} rotate={10} />
      </div>
    </Paper>
  );
}

/* ---------- scrapbook bits ---------- */

function Scraps({ section, page }: { section: number; page: 'left' | 'right' }) {
  const s = SECTIONS[section];
  return (
    <>
      {s.items.filter((it) => it.page === page).map((it, i) => (
        <Scrap key={i} item={it} seed={i + (page === 'right' ? 3 : 0)} />
      ))}
      {s.doodles.filter((d) => d.page === page).map((d, i) => (
        <Doodle key={i} {...d} />
      ))}
    </>
  );
}

function Scrap({ item, seed }: { item: ScrapItem; seed: number }) {
  const ratio = item.ratio ?? 4 / 3;
  const src = item.image ? base() + item.image : null;
  // different crops of the same painted placeholder so the cards read as separate photos
  const pos = ['50% 50%', '20% 30%', '80% 40%', '40% 80%', '70% 70%', '30% 60%'][seed % 6];
  return (
    <figure className={`sb-scrap sb-fix-${item.fix ?? 'tape'} sb-tone-${item.tone ?? 'peach'}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, ['--rot' as string]: `${item.rotate ?? 0}deg` }}>
      <div className="sb-photo" style={{ aspectRatio: `${ratio}` }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={item.caption ?? ''} loading="lazy" draggable={false} style={{ objectPosition: item.image ? '50% 50%' : pos }} />
        ) : (
          <span className="sb-photo-empty">photo</span>
        )}
        <i className="sb-photo-wash" />
      </div>
      {item.caption && <figcaption>{item.caption}</figcaption>}
      <i className="sb-fix sb-fix-a" />
      <i className="sb-fix sb-fix-b" />
    </figure>
  );
}

function Doodle({ kind, x, y, rotate = 0, text }: ScrapDoodle | { kind: ScrapDoodle['kind']; x: number; y: number; rotate?: number; text?: string; page?: 'left' | 'right' }) {
  const style = { left: `${x}%`, top: `${y}%`, transform: `rotate(${rotate}deg)` };
  if (kind === 'note') return <span className="sb-doodle sb-note" style={style}>{text}</span>;
  const paths: Record<string, ReactNode> = {
    star: <path d="M 20 2 l 5 12 13 1 -10 9 3 13 -11 -6 -11 6 3 -13 -10 -9 13 -1 z" />,
    heart: <path d="M 20 34 C 6 24 2 16 6 10 c 4 -6 12 -4 14 2 c 2 -6 10 -8 14 -2 c 4 6 0 14 -14 24 z" />,
    arrow: <path d="M 4 30 q 14 -26 32 -22 M 30 4 l 8 5 -6 7" />,
    squiggle: <path d="M 2 20 q 8 -16 16 0 t 16 0 t 16 0 t 12 -4" />,
  };
  return (
    <svg className={`sb-doodle sb-doodle-${kind}`} style={style} viewBox="0 0 64 40" aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

'use client';

import { motion } from 'motion/react';
import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { Rough } from '@/components/sketch/rough';
import { INK } from './ink';

/**
 * Margin doodles on the lined paper: the kind of thing that ends up in the
 * corners of a notebook page. Same ink as the signs, kept to the edges so they
 * never sit under the content, and gently animated: a paper plane swoops
 * past, stars twinkle, a spiral draws itself, a cloud drifts, a pencil
 * scribbles along the bottom edge. The mix varies a little per page.
 */

const line = (w = 2.2, seed = 1) => ({ stroke: INK, strokeWidth: w, roughness: 1.2, bowing: 1, fill: 'none', seed, disableMultiStroke: true });

/** One doodle pinned to a spot on the page (percent offsets keep it in the margins at any aspect). */
function At({ left, right, top, bottom, w, className = '', children }: { left?: string; right?: string; top?: string; bottom?: string; w: number; className?: string; children: ReactNode }) {
  const style: CSSProperties = { left, right, top, bottom, width: w };
  return (
    <div className={`dd ${className}`} style={style}>
      {children}
    </div>
  );
}

function Star({ seed, delay = 0, s = 1 }: { seed: number; delay?: number; s?: number }) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = (i % 2 ? 9 : 20) * s;
    pts.push([Math.round((24 + Math.cos(a) * r) * 10) / 10, Math.round((24 + Math.sin(a) * r) * 10) / 10]);
  }
  return (
    // (the draw-on class sits on a plain wrapper: motion.svg does not forward className to SVG elements)
    <span className="dd-draw" style={{ ['--i' as string]: seed % 5 } as CSSProperties}>
      <motion.svg viewBox="0 0 48 48" animate={{ scale: [1, 1.25, 1], rotate: [0, 14, 0] }} transition={{ duration: 3.2, repeat: Infinity, delay: delay + 1.2, ease: 'easeInOut' }}>
        <Rough kind="poly" points={pts} seed={seed} opts={line(2.2, seed)} pathLength={1} />
      </motion.svg>
    </span>
  );
}

function Spiral({ seed }: { seed: number }) {
  let d = 'M 40 40';
  for (let t = 0; t < Math.PI * 6; t += 0.35) {
    const r = 2 + t * 1.9;
    d += ` L ${(40 + Math.cos(t) * r).toFixed(1)} ${(40 + Math.sin(t) * r * 0.85).toFixed(1)}`;
  }
  return (
    <svg viewBox="0 0 80 80" className="dd-draw" style={{ ['--i' as string]: 3 } as CSSProperties}>
      <Rough kind="path" d={d} seed={seed} opts={line(2.2, seed)} pathLength={1} />
    </svg>
  );
}

function Cloud({ seed }: { seed: number }) {
  return (
    <span className="dd-draw" style={{ ['--i' as string]: 2 } as CSSProperties}>
    <motion.svg viewBox="0 0 90 60" animate={{ x: [0, 22, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}>
      <Rough kind="path" d="M 16 40 c -14 0 -18 -18 -4 -22 c 2 -14 22 -16 28 -6 c 10 -8 28 0 24 12 c 12 2 10 18 -4 18 z" seed={seed} opts={{ ...line(2.2, seed), fill: '#fff', fillStyle: 'solid' }} pathLength={1} />
      <line x1={22} y1={48} x2={46} y2={48} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <line x1={30} y1={54} x2={42} y2={54} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
    </motion.svg>
    </span>
  );
}

function Sun({ seed }: { seed: number }) {
  return (
    <svg viewBox="0 0 100 100" className="dd-draw" style={{ ['--i' as string]: 1 } as CSSProperties}>
      <motion.g style={{ transformOrigin: '50px 50px' }} animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1={50 + Math.cos(a) * 32} y1={50 + Math.sin(a) * 32} x2={50 + Math.cos(a) * 46} y2={50 + Math.sin(a) * 46} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />;
        })}
      </motion.g>
      <Rough kind="circle" cx={50} cy={50} d={46} seed={seed} opts={{ ...line(2.4, seed), fill: '#fff', fillStyle: 'solid' }} pathLength={1} />
      <circle cx={43} cy={47} r={2.2} fill={INK} />
      <circle cx={57} cy={47} r={2.2} fill={INK} />
      <path d="M 41 56 q 9 9 18 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Plane({ seed }: { seed: number }) {
  return (
    <svg viewBox="-50 -30 110 60">
      <path d="M -10 4 c -14 4 -22 0 -36 8" stroke={INK} strokeWidth={2} strokeDasharray="4 7" fill="none" strokeLinecap="round" />
      <Rough kind="path" d="M 0 0 L 46 -14 L 14 6 L 18 20 Z M 14 6 L 46 -14" seed={seed} opts={{ ...line(2.2, seed), fill: '#fff', fillStyle: 'solid' }} />
    </svg>
  );
}

function Pencil({ seed }: { seed: number }) {
  // scribbles a wavy line; the line draws on as the pencil moves, then both wipe back
  const wave = 'M 10 30 q 20 -16 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0';
  const times = [0, 0.45, 0.8, 1];
  return (
    <svg viewBox="0 0 300 70">
      <motion.path d={wave} stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 8, times, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.g initial={{ x: 10 }} animate={{ x: [10, 250, 250, 10] }} transition={{ duration: 8, times, repeat: Infinity, ease: 'easeInOut' }}>
        <g transform="translate(0 30) rotate(-38)">
          <Rough kind="rect" x={0} y={-6} w={64} h={12} seed={seed} opts={{ ...line(2, seed), fill: '#fff', fillStyle: 'solid' }} />
          <path d="M 0 -6 L -12 0 L 0 6 Z" fill={INK} />
          <line x1={52} y1={-6} x2={52} y2={6} stroke={INK} strokeWidth={2} />
        </g>
      </motion.g>
    </svg>
  );
}

function Squiggle({ seed }: { seed: number }) {
  return (
    <svg viewBox="0 0 110 40" className="dd-draw" style={{ ['--i' as string]: 4 } as CSSProperties}>
      <Rough kind="path" d="M 8 20 c 10 -22 20 22 30 0 s 20 -22 30 0 s 20 22 30 0" seed={seed} opts={line(2.2, seed)} pathLength={1} />
    </svg>
  );
}

function Heart({ seed }: { seed: number }) {
  return (
    <span className="dd-draw" style={{ ['--i' as string]: 2 } as CSSProperties}>
    <motion.svg viewBox="0 0 50 50" animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.6, delay: 1.5 }}>
      <Rough kind="path" d="M 25 42 c -18 -13 -20 -32 -5 -32 c 4 0 5 4 5 6 c 0 -2 1 -6 5 -6 c 15 0 13 19 -5 32 z" seed={seed} opts={line(2.2, seed)} pathLength={1} />
    </motion.svg>
    </span>
  );
}

function Arrow({ seed }: { seed: number }) {
  return (
    <svg viewBox="0 0 110 50" className="dd-draw" style={{ ['--i' as string]: 4 } as CSSProperties}>
      <Rough kind="path" d="M 100 40 q -40 -34 -90 -10" seed={seed} opts={line(2.2, seed)} pathLength={1} />
      <Rough kind="path" d="M 24 16 L 10 30 L 28 34" seed={seed + 1} opts={line(2.2, seed + 1)} pathLength={1} />
    </svg>
  );
}

/** The set differs a little per page (seed), so every swipe lands on fresh margins. */
export function Doodles({ seed = 1, sparse = false }: { seed?: number; sparse?: boolean }) {
  const v = seed % 3;
  // decorative only: skipped on the server so hand-drawn paths never have to match between runtimes
  const client = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!client) return null;
  return (
    <div className="sg-doodles" aria-hidden="true">
      {/* the paper plane swoops across the top every so often */}
      <motion.div
        className="dd dd-plane"
        initial={{ x: '-12vw', y: '9vh', rotate: 6, opacity: 0 }}
        animate={{ x: ['-12vw', '22vw', '50vw', '78vw', '112vw'], y: ['9vh', '4vh', '11vh', '5vh', '12vh'], rotate: [6, -10, 12, -8, 10], opacity: [0, 1, 1, 1, 0] }}
        transition={{ duration: 9, times: [0, 0.25, 0.5, 0.75, 1], repeat: Infinity, repeatDelay: 8, ease: 'easeInOut', delay: 0.9 }}
      >
        <Plane seed={seed + 3} />
      </motion.div>
      <At left="3%" bottom="1.5%" w={300} className="dd-wide">
        <Pencil seed={seed + 4} />
      </At>
      {/* left margin (skipped on the landing page, where the tape link lives) */}
      {!sparse && (
        <>
          <At left="7%" top="17%" w={56} className="dd-wide">
            <Star seed={seed + 10} />
          </At>
          <At left="4%" top="42%" w={92} className="dd-wide">
            {v === 1 ? <Heart seed={seed + 13} /> : <Spiral seed={seed + 12} />}
          </At>
          <At left="8%" top="68%" w={34} className="dd-wide">
            <Star seed={seed + 11} delay={1.1} s={0.9} />
          </At>
        </>
      )}
      {/* right margin */}
      <At right="4%" top="8%" w={104} className="dd-wide">
        <Sun seed={seed + 15} />
      </At>
      <At right="6%" top="34%" w={104} className="dd-wide">
        <Cloud seed={seed + 16} />
      </At>
      <At right="5%" top="58%" w={40} className="dd-wide">
        <Star seed={seed + 17} delay={0.6} s={0.85} />
      </At>
      <At right="5%" bottom="12%" w={110} className="dd-wide">
        {v === 2 ? <Heart seed={seed + 18} /> : <Arrow seed={seed + 19} />}
      </At>
      <At right="18%" bottom="4%" w={110} className="dd-wide">
        <Squiggle seed={seed + 14} />
      </At>
    </div>
  );
}

'use client';

import { motion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { Board, Ring, Rope } from './ink';
import { ContactIcon } from './icons';

/**
 * A chain of wooden signs hanging one under the other, tied together with
 * rope, the whole thing dropping in from the top of the screen. Each sign
 * hangs from the one above it, so a swing runs down the chain like a whip.
 * The chain scales down to fit the viewport.
 */

export type ChainItem = { id: string; label: string; sub?: string; href?: string; title?: boolean };

const ROPE_L = 0.28, ROPE_R = 0.72;
const boardH = (it: ChainItem) => (it.title ? 96 : 122);
const ropeLen = (i: number) => (i === 0 ? 100 : 58);

export function SignChain({ items, w = 350, seed = 5, delay = 0.55 }: { items: ChainItem[]; w?: number; seed?: number; delay?: number }) {
  const total = items.reduce((a, it, i) => a + ropeLen(i) + boardH(it) + 6, 0) + 36;
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.max(0.55, Math.min(1, (window.innerHeight - 20) / total, (window.innerWidth - 28) / w)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [total, w]);

  return (
    <div className="ch-wrap" style={{ width: w * scale, height: total * scale }}>
      <motion.div className="ch-root" style={{ width: w, height: total, scale, transformOrigin: '50% 0%' }} initial={{ y: -total * scale - 120 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 60, damping: 12, mass: 1.2, delay }}>
        <Segment items={items} i={0} w={w} seed={seed} delay={delay} />
      </motion.div>
    </div>
  );
}

function Segment({ items, i, w, seed, delay }: { items: ChainItem[]; i: number; w: number; seed: number; delay: number }) {
  const it = items[i];
  const rope = ropeLen(i);
  const bh = boardH(it);
  const last = i === items.length - 1;
  const h = rope + bh + 6;
  const xl = w * ROPE_L, xr = w * ROPE_R;
  const tilt = i === 0 ? -1.5 : i % 2 ? 1.8 : -1.8;
  const s = seed + i * 20;
  const bx = 8, bw = w - 26;

  const board = (
    <>
      <svg className="ch-board" viewBox={`0 0 ${w} ${bh + 24}`} width={w} height={bh + 24} aria-hidden="true">
        <Board x={bx} y={4} w={bw} h={bh} seed={s} grain={0} bolts={false} corner={it.title ? 22 : 14} />
        <Ring cx={xl} cy={7} />
        <Ring cx={xr} cy={7} />
        {!last && (
          <>
            <Ring cx={xl} cy={bh + 2} r={7} />
            <Ring cx={xr} cy={bh + 2} r={7} />
          </>
        )}
      </svg>
      <div className="ch-content" style={{ left: bx + 14, top: 10, width: bw - 28, height: bh - 26 }}>
        <span className={it.title ? 'ch-title' : 'ch-big'}>
          {!it.title && <ContactIcon id={it.id} size={38} className="ch-icon" />}
          {it.label}
        </span>
        {it.sub && <span className="ch-small">{it.sub}</span>}
      </div>
    </>
  );
  const signStyle = { top: rope, width: w, height: bh + 24, ['--tilt' as string]: `${tilt}deg` } as CSSProperties;

  return (
    <motion.div
      className="ch-seg"
      style={{ width: w, height: h, transformOrigin: `50% 0%` }}
      initial={{ rotate: i === 0 ? -7 : 0 }}
      animate={{ rotate: i === 0 ? [-7, 5, -3, 1.5, -0.6, 0] : [0, -3.5, 2.6, -1.4, 0.6, 0] }}
      transition={{ duration: 1.8, ease: 'easeOut', delay: delay + 0.4 + i * 0.1 }}
    >
      <svg className="ch-rope" viewBox={`0 0 ${w} ${rope + 8}`} width={w} height={rope + 8} aria-hidden="true">
        <Rope x1={xl + 3} y1={0} x2={xl} y2={rope + 4} seed={s + 5} />
        <Rope x1={xr - 3} y1={0} x2={xr} y2={rope + 4} seed={s + 6} />
      </svg>
      {it.href ? (
        <a className="ch-sign" href={it.href} target={it.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer" style={signStyle}>
          {board}
        </a>
      ) : (
        <div className="ch-sign ch-static" style={signStyle}>{board}</div>
      )}
      {!last && (
        <div className="ch-next" style={{ top: rope + bh + 6, width: w }}>
          <Segment items={items} i={i + 1} w={w} seed={seed} delay={delay} />
        </div>
      )}
    </motion.div>
  );
}

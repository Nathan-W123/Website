'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Rough } from '@/components/sketch/rough';
import { INK, Ring, Rope, outline, shadow } from './ink';

/**
 * A framed picture hanging from two ropes. It drops in from the top of the
 * screen and settles with a swing. Children render inside the frame.
 */

export function HangingSign({ children, index = 0, w = 320, h = 200, string = 220, seed = 7, onClick, href, className = '', ratio, delay = 0.5, decoy = false }: { children: ReactNode; index?: number; w?: number; h?: number; string?: number; seed?: number; onClick?: () => void; href?: string; className?: string; ratio?: number; delay?: number; /** a repeat of a sign already on the wall: clickable, but not announced or tabbed to */ decoy?: boolean }) {
  const boardH = ratio ? Math.round(w / ratio) : h;
  const total = string + boardH + 26;
  const xl = w * 0.2, xr = w * 0.8;
  const inner = (
    <svg className="hg-svg" viewBox={`0 0 ${w} ${total}`} width={w} height={total} aria-hidden="true">
      <Rope x1={xl + 4} y1={0} x2={xl} y2={string} seed={seed + 1} />
      <Rope x1={xr - 4} y1={0} x2={xr} y2={string} seed={seed + 2} />
      <Ring cx={xl} cy={string + 3} />
      <Ring cx={xr} cy={string + 3} />
      {/* comic drop shadow, chunky frame, inner mat line */}
      <Rough kind="rect" x={14} y={string + 20} w={w - 18} h={boardH} seed={seed + 3} opts={shadow(seed + 3)} />
      <Rough kind="rect" x={3} y={string + 8} w={w - 18} h={boardH} seed={seed + 4} opts={outline(3.2, seed + 4)} />
      <Rough kind="rect" x={14} y={string + 19} w={w - 40} h={boardH - 22} seed={seed + 5} opts={{ stroke: INK, strokeWidth: 1.4, roughness: 1.2, bowing: 0.6, fill: 'none' }} />
    </svg>
  );
  const content = (
    <div className="hg-content" style={{ left: 16, top: string + 21, width: w - 44, height: boardH - 26 }}>
      {children}
    </div>
  );
  const body = (
    <motion.div
      className={`hg ${className}`}
      style={{ width: w, height: total, transformOrigin: '50% 0%' }}
      initial={{ y: -total - 80, rotate: -6 }}
      animate={{ y: 0, rotate: [-6, 4, -2.5, 1.2, -0.5, 0] }}
      transition={{ y: { type: 'spring', stiffness: 70, damping: 11, mass: 1.1, delay: delay + index * 0.12 }, rotate: { duration: 1.6, ease: 'easeOut', delay: delay + index * 0.12 + 0.35 } }}
    >
      {inner}
      {content}
    </motion.div>
  );
  if (href) return <a className="hg-link" href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">{body}</a>;
  if (onClick) return <button type="button" className="hg-link" onClick={onClick} aria-hidden={decoy || undefined} tabIndex={decoy ? -1 : undefined}>{body}</button>;
  return body;
}

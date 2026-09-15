'use client';

import { useEffect, useState } from 'react';
import { Rough } from '@/components/sketch/rough';
import { Bolt, Grain, GrainV, INK, Knot, boardPoints, hatch, outline, shadow } from '../ink';

/**
 * A cartoon wooden signpost in black ink on white: a post with a pointed cap
 * and grass at its foot, a title board, and arrow planks (pointed head,
 * swallow-tail end) that act as buttons. rough.js gives every line a wobble.
 */

export type Plank = { label: string; dir: 'left' | 'right'; href: string; small?: boolean };

export function Signpost({ title, planks, seed = 1, onPlank }: { title: string; planks: Plank[]; seed?: number; onPlank?: (p: Plank) => void }) {
  // phones get shorter planks so the whole post scales up to fill the width
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const fit = () => setCompact(window.innerWidth < 720);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const W = compact ? 900 : 1100;
  const plankH = 104;
  const gap = 30;
  const top = 340;
  const H = top + planks.length * (plankH + gap) + 290;
  const postX = W / 2;
  const baseY = H - 70;

  return (
    <svg className="sg-post" viewBox={`0 0 ${W} ${H}`} aria-label={`${title} signpost`}>
      {/* ground */}
      <Rough kind="ellipse" cx={postX + 12} cy={baseY + 26} w={440} h={54} seed={seed + 90} opts={{ stroke: 'none', fill: INK, fillStyle: 'hachure', hachureGap: 9, hachureAngle: 0, fillWeight: 1.5, roughness: 1 }} />
      {/* post with a taper, grain, a knot and shading on the right */}
      <Rough kind="poly" points={[[postX - 27, 140], [postX + 27, 140], [postX + 34, baseY], [postX - 34, baseY]]} seed={seed + 1} opts={outline(6, seed + 1)} />
      <GrainV x={postX - 12} y1={175} y2={baseY - 30} amp={4} seed={seed + 40} />
      <GrainV x={postX + 2} y1={190} y2={baseY - 60} amp={5} seed={seed + 41} />
      <Knot cx={postX + 6} cy={top + planks.length * (plankH + gap) + 40} seed={seed + 42} />
      <Rough kind="poly" points={[[postX + 16, 150], [postX + 27, 140], [postX + 34, baseY], [postX + 20, baseY]]} seed={seed + 2} opts={hatch(seed + 2, -70, 7)} />
      {/* pointed cap */}
      <Rough kind="poly" points={[[postX - 40, 142], [postX, 96], [postX + 40, 142]]} seed={seed + 3} opts={outline(6, seed + 3)} />
      {/* grass tufts */}
      <Rough kind="path" d={`M ${postX - 150} ${baseY + 6} l 10 -30 l 9 24 l 12 -40 l 10 40 l 11 -26 l 9 26`} seed={seed + 44} opts={{ stroke: INK, strokeWidth: 4, roughness: 0.9, fill: 'none' }} />
      <Rough kind="path" d={`M ${postX + 60} ${baseY + 6} l 9 -26 l 10 26 l 11 -38 l 9 38 l 12 -24 l 10 24 l 8 -18 l 8 18`} seed={seed + 45} opts={{ stroke: INK, strokeWidth: 4, roughness: 0.9, fill: 'none' }} />
      {/* title board */}
      <g transform={`rotate(-2 ${postX} 250)`}>
        {(() => {
          const pts = boardPoints(postX - 280, 192, 560, 116, 18);
          return (
            <>
              <Rough kind="poly" points={pts.map(([a, b]) => [a + 11, b + 13])} seed={seed + 4} opts={shadow(seed + 4)} />
              <Rough kind="poly" points={pts} seed={seed + 5} opts={outline(6, seed + 5)} />
              <Grain x1={postX - 245} x2={postX + 235} y={212} amp={3} seed={seed + 6} />
              <Grain x1={postX - 235} x2={postX + 245} y={292} amp={3} seed={seed + 7} />
              <Rough kind="poly" points={[[postX - 262, 294], [postX + 262, 294], [postX + 280, 290], [postX + 262, 308], [postX - 262, 308], [postX - 280, 290]]} seed={seed + 8} opts={hatch(seed + 8)} />
              <Bolt cx={postX - 252} cy={250} />
              <Bolt cx={postX + 252} cy={250} />
              <text x={postX} y={270} textAnchor="middle" className="sg-title">{title}</text>
            </>
          );
        })()}
      </g>
      {planks.map((p, i) => {
        const y = top + i * (plankH + gap);
        const L = compact ? (p.small ? 360 : 500) : p.small ? 420 : 600;
        const tip = compact ? 68 : 76;
        const notch = 28;
        const s = p.dir === 'right' ? 1 : -1;
        const xt = postX - s * 112;
        const xh = xt + s * L;
        const mid = y + plankH / 2;
        const pts: [number, number][] = [[xt, y], [xh - s * tip, y], [xh, mid], [xh - s * tip, y + plankH], [xt, y + plankH], [xt + s * notch, mid]];
        const rot = i % 2 === 0 ? -2.5 : 2;
        const cx = (postX + s * 26 + xh - s * tip) / 2;
        const g1 = Math.min(xt + s * 34, xh - s * (tip + 12)), g2 = Math.max(xt + s * 34, xh - s * (tip + 12));
        return (
          <a key={p.label} className="sg-plank" href={p.href} aria-label={p.label} onClick={() => onPlank?.(p)}>
            <g transform={`rotate(${rot} ${postX} ${mid})`}>
              <Rough kind="poly" points={pts.map(([a, b]) => [a + 10, b + 13])} seed={seed + 20 + i} opts={shadow(seed + 20 + i)} />
              <Rough kind="poly" points={pts} seed={seed + 10 + i} opts={outline(6, seed + 10 + i)} />
              <Grain x1={g1} x2={g2} y={y + 24} amp={3} seed={seed + 50 + i} />
              <Grain x1={g1 + 12} x2={g2 - 8} y={y + plankH - 30} amp={3} seed={seed + 60 + i} />
              <Rough kind="poly" points={[[xt, y + plankH - 15], [xh - s * tip, y + plankH - 15], [xh - s * tip, y + plankH], [xt, y + plankH]]} seed={seed + 30 + i} opts={hatch(seed + 30 + i)} />
              <Bolt cx={postX} cy={mid} r={10} />
              <text x={cx} y={mid + 17} textAnchor="middle" className={`sg-label${p.small ? ' sg-label-small' : ''}${p.label.length > 12 ? ' sg-label-long' : ''}`}>{p.label}</text>
            </g>
          </a>
        );
      })}
    </svg>
  );
}

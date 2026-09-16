'use client';

import rough from 'roughjs/bin/rough';
import type { Drawable, Options } from 'roughjs/bin/core';

/** Graphite pencil on paper. */
export const PENCIL = '#5c5f65';
export const PENCIL_SOFT = '#9a9da3';
export const GRAPHITE = '#2b2d31';

const generator = rough.generator();

const base: Options = {
  roughness: 1.4,
  bowing: 1.2,
  stroke: PENCIL,
  strokeWidth: 1.5,
  disableMultiStroke: false,
  preserveVertices: true,
};

type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'circle'; cx: number; cy: number; d: number }
  | { kind: 'ellipse'; cx: number; cy: number; w: number; h: number }
  | { kind: 'poly'; points: [number, number][] }
  | { kind: 'path'; d: string };

function draw(shape: Shape, opts: Options): Drawable {
  switch (shape.kind) {
    case 'rect':
      return generator.rectangle(shape.x, shape.y, shape.w, shape.h, opts);
    case 'line':
      return generator.line(shape.x1, shape.y1, shape.x2, shape.y2, opts);
    case 'circle':
      return generator.circle(shape.cx, shape.cy, shape.d, opts);
    case 'ellipse':
      return generator.ellipse(shape.cx, shape.cy, shape.w, shape.h, opts);
    case 'poly':
      return generator.polygon(shape.points, opts);
    case 'path':
      return generator.path(shape.d, opts);
  }
}

/** Renders one hand-drawn shape as SVG paths. Deterministic per seed so server and client agree. */
export function Rough({ seed, opts, className, pathLength, ...shape }: Shape & { seed: number; opts?: Options; className?: string; pathLength?: number }) {
  // Two decimals: keeps server and client path strings identical despite tiny trig differences between engines.
  const paths = generator.toPaths(draw(shape, { ...base, ...opts, seed })).map((p) => ({ ...p, d: p.d.replace(/(\d+\.\d{2})\d+/g, '$1') }));
  return (
    <g className={className}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill === 'none' ? 'none' : p.fill} strokeLinecap="round" strokeLinejoin="round" pathLength={pathLength} />
      ))}
    </g>
  );
}

/** Hatch fill used for shading a shape (drawn without an outline). */
export const HATCH: Options = {
  fill: PENCIL_SOFT,
  fillStyle: 'hachure',
  hachureGap: 7,
  hachureAngle: -48,
  fillWeight: 0.7,
  stroke: 'none',
  roughness: 1.2,
};

/** Rough SVG filter: a faint paper wobble applied to crisp elements (text, images). */
export function PencilDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="pencil-wobble" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="pencil-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0.25 0" />
        </filter>
      </defs>
    </svg>
  );
}

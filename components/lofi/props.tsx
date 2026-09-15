'use client';

import { Rough } from '@/components/sketch/rough';

/**
 * Things drawn onto the painting in its own pixel space, using the painting's
 * own palette: cream for lit whites (#f5dbc2), mauve-brown shelf wood
 * (#593b43), dark brown linework (#3d2630), coral for the lamp (#d9806a).
 */

export const CONTACT = {
  name: 'Nathan W.',
  email: 'ncward@ucdavis.edu',
  github: 'https://github.com/Nathan-W123',
};

const LINE = '#3d2630';
const roughLine = { stroke: LINE, strokeWidth: 2.6, roughness: 0.9, bowing: 0.6, disableMultiStroke: true } as const;

/** "ART" printed on the cover of the closed sketchbook. `m` maps the cover's local 135x62 box to the painting. */
export function BookTitle({ m }: { m: [number, number, number, number, number, number] }) {
  return (
    <g transform={`matrix(${m.join(' ')})`}>
      <text x={69} y={43} textAnchor="middle" className="lf-print lf-print-shadow">ART</text>
      <text x={67} y={41} textAnchor="middle" className="lf-print">ART</text>
      <path d="M 44 50 L 90 50" stroke="#f3d9b8" strokeWidth={1.4} opacity={0.6} />
    </g>
  );
}

/** A die-cut sticker on the laptop lid, like the ones already there. */
export function LaptopSticker({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x={-70} y={-21} width={140} height={42} rx={12} fill="#fbf4e8" stroke="#6b4634" strokeWidth={2.2} />
      <rect x={-64} y={-15} width={128} height={30} rx={8} fill="#2b3f6b" />
      <text x={0} y={7.5} textAnchor="middle" className="lf-sticker-text">PROJECTS</text>
      <circle cx={-58} cy={0} r={3} fill="#f0c26a" />
      <circle cx={58} cy={0} r={3} fill="#f0c26a" />
    </g>
  );
}

/**
 * A whiteboard hung on the wall between the shelves. Its "white" is the
 * painting's cream, darkening away from the window like every other lit
 * surface; the frame is the shelf wood; outlines are hand-drawn; the writing
 * is marker in the room's dark plum and coral.
 */
export function WallWhiteboard({ x, y, w, h, wall }: { x: number; y: number; w: number; h: number; wall: { x: number; y: number; w: number; h: number } }) {
  const fr = 13;
  const tw = w * 0.56;
  return (
    <g>
      {/* wall where the shelves were */}
      <rect x={wall.x} y={wall.y} width={wall.w} height={wall.h} fill="url(#lf-wall-fill)" filter="url(#lf-blur-edge)" />
      <rect x={wall.x} y={wall.y} width={wall.w} height={wall.h} fill="url(#lf-grain-fill)" opacity={0.5} filter="url(#lf-blur-edge)" />
      <g transform={`translate(${x} ${y})`}>
        {/* cast shadow, offset away from the window */}
        <rect x={14} y={16} width={w} height={h + 10} rx={8} fill="#2a1418" opacity={0.42} filter="url(#lf-blur-shadow-lg)" />
        {/* frame */}
        <rect x={0} y={0} width={w} height={h} rx={6} fill="url(#lf-frame-wood)" />
        <rect x={0} y={0} width={w} height={6} rx={3} fill="#8a6468" opacity={0.8} />
        <rect x={0} y={h - 6} width={w} height={6} rx={3} fill="#3f2a30" opacity={0.7} />
        <Rough kind="rect" x={0} y={0} w={w} h={h} seed={41} opts={roughLine} />
        {/* board surface: cream, lit from the window, darker to the right and bottom */}
        <rect x={fr} y={fr} width={w - fr * 2} height={h - fr * 2} rx={3} fill="url(#lf-board-cream)" />
        <rect x={fr} y={fr} width={w - fr * 2} height={h - fr * 2} rx={3} fill="url(#lf-grain-fill)" opacity={0.35} />
        <rect x={fr} y={fr} width={w - fr * 2} height={16} fill="url(#lf-inner-top)" />
        <rect x={w - fr - 26} y={fr} width={26} height={h - fr * 2} fill="url(#lf-inner-right)" />
        <path d={`M ${fr + 26} ${fr + 8} L ${fr + 150} ${fr + 8} L ${fr + 60} ${h - fr - 8} L ${fr + 26} ${h - fr - 8} Z`} fill="#fff6ea" opacity={0.22} />
        <Rough kind="rect" x={fr} y={fr} w={w - fr * 2} h={h - fr * 2} seed={42} opts={{ ...roughLine, strokeWidth: 2 }} />
        {/* screws */}
        <circle cx={7} cy={7} r={2.6} fill={LINE} />
        <circle cx={w - 7} cy={7} r={2.6} fill={LINE} />
        {/* marker tray */}
        <rect x={(w - tw) / 2} y={h - 3} width={tw} height={16} rx={3} fill="url(#lf-frame-wood)" />
        <Rough kind="rect" x={(w - tw) / 2} y={h - 3} w={tw} h={16} seed={43} opts={{ ...roughLine, strokeWidth: 2.2 }} />
        <rect x={(w - tw) / 2 + 22} y={h - 9} width={46} height={8} rx={4} fill="#3a2a3a" stroke={LINE} strokeWidth={1.4} />
        <rect x={(w - tw) / 2 + 78} y={h - 9} width={46} height={8} rx={4} fill="#c9553f" stroke={LINE} strokeWidth={1.4} />
        {/* writing */}
        <g className="lf-marker" filter="url(#lf-ink)">
          <text x={fr + 26} y={fr + 78} className="lf-marker-name-lg" transform={`rotate(-1.4 ${fr + 26} ${fr + 78})`}>{CONTACT.name}</text>
          <path d={`M ${fr + 28} ${fr + 92} q 60 7 120 0 t 96 3`} fill="none" stroke="#3a2a3a" strokeWidth={2.6} strokeLinecap="round" opacity={0.75} />
          <a href={`mailto:${CONTACT.email}`} className="lf-marker-link">
            <text x={fr + 28} y={fr + 150} className="lf-marker-line-lg" transform={`rotate(0.5 ${fr + 28} ${fr + 150})`}>{CONTACT.email}</text>
          </a>
          <a href={CONTACT.github} target="_blank" rel="noreferrer" className="lf-marker-link">
            <text x={fr + 28} y={fr + 200} className="lf-marker-line-lg" transform={`rotate(-0.6 ${fr + 28} ${fr + 200})`}>github.com/{CONTACT.github.split('/').pop()}</text>
          </a>
          <path d={`M ${w - fr - 70} ${h - fr - 52} l 5 12 13 1 -10 9 3 13 -11 -6 -11 6 3 -13 -10 -9 13 -1 z`} fill="none" stroke="#c9553f" strokeWidth={2.2} strokeLinejoin="round" opacity={0.9} />
        </g>
      </g>
    </g>
  );
}

/** Marker handwriting on the whiteboard that is already painted into the room. Links are live. */
export function BoardWriting({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const gx = x + w * 0.08;
  return (
    <g className="lf-marker" filter="url(#lf-ink)">
      <text x={gx} y={y + h * 0.3} className="lf-board-name" transform={`rotate(-1.6 ${gx} ${y + h * 0.3})`}>{CONTACT.name}</text>
      <path d={`M ${gx + 2} ${y + h * 0.36} q ${w * 0.16} 6 ${w * 0.32} 0 t ${w * 0.24} 2`} fill="none" stroke="#d9663f" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <a href={`mailto:${CONTACT.email}`} className="lf-marker-link">
        <text x={gx + 2} y={y + h * 0.56} className="lf-board-line" transform={`rotate(0.7 ${gx} ${y + h * 0.56})`}>{CONTACT.email}</text>
      </a>
      <a href={CONTACT.github} target="_blank" rel="noreferrer" className="lf-marker-link">
        <text x={gx + 2} y={y + h * 0.76} className="lf-board-line" transform={`rotate(-0.8 ${gx} ${y + h * 0.76})`}>github.com/{CONTACT.github.split('/').pop()}</text>
      </a>
      <path d={`M ${x + w - 46} ${y + h - 40} l 4 10 11 1 -8 8 2 11 -9 -5 -9 5 2 -11 -8 -8 11 -1 z`} fill="none" stroke="#d9663f" strokeWidth={2} strokeLinejoin="round" opacity={0.9} />
    </g>
  );
}

/**
 * A stand for the lamp: a post from the arm's hinge straight down to a heavy
 * round base on the desk, shaded like a cylinder and a disc in the lamp's coral.
 */
export function LampStand({ x, top, bottom }: { x: number; top: number; bottom: number }) {
  return (
    <g>
      {/* shadow on the desk */}
      <ellipse cx={x + 12} cy={bottom + 30} rx={80} ry={12} fill="#2a1418" opacity={0.35} filter="url(#lf-blur-shadow)" />
      {/* post */}
      <rect x={x - 9} y={top} width={18} height={bottom - top} fill="url(#lf-post)" />
      <Rough kind="line" x1={x - 9} y1={top} x2={x - 9} y2={bottom - 6} seed={51} opts={{ ...roughLine, strokeWidth: 2.4 }} />
      <Rough kind="line" x1={x + 9} y1={top} x2={x + 9} y2={bottom - 6} seed={52} opts={{ ...roughLine, strokeWidth: 2.4 }} />
      {/* joint at the top where the arm meets the post */}
      <circle cx={x} cy={top + 2} r={13} fill="url(#lf-knob)" />
      <Rough kind="circle" cx={x} cy={top + 2} d={26} seed={53} opts={{ ...roughLine, strokeWidth: 2.4 }} />
      <circle cx={x - 3} cy={top - 2} r={3} fill="#f6c3b0" opacity={0.8} />
      {/* base: thick disc */}
      <rect x={x - 62} y={bottom - 6} width={124} height={26} fill="#7a3f36" />
      <ellipse cx={x} cy={bottom + 20} rx={62} ry={17} fill="#7a3f36" />
      <ellipse cx={x} cy={bottom + 20} rx={62} ry={17} fill="url(#lf-base)" opacity={0.35} />
      <ellipse cx={x} cy={bottom - 6} rx={62} ry={17} fill="url(#lf-base)" />
      <Rough kind="ellipse" cx={x} cy={bottom - 6} w={124} h={34} seed={54} opts={{ ...roughLine, strokeWidth: 2.4 }} />
      <path d={`M ${x - 62} ${bottom - 6} L ${x - 62} ${bottom + 20} A 62 17 0 0 0 ${x + 62} ${bottom + 20} L ${x + 62} ${bottom - 6}`} fill="none" stroke={LINE} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={`M ${x - 40} ${bottom - 16} q 40 -8 80 0`} fill="none" stroke="#f6c3b0" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
    </g>
  );
}

export function PropDefs() {
  return (
    <>
      <linearGradient id="lf-wall-fill" x1="0" y1="0" x2="1" y2="0.15">
        <stop offset="0" stopColor="#946a70" />
        <stop offset="0.3" stopColor="#6e5060" />
        <stop offset="1" stopColor="#553c47" />
      </linearGradient>
      <linearGradient id="lf-frame-wood" x1="0" y1="0" x2="1" y2="0.6">
        <stop offset="0" stopColor="#7d5760" />
        <stop offset="0.5" stopColor="#5f3f48" />
        <stop offset="1" stopColor="#4a303a" />
      </linearGradient>
      <linearGradient id="lf-board-cream" x1="0" y1="0" x2="1" y2="0.35">
        <stop offset="0" stopColor="#f2dcc4" />
        <stop offset="0.45" stopColor="#e9ccb6" />
        <stop offset="1" stopColor="#cfaea6" />
      </linearGradient>
      <linearGradient id="lf-inner-top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3d2630" stopOpacity="0.3" />
        <stop offset="1" stopColor="#3d2630" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="lf-inner-right" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#3d2630" stopOpacity="0" />
        <stop offset="1" stopColor="#3d2630" stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id="lf-post" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8a4a40" />
        <stop offset="0.35" stopColor="#e0937c" />
        <stop offset="0.6" stopColor="#c9705f" />
        <stop offset="1" stopColor="#7a3f36" />
      </linearGradient>
      <radialGradient id="lf-knob" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#e8a08a" />
        <stop offset="1" stopColor="#8a4a40" />
      </radialGradient>
      <linearGradient id="lf-base" x1="0" y1="0" x2="1" y2="0.5">
        <stop offset="0" stopColor="#e2957f" />
        <stop offset="0.5" stopColor="#cf7561" />
        <stop offset="1" stopColor="#9c5347" />
      </linearGradient>
      <pattern id="lf-grain-fill" width="180" height="180" patternUnits="userSpaceOnUse">
        <rect width="180" height="180" filter="url(#lf-grain-f)" />
      </pattern>
      <filter id="lf-grain-f" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" />
        <feColorMatrix values="0 0 0 0 0.36  0 0 0 0 0.24  0 0 0 0 0.26  0 0 0 0.35 0" />
      </filter>
      <filter id="lf-ink" x="-5%" y="-10%" width="110%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="lf-blur-edge" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id="lf-blur-shadow-lg" x="-20%" y="-20%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      <linearGradient id="lf-board-face" x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stopColor="#f2dcc4" />
        <stop offset="0.55" stopColor="#e9ccb6" />
        <stop offset="1" stopColor="#cfaea6" />
      </linearGradient>
    </>
  );
}

/** Small standing whiteboard used only as the portrait-phone fallback. */
export function DeskWhiteboard({ x, y, w = 250, h = 180 }: { x: number; y: number; w?: number; h?: number }) {
  const fr = 9;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={10} y={12} width={w} height={h - 6} rx={6} fill="#3a1f2a" opacity={0.22} filter="url(#lf-blur-shadow)" />
      <rect x={0} y={0} width={w} height={h} rx={7} fill="url(#lf-frame-wood)" stroke={LINE} strokeWidth={2.6} />
      <rect x={fr} y={fr} width={w - fr * 2} height={h - fr * 2} rx={3} fill="url(#lf-board-face)" stroke="#8a6a5a" strokeWidth={1.4} />
      <rect x={w * 0.14} y={h - 3} width={w * 0.72} height={11} rx={3} fill="url(#lf-frame-wood)" stroke={LINE} strokeWidth={2} />
      <g className="lf-marker">
        <text x={fr + 14} y={fr + 44} className="lf-marker-name" transform={`rotate(-1.5 ${fr + 14} ${fr + 44})`}>{CONTACT.name}</text>
        <a href={`mailto:${CONTACT.email}`} className="lf-marker-link">
          <text x={fr + 14} y={fr + 84} className="lf-marker-line" transform={`rotate(0.6 ${fr + 14} ${fr + 84})`}>{CONTACT.email}</text>
        </a>
        <a href={CONTACT.github} target="_blank" rel="noreferrer" className="lf-marker-link">
          <text x={fr + 14} y={fr + 114} className="lf-marker-line" transform={`rotate(-0.8 ${fr + 14} ${fr + 114})`}>github.com/{CONTACT.github.split('/').pop()}</text>
        </a>
      </g>
    </g>
  );
}

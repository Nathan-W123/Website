'use client';

import { Rough } from '@/components/sketch/rough';
import { INK } from './ink';

/**
 * Doodled logos for the contact links, drawn in the same wobbly ink as the
 * signs: a camera for Instagram, "in" in a box for LinkedIn, a cat face for
 * GitHub, an envelope for email.
 */

const line = (w = 2.2, seed = 1) => ({ stroke: INK, strokeWidth: w, roughness: 1, bowing: 0.8, fill: 'none', seed, disableMultiStroke: true });

export function ContactIcon({ id, size = 34, className = '' }: { id: string; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 40 40', className: `ci ${className}`, 'aria-hidden': true as const };
  switch (id) {
    case 'instagram':
      return (
        <svg {...common}>
          <Rough kind="rect" x={5} y={5} w={30} h={30} seed={11} opts={line(2.4, 11)} />
          <Rough kind="circle" cx={20} cy={20} d={14} seed={12} opts={line(2.2, 12)} />
          <circle cx={28.5} cy={11.5} r={2.2} fill={INK} />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common}>
          <Rough kind="rect" x={5} y={5} w={30} h={30} seed={21} opts={line(2.4, 21)} />
          <Rough kind="line" x1={13} y1={17} x2={13} y2={29} seed={22} opts={line(2.6, 22)} />
          <circle cx={13} cy={12} r={2.2} fill={INK} />
          <Rough kind="path" d="M 19 29 L 19 17 M 19 21 c 2 -5 9 -5 9 1 L 28 29" seed={23} opts={line(2.6, 23)} />
        </svg>
      );
    case 'github':
      return (
        <svg {...common}>
          {/* a cat: round face, two ears, eyes and a nose */}
          <Rough kind="path" d="M 9 16 L 8 6 L 15 11 C 18 10 22 10 25 11 L 32 6 L 31 16 C 34 22 32 32 20 33 C 8 32 6 22 9 16 Z" seed={31} opts={{ ...line(2.4, 31), fill: '#fff', fillStyle: 'solid' }} />
          <circle cx={15.5} cy={20} r={1.8} fill={INK} />
          <circle cx={24.5} cy={20} r={1.8} fill={INK} />
          <Rough kind="path" d="M 18 25 l 2 2 l 2 -2" seed={32} opts={line(2, 32)} />
        </svg>
      );
    case 'email':
      return (
        <svg {...common}>
          <Rough kind="rect" x={5} y={10} w={30} h={21} seed={41} opts={line(2.4, 41)} />
          <Rough kind="path" d="M 6 12 L 20 23 L 34 12" seed={42} opts={line(2.2, 42)} />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * The same marks, drawn straight. ContactIcon sketches them with Rough, which
 * belongs to the paper pages; beside the geometric type on the new ones a
 * wobbly cat and a hand-drawn box read as a different site.
 */
export function BrandIcon({ id, size = 24, className = '' }: { id: string; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', className: `bi ${className}`, 'aria-hidden': true as const, fill: 'currentColor' };
  switch (id) {
    case 'linkedin':
      return (
        <svg {...common}>
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
        </svg>
      );
    case 'github':
      return (
        <svg {...common}>
          <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.26.8-.57v-2.2c-3.34.72-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .31.2.68.82.56A12 12 0 0 0 12 .3Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.2" />
          <circle cx="12" cy="12" r="4.6" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'email':
    default:
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.4" y="4.6" width="19.2" height="14.8" rx="2.6" />
          <path d="M3.4 7 12 13.2 20.6 7" />
        </svg>
      );
  }
}

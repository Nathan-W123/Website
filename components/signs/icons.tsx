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

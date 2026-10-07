import type { Metadata } from 'next';
import localFont from 'next/font/local';
import SketchPortfolio from '@/components/sketch/sketch';

// shipped with the repo rather than fetched at build time; see app/page.tsx
const cabinSketch = localFont({
  src: [
    { path: '../fonts/cabin-sketch-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/cabin-sketch-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-cabin-sketch',
});
const architects = localFont({
  src: '../fonts/architects-daughter-400.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-architects',
});

export const metadata: Metadata = {
  title: 'Nathan W. — Portfolio',
  description: 'Walk into a sketched house, down the hall, and along a gallery wall of twelve projects: simulators, learning agents and coordination tools.',
};

export default function Page() {
  return (
    <main className={`${cabinSketch.variable} ${architects.variable}`}>
      <SketchPortfolio />
    </main>
  );
}

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Signs from '@/components/signs/signs';

// The faces ship with the repo rather than being fetched from Google at build
// time: next/font/google failed intermittently here and in CI, and when it does
// it takes the whole deploy with it. Refresh them with work/ref/fetch-fonts.mjs.
const bangers = localFont({
  src: './fonts/bangers-400.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-bangers',
});
const patrick = localFont({
  src: './fonts/patrick-hand-400.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-patrick',
});
// the home page is set in a geometric face; Jost is the free Futura
const jost = localFont({
  src: [
    { path: './fonts/jost-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/jost-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/jost-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-jost',
});
const inter = localFont({
  src: [
    { path: './fonts/inter-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-600.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Nathan W.',
  description: 'Nathan Ward — engineer and artist. Simulators, solvers and neural networks; hand-painted shoes and drawings.',
};

export default function Page() {
  return (
    <main className={`${bangers.variable} ${patrick.variable} ${jost.variable} ${inter.variable}`}>
      <Signs />
    </main>
  );
}

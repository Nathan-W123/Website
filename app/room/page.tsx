import type { Metadata } from 'next';
import localFont from 'next/font/local';
import LofiRoom from '@/components/lofi/lofi';

// shipped with the repo rather than fetched at build time; see app/page.tsx
const baloo = localFont({
  src: [
    { path: '../fonts/baloo2-700.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/baloo2-800.woff2', weight: '800', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-baloo',
});
const nunito = localFont({
  src: [
    { path: '../fonts/nunito-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/nunito-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-nunito',
});
const caveat = localFont({
  src: [
    { path: '../fonts/caveat-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/caveat-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-caveat',
});

export const metadata: Metadata = {
  title: 'Nathan W. — art & engineering',
  description: 'A desk by the window at golden hour. The laptop holds the engineering projects; the sketchbook holds the art.',
};

export default function Page() {
  return (
    <main className={`${baloo.variable} ${nunito.variable} ${caveat.variable}`}>
      <LofiRoom />
    </main>
  );
}

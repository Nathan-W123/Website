import type { Metadata } from 'next';
import { Baloo_2, Caveat, Nunito } from 'next/font/google';
import LofiRoom from '@/components/lofi/lofi';

const baloo = Baloo_2({ weight: ['700', '800'], subsets: ['latin'], variable: '--font-baloo' });
const nunito = Nunito({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-nunito' });
const caveat = Caveat({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-caveat' });

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

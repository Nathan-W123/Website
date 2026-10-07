import type { Metadata } from 'next';
import { Bangers, Inter, Jost, Patrick_Hand } from 'next/font/google';
import Signs from '@/components/signs/signs';

const bangers = Bangers({ weight: '400', subsets: ['latin'], variable: '--font-bangers' });
const patrick = Patrick_Hand({ weight: '400', subsets: ['latin'], variable: '--font-patrick' });
// the home page is set in a geometric face; Jost is the free Futura
const jost = Jost({ weight: ['500', '600', '700'], subsets: ['latin'], variable: '--font-jost' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

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

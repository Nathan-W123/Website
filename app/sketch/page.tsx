import type { Metadata } from 'next';
import { Architects_Daughter, Cabin_Sketch } from 'next/font/google';
import SketchPortfolio from '@/components/sketch/sketch';

const cabinSketch = Cabin_Sketch({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-cabin-sketch' });
const architects = Architects_Daughter({ weight: '400', subsets: ['latin'], variable: '--font-architects' });

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

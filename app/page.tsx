import type { Metadata } from 'next';
import Home from '@/components/home/home';

// The redesign: a plain column in Courier New under Nathan's sunset study.
// The site it replaces still runs at /classic while this one is local only.
export const metadata: Metadata = {
  title: 'Nathan W.',
  description: 'Nathan Ward — engineer and artist. Simulators, solvers and neural networks; hand-painted shoes and drawings.',
};

export default function Page() {
  return <Home />;
}

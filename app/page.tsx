import type { Metadata } from 'next';
import Home from '@/components/home/home';

// The home page: a plain column in Courier New under Nathan's sunset study.
export const metadata: Metadata = {
  title: 'Nathan W.',
  description: 'Nathan Ward — engineer and artist. Simulators, solvers and neural networks; hand-painted shoes and drawings.',
};

export default function Page() {
  return <Home />;
}

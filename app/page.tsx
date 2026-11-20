import type { Metadata } from 'next';
import Home from '@/components/home/home';

// The home page: the About in EB Garamond beside Nathan's morphing ribbon.
export const metadata: Metadata = {
  title: 'Nathan W.',
  description: 'Nathan Ward — engineer and artist. Simulators, solvers and neural networks; hand-painted shoes and drawings.',
};

export default function Page() {
  return <Home />;
}

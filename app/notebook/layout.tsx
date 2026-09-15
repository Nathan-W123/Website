import type { Metadata } from 'next';
import { Fraunces, Newsreader } from 'next/font/google';
import '../../components/notebook/notebook.css';

// Display face: variable Fraunces with its optical-size, softness and wonk
// axes exposed so the CSS can dial in the hand-made feel per size.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['opsz', 'SOFT', 'WONK'],
  display: 'swap',
});

// Body face: Newsreader (upright and italic) with optical sizing.
const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nathan W. · Field notebook',
  description:
    'A painted field notebook of computational work: simulators for physics and chemistry, and the agents, games and coordination systems that learn and work inside them.',
  openGraph: {
    title: 'Nathan W. · Field notebook',
    description:
      'Simulators for physics and chemistry, and the things that learn and work inside them.',
    url: '/notebook',
    siteName: 'Nathan W.',
    type: 'website',
  },
};

export default function NotebookLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${fraunces.variable} ${newsreader.variable} notebook-root`}>
      {children}
    </div>
  );
}

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '../../components/notebook/notebook.css';

// Display face: variable Fraunces with its optical-size, softness and wonk
// axes exposed so the CSS can dial in the hand-made feel per size.
// shipped with the repo rather than fetched at build time; see app/page.tsx
// variable files: one each covers the whole weight range the pages ask for
const fraunces = localFont({
  src: '../fonts/fraunces-var.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-fraunces',
});

// Body face: Newsreader (upright and italic) with optical sizing.
const newsreader = localFont({
  src: [
    { path: '../fonts/newsreader-var.woff2', weight: '200 800', style: 'normal' },
    { path: '../fonts/newsreader-var-italic.woff2', weight: '200 800', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-newsreader',
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

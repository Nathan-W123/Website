import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nateward.me'),
  title: 'Nathan W.',
  description: 'Nathan Ward: art, machine learning and numerical modelling projects, and how to get in touch. Follow the signpost.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Nathan W.',
    description: 'Art, ML / AI and numerical modelling projects. Follow the signpost.',
    url: '/',
    siteName: 'Nathan W.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'A hand-drawn wooden signpost: Contact me, My art, My projects' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nathan W.',
    description: 'Art, ML / AI and numerical modelling projects. Follow the signpost.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

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
  metadataBase: new URL('https://nathans-world.ncward173407.chatgpt.site'),
  title: "Nathan's World — A Playable Project Archive",
  description: "Explore Nathan's projects as a top-down pixel world, with each biome hiding a different experiment, system, or simulation.",
  openGraph: {
    title: "Nathan's World — A Playable Project Archive",
    description: 'Walk the world. Discover the work. Explore the code.',
    url: '/',
    siteName: 'Nathan W.',
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1672,
        height: 941,
        alt: "Nathan's World — a playable pixel-art project archive",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Nathan's World — A Playable Project Archive",
    description: 'Walk the world. Discover the work. Explore the code.',
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

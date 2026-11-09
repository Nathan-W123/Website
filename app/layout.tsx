import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// shipped with the repo, not fetched at build time; see app/page.tsx
const geistSans = localFont({
  src: [
    { path: './fonts/geist-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/geist-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/geist-600.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-geist-sans',
});

const geistMono = localFont({
  src: './fonts/geist-mono-400.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nateward.me'),
  title: 'Nathan W.',
  description: 'Nathan Ward: art, machine learning and numerical modelling projects, and how to get in touch. Follow the signpost.',
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/favicon.svg?v=2', type: 'image/svg+xml' }, { url: '/favicon.ico?v=2', sizes: '16x16 32x32 48x48' }],
    apple: '/apple-touch-icon.png?v=2',
  },
  openGraph: {
    title: 'Nathan W.',
    description: 'Art, ML / AI and numerical modelling projects. Follow the signpost.',
    url: '/',
    siteName: 'Nathan W.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Nathan W. — a lined-paper page with taped photos of his art and projects' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nathan W.',
    description: 'Art, ML / AI and numerical modelling projects. Follow the signpost.',
    images: ['/og.png'],
  },
};

// The HTML is the home page, so a visit that comes straight to About or
// Contact (the NFC tag opens Contact) used to show home until the script
// loaded, and then the sheet rose over it. This runs before anything is
// drawn and marks the page the address asks for; the copies of About and
// Contact that ship in the HTML show by it until the script takes over
// (.sg-boot in components/signs). It follows the address until then too.
// It also measures the scrollbar gutter the pages keep (overflow auto with
// scrollbar-gutter: stable, as on .sg-page--plain), which the nav bar stops
// short of (--sbw); left to the script, the bar was drawn full width and
// then narrowed once the script had measured it.
// On a visit straight to Contact it asks for the puzzle's four KaTeX fonts
// at once (components/signs/katex-fonts.css), so they arrive with the
// stylesheets and the formula is whole in the first frame.
const BOOT =
  "(function(){var d=document.documentElement;function s(){var p=location.hash.slice(1).split('/').filter(Boolean)[0];" +
  "if(p==='about'||p==='contact')d.setAttribute('data-boot',p);else d.removeAttribute('data-boot')}" +
  "s();window.__sgBoot=s;addEventListener('hashchange',s);" +
  "if(d.getAttribute('data-boot')==='contact')['Main-Regular','Math-Italic','Size2-Regular','Size4-Regular'].forEach(function(n){" +
  "var l=document.createElement('link');l.rel='preload';l.as='font';l.type='font/woff2';l.crossOrigin='anonymous';" +
  "l.href='/fonts/katex/KaTeX_'+n+'.woff2';document.head.appendChild(l)});" +
  "var t=document.createElement('div');t.style.cssText='position:absolute;top:-200px;width:100px;height:100px;overflow-y:auto;scrollbar-gutter:stable';" +
  "d.appendChild(t);var g=t.offsetWidth-t.clientWidth;d.removeChild(t);d.style.setProperty('--sbw',g+'px')})();";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // the head script adds data-boot before React sees the page
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

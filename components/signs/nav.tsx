'use client';

import { useEffect } from 'react';

type Page = 'home' | 'about' | 'contact';

const LINKS: { page: Page; label: string; href: string }[] = [
  { page: 'home', label: 'Home', href: '#/' },
  { page: 'about', label: 'About', href: '#/about' },
  { page: 'contact', label: 'Contact', href: '#/contact' },
];

/**
 * The bar across the top of home, About and Contact: frosted glass, with the
 * three pages in the middle and the one you are on underlined. Home is in the
 * row rather than a name in the corner: About and Contact are sheets over
 * home, and Contact is also where the NFC tag lands, so the way back has to
 * be there on every page.
 *
 * The route shell renders it once, above the page swap, so it holds still
 * while the sheets rise and drop beneath it.
 */
export function Nav({ page }: { page: Page }) {
  // The pages scroll in boxes of their own rather than the window, so a
  // page's scrollbar sits inside the viewport. These pages keep the
  // scrollbar's gutter even when they are short (scrollbar-gutter: stable),
  // and the bar stops at it rather than frosting over it: this reads how wide
  // the gutter is off the page itself, which is 0 wherever scrollbars float.
  useEffect(() => {
    const measure = () => {
      const pg = document.querySelector<HTMLElement>('.sg-page--plain');
      if (pg) document.documentElement.style.setProperty('--sbw', `${pg.offsetWidth - pg.clientWidth}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <nav className="hm-nav" aria-label="Site">
      <ul className="hm-nav-links">
        {LINKS.map((l) => (
          <li key={l.page}>
            <a className="hm-nav-link" href={l.href} aria-current={page === l.page ? 'page' : undefined}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, type MouseEvent } from 'react';

type Page = 'home' | 'about' | 'contact';

const LINKS: { page: Page; label: string; href: string }[] = [
  { page: 'home', label: 'Home', href: '#/' },
  { page: 'about', label: 'About', href: '#/about' },
  { page: 'contact', label: 'Contact', href: '#/contact' },
];

// the page on screen: during a swap the incoming one is the last in the DOM
const currentPage = () => [...document.querySelectorAll<HTMLElement>('.sg-page--plain')].pop();

/**
 * The bar across the top of home, About and Contact: frosted glass, with the
 * three pages in the middle and the one you are on underlined. It is the same
 * bar on every page, so nothing in it comes or goes as you move around. Home
 * is the way back from About and Contact, which are sheets over home, and
 * from Contact when the NFC tag lands you there first.
 *
 * The route shell renders it once, above the page swap, so it holds still
 * while the sheets rise and drop beneath it.
 */
export function Nav({ page }: { page: Page }) {
  const reduce = useReducedMotion();

  // The pages scroll in boxes of their own rather than the window, so a
  // page's scrollbar sits inside the viewport. These pages keep the
  // scrollbar's gutter even when they are short (scrollbar-gutter: stable),
  // and the bar stops at it rather than frosting over it: this reads how wide
  // the gutter is off the page itself, which is 0 wherever scrollbars float.
  useEffect(() => {
    const measure = () => {
      const pg = currentPage();
      if (pg) document.documentElement.style.setProperty('--sbw', `${pg.offsetWidth - pg.clientWidth}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // the link to the page you are already on takes that page back to its top,
  // rather than doing nothing (Home from far down the project grid, say)
  const toTop = (e: MouseEvent<HTMLAnchorElement>) => {
    const pg = currentPage();
    if (!pg) return;
    e.preventDefault();
    pg.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <nav className="hm-nav" aria-label="Site">
      <ul className="hm-nav-links">
        {LINKS.map((l) => (
          <li key={l.page}>
            <a
              className="hm-nav-link"
              href={l.href}
              aria-current={page === l.page ? 'page' : undefined}
              onClick={page === l.page ? toTop : undefined}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

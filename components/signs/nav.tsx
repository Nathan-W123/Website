'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';

type Page = 'home' | 'about' | 'contact';

const LINKS: { page: Page; label: string; href: string }[] = [
  { page: 'about', label: 'About', href: '#/about' },
  { page: 'contact', label: 'Contact', href: '#/contact' },
];

/**
 * The bar across the top of home, About and Contact: frosted glass, with the
 * two pages in the middle and the one you are on underlined. Off the home
 * page the name sits at its left and takes you back: About and Contact are
 * sheets over home, and Contact is also where the NFC tag lands, so without
 * it there would be no way from there into the rest of the site.
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
      const pg = document.querySelector<HTMLElement>('.sg-page--plain');
      if (pg) document.documentElement.style.setProperty('--sbw', `${pg.offsetWidth - pg.clientWidth}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <nav className={`hm-nav${page === 'home' ? '' : ' is-sub'}`} aria-label="Site">
      <AnimatePresence initial={false}>
        {page !== 'home' && (
          <motion.a
            key="home"
            className="hm-nav-home"
            href="#/"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.24 }}
          >
            Nathan Ward
          </motion.a>
        )}
      </AnimatePresence>
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

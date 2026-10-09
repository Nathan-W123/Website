'use client';

import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ART, CONTACTS, PROJECT_GROUPS, WORKED_WITH, type ArtItem, type Card } from './content';
import { TopBar } from './topbar';

/**
 * Home: the name set large, four pieces of work fanned out under it, and a
 * line that says what I am. The pill under that line switches the whole page
 * between the two halves of the portfolio — the word for the side you are on
 * lights up, and the grid below it changes to match. One scroll, no routes.
 */

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

type Side = 'engineering' | 'art';

/**
 * The fan. Each card is a different size and sits at its own height, so the
 * group reads as a pile someone dropped rather than a row. `w` is a multiple of
 * the base card width and `dx`/`dy` place the card's centre in those same
 * units, which keeps the spacing honest when the widths differ. `from` is where
 * the card flies in from, in viewport units, so it starts off the edge at any
 * screen size.
 */
const SEATS = [
  { w: 0.92, dx: -0.97, dy: 0.1, tilt: -7, z: 2, from: { x: '-13vw', y: '5vh', r: -15 } },
  { w: 1.06, dx: -0.33, dy: -0.02, tilt: -2.5, z: 4, from: { x: '4vw', y: '-7vh', r: 8 } },
  { w: 0.95, dx: 0.33, dy: 0.08, tilt: 3.5, z: 3, from: { x: '-5vw', y: '7vh', r: -6 } },
  { w: 1.01, dx: 0.97, dy: -0.07, tilt: 7, z: 1, from: { x: '12vw', y: '-4vh', r: 14 } },
]

/** Four of whichever side you are looking at, cropped to 4:5 and tonally matched
 *  within each set so the fan reads as one group rather than four odd scraps. */
const FAN: Record<Side, string[]> = {
  engineering: ['/hero/eng-1.webp', '/hero/eng-2.webp', '/hero/eng-3.webp', '/hero/eng-4.webp'],
  art: ['/hero/art-1.webp', '/hero/art-2.webp', '/hero/art-3.webp', '/hero/art-4.webp'],
};

const ALL_PROJECTS: Card[] = PROJECT_GROUPS.flatMap((g) => g.cards);
const ALL_ART: (ArtItem & { section: string })[] = ART.flatMap((s) => s.items.map((it) => ({ ...it, section: s.id })));

/**
 * One tile in the gallery. It waits a little low and faded until you scroll onto
 * it, then lifts into place. The observer is ours rather than `whileInView`,
 * which never fires for these list items in this build — and when it doesn't
 * fire, motion treats the element as static and drops `initial` with it.
 */
function Tile({
  i,
  image,
  label,
  line,
  onOpen,
}: {
  i: number;
  image?: string;
  label: string;
  line?: string;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  // not `once`: it should lift every time it comes back onto the screen
  const seen = useInView(ref, { amount: 0.2, margin: '0px 0px -60px 0px' });
  const reduce = useReducedMotion();
  const rest = { opacity: 1, y: 0, scale: 1 };
  const low = { opacity: 0, y: 30, scale: 0.955 };
  return (
    <motion.li
      ref={ref}
      initial={reduce ? false : low}
      animate={reduce || seen ? rest : low}
      transition={{ duration: reduce ? 0.01 : 0.55, ease: [0.22, 1, 0.3, 1], delay: reduce ? 0 : (i % 3) * 0.08 }}
    >
      <button type="button" onClick={onOpen} aria-label={`Open ${label}`}>
        <span className="hm-tile">
          {image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={base() + image} alt="" loading="lazy" draggable={false} />
          )}
        </span>
        {line && (
          <span className="hm-tile-text">
            <span className="hm-tile-name">{label}</span>
            <span className="hm-tile-line">{line}</span>
          </span>
        )}
      </button>
    </motion.li>
  );
}

export function Landing({
  onOpenProject,
  onOpenArt,
}: {
  onOpenProject: (c: Card) => void;
  onOpenArt: (v: { image: string; caption: string; materials?: string[] }) => void;
}) {
  const [side, setSide] = useState<Side>('engineering');
  // mid-shuffle the four cards are squared into one deck; the pictures change
  // underneath while they are stacked, then the deck is dealt back out
  const [stacked, setStacked] = useState(false);
  const shuffleTimers = useRef<number[]>([]);
  const reduce = useReducedMotion();
  const fan = useRef<HTMLDivElement>(null);
  // the cards fly in from off the edges on load and again on the way back up
  const fanIn = useInView(fan, { amount: 0.35 });

  const flip = () => {
    if (stacked) return;
    const other: Side = side === 'art' ? 'engineering' : 'art';
    if (reduce) {
      setSide(other);
      return;
    }
    setStacked(true);
    shuffleTimers.current.push(
      window.setTimeout(() => setSide(other), 330),
      window.setTimeout(() => setStacked(false), 430),
    );
  };
  useEffect(() => () => shuffleTimers.current.forEach((t) => window.clearTimeout(t)), []);

  // Gallery, pressed from another page, routes home and leaves a note behind
  useEffect(() => {
    if (window.sessionStorage.getItem('signs:to-work') !== '1') return;
    window.sessionStorage.removeItem('signs:to-work');
    const t = window.setTimeout(() => document.querySelector('.hm-work')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 420);
    return () => window.clearTimeout(t);
  }, []);

  // the fan settles into place once, with a little overshoot, unless motion is unwanted
  const spring = useMemo(
    () => (reduce ? { duration: 0.01 } : { type: 'spring' as const, stiffness: 240, damping: 21, mass: 0.9 }),
    [reduce],
  );

  return (
    <div className="hm">
      <TopBar onHome={() => undefined} here="home" />

      <header className="hm-hero">
        <p className="hm-meta">
          Davis, California
          <a href={`mailto:${CONTACTS.find((c) => c.id === 'email')?.handle}`}>{CONTACTS.find((c) => c.id === 'email')?.handle}</a>
        </p>

        <h1 className="hm-name">Nathan Ward</h1>

        <div className="hm-fan" ref={fan} aria-hidden="true">
          {SEATS.map((seat, i) => (
            <motion.div
              key={i}
              className="hm-fan-seat"
              style={{ zIndex: seat.z, '--w': seat.w, '--dx': seat.dx, '--dy': seat.dy } as CSSProperties}
              initial={reduce ? false : { opacity: 0, scale: 0.93, rotate: seat.from.r, x: seat.from.x, y: seat.from.y }}
              animate={
                !reduce && !fanIn
                  ? { opacity: 0, scale: 0.93, rotate: seat.from.r, x: seat.from.x, y: seat.from.y }
                  : stacked
                    ? // squared up into a deck: the offsets its seat gives it, cancelled,
                      // and every card scaled to the same width whatever size it is
                      { opacity: 1, x: `${(-seat.dx / seat.w) * 100}%`, y: `${(-seat.dy / seat.w) * 100}%`, rotate: (i - 1.5) * 1.5, scale: 0.98 / seat.w }
                    : { opacity: 1, scale: 1, rotate: seat.tilt, x: 0, y: 0 }
              }
              transition={
                stacked
                  ? { type: 'spring', stiffness: 460, damping: 38 }
                  : { ...spring, delay: reduce || !fanIn ? 0 : 0.05 + i * 0.07 }
              }
            >
              {/* nudgeable: it gives a little under the cursor and springs back */}
              <motion.div
                className="hm-fan-card"
                drag={!reduce}
                dragConstraints={{ left: -16, right: 16, top: -16, bottom: 16 }}
                dragElastic={0.22}
                dragSnapToOrigin
                dragTransition={{ bounceStiffness: 420, bounceDamping: 26 }}
                whileHover={reduce ? undefined : { y: -14, scale: 1.05, rotate: seat.tilt > 0 ? 2 : -2 }}
                whileTap={reduce ? undefined : { scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 340, damping: 24 }}
              >
                <AnimatePresence initial={false}>
                  <motion.img
                    key={FAN[side][i]}
                    src={base() + FAN[side][i]}
                    alt=""
                    draggable={false}
                    initial={reduce ? false : { opacity: 0, scale: 1.07 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: reduce ? 0.01 : 0.14 } }}
                    transition={{ duration: reduce ? 0.01 : 0.2, ease: 'easeOut' }}
                  />
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <h2 className="hm-role">
          {(['engineering', 'art'] as Side[]).map((s2, i) => (
            <Fragment key={s2}>
              {i === 1 && <span className="hm-role-and"> and </span>}
              <span className={`hm-role-word${side === s2 ? ' is-on' : ''}`}>
                {s2 === 'engineering' ? 'Engineer' : 'Artist'}
                {side === s2 && (
                  <motion.span
                    layoutId="hm-role-bar"
                    className="hm-role-bar"
                    transition={reduce ? { duration: 0.01 } : { duration: 0.32, ease: 'linear' }}
                  />
                )}
              </span>
            </Fragment>
          ))}
        </h2>

        {/* no labels: the underline in the line above says which side you are on */}
        <button
          type="button"
          className="hm-switch"
          role="switch"
          aria-checked={side === 'art'}
          aria-label={side === 'art' ? 'Showing art. Switch to engineering.' : 'Showing engineering. Switch to art.'}
          onClick={flip}
        >
          <span className="hm-switch-knob" aria-hidden="true" />
        </button>

        <div className="hm-clients-slot">
          <AnimatePresence initial={false}>
            {side === 'art' && (
              <motion.div
                key="clients"
                className="hm-clients"
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: 80, transition: { duration: 0.3, ease: 'easeIn' } }}
                transition={{ duration: reduce ? 0.01 : 0.5, ease: [0.22, 1, 0.3, 1], delay: reduce ? 0 : 0.12 }}
              >
                <p className="hm-clients-title">Worked with</p>
                <p className="hm-clients-list">{WORKED_WITH.join(', ')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* keyed on the side, so switching remounts and animates in; no exit to wait on,
          which means a stalled animation can never deadlock the swap */}
      <motion.section
        key={side}
        className="hm-work"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.32, ease: 'easeOut' }}
      >
        <h3 className="hm-work-title">Selected work</h3>
        <p className="hm-work-sub">Scroll and stay awhile</p>
        <ul className="hm-grid">
          {side === 'engineering'
            ? ALL_PROJECTS.map((c, i) => (
                /* the square tile, not the wide figure the case study uses */
                <Tile key={c.id} i={i} image={`/tiles/${c.id}.webp`} label={c.title} line={c.tag} onOpen={() => onOpenProject(c)} />
              ))
            : ALL_ART.map((a, i) => (
                <Tile
                  key={a.image}
                  i={i}
                  image={a.image}
                  label={a.caption}
                  onOpen={() => onOpenArt({ image: a.image, caption: a.caption, materials: a.materials })}
                />
              ))}
        </ul>
      </motion.section>

      <footer className="hm-foot">
        <h3 className="hm-work-title">Contact</h3>
        <ul className="hm-contacts">
          {CONTACTS.map((c) => (
            <li key={c.id}>
              <a href={c.href} target={c.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                {c.label}
              </a>
            </li>
          ))}
          <li>
            <a href="#/about">About</a>
          </li>
        </ul>
      </footer>
    </div>
  );
}

'use client';

import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ART, CONTACTS, PROJECT_GROUPS, WORKED_WITH, type ArtItem, type Card } from './content';
import { BrandIcon } from './icons';

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

const other = (s: Side): Side => (s === 'art' ? 'engineering' : 'art');
/**
 * The card sitting on top of the squared-up deck: the one with the highest
 * z, which is not the last in the list. It is the only one you can see while
 * they are stacked, so it is the only one that has to travel — and picking
 * the wrong one means the card you are looking at just swaps its picture.
 */
const TOP = SEATS.reduce((best, seat, i) => (seat.z > SEATS[best].z ? i : best), 0);

const instagram = CONTACTS.find((c) => c.id === 'instagram');
/** The two worth following on the engineering side, shown as marks rather than words. */
const FOLLOW = CONTACTS.filter((c) => c.id === 'linkedin' || c.id === 'github');

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
  id,
  image,
  label,
  line,
  onOpen,
  onPlay,
  playing = false,
}: {
  i: number;
  id: string;
  image?: string;
  label: string;
  line?: string;
  onOpen: () => void;
  /** only Gambit has one: a switch on the card that turns it into a board you can play */
  onPlay?: () => void;
  playing?: boolean;
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
        {/* the same give the cards in the fan have: nudge it and it springs back.
            Only the picture moves — the name under it stays put. */}
        <motion.span
          className="hm-tile-drag"
          drag={!reduce}
          dragConstraints={{ left: -14, right: 14, top: -14, bottom: 14 }}
          dragElastic={0.2}
          dragSnapToOrigin
          dragTransition={{ bounceStiffness: 420, bounceDamping: 26 }}
          transition={{ type: 'spring', stiffness: 340, damping: 24 }}
        >
          <motion.span className="hm-tile" layoutId={`card-${id}`}>
            {image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={base() + image} alt="" loading="lazy" draggable={false} />
            )}
          </motion.span>
        </motion.span>
        {line && (
          <span className="hm-tile-text">
            <span className="hm-tile-name">{label}</span>
            <span className="hm-tile-line">{line}</span>
          </span>
        )}
      </button>
      {onPlay && (
        <button
          type="button"
          role="switch"
          aria-checked={playing}
          aria-label={`Play ${label}`}
          title="Play me"
          className={`hm-tile-play${playing ? ' is-on' : ''}`}
          onClick={onPlay}
          // start fetching the board while the pointer is still on its way
          onPointerEnter={() => void import('./gambit/game')}
          onFocus={() => void import('./gambit/game')}
        >
          <span className="hm-tile-play-knob" aria-hidden="true">
            &#9822;
          </span>
        </button>
      )}
    </motion.li>
  );
}

export function Landing({
  onOpenProject,
  onOpenArt,
  onSide,
  onPlayGambit,
  gambitOn = false,
}: {
  onPlayGambit?: () => void;
  gambitOn?: boolean;
  onOpenProject: (c: Card) => void;
  onOpenArt: (v: { image: string; caption: string; materials?: string[] }) => void;
  onSide: (s: Side) => void;
}) {
  const [side, setSide] = useState<Side>('engineering');
  // mid-shuffle the four cards are squared into one deck; the pictures change
  // underneath while they are stacked, then the deck is dealt back out
  const [stacked, setStacked] = useState(false);
  // the second beat of the shuffle: the top face of each card peels off and
  // tucks in behind the one underneath, which is already the other side
  const [peeling, setPeeling] = useState(false);
  // which cards have passed the top of their arc and gone behind. zIndex is not
  // something motion can animate — it snaps straight to the last value — so the
  // layer swap is driven from here, timed to each card's own apex.
  const [tucked, setTucked] = useState<number[]>([]);
  const shuffleTimers = useRef<number[]>([]);
  const reduce = useReducedMotion();
  // warm the About ribbon's first frame (25 KB) once the page is idle, so it
  // is already there when About fades in instead of popping in after the words
  useEffect(() => {
    const warm = () => { const img = new Image(); img.src = `${base()}/about/ribbon.webp`; };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(warm);
    else setTimeout(warm, 1500);
  }, []);
  const fan = useRef<HTMLDivElement>(null);
  // the cards fly in from off the edges on load and again on the way back up
  const fanIn = useInView(fan, { amount: 0.35 });

  const flip = () => {
    if (stacked) return;
    const next = other(side);
    if (reduce) {
      setSide(next);
      onSide(next);
      return;
    }
    setStacked(true);
    shuffleTimers.current.push(
      window.setTimeout(() => setPeeling(true), 170),
      // past the top of its arc, so the rest of the way down it is behind
      window.setTimeout(() => setTucked([TOP]), 170 + 205),
      // which is also why swapping the faces over here changes nothing you can see
      window.setTimeout(() => {
        setSide(next);
        onSide(next);
        setPeeling(false);
        setTucked([]);
      }, 630),
      window.setTimeout(() => setStacked(false), 670),
    );
  };
  useEffect(() => () => shuffleTimers.current.forEach((t) => window.clearTimeout(t)), []);

  // the fan settles into place once, with a little overshoot, unless motion is unwanted
  const spring = useMemo(
    () => (reduce ? { duration: 0.01 } : { type: 'spring' as const, stiffness: 240, damping: 21, mass: 0.9 }),
    [reduce],
  );

  return (
    <div className="hm">
      <header className="hm-hero">

        {/* the name is the way in to About: it flies up and becomes that page's
            heading, so the two are one element as far as motion is concerned */}
        <h1 className="hm-name">
          <motion.span layoutId="nathan" className="hm-name-text">
            Nathan Ward
          </motion.span>
        </h1>

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
                  ? { type: 'spring', stiffness: 620, damping: 42 }
                  : stacked === false && fanIn
                    ? { type: 'spring', stiffness: 420, damping: 30, delay: reduce ? 0 : i * 0.035 }
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
                {/* the side you are about to see, waiting under this one. While the
                    deck is squared up it sits a corner out, so you can see the deck
                    is two deep; it slides into the top spot as the card above leaves. */}
                <motion.img
                  className="hm-fan-face is-under"
                  src={base() + FAN[other(side)][i]}
                  alt=""
                  draggable={false}
                  animate={stacked && !peeling && !reduce ? { x: '6%', y: '5%', rotate: 3 } : { x: '0%', y: '0%', rotate: 0 }}
                  transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}
                />
                <motion.img
                  className="hm-fan-face is-over"
                  src={base() + FAN[side][i]}
                  alt=""
                  draggable={false}
                  style={{ zIndex: tucked.includes(i) ? 0 : 2 }}
                  animate={
                    peeling && !reduce && i === TOP
                      ? {
                          // out to the side, then back into the deck — but behind
                          // the face below, so it is gone the moment it returns
                          // up and out, then down into the place the other card
                          // just left — the back of the deck
                          x: ['0%', '66%', '6%'],
                          y: ['0%', '-11%', '5%'],
                          rotate: [0, 10, 3],
                          scale: [1, 0.96, 1],
                        }
                      : { x: '0%', y: '0%', rotate: 0, scale: 1 }
                  }
                  transition={
                    peeling && !reduce && i === TOP
                      ? { duration: 0.42, times: [0, 0.48, 1], ease: 'easeInOut' }
                      : { duration: 0 }
                  }
                />
              </motion.div>
            </motion.div>
          ))}
        </div>

        <h2 className="hm-role">
          {(['engineering', 'art'] as Side[]).map((s2, i) => (
            <Fragment key={s2}>
              {i === 1 && <span className="hm-role-and"> and </span>}
              <span className={`hm-role-word${side === s2 ? ' is-on' : ''}`}>
                <span className="hm-role-glyph">{s2 === 'engineering' ? 'Engineer' : 'Artist'}</span>
                {side === s2 && (
                  <motion.span
                    layoutId="hm-role-bar"
                    className="hm-role-bar"
                    transition={reduce ? { duration: 0.01 } : { layout: { duration: 0.26, ease: 'linear' }, duration: 0.26, ease: 'linear' }}
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
          {stacked && !reduce && (
            <motion.span
              className="hm-switch-run"
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.67, ease: 'linear' }}
            />
          )}
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
        <h3 className="hm-work-title">{side === 'engineering' ? 'Selected projects' : 'Selected work'}</h3>
        <p className="hm-work-sub">{side === 'engineering' ? 'A look into my mind' : 'Scroll and stay awhile'}</p>
        <ul className="hm-grid">
          {side === 'engineering'
            ? ALL_PROJECTS.map((c, i) => (
                /* the square tile, not the wide figure the case study uses */
                <Tile
                  key={c.id}
                  i={i}
                  id={c.id}
                  image={`/tiles/${c.id}.webp`}
                  label={c.title}
                  line={c.tag}
                  onOpen={() => onOpenProject(c)}
                  onPlay={c.id === 'gambit' ? onPlayGambit : undefined}
                  playing={c.id === 'gambit' && gambitOn}
                />
              ))
            : ALL_ART.map((a, i) => (
                <Tile
                  key={a.image}
                  i={i}
                  id={a.image}
                  image={a.image}
                  label={a.caption}
                  onOpen={() => onOpenArt({ image: a.image, caption: a.caption, materials: a.materials })}
                />
              ))}
        </ul>
      </motion.section>

      {/* keyed on the side, so it fades in with the half it belongs to */}
      <motion.footer
        key={`foot-${side}`}
        className="hm-foot"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.4, ease: 'easeOut' }}
      >
        {side === 'art' ? (
          <>
            <h3 className="hm-work-title">Want more?</h3>
            <p className="hm-work-sub">Drop a follow</p>
            <ul className="hm-social">
              <li>
                <a href={instagram?.href} target="_blank" rel="noreferrer" aria-label={`Instagram ${instagram?.handle}`}>
                  <BrandIcon id="instagram" size={23} />
                </a>
              </li>
            </ul>
          </>
        ) : (
          <>
            <h3 className="hm-work-title">Keep up with me</h3>
            <p className="hm-work-sub">Drop a follow</p>
            <ul className="hm-social">
              {FOLLOW.map((c) => (
                <li key={c.id}>
                  <a href={c.href} target="_blank" rel="noreferrer" aria-label={c.label}>
                    <BrandIcon id={c.id} size={23} />
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.footer>
    </div>
  );
}

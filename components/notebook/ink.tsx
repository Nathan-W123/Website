'use client';

// Ink helpers for the notebook: text that dries in word by word, strokes that
// draw themselves. Everything renders in its visible resting state on the
// server and only steps back to a hidden state after hydration (and never
// when the reader prefers reduced motion), so nothing is parked at opacity 0
// waiting for JavaScript.

import { Fragment, useRef, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import type { Transition } from 'motion/react';

export type InkState = 'static' | 'hidden' | 'shown';

type MarginValue = `${number}${'px' | '%'}`;
export type InkMargin =
  | MarginValue
  | `${MarginValue} ${MarginValue}`
  | `${MarginValue} ${MarginValue} ${MarginValue}`
  | `${MarginValue} ${MarginValue} ${MarginValue} ${MarginValue}`;

export type InkOptions = {
  /** IntersectionObserver root margin; negative bottom values delay the reveal. */
  margin?: InkMargin;
  /** Reveal once (default) or every time the element enters the viewport. */
  once?: boolean;
  amount?: 'some' | 'all' | number;
};

const subscribeNever = () => () => {};

/** False during SSR and hydration, true once the client has taken over. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/**
 * Resolves the reveal state for an element: `static` (server / reduced
 * motion — draw the resting state, no animation), `hidden` (hydrated, not yet
 * in view) or `shown` (in view — animate to the resting state).
 */
export function useInkState(ref: RefObject<Element | null>, options: InkOptions = {}): InkState {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const inView = useInView(ref, {
    once: options.once ?? true,
    margin: options.margin ?? '0px 0px -12% 0px',
    amount: options.amount ?? 'some',
  });
  if (!hydrated || reduced) return 'static';
  return inView ? 'shown' : 'hidden';
}

const EASE_OUT: Transition['ease'] = [0.22, 0.61, 0.36, 1];
const INSTANT: Transition = { duration: 0 };

const WORD_VISIBLE = { opacity: 1, filter: 'blur(0px)' };
const WORD_HIDDEN = { opacity: 0, filter: 'blur(6px)' };

export type InkWordsProps = {
  text: string;
  className?: string;
  /** Seconds before the first word starts drying. */
  delay?: number;
  /** Seconds between words (design: 40ms). */
  step?: number;
  margin?: InkMargin;
};

/** Word-level ink reveal: each word arrives like ink drying (blur + opacity). */
export function InkWords({ text, className, delay = 0, step = 0.04, margin }: InkWordsProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useInkState(ref, { margin });
  const words = text.split(' ').filter((word) => word.length > 0);
  const target = state === 'hidden' ? WORD_HIDDEN : WORD_VISIBLE;
  return (
    <span ref={ref} className={className ? `ink-words ${className}` : 'ink-words'} data-ink={state}>
      {words.map((word, index) => (
        <Fragment key={`${index}-${word}`}>
          <motion.span
            className="ink-word"
            initial={false}
            animate={target}
            transition={
              state === 'shown'
                ? { duration: 0.55, delay: delay + index * step, ease: EASE_OUT }
                : INSTANT
            }
          >
            {word}
          </motion.span>
          {index < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  );
}

/** A short brush tick, used as the bullet of ink lists. */
export const INK_TICK = 'M2.5 7.5 C 6 8.5, 9.5 4.5, 13 4.2 S 19 5.5, 21.5 4.8';

export type InkPathProps = {
  /** One path or several; several draw in sequence. */
  d: string | string[];
  viewBox?: string;
  className?: string;
  strokeWidth?: number;
  /** Seconds before the first stroke starts. */
  delay?: number;
  /** Seconds per stroke. */
  duration?: number;
  /** Seconds between successive strokes. */
  stagger?: number;
  margin?: InkMargin;
  /** Optional accessible label; the drawing is decorative by default. */
  title?: string;
};

/** SVG strokes that draw themselves (pathLength 0 → 1) when scrolled into view. */
export function InkPath({
  d,
  viewBox = '0 0 24 12',
  className,
  strokeWidth = 1.75,
  delay = 0,
  duration = 0.6,
  stagger = 0.22,
  margin,
  title,
}: InkPathProps) {
  const ref = useRef<SVGSVGElement>(null);
  const state = useInkState(ref, { margin: margin ?? '0px 0px -8% 0px' });
  const paths = Array.isArray(d) ? d : [d];
  const hidden = state === 'hidden';
  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      className={className ? `ink-path ${className}` : 'ink-path'}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
      data-ink={state}
    >
      {title ? <title>{title}</title> : null}
      {paths.map((path, index) => (
        <motion.path
          key={`${index}-${path.length}`}
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: hidden ? 0 : 1, opacity: hidden ? 0 : 1 }}
          transition={
            state === 'shown'
              ? {
                  pathLength: { duration, delay: delay + index * stagger, ease: EASE_OUT },
                  opacity: { duration: 0.01, delay: delay + index * stagger },
                }
              : INSTANT
          }
        />
      ))}
    </svg>
  );
}

/**
 * Hand-drawn underline for links. Purely CSS-driven: the stroke is dashed to
 * its own length and draws on :hover / :focus-visible of the parent link.
 */
export function InkUnderline({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `ink-underline ${className}` : 'ink-underline'}
      viewBox="0 0 140 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 6.5 C 30 3.5, 62 8.5, 92 5.5 S 128 4.5, 138 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={1}
      />
    </svg>
  );
}

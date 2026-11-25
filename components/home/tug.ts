import { animate, type AnimationPlaybackControls } from 'motion/react';
import type { MouseEvent, PointerEvent } from 'react';

/**
 * A picture you can tug: the About's chips and the pictures in their fans
 * (peek.tsx), and Art's pictures. Pressed and held with a mouse, it follows
 * the pointer like the end of a rubber band: readily at first, then giving
 * less and less the further it is pulled, so it slows to a stop rather than
 * hitting one (it never gets past REACH px). It tilts and lifts with the
 * pull, and springs back when let go. Grabbed again on its way back, it
 * carries on from where it is. It moves by the CSS translate, rotate and
 * scale properties, which add to whatever transform it already has (its
 * lift under the pointer, its place in a fan). A press that tugged is not
 * also a click, so a tug does not open the picture. Only a mouse: on a phone
 * a finger on a picture still scrolls the page; and nothing with reduced
 * motion.
 *
 * Spread `tug` on the element: `<button {...tug}>`. One pointer tugs at a
 * time, so the state is shared.
 */
/** the furthest it can go, approached ever more slowly and never reached */
const REACH = 40;
/** how much of the pointer's way it follows at first */
const GIVE = 0.8;
/** how far it has gone for how far the pointer has, along the same line: its
 *  give halves by 20 px of pull and keeps falling (22 px at 60, 28 at 120) */
const band = (r: number) => (GIVE * r) / (1 + (GIVE * r) / REACH);
/** the pull that holds it where it is */
const unband = (f: number) => (f * REACH) / (GIVE * Math.max(REACH - f, 0.5));
/** a press that moves this far is a tug, not a click */
const SLOP = 4;
/** the spring it comes back on: unhurried, settling with only a breath past
 *  the middle */
const BACK = { type: 'spring' as const, stiffness: 300, damping: 26, mass: 1 };

let tugged = false;
const springs = new WeakMap<HTMLElement, AnimationPlaybackControls>();
const offsets = new WeakMap<HTMLElement, { x: number; y: number }>();

const place = (el: HTMLElement, x: number, y: number) => {
  offsets.set(el, { x, y });
  el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  el.style.rotate = `${((x / REACH) * 3).toFixed(2)}deg`;
  el.style.scale = `${(1 + 0.025 * Math.min(1, Math.hypot(x, y) / REACH)).toFixed(4)}`;
};
const rest = (el: HTMLElement) => {
  offsets.delete(el);
  el.style.translate = '';
  el.style.rotate = '';
  el.style.scale = '';
};

function onPointerDown(e: PointerEvent<HTMLElement>) {
  tugged = false;
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = e.currentTarget;
  const id = e.pointerId;
  const x0 = e.clientX;
  const y0 = e.clientY;
  // caught on its way back: held where it is, as if by the pull that would
  // put it there, so the next move carries on from it without a jump
  springs.get(el)?.stop();
  let { x, y } = offsets.get(el) ?? { x: 0, y: 0 };
  const m = Math.hypot(x, y);
  const held = m ? unband(m) / m : 0;
  const vx = x * held;
  const vy = y * held;
  const move = (ev: globalThis.PointerEvent) => {
    if (ev.pointerId !== id) return;
    const dx = ev.clientX - x0;
    const dy = ev.clientY - y0;
    if (!tugged && Math.hypot(dx, dy) >= SLOP) {
      tugged = true;
      el.classList.add('is-tugged');
      // held from here, so the pointer leaving it (a fan's edge, say) does not
      // count as leaving; only now, so a plain click still lands where it was
      // pressed and opens the picture
      try {
        el.setPointerCapture(id);
      } catch {}
    }
    const tx = vx + dx;
    const ty = vy + dy;
    const r = Math.hypot(tx, ty);
    const k = r ? band(r) / r : 0;
    x = tx * k;
    y = ty * k;
    place(el, x, y);
  };
  const up = (ev: globalThis.PointerEvent) => {
    if (ev.pointerId !== id) return;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (tugged) {
      // the click this release makes (if any) comes in this same turn; after
      // it, a tug that ended off the picture made none, and must not swallow
      // the next one (a key press on a focused chip, say)
      window.setTimeout(() => {
        tugged = false;
      }, 0);
      el.classList.remove('is-tugged');
    }
    if (!x && !y) return rest(el);
    const fx = x;
    const fy = y;
    springs.set(
      el,
      animate(1, 0, {
        ...BACK,
        onUpdate: (t) => place(el, fx * t, fy * t),
        onComplete: () => rest(el),
      }),
    );
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

/** the click that ends a tug: kept from the element and whatever is in it */
function onClickCapture(e: MouseEvent<HTMLElement>) {
  if (!tugged) return;
  tugged = false;
  e.preventDefault();
  e.stopPropagation();
}

export const tug = { onPointerDown, onClickCapture };

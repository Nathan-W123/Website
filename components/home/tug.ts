import { animate, type AnimationPlaybackControls } from 'motion/react';
import type { MouseEvent, PointerEvent } from 'react';

/**
 * A picture you can tug: the About's chips and the pictures in their fans
 * (peek.tsx), and Art's pictures. Pressed and held with a mouse, it follows
 * the pointer a little way, against a pull that grows the further it goes
 * (never more than MAX px), tilting and lifting a touch, and springs back
 * when let go. It moves by the CSS translate, rotate and scale properties,
 * which add to whatever transform it already has (its lift under the
 * pointer, its place in a fan). A press that tugged is not also a click, so
 * a tug does not open the picture. Only a mouse: on a phone a finger on a
 * picture still scrolls the page; and nothing with reduced motion.
 *
 * Spread `tug` on the element: `<button {...tug}>`. One pointer tugs at a
 * time, so the state is shared.
 */
const MAX = 28;
/** how far it has gone for how far the pointer has: about 0.6 of the way at
 *  first, then less and less, up to MAX */
const pull = (d: number) => MAX * Math.tanh(d / (1.6 * MAX));
/** the spring it comes back on, a little past and back */
const BACK = { type: 'spring' as const, stiffness: 520, damping: 17, mass: 0.9 };

let tugged = false;
const springs = new WeakMap<HTMLElement, AnimationPlaybackControls>();

const place = (el: HTMLElement, x: number, y: number, lift: number) => {
  el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  el.style.rotate = `${(x * 0.1).toFixed(2)}deg`;
  el.style.scale = `${(1 + 0.03 * lift).toFixed(4)}`;
};

function onPointerDown(e: PointerEvent<HTMLElement>) {
  tugged = false;
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = e.currentTarget;
  const id = e.pointerId;
  const x0 = e.clientX;
  const y0 = e.clientY;
  let x = 0;
  let y = 0;
  const move = (ev: globalThis.PointerEvent) => {
    if (ev.pointerId !== id) return;
    const dx = ev.clientX - x0;
    const dy = ev.clientY - y0;
    if (!tugged) {
      if (Math.hypot(dx, dy) < 4) return;
      tugged = true;
      springs.get(el)?.stop();
      el.classList.add('is-tugged');
      // held from here, so the pointer leaving it (a fan's edge, say) does not
      // count as leaving; only now, so a plain click still lands where it was
      // pressed and opens the picture
      try {
        el.setPointerCapture(id);
      } catch {}
    }
    x = pull(dx);
    y = pull(dy);
    place(el, x, y, 1);
  };
  const up = (ev: globalThis.PointerEvent) => {
    if (ev.pointerId !== id) return;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (!tugged) return;
    // the click this release makes (if any) comes in this same turn; after
    // it, a tug that ended off the picture made none, and must not swallow
    // the next one (a key press on a focused chip, say)
    window.setTimeout(() => {
      tugged = false;
    }, 0);
    el.classList.remove('is-tugged');
    const fx = x;
    const fy = y;
    springs.set(
      el,
      animate(1, 0, {
        ...BACK,
        onUpdate: (t) => place(el, fx * t, fy * t, Math.max(0, t)),
        onComplete: () => {
          el.style.translate = '';
          el.style.rotate = '';
          el.style.scale = '';
        },
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

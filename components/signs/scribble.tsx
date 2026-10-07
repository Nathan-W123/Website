'use client';

import { useEffect, useRef } from 'react';

/**
 * Lets a visitor doodle on the paper. A canvas sits under the page content;
 * pressing on bare paper (not on a photo, note, link or button) and dragging
 * draws a pencil line. A stroke holds for a moment and then fades away, the
 * way a pencil line would if the paper were slowly forgetting it, so the page
 * never silts up with other people's scribbles. Nothing is saved either: a
 * reload gives a clean sheet.
 *
 * Mouse or pen only: hold the button and drag. A finger keeps scrolling.
 */

type Pt = { x: number; y: number };
/** A finished stroke starts fading `HOLD` ms after the pen lifts, over `FADE` ms. */
type Stroke = { pts: Pt[]; done: number | null };

const HOLD = 2200;
const FADE = 7000;
const INK = '45, 45, 45';
const MAX_ALPHA = 0.9;

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], .sg-lightbox, .sg-project, .hg, .nb-note, .ld-photo, .ld-sticky, .ld-tapelink, .ld-bench-item, .ch-sign, .sg-card, .sg-pv, .ab-photo, .ab-based, .nb-card, .sg-materials';

export function Scribble() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const page = canvas?.parentElement;
    if (!canvas || !page) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mid = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

    /** How much of a stroke is still there: 1 while held, easing to 0 across the fade. */
    const alphaOf = (s: Stroke, now: number) => {
      if (s.done === null) return 1;
      const age = now - s.done;
      if (age <= HOLD) return 1;
      const t = (age - HOLD) / FADE;
      return t >= 1 ? 0 : (1 - t) * (1 - t); // ease out, so it lingers then goes
    };

    /** One stroke, midpoint to midpoint so the quadratics join smoothly. */
    const trace = (pts: Pt[], alpha: number) => {
      if (pts.length < 2 || alpha <= 0) return;
      ctx.strokeStyle = `rgba(${INK}, ${MAX_ALPHA * alpha})`;
      ctx.beginPath();
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], cur = pts[i];
        const start = i === 1 ? prev : mid(pts[i - 2], prev);
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(prev.x, prev.y, mid(prev, cur).x, mid(prev, cur).y);
      }
      ctx.stroke();
    };

    // Everything is redrawn each frame while anything is still on the page, because
    // every stroke's alpha is changing; the loop stops itself once the sheet is clean.
    let raf = 0;
    const frame = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.4;
      let alive = 0;
      for (const s of strokes.current) {
        const a = alphaOf(s, now);
        if (a > 0) {
          trace(s.pts, a);
          alive++;
        }
      }
      if (alive === 0) {
        strokes.current = [];
        raf = 0;
        return;
      }
      strokes.current = strokes.current.filter((s) => alphaOf(s, now) > 0);
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const fit = () => {
      const w = page.clientWidth, h = Math.max(page.scrollHeight, page.clientHeight);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.height = `${h}px`;
        if (strokes.current.length) run();
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(page);

    let current: Stroke | null = null;
    const at = (e: PointerEvent): Pt => {
      const r = page.getBoundingClientRect();
      return { x: e.clientX - r.left + page.scrollLeft, y: e.clientY - r.top + page.scrollTop };
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (e.pointerType === 'touch') return;
      const t = e.target as Element | null;
      if (!t || t.closest(INTERACTIVE)) return;
      fit();
      current = { pts: [at(e)], done: null };
      strokes.current.push(current);
      e.preventDefault();
      run();
      // last, and guarded: capture throws if the pointer is already gone, and
      // losing it only costs us the drag outside the page, not the stroke
      try {
        page.setPointerCapture?.(e.pointerId);
      } catch {
        /* no capture; pointermove on the page still tracks the stroke */
      }
    };
    const move = (e: PointerEvent) => {
      if (!current) return;
      const p = at(e);
      const last = current.pts[current.pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
      current.pts.push(p);
    };
    const up = () => {
      if (current) current.done = performance.now();
      current = null;
    };
    page.addEventListener('pointerdown', down);
    page.addEventListener('pointermove', move);
    page.addEventListener('pointerup', up);
    page.addEventListener('pointercancel', up);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      page.removeEventListener('pointerdown', down);
      page.removeEventListener('pointermove', move);
      page.removeEventListener('pointerup', up);
      page.removeEventListener('pointercancel', up);
    };
  }, []);

  return <canvas ref={canvasRef} className="sg-scribble" aria-hidden="true" />;
}

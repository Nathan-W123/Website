'use client';

import { useEffect, useRef } from 'react';

/**
 * Lets a visitor doodle on the paper. A canvas sits under the page content;
 * pressing on bare paper (not on a photo, note, link or button) and dragging
 * draws a pencil line. Nothing is saved: a reload gives a clean sheet.
 *
 * Mouse or pen only: hold the button and drag. A finger keeps scrolling.
 */

type Pt = { x: number; y: number };
const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], .sg-lightbox, .sg-project, .hg, .nb-note, .ld-photo, .ld-sticky, .ld-tapelink, .ld-bench-item, .ch-sign, .sg-card, .sg-pv, .ab-photo, .ab-based, .nb-card, .sg-materials';

export function Scribble() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const page = canvas?.parentElement;
    if (!canvas || !page) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mid = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    /** Draws the stroke from point index  on; segments run midpoint to midpoint so incremental calls join seamlessly. */
    const paint = (pts: Pt[], from = 1) => {
      if (pts.length < 2) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(45, 45, 45, 0.9)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = Math.max(from, 1); i < pts.length; i++) {
        const prev = pts[i - 1], cur = pts[i];
        const start = i === 1 ? prev : mid(pts[i - 2], prev);
        ctx.moveTo(start.x, start.y);
        const end = mid(prev, cur);
        ctx.quadraticCurveTo(prev.x, prev.y, end.x, end.y);
      }
      ctx.stroke();
    };
    const fit = () => {
      const w = page.clientWidth, h = Math.max(page.scrollHeight, page.clientHeight);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.height = `${h}px`;
        for (const s of strokes.current) paint(s);
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(page);

    let current: Pt[] | null = null;
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
      current = [at(e)];
      strokes.current.push(current);
      e.preventDefault();
      page.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!current) return;
      const p = at(e);
      const last = current[current.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
      current.push(p);
      paint(current, current.length - 1);
    };
    const up = () => {
      current = null;
    };
    page.addEventListener('pointerdown', down);
    page.addEventListener('pointermove', move);
    page.addEventListener('pointerup', up);
    page.addEventListener('pointercancel', up);
    return () => {
      ro.disconnect();
      page.removeEventListener('pointerdown', down);
      page.removeEventListener('pointermove', move);
      page.removeEventListener('pointerup', up);
      page.removeEventListener('pointercancel', up);
    };
  }, []);

  return <canvas ref={canvasRef} className="sg-scribble" aria-hidden="true" />;
}

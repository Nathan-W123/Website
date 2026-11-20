'use client';

import dynamic from 'next/dynamic';
import { Shell } from './chrome';

/**
 * Chess, after the reference's game page: a title, a line or two on what this
 * is and how to play, and the game. The game is Gambit, Nathan's bot, the
 * same network and search it plays Lichess with, running in the visitor's
 * browser (components/signs/gambit). The board only exists in the browser, so
 * the page shows a faint board in its place until it is ready.
 */
const GambitBoard = dynamic(() => import('@/components/signs/gambit/board').then((m) => m.GambitBoard), {
  ssr: false,
  loading: () => <div className="nw-chess-wait" aria-hidden="true" />,
});

export function ChessPage() {
  return (
    <Shell page="chess" banner={false}>
      <section className="nw-col nw-section nw-chess" aria-labelledby="nw-chess">
        <h1 id="nw-chess">Chess</h1>
        <p>Take a break and play Gambit, the chess bot I built.</p>
        <div className="nw-chess-board">
          <GambitBoard />
        </div>
      </section>
    </Shell>
  );
}

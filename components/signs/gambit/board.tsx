'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import { Chess, SearchEngine, epAfter, keyOf, type Evaluate } from './engine';
import { loadGambit } from './net';

/**
 * The easter egg: Gambit's project page opens on a live board instead of a
 * picture, and it is the real bot — the same network and the same search it
 * plays Lichess with, ported move for move and running in the visitor's
 * browser. Nothing is sent anywhere.
 *
 * On Lichess the bot reaches depth 3 in ~600 ms of native CPU. Single-threaded
 * WebAssembly needs 1.3-2.0 s for that depth on a laptop (measured), so here it
 * gets 2.8 s: the same depth as the real bot on a decent machine, and on a
 * slower one it still answers in time, a ply shallower.
 */
const THINK_MS = 2800;

type Phase = 'yours' | 'thinking' | 'over';

const INK = 'rgba(54, 54, 54, ';
const DOT: CSSProperties = { background: `radial-gradient(circle, ${INK}0.3) 18%, transparent 20%)` };
const RING: CSSProperties = { background: `radial-gradient(circle, transparent 56%, ${INK}0.3) 58%, ${INK}0.3) 66%, transparent 68%)` };
const CHECK: CSSProperties = { background: 'radial-gradient(circle, rgba(196, 74, 60, 0.6) 0%, rgba(196, 74, 60, 0.22) 52%, transparent 74%)' };

const isPromotion = (g: Chess, from: string, to: string) => g.get(from as Square)?.type === 'p' && (to[1] === '8' || to[1] === '1');

function verdict(g: Chess, you: 'w' | 'b'): string {
  if (g.isCheckmate()) return g.turn() === you ? 'Checkmate. Gambit wins.' : 'Checkmate. You beat Gambit.';
  if (g.isStalemate()) return 'Stalemate. A draw.';
  if (g.isThreefoldRepetition()) return 'Draw by repetition.';
  if (g.isInsufficientMaterial()) return 'Draw: not enough material left to mate.';
  return 'Draw by the fifty-move rule.';
}

export function GambitBoard() {
  const reduce = useReducedMotion();
  const game = useRef(new Chess());
  const ep = useRef<string | null>(null); // python-chess's raw en-passant square, which the net was trained on
  const keys = useRef<string[]>([]); // every earlier position in the game, for repetition
  const net = useRef<Promise<Evaluate> | null>(null);
  const engine = useRef<SearchEngine | null>(null);
  const round = useRef(0); // a search from an abandoned game must not land in the new one

  const [fen, setFen] = useState(() => game.current.fen());
  const [you, setYou] = useState<'w' | 'b'>('w');
  const [phase, setPhase] = useState<Phase>('yours');
  const [started, setStarted] = useState(false); // the invitation stays until the first move
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  const expandRef = useRef<HTMLButtonElement>(null);
  const shrinkRef = useRef<HTMLButtonElement>(null);
  const wasBig = useRef(false);

  // Esc shrinks the big board before the project page gets to close itself:
  // this listens in the capture phase and stops the key going any further
  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setBig(false);
    };
    window.addEventListener('keydown', onKey, true);
    shrinkRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey, true);
  }, [big]);
  useEffect(() => {
    if (wasBig.current && !big) expandRef.current?.focus({ preventScroll: true });
    wasBig.current = big;
  }, [big]);

  useEffect(() => {
    let live = true;
    net.current = loadGambit((f) => live && setProgress(f));
    net.current.then(
      (evaluate) => {
        if (!live) return;
        engine.current = new SearchEngine(evaluate);
        setReady(true);
      },
      (e: unknown) => live && setFailed(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
      round.current += 1; // leaving the page abandons any search in flight
    };
  }, []);

  const play = useCallback((from: string, to: string, promotion?: string) => {
    const g = game.current;
    const before = keyOf(g);
    try {
      const m = g.move({ from, to, promotion: promotion ?? (isPromotion(g, from, to) ? 'q' : undefined) });
      keys.current.push(before);
      ep.current = epAfter(m);
      setFen(g.fen());
      setLast([m.from, m.to]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const reply = useCallback(async () => {
    const g = game.current;
    if (g.isGameOver()) return setPhase('over');
    const r0 = round.current;
    setPhase('thinking');
    if (!engine.current) {
      try {
        await net.current;
      } catch {
        return; // the failure is already on screen
      }
    }
    if (r0 !== round.current || !engine.current) return;
    const result = await engine.current.search(g.fen(), ep.current, [...keys.current], THINK_MS);
    if (r0 !== round.current) return;
    play(result.move.slice(0, 2), result.move.slice(2, 4), result.move[4]);
    setPhase(game.current.isGameOver() ? 'over' : 'yours');
  }, [play]);

  const fresh = useCallback(
    (side: 'w' | 'b') => {
      round.current += 1;
      game.current = new Chess();
      ep.current = null;
      keys.current = [];
      setFen(game.current.fen());
      setLast(null);
      setSelected(null);
      setYou(side);
      setStarted(true);
      setPhase('yours');
      if (side === 'b') void reply();
    },
    [reply],
  );

  const yourTurn = phase === 'yours' && game.current.turn() === you;

  const move = useCallback(
    (from: string, to: string) => {
      if (!yourTurn || !play(from, to)) return false;
      setSelected(null);
      setStarted(true);
      void reply();
      return true;
    },
    [yourTurn, play, reply],
  );

  const onSquareClick = useCallback(
    ({ square, piece }: { square: string; piece: { pieceType: string } | null }) => {
      if (!yourTurn) return;
      if (selected && selected !== square && move(selected, square)) return;
      const pick = piece && piece.pieceType[0] === you && selected !== square ? square : null;
      if (pick) setStarted(true); // the invitation goes the moment you touch a piece
      setSelected(pick);
    },
    [yourTurn, selected, move, you],
  );

  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {};
    const g = game.current;
    if (last) for (const sq of last) s[sq] = { backgroundColor: `${INK}0.11)` };
    if (selected) {
      s[selected] = { backgroundColor: `${INK}0.2)` };
      for (const m of g.moves({ square: selected as Square, verbose: true })) s[m.to] = { ...s[m.to], ...(m.captured ? RING : DOT) };
    }
    if (g.inCheck()) {
      const king = g.findPiece({ type: 'k', color: g.turn() })[0];
      if (king) s[king] = { ...s[king], ...CHECK };
    }
    return s;
    // fen stands for the board, which lives in a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, last, selected]);

  const status = failed
    ? `Gambit could not load (${failed}).`
    : phase === 'over'
      ? verdict(game.current, you)
      : phase === 'thinking'
        ? 'Gambit is thinking.'
        : 'Your move.';
  const pill = { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18 } } };

  /** The board on its own: inline in the frame, or in the big view. Same game either way. */
  const layout = (isBig: boolean) => (
    <div className={`gbp${isBig ? ' is-big' : ''}`}>
      <div className="gbp-board">
        <Chessboard
          options={{
            // two ids, because the big view fades out while the inline board is already back
            id: isBig ? 'gambit-big' : 'gambit',
            position: fen,
            boardOrientation: you === 'w' ? 'white' : 'black',
            onPieceDrop: ({ sourceSquare, targetSquare }) => !!targetSquare && move(sourceSquare, targetSquare),
            onSquareClick,
            onPieceDrag: () => setStarted(true),
            canDragPiece: ({ piece }) => yourTurn && piece.pieceType[0] === you,
            squareStyles,
            lightSquareStyle: { backgroundColor: '#efebe2' },
            darkSquareStyle: { backgroundColor: '#bfb8aa' },
            lightSquareNotationStyle: { color: '#8f887b', fontFamily: 'var(--body)', fontSize: 10, fontWeight: 600 },
            darkSquareNotationStyle: { color: '#f3f0e8', fontFamily: 'var(--body)', fontSize: 10, fontWeight: 600 },
            animationDurationInMs: reduce ? 0 : 220,
            allowDrawingArrows: true,
            boardStyle: { borderRadius: 8, overflow: 'hidden' },
          }}
        />

        {/* the middle of the board: "Your move" until you touch a piece (it is
            gone before a move dot can appear under it), and the result, which
            starts another game, once one ends */}
        <AnimatePresence>
          {!started && !failed && (
            <motion.div
              key="invite"
              className="gbp-invite"
              aria-hidden="true"
              {...pill}
              transition={{ delay: reduce ? 0 : 0.35, duration: reduce ? 0.01 : 0.4, ease: [0.22, 1, 0.3, 1] }}
            >
              <span className="gbp-invite-pill">
                <span className="gbp-invite-dot" />
                Your move
              </span>
            </motion.div>
          )}
          {(phase === 'over' || failed) && (
            <motion.div key="end" className="gbp-invite" {...pill} transition={{ duration: reduce ? 0.01 : 0.35, ease: [0.22, 1, 0.3, 1] }}>
              {failed ? (
                <span className="gbp-invite-pill">Gambit could not load</span>
              ) : (
                <button type="button" className="gbp-invite-pill is-end" onClick={() => fresh(you)}>
                  {verdict(game.current, you)}
                  <span className="gbp-again">Play again</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!ready && !failed && (
          <span className="gbp-loading" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </span>
        )}
      </div>

      {/* Gambit thinking, without words: three dots under the board */}
      <AnimatePresence>
        {phase === 'thinking' && (
          <motion.span key="thinking" className="gbp-thinking" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <i />
            <i />
            <i />
          </motion.span>
        )}
      </AnimatePresence>

      {!isBig && (
        <button ref={expandRef} type="button" className="gbp-expand" onClick={() => setBig(true)} aria-label="Expand the board" title="Expand">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      )}
      <span className="gbp-sr" aria-live="polite">
        {status}
      </span>
    </div>
  );

  // the big view goes into the site's root, so it keeps the site's type, and
  // sits over the project page; the game itself never leaves this component
  const host = typeof document !== 'undefined' ? ((document.querySelector('.sg-root') as HTMLElement | null) ?? document.body) : null;
  return (
    <>
      {!big && layout(false)}
      {host &&
        createPortal(
          <AnimatePresence>
            {big && (
              <motion.div
                key="big"
                className="gbp-scrim"
                role="dialog"
                aria-modal="true"
                aria-label="Gambit, expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.16 } }}
                onClick={(e) => e.target === e.currentTarget && setBig(false)}
              >
                <button ref={shrinkRef} type="button" className="gbp-shrink" onClick={() => setBig(false)} aria-label="Shrink the board" title="Shrink">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
                  </svg>
                </button>
                <motion.div
                  className="gbp-bigwrap"
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: reduce ? 0.01 : 0.28, ease: [0.22, 1, 0.3, 1] }}
                >
                  {layout(true)}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          host,
        )}
    </>
  );
}

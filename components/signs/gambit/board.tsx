'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import { Chess, MATE_SCORE, MATE_THRESHOLD, SearchEngine, epAfter, keyOf, type Evaluate, type SearchResult } from './engine';
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

/** What the bot made of the position, in words a player would use. */
function readout(r: SearchResult): string {
  const depth = `Looked ${r.depth} ${r.depth === 1 ? 'move' : 'moves'} deep, ${r.evaluations} positions.`;
  if (Math.abs(r.score) >= MATE_THRESHOLD) {
    const n = Math.ceil((MATE_SCORE - Math.abs(r.score)) / 2);
    return `${depth} ${r.score > 0 ? `Sees mate in ${n}.` : `Sees itself mated in ${n}.`}`;
  }
  const v = Math.max(-1, Math.min(1, r.score));
  return `${depth} Thinks it is ${v > 0.15 ? 'better' : v < -0.15 ? 'worse' : 'about level'} (${v >= 0 ? '+' : ''}${v.toFixed(2)}).`;
}

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
  const [thought, setThought] = useState<SearchResult | null>(null);

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
    setThought(result);
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
      setThought(null);
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
      setSelected(piece && piece.pieceType[0] === you && selected !== square ? square : null);
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

  const pct = `${Math.round(progress * 100)}%`;
  const status = failed
    ? `Gambit could not load (${failed}).`
    : phase === 'over'
      ? verdict(game.current, you)
      : phase === 'thinking'
        ? ready
          ? 'Gambit is thinking…'
          : `Waking Gambit up… ${pct}`
        : 'Your move.';

  return (
    <div className="gbp">
      <div className="gbp-board">
        <Chessboard
          options={{
            id: 'gambit',
            position: fen,
            boardOrientation: you === 'w' ? 'white' : 'black',
            onPieceDrop: ({ sourceSquare, targetSquare }) => !!targetSquare && move(sourceSquare, targetSquare),
            onSquareClick,
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

        {/* the invitation: sits on the empty middle of the board until you move */}
        <AnimatePresence>
          {!started && (
            <motion.div
              className="gbp-invite"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
              transition={{ delay: reduce ? 0 : 0.35, duration: reduce ? 0.01 : 0.4, ease: [0.22, 1, 0.3, 1] }}
            >
              <span className="gbp-invite-pill">
                <span className="gbp-invite-dot" />
                Your move
              </span>
              <span className="gbp-invite-sub">Tap a piece to play the bot</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!ready && !failed && (
          <span className="gbp-loading" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </span>
        )}
      </div>

      <div className="gbp-side">
        <p className="gbp-kicker">Play it</p>
        <p className={`gbp-status${phase === 'over' ? ' is-over' : ''}`} aria-live="polite">
          {status}
        </p>
        <p className="gbp-thought">
          {thought && phase !== 'over'
            ? readout(thought)
            : !ready && !failed
              ? `The network is loading in your browser (${pct}). You can move already.`
              : 'The real bot, running in your browser: the network and the search it plays Lichess with.'}
        </p>
        <div className="gbp-actions">
          <button type="button" className="gbp-btn" onClick={() => fresh(you)}>
            New game
          </button>
          <button type="button" className="gbp-btn" onClick={() => fresh(you === 'w' ? 'b' : 'w')}>
            Play {you === 'w' ? 'Black' : 'White'}
          </button>
        </div>
      </div>
    </div>
  );
}

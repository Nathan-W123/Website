'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import { Chess, MATE_SCORE, MATE_THRESHOLD, SearchEngine, epAfter, keyOf, type Evaluate, type SearchResult } from './engine';
import { loadGambit } from './net';

/**
 * The easter egg: play Gambit itself. The same network and the same search
 * the bot plays Lichess with, ported move for move and running in the
 * visitor's browser — nothing is sent anywhere.
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
  const depth = `looked ${r.depth} ${r.depth === 1 ? 'move' : 'moves'} deep, ${r.evaluations} positions`;
  if (Math.abs(r.score) >= MATE_THRESHOLD) {
    const n = Math.ceil((MATE_SCORE - Math.abs(r.score)) / 2);
    return `${depth} · ${r.score > 0 ? `sees mate in ${n}` : `sees itself mated in ${n}`}`;
  }
  const v = Math.max(-1, Math.min(1, r.score));
  return `${depth} · thinks it is ${v > 0.15 ? 'better' : v < -0.15 ? 'worse' : 'about level'} (${v >= 0 ? '+' : ''}${v.toFixed(2)})`;
}

function verdict(g: Chess, you: 'w' | 'b'): string {
  if (g.isCheckmate()) return g.turn() === you ? 'Checkmate. Gambit wins.' : 'Checkmate. You beat Gambit.';
  if (g.isStalemate()) return 'Stalemate. A draw.';
  if (g.isThreefoldRepetition()) return 'Draw by repetition.';
  if (g.isInsufficientMaterial()) return 'Draw: not enough material left to mate.';
  return 'Draw by the fifty-move rule.';
}

export function GambitGame({ onClose }: { onClose: () => void }) {
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

  const status = failed
    ? `Gambit could not load (${failed}).`
    : phase === 'over'
      ? verdict(game.current, you)
      : phase === 'thinking'
        ? ready
          ? 'Gambit is thinking…'
          : `Waking Gambit up… ${Math.round(progress * 100)}%`
        : !ready
          ? `Your move. Gambit is still waking up (${Math.round(progress * 100)}%).`
          : 'Your move.';

  return (
    <motion.div
      className="gb-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: reduce ? 0.01 : 0.25 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="gb-sheet" role="dialog" aria-modal="true" aria-label="Play Gambit">
        <motion.div className="gb-board" layoutId="card-gambit" transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
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
              lightSquareNotationStyle: { color: '#8f887b', fontFamily: 'var(--body)', fontSize: 11, fontWeight: 600 },
              darkSquareNotationStyle: { color: '#f3f0e8', fontFamily: 'var(--body)', fontSize: 11, fontWeight: 600 },
              animationDurationInMs: reduce ? 0 : 220,
              allowDrawingArrows: true,
              boardStyle: { borderRadius: 12, overflow: 'hidden' },
            }}
          />
          {!ready && !failed && (
            <span className="gb-loading" aria-hidden="true">
              <span style={{ transform: `scaleX(${progress})` }} />
            </span>
          )}
        </motion.div>

        <div className="gb-side">
          <h2 className="gb-title">Gambit</h2>
          <p className="gb-line">
            The real bot, running in your browser: the same 2M-parameter network and alpha-beta search that play on Lichess.
          </p>
          <p className={`gb-status${phase === 'over' ? ' is-over' : ''}`} aria-live="polite">
            {status}
          </p>
          {thought && phase !== 'over' && <p className="gb-thought">Last move it {readout(thought)}.</p>}
          <div className="gb-actions">
            <button type="button" className="gb-btn" onClick={() => fresh(you)}>
              New game
            </button>
            <button type="button" className="gb-btn" onClick={() => fresh(you === 'w' ? 'b' : 'w')}>
              Play {you === 'w' ? 'Black' : 'White'}
            </button>
          </div>
          <a className="gb-link" href="https://github.com/Nathan-W123/Gambit" target="_blank" rel="noreferrer">
            How it works ↗
          </a>
        </div>

        <button type="button" className="gb-close" onClick={onClose} aria-label="Close the board">
          ×
        </button>
      </div>
    </motion.div>
  );
}

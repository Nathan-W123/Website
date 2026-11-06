/**
 * Gambit, in the browser: a straight port of the bot's own encoding and search
 * (github.com/Nathan-W123/Gambit, src/chessml/encoding.py and search.py).
 *
 * The network itself is not here. It arrives as an `Evaluate` function, so the
 * same code runs on onnxruntime-web in the page and on anything else in a test.
 * chess.js stands in for python-chess: move generation, legality, game end.
 *
 * Kept to erasable TypeScript with a single package import, so Node can run
 * it as-is against the Python reference answers.
 */
import { Chess, type Move } from 'chess.js';

export const INPUT_PLANES = 18;
export const POLICY_SIZE = 64 * 73;

/** One forward pass over `n` positions packed as (n, 18, 8, 8) float32. */
export type Evaluate = (inputs: Float32Array, n: number) => Promise<{ logits: Float32Array; values: Float32Array }>;

// ---------------------------------------------------------------- encoding

const PIECE_ORDER = ['p', 'n', 'b', 'r', 'q', 'k'];
// (delta_file, delta_rank) in the AlphaZero order N NE E SE S SW W NW
const QUEEN_DIRS: [number, number][] = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
const KNIGHT_DIRS: [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const UNDERPROMO = ['n', 'b', 'r'];

/** python-chess square numbering: a1 = 0, h1 = 7, a8 = 56. */
const sqIndex = (s: string) => (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);

/**
 * Policy index of a move, from the mover's point of view: plane * 64 + from,
 * with the board mirrored when Black is to move. Queen promotions are plain
 * ray moves; only under-promotions get their own planes.
 */
export function moveIndex(from: string, to: string, promotion: string | undefined, turn: 'w' | 'b'): number {
  let f = sqIndex(from);
  let t = sqIndex(to);
  if (turn === 'b') {
    f ^= 56;
    t ^= 56;
  }
  const df = (t & 7) - (f & 7);
  const dr = (t >> 3) - (f >> 3);
  let plane: number;
  if (promotion && promotion !== 'q') {
    plane = 64 + (df + 1) * 3 + UNDERPROMO.indexOf(promotion);
  } else {
    const k = KNIGHT_DIRS.findIndex(([x, y]) => x === df && y === dr);
    if (k >= 0) plane = 56 + k;
    else {
      const dist = Math.max(Math.abs(df), Math.abs(dr));
      const d = QUEEN_DIRS.findIndex(([x, y]) => x === Math.sign(df) && y === Math.sign(dr));
      plane = d * 7 + (dist - 1);
    }
  }
  return plane * 64 + f;
}

/**
 * The 18 input planes for the side to move, written into `out` at `offset`.
 * `ep` is python-chess's raw en-passant square: set after every double pawn
 * push whether or not a capture is possible, which is what the net was
 * trained on (a FEN only carries it when a capture is legal).
 */
export function encode(c: Chess, ep: string | null, out: Float32Array, offset = 0): void {
  out.fill(0, offset, offset + INPUT_PLANES * 64);
  const turn = c.turn();
  const flip = turn === 'b';
  const rows = c.board(); // rows[0] is rank 8
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = rows[r][f];
      if (!p) continue;
      let rank = 7 - r;
      if (flip) rank = 7 - rank;
      const plane = (p.color === turn ? 0 : 6) + PIECE_ORDER.indexOf(p.type);
      out[offset + plane * 64 + rank * 8 + f] = 1;
    }
  }
  const ours = c.getCastlingRights(turn);
  const theirs = c.getCastlingRights(turn === 'w' ? 'b' : 'w');
  const flags = [ours.k, ours.q, theirs.k, theirs.q];
  for (let i = 0; i < 4; i++) if (flags[i]) out.fill(1, offset + (12 + i) * 64, offset + (13 + i) * 64);
  if (ep) {
    let rank = ep.charCodeAt(1) - 49;
    if (flip) rank = 7 - rank;
    out[offset + 16 * 64 + rank * 8 + (ep.charCodeAt(0) - 97)] = 1;
  }
  const clock = Math.min(halfmoves(c), 100) / 100;
  if (clock) out.fill(clock, offset + 17 * 64, offset + 18 * 64);
}

const halfmoves = (c: Chess) => Number(c.fen().split(' ')[4]);
/** Placement, side, castling and en passant: what makes two positions the same. */
const keyOf = (c: Chess) => c.fen().split(' ').slice(0, 4).join(' ');
/** The raw en-passant square a move leaves behind (python-chess semantics). */
export const epAfter = (m: Move): string | null =>
  m.flags.includes('b') ? `${m.from[0]}${(Number(m.from[1]) + Number(m.to[1])) / 2}` : null;

// ------------------------------------------------------------------ search

export const MATE_SCORE = 1000;
export const MATE_THRESHOLD = MATE_SCORE - 100;
export const DEFAULT_WIDTHS = [10, 6, 4, 3, 2];
const EXACT = 0;
const LOWER = 1;
const UPPER = 2;

class TimeUp extends Error {}

type Entry = { depth: number; score: number; flag: number; move: string | null };
export type SearchResult = { move: string; score: number; depth: number; nodes: number; evaluations: number; elapsedMs: number; pv: string[] };

const uci = (m: Move) => m.from + m.to + (m.promotion ?? '');

/**
 * Alpha-beta over the policy/value net, bounded by a time budget: the policy
 * ranks the moves and only the top few per ply are searched (`widths`), and a
 * frontier node's children are evaluated in one batch. Depth 1 always
 * completes; deeper iterations are dropped whole when time runs out.
 */
export class SearchEngine {
  private values = new Map<string, number>();
  private priors = new Map<string, Float32Array>();
  private tt = new Map<string, Entry>();
  nodes = 0;
  evaluations = 0;
  private buf = new Float32Array(INPUT_PLANES * 64 * 16);
  private readonly evaluate: Evaluate;
  readonly widths: number[];
  readonly maxDepth: number;
  readonly cacheSize: number;

  constructor(evaluate: Evaluate, widths: number[] = DEFAULT_WIDTHS, maxDepth = 6, cacheSize = 100_000) {
    this.evaluate = evaluate;
    this.widths = widths;
    this.maxDepth = maxDepth;
    this.cacheSize = cacheSize;
  }

  private width(ply: number) {
    return this.widths[Math.min(ply, this.widths.length - 1)];
  }

  private evict() {
    if (this.values.size > this.cacheSize || this.priors.size > this.cacheSize) {
      this.values.clear();
      this.priors.clear();
    }
  }

  private input(n: number) {
    const size = n * INPUT_PLANES * 64;
    if (this.buf.length < size) this.buf = new Float32Array(size);
    return this.buf.subarray(0, size);
  }

  /** Softmax priors over `moves` (in order) plus the position's value. */
  private async priorsAndValue(c: Chess, ep: string | null, moves: Move[]): Promise<[Float32Array, number]> {
    const key = keyOf(c);
    const cached = this.priors.get(key);
    const cachedValue = this.values.get(key);
    if (cached && cachedValue !== undefined && cached.length === moves.length) return [cached, cachedValue];

    const x = this.input(1);
    encode(c, ep, x, 0);
    const { logits, values } = await this.evaluate(x, 1);
    this.evaluations += 1;
    const turn = c.turn();
    const masked = moves.map((m) => logits[moveIndex(m.from, m.to, m.promotion, turn)]);
    const top = Math.max(...masked);
    const p = new Float32Array(masked.map((v) => Math.exp(v - top)));
    const sum = p.reduce((a, b) => a + b, 0);
    for (let i = 0; i < p.length; i++) p[i] /= sum;
    this.evict();
    this.priors.set(key, p);
    this.values.set(key, values[0]);
    return [p, values[0]];
  }

  private async valueOf(c: Chess, ep: string | null): Promise<number> {
    const key = keyOf(c);
    const cached = this.values.get(key);
    if (cached !== undefined) return cached;
    const x = this.input(1);
    encode(c, ep, x, 0);
    const { values } = await this.evaluate(x, 1);
    this.evaluations += 1;
    this.evict();
    this.values.set(key, values[0]);
    return values[0];
  }

  /**
   * Score from the side to move's point of view, or null if the game is on.
   * Two-fold repetition already counts as a draw, the usual search convention:
   * a line that repeats once can repeat again.
   */
  private terminal(c: Chess, ply: number, history: string[]): number | null {
    if (c.isCheckmate()) return -MATE_SCORE + ply;
    if (c.isStalemate() || c.isInsufficientMaterial() || halfmoves(c) >= 100) return 0;
    const key = keyOf(c);
    for (let i = history.length - 2; i >= 0; i--) if (history[i] === key) return 0;
    return null;
  }

  private async orderedMoves(c: Chess, ep: string | null, ply: number, ttMove: string | null): Promise<Move[]> {
    const moves = c.moves({ verbose: true });
    if (!moves.length) return [];
    const [p] = await this.priorsAndValue(c, ep, moves);
    const order = moves.map((_, i) => i).sort((a, b) => p[b] - p[a]).slice(0, this.width(ply));
    const chosen = order.map((i) => moves[i]);
    if (ttMove) {
      const tt = moves.find((m) => uci(m) === ttMove);
      if (tt) {
        const at = chosen.findIndex((m) => uci(m) === ttMove);
        if (at >= 0) chosen.splice(at, 1);
        chosen.unshift(tt);
      }
    }
    return chosen;
  }

  /** Scores for `moves` when their children are leaves, in one batch. */
  private async frontierScores(c: Chess, moves: Move[], ply: number, history: string[]): Promise<number[]> {
    const scores: (number | null)[] = moves.map(() => null);
    const pending: number[] = [];
    const keys: string[] = [];
    const eps: (string | null)[] = [];
    const x = this.input(moves.length);
    for (let i = 0; i < moves.length; i++) {
      const played = c.move(moves[i]);
      history.push(keyOf(c));
      try {
        const t = this.terminal(c, ply + 1, history);
        if (t !== null) {
          scores[i] = -t;
          continue;
        }
        const key = keyOf(c);
        const cached = this.values.get(key);
        if (cached !== undefined) {
          scores[i] = -cached;
          continue;
        }
        const ep = epAfter(played);
        encode(c, ep, x, pending.length * INPUT_PLANES * 64);
        pending.push(i);
        keys.push(key);
        eps.push(ep);
      } finally {
        history.pop();
        c.undo();
      }
    }
    if (pending.length) {
      const { values } = await this.evaluate(x.subarray(0, pending.length * INPUT_PLANES * 64), pending.length);
      this.evaluations += pending.length;
      this.evict();
      pending.forEach((i, j) => {
        this.values.set(keys[j], values[j]);
        scores[i] = -values[j];
      });
    }
    return scores as number[];
  }

  private async negamax(
    c: Chess,
    ep: string | null,
    depth: number,
    alpha: number,
    beta: number,
    ply: number,
    deadline: number | null,
    history: string[],
  ): Promise<[number, string[]]> {
    if (deadline !== null && performance.now() > deadline) throw new TimeUp();
    this.nodes += 1;

    const t = this.terminal(c, ply, history);
    if (t !== null) return [t, []];

    const key = keyOf(c);
    const entry = this.tt.get(key);
    const ttMove = entry?.move ?? null;
    if (entry && entry.depth >= depth) {
      if (entry.flag === EXACT) return [entry.score, entry.move ? [entry.move] : []];
      if (entry.flag === LOWER && entry.score > alpha) alpha = entry.score;
      else if (entry.flag === UPPER && entry.score < beta) beta = entry.score;
      if (alpha >= beta) return [entry.score, entry.move ? [entry.move] : []];
    }

    if (depth <= 0) return [await this.valueOf(c, ep), []];

    const moves = await this.orderedMoves(c, ep, ply, ttMove);
    if (!moves.length) return [this.terminal(c, ply, history) ?? 0, []];

    const originalAlpha = alpha;
    let bestScore = -Infinity;
    let bestMove: string | null = null;
    let bestLine: string[] = [];

    if (depth === 1) {
      const scores = await this.frontierScores(c, moves, ply, history);
      for (let i = 0; i < moves.length; i++) {
        if (scores[i] > bestScore) {
          bestScore = scores[i];
          bestMove = uci(moves[i]);
          bestLine = [bestMove];
        }
        if (bestScore >= beta) break;
      }
    } else {
      for (const m of moves) {
        const played = c.move(m);
        history.push(keyOf(c));
        let score: number;
        let line: string[];
        try {
          [score, line] = await this.negamax(c, epAfter(played), depth - 1, -beta, -Math.max(alpha, bestScore), ply + 1, deadline, history);
          score = -score;
        } finally {
          history.pop();
          c.undo();
        }
        if (score > bestScore) {
          bestScore = score;
          bestMove = uci(m);
          bestLine = [bestMove, ...line];
        }
        if (bestScore >= beta) break;
      }
    }

    let flag = EXACT;
    if (bestScore <= originalAlpha) flag = UPPER;
    else if (bestScore >= beta) flag = LOWER;
    if (this.tt.size > this.cacheSize) this.tt.clear();
    this.tt.set(key, { depth, score: bestScore, flag, move: bestMove });
    return [bestScore, bestLine];
  }

  /**
   * Iteratively deepen until the budget runs out and return the best move.
   * `fen` and `ep` describe the position; `history` is every earlier
   * position's key in the game, for repetition.
   */
  async search(fen: string, ep: string | null, history: string[], budgetMs: number): Promise<SearchResult> {
    const c = new Chess(fen);
    const legal = c.moves({ verbose: true });
    if (!legal.length) throw new Error('no legal moves in this position');
    const started = performance.now();
    const deadline = started + Math.max(budgetMs, 0);
    this.nodes = 0;
    this.evaluations = 0;
    const path = [...history, keyOf(c)];
    let best: SearchResult = { move: uci(legal[0]), score: 0, depth: 0, nodes: 0, evaluations: 0, elapsedMs: 0, pv: [] };

    for (let depth = 1; depth <= this.maxDepth; depth++) {
      let score: number;
      let line: string[];
      try {
        [score, line] = await this.negamax(c, ep, depth, -Infinity, Infinity, 0, depth === 1 ? null : deadline, path);
      } catch (e) {
        if (e instanceof TimeUp) break;
        throw e;
      }
      if (line.length) best = { move: line[0], score, depth, nodes: this.nodes, evaluations: this.evaluations, elapsedMs: performance.now() - started, pv: line };
      if (Math.abs(score) >= MATE_THRESHOLD) break; // a forced mate will not improve with depth
      if (performance.now() > deadline) break;
    }
    best.nodes = this.nodes;
    best.evaluations = this.evaluations;
    best.elapsedMs = performance.now() - started;
    return best;
  }
}

export { Chess, keyOf };

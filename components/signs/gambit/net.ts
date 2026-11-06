'use client';

/**
 * Gambit's network in the visitor's browser: onnxruntime-web on WebAssembly,
 * loaded only when someone actually opens the board. Both files come off this
 * site — the runtime (~15 MB) and the weights (~8 MB) — fetched here so one
 * progress figure covers the whole wait, and handed to the runtime directly.
 */
import { INPUT_PLANES, type Evaluate } from './engine';

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

let loading: Promise<Evaluate> | null = null;
let listeners: ((f: number) => void)[] = [];

async function fetchAll(urls: string[], sizes: Record<string, number>, onProgress: (f: number) => void): Promise<ArrayBuffer[]> {
  const responses = await Promise.all(urls.map((u) => fetch(u)));
  for (const [i, r] of responses.entries()) if (!r.ok || !r.body) throw new Error(`could not load ${urls[i]} (${r.status})`);
  // the true sizes from the build, since a gzipped response's Content-Length is
  // the compressed size while the stream below counts the inflated bytes
  const totals = responses.map((r, i) => sizes[urls[i].split('/').pop() as string] || Number(r.headers.get('content-length')) || 0);
  const known = totals.every((t) => t > 0);
  const total = totals.reduce((a, b) => a + b, 0);
  const got = responses.map(() => 0);
  return Promise.all(
    responses.map(async (r, i) => {
      const reader = r.body!.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got[i] += value.length;
        // and if a total was only a compressed length after all, never past full
        if (known) onProgress(Math.min(1, got.reduce((a, b) => a + b, 0) / total));
      }
      const out = new Uint8Array(got[i]);
      let at = 0;
      for (const c of chunks) {
        out.set(c, at);
        at += c.length;
      }
      return out.buffer;
    }),
  );
}

/**
 * Hand control back to the browser now and then while the bot thinks: the
 * runtime runs on this thread, and a search is a few hundred forward passes,
 * so without this the page would not repaint until the move was chosen.
 */
let lastYield = 0;
const channel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
const yieldNow = () =>
  new Promise<void>((resolve) => {
    if (!channel) return void setTimeout(resolve, 0);
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(0);
  });

/** Load (once) and return the evaluator; `onProgress` gets 0..1 while it downloads. */
export function loadGambit(onProgress: (f: number) => void): Promise<Evaluate> {
  listeners.push(onProgress);
  if (!loading) {
    loading = (async () => {
      const sizes: Record<string, number> = await fetch(`${base()}/gambit/sizes.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
      const [wasm, model] = await fetchAll([`${base()}/gambit/ort-wasm-simd-threaded.wasm`, `${base()}/gambit/gambit.onnx`], sizes, (f) =>
        listeners.forEach((l) => l(f)),
      );
      const ort = await import('onnxruntime-web/wasm');
      // GitHub Pages cannot send the headers that shared-memory threads need
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmBinary = wasm;
      const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      const evaluate: Evaluate = async (inputs, n) => {
        if (performance.now() - lastYield > 24) {
          await yieldNow();
          lastYield = performance.now();
        }
        const out = await session.run({ position: new ort.Tensor('float32', inputs.slice(0, n * INPUT_PLANES * 64), [n, INPUT_PLANES, 8, 8]) });
        return { logits: out.policy.data as Float32Array, values: out.value.data as Float32Array };
      };
      // warm both shapes the search uses, so the first move is not the slow one
      await evaluate(new Float32Array(INPUT_PLANES * 64 * 10), 10);
      await evaluate(new Float32Array(INPUT_PLANES * 64), 1);
      listeners = [];
      return evaluate;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

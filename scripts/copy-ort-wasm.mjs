// Gambit's runtime: onnxruntime-web's WebAssembly binary, served from this
// site next to the model so the board can fetch both with one progress bar.
// Copied out of node_modules at build time rather than committed, since it is
// 15 MB and the package already carries it.
import fs from 'node:fs';

const src = 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm';
const dst = 'public/gambit/ort-wasm-simd-threaded.wasm';
fs.mkdirSync('public/gambit', { recursive: true });
fs.copyFileSync(src, dst);
console.log(`copied ${dst} (${(fs.statSync(dst).size / 1e6).toFixed(1)} MB)`);

// Gambit's runtime: onnxruntime-web's WebAssembly binary, served from this
// site next to the model so the board can fetch both with one progress bar.
// Copied out of node_modules at build time rather than committed, since it is
// 15 MB and the package already carries it.
//
// Also writes sizes.json with both files' real byte counts. GitHub Pages
// gzips them, so the Content-Length a browser sees is the compressed size
// while the stream it reads is inflated; progress needs the true totals.
import fs from 'node:fs';

const dir = 'public/gambit';
const wasm = 'ort-wasm-simd-threaded.wasm';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(`node_modules/onnxruntime-web/dist/${wasm}`, `${dir}/${wasm}`);
const sizes = { [wasm]: fs.statSync(`${dir}/${wasm}`).size, 'gambit.onnx': fs.statSync(`${dir}/gambit.onnx`).size };
fs.writeFileSync(`${dir}/sizes.json`, JSON.stringify(sizes));
console.log(`copied ${dir}/${wasm}; sizes ${JSON.stringify(sizes)}`);

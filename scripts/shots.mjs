#!/usr/bin/env node
// scripts/shots.mjs — deterministic screenshots of the cinematic landing page.
//
// For each progress value P and each viewport, opens
//   <base>/?p=P&still=1
// in headless Chrome (puppeteer-core driving the system Chrome, WebGL via
// SwiftShader), waits for document.documentElement.dataset.ready === '1'
// (or times out and captures anyway), and writes
//   work/shots/<label>[-mobile]-p<P>.png
// Console errors, uncaught page errors and failed requests are printed.
//
// Usage:
//   node scripts/shots.mjs                       # p = 0,0.15,0.3,0.42,0.5,0.75,1 at 1600x900
//   node scripts/shots.mjs --p=0.1,0.2 --label=seam
//   node scripts/shots.mjs --mobile              # also 375x812 (DPR 2, touch)
//   node scripts/shots.mjs --gpu=none            # drop the --use-angle/swiftshader flags
//   node scripts/shots.mjs --timeout=10000       # ms to wait for data-ready (default 25000)
//   node scripts/shots.mjs --loaded=5000         # ms to wait for data-loaded (all plates decoded, loader gone) after ready (default 15000; 0 = skip)
//   node scripts/shots.mjs --settle=500          # extra ms to wait after ready before capturing (default 0)
//   node scripts/shots.mjs --base=http://localhost:3000 --chrome="C:\path\to\chrome.exe"
//   node scripts/shots.mjs --strict              # exit 1 if any console error was seen
//   node scripts/shots.mjs --help

import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'work', 'shots');

const DEFAULT_P = [0, 0.15, 0.3, 0.42, 0.5, 0.75, 1];
const DEFAULT_CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = {
  desktop: {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  mobile: {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};

// GPU flag sets. 'swiftshader' is the documented default; 'none' is the
// fallback to try if WebGL renders blank under ANGLE/SwiftShader.
const GPU_ARGS = {
  swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  none: [],
};

function parseArgs(argv) {
  const opts = {
    p: DEFAULT_P,
    label: 'run',
    mobile: false,
    base: 'http://localhost:3000',
    chrome: DEFAULT_CHROME,
    timeout: 25_000,
    loaded: 15_000,
    settle: 0,
    gpu: 'swiftshader',
    strict: false,
    help: false,
  };
  for (const raw of argv) {
    const [key, ...rest] = raw.replace(/^--/, '').split('=');
    const value = rest.join('=');
    switch (key) {
      case 'p': {
        const list = value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number);
        if (
          list.length === 0 ||
          list.some((n) => !Number.isFinite(n) || n < 0 || n > 1)
        ) {
          throw new Error(
            `--p must be a comma list of numbers in [0,1], got "${value}"`,
          );
        }
        opts.p = list;
        break;
      }
      case 'label':
        if (!/^[\w.-]+$/.test(value))
          throw new Error(`--label must match [\\w.-]+, got "${value}"`);
        opts.label = value;
        break;
      case 'mobile':
        opts.mobile = value === '' || value === '1' || value === 'true';
        break;
      case 'base':
        opts.base = value.replace(/\/+$/, '');
        break;
      case 'chrome':
        opts.chrome = value;
        break;
      case 'timeout':
        opts.timeout = Number(value);
        if (!Number.isFinite(opts.timeout) || opts.timeout < 0) {
          throw new Error(`bad --timeout "${value}"`);
        }
        break;
      case 'settle':
        opts.settle = Number(value);
        if (!Number.isFinite(opts.settle) || opts.settle < 0) {
          throw new Error(`bad --settle "${value}"`);
        }
        break;
      case 'loaded':
        opts.loaded = Number(value);
        if (!Number.isFinite(opts.loaded) || opts.loaded < 0) {
          throw new Error(`bad --loaded "${value}"`);
        }
        break;
      case 'gpu':
        if (!(value in GPU_ARGS)) {
          throw new Error(
            `--gpu must be one of ${Object.keys(GPU_ARGS).join('|')}`,
          );
        }
        opts.gpu = value;
        break;
      case 'strict':
        opts.strict = true;
        break;
      case 'help':
      case 'h':
        opts.help = true;
        break;
      default:
        throw new Error(`unknown option --${key}`);
    }
  }
  return opts;
}

function usage() {
  const src = path.relative(ROOT, fileURLToPath(import.meta.url));
  console.log(
    `Usage: node ${src} [--p=0,0.5,1] [--label=run] [--mobile] [--gpu=swiftshader|none] ` +
      `[--timeout=25000] [--loaded=15000] [--settle=0] [--base=URL] [--chrome=PATH] [--strict]`,
  );
}

// Keep captured messages readable: first few lines of a stack trace are enough.
const MAX_MSG_LINES = 4;
function clip(text) {
  const lines = String(text).split('\n');
  if (lines.length <= MAX_MSG_LINES) return lines.join('\n');
  const head = lines.slice(0, MAX_MSG_LINES).join('\n');
  return `${head}\n    ... (${lines.length - MAX_MSG_LINES} more lines)`;
}

// Filename tag for P, exactly as typed (0 -> "p0", 0.15 -> "p0.15").
const pTag = (p) => `p${String(p)}`;

// Polls until document.documentElement.dataset[attr] === '1'; false on timeout.
async function waitForFlag(page, attr, timeoutMs) {
  if (timeoutMs === 0) return false;
  try {
    await page.waitForFunction(
      (name) => document.documentElement.dataset[name] === '1',
      { polling: 200, timeout: timeoutMs },
      attr,
    );
    return true;
  } catch (err) {
    if (err?.name === 'TimeoutError') return false;
    throw err;
  }
}

// data-ready: the compositor drew a frame with every plate it needed.
const waitForReady = (page, timeoutMs) => waitForFlag(page, 'ready', timeoutMs);
// data-loaded: every plate is decoded and the loader has gone.
const waitForLoaded = (page, timeoutMs) =>
  waitForFlag(page, 'loaded', timeoutMs);

async function probeWebGL(page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { ok: false, version: 'none', renderer: 'n/a' };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg
      ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return { ok: true, version: gl.getParameter(gl.VERSION), renderer };
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return 0;
  }

  try {
    await access(opts.chrome);
  } catch {
    console.error(
      `[error] Chrome not found at "${opts.chrome}". Pass --chrome=PATH or set CHROME_PATH.`,
    );
    return 1;
  }

  await mkdir(OUT_DIR, { recursive: true });

  const args = [
    ...GPU_ARGS[opts.gpu],
    '--hide-scrollbars',
    '--disable-gpu-sandbox',
  ];
  console.log(`[shots] chrome: ${opts.chrome}`);
  console.log(`[shots] args:   ${args.join(' ')}`);
  console.log(
    `[shots] base: ${opts.base}  label: ${opts.label}  p: ${opts.p.join(',')}  ` +
      `ready-timeout: ${opts.timeout}ms  viewports: ${opts.mobile ? 'desktop,mobile' : 'desktop'}`,
  );

  const browser = await puppeteer.launch({
    executablePath: opts.chrome,
    headless: true,
    args,
    defaultViewport: null,
  });

  const allErrors = [];
  const saved = [];
  let exitCode = 0;

  try {
    const viewportNames = opts.mobile ? ['desktop', 'mobile'] : ['desktop'];

    for (const vpName of viewportNames) {
      const vp = VIEWPORTS[vpName];
      const page = await browser.newPage();
      await page.setViewport(vp);

      // Per-navigation error buffer; flushed after each screenshot.
      let errors = [];
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const loc = msg.location();
        const where = loc?.url
          ? ` @ ${loc.url}${loc.lineNumber != null ? `:${loc.lineNumber + 1}` : ''}`
          : '';
        errors.push(`console.error: ${clip(msg.text())}${where}`);
      });
      page.on('pageerror', (err) => {
        errors.push(`pageerror: ${clip(err?.message ?? String(err))}`);
      });
      page.on('requestfailed', (req) => {
        const reason = req.failure()?.errorText ?? 'failed';
        // Requests cancelled by navigation are noise, not errors.
        if (reason === 'net::ERR_ABORTED') return;
        errors.push(`requestfailed: ${req.url()} (${reason})`);
      });
      page.on('response', (res) => {
        // Chrome's "Failed to load resource" console line omits the URL; record it here.
        if (res.status() >= 400)
          errors.push(`http ${res.status()}: ${res.url()}`);
      });

      let probed = false;

      for (const p of opts.p) {
        errors = [];
        const url = `${opts.base}/?p=${p}&still=1`;
        const tag = `${vpName} ${pTag(p)}`;
        const t0 = Date.now();

        try {
          await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
        } catch (err) {
          console.warn(
            `[warn] ${tag}: navigation to ${url} did not finish loading (${err?.message ?? err}); continuing`,
          );
        }
        const tLoad = Date.now() - t0;

        if (!probed) {
          probed = true;
          try {
            const gl = await probeWebGL(page);
            console.log(
              `[shots] ${vpName}: WebGL ${gl.ok ? 'OK' : 'UNAVAILABLE'} — ${gl.version} / ${gl.renderer}`,
            );
          } catch (err) {
            console.warn(
              `[warn] ${vpName}: WebGL probe failed: ${err?.message ?? err}`,
            );
          }
        }

        const t1 = Date.now();
        const ready = await waitForReady(page, opts.timeout);
        const tReady = Date.now() - t1;
        if (!ready) {
          console.warn(
            `[warn] ${tag}: data-ready="1" not set within ${opts.timeout}ms — capturing anyway`,
          );
        }

        // Once interactive, give the drive frames a bounded chance to finish so the
        // loader is gone from the capture (it is not an error if they do not).
        const t2 = Date.now();
        const loaded = ready && (await waitForLoaded(page, opts.loaded));
        const tLoaded = Date.now() - t2;
        if (ready && !loaded && opts.loaded > 0) {
          console.warn(
            `[warn] ${tag}: data-loaded="1" not set within ${opts.loaded}ms — capturing with the loader visible`,
          );
        }

        if (opts.settle > 0) {
          await new Promise((r) => setTimeout(r, opts.settle));
        }

        const file = `${opts.label}${vpName === 'desktop' ? '' : `-${vpName}`}-${pTag(p)}.png`;
        const outPath = path.join(OUT_DIR, file);
        await page.screenshot({ path: outPath, type: 'png', fullPage: false });
        saved.push(outPath);
        const loadedNote =
          opts.loaded > 0 && ready
            ? `, loaded ${loaded ? `${(tLoaded / 1000).toFixed(1)}s` : 'timeout'}`
            : '';
        console.log(
          `[saved] ${outPath}  (load ${(tLoad / 1000).toFixed(1)}s, ready ${ready ? `${(tReady / 1000).toFixed(1)}s` : 'timeout'}${loadedNote})`,
        );

        if (errors.length) {
          for (const e of errors) console.log(`[console] ${tag}: ${e}`);
          allErrors.push(...errors.map((e) => `${tag}: ${e}`));
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n[shots] ${saved.length} file(s) written to ${OUT_DIR}`);
  if (allErrors.length) {
    console.log(`[shots] ${allErrors.length} console/page error(s) captured:`);
    for (const e of allErrors) console.log(`  - ${e}`);
    if (opts.strict) exitCode = 1;
  } else {
    console.log('[shots] no console errors');
  }
  return exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`[error] ${err?.stack ?? err}`);
    process.exitCode = 1;
  });

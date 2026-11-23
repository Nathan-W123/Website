#!/usr/bin/env node
// scripts/og-image.mjs: the picture a link to the site shows when it is sent
// (iMessage, Slack, Discord, LinkedIn, X...): Home's morphing ribbon on its
// first frame (public/about/ribbon.webp), multiplied onto the page's paper as
// Home shows it, with the name set over it in the site's EB Garamond. A soft
// halo of paper behind the letters keeps the ribbon's lines off them.
//
// Writes public/og.png at 1200 x 630. Then bump ?v= on the image in
// app/layout.tsx so apps that keep old previews fetch the new one.
//
// Usage:
//   npm run og
//   node scripts/og-image.mjs --chrome="C:\path\to\chrome.exe" --out=work/og.png

import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const OUT = path.resolve(ROOT, arg('out', 'public/og.png'));
const CHROME = arg('chrome', process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');

const SIZE = { width: 1200, height: 630 };
const PAPER = '#f9f6ef'; // --bg in components/home/home.css
const INK = '#1f1c18'; // --ink
const RIBBON = 560; // the ribbon's square on the card, in px
const NAME = { text: 'Nathan Ward', size: 76, weight: 600 };

const b64 = async (f) => (await readFile(path.join(ROOT, f))).toString('base64');
const font = await b64('app/fonts/eb-garamond-var.woff2');
const ribbon = await b64('public/about/ribbon.webp');
const halo = [6, 12, 18, 26].map((r) => `0 0 ${r}px ${PAPER}`).join(', ');

const html = `<!doctype html><meta charset="utf-8">
<style>
@font-face { font-family: 'EB Garamond'; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 400 800; }
html, body { margin: 0; width: ${SIZE.width}px; height: ${SIZE.height}px; overflow: hidden; background: ${PAPER}; }
/* the paper on the card itself, so the ribbon's white ground multiplies away */
.card { position: relative; width: 100%; height: 100%; display: grid; place-items: center; isolation: isolate; background: ${PAPER}; }
.card img { width: ${RIBBON}px; height: ${RIBBON}px; mix-blend-mode: multiply; }
.card h1 {
  position: absolute; inset: 0; margin: 0; display: grid; place-items: center;
  font: ${NAME.weight} ${NAME.size}px/1 'EB Garamond', serif; letter-spacing: -0.005em; color: ${INK};
  text-shadow: ${halo};
}
</style>
<div class="card"><img src="data:image/webp;base64,${ribbon}" alt=""><h1>${NAME.text}</h1></div>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setViewport({ ...SIZE, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await mkdir(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, type: 'png' });
  const { size } = await stat(OUT);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${SIZE.width} x ${SIZE.height}, ${Math.round(size / 1024)} KB`);
} finally {
  await browser.close();
}

#!/usr/bin/env node
// scripts/og-image.mjs: the picture a link to the site shows when it is sent
// (iMessage, Slack, Discord, LinkedIn, X...), taken from the home page itself
// so it can't fall behind the site again: run it after a redesign.
//
// Opens the home page in headless Chrome at a laptop's width and the link
// preview's shape (1440 x 756, 1.905 : 1), waits for the opening motion to
// settle, and writes public/og.png at 1200 x 630. The scrollbar's gutter is
// left out, as a Mac or a phone shows the page. Then bump ?v= on the image in
// app/layout.tsx so apps that keep old previews fetch the new one.
//
// Usage:
//   npm run og                                   # from the live site
//   node scripts/og-image.mjs --base=http://127.0.0.1:4173/   # a local build
//   node scripts/og-image.mjs --chrome="C:\path\to\chrome.exe" --out=work/og.png

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const BASE = arg('base', 'https://nateward.me/');
const OUT = path.resolve(ROOT, arg('out', 'public/og.png'));
const CHROME = arg('chrome', process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');

const VIEW = { width: 1440, height: 756 };
const SIZE = { width: 1200, height: 630 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const problems = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
  // drawn straight at the size it is sent at: 1440 css px across 1200 pixels
  await page.setViewport({ ...VIEW, deviceScaleFactor: SIZE.width / VIEW.width });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const url = new URL(BASE);
  url.searchParams.set('og', String(Date.now()));
  url.hash = '#/';
  await page.goto(url.href, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // no gutter: the nav's rule runs edge to edge and the page sits centred
  await page.addStyleTag({ content: '.sg-page { scrollbar-width: none !important; scrollbar-gutter: auto !important; }' });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  // the opening motion has settled once the name, the cards, the two words
  // and the switch have held still for three looks in a row
  const pose = () => page.evaluate(() =>
    ['.hm-name', '.hm-role', '.hm-switch', '.hm-fan *', '.hm-nav-bar']
      .flatMap((s) => [...document.querySelectorAll(s)])
      .map((e) => { const r = e.getBoundingClientRect(); return `${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)},${r.height.toFixed(1)}`; })
      .join('|'));
  await wait(1500);
  let last = await pose();
  let still = 0;
  for (let i = 0; i < 40 && still < 3; i++) {
    await wait(250);
    const now = await pose();
    still = now === last ? still + 1 : 0;
    last = now;
  }
  if (still < 3) problems.push('the home page was still moving after 11.5 s');
  await mkdir(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, type: 'png' });
  const { size } = await stat(OUT);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${SIZE.width} x ${SIZE.height}, ${Math.round(size / 1024)} KB`);
} finally {
  await browser.close();
}
if (problems.length) {
  console.error(`problems:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
}

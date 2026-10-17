// Verifies the presentation fallback: load /demo once, stop the server,
// reload, and play — all from the service-worker cache.
//   npm run build && node scripts/verify-offline.mjs
// Needs Google Chrome (or set CHROME_PATH).
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
const chrome =
  process.env.CHROME_PATH ||
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : process.platform === 'win32'
      ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      : '/usr/bin/google-chrome');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (ok, msg) => console.log(`${ok ? '✔' : '✘'} ${msg}`);
let failed = false;
const check = (ok, msg) => {
  log(ok, msg);
  if (!ok) failed = true;
};

async function waitFor(fn, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await sleep(250);
  }
  return false;
}

const server = spawn(process.execPath, ['dist/server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await sleep(800);

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-first-run'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto(`${BASE}/demo`, { waitUntil: 'networkidle0' });
  const ready = await waitFor(async () => (await page.evaluate(() => document.body.innerText)).includes('Offline ready'));
  check(ready, 'Demo shows "Offline ready" after the cache completes');
  await page.goto(`${BASE}/play`, { waitUntil: 'networkidle0' });

  server.kill('SIGINT');
  await sleep(800);
  const down = await fetch(`${BASE}/healthz`).then(
    () => false,
    () => true,
  );
  check(down, 'Server is stopped');

  await page.goto(`${BASE}/demo`, { waitUntil: 'load' });
  await sleep(1200);
  const text = await page.evaluate(() => document.body.innerText);
  check(text.includes('Demo Mode') || text.includes('Stop '), 'Demo reloads from cache with the server stopped');
  const canvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 0;
  });
  check(canvas, 'Journey canvas renders offline');
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('900 20px Rubik') && document.fonts.check('400 20px Shrikhand');
  });
  check(fonts, 'Bundled fonts load offline');

  // play offline: start (or resume) and see a prompt
  await page.keyboard.press('KeyP');
  await page.keyboard.press('Space');
  const playing = await waitFor(async () => /stop \d of 6/i.test(await page.evaluate(() => document.body.innerText)), 6000);
  check(playing, 'Demo game runs offline');
  await page.screenshot({ path: process.env.SHOT ?? 'offline-demo.png' });

  await page.goto(`${BASE}/play`, { waitUntil: 'load' });
  await sleep(800);
  check((await page.evaluate(() => document.body.innerText)).length > 20, 'Solo page also loads offline');
} finally {
  await browser.close();
  server.kill('SIGINT');
}
console.log(failed ? '\nOffline check FAILED' : '\nOffline check passed');
process.exit(failed ? 1 : 0);

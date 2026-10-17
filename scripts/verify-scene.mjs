// Checks the journey scene: van stays on screen, skyline grows with distance,
// bigger awards travel longer/faster, reduced motion stays calm.
//   npm run build && node scripts/verify-scene.mjs
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 3997;
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ['dist/server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await sleep(800);
const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? '✔' : '✘'} ${msg}`);
  if (!ok) failed = true;
};
try {
  for (const [w, h, label] of [
    [1920, 1080, 'projector'],
    [375, 667, 'small phone'],
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, isMobile: w < 500, hasTouch: w < 500 });
    await page.goto(`http://localhost:${PORT}/play`, { waitUntil: 'networkidle0' });
    const res = await page.evaluate(async () => {
      const r = window.__journey;
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
      const sky = {};
      let vanOk = true;
      for (const km of [0, 50, 100, 150, 200, 250, 300]) {
        r.setKmInstant(km);
        await sleep(60);
        const d = r.debugState();
        sky[km] = d.skylineHalfWidth;
        const v = d.van;
        if (!(v.vx - v.vw / 2 >= 0 && v.vx + v.vw / 2 <= d.W && v.vy <= d.H + 1 && v.vy - v.vw * 0.95 >= 0)) vanOk = false;
      }
      async function trip(delta) {
        r.setKmInstant(100);
        await sleep(500);
        const t0 = performance.now();
        r.driveTo(100 + delta);
        let peak = 0;
        let done = 0;
        while (performance.now() - t0 < 4500) {
          const d = r.debugState();
          peak = Math.max(peak, d.speed);
          if (!done && d.displayKm >= 100 + delta - 0.01) done = performance.now() - t0;
          await sleep(25);
        }
        return { ms: Math.round(done), peak: Math.round(peak) };
      }
      const trips = { common: await trip(10), uncommon: await trip(20), rare: await trip(35), gem: await trip(50) };
      return { sky, vanOk, trips };
    });
    const ks = Object.keys(res.sky).map(Number);
    check(ks.every((k, i) => i === 0 || res.sky[k] > res.sky[ks[i - 1]]), `${label}: skyline grows steadily with distance ${JSON.stringify(Object.values(res.sky).map(Math.round))}`);
    check(res.vanOk, `${label}: van fully on screen from 0 to 300 km`);
    const t = res.trips;
    check(t.common.ms < t.uncommon.ms && t.uncommon.ms < t.rare.ms && t.rare.ms < t.gem.ms, `${label}: travel time grows with rarity ${JSON.stringify(t)}`);
    check(t.common.peak < t.gem.peak, `${label}: a hidden gem surges faster than a common answer`);
    await page.close();
  }
  const rm = await browser.newPage();
  await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rm.goto(`http://localhost:${PORT}/play`, { waitUntil: 'networkidle0' });
  const calm = await rm.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 600));
    const r = window.__journey;
    r.driveTo(50);
    await new Promise((res) => setTimeout(res, 700));
    const d = r.debugState();
    return { speed: d.speed, km: d.displayKm };
  });
  check(calm.speed === 0 && calm.km === 50, `reduced motion: no scrolling, short jump (${JSON.stringify(calm)})`);
} finally {
  await browser.close();
  server.kill('SIGINT');
}
process.exit(failed ? 1 : 0);

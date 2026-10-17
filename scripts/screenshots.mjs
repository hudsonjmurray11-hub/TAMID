// Plays a real live game in headless Chrome and saves screenshots of every
// screen at projector (1920×1080) and small-phone (375×667) sizes.
//   npm run build && node scripts/screenshots.mjs [outDir]
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { io } from 'socket.io-client';

const OUT = process.argv[2] || 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const PORT = 3998;
const BASE = `http://localhost:${PORT}`;
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, ['dist/server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await sleep(800);
const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const shot = async (page, name) => {
  await sleep(250);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('saved', name);
};
const text = (page) => page.evaluate(() => document.body.innerText);
async function waitText(page, re, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (re.test(await text(page))) return;
    await sleep(200);
  }
  throw new Error(`timeout waiting for ${re}`);
}

try {
  // Home
  const home = await browser.newPage();
  await home.setViewport({ width: 1920, height: 1080 });
  await home.goto(BASE, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await shot(home, '01-home-projector');
  await home.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await sleep(800);
  await shot(home, '02-home-phone');
  await home.close();

  // Host
  const host = await browser.newPage();
  await host.setViewport({ width: 1920, height: 1080 });
  await host.goto(`${BASE}/host`, { waitUntil: 'networkidle0' });
  await waitText(host, /Room code/i);
  const code = await host.evaluate(() => document.querySelector('.room-code')?.textContent?.trim());
  console.log('room', code);

  // Phones (real UI)
  const phones = [];
  for (const name of ['Noa', 'Charlie', 'Sienna']) {
    const ctx = await browser.createBrowserContext(); // separate storage per phone
    const p = await ctx.newPage();
    await p.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await p.goto(`${BASE}/join?code=${code}`, { waitUntil: 'networkidle0' });
    if (name === 'Noa') await shot(p, '10-phone-join');
    await p.type('input[autocomplete="nickname"]', name);
    await p.click('button[type="submit"]');
    await waitText(p, /You’re in/);
    phones.push(p);
  }
  await shot(phones[0], '11-phone-lobby');

  // 37 socket bots → 40 players
  const bots = [];
  for (let i = 0; i < 37; i++) {
    const s = io(BASE, { transports: ['websocket'], forceNew: true });
    await new Promise((r) => s.once('connect', r));
    await new Promise((r) => s.emit('player:join', { code, name: `Rider ${i + 1}` }, r));
    bots.push(s);
  }
  await sleep(600);
  await shot(host, '03-host-lobby');

  const answers = [
    ['towel', 'sunscreen', 'umbrella', 'snorkel', 'matkot', 'first aid kit', 'sunglasses', 'cooler', 'baby powder'],
    ['text', 'take photos', 'maps', 'translate', 'shazam', 'pay', 'email', 'flashlight'],
    ['money', 'mentor', 'a team', 'customers', 'pitch deck', 'a problem to solve', 'coffee', 'lawyer'],
    ['bus', 'bike', 'walk', 'scooter', 'sherut', 'zipline', 'tram', 'kayak'],
    ['try again', 'ask for help', 'pivot', 'post mortem', 'share what you learned', 'take a break'],
    ['shower', 'books', 'travel', 'hackathon', 'mistakes', 'museum', 'kids', 'coffee shop'],
  ];
  const phoneAnswers = ['first aid kit', 'translate', 'mentor', 'sherut', 'share what you learned', 'a market'];

  for (let round = 0; round < 6; round++) {
    if (round === 0) await host.keyboard.press('Space');
    await waitText(host, new RegExp(`Stop ${round + 1} of 6`, 'i'));
    await sleep(1500);
    if (round === 0) {
      await shot(phones[0], '12-phone-answering');
      await shot(host, '04-host-answering-empty');
    }
    // phone 0 retries once, then locks in
    const p0 = phones[0];
    await p0.type('#answer', round === 0 ? 'spaceship' : phoneAnswers[round]);
    await p0.keyboard.press('Enter');
    if (round === 0) {
      await sleep(500);
      await shot(p0, '13-phone-retry');
      await p0.click('#answer', { clickCount: 3 });
      await p0.type('#answer', phoneAnswers[0]);
      await p0.keyboard.press('Enter');
      await sleep(500);
      await shot(p0, '14-phone-locked');
    }
    for (const [i, p] of phones.slice(1).entries()) {
      await p.type('#answer', answers[round][(i + round) % answers[round].length]);
      await p.keyboard.press('Enter');
    }
    // most bots answer; a few miss
    const view = { round };
    for (const [i, s] of bots.entries()) {
      if ((i + round) % 11 === 3) continue;
      s.emit('player:submit', { round: view.round, text: answers[round][(i * 3 + round) % answers[round].length] }, () => {});
      if (round === 0 && i === 20) {
        await sleep(400);
        await shot(host, '05-host-answering');
      }
    }
    await host.keyboard.press('Space'); // reveal now (some bots missed)
    await waitText(host, /revealed/i);
    await sleep(2600);
    if (round === 0 || round === 3) {
      await shot(host, `06-host-reveal-r${round + 1}`);
      await shot(p0, `15-phone-reveal-r${round + 1}`);
    }
    if (round === 0) {
      await p0.click('.reveal-panel .btn.cream');
      await sleep(500);
      await shot(p0, '16-phone-all-answers');
      await p0.keyboard.press('Escape');
    }
    await host.keyboard.press('Space'); // next stop / finale
  }
  await waitText(host, /Last stop/i);
  await sleep(2500);
  await shot(host, '07-host-finale-podium');
  await host.keyboard.press('Space');
  await sleep(1200);
  await shot(host, '08-host-finale-why');
  await host.keyboard.press('Space');
  await sleep(900);
  await shot(host, '09-host-finale-competencies');
  await shot(phones[0], '17-phone-finale');
  await phones[0].evaluate(() => window.scrollTo(0, 900));
  await sleep(400);
  await shot(phones[0], '18-phone-finale-scrolled');

  // Demo + solo + reduced motion
  const demo = await browser.newPage();
  await demo.setViewport({ width: 1920, height: 1080 });
  await demo.goto(`${BASE}/demo`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await shot(demo, '20-demo-lobby');
  const solo = await browser.newPage();
  await solo.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await solo.setViewport({ width: 1440, height: 900 });
  await solo.goto(`${BASE}/play`, { waitUntil: 'networkidle0' });
  await solo.click('.btn.big');
  await sleep(800);
  await solo.type('#answer', 'snorkel');
  await solo.keyboard.press('Enter');
  await sleep(2500);
  await shot(solo, '21-solo-desktop-reveal-reduced-motion');
  for (const s of bots) s.close();
} finally {
  await browser.close();
  server.kill('SIGINT');
}

// Keyboard checks: visible focus ring, host shortcuts ignored while a dialog is open.
//   npm run build && node scripts/verify-controls.mjs [focus-screenshot.png]
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, ['dist/server.mjs'], { env: { ...process.env, PORT: '3996' }, stdio: 'ignore' });
await sleep(800);
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
await p.goto('http://localhost:3996/', { waitUntil: 'networkidle0' });
for (let i = 0; i < 3; i++) await p.keyboard.press('Tab');
const info = await p.evaluate(() => ({ el: document.activeElement.textContent, outline: getComputedStyle(document.activeElement).outline }));
console.log(info);
if (process.argv[2]) await p.screenshot({ path: process.argv[2], clip: { x: 0, y: 150, width: 640, height: 500 } });
// demo: Space shortcut ignored while a dialog is open
await p.goto('http://localhost:3996/demo', { waitUntil: 'networkidle0' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle0' });
await p.keyboard.press('?');
await sleep(300);
console.log('? opens help:', await p.evaluate(() => !!document.querySelector('dialog[open]')));
await p.keyboard.press('Space');
await sleep(400);
// (Space on the dialog's focused Close button closes the dialog natively; the game must not start.)
const stillLobby = await p.evaluate(() => /Start the demo trip/.test(document.body.innerText));
console.log('Space in an open dialog does not start the game:', stillLobby);
await p.keyboard.press('Escape');
await sleep(300);
await p.keyboard.press('Space');
await sleep(600);
console.log('Space starts after closing dialog:', await p.evaluate(() => /stop 1 of 6/i.test(document.body.innerText)));
await p.keyboard.press('KeyR');
await sleep(300);
console.log('R opens restart confirm:', await p.evaluate(() => /Restart the trip\?/.test(document.body.innerText)));
await b.close();
server.kill();

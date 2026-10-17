// One command: install if needed, build, start.  →  npm run play
import { execSync, spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

const [major] = process.versions.node.split('.').map(Number);
if (major < 20) {
  console.error(`\n  Next Stop: Tel Aviv needs Node.js 20 or newer (you have ${process.versions.node}).\n  Download it from https://nodejs.org\n`);
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const lockTime = existsSync('package-lock.json') ? statSync('package-lock.json').mtimeMs : 0;
const installed = existsSync('node_modules/.package-lock.json') && statSync('node_modules/.package-lock.json').mtimeMs >= lockTime - 1000;
if (!existsSync('node_modules') || !installed) {
  console.log('\n  Installing dependencies (first run needs internet)…\n');
  run('npm install --no-audit --no-fund');
}
console.log('\n  Building…\n');
run('npm run build --silent');
const child = spawn(process.execPath, ['dist/server.mjs'], { stdio: 'inherit', env: process.env });
const stop = () => child.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));

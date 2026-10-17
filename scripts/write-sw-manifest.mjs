// After `vite build`: list every built file in the service worker's precache.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../dist/client/', import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push('/' + relative(root, p).split('\\').join('/'));
  }
})(root);

const precache = files.filter((f) => f !== '/sw.js').sort();
const hash = createHash('sha1');
for (const f of precache) hash.update(f).update(readFileSync(join(root, f)));
const version = hash.digest('hex').slice(0, 10);

const swPath = join(root, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
sw = sw.replace("const VERSION = 'dev';", `const VERSION = '${version}';`).replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(precache, null, 0)};`);
writeFileSync(swPath, sw);
console.log(`sw.js: precaching ${precache.length} files (version ${version})`);

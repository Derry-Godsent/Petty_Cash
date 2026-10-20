import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const assets = (await readdir('dist/assets')).filter(name => /\.(js|css)$/.test(name)).map(name => `/assets/${name}`);
const hash = createHash('sha256').update(assets.join(','));
for (const path of ['index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']) hash.update(await readFile(`dist/${path}`));
const version = hash.digest('hex').slice(0, 12);
const template = await readFile('public/sw.js', 'utf8');
await writeFile('dist/sw.js', template.replace('__VERSION__', version).replace('__APP_ASSETS__', JSON.stringify([
  '/index.html', '/manifest.json', '/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', ...assets,
])));

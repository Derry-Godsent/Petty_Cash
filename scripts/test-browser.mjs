// Use the npm-distributed browser in network-restricted CI. On ordinary machines
// Playwright's own browser also works; no system libraries are changed here.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
if (process.platform === 'linux') {
  const directory = resolve(tmpdir(), 'petty-cash-browser-libs');
  mkdirSync(directory, { recursive: true });
  const archive = resolve(dirname(require.resolve('@sparticuz/chromium')), '../bin/al2023.tar.br');
  writeFileSync(resolve(directory, 'libs.tar'), brotliDecompressSync(readFileSync(archive)));
  execFileSync('tar', ['xf', resolve(directory, 'libs.tar'), '-C', directory]);
  process.env.LD_LIBRARY_PATH = `${directory}/lib:${process.env.LD_LIBRARY_PATH || ''}`;
}

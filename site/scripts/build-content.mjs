#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPages } from './lib/site-content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '..');
const outFile = resolve(siteRoot, 'src/generated/pages.json');
const pages = await loadPages(siteRoot);

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(pages)}\n`);
console.log(`[build-content] rendered ${pages.length} documentation routes → src/generated/pages.json`);

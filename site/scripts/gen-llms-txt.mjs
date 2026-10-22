#!/usr/bin/env node
// Publish both llms.txt indexes under https://brianwestphal.github.io/kerf/.
// Astro copies site/public/ verbatim to the base root.
//
// The root index already uses absolute URLs. The UI source uses relative links
// for its installed-package location, so turn those links into GitHub source
// URLs in the site copy. The generated outputs are gitignored and regenerated
// by the site's prebuild hook.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rootSrc = resolve(here, '../../llms.txt');
const rootDest = resolve(here, '../public/llms.txt');
const uiSrc = resolve(here, '../../ui/llms.txt');
const uiDest = resolve(here, '../public/ui/llms.txt');

mkdirSync(dirname(rootDest), { recursive: true });
copyFileSync(rootSrc, rootDest);
console.log('[gen-llms-txt] site/public/llms.txt ← llms.txt');

mkdirSync(dirname(uiDest), { recursive: true });
const uiIndex = readFileSync(uiSrc, 'utf8').replaceAll(
  '](./',
  '](https://github.com/brianwestphal/kerf/blob/main/ui/',
);
writeFileSync(uiDest, uiIndex);
console.log('[gen-llms-txt] site/public/ui/llms.txt ← ui/llms.txt');

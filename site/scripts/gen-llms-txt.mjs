#!/usr/bin/env node
// Publish the repo-root llms.txt at the site root so it resolves at
// https://brianwestphal.github.io/kerf/llms.txt (the URL submitted to the
// llms.txt directories). Astro copies site/public/ verbatim to the base root,
// so this just mirrors the canonical root file into public/.
//
// The root llms.txt uses absolute URLs (GitHub blob links), so it serves
// correctly from the site, GitHub, and the npm bundle with no per-surface
// rewriting. Run as part of the site `prebuild` hook; the output is gitignored
// and regenerated on every build (same pattern as the generated favicons).

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../llms.txt'); // repo root
const dest = resolve(here, '../public/llms.txt'); // site/public

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log('[gen-llms-txt] site/public/llms.txt ← llms.txt');

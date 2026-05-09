#!/usr/bin/env node
/**
 * Generate the favicon set + PWA manifest from the canonical SVG sources in
 * `src/assets/`. Outputs land in `public/` so Astro picks them up as static
 * assets at the configured base (/kerf/).
 *
 * Sources (committed):
 *   src/assets/favicon.svg     — full-color SVG (used as-is in modern browsers).
 *   src/assets/mask-icon.svg   — Safari pinned-tab silhouette.
 *
 * Outputs (regenerated; not committed under public/):
 *   public/favicon.svg         — copy of src/assets/favicon.svg.
 *   public/favicon-16.png
 *   public/favicon-32.png
 *   public/favicon-48.png
 *   public/favicon.ico         — multi-resolution legacy fallback (16/32/48). Skipped if ImageMagick (`magick`) isn't on PATH.
 *   public/apple-touch-icon.png — 180×180 for iOS home screen.
 *   public/icon-192.png        — Android / PWA.
 *   public/icon-512.png        — Android / PWA / maskable.
 *   public/mask-icon.svg       — copy of src/assets/mask-icon.svg.
 *   public/site.webmanifest    — PWA manifest pointing at the PNG icons.
 *
 * Wired into `site:build` via the `prebuild` script in package.json.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');
const srcDir = resolve(siteRoot, 'src/assets');
const outDir = resolve(siteRoot, 'public');

const FAVICON_SRC = resolve(srcDir, 'favicon.svg');
const MASK_SRC = resolve(srcDir, 'mask-icon.svg');

mkdirSync(outDir, { recursive: true });

// PNG sizes wired into the head + manifest below. Keep this list and the
// head config in astro.config.mjs in sync — adding a size here without a
// matching <link> tag emits an orphan asset, and vice versa.
const PNG_TARGETS = [
  { size: 16,  name: 'favicon-16.png' },
  { size: 32,  name: 'favicon-32.png' },
  { size: 48,  name: 'favicon-48.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
];

console.log(`[build-icons] reading ${FAVICON_SRC}`);

for (const { size, name } of PNG_TARGETS) {
  // density bumps the rasterisation DPI so small targets stay sharp — sharp's
  // default of 72 produces blurry 16×16/32×32 output from a 88px-wide SVG.
  const density = Math.max(72, size * 4);
  await sharp(FAVICON_SRC, { density })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(outDir, name));
  console.log(`[build-icons] wrote public/${name} (${size}x${size})`);
}

// Multi-resolution favicon.ico via ImageMagick. Pure-JS alternatives exist
// (`to-ico`, `png-to-ico`) but ImageMagick ships on every CI runner we use
// and produces tighter output; fall back to a warning if it's missing.
const ICO_TARGET = resolve(outDir, 'favicon.ico');
const ICO_SOURCES = ['favicon-16.png', 'favicon-32.png', 'favicon-48.png']
  .map((n) => resolve(outDir, n));
try {
  execFileSync('magick', [...ICO_SOURCES, ICO_TARGET], { stdio: 'pipe' });
  console.log('[build-icons] wrote public/favicon.ico (16/32/48)');
} catch (err) {
  // Don't fail the build — modern browsers prefer favicon.svg anyway. Surface
  // the reason so anyone debugging missing ICOs knows what to install.
  const reason = err && err.code === 'ENOENT'
    ? 'ImageMagick (`magick`) not on PATH — install it to enable ICO output, or commit a pre-generated favicon.ico.'
    : `ImageMagick failed: ${err.message}`;
  console.warn(`[build-icons] skipping favicon.ico — ${reason}`);
}

// Drop the SVGs in too so the head can reference them directly.
copyFileSync(FAVICON_SRC, resolve(outDir, 'favicon.svg'));
console.log('[build-icons] wrote public/favicon.svg');

copyFileSync(MASK_SRC, resolve(outDir, 'mask-icon.svg'));
console.log('[build-icons] wrote public/mask-icon.svg');

// Web app manifest. `start_url` and `scope` are base-prefixed (matches astro
// `base: '/kerf'` in astro.config.mjs). `theme_color` matches the lighter end
// of the favicon's red gradient — Android uses it for the toolbar tint when
// the site is added to home screen. `background_color` matches Starlight's
// dark surface so the splash transition stays consistent in either theme.
const manifest = {
  name: 'kerf',
  short_name: 'kerf',
  description: 'Tiny reactive UI framework — fine-grained signals + DOM diff + JSX. 6.6 KB, no virtual DOM, no compiler.',
  start_url: '/kerf/',
  scope: '/kerf/',
  display: 'minimal-ui',
  background_color: '#0d1117',
  theme_color: '#ef4370',
  icons: [
    { src: '/kerf/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/kerf/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/kerf/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync(resolve(outDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log('[build-icons] wrote public/site.webmanifest');

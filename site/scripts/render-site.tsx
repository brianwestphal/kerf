#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LEGACY_REDIRECTS, NAVIGATION, pageOutputPath } from './lib/site-content.mjs';
import { renderSiteDocument, type SitePage } from '../src/scripts/site-view';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '..');
const distDir = resolve(siteRoot, 'dist');
const pages = JSON.parse(await readFile(resolve(siteRoot, 'src/generated/pages.json'), 'utf8')) as SitePage[];

await cp(resolve(siteRoot, 'public'), distDir, { recursive: true, force: true });
for (const page of pages) {
  const output = pageOutputPath(distDir, page.path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, renderSiteDocument(pages, NAVIGATION, page.path));
}

for (const [source, target] of Object.entries(LEGACY_REDIRECTS)) {
  const redirectPath = resolve(distDir, source.slice(1), 'index.html');
  await mkdir(dirname(redirectPath), { recursive: true });
  await writeFile(redirectPath, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"><title>Redirecting…</title></head><body><a href="${target}">Continue to the corrected URL</a></body></html>`);
}

const notFound = pages.find((page) => page.path === '/')!;
await writeFile(resolve(distDir, '404.html'), renderSiteDocument([{ ...notFound, title: 'Page not found', description: 'The requested Kerf documentation page was not found.', html: '<p>The requested page does not exist. <a href="/kerf/">Return to the Kerf home page.</a></p>' }], NAVIGATION, '/'));

const urls = pages.map((page) => `  <url><loc>https://brianwestphal.github.io/kerf${page.path}</loc></url>`).join('\n');
await writeFile(resolve(distDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`[render-site] wrote ${pages.length} static Kerf pages, 404, redirect, and sitemap`);

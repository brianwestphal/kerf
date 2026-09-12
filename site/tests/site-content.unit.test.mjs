import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';

import { loadPages, pageOutputPath, parseFrontmatter, routeFromRelative } from '../scripts/lib/site-content.mjs';

test('frontmatter parsing separates portable metadata from Markdown', () => {
  const parsed = parseFrontmatter('---\ntitle: "Hello"\ndescription: A useful page\n---\n\nBody');
  assert.deepEqual(parsed.attributes, { title: 'Hello', description: 'A useful page' });
  assert.equal(parsed.body.trim(), 'Body');
});

test('content paths map to canonical trailing-slash routes and output files', () => {
  assert.equal(routeFromRelative('index.md'), '/');
  assert.equal(routeFromRelative('docs/overview.md'), '/docs/overview/');
  assert.equal(routeFromRelative('examples/basics/index.md'), '/examples/basics/');
  assert.equal(pageOutputPath('/tmp/dist', '/docs/overview/'), '/tmp/dist/docs/overview/index.html');
});

test('the complete content tree renders without framework-only imports', async () => {
  const siteRoot = resolve(import.meta.dirname, '..');
  const pages = await loadPages(siteRoot);
  assert.equal(pages.length, 52);
  assert.equal(new Set(pages.map((page) => page.path)).size, pages.length);
  assert.ok(pages.every((page) => page.title && page.description && page.html));
  assert.equal(pages.filter((page) => page.path !== '/migrating/astro/').some((page) => /@astrojs|\.astro\b/.test(page.html)), false);
  assert.match(pages.find((page) => page.path === '/')?.html ?? '', /Static at the door\. Kerf all the way through\./);
  assert.match(pages.find((page) => page.path === '/examples/basics/01-counter/')?.html ?? '', /run\/basics\/01-counter/);
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

// KF-WK5DEF: no Kerf UI component reaches the network on its own. Web
// Awesome's `wa-icon` resolves its default library from a CDN, so a component
// that rendered one (4.4.1's Select did, through `wa-select`) made every page
// using it fetch from Font Awesome, breaking offline and self-contained
// tools. Every Kerf component's catalog demo loads here and must request
// nothing but the catalog's own origin. The Web Awesome integration
// specimens are excluded: they render Web Awesome elements by design, and
// an application that registers those owns their icon library.

const catalog = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../../ai/component-catalog.json'),
    'utf8',
  ),
) as { entries: { id: string; source: string }[] };
const kerfIds = catalog.entries
  .filter((entry) => entry.source === 'kerf')
  .map((entry) => entry.id);

test('no Kerf UI component demo requests anything off its own origin', async ({
  page,
  baseURL,
}) => {
  test.slow();
  const origin = new URL(baseURL!).origin;
  const offsite: string[] = [];
  let current = '';
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (new URL(url).origin !== origin) offsite.push(`${current}: ${url}`);
  });
  expect(kerfIds.length).toBeGreaterThan(50);
  for (const id of kerfIds) {
    current = id;
    await page.goto(`/?component=${id}`);
    await page.waitForLoadState('networkidle');
  }
  expect(offsite).toEqual([]);
});

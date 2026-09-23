import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { computeDemoSourceFreshness } from '../../scripts/lib/demo-source-freshness.mjs';

test('focused browser verification serves the current demo source build', async ({
  request,
}) => {
  const current = await computeDemoSourceFreshness(
    resolve(import.meta.dirname, '../..'),
  );
  const response = await request.get('/source-freshness.json');

  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual(current);
});

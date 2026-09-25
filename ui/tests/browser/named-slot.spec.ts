import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/named-slot-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  if (!javascript) throw new Error('Named-slot fixture emitted no JavaScript');
  await page.setContent(
    '<named-slot-host data-named-slot-host></named-slot-host>',
  );
  await page.addScriptTag({ content: javascript.text });
}

async function assignedTitles(page: Page, name: string): Promise<string[]> {
  return page.locator('[data-named-slot-host]').evaluate((host, slotName) => {
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>(
      `slot[name="${slotName}"]`,
    );
    return (
      slot
        ?.assignedElements()
        .map((element) => element.textContent?.trim() ?? '') ?? []
    );
  }, name);
}

test('native named-slot assignment follows a component root across rerenders', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Local named-slot coverage is Chromium-first.',
  );
  await mountFixture(page);

  const banner = page.locator('[data-component="state-banner"]');
  await expect(banner).toHaveAttribute('slot', 'primary');
  expect(await assignedTitles(page, 'primary')).toEqual([
    'Projected statusThe same root moves between native named slots.',
  ]);
  expect(await assignedTitles(page, 'secondary')).toEqual([]);

  await banner.evaluate((element) => {
    Object.assign(element, { namedSlotIdentity: 'preserved' });
  });
  await page.evaluate(() => {
    (
      globalThis as typeof globalThis & {
        moveNamedSlot: (slot: 'primary' | 'secondary') => void;
      }
    ).moveNamedSlot('secondary');
  });

  await expect(banner).toHaveAttribute('slot', 'secondary');
  expect(
    await banner.evaluate((element) =>
      Reflect.get(element, 'namedSlotIdentity'),
    ),
  ).toBe('preserved');
  expect(await assignedTitles(page, 'primary')).toEqual([]);
  expect(await assignedTitles(page, 'secondary')).toEqual([
    'Projected statusThe same root moves between native named slots.',
  ]);
});

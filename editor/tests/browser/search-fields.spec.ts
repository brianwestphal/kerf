import { expect, type Locator, test } from '@playwright/test';

import { area } from './areas.js';
import { addChild, select } from './build.js';
import { settled } from './settled.js';

// KF-TBVRS4: picker-owned SearchFields use the same native deletion mechanics
// as the persistent Library, without wiring the separate play-stage subtree.
test('picker searches recover after keyboard deletion at wide and narrow widths', async ({
  page,
}, info) => {
  await page.route(/\/__kerf-ui-editor\/api\/file(?:\?|$)/, (route) =>
    route.fulfill({
      status: route.request().method() === 'PUT' ? 200 : 404,
      body: '',
    }),
  );
  await page.route(/\/__kerf-ui-editor\/api\/files(?:\?|$)/, (route) =>
    route.fulfill({ json: ['views/card.kui.json', 'views/summary.kui.json'] }),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const check = async (dialog: Locator, name: string) => {
    await settled(page);
    const query = dialog.getByRole('searchbox');
    const field = query.locator('..');
    for (const width of [1440, 390, 960, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await settled(page);
      await query.fill('zzzz-no-match');
      await query.press('ControlOrMeta+A');
      await query.press('Backspace');
      await expect(query).toBeEmpty();
      await expect(query.locator('br')).toHaveCount(0);
      await expect(field).toHaveAttribute('data-placeholder-visible', 'true');
      await expect(query).toBeFocused();
      await expect(field.locator('.kui-search-field__clear')).toBeHidden();
      const keyboard = (await field.boundingBox())!;
      await query.fill('zzzz-no-match');
      await field.locator('.kui-search-field__clear').click();
      await expect(field).toHaveAttribute('data-placeholder-visible', 'true');
      await expect(query).toBeFocused();
      const button = (await field.boundingBox())!;
      expect(Math.abs(keyboard.height - button.height)).toBeLessThan(1);
      expect(Math.abs(keyboard.width - button.width)).toBeLessThan(1);
      if (width === 390 || width === 1440) {
        await page.mouse.move(1, 1);
        await dialog.screenshot({
          path: info.outputPath(`KF-TBVRS4-${name}-${width}.png`),
          animations: 'disabled',
        });
      }
    }
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toBeHidden();
  };

  await select(page, 'composeButton');
  await area(page, 'Flow');
  await page.getByRole('button', { name: 'Other…', exact: true }).click();
  await check(page.locator('#editor-embed-dialog'), 'embed');

  await select(page, /^Pane/);
  await area(page, 'Children');
  await addChild(page, 'LucideIcon');
  await area(page, 'Properties');
  await page.getByRole('button', { name: 'Choose icon', exact: true }).click();
  await check(page.locator('#editor-icon-dialog'), 'icon');

  await select(page, /^Pane/);
  await area(page, 'Children');
  await addChild(page, 'Existing document…');
  await check(page.locator('#editor-insert-document-dialog'), 'insert');
});

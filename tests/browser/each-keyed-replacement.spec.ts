import { expect, test } from '@playwright/test';

test('a popover anchored in an each() row stays open through keyed object replacement', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as any).kerfReady === true);
  await page.addStyleTag({
    content:
      'body{font:16px system-ui;padding:24px}.kerf-popover{background:white;border:1px solid #888;padding:12px}',
  });
  await page.evaluate(() => {
    const { mount, signal, each } = (window as any).kerf;
    const { jsx, raw } = (window as any).jsxRuntime;
    const { popover } = (window as any).kerfOverlay;
    const rows = signal([{ id: 'topic-1', name: 'Topic initial' }]);
    const root = document.getElementById('root')!;
    mount(root, () =>
      jsx('div', {
        children: each(
          rows.value,
          (item: { id: string; name: string }) =>
            jsx('div', {
              'data-key': item.id,
              children: [
                jsx('span', { children: item.name }),
                jsx('button', { children: 'Actions' }),
              ],
            }),
          { key: 'topics' },
        ),
      }),
    );
    const row = root.querySelector('[data-key="topic-1"]')!;
    const anchor = row.querySelector('button')!;
    (window as any)._row = row;
    (window as any)._anchor = anchor;
    (window as any)._rows = rows;
    (window as any)._menu = popover(anchor, raw('<p>Menu remains open</p>'));
  });
  await expect(page.locator('.kerf-popover')).toBeVisible();

  const state = await page.evaluate(() => {
    const rows = (window as any)._rows;
    rows.value = [{ id: 'topic-1', name: 'Topic updated' }];
    const row = document.querySelector('[data-key="topic-1"]');
    return {
      sameRow: row === (window as any)._row,
      sameAnchor: row?.querySelector('button') === (window as any)._anchor,
      connected: (window as any)._anchor.isConnected,
    };
  });
  expect(state).toEqual({ sameRow: true, sameAnchor: true, connected: true });
  await expect(page.locator('[data-key="topic-1"]')).toContainText(
    'Topic updated',
  );
  await expect(page.locator('.kerf-popover')).toBeVisible();
  if (testInfo.project.name === 'chromium') {
    await page.screenshot({
      path: testInfo.outputPath('keyed-menu-after.png'),
    });
  }
});

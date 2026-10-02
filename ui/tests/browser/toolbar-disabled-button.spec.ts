import { expect, test } from '@playwright/test';

test('disabled native toolbar buttons stay dimmed without hover chrome', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=toolbar-control-group');
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.dataset.disabledToolbarFixture = 'true';
    host.style.cssText = 'display:flex;gap:8px;padding:8px;flex-wrap:wrap';
    host.innerHTML = `
      <div class="kui-toolbar-control-group" data-single="false">
        <button type="button" disabled aria-label="Unavailable">Unavailable</button>
        <button type="button" aria-label="Available">Available</button>
      </div>
      <div class="kui-toolbar-control-group" data-single="true">
        <button type="button" disabled aria-label="Lone unavailable">Lone unavailable</button>
      </div>
      <div class="kui-toolbar-control-group" data-single="false">
        <button type="button" disabled aria-label="Only unavailable">Only unavailable</button>
      </div>`;
    document.body.append(host);
  });

  const host = page.locator('[data-disabled-toolbar-fixture]');
  const disabled = host.getByRole('button', {
    name: 'Unavailable',
    exact: true,
  });
  const enabled = host.getByRole('button', { name: 'Available', exact: true });
  const lone = host.getByRole('button', { name: 'Lone unavailable' });
  const implicitLone = host.getByRole('button', { name: 'Only unavailable' });
  const chrome = async (button: typeof disabled) =>
    button.evaluate((node) => {
      const control = window.getComputedStyle(node);
      const group = window.getComputedStyle(node.parentElement!);
      return {
        cursor: control.cursor,
        opacity: control.opacity,
        background: control.backgroundColor,
        border: control.borderColor,
        groupBackground: group.backgroundColor,
      };
    });

  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 650 });
    for (const button of [disabled, lone, implicitLone]) {
      const resting = await chrome(button);
      await button.hover({ force: true });
      expect(await chrome(button)).toEqual(resting);
      expect(resting.cursor).toBe('not-allowed');
      expect(resting.opacity).toBe('0.5');
    }
    await enabled.hover();
    expect((await chrome(enabled)).cursor).toBe('pointer');
    await disabled.hover({ force: true });
    await host.screenshot({
      path: `test-results/toolbar-disabled-${testInfo.project.name}-${width}.png`,
    });
  }
});

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

test('disabled and aria-disabled controls are dimmed in every group variant', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-control-group');
  await page.waitForFunction(() => customElements.get('wa-button'));
  const variants = [
    'data-single="false"',
    'data-single="false" data-content="icon"',
    'data-single="false" data-content="mixed"',
    'data-single="false" data-size="compact"',
    'data-single="false" data-size="compact" data-content="icon"',
    'data-single="true" data-content="icon"',
  ];
  await page.evaluate(async (groups) => {
    const host = document.createElement('div');
    host.dataset.disabledVariantFixture = '';
    host.style.cssText = 'display:flex;gap:8px;padding:8px;flex-wrap:wrap';
    host.innerHTML = groups
      .map(
        (attributes, index) => `
        <div class="kui-toolbar-control-group" ${attributes}>
          <button type="button" disabled data-v="${index}-native">A</button>
          <button type="button" aria-disabled="true" data-v="${index}-aria">B</button>
          <wa-button disabled data-v="${index}-wa">C</wa-button>
          <button type="button" data-v="${index}-enabled">D</button>
        </div>`,
      )
      .join('');
    document.body.append(host);
    await Promise.all(
      [...host.querySelectorAll('wa-button')].map(
        (button) =>
          (button as HTMLElement & { updateComplete: Promise<unknown> })
            .updateComplete,
      ),
    );
  }, variants);
  const read = (selector: string) =>
    page.locator(selector).evaluate((element) => {
      const base =
        element.localName === 'wa-button'
          ? element.shadowRoot!.querySelector('[part~="base"]')!
          : element;
      return {
        opacity: globalThis.getComputedStyle(element).opacity,
        cursor: globalThis.getComputedStyle(base).cursor,
        background: globalThis.getComputedStyle(base).backgroundColor,
      };
    });
  for (const [index] of variants.entries()) {
    for (const kind of ['native', 'aria', 'wa']) {
      const selector = `[data-v="${index}-${kind}"]`;
      const resting = await read(selector);
      expect(resting, `${variants[index]} ${kind}`).toMatchObject({
        opacity: '0.5',
        cursor: 'not-allowed',
      });
      await page.locator(selector).hover({ force: true });
      expect((await read(selector)).background, selector).toBe(
        resting.background,
      );
    }
    expect(await read(`[data-v="${index}-enabled"]`)).toMatchObject({
      opacity: '1',
      cursor: 'pointer',
    });
  }
  await page.locator('[data-disabled-variant-fixture]').screenshot({
    path: 'test-results/toolbar-disabled-variants.png',
  });
});

import { expect, type Locator, test } from '@playwright/test';

const shadowRadius = (host: Locator) =>
  host.evaluate((element) => {
    const part = element.shadowRoot!.querySelector(
      '[part~="combobox"], [part~="base"]',
    )!;
    return window.getComputedStyle(part).borderTopLeftRadius;
  });

test('native and Web Awesome controls follow the Kerf rounded rectangle radius', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=list-inset-control');
  const example = page.locator('[data-catalog-example]', {
    has: page.locator('wa-input[label="Assignee"]'),
  });
  const input = example.locator('wa-input[label="Assignee"]');
  const select = example.locator('wa-select[name="demo-inset-status"]');
  const button = example.locator('wa-button');
  await expect(input).toBeVisible();

  await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.dataset.controlRadiusFixture = '';
    fixture.style.cssText =
      'display:flex;gap:12px;align-items:center;padding:16px;background:white;width:max-content';
    fixture.innerHTML = `
      <button type="button">Native button</button>
      <input aria-label="Native input" placeholder="Native input" />
      <select aria-label="Native select"><option>Native select</option></select>
      <textarea aria-label="Native textarea">Native textarea</textarea>
      <button class="wa-pill" type="button">Pill</button>
      <wa-button pill>Pill</wa-button>
    `;
    document.body.append(fixture);
  });
  const fixture = page.locator('[data-control-radius-fixture]');
  const native = fixture.locator(
    ':scope > button:not(.wa-pill), :scope > input, :scope > select, :scope > textarea',
  );

  for (const control of await native.all()) {
    await expect(control).toHaveCSS('border-top-left-radius', '12px');
  }
  for (const control of [input, select, button]) {
    await expect.poll(() => shadowRadius(control)).toBe('12px');
  }

  // A consumer can change the shared Kerf token without touching either family.
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      '--kui-layout-rounded-radius',
      '16px',
    ),
  );
  for (const control of await native.all()) {
    await expect(control).toHaveCSS('border-top-left-radius', '16px');
  }
  for (const control of [input, select, button]) {
    await expect.poll(() => shadowRadius(control)).toBe('16px');
  }
  await expect(fixture.locator('button.wa-pill')).toHaveCSS(
    'border-top-left-radius',
    '999px',
  );
  await expect
    .poll(() => shadowRadius(fixture.locator('wa-button[pill]')))
    .toBe('999px');

  await page.evaluate(() =>
    document.documentElement.style.removeProperty(
      '--kui-layout-rounded-radius',
    ),
  );
  if (browserName === 'chromium') {
    await example.screenshot({ path: 'test-results/control-radius-wide.png' });
    await fixture.screenshot({
      path: 'test-results/control-radius-native.png',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await example.screenshot({
      path: 'test-results/control-radius-narrow.png',
    });
  }
});

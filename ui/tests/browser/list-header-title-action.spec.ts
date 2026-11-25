import { expect, test } from '@playwright/test';

test('ListHeader title action controls rows without disclosure semantics', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/?component=list-header');
    const example = page.locator('[data-demo-list-header-title-action]');
    const title = example.getByRole('heading', { level: 3 });
    const button = title.getByRole('button', {
      name: 'Hide all Demo AI Shells',
    });
    const trailing = example.getByRole('button', { name: 'Add Demo AI Shell' });
    const rows = example.getByText('Design shell');

    await expect(button).toBeVisible();
    const labelInset = await button.evaluate((element) => {
      const label = element.querySelector('span');
      return label
        ? label.getBoundingClientRect().left -
            element.getBoundingClientRect().left
        : Infinity;
    });
    expect(labelInset).toBeLessThan(10);
    await expect(button).not.toHaveAttribute('aria-expanded');
    await expect(
      example.locator('[data-component="disclosure-arrow"]'),
    ).toHaveCount(0);
    await expect(rows).toBeVisible();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(
      example.getByRole('button', { name: 'Show all Demo AI Shells' }),
    ).toBeFocused();
    await expect(rows).toBeHidden();
    await trailing.click();
    await expect(rows).toBeHidden();
    await example
      .getByRole('button', { name: 'Show all Demo AI Shells' })
      .click();
    await expect(rows).toBeVisible();

    await page.mouse.move(0, 0);

    if (testInfo.project.name === 'chromium')
      await example.screenshot({
        path: testInfo.outputPath(`kf-j289n4-title-action-${width}.png`),
      });
  }
});

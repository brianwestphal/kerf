// KF-X2MRCT: a toggle header's trailing overflow button is its own focus
// stop and opens the section's commands without toggling the section.
import { expect, test } from '@playwright/test';

test('ListHeader toggle keeps a separate trailing overflow button', async ({
  page,
  browserName,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/?component=list-header');
    const example = page.locator('[data-demo-list-header-overflow]');
    const header = example.locator(
      '[data-component="list-header"][data-toggle="true"]',
    );
    const toggle = header.locator('.kui-list-header__toggle');
    const overflow = header.getByRole('button', { name: 'Group actions' });
    const rows = example.locator('#list-header-group-content');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(rows).toBeVisible();

    // Tab reaches the toggle, then the overflow button.
    await toggle.focus();
    // WebKit tabs to buttons only with Option held, as Safari does.
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(overflow).toBeFocused();

    // Pressing the overflow opens its popover and leaves the section open.
    await overflow.click();
    await expect(
      page.locator('#list-header-group-actions-popover'),
    ).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');

    // The label toggles the section.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(rows).toBeHidden();

    const geometry = await header.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const toggleBox = element
        .querySelector('.kui-list-header__toggle')!
        .getBoundingClientRect();
      const overflowBox = element
        .querySelector('[data-list-header-overflow]')!
        .getBoundingClientRect();
      return {
        afterToggle: overflowBox.left >= toggleBox.right,
        atEnd: Math.abs(overflowBox.right - box.right) <= 1,
        inside:
          overflowBox.top >= box.top - 1 &&
          overflowBox.bottom <= box.bottom + 1,
      };
    });
    expect(geometry).toEqual({ afterToggle: true, atEnd: true, inside: true });
    if (testInfo.project.name === 'chromium')
      await example.screenshot({
        path: testInfo.outputPath(
          `kf-x2mrct-list-header-overflow-${width}.png`,
        ),
      });
    // Leave the section open for the next width.
    await toggle.click();
  }
});

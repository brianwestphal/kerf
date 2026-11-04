// KF-KN9CPE: an embedded PopupMenu or Select shows its popup open at its
// trigger, in the document instead of the top layer, and inert; the Kerf UI
// editor's edit canvas shows a selected one this way.
import { expect, type Locator, type Page, test } from '@playwright/test';

const example = (page: Page, demo: string) =>
  page.locator(`[data-demo="${demo}"] [data-catalog-example]`).filter({
    has: page.locator('[data-catalog-example-label]', {
      hasText: 'Embedded Preview',
    }),
  });

const box = async (locator: Locator) => (await locator.boundingBox())!;

for (const width of [1280, 390]) {
  test(`an embedded PopupMenu and Select show their rows inert at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=popup-menu');
    const menu = example(page, 'popup-menu').locator('.kui-popup-menu');
    const rows = menu.locator('.kui-popup-menu__menu');
    await expect(rows).toBeVisible();
    await expect(rows.getByRole('menuitemcheckbox')).toHaveText([
      'By Name',
      'By Size',
    ]);
    const trigger = menu.locator('.kui-popup-menu__trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // At the trigger, start-aligned, in the document: no top layer.
    const [t, r] = [await box(trigger), await box(rows)];
    expect(Math.abs(r.y - (t.y + t.height))).toBeLessThan(2);
    expect(Math.abs(r.x - t.x)).toBeLessThan(2);
    expect(
      await rows.evaluate(
        (element) =>
          element.hasAttribute('popover') || element.matches(':popover-open'),
      ),
    ).toBe(false);
    // Inert: the trigger and the items neither open nor choose.
    await menu.evaluate((element) =>
      element.addEventListener('kui-menu-select', () => {
        (globalThis as { chosen?: number }).chosen =
          ((globalThis as { chosen?: number }).chosen ?? 0) + 1;
      }),
    );
    await trigger.click();
    await rows.getByText('By Size').click();
    expect(
      await page.evaluate(
        () => (globalThis as { chosen?: number }).chosen ?? 0,
      ),
    ).toBe(0);
    await expect(rows.getByText('By Size')).toBeVisible();
    await expect(rows.getByRole('menuitemcheckbox').nth(1)).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.locator(':popover-open')).toHaveCount(0);
    await rows.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: info.outputPath(`kf-kn9cpe-demo-menu-${width}.png`),
      animations: 'disabled',
    });

    await page.goto('/?component=select');
    const select = example(page, 'select').locator('.kui-select');
    const listbox = select.locator('.kui-select__popup');
    await expect(listbox).toBeVisible();
    await expect(select.getByRole('option')).toHaveText([
      'Compact',
      'Comfortable',
      'Spacious',
    ]);
    const field = select.locator('.kui-select__trigger');
    const [f, l] = [await box(field), await box(listbox)];
    expect(Math.abs(l.y - (f.y + f.height))).toBeLessThan(2);
    expect(Math.abs(l.x - f.x)).toBeLessThan(2);
    await field.click();
    await select.getByRole('option', { name: 'Spacious' }).click();
    await expect(select.locator('.kui-select__value')).toHaveText(
      'Comfortable',
    );
    expect(
      await select.evaluate((element) => element.hasAttribute('open')),
    ).toBe(false);
    await expect(page.locator(':popover-open')).toHaveCount(0);
    await listbox.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await page.screenshot({
      path: info.outputPath(`kf-kn9cpe-demo-select-${width}.png`),
      animations: 'disabled',
    });
  });
}

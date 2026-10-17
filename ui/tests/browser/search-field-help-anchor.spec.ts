import { expect, type Page, test } from '@playwright/test';

// The Structured Ticket Search help surface anchors to the whole SearchField,
// not to its help button: a field that wraps onto a second line at phone width
// stays fully visible, and the surface follows the field as new text or chips
// grow it (an anchor resize, with no page scroll or viewport resize).

const GAP = 4;

const geometry = (page: Page) =>
  page.evaluate(() => {
    const field = document
      .getElementById('catalog-search-field-help')!
      .closest('[data-component="search-field"]')!
      .getBoundingClientRect();
    const surface = document
      .querySelector('[role="dialog"][aria-label="Search Syntax"]')!
      .getBoundingClientRect();
    return {
      field: { top: field.top, bottom: field.bottom, height: field.height },
      surface: { top: surface.top, bottom: surface.bottom },
    };
  });

const clearOfField = ({
  field,
  surface,
}: Awaited<ReturnType<typeof geometry>>) =>
  Math.abs(surface.top - (field.bottom + GAP)) < 1 ||
  Math.abs(surface.bottom - (field.top - GAP)) < 1;

for (const width of [390, 1280]) {
  test(`search help clears the whole field and follows it as it grows at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=search-field');
    const demo = page.locator('[data-demo="search-field"]');
    const button = demo.getByRole('button', { name: 'Search Help' });
    await button.scrollIntoViewIfNeeded();
    await button.click();
    const surface = page.getByRole('dialog', { name: 'Search Syntax' });
    await expect(surface).toBeVisible();

    const opened = await geometry(page);
    // At phone width the field wraps: the surface sits beyond its last line
    // (or above its first), never over it.
    if (width === 390) expect(opened.field.height).toBeGreaterThan(50);
    expect(clearOfField(opened)).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`search-help-${width}-open.png`),
    });

    // Typing into the field keeps the help open (the field is its anchor),
    // and enough text wraps the field onto another line.
    const editor = demo.getByRole('searchbox', { name: 'Search Tickets' });
    await editor.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      const selection = document.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      (element as HTMLElement).focus();
    });
    await page.keyboard.type(
      ' is:open is:closed tag:triage tag:release owner:me due:today sort:updated label:regression',
    );
    await expect(surface).toBeVisible();
    await expect
      .poll(async () => (await geometry(page)).field.height)
      .toBeGreaterThan(opened.field.height);
    await expect
      .poll(async () => clearOfField(await geometry(page)))
      .toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`search-help-${width}-grown.png`),
    });
  });
}

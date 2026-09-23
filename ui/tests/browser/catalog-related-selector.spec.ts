import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function screenshotRelated(page: Page, path: string) {
  const clip = await page.locator('[data-catalog-related]').evaluate((root) => {
    const trigger = root.getBoundingClientRect();
    const menu = root
      .querySelector('wa-dropdown')
      ?.shadowRoot?.querySelector<HTMLElement>('[part~="menu"]')
      ?.getBoundingClientRect();
    const left = Math.max(
      0,
      Math.min(trigger.left, menu?.left ?? trigger.left) - 8,
    );
    const top = Math.max(
      0,
      Math.min(trigger.top, menu?.top ?? trigger.top) - 8,
    );
    const right = Math.min(
      window.innerWidth,
      Math.max(trigger.right, menu?.right ?? trigger.right) + 8,
    );
    const bottom = Math.min(
      window.innerHeight,
      Math.max(trigger.bottom, menu?.bottom ?? trigger.bottom) + 8,
    );
    return { x: left, y: top, width: right - left, height: bottom - top };
  });
  await page.screenshot({ path, clip });
}

test('related Components selector fits its trigger and popup content', async ({
  page,
  browserName,
}) => {
  for (const viewport of [
    { name: 'wide', width: 1440, height: 900 },
    { name: 'narrow', width: 390, height: 844 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto('/?component=lucide-icon');
    const related = page.locator('[data-catalog-related]');
    const trigger = related.locator('wa-button[slot="trigger"]');
    await expect(trigger).toContainText('Components');
    const triggerFit = await trigger.evaluate((element) => {
      const base =
        element.shadowRoot?.querySelector<HTMLElement>('[part~="base"]');
      const label = element.querySelector<HTMLElement>(
        '.kui-catalog__related-trigger',
      );
      const baseBounds = base?.getBoundingClientRect();
      const labelBounds = label?.getBoundingClientRect();
      return baseBounds && labelBounds
        ? {
            left: labelBounds.left - baseBounds.left,
            right: baseBounds.right - labelBounds.right,
          }
        : null;
    });
    expect(triggerFit?.left).toBeGreaterThanOrEqual(8);
    expect(triggerFit?.right).toBeGreaterThanOrEqual(8);

    await trigger.click();
    const firstHeading = related
      .locator('.kui-catalog__related-heading')
      .first();
    await expect(firstHeading).toBeVisible();
    const popupSpacing = await related.evaluate((root) => {
      const menu = root
        .querySelector('wa-dropdown')
        ?.shadowRoot?.querySelector<HTMLElement>('[part~="menu"]')
        ?.getBoundingClientRect();
      const textBounds = (element: HTMLElement | null | undefined) => {
        const text = [...(element?.childNodes ?? [])].find(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            Boolean(node.textContent?.trim()),
        );
        if (!text) return undefined;
        const range = document.createRange();
        range.selectNodeContents(text);
        return range.getBoundingClientRect();
      };
      const heading = textBounds(
        root.querySelector<HTMLElement>('.kui-catalog__related-heading'),
      );
      const longest = [
        ...root.querySelectorAll<HTMLElement>('wa-dropdown-item'),
      ]
        .map((item) => textBounds(item))
        .filter((bounds): bounds is DOMRect => Boolean(bounds))
        .sort((a, b) => b.width - a.width)[0];
      return menu && heading && longest
        ? {
            headingLeft: heading.left - menu.left,
            itemRight: menu.right - longest.right,
            menuLeft: menu.left,
            menuRight: menu.right,
          }
        : null;
    });
    expect(popupSpacing?.headingLeft).toBeGreaterThanOrEqual(15);
    expect(popupSpacing?.itemRight).toBeGreaterThanOrEqual(8);
    expect(popupSpacing?.menuLeft).toBeGreaterThanOrEqual(10);
    expect(popupSpacing?.menuRight).toBeLessThanOrEqual(viewport.width - 10);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
    if (browserName === 'chromium')
      await screenshotRelated(
        page,
        `test-results/catalog-related-selector-${viewport.name}.png`,
      );
  }
});

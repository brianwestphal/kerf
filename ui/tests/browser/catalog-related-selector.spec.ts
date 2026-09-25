import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function screenshotRelated(page: Page, path: string) {
  const clip = await page.locator('[data-catalog-related]').evaluate((root) => {
    const trigger = root.getBoundingClientRect();
    // `[data-catalog-related]` is the wa-dropdown itself.
    const menu = root.shadowRoot
      ?.querySelector<HTMLElement>('[part~="menu"]')
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
      // The trigger's default-slot content (icon + label) must keep a
      // real inset from the button chrome on both sides.
      const content = [...element.children]
        .filter((child) => !child.hasAttribute('slot'))
        .map((child) => child.getBoundingClientRect())
        .filter((bounds) => bounds.width > 0);
      const baseBounds = base?.getBoundingClientRect();
      return baseBounds && content.length >= 2
        ? {
            left:
              Math.min(...content.map((bounds) => bounds.left)) -
              baseBounds.left,
            right:
              baseBounds.right -
              Math.max(...content.map((bounds) => bounds.right)),
          }
        : null;
    });
    expect(triggerFit?.left).toBeGreaterThanOrEqual(8);
    expect(triggerFit?.right).toBeGreaterThanOrEqual(8);

    // Toolbar controls never wrap: the icon and label share one row, the icon
    // leading the label, and the trigger stays a single control height.
    const row = await trigger.evaluate((element) => {
      const [icon, label] = [...element.children]
        .filter((child) => !child.hasAttribute('slot'))
        .map((child) => child.getBoundingClientRect());
      const base = element.shadowRoot
        ?.querySelector<HTMLElement>('[part~="base"]')
        ?.getBoundingClientRect();
      return {
        centerDelta: Math.abs(
          (icon.top + icon.bottom) / 2 - (label.top + label.bottom) / 2,
        ),
        iconLeads: icon.right <= label.left,
        labelInsideBase:
          base !== undefined &&
          label.top >= base.top &&
          label.bottom <= base.bottom,
      };
    });
    expect(row.centerDelta).toBeLessThanOrEqual(2);
    expect(row.iconLeads).toBe(true);
    expect(row.labelInsideBase).toBe(true);

    await trigger.click();
    const firstHeading = related
      .locator('.kui-catalog__related-heading')
      .first();
    await expect(firstHeading).toBeVisible();
    const popupSpacing = await related.evaluate((root) => {
      const menu = root.shadowRoot
        ?.querySelector<HTMLElement>('[part~="menu"]')
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
            itemLeft: longest.left - menu.left,
            itemRight: menu.right - longest.right,
            menuLeft: menu.left,
            menuRight: menu.right,
          }
        : null;
    });
    // Group headings keep a real inset and share the item labels' text edge.
    expect(popupSpacing?.headingLeft).toBeGreaterThanOrEqual(10);
    expect(
      Math.abs(
        (popupSpacing?.headingLeft ?? 0) - (popupSpacing?.itemLeft ?? 0),
      ),
    ).toBeLessThanOrEqual(1);
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

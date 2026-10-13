import { expect, type Page, test } from '@playwright/test';

// The catalog frame is the named anchor a top-layer specimen positions
// against, and its in-flow children sit in a centered content column.

async function openExample(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/?component=layout');
  const example = page.locator('[data-layout-anchor-example]');
  const frame = example.locator('[data-catalog-example-viewport]');
  await expect(frame).toBeVisible();
  return { example, frame };
}

async function supportsAnchors(page: Page): Promise<boolean> {
  return page.evaluate(() => CSS.supports('anchor-name', '--a'));
}

for (const width of [1280, 390]) {
  test(`the frame is a named app-height anchor with a centered column at ${width}px`, async ({
    page,
  }) => {
    const { example, frame } = await openExample(page, width);
    await expect(frame).toHaveAttribute('data-min-height', 'app');
    await expect(frame).toHaveAttribute('data-content-width', 'compact');
    await expect(frame).toHaveAttribute('data-content-align', 'center');

    const metrics = await frame.evaluate((el) => {
      const style = globalThis.getComputedStyle(el);
      const frameRect = el.getBoundingClientRect();
      const borderLeft = parseFloat(style.borderLeftWidth);
      const borderRight = parseFloat(style.borderRightWidth);
      const column = [...el.children]
        .filter((child) => !child.hasAttribute('popover'))
        .map((child) => child.getBoundingClientRect());
      return {
        anchorName: style.getPropertyValue('anchor-name'),
        minHeight: parseFloat(style.minHeight),
        height: frameRect.height,
        innerLeft: frameRect.left + borderLeft,
        innerRight: frameRect.right - borderRight,
        column: column.map((rect) => ({
          left: rect.left,
          right: rect.right,
          width: rect.width,
        })),
      };
    });
    if (await supportsAnchors(page))
      expect(metrics.anchorName).toBe('--demo-shell-main');
    expect(metrics.minHeight).toBe(592);
    expect(metrics.height).toBeGreaterThanOrEqual(592);

    const innerWidth = metrics.innerRight - metrics.innerLeft;
    const expectedWidth = Math.min(innerWidth, 440);
    expect(metrics.column.length).toBeGreaterThan(0);
    for (const rect of metrics.column) {
      expect(Math.abs(rect.width - expectedWidth)).toBeLessThanOrEqual(0.5);
      const leftGap = rect.left - metrics.innerLeft;
      const rightGap = metrics.innerRight - rect.right;
      expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(0.5);
    }
    if (width === 1280) expect(innerWidth).toBeGreaterThan(440);
    await expect(example).toBeVisible();
  });

  test(`a top-layer popover anchors to the frame at ${width}px`, async ({
    page,
  }) => {
    test.skip(
      !(await page
        .setViewportSize({ width, height: 900 })
        .then(() => page.goto('/?component=layout'))
        .then(() => supportsAnchors(page))),
      'This engine has no CSS anchor positioning; the popup keeps UA placement.',
    );
    const { example, frame } = await openExample(page, width);
    await example.getByRole('button', { name: 'Show Request' }).click();
    const popup = page.locator('[data-anchored-request-popup]');
    await expect(popup).toBeVisible();
    expect(await popup.evaluate((el) => el.matches(':popover-open'))).toBe(
      true,
    );

    const geometry = async () => {
      const [frameRect, popupRect] = await Promise.all([
        frame.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: rect.right, bottom: rect.bottom };
        }),
        popup.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: rect.right, bottom: rect.bottom };
        }),
      ]);
      return { frameRect, popupRect };
    };
    // Docked 16px above the frame's bottom edge and centered on the frame.
    const dockOffset = (
      anchorRect: { bottom: number },
      popupBox: { bottom: number },
    ) => Math.abs(anchorRect.bottom - 16 - popupBox.bottom);
    const { frameRect, popupRect } = await geometry();
    expect(dockOffset(frameRect, popupRect)).toBeLessThan(1);
    const leftGap = popupRect.left - frameRect.left;
    const rightGap = frameRect.right - popupRect.right;
    expect(Math.abs(leftGap - rightGap)).toBeLessThan(1);
    expect(leftGap).toBeGreaterThanOrEqual(15.5);

    // It tracks the frame as the page scrolls, not the viewport.
    await page.mouse.wheel(0, -120);
    await expect
      .poll(async () => {
        const next = await geometry();
        return dockOffset(next.frameRect, next.popupRect);
      })
      .toBeLessThan(1);

    await popup.getByRole('button', { name: 'Deny' }).click();
    await expect(popup).toBeHidden();
  });
}

test('leaving the route dismisses the open top-layer popup', async ({
  page,
}) => {
  const { example } = await openExample(page, 1280);
  await example.getByRole('button', { name: 'Show Request' }).click();
  await expect(page.locator('[data-anchored-request-popup]')).toBeVisible();
  // In-app selection replaces the preview, which removes (and so hides) the
  // manual popover rather than leaving it stranded in the top layer.
  await page.locator('[data-catalog-sidebar] [data-item-id="pane"]').click();
  await expect(page.locator('[data-demo="pane"]')).toBeVisible();
  await expect(page.locator('[data-anchored-request-popup]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.querySelectorAll(':popover-open').length,
    ),
  ).toBe(0);
});

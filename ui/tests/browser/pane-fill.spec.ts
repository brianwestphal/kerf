import { expect, type Locator, type Page, test } from '@playwright/test';

// KF-RMEME0: `Pane fill` takes the height of a definite-height parent (or the
// rest of a flex column), so its header and footer pin to the parent's edges
// and its content scrolls between them. The default Pane keeps its content
// height. The Pane catalog's Fill example frames the Pane in a 360px block
// frame; its Height setting switches between `fill` and the default.

type Box = { top: number; bottom: number; height: number };

const box = (locator: Locator): Promise<Box> =>
  locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height };
  });

async function openFillExample(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/?component=pane');
  const pane = page.locator('[data-fill-demo="pane"]');
  await expect(pane).toBeVisible();
  const frame = page
    .locator('[data-catalog-example-viewport]')
    .filter({ has: pane });
  return { pane, frame };
}

async function chooseHeight(page: Page, value: 'fill' | 'content') {
  await page
    .locator('kui-select[name="pane-fill-height"]')
    .evaluate((element, next) => {
      (element as HTMLElement & { value: string }).value = next;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
}

/** The frame's content box: its padding edges, inside its border. */
const frameInner = (frame: Locator) =>
  frame.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const top = rect.top + parseFloat(style.borderTopWidth);
    return { top, bottom: top + element.clientHeight };
  });

test('a filled Pane fills its definite-height parent with pinned chrome and scrolling content', async ({
  page,
  browserName,
}) => {
  for (const width of [1440, 390]) {
    const { pane, frame } = await openFillExample(page, width);
    await expect(pane).toHaveAttribute('data-fill', 'true');
    const inner = await frameInner(frame);
    const root = await box(pane);
    expect(root.top).toBeCloseTo(inner.top, 0);
    expect(root.bottom).toBeCloseTo(inner.bottom, 0);
    const footer = pane.locator(':scope > .kui-pane__footer');
    expect((await box(footer)).bottom).toBeCloseTo(inner.bottom, 0);

    // Long content scrolls inside the content slot; the pane keeps the
    // parent's height and its header and footer stay where they were.
    const header = pane.locator(':scope > .kui-pane__header');
    const before = { header: await box(header), footer: await box(footer) };
    const scroll = await pane.evaluate((element) => {
      const content = element.querySelector<HTMLElement>(
        ':scope > .kui-pane__content',
      )!;
      for (let index = 0; index < 30; index += 1) {
        const item = document.createElement('div');
        item.className = 'kui-content-item';
        item.textContent = `Extra note ${index + 1}`;
        content.append(item);
      }
      content.scrollTop = content.scrollHeight;
      return {
        overflow: content.scrollHeight - content.clientHeight,
        scrollTop: content.scrollTop,
        rootScrollTop: element.scrollTop,
        height: element.getBoundingClientRect().height,
      };
    });
    expect(scroll.overflow).toBeGreaterThan(100);
    expect(scroll.scrollTop).toBeGreaterThan(100);
    expect(scroll.rootScrollTop).toBe(0);
    expect(scroll.height).toBeCloseTo(root.height, 0);
    expect((await box(header)).top).toBeCloseTo(before.header.top, 0);
    expect((await box(footer)).bottom).toBeCloseTo(before.footer.bottom, 0);
    if (browserName === 'chromium')
      await frame.screenshot({
        path: test.info().outputPath(`pane-fill-scrolled-${width}.png`),
      });
  }
});

test('a default Pane keeps its content height, and Reset restores the fill', async ({
  page,
}) => {
  const { pane, frame } = await openFillExample(page, 1440);
  await chooseHeight(page, 'content');
  await expect(pane).not.toHaveAttribute('data-fill');
  const inner = await frameInner(frame);
  const root = await box(pane);
  expect(root.top).toBeCloseTo(inner.top, 0);
  // Three short notes: the pane ends well above the frame's bottom edge, and
  // its footer follows the content directly.
  expect(root.bottom).toBeLessThan(inner.bottom - 40);
  const content = await box(pane.locator(':scope > .kui-pane__content'));
  const footer = await box(pane.locator(':scope > .kui-pane__footer'));
  expect(footer.top).toBeCloseTo(content.bottom, 0);
  expect(footer.bottom).toBeCloseTo(root.bottom, 0);

  await page.locator('[data-action="pane-reset"]').evaluate((button) => {
    (button as HTMLElement).click();
  });
  await expect(pane).toHaveAttribute('data-fill', 'true');
  expect((await box(pane)).bottom).toBeCloseTo(inner.bottom, 0);
});

test('a filled Pane takes the rest of a flex column', async ({ page }) => {
  const { pane, frame } = await openFillExample(page, 1440);
  const inner = await frameInner(frame);
  await frame.evaluate((element) => {
    element.style.display = 'flex';
    element.style.flexDirection = 'column';
    const bar = document.createElement('div');
    bar.setAttribute('data-test-bar', '');
    bar.style.height = '100px';
    bar.style.flex = 'none';
    element.prepend(bar);
  });
  const root = await box(pane);
  expect(root.top).toBeCloseTo(inner.top + 100, 0);
  expect(root.bottom).toBeCloseTo(inner.bottom, 0);
  expect(root.height).toBeCloseTo(inner.bottom - inner.top - 100, 0);
});

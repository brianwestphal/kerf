import { expect, test } from '@playwright/test';

// listWidth sizes the fixed list column with a cap relative to the split's own
// width, and SplitView fills any container with a definite block size without
// an app-side grid wrapper.

test('listWidth keeps its preferred size until the fractional cap takes over', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=split-view');
  const split = page.locator('#catalog-split-view-roomy');
  await expect(split).toHaveAttribute(
    'style',
    '--kui-split-view-list-width:min(15rem, 40%)',
  );
  const listWidthAt = (width: number) =>
    split.evaluate((element, splitWidth) => {
      (element as HTMLElement).style.width = `${splitWidth}px`;
      return element
        .querySelector<HTMLElement>('[data-split-list]')!
        .getBoundingClientRect().width;
    }, width);
  // 240px fits beside the detail; a 500px split caps the list at 40%.
  expect(Math.round(await listWidthAt(1000))).toBe(240);
  expect(Math.round(await listWidthAt(500))).toBe(200);
  const detail = await split.evaluate(
    (element) =>
      element
        .querySelector<HTMLElement>('[data-split-detail]')!
        .getBoundingClientRect().width,
  );
  expect(Math.round(detail)).toBe(300);
});

test('SplitView fills a definite-height container in block, flex, and grid layouts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=split-view');
  await expect(page.locator('#catalog-split-view-roomy')).toBeVisible();
  const sizes = await page.evaluate(() => {
    const source = document.querySelector('#catalog-split-view-roomy')!;
    const layouts: Record<string, (split: string) => string> = {
      block: (split) => `<div style="height:400px">${split}</div>`,
      popover: (split) =>
        `<div popover="manual" style="width:800px;height:400px">${split}</div>`,
      flexItem: (split) =>
        `<div style="display:flex;flex-direction:column;height:460px"><header style="flex:none;height:60px"></header>${split}</div>`,
      flexBody: (split) =>
        `<div style="display:flex;flex-direction:column;height:460px"><header style="flex:none;height:60px"></header><div style="flex:1;min-height:0">${split}</div></div>`,
      grid: (split) => `<div style="display:grid;height:400px">${split}</div>`,
    };
    const result: Record<string, { container: number; split: number }> = {};
    for (const [name, wrap] of Object.entries(layouts)) {
      const host = document.createElement('div');
      const clone = source.cloneNode(true) as HTMLElement;
      clone.id = `fill-${name}`;
      clone.removeAttribute('style');
      host.innerHTML = wrap(clone.outerHTML);
      document.body.append(host);
      const popover = host.querySelector<HTMLElement>('[popover]');
      popover?.showPopover();
      const split = host.querySelector<HTMLElement>(`#fill-${name}`)!;
      const container = split.parentElement!;
      const style = window.getComputedStyle(container);
      const content =
        container.clientHeight -
        Number.parseFloat(style.paddingTop) -
        Number.parseFloat(style.paddingBottom);
      result[name] = {
        container: Math.round(name === 'flexItem' ? content - 60 : content),
        split: Math.round(split.getBoundingClientRect().height),
      };
      popover?.hidePopover();
      host.remove();
    }
    return result;
  });
  for (const [name, { container, split }] of Object.entries(sizes))
    expect(split, name).toBe(container);
});

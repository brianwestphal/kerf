import { expect, test } from '@playwright/test';

test('grow, fill, and tiny collapsed visibility follow toolbar container width', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-control-group');
  await page.evaluate(() => {
    const specimen = document.querySelector<HTMLElement>(
      '[data-demo-section="toolbar-group-sizing"]',
    )!;
    const host = document.createElement('div');
    host.dataset.toolbarSizingFixture = 'true';
    host.style.width = '640px';
    host.append(specimen.cloneNode(true));
    document.body.append(host);
  });
  const host = page.locator('[data-toolbar-sizing-fixture]');
  const layout = async (width: number) => {
    await host.evaluate((node, targetWidth) => {
      (node as HTMLElement).style.width = `${targetWidth}px`;
    }, width);
    return host.evaluate((node) => {
      const toolbars = node.querySelectorAll<HTMLElement>('.kui-toolbar');
      const first = toolbars[0]!;
      const second = toolbars[1]!;
      const trailing = first.querySelector<HTMLElement>(
        '.kui-toolbar__trailing',
      )!;
      const grow = first.querySelector<HTMLElement>('[data-sizing="grow"]')!;
      const siblings = Array.from(
        first.querySelectorAll<HTMLElement>(
          '.kui-toolbar__trailing > .kui-toolbar-control-group:not([data-sizing="grow"])',
        ),
      );
      const fill = second.querySelector<HTMLElement>('[data-sizing="fill"]')!;
      const tiny = second.querySelector<HTMLElement>(
        '[data-visibility="hide-collapsed-tiny"]',
      )!;
      return {
        trailingWidth: trailing.getBoundingClientRect().width,
        growWidth: grow.getBoundingClientRect().width,
        fieldWidth: grow
          .querySelector<HTMLElement>('.kui-token-search')!
          .getBoundingClientRect().width,
        growTop: grow.getBoundingClientRect().top,
        siblingTops: siblings.map((group) => group.getBoundingClientRect().top),
        fillWidth: fill.getBoundingClientRect().width,
        fillZoneWidth: second
          .querySelector<HTMLElement>('.kui-toolbar__trailing')!
          .getBoundingClientRect().width,
        tinyDisplay: window.getComputedStyle(tiny).display,
      };
    });
  };

  const wide = await layout(640);
  expect(wide.growWidth).toBeGreaterThan(304);
  expect(wide.fieldWidth).toBeGreaterThan(wide.growWidth - 10);
  expect(wide.siblingTops).toEqual([wide.growTop, wide.growTop]);
  expect(wide.fillWidth).toBeCloseTo(wide.fillZoneWidth, 0);
  expect(wide.tinyDisplay).not.toBe('none');
  await host.screenshot({ path: 'test-results/toolbar-group-sizing-640.png' });

  const compact = await layout(480);
  expect(compact.growWidth).toBeCloseTo(compact.trailingWidth, 0);
  expect(compact.fieldWidth).toBeGreaterThan(compact.growWidth - 10);
  expect(compact.siblingTops.every((top) => top > compact.growTop)).toBe(true);
  expect(compact.fillWidth).toBeCloseTo(compact.fillZoneWidth, 0);
  await host.screenshot({ path: 'test-results/toolbar-group-sizing-480.png' });

  const tiny = await layout(224);
  expect(tiny.tinyDisplay).toBe('none');
  expect(tiny.fillWidth).toBeCloseTo(tiny.fillZoneWidth, 0);
  await host.screenshot({ path: 'test-results/toolbar-group-sizing-224.png' });
  await host.evaluate((node) => node.remove());
});

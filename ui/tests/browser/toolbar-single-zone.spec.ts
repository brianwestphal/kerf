import { expect, test } from '@playwright/test';

// A lone toolbar zone spans every column track: an absent zone's empty track
// and the column gap before it must not stop filling content short of the
// toolbar's opposite inline inset.
const toolbar = (zones: { leading?: boolean; trailing?: boolean }) =>
  `<header class="kui-toolbar" data-component="toolbar" data-has-center="false" data-center-align="center" data-responsive="none" data-responsive-at="narrow"><div class="kui-toolbar__leading">${zones.leading ? '<div data-fill style="flex: 1 1 auto; height: 20px"></div>' : ''}</div><div class="kui-toolbar__center"></div><div class="kui-toolbar__trailing">${zones.trailing ? '<div data-fill style="flex: 1 1 auto; height: 20px"></div>' : ''}</div></header>`;

test('a single-zone Toolbar fills its content box', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=toolbar');
  const host = page.locator('[data-demo="toolbar"]');
  await expect(host).toBeVisible();
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 800 });
    const geometry = await host.evaluate(
      (element, markup) => {
        const probe = document.createElement('div');
        probe.setAttribute('data-single-zone-probe', '');
        probe.innerHTML = markup.join('');
        element.prepend(probe);
        const result = [
          ...probe.querySelectorAll<HTMLElement>('.kui-toolbar'),
        ].map((bar) => {
          const box = bar.getBoundingClientRect();
          const style = window.getComputedStyle(bar);
          const fills = [
            ...bar.querySelectorAll<HTMLElement>('[data-fill]'),
          ].map((fill) => fill.getBoundingClientRect());
          return {
            start: box.left + parseFloat(style.paddingInlineStart),
            end: box.right - parseFloat(style.paddingInlineEnd),
            fills: fills.map((fill) => ({
              left: fill.left,
              right: fill.right,
            })),
          };
        });
        return result;
      },
      [
        toolbar({ leading: true }),
        toolbar({ trailing: true }),
        toolbar({ leading: true, trailing: true }),
      ],
    );
    const [leadingOnly, trailingOnly, both] = geometry;
    expect(leadingOnly.fills[0].left).toBeCloseTo(leadingOnly.start, 0);
    expect(leadingOnly.fills[0].right).toBeCloseTo(leadingOnly.end, 0);
    expect(trailingOnly.fills[0].left).toBeCloseTo(trailingOnly.start, 0);
    expect(trailingOnly.fills[0].right).toBeCloseTo(trailingOnly.end, 0);
    // Two zones keep the column gap between them.
    expect(both.fills[0].left).toBeCloseTo(both.start, 0);
    expect(both.fills[1].right).toBeCloseTo(both.end, 0);
    expect(both.fills[1].left - both.fills[0].right).toBeCloseTo(8, 0);
    await page
      .locator('[data-single-zone-probe]')
      .screenshot({ path: testInfo.outputPath(`single-zone-${width}.png`) });
    await page.evaluate(() =>
      document.querySelector('[data-single-zone-probe]')?.remove(),
    );
  }
});

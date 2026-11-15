import { expect, test } from '@playwright/test';

// KF-X9A8X9: an expanded search group in a shrink-to-fit zone (a TabBar's
// `end`) must contribute no more than its capped width. Its `min(token,
// 100%)` width is cyclic there, so its intrinsic contribution used to be the
// whole query on one line: the zone grew past its contents and squeezed the
// tab strip.
test('an expanded search group sizes a shrink-to-fit zone to its capped width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/?component=toolbar-control-group');
  const section = page.locator('[data-demo-section="toolbar-group-search"]');
  const group = section.locator('[data-component="toolbar-control-group"]');
  await group.locator('.kui-search-field__expand').click();
  const editor = group.locator('.kui-search-field__editor');
  await expect(editor).toBeVisible();
  await editor.fill('A long terminal query that runs past the field');

  // Move the live group into a TabBar end zone beside a flexible tab strip,
  // with the application's narrow expanded-width token.
  const measure = () =>
    page.evaluate(() => {
      const probe = document.querySelector<HTMLElement>('[data-probe]')!;
      const end = probe.querySelector<HTMLElement>('.kui-tab-bar__end')!;
      const children = [...end.children].map(
        (child) => child.getBoundingClientRect().width,
      );
      const style = window.getComputedStyle(end);
      const gaps =
        (Number.parseFloat(style.columnGap) || 0) *
        Math.max(0, children.length - 1);
      return {
        end: end.getBoundingClientRect().width,
        content:
          children.reduce((sum, width) => sum + width, 0) +
          gaps +
          Number.parseFloat(style.paddingLeft) +
          Number.parseFloat(style.paddingRight),
        group: children[0]!,
        strip: probe
          .querySelector<HTMLElement>('[data-probe-strip]')!
          .getBoundingClientRect().width,
      };
    });
  await group.evaluate((element) => {
    const probe = document.createElement('div');
    probe.dataset.probe = '';
    probe.className = 'kui-tab-bar';
    probe.style.cssText =
      'display:flex;width:360px;--kui-search-field-expanded-width:9rem';
    const strip = document.createElement('div');
    strip.dataset.probeStrip = '';
    strip.style.cssText = 'flex:1 1 0;min-width:0';
    strip.textContent = 'Tabs';
    const end = document.createElement('div');
    end.className = 'kui-tab-bar__end';
    end.append(element);
    probe.append(strip, end);
    document.body.prepend(probe);
  });

  await expect.poll(async () => (await measure()).group).toBeCloseTo(144, 0);
  const measured = await measure();
  expect(Math.abs(measured.end - measured.content)).toBeLessThan(1);
  // The strip keeps the rest of the bar (it was squeezed to a sliver).
  expect(measured.strip).toBeGreaterThan(180);
});

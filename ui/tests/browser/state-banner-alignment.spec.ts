import { expect, test } from '@playwright/test';

/**
 * A StateBanner's title, badge, and detail sit on one text line, so the title
 * and detail must share a baseline, and the copy, icon, and action must share
 * the banner's vertical center.
 *
 * The detail truncates, and WebKit takes the baseline of an inline-block
 * whose overflow is not `visible` from its bottom margin edge: a clipped
 * inline-block detail rose about 2px off the title's baseline there and
 * pushed the title and badge down, which read as misaligned contents. The
 * other engines use the text baseline, so this must run in WebKit to guard
 * the regression.
 *
 * Baselines are read from zero-size inline-block probes: an empty
 * inline-block's bottom edge sits exactly on its line's baseline. The spec
 * also asserts a probe never moves its host, since an atomic inline can
 * change how a clipped inline-block computes its own baseline.
 */
test('StateBanner title and detail share a baseline, and its parts share a center', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=state-banner');
  const banners = page.locator(
    '[data-demo="state-banner"] [data-component="state-banner"][data-copy-layout="inline"]:not([data-placeholder]):has(.kui-state-banner__detail)',
  );
  await expect(banners.first()).toBeVisible();
  const count = await banners.count();
  expect(count).toBeGreaterThanOrEqual(6);

  for (let index = 0; index < count; index += 1) {
    const banner = banners.nth(index);
    await banner.scrollIntoViewIfNeeded();
    const geometry = await banner.evaluate((element) => {
      let probeShift = 0;
      const probe = (host: Element) => {
        const hostTop = host.getBoundingClientRect().top;
        const marker = document.createElement('i');
        marker.style.cssText = 'display:inline-block;width:0;height:0';
        host.prepend(marker);
        const baseline = marker.getBoundingClientRect().bottom;
        probeShift = Math.max(
          probeShift,
          Math.abs(host.getBoundingClientRect().top - hostTop),
        );
        marker.remove();
        return baseline;
      };
      const center = (selector: string) => {
        const part = element.querySelector(selector);
        if (!part) return null;
        const rect = part.getBoundingClientRect();
        return rect.top + rect.height / 2;
      };
      const title = element.querySelector('.kui-state-banner__copy > strong')!;
      const detail = element.querySelector('.kui-state-banner__detail > span')!;
      const bannerRect = element.getBoundingClientRect();
      const detailTopBeforeProbe = detail.getBoundingClientRect().top;
      const titleBaseline = probe(title);
      const detailBaseline = probe(detail);
      return {
        tone: element.getAttribute('data-tone'),
        titleBaseline,
        detailBaseline,
        detailTopBeforeProbe,
        titleBottom: title.getBoundingClientRect().bottom,
        bannerCenter: bannerRect.top + bannerRect.height / 2,
        copyCenter: center('.kui-state-banner__copy'),
        iconCenter: center('.kui-state-banner__icon'),
        actionCenter: center('.kui-state-banner__action'),
        probeShift,
      };
    });

    // A probe that moved its host would measure a different layout.
    expect(geometry.probeShift, geometry.tone ?? '').toBeLessThanOrEqual(0.01);
    // One line: the detail is beside the title, not wrapped below it.
    expect(geometry.detailTopBeforeProbe, geometry.tone ?? '').toBeLessThan(
      geometry.titleBottom,
    );
    expect(
      Math.abs(geometry.detailBaseline - geometry.titleBaseline),
      `${String(geometry.tone)} detail baseline`,
    ).toBeLessThanOrEqual(0.5);
    for (const part of ['copyCenter', 'iconCenter', 'actionCenter'] as const) {
      const partCenter = geometry[part];
      if (partCenter === null) continue;
      expect(
        Math.abs(partCenter - geometry.bannerCenter),
        `${String(geometry.tone)} ${part}`,
      ).toBeLessThanOrEqual(1);
    }
  }
});

test('stacked StateBanner copy and action keep their reading order at wide and narrow widths', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=state-banner');
    const banner = page.locator(
      '[data-demo="state-banner"] [data-copy-layout="stacked"][data-action-placement="below"]',
    );
    await expect(banner).toBeVisible();
    await banner.scrollIntoViewIfNeeded();
    const geometry = await banner.evaluate((element) => {
      const bounds = (selector: string) =>
        element.querySelector(selector)!.getBoundingClientRect();
      const title = bounds('.kui-state-banner__copy > strong');
      const detail = bounds('.kui-state-banner__detail');
      const detailText = element.querySelector(
        '.kui-state-banner__detail > span',
      )!;
      const action = bounds('.kui-state-banner__action');
      const root = element.getBoundingClientRect();
      return {
        titleBottom: title.bottom,
        detailTop: detail.top,
        detailBottom: detail.bottom,
        actionTop: action.top,
        actionRight: action.right,
        rootRight: root.right,
        pageWidth: document.documentElement.clientWidth,
        detailOverflow: window.getComputedStyle(detailText).overflow,
        detailWhiteSpace: window.getComputedStyle(detailText).whiteSpace,
      };
    });
    expect(geometry.detailTop).toBeGreaterThanOrEqual(geometry.titleBottom);
    expect(geometry.actionTop).toBeGreaterThanOrEqual(geometry.detailBottom);
    expect(geometry.actionRight).toBeLessThanOrEqual(geometry.rootRight);
    expect(geometry.rootRight).toBeLessThanOrEqual(geometry.pageWidth);
    expect(geometry.detailOverflow).toBe('visible');
    expect(geometry.detailWhiteSpace).toBe('normal');
    await banner.screenshot({
      path: testInfo.outputPath(`state-banner-stacked-${width}.png`),
    });
  }
});

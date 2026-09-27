import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/** WCAG AA for body text; badge text and banner detail are small type. */
const TEXT_AA = 4.5;
/**
 * A placeholder skeleton inside a solid badge is a non-text loading shape, so
 * it is held to a regression floor rather than AA: the dark danger badge's
 * skeleton sat alone at 2.25:1 on a mid-red fill before the danger tone got
 * its own on-fill token. Each floor is the weakest tone's current value.
 */
const SKELETON_FLOOR = { light: 2.1, dark: 2.4 } as const;

const TONES = [
  'neutral',
  'info',
  'pop',
  'success',
  'warning',
  'danger',
] as const;

type ToneContrast = {
  title: number;
  detail: number;
  solidBadgeText: number;
  solidBadgeSkeleton: number;
  quietBadgeText: number;
  outlineBadgeText: number;
};

/**
 * Measures, per StateBanner tone, the contrast of the banner title and detail
 * over the banner fill, the solid badge's text and a placeholder skeleton over
 * the badge fill, and the same tone's quiet and outline Badge text. Colors are
 * composited on a canvas, so translucent fills and any opacity on the detail
 * count exactly as painted.
 */
function measureToneContrast(page: Page) {
  return page.evaluate(() => {
    const context = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true })!;
    context.canvas.width = 1;
    context.canvas.height = 1;
    const paint = (...layers: [color: string, alpha?: number][]) => {
      context.clearRect(0, 0, 1, 1);
      for (const [color, alpha = 1] of layers) {
        context.globalAlpha = alpha;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
      }
      context.globalAlpha = 1;
      return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const luminance = (rgb: number[]) => {
      const [r = 0, g = 0, b = 0] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: number[], b: number[]) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (light! + 0.05) / (dark! + 0.05);
    };
    const style = (element: Element) => window.getComputedStyle(element);
    const surface = style(document.body).backgroundColor;
    const results: Record<string, ToneContrast> = {};
    const banners = document.querySelectorAll<HTMLElement>(
      '[data-demo="state-banner"] [data-component="state-banner"]',
    );
    for (const banner of banners) {
      if (banner.closest('[data-demo-state-banner-override]')) continue;
      if (banner.dataset.placeholder) continue;
      const tone = banner.dataset.tone!;
      const bannerFill = paint([surface], [style(banner).backgroundColor]);
      const detail = style(banner.querySelector('.kui-state-banner__detail')!);
      const badge = banner.querySelector<HTMLElement>('.kui-badge')!;
      const badgeFill = paint([style(badge).backgroundColor]);
      const skeleton = document.createElement('span');
      skeleton.className = 'kui-skeleton';
      badge.append(skeleton);
      const skeletonFill = paint(
        [style(badge).backgroundColor],
        [style(skeleton).backgroundColor],
      );
      skeleton.remove();
      const probe = document.createElement('span');
      probe.className = 'kui-badge';
      probe.dataset.tone = tone === 'info' ? 'brand' : tone;
      probe.textContent = '1';
      banner.after(probe);
      const quiet = ratio(
        paint([style(probe).color]),
        paint([surface], [style(probe).backgroundColor]),
      );
      probe.dataset.appearance = 'outline';
      const outline = ratio(paint([style(probe).color]), paint([surface]));
      probe.remove();
      results[tone] = {
        title: ratio(
          paint([style(banner.querySelector('strong')!).color]),
          bannerFill,
        ),
        detail: ratio(
          paint(
            [surface],
            [style(banner).backgroundColor],
            [detail.color, Number(detail.opacity)],
          ),
          bannerFill,
        ),
        solidBadgeText: ratio(paint([style(badge).color]), badgeFill),
        solidBadgeSkeleton: ratio(skeletonFill, badgeFill),
        quietBadgeText: quiet,
        outlineBadgeText: outline,
      };
    }
    return results;
  });
}

test('every tone keeps AA text contrast on its fills in light and dark', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/?component=state-banner');
  await expect(
    page.locator('[data-demo="state-banner"] [data-component="state-banner"]'),
  ).toHaveCount(TONES.length + 2);

  for (const scheme of ['light', 'dark'] as const) {
    if (scheme === 'dark') {
      await page.locator('[data-action="toggle-theme"]').click();
      await expect(page.locator('html')).toHaveClass(/demo-dark/);
    }
    const measured = await measureToneContrast(page);
    expect(Object.keys(measured).sort()).toEqual([...TONES].sort());
    for (const tone of TONES) {
      const contrast = measured[tone]!;
      const where = `${tone} (${scheme})`;
      expect(contrast.title, `${where} banner title`).toBeGreaterThanOrEqual(
        TEXT_AA,
      );
      expect(contrast.detail, `${where} banner detail`).toBeGreaterThanOrEqual(
        TEXT_AA,
      );
      expect(
        contrast.solidBadgeText,
        `${where} solid badge text`,
      ).toBeGreaterThanOrEqual(TEXT_AA);
      expect(
        contrast.quietBadgeText,
        `${where} quiet badge text`,
      ).toBeGreaterThanOrEqual(TEXT_AA);
      expect(
        contrast.outlineBadgeText,
        `${where} outline badge text`,
      ).toBeGreaterThanOrEqual(TEXT_AA);
      expect(
        contrast.solidBadgeSkeleton,
        `${where} solid badge skeleton`,
      ).toBeGreaterThanOrEqual(SKELETON_FLOOR[scheme]);
    }
  }
});

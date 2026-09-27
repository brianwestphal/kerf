import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

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

/** Every tone with a loud fill, including Kerf-only pop. */
const LOUD_TONES = [
  'neutral',
  'brand',
  'pop',
  'success',
  'warning',
  'danger',
] as const;

/**
 * Contrast of each tone's `on-loud` text over its `fill-loud`, as the page
 * resolves the tokens: the pair Web Awesome's accent buttons, badges, and
 * checked controls paint. White once sat at ~2.2:1 on the success fill and
 * ~3.5:1 on the light brand and danger fills.
 */
function measureLoudPairs(page: Page) {
  return page.evaluate((tones) => {
    const context = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true })!;
    context.canvas.width = 1;
    context.canvas.height = 1;
    const paint = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
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
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolveColor = (token: string) => {
      probe.style.color = `var(${token})`;
      return paint(window.getComputedStyle(probe).color);
    };
    const results: Record<string, number> = {};
    for (const tone of tones) {
      const [light, dark] = [
        luminance(resolveColor(`--kui-color-${tone}-on-loud`)),
        luminance(resolveColor(`--kui-color-${tone}-fill-loud`)),
      ].sort((x, y) => y - x);
      results[`${tone}-on-loud over ${tone}-fill-loud`] =
        (light! + 0.05) / (dark! + 0.05);
    }
    probe.remove();
    return results;
  }, LOUD_TONES);
}

async function expectLoudPairsAA(page: Page, where: string) {
  const pairs = await measureLoudPairs(page);
  expect(Object.keys(pairs)).toHaveLength(LOUD_TONES.length);
  for (const [pair, value] of Object.entries(pairs))
    expect(value, `${pair} (${where})`).toBeGreaterThanOrEqual(TEXT_AA);
}

test('every tone keeps AA text contrast on its fills in light and dark', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/?component=state-banner');
  await expect(
    page.locator('[data-demo="state-banner"] [data-component="state-banner"]'),
  ).toHaveCount(2 * TONES.length + 2);

  for (const scheme of ['light', 'dark'] as const) {
    if (scheme === 'dark') {
      await page.locator('[data-action="toggle-theme"]').click();
      await expect(page.locator('html')).toHaveClass(/demo-dark/);
    }
    await expectLoudPairsAA(page, `${scheme}, Web Awesome theme`);
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

/**
 * The tone-text fixture bundled with and without `@kerfjs/ui/webawesome.css`.
 * Without it, the foundation's `var(--wa-*, fallback)` fallbacks are what the
 * page resolves: those once held single light-mode colors, so dark danger text
 * rendered dark red on a dark surface.
 */
const bundleToneText = (webAwesome: boolean) =>
  build({
    entryPoints: [resolve(import.meta.dirname, 'fixtures/tone-text-cases.tsx')],
    bundle: true,
    format: 'iife',
    outdir: 'out',
    platform: 'browser',
    write: false,
    loader: { '.woff2': 'empty', '.woff': 'empty', '.ttf': 'empty' },
    plugins: webAwesome
      ? []
      : [
          {
            name: 'omit-webawesome-css',
            setup(pluginBuild) {
              pluginBuild.onResolve(
                { filter: /^@kerfjs\/ui\/webawesome\.css$/ },
                () => ({ path: 'webawesome.css', namespace: 'omitted' }),
              );
              pluginBuild.onLoad(
                { filter: /.*/, namespace: 'omitted' },
                () => ({ contents: '', loader: 'css' }),
              );
            },
          },
        ],
  });
const toneTextBundles = {
  withWebAwesome: bundleToneText(true),
  withoutWebAwesome: bundleToneText(false),
};

async function mountToneText(
  page: Page,
  webAwesome: boolean,
  colorScheme: 'light' | 'dark',
) {
  const result = await (webAwesome
    ? toneTextBundles.withWebAwesome
    : toneTextBundles.withoutWebAwesome);
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Tone-text fixture emitted no JS');
  await page.emulateMedia({ colorScheme });
  // Pin the scheme on the root: Web Awesome's theme layer otherwise sets
  // `color-scheme: light` on `:root` unless a `.wa-dark` class opts out.
  await page.setContent(
    `<!doctype html><html lang="en" style="color-scheme:${colorScheme}"><body><main class="kui-app-root" style="display:block;height:auto" data-tone-text-cases></main></body></html>`,
  );
  // The fixture resolves package CSS from source, so apply the pixel-first
  // remify() authoring transform the package build performs.
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
}

/** Tones Web Awesome's theme also defines; pop is Kerf-only. */
const WA_TONES = ['neutral', 'brand', 'success', 'warning', 'danger'] as const;

/**
 * Every color token foundation.css declares, read from the stylesheet itself
 * so a newly added token is covered without editing this list. Tokens with no
 * Web Awesome counterpart (pop, the on-fill family) resolve identically by
 * construction; the rest must fall back to exactly the theme's value.
 */
const FOUNDATION_COLOR_TOKENS = [
  ...new Set(
    [
      ...readFileSync(
        resolve(import.meta.dirname, '../../src/foundation.css'),
        'utf8',
      ).matchAll(/^\s*(--kui-color-[a-z-]+):/gm),
    ].map((match) => match[1]!),
  ),
];

/**
 * Every elevation token foundation.css declares (`--kui-shadow-*`), read the
 * same way. Web Awesome's theme builds its shadows from offset/blur/spread
 * scales and a scheme-aware `--wa-color-shadow`; the fallbacks once held
 * fixed light-mode shadows, so an unthemed dark page lost its elevation.
 */
const FOUNDATION_SHADOW_TOKENS = [
  ...new Set(
    [
      ...readFileSync(
        resolve(import.meta.dirname, '../../src/foundation.css'),
        'utf8',
      ).matchAll(/^\s*(--kui-shadow-[a-z-]+):/gm),
    ].map((match) => match[1]!),
  ),
];

/**
 * Every foundation color and elevation token as the page resolves it, keyed by
 * its custom property, plus the focus ring's resolved outline.
 */
function resolveColorTokens(page: Page) {
  return page.evaluate(
    ([colors, shadows]) => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const out: Record<string, string> = {};
      for (const name of colors) {
        probe.style.color = `var(${name})`;
        out[name] = window.getComputedStyle(probe).color;
      }
      for (const name of shadows) {
        probe.style.boxShadow = `var(${name})`;
        out[name] = window.getComputedStyle(probe).boxShadow;
      }
      probe.style.outline = 'var(--kui-focus-ring)';
      const ring = window.getComputedStyle(probe);
      out['--kui-focus-ring'] =
        `${ring.outlineStyle} ${ring.outlineWidth} ${ring.outlineColor}`;
      probe.remove();
      return out;
    },
    [FOUNDATION_COLOR_TOKENS, FOUNDATION_SHADOW_TOKENS] as const,
  );
}

/** Toned text contrast over the surface and the page (surface-lowered). */
function measureTonedText(page: Page) {
  return page.evaluate((tones) => {
    const context = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true })!;
    context.canvas.width = 1;
    context.canvas.height = 1;
    const paint = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
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
    const ratio = (a: string, b: string) => {
      const [light, dark] = [luminance(paint(a)), luminance(paint(b))].sort(
        (x, y) => y - x,
      );
      return (light! + 0.05) / (dark! + 0.05);
    };
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolveColor = (token: string) => {
      probe.style.color = `var(${token})`;
      return window.getComputedStyle(probe).color;
    };
    const backgrounds = {
      surface: resolveColor('--kui-color-surface'),
      page: window.getComputedStyle(document.body).backgroundColor,
    };
    const foregrounds: Record<string, string> = {
      'Text danger': window.getComputedStyle(
        document.querySelector('.kui-text[data-tone="danger"]')!,
      ).color,
    };
    for (const tone of tones)
      for (const level of ['quiet', 'normal'])
        foregrounds[`${tone}-on-${level}`] = resolveColor(
          `--kui-color-${tone}-on-${level}`,
        );
    probe.remove();
    const results: Record<string, number> = {};
    for (const [name, foreground] of Object.entries(foregrounds))
      for (const [where, background] of Object.entries(backgrounds))
        results[`${name} over ${where}`] = ratio(foreground, background);
    return results;
  }, WA_TONES);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`without webawesome.css the foundation resolves Web Awesome's color palette and toned text keeps AA (${colorScheme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // The token list is parsed from the stylesheet: guard against a parse
    // that silently matches nothing or misses the non-tone tokens.
    expect(FOUNDATION_COLOR_TOKENS).toEqual(
      expect.arrayContaining([
        '--kui-color-surface-raised',
        '--kui-color-text-link',
        '--kui-color-border',
        ...WA_TONES.map((tone) => `--kui-color-${tone}-on-loud`),
      ]),
    );
    expect(FOUNDATION_SHADOW_TOKENS).toEqual(
      expect.arrayContaining(['--kui-shadow-s', '--kui-shadow-l']),
    );
    await mountToneText(page, true, colorScheme);
    const themed = await resolveColorTokens(page);
    await mountToneText(page, false, colorScheme);
    // Parity: every foundation color token (not only the tones), every
    // elevation token, and the focus ring resolve identically from the
    // foundation's own fallback.
    for (const shadow of FOUNDATION_SHADOW_TOKENS)
      expect(themed[shadow], `${shadow} resolves (${colorScheme})`).not.toBe(
        'none',
      );
    expect(await resolveColorTokens(page)).toEqual(themed);

    await expectLoudPairsAA(page, `${colorScheme}, no Web Awesome`);
    const contrast = await measureTonedText(page);
    // Toned text is held to AA over the lowered page background as well as
    // the surface, in both schemes. The light brand/success/warning on-quiet
    // values once reached only ~4.1:1 on the page (#f2f2f7); the parity check
    // above makes this measurement hold with the theme too.
    expect(
      Object.keys(contrast).filter((where) => where.endsWith(' over page')),
    ).toHaveLength(1 + 2 * WA_TONES.length);
    for (const [where, value] of Object.entries(contrast)) {
      expect(
        value,
        `${where} (${colorScheme}, no Web Awesome)`,
      ).toBeGreaterThanOrEqual(TEXT_AA);
    }
  });
}

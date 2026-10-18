import { readFile } from 'node:fs/promises';

import { expect, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';

// The opt-in brand (foundation.css): an app that sets --kui-color-brand gets
// the whole brand ramp in its hue, every pair at WCAG AA for any hue and
// chroma; unset, every brand token keeps its tuned literal exactly.

type Rgb = number[];
const SCHEMES = ['light', 'dark'] as const;

const DEFAULTS: Record<(typeof SCHEMES)[number], Record<string, Rgb>> = {
  light: {
    fill: [0, 117, 219],
    onQuiet: [12, 98, 243],
    onFill: [26, 93, 207],
    focus: [0, 122, 255],
  },
  dark: {
    fill: [100, 210, 255],
    onQuiet: [138, 203, 255],
    onFill: [138, 203, 255],
    focus: [100, 210, 255],
  },
};

async function load(page: Page, webAwesome: boolean) {
  const foundation = await readFile('dist/styles/foundation.css', 'utf8');
  // Only Kerf's theme layer is measured; its @import of Web Awesome's own
  // stylesheet does not resolve here.
  const theme = webAwesome
    ? (await readFile('dist/styles/webawesome.css', 'utf8')).replace(
        /@import[^;]+;/g,
        '',
      )
    : '';
  await page.setContent(
    `<style>${theme}${foundation}</style><div id="probe"></div>`,
  );
}

/**
 * Resolve the brand ramp for each brand (or the defaults for `null`) in one
 * scheme, as painted sRGB pixels with translucent layers composited over the
 * surface they sit on.
 */
function resolve(
  page: Page,
  scheme: 'light' | 'dark',
  brands: readonly (string | null)[],
) {
  return page.evaluate(
    ({ scheme, brands }) => {
      const root = document.documentElement;
      const probe = document.querySelector<HTMLElement>('#probe')!;
      root.style.colorScheme = scheme;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const paint = (...layers: string[]) => {
        context.clearRect(0, 0, 1, 1);
        for (const layer of layers) {
          context.fillStyle = layer;
          context.fillRect(0, 0, 1, 1);
        }
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const token = (name: string) => {
        probe.style.color = `var(${name})`;
        return window.getComputedStyle(probe).color;
      };
      return brands.map((brand) => {
        if (brand === null) root.style.removeProperty('--kui-color-brand');
        else root.style.setProperty('--kui-color-brand', brand);
        probe.style.outline = 'var(--kui-focus-ring)';
        const focus = window.getComputedStyle(probe).outlineColor;
        const surface = token('--kui-color-surface');
        return {
          brand,
          fill: paint(token('--kui-color-brand-fill-loud')),
          onLoud: paint(token('--kui-color-brand-on-loud')),
          onQuiet: paint(token('--kui-color-brand-on-quiet')),
          onFill: paint(token('--kui-color-brand-on-fill')),
          focus: paint(focus),
          surface: paint(surface),
          page: paint(surface, token('--kui-color-surface-lowered')),
          fillNormal: paint(surface, token('--kui-color-brand-fill-normal')),
          fillQuiet: paint(surface, token('--kui-color-brand-fill-quiet')),
        };
      });
    },
    { scheme, brands },
  );
}

const close = (actual: Rgb, expected: Rgb) =>
  actual.every((channel, index) => Math.abs(channel - expected[index]!) <= 1);

/** Hue of an sRGB color in degrees, or null for a near-gray. */
function hue([r, g, b]: Rgb) {
  const max = Math.max(r!, g!, b!);
  const min = Math.min(r!, g!, b!);
  const d = max - min;
  if (d < 16) return null;
  const h =
    max === r
      ? ((g! - b!) / d) % 6
      : max === g
        ? (b! - r!) / d + 2
        : (r! - g!) / d + 4;
  return (h * 60 + 360) % 360;
}

const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

// Every hue at a muted, a typical, and a vivid chroma, from a dark, a mid,
// and a light brand color.
const SWEEP = Array.from({ length: 36 }, (_, step) => step * 10).flatMap((h) =>
  [0.04, 0.12, 0.2, 0.3].flatMap((c) =>
    [0.35, 0.6, 0.85].map((l) => `oklch(${l} ${c} ${h})`),
  ),
);

for (const webAwesome of [false, true]) {
  const name = webAwesome ? 'with the Web Awesome theme' : 'Kerf only';

  test(`an unset brand keeps every tuned literal (${name})`, async ({
    page,
  }) => {
    await load(page, webAwesome);
    for (const scheme of SCHEMES) {
      const [colors] = await resolve(page, scheme, [null]);
      for (const key of ['fill', 'onQuiet', 'onFill', 'focus'] as const)
        expect(
          close(colors![key], DEFAULTS[scheme][key]!),
          `${scheme} ${key} ${JSON.stringify(colors![key])}`,
        ).toBe(true);
    }
  });

  test(`--kui-color-brand derives an AA brand ramp for any hue (${name})`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await load(page, webAwesome);
    const failures: string[] = [];
    for (const scheme of SCHEMES) {
      for (const colors of await resolve(page, scheme, SWEEP)) {
        const label = `${scheme} ${colors.brand}`;
        const pairs = [
          ['onLoud', 'fill', 4.5],
          ['onQuiet', 'page', 4.5],
          ['onQuiet', 'surface', 4.5],
          ['onFill', 'fillNormal', 4.5],
          ['onFill', 'fillQuiet', 4.5],
          ['focus', 'page', 3],
          ['focus', 'surface', 3],
        ] as const;
        for (const [text, background, minimum] of pairs) {
          const ratio = contrastRatio(colors[text], colors[background])!;
          if (ratio < minimum)
            failures.push(
              `${label}: ${text} on ${background} ${ratio.toFixed(2)}`,
            );
        }
        // Vivid brands keep their hue in the text, not the default blue.
        const brandHue = hue(colors.fill);
        const textHue = hue(colors.onQuiet);
        if (
          brandHue !== null &&
          textHue !== null &&
          hueDistance(brandHue, textHue) > 40
        )
          failures.push(`${label}: onQuiet hue ${textHue} vs ${brandHue}`);
      }
    }
    expect(failures, failures.slice(0, 20).join('\n')).toEqual([]);
  });
}

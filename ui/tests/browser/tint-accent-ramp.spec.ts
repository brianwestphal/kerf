import { readFile } from 'node:fs/promises';

import { expect, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';

const SWEEP = Array.from({ length: 36 }, (_, step) => step * 10).flatMap((h) =>
  [0.04, 0.12, 0.2, 0.3].flatMap((c) =>
    [0.35, 0.6, 0.85].map((l) => `oklch(${l} ${c} ${h})`),
  ),
);

async function load(page: Page, webAwesome: boolean) {
  const foundation = await readFile('dist/styles/foundation.css', 'utf8');
  const theme = webAwesome
    ? (await readFile('dist/styles/webawesome.css', 'utf8')).replace(
        /@import[^;]+;/g,
        '',
      )
    : '';
  await page.setContent(
    `<style>${theme}${foundation}</style><div id="scope" data-kui-tint-accent><div id="probe"></div></div>`,
  );
}

function resolve(page: Page, scheme: 'light' | 'dark', tint: string) {
  return page.evaluate(
    ({ scheme, tint, accents }) => {
      const scope = document.querySelector<HTMLElement>('#scope')!;
      const probe = document.querySelector<HTMLElement>('#probe')!;
      scope.dataset.kuiTint = scheme;
      scope.style.colorScheme = scheme;
      scope.style.setProperty('--_kui-tint-color', tint);
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
      return accents.map((accent) => {
        scope.style.setProperty('--_kui-tint-accent', accent);
        probe.style.outline = '1px solid var(--wa-color-focus)';
        const focus = window.getComputedStyle(probe).outlineColor;
        const surface = token('--kui-color-surface');
        return {
          accent,
          fill: paint(token('--kui-color-brand-fill-loud')),
          onLoud: paint(token('--kui-color-brand-on-loud')),
          onQuiet: paint(token('--kui-color-brand-on-quiet')),
          onFill: paint(token('--kui-color-brand-on-fill')),
          focus: paint(focus),
          surface: paint(surface),
          raised: paint(token('--kui-color-surface-raised')),
          fillNormal: paint(surface, token('--kui-color-brand-fill-normal')),
          fillQuiet: paint(surface, token('--kui-color-brand-fill-quiet')),
        };
      });
    },
    { scheme, tint, accents: SWEEP },
  );
}

for (const webAwesome of [false, true]) {
  test(`scoped tint accents keep AA across hue and chroma (${webAwesome ? 'Web Awesome' : 'Kerf only'})`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await load(page, webAwesome);
    const worst = new Map<
      string,
      { ratio: number; minimum: number; accent: string }
    >();
    for (const scheme of ['light', 'dark'] as const) {
      const tints =
        scheme === 'light' ? ['#e6edfb', '#ff0000'] : ['#1b2438', '#ff0000'];
      for (const tint of tints)
        for (const colors of await resolve(page, scheme, tint)) {
          const pairs = [
            ['onLoud', 'fill', 4.5],
            ['onQuiet', 'surface', 4.5],
            ['onQuiet', 'raised', 4.5],
            ['onFill', 'fillNormal', 4.5],
            ['onFill', 'fillQuiet', 4.5],
            ['focus', 'surface', 3],
            ['focus', 'raised', 3],
          ] as const;
          for (const [foreground, background, minimum] of pairs) {
            const ratio = contrastRatio(
              colors[foreground],
              colors[background],
            )!;
            const key = `${scheme} tint ${tint}: ${foreground} on ${background}`;
            if (ratio < (worst.get(key)?.ratio ?? Infinity))
              worst.set(key, { ratio, minimum, accent: colors.accent });
          }
        }
    }
    const failures = [...worst].flatMap(([pair, { ratio, minimum, accent }]) =>
      ratio < minimum ? [`${pair} ${ratio.toFixed(2)} (${accent})`] : [],
    );
    expect(failures).toEqual([]);
  });
}

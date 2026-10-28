import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { build } from 'esbuild';
import { chromium } from 'playwright';

import {
  captureCss,
  COMPONENTS,
  frameCss,
  readTemplateCss,
  resolveDomotion,
  resolveTemplateStyles,
  THEMES,
} from '../../build-design-templates.mjs';
import { restoreDotPaths } from '../shared/capture-svg.mjs';

const exec = promisify(execFile);
const uiRoot = resolve(import.meta.dirname, '../../..');
export const defaultOutput = resolve(uiRoot, 'docs/design/sketch/advanced');

// Keys are authored per individual component. A showcase reorder must change
// this table deliberately instead of silently moving a consumer's Symbol ID.
export const targets = {
  select: { form: ['control'], icons: ['control'], compact: ['control'] },
  'search-field': { tokens: ['control'], empty: ['control'] },
  'tag-field': { tags: ['control'], error: ['control'] },
  slider: { readout: ['control'], ticks: ['control'], compact: ['control'] },
  'color-field': {
    hint: ['control'],
    compact: ['control'],
    error: ['control'],
  },
  'color-picker': { rgb: ['control'], hsb: ['control'], gray: ['control'] },
  'color-swatches': { palette: ['control'] },
};

export function verifyTargets() {
  assert.deepEqual(
    Object.keys(targets).sort(),
    [
      'select',
      'search-field',
      'tag-field',
      'slider',
      'color-field',
      'color-picker',
      'color-swatches',
    ].sort(),
  );
  let variants = 0;
  let individuals = 0;
  for (const [component, cases] of Object.entries(targets)) {
    const spec = COMPONENTS[component];
    assert.deepEqual(
      Object.keys(cases).sort(),
      spec.variants.map((item) => item.id).sort(),
    );
    for (const variant of spec.variants) {
      const keys = cases[variant.id];
      assert.equal(new Set(keys).size, keys.length);
      const source = String(variant.render());
      assert.equal(
        source.split(`data-component="${component}"`).length - 1,
        keys.length,
        `${component}/${variant.id} source root count changed`,
      );
      variants++;
      individuals += keys.length;
    }
  }
  assert.equal(variants, 17);
  assert.equal(individuals, 17);
}

const title = (value) =>
  value.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function normalizeGradientStops(svg) {
  return svg.replace(
    /stop-color="hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)"/g,
    (_, hue, saturation, lightness) => {
      const h = ((Number(hue) % 360) + 360) % 360;
      const s = Number(saturation) / 100;
      const l = Number(lightness) / 100;
      const chroma = (1 - Math.abs(2 * l - 1)) * s;
      const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
      const sector = Math.floor(h / 60);
      const channels = [
        [chroma, second, 0],
        [second, chroma, 0],
        [0, chroma, second],
        [0, second, chroma],
        [second, 0, chroma],
        [chroma, 0, second],
      ][sector];
      const offset = l - chroma / 2;
      const hex = channels
        .map((channel) =>
          Math.round((channel + offset) * 255)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
      return `stop-color="#${hex}"`;
    },
  );
}

function normalizeCheckerboard(svg, theme) {
  const base = theme === 'dark' ? [28, 28, 30] : [255, 255, 255];
  return svg.replace(
    /(class="dt-checker-dark" fill=")rgba\((\d+), (\d+), (\d+), ([\d.]+)\)"/g,
    (_, prefix, red, green, blue, alpha) => {
      const opacity = Number(alpha);
      const color = [red, green, blue]
        .map((channel, index) =>
          Math.round(Number(channel) * opacity + base[index] * (1 - opacity)),
        )
        .join(', ');
      return `${prefix}rgb(${color})"`;
    },
  );
}

export async function captureAdvanced(
  output = defaultOutput,
  selected = Object.keys(targets),
) {
  verifyTargets();
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const domotion = await resolveDomotion();
  const temp = await mkdtemp(join(tmpdir(), 'kerf-sketch-advanced-'));
  const fixtures = [];
  try {
    for (const component of selected) {
      assert.ok(targets[component], `Unknown advanced component: ${component}`);
      const spec = COMPONENTS[component];
      const css = await readTemplateCss(await resolveTemplateStyles(spec.css));
      for (const variant of spec.variants) {
        const keys = targets[component][variant.id];
        for (const theme of THEMES) {
          let index = 0;
          const markup = String(variant.render()).replaceAll(
            `data-component="${component}"`,
            () =>
              `data-component="${component}" data-sketch-target="${index++}"`,
          );
          assert.equal(index, keys.length);
          const frameWidth = variant.frameWidth ?? spec.frameWidth;
          const width =
            typeof frameWidth === 'number' ? `${frameWidth}px` : frameWidth;
          const wiring = variant.wire
            ? `<script>${(await build({ stdin: { contents: variant.wire, resolveDir: resolve(uiRoot, '..') }, bundle: true, format: 'iife', write: false })).outputFiles[0].text}</script>`
            : '';
          const source = `<!doctype html><html><head><meta charset="utf-8"><style>${frameCss(theme)}${css}${captureCss}</style></head><body><div id="frame" style="width:${width};display:inline-block">${markup}</div>${wiring}</body></html>`;
          const pagePath = join(
            temp,
            `${component}-${variant.id}-${theme.id}.html`,
          );
          const viewport = { width: spec.width, height: variant.height + 40 };
          await writeFile(pagePath, source);
          const page = await browser.newPage({
            viewport,
            colorScheme: theme.id,
          });
          try {
            await page.goto(pathToFileURL(pagePath).href);
            for (const [targetIndex, key] of keys.entries()) {
              const selector = `[data-sketch-target="${targetIndex}"]`;
              const locator = page.locator(selector);
              const box = await locator.boundingBox();
              assert.ok(
                box && box.width > 0 && box.height > 0,
                `${component}/${variant.id}/${key} has no browser box`,
              );
              const layout = await locator.evaluate((element) => {
                const style = getComputedStyle(element);
                return {
                  display: style.display,
                  direction: style.flexDirection,
                  align: style.alignItems,
                  justify: style.justifyContent,
                  gap: style.gap,
                  padding: style.padding,
                  borderRadius: style.borderRadius,
                  borderWidth: style.borderWidth,
                  textAlign: style.textAlign,
                  whiteSpace: style.whiteSpace,
                  overflow: style.overflow,
                  component: element.getAttribute('data-component'),
                };
              });
              const id = `${component}-${variant.id}-${key}-${theme.id}`;
              const svgPath = join(temp, `${id}.svg`);
              await exec(
                process.execPath,
                [
                  domotion,
                  'capture',
                  pagePath,
                  '-o',
                  svgPath,
                  '--selector',
                  selector,
                  '--clip',
                  [box.x, box.y, box.width, box.height].join(','),
                  '--width',
                  String(viewport.width),
                  '--height',
                  String(viewport.height),
                  '--color-scheme',
                  theme.id,
                  '--text-mode',
                  'system-font',
                  '--flatten-nested-svg',
                  '--optimize',
                ],
                { env: { ...process.env, DOMOTION_NO_OPEN: '1' } },
              );
              const svg = restoreDotPaths(
                normalizeCheckerboard(
                  normalizeGradientStops(await readFile(svgPath, 'utf8')),
                  theme.id,
                ),
              );
              assert.match(svg, /<svg\b/);
              assert.doesNotMatch(svg, /<image\b/i, `${id} gained a bitmap`);
              assert.doesNotMatch(
                svg,
                /<svg\b[\s\S]*<svg\b/i,
                `${id} has nested SVG`,
              );
              fixtures.push({
                id,
                component,
                variant: variant.id,
                key,
                theme: theme.id,
                name: `${title(component)} / ${title(variant.id)} / ${title(key)} / ${title(theme.id)}`,
                box,
                layout,
                svg,
              });
              console.log(
                `${id}: ${box.width.toFixed(2)}×${box.height.toFixed(2)}`,
              );
            }
          } finally {
            await page.close();
          }
        }
      }
    }
    const allFixtures =
      selected.length === Object.keys(targets).length
        ? fixtures
        : [
            ...JSON.parse(
              await readFile(join(output, 'fixtures.json'), 'utf8'),
            ).filter((fixture) => !selected.includes(fixture.component)),
            ...fixtures,
          ].sort((a, b) => a.id.localeCompare(b.id));
    assert.equal(allFixtures.length, 34);
    await writeFile(
      join(output, 'fixtures.json'),
      `${JSON.stringify(allFixtures, null, 2)}\n`,
    );
    return fixtures;
  } finally {
    await browser.close();
    await rm(temp, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === new URL(import.meta.url).pathname
) {
  const selected = process.argv.slice(2);
  const fixtures = await captureAdvanced(
    defaultOutput,
    selected.length ? selected : undefined,
  );
  console.log(
    `Captured ${fixtures.length} individual light/dark advanced Symbols.`,
  );
}

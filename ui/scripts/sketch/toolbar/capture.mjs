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

const exec = promisify(execFile);
const uiRoot = resolve(import.meta.dirname, '../../..');
export const defaultOutput = resolve(uiRoot, 'docs/design/sketch/toolbar');

/**
 * Chips capture an empty `background-image` as a gradient whose stops are all
 * fully transparent. Sketch's SVG import drops stop alpha and paints it opaque
 * black, so remove those gradients and the shapes that only paint with them.
 */
export function dropTransparentGradients(svg) {
  const ids = [];
  const stripped = svg.replace(
    /<linearGradient\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/linearGradient>/g,
    (match, id, body) => {
      const stops = body.match(/<stop\b[^>]*>/g) ?? [];
      const transparent =
        stops.length > 0 &&
        stops.every((stop) =>
          /stop-color="(?:transparent|rgba\([^)]*,\s*0\))"/.test(stop),
        );
      if (!transparent) return match;
      ids.push(id);
      return '';
    },
  );
  return ids.reduce(
    (result, id) =>
      result.replace(
        new RegExp(`<(rect|path)\\b[^>]*fill="url\\(#${id}\\)"[^>]*/>`, 'g'),
        '',
      ),
    stripped,
  );
}

// Keys are authored per individual component. A showcase reorder must change
// this table deliberately instead of silently moving a consumer's Symbol ID.
export const targets = {
  'toolbar-control-group': {
    'icon-tile-neutral': ['control'],
    'icon-tile-brand': ['control'],
    'icon-tile-success': ['control'],
    'icon-tile-warning': ['control'],
    'icon-tile-danger': ['control'],
    'icon-buttons': ['control'],
    'borderless-single': ['control'],
    'with-text': ['control'],
    glass: ['control'],
    'push-buttons': ['control'],
  },
  toolbar: {
    'title-and-actions': ['control'],
    'width-visibility-600': ['control'],
    'width-visibility-320': ['control'],
  },
  'toolbar-text': {
    'dark-tone': ['control'],
    large: ['control'],
    default: ['control'],
    small: ['control'],
  },
  'tab-bar': { 'workspace-tabs': ['control'] },
  'segmented-control': { equal: ['control'], 'pill-small': ['control'] },
  'choice-chips': {
    'color-palette': ['control'],
    'compact-icons': ['control'],
    multiple: ['control'],
  },
  chip: {
    tags: ['urgent', 'report-file', 'backlog'],
    'action-filters': [
      'is-draft',
      'is-sent',
      'is-awarded',
      'is-mine',
      'is-shared',
      'site-karachi',
      'site-lahore',
      'has-questions',
      'has-attachments',
    ],
  },
};

export function verifyTargets() {
  assert.deepEqual(
    Object.keys(targets).sort(),
    [
      'toolbar-control-group',
      'toolbar',
      'toolbar-text',
      'tab-bar',
      'segmented-control',
      'choice-chips',
      'chip',
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
  assert.equal(variants, 25);
  assert.equal(individuals, 35);
}

const title = (value) =>
  value.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export async function captureToolbar(
  output = defaultOutput,
  selected = Object.keys(targets),
) {
  verifyTargets();
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const domotion = await resolveDomotion();
  const temp = await mkdtemp(join(tmpdir(), 'kerf-sketch-toolbar-'));
  const fixtures = [];
  try {
    for (const component of selected) {
      assert.ok(
        targets[component],
        `Unknown toolbar/navigation component: ${component}`,
      );
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
              const svg = dropTransparentGradients(
                await readFile(svgPath, 'utf8'),
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
    await writeFile(
      join(output, 'fixtures.json'),
      `${JSON.stringify(fixtures, null, 2)}\n`,
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
  const fixtures = await captureToolbar(
    defaultOutput,
    selected.length ? selected : undefined,
  );
  console.log(
    `Captured ${fixtures.length} individual light/dark toolbar/navigation Symbols.`,
  );
}

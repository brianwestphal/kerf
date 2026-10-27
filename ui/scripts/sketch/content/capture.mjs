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
export const defaultOutput = resolve(uiRoot, 'docs/design/sketch/content');

/**
 * Sketch's SVG import takes an explicit `stroke-opacity` as the stroke alpha
 * and ignores the alpha inside an `rgba()` stroke, so the ProgressRing track
 * imports opaque. Fold the color's alpha into `stroke-opacity` instead.
 */
export function foldStrokeAlpha(svg) {
  return svg.replace(/<[a-z]+\b[^>]*>/g, (tag) => {
    const color =
      /\sstroke="rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)"/.exec(
        tag,
      );
    const opacity = /\sstroke-opacity="([\d.]+)"/.exec(tag);
    if (!color || !opacity) return tag;
    const alpha = Number((Number(color[4]) * Number(opacity[1])).toFixed(4));
    return tag
      .replace(color[0], ` stroke="rgb(${color[1]}, ${color[2]}, ${color[3]})"`)
      .replace(opacity[0], ` stroke-opacity="${alpha}"`);
  });
}

/**
 * ProgressRing draws its arc as a circle with `stroke-dasharray`. Sketch's SVG
 * import ignores the dash and paints the full circle, so replace each dashed
 * circle with an explicit arc path that starts where the dash starts.
 */
export function dashedArcsToPaths(svg) {
  return svg.replace(/<circle\b([^>]*)\/>/g, (match, attrs) => {
    const dash = /stroke-dasharray="([\d.]+)[ ,]+([\d.]+)"/.exec(attrs);
    if (!dash) return match;
    const read = (name) =>
      Number(new RegExp(`\\b${name}="([-\\d.]+)"`).exec(attrs)[1]);
    const [cx, cy, r] = ['cx', 'cy', 'r'].map(read);
    const length = Number(dash[1]);
    const rest = attrs
      .replace(/\s(?:cx|cy|r|stroke-dasharray|class)="[^"]*"/g, '')
      .trim();
    const circumference = 2 * Math.PI * r;
    if (length >= circumference)
      return `<circle cx="${cx}" cy="${cy}" r="${r}" ${rest}/>`;
    if (length <= 0) return '';
    const angle = (2 * Math.PI * length) / circumference;
    const point = (value) => Number(value.toFixed(3));
    const end = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)].map(point);
    const large = angle > Math.PI ? 1 : 0;
    return `<path d="M${point(cx + r)} ${point(cy)}A${r} ${r} 0 ${large} 1 ${end[0]} ${end[1]}" ${rest}/>`;
  });
}

// Keys are authored per individual component. A showcase reorder must change
// this table deliberately instead of silently moving a consumer's Symbol ID.
export const targets = {
  disclosure: {
    plain: ['advanced-settings', 'release-notes'],
    'framed-sunken': ['billing', 'build-log'],
    embedded: ['ai-feedback'],
  },
  'message-composer': { chat: ['control'], prompt: ['control'] },
  'progress-bar': {
    determinate: ['control'],
    tones: ['confidence', 'storage-used', 'unlabeled'],
  },
  'progress-ring': {
    sizes: ['small', 'medium', 'large'],
    tones: ['done', 'quota', 'budget'],
  },
  'state-banner': {
    info: ['control'],
    'info-badge': ['control'],
    success: ['control'],
    warning: ['control'],
    danger: ['control'],
    strip: ['control'],
  },
  'empty-state': { 'with-action': ['control'], filtered: ['control'] },
  skeleton: {
    block: ['control'],
    lines: ['control'],
    avatar: ['control'],
  },
};

export function verifyTargets() {
  assert.deepEqual(
    Object.keys(targets).sort(),
    [
      'disclosure',
      'message-composer',
      'progress-bar',
      'progress-ring',
      'state-banner',
      'empty-state',
      'skeleton',
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
  assert.equal(variants, 20);
  assert.equal(individuals, 28);
}

const title = (value) =>
  value.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export async function captureContent(
  output = defaultOutput,
  selected = Object.keys(targets),
) {
  verifyTargets();
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const domotion = await resolveDomotion();
  const temp = await mkdtemp(join(tmpdir(), 'kerf-sketch-content-'));
  const fixtures = [];
  try {
    for (const component of selected) {
      assert.ok(
        targets[component],
        `Unknown content/feedback component: ${component}`,
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
              const svg = foldStrokeAlpha(
                dashedArcsToPaths(await readFile(svgPath, 'utf8')),
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
  const fixtures = await captureContent(
    defaultOutput,
    selected.length ? selected : undefined,
  );
  console.log(
    `Captured ${fixtures.length} individual light/dark content/feedback Symbols.`,
  );
}

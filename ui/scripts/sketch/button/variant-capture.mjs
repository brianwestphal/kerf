import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  readTemplateCss,
  resolveTemplateStyles,
} from '../../build-design-templates.mjs';
import { defaultOutput } from './capture.mjs';

const { chromium } = createRequire(import.meta.url)('@playwright/test');

// A covering set of visual options, not the Cartesian product of ButtonProps.
export const variants = [
  {
    id: 'primary-neutral',
    name: 'Primary Neutral',
    props: { children: 'Continue' },
  },
  {
    id: 'primary-success',
    name: 'Primary Success',
    props: { tone: 'success', children: 'Confirm' },
  },
  {
    id: 'primary-danger',
    name: 'Primary Danger',
    props: { tone: 'danger', children: 'Delete' },
  },
  {
    id: 'secondary-danger',
    name: 'Secondary Danger',
    props: { tone: 'danger', emphasis: 'secondary', children: 'Remove' },
  },
  {
    id: 'plain-neutral',
    name: 'Plain Neutral',
    props: { emphasis: 'plain', children: 'Cancel' },
  },
  {
    id: 'compact-neutral',
    name: 'Compact Neutral',
    props: { size: 'compact', children: 'Filter' },
  },
  {
    id: 'pill-brand',
    name: 'Pill Brand',
    props: { tone: 'brand', shape: 'pill', children: 'Create' },
  },
  {
    id: 'icon-only',
    name: 'Icon Only',
    props: { tone: 'brand', icon: true, ariaLabel: 'Add' },
  },
  {
    id: 'disabled-neutral',
    name: 'Disabled Neutral',
    props: { children: 'Continue', disabled: true },
  },
  {
    id: 'disabled-success',
    name: 'Disabled Success',
    props: { tone: 'success', children: 'Confirm', disabled: true },
  },
  {
    id: 'pressed-neutral',
    name: 'Pressed Neutral',
    props: { children: 'Selected', pressed: true },
  },
  {
    id: 'pressed-secondary',
    name: 'Pressed Secondary Brand',
    props: {
      tone: 'brand',
      emphasis: 'secondary',
      children: 'Selected',
      pressed: true,
    },
  },
  {
    id: 'loading-brand',
    name: 'Loading Brand',
    props: { tone: 'brand', children: 'Saving', loading: true },
  },
  {
    id: 'badge-brand',
    name: 'Badge Brand',
    props: { tone: 'brand', children: 'Filters', badge: 3 },
  },
  {
    id: 'badge-dot',
    name: 'Badge Dot',
    props: { tone: 'brand', children: 'Updates', badge: true },
  },
  {
    id: 'focus-standard',
    name: 'Focus Standard',
    props: { tone: 'brand', children: 'Save' },
    focus: true,
  },
  {
    id: 'focus-brand',
    name: 'Focus Brand',
    props: { tone: 'brand', children: 'Save', focusRingInset: true },
    focus: true,
  },
];

export async function captureVariants(output = defaultOutput) {
  const out = resolve(output);
  await mkdir(join(out, 'variant-inputs'), { recursive: true });
  const [{ Button }, { LucideIcon }] = await Promise.all([
    import('../../../dist/button.js'),
    import('../../../dist/lucide-icon.js'),
  ]);
  const { Plus } = createRequire(import.meta.url)('lucide');
  const css = await readTemplateCss(
    await resolveTemplateStyles([
      'foundation',
      'layout',
      'row',
      'lucide-icon',
      'button',
      'badge',
      'loading-spinner',
    ]),
  );
  const browser = await chromium.launch();
  const fixtures = [];
  try {
    for (const theme of ['light', 'dark'])
      for (const variant of variants) {
        const id = `${variant.id}-${theme}`;
        const props = {
          ...variant.props,
          icon: variant.props.icon
            ? LucideIcon({ icon: Plus, name: 'plus' })
            : undefined,
        };
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}\nhtml{color-scheme:${theme}}body{margin:20px;background:transparent;font-family:system-ui,-apple-system,sans-serif}</style></head><body><div id="frame">${Button(props)}</div></body></html>`;
        const htmlPath = join(out, 'variant-inputs', `${id}.html`);
        await writeFile(htmlPath, html);
        const page = await browser.newPage({
          viewport: { width: 600, height: 200 },
          colorScheme: theme,
          deviceScaleFactor: 2,
        });
        await page.goto(pathToFileURL(htmlPath).href);
        await page.evaluate(() => document.fonts.ready);
        if (variant.focus) await page.locator('.kui-button').focus();
        const button = page.locator('.kui-button');
        const bounds = await button.boundingBox();
        if (!bounds) throw new Error(`Button ${id} did not render.`);
        const clip =
          variant.id === 'focus-standard'
            ? {
                x: bounds.x - 4,
                y: bounds.y - 4,
                width: bounds.width + 8,
                height: bounds.height + 8,
              }
            : variant.props.badge && variant.props.badge !== true
              ? {
                  x: bounds.x,
                  y: bounds.y - 4,
                  width: bounds.width + 4,
                  height: bounds.height + 4,
                }
              : null;
        if (clip)
          await page.screenshot({
            path: join(out, 'variant-inputs', `${id}.png`),
            omitBackground: true,
            clip,
          });
        else
          await button.screenshot({
            path: join(out, 'variant-inputs', `${id}.png`),
            omitBackground: true,
          });
        const layout = await button.evaluate((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const rgba = (value) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const context = canvas.getContext('2d');
            context.fillStyle = value;
            context.fillRect(0, 0, 1, 1);
            return `#${[...context.getImageData(0, 0, 1, 1).data].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
          };
          const icon = element.querySelector('.kui-button__icon svg');
          const badge = element.querySelector('.kui-badge');
          const spinner = element.querySelector('.kui-loading-spinner');
          const svgInfo = (svg) => {
            if (!svg) return null;
            const copy = svg.cloneNode(true);
            const bounds = svg.getBoundingClientRect();
            copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            copy.setAttribute('stroke', style.color);
            copy.setAttribute('fill', style.color);
            copy.setAttribute('width', String(bounds.width));
            copy.setAttribute('height', String(bounds.height));
            return {
              svg: copy.outerHTML,
              width: bounds.width,
              height: bounds.height,
            };
          };
          const badgeRect = badge?.getBoundingClientRect();
          const badgeStyle = badge && getComputedStyle(badge);
          return {
            width: rect.width,
            height: rect.height,
            radius: parseFloat(style.borderTopLeftRadius),
            gap: parseFloat(style.gap),
            padding: {
              left:
                parseFloat(style.paddingLeft) +
                parseFloat(style.borderLeftWidth),
              right:
                parseFloat(style.paddingRight) +
                parseFloat(style.borderRightWidth),
            },
            fill: rgba(style.backgroundColor),
            borderColor: rgba(style.borderLeftColor),
            borderWidth: parseFloat(style.borderLeftWidth),
            textColor: rgba(style.color),
            fontSize: parseFloat(style.fontSize),
            opacity: parseFloat(style.opacity),
            boxShadow: style.boxShadow,
            shadowColor:
              style.boxShadow === 'none'
                ? null
                : rgba(
                    style.boxShadow.match(/^[a-z-]+\([^)]*\)/i)?.[0] ??
                      'transparent',
                  ),
            outlineColor: rgba(style.outlineColor),
            outlineWidth: parseFloat(style.outlineWidth) || 0,
            outlineOffset: parseFloat(style.outlineOffset) || 0,
            label:
              element.querySelector('.kui-button__label')?.textContent ?? null,
            icon: svgInfo(icon),
            spinner: svgInfo(spinner),
            badge: badge && {
              text: badge.textContent,
              dot: badge.dataset.size === 'dot',
              width: badgeRect.width,
              height: badgeRect.height,
              x: badgeRect.x - rect.x,
              y: badgeRect.y - rect.y,
              fill: rgba(badgeStyle.backgroundColor),
              textColor: rgba(badgeStyle.color),
              fontSize: parseFloat(badgeStyle.fontSize),
            },
          };
        });
        fixtures.push({
          id,
          theme,
          name: `Button / ${variant.name} / ${theme === 'light' ? 'Light' : 'Dark'}`,
          props: variant.props,
          focus: !!variant.focus,
          layout,
        });
        await page.close();
      }
  } finally {
    await browser.close();
  }
  await writeFile(
    join(out, 'variant-fixtures.json'),
    `${JSON.stringify(fixtures, null, 2)}\n`,
  );
  return fixtures;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const fixtures = await captureVariants(process.argv[2]);
  console.log(`Captured ${fixtures.length} additional Button appearances.`);
}

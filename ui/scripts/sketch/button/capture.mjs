import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import {
  readTemplateCss,
  resolveTemplateStyles,
} from '../../build-design-templates.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const { Plus } = require('lucide');
const exec = promisify(execFile);
const uiRoot = fileURLToPath(new URL('../../../', import.meta.url));
const domotion = resolve(uiRoot, 'node_modules/domotion-svg/dist/cli/index.js');
export const defaultOutput = resolve(uiRoot, 'docs/design/sketch/button');

const cases = [
  {
    id: 'primary-brand',
    label: 'Primary Brand',
    props: { tone: 'brand', children: 'Save Changes' },
  },
  {
    id: 'secondary',
    label: 'Secondary',
    props: { emphasis: 'secondary', children: 'Export' },
  },
  {
    id: 'icon-brand',
    label: 'Primary with Icon',
    props: { tone: 'brand', children: 'New Ticket', icon: true },
  },
];

/** Capture production appearance and separate, CSS-derived semantic layout. */
export async function captureButtons(output = defaultOutput) {
  const out = resolve(output);
  await mkdir(join(out, 'inputs'), { recursive: true });
  const [{ Button }, { LucideIcon }] = await Promise.all([
    import('../../../dist/button.js'),
    import('../../../dist/lucide-icon.js'),
  ]);
  const css = await readTemplateCss(
    await resolveTemplateStyles([
      'foundation',
      'layout',
      'row',
      'lucide-icon',
      'button',
    ]),
  );
  const browser = await chromium.launch();
  const fixtures = [];
  try {
    for (const theme of ['light', 'dark']) {
      for (const variant of cases) {
        const id = `${variant.id}-${theme}`;
        const props = {
          ...variant.props,
          icon: variant.props.icon
            ? LucideIcon({ icon: Plus, name: 'plus' })
            : undefined,
        };
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html{color-scheme:${theme}}body{margin:0;background:transparent;font-family:system-ui,-apple-system,sans-serif}#frame{display:inline-block;vertical-align:top}</style></head><body><div id="frame">${Button(props)}</div></body></html>`;
        const htmlPath = join(out, 'inputs', `${id}.html`);
        await writeFile(htmlPath, html);
        // Keep a normal viewport for domotion's probe, then crop the SVG to
        // the measured Button. A tiny capture viewport makes the probe fail.
        const page = await browser.newPage({
          viewport: { width: 600, height: 200 },
          colorScheme: theme,
          deviceScaleFactor: 2,
        });
        await page.goto(pathToFileURL(htmlPath).href);
        await page.evaluate(() => document.fonts.ready);
        const button = page.locator('.kui-button');
        const box = await button.boundingBox();
        if (!box) throw new Error(`Button ${id} did not render.`);
        const width = Math.ceil(box.width);
        const height = Math.ceil(box.height);
        await button.screenshot({
          path: join(out, 'inputs', `${id}.png`),
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
            return `#${[...context.getImageData(0, 0, 1, 1).data]
              .map((part) => part.toString(16).padStart(2, '0'))
              .join('')}`;
          };
          const icon = element.querySelector('svg');
          let iconInfo = null;
          if (icon) {
            const copy = icon.cloneNode(true);
            const bounds = icon.getBoundingClientRect();
            copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            copy.setAttribute('stroke', style.color);
            copy.setAttribute('width', String(bounds.width));
            copy.setAttribute('height', String(bounds.height));
            iconInfo = {
              svg: copy.outerHTML,
              width: bounds.width,
              height: bounds.height,
            };
          }
          return {
            width: rect.width,
            height: rect.height,
            alignItems: style.alignItems,
            justifyContent: style.justifyContent,
            textAlign: style.textAlign,
            gap: parseFloat(style.gap),
            padding: {
              left:
                parseFloat(style.paddingLeft) +
                parseFloat(style.borderLeftWidth),
              right:
                parseFloat(style.paddingRight) +
                parseFloat(style.borderRightWidth),
            },
            radius: parseFloat(style.borderTopLeftRadius),
            borderWidth: parseFloat(style.borderLeftWidth),
            borderColor: rgba(style.borderLeftColor),
            fill: rgba(style.backgroundColor),
            textColor: rgba(style.color),
            fontFamily: style.fontFamily,
            fontSize: parseFloat(style.fontSize),
            fontWeight: style.fontWeight,
            whiteSpace: style.whiteSpace,
            label: element.querySelector('.kui-button__label').textContent,
            icon: iconInfo,
          };
        });
        await page.close();
        const svgPath = join(out, 'inputs', `${id}.svg`);
        await exec(
          process.execPath,
          [
            domotion,
            'capture',
            htmlPath,
            '-o',
            svgPath,
            '--selector',
            '#frame',
            '--width',
            '600',
            '--height',
            '200',
            '--color-scheme',
            theme,
            '--text-mode',
            'system-font',
            '--flatten-nested-svg',
            '--optimize',
          ],
          { env: { ...process.env, DOMOTION_NO_OPEN: '1' } },
        );
        const svg = await readFile(svgPath, 'utf8');
        await writeFile(
          svgPath,
          svg.replace(/<svg\b[^>]*>/, (tag) =>
            tag
              .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${width} ${height}"`)
              .replace(/\bwidth="[^"]*"/, `width="${width}"`)
              .replace(/\bheight="[^"]*"/, `height="${height}"`),
          ),
        );
        fixtures.push({
          id,
          theme,
          label: variant.label,
          name: `Button / ${variant.label} / ${theme === 'light' ? 'Light' : 'Dark'}`,
          width,
          height,
          svg: await readFile(svgPath, 'utf8'),
          layout,
        });
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(
    join(out, 'fixtures.json'),
    `${JSON.stringify(fixtures, null, 2)}\n`,
  );
  await writeFile(
    join(out, 'layout.json'),
    `${JSON.stringify(
      fixtures.map((fixture) =>
        Object.fromEntries(
          Object.entries(fixture).filter(([key]) => key !== 'svg'),
        ),
      ),
      null,
      2,
    )}\n`,
  );
  return fixtures;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const fixtures = await captureButtons(process.argv[2]);
  console.log(
    `Captured ${fixtures.length} Button variants from production components.`,
  );
}

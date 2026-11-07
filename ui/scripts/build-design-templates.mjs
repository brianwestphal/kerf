// Build SVG design templates for @kerfjs/ui components with `domotion-svg`.
//
// For each component + presentation combination we render the component's real
// SafeHtml (with its production CSS + tokens and representative sample data) into
// a standalone HTML page, capture it to an SVG with `domotion capture
// --text-mode system-font --flatten-nested-svg` (text is emitted as authored
// <text> painted by the viewer's system fonts — real, selectable, and small;
// inline SVG icons are flattened for Sketch compatibility). Each variant is
// captured in BOTH themes — light and dark (`--color-scheme`, which
// foundation.css's light-dark() tokens respond to) — as
// docs/design/templates/<component>/<variant>.svg and <variant>-dark.svg. Two
// per-component library files (<component>.svg light,
// <component>-dark.svg dark) are captured from HTML pages that reference those
// individual SVGs with <img>. domotion embeds the referenced images and flattens
// them into positioned groups, so the libraries stay self-contained without a
// second, hand-written SVG compositor or nested <svg> elements.
//
// Maintain this alongside the components: add a variant to the manifest in
// design-templates/specs.mjs when a component gains a presentation
// combination, and re-run `npm run design-templates:build`.
// App teams consuming @kerfjs/ui can copy this script to template their own
// application-level components the same way (see docs/design/templates.md).
//
// Requires `domotion-svg` reachable as a CLI: set DOMOTION_BIN to its `domotion`
// entry (e.g. a globally/locally installed `domotion`), otherwise this falls back
// to a sibling `../domotion/dist/cli/index.js` checkout for local development.

import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';

import { COMPONENTS } from './design-templates/specs.mjs';

export { COMPONENTS };

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Defaults to the committed template directory; the CI drift gate points this at a
// throwaway directory (DESIGN_TEMPLATES_OUT) to regenerate without clobbering.
const outRoot = process.env.DESIGN_TEMPLATES_OUT
  ? resolve(process.env.DESIGN_TEMPLATES_OUT)
  : resolve(root, 'docs/design/templates');

export async function resolveDomotion() {
  if (process.env.DOMOTION_BIN) return process.env.DOMOTION_BIN;
  for (const candidate of [
    resolve(root, 'node_modules/.bin/domotion'),
    resolve(root, '../../domotion/dist/cli/index.js'),
  ]) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'domotion CLI not found. Install `domotion-svg` or set DOMOTION_BIN to its `domotion` entry.',
  );
}

// The two themes captured for every variant. kerf UI colors are `light-dark()`
// tokens gated by `color-scheme`, so a dark capture only needs `color-scheme: dark`
// plus a dark page background (the light/dark page bg matches --kui-color-surface).
export const THEMES = [
  {
    id: 'light',
    suffix: '',
    pageBackground: '#fff',
    libraryBackground: '#ffffff',
    captionColor: '#6e6e73',
  },
  {
    id: 'dark',
    suffix: '-dark',
    pageBackground: '#1c1c1e',
    libraryBackground: '#1c1c1e',
    captionColor: '#aeaeb2',
  },
];

// Demo-only chrome for the raw buttons embedded in variants (production apps
// supply their own button component; these keep the captures realistic). The
// theme is driven by domotion's `--color-scheme` (prefers-color-scheme), which
// foundation.css's `color-scheme: light dark` responds to via its `light-dark()`
// tokens — so we don't override `color-scheme` here.
export const frameCss = (theme) => `
* { box-sizing: border-box; }
body { margin: 0; padding: 20px; background: ${theme.pageBackground}; font-family: system-ui, -apple-system, sans-serif; }
.dt-button { min-height: 32px; padding: 0 12px; border: 1px solid var(--kui-color-border); border-radius: var(--kui-radius-pill); color: var(--kui-color-text); background: var(--kui-color-surface-raised); font: inherit; cursor: pointer; }
.dt-button[data-variant="brand"] { border-color: var(--kui-color-brand-border-loud); color: var(--kui-color-brand-on-loud); background: var(--kui-color-brand-fill-loud); }
.dt-icon-button { display: inline-grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: var(--kui-radius-m); color: var(--kui-color-text); background: transparent; cursor: pointer; }
.dt-icon-button svg { width: 18px; height: 18px; }
.dt-picker .kui-color-picker__area { background: none; }
.dt-picker-area { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; }
.dt-picker-area > svg { display: block; width: 100%; height: 100%; }
.dt-picker-area-edge { position: absolute; inset: 0; border: 1px solid color-mix(in srgb, var(--kui-color-text) 50%, transparent); border-radius: inherit; }
.dt-picker .kui-color-picker__area-thumb { z-index: 1; }
.dt-picker-range { position: relative; height: 20px; }
.dt-checker-light { fill: var(--kui-color-surface); }
.dt-checker-dark { fill: var(--kui-color-neutral-fill-normal); }
.dt-picker-track { border-radius: 6px; }
.dt-picker-track { position: absolute; top: 4px; left: 0; width: 100%; height: 12px; overflow: hidden; }
.dt-picker-track > svg { display: block; width: 100%; height: 100%; }
.dt-picker-track-edge { color: var(--kui-color-text); stroke: currentColor; stroke-opacity: 0.5; }
.dt-picker-thumb { position: absolute; top: 0; left: calc((100% - 20px) * var(--dt-fraction)); width: 20px; height: 20px; box-sizing: border-box; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.6), var(--kui-shadow-s); }
.kui-color-field__swatch.dt-swatch { position: relative; overflow: hidden; background: var(--kui-color-surface); }
.dt-swatch > span { position: absolute; }
.dt-swatch__tile { inset: 0 50% 50% 0; background: var(--kui-color-neutral-fill-normal); }
.dt-swatch__tile[data-far] { inset: 50% 0 0 50%; }
.dt-swatch__color { inset: 0; }
.dt-range { position: relative; display: block; width: 100%; height: var(--_kui-slider-thumb); }
.dt-range > span { position: absolute; top: 50%; translate: 0 -50%; }
.dt-range__track, .dt-range__fill { height: var(--_kui-slider-track); border-radius: var(--kui-radius-pill); }
.dt-range__track { left: 0; right: 0; background: var(--kui-color-neutral-fill-normal); }
.dt-range__fill { left: 0; width: calc(var(--_kui-slider-thumb) / 2 + (100% - var(--_kui-slider-thumb)) * var(--dt-fraction)); background: var(--_kui-slider-fill-color); }
.dt-range__thumb { left: calc((100% - var(--_kui-slider-thumb)) * var(--dt-fraction)); width: var(--_kui-slider-thumb); height: var(--_kui-slider-thumb); border: 1px solid var(--kui-color-neutral-border-normal); border-radius: 50%; background: var(--kui-color-surface-raised); box-shadow: var(--kui-shadow-s); }
`;

// `ui-monospace` resolves to different fonts on developer and hosted macOS
// machines. Keep the public component fallback unchanged, but pin the capture
// fixture to a font shipped by macOS so its text metrics are reproducible.
//
// A browser drops a <button>'s native appearance as soon as author CSS styles
// its background or border, but the capture does not model that and silently
// discards the contents (label, icon, divider) of a button left at
// `appearance: auto`. Reset it in the fixture so every button captures the way
// browsers paint it, whether or not its component also sets the reset.
// A running animation would be captured at whatever frame the capture lands
// on, so a busy spinner's angle drifted on every rebuild; the template shows
// the spinner's own reduced-motion presentation instead (loading-spinner.css).
export const captureCss = `:root { --kui-font-mono: "Courier New", monospace; } button { appearance: none; } .kui-loading-spinner path { animation: none; }`;

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Build the temporary HTML page that domotion captures into a component library.
 * Each image deliberately references the already-generated variant SVG instead of
 * copying its markup; `--flatten-nested-svg` makes the final capture self-contained
 * and Sketch-compatible.
 */
export function buildLibraryPage(name, rendered, theme) {
  const gap = 16;
  const captionHeight = 22;
  const width = Math.max(...rendered.map((variant) => variant.width)) + gap * 2;
  const height =
    gap * (rendered.length + 1) +
    rendered.reduce((sum, variant) => sum + captionHeight + variant.height, 0);
  const rows = rendered
    .map(
      (variant) => `<section class="dt-variant">
  <div class="dt-caption">${escapeHtml(variant.label)}</div>
  <img src="./${escapeHtml(name)}/${escapeHtml(variant.id)}${theme.suffix}.svg" width="${variant.width}" height="${variant.height}" alt="">
</section>`,
    )
    .join('\n');

  return {
    width,
    height,
    html: `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { background: ${theme.libraryBackground}; font-family: system-ui, -apple-system, sans-serif; }
    #library { width: ${width}px; padding: ${gap}px; background: ${theme.libraryBackground}; }
    .dt-variant + .dt-variant { margin-top: ${gap}px; }
    .dt-caption { height: ${captionHeight}px; color: ${theme.captionColor}; font-size: 12px; font-weight: 600; line-height: 16px; }
    .dt-variant img { display: block; }
  </style>
</head>
<body>
  <main id="library">${rows}</main>
</body>
</html>
`,
  };
}

/**
 * Expand a manifest's stylesheet list into the full set a consumer actually gets.
 * Each component's browser entry (`dist/browser/<name>.js`, generated by
 * build-browser-entries.mjs from the component's import graph) imports every
 * stylesheet its runtime reaches — e.g. StateBanner and ListHeader render a
 * Badge, so their entries import badge.css before their own CSS. Reading those
 * entries keeps the templates on the consumer's exact cascade instead of a
 * hand-maintained list that silently misses a nested component's styles (the
 * manifest listed no badge.css, so every badge rendered as plain text).
 * Dependencies come before the stylesheet that needs them; duplicates keep
 * their first position.
 */
export async function resolveTemplateStyles(
  css,
  readEntry = (style) =>
    readFile(resolve(root, `dist/browser/${style}.js`), 'utf8'),
) {
  const styles = [];
  const add = (style) => {
    if (!styles.includes(style)) styles.push(style);
  };
  for (const style of css) {
    let entry;
    try {
      entry = await readEntry(style);
    } catch {
      // Not a component with a browser entry (foundation, layout, …).
      add(style);
      continue;
    }
    for (const [, dependency] of entry.matchAll(
      /import '\.\.\/styles\/([^']+)\.css';/g,
    ))
      add(dependency);
    add(style);
  }
  return styles;
}

/** Inline public stylesheet imports before placing CSS in a standalone capture page. */
export async function readTemplateCss(
  styles,
  readStyle = (path) => readFile(resolve(root, `dist/styles/${path}`), 'utf8'),
) {
  const expand = async (path, ancestors = []) => {
    if (ancestors.includes(path))
      throw new Error(
        `Circular design-template CSS import: ${[...ancestors, path].join(' -> ')}`,
      );
    const source = await readStyle(path);
    const imports = [...source.matchAll(/@import\s+["']([^"']+\.css)["'];/g)];
    let output = '';
    let start = 0;
    for (const match of imports) {
      output += source.slice(start, match.index);
      const dependency = posix.normalize(
        posix.join(posix.dirname(path), match[1]),
      );
      output += await expand(dependency, [...ancestors, path]);
      start = match.index + match[0].length;
    }
    return output + source.slice(start);
  };
  return (
    await Promise.all(styles.map((style) => expand(`${style}.css`)))
  ).join('\n');
}

async function buildComponent(domotion, name, spec) {
  const cssText = await readTemplateCss(await resolveTemplateStyles(spec.css));
  const dir = resolve(outRoot, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  // A variant may set its own frameWidth, such as a fixed width that gives a
  // full-width variant a parent to fill inside a max-content template.
  const frameWidthOf = (width) =>
    typeof width === 'number' ? `${width}px` : width;
  const rendered = [];
  for (const variant of spec.variants) {
    const frameWidth = frameWidthOf(variant.frameWidth ?? spec.frameWidth);
    const themed = {};
    for (const theme of THEMES) {
      const wire = variant.wireToolbarVisibility
        ? "import { wireToolbarVisibility } from './ui/dist/wire-toolbar-visibility.js'; wireToolbarVisibility(document);"
        : variant.wire;
      const wiring = wire
        ? `<script>${(await build({ stdin: { contents: wire, resolveDir: resolve(root, '..') }, bundle: true, format: 'iife', write: false })).outputFiles[0].text}</script>`
        : '';
      const page = `<!doctype html><html><head><meta charset="utf-8"><style>${frameCss(theme)}${cssText}${captureCss}</style></head><body><div id="frame" style="width:${frameWidth};display:inline-block">${String(variant.render())}</div>${wiring}</body></html>`;
      const pagePath = resolve(dir, `${variant.id}${theme.suffix}.html`);
      const svgPath = resolve(dir, `${variant.id}${theme.suffix}.svg`);
      await writeFile(pagePath, page);
      await execFileAsync(
        process.execPath,
        [
          domotion,
          'capture',
          pagePath,
          '-o',
          svgPath,
          '--selector',
          spec.selector,
          '--width',
          String(spec.width),
          '--height',
          String(variant.height + 40),
          '--color-scheme',
          theme.id,
          '--text-mode',
          'system-font',
          '--flatten-nested-svg',
          '--optimize',
        ],
        { env: { ...process.env, DOMOTION_NO_OPEN: '1' } },
      );
      await rm(pagePath);
      themed[theme.id] = await readFile(svgPath, 'utf8');
      console.log(`  ${name}/${variant.id}${theme.suffix}.svg`);
    }
    const dims = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(
      themed.light,
    );
    rendered.push({
      ...variant,
      width: dims ? Number(dims[1]) : spec.width,
      height: dims ? Number(dims[2]) : variant.height,
    });
  }

  // One library file per theme (`<component>.svg` light, `<component>-dark.svg`
  // dark). Build an HTML composition that references the individual variant SVGs,
  // then let domotion embed and flatten them into one self-contained SVG.
  for (const theme of THEMES) {
    const library = buildLibraryPage(name, rendered, theme);
    const pagePath = resolve(outRoot, `${name}${theme.suffix}.html`);
    const svgPath = resolve(outRoot, `${name}${theme.suffix}.svg`);
    await writeFile(pagePath, library.html);
    await execFileAsync(
      process.execPath,
      [
        domotion,
        'capture',
        pagePath,
        '-o',
        svgPath,
        '--selector',
        '#library',
        '--width',
        String(library.width),
        '--height',
        String(library.height),
        '--color-scheme',
        theme.id,
        '--text-mode',
        'system-font',
        '--flatten-nested-svg',
        '--optimize',
      ],
      { env: { ...process.env, DOMOTION_NO_OPEN: '1' } },
    );
    await rm(pagePath);
    console.log(
      `  ${name}${theme.suffix}.svg (library, ${rendered.length} variants composed by domotion)`,
    );
  }
}

// Only run the (browser-driven) capture when invoked directly, so the manifest
// can be imported by the offline sync check without launching domotion.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const domotion = await resolveDomotion();
  await mkdir(outRoot, { recursive: true });
  const selected = process.argv.slice(2);
  for (const name of selected)
    if (!COMPONENTS[name]) throw new Error(`Unknown component: ${name}`);
  for (const [name, spec] of Object.entries(COMPONENTS)) {
    if (selected.length && !selected.includes(name)) continue;
    console.log(`Building ${name} design template…`);
    await buildComponent(domotion, name, spec);
  }
  console.log('Design templates written to docs/design/templates/.');
}

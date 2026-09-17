// Build SVG design templates for @kerfjs/ui components with `domotion-svg`.
//
// For each component + presentation combination we render the component's real
// SafeHtml (with its production CSS + tokens and representative sample data) into
// a standalone HTML page, capture it to a self-contained SVG with `domotion
// capture --real-text` (a paintless authored <text> layer keeps the picture
// selectable/searchable), and write one SVG per variant under
// docs/design/templates/<component>/. A per-component library file
// (docs/design/templates/<component>.svg) then embeds an inline COPY of each
// variant (a positioned nested <svg>) — external <image href> / <use href>
// references render blank in many SVG viewers/rasterizers, so inlining keeps the
// library self-contained everywhere; the individual variant files stay reusable.
//
// Maintain this alongside the components: add a variant here when a component
// gains a presentation combination, and re-run `npm run design-templates:build`.
// App teams consuming @kerfjs/ui can copy this script to template their own
// application-level components the same way (see docs/design/templates.md).
//
// Requires `domotion-svg` reachable as a CLI: set DOMOTION_BIN to its `domotion`
// entry (e.g. a globally/locally installed `domotion`), otherwise this falls back
// to a sibling `../domotion/dist/cli/index.js` checkout for local development.

import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { raw } from 'kerfjs';
import { Bell, Columns3, FileText, Folder, List, Plus, Settings } from 'lucide';

import { LucideIcon } from '../dist/lucide-icon.js';
import { PanelHeader } from '../dist/panel-header.js';
import { ToolbarControlGroup } from '../dist/toolbar-control-group.js';
import { ToolbarText } from '../dist/toolbar-text.js';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = resolve(root, 'docs/design/templates');

async function resolveDomotion() {
  if (process.env.DOMOTION_BIN) return process.env.DOMOTION_BIN;
  for (const candidate of [
    resolve(root, 'node_modules/.bin/domotion'),
    resolve(root, '../../domotion/dist/cli/index.js'),
  ]) {
    try { await access(candidate); return candidate; } catch { /* try next */ }
  }
  throw new Error('domotion CLI not found. Install `domotion-svg` or set DOMOTION_BIN to its `domotion` entry.');
}

const html = (value) => String(value);
const icon = (glyph, name) => html(LucideIcon({ icon: glyph, name }));
const iconButton = (glyph, name, label) => `<button type="button" class="dt-icon-button" aria-label="${label}">${icon(glyph, name)}</button>`;
const pushButton = (label) => `<button type="button" class="dt-button">${label}</button>`;

// Representative sample data — realistic placeholders, never lorem ipsum.
const COMPONENTS = {
  'panel-header': {
    // PanelHeader composes a Toolbar with a ToolbarText title.
    css: ['foundation', 'layout', 'toolbar', 'toolbar-text', 'panel-header'],
    selector: '#frame',
    width: 720,
    frameWidth: 640,
    variants: [
      { id: 'icon-summary-actions', label: 'Icon, summary, and action', height: 96,
        render: () => PanelHeader({ title: 'Northstar migration', titleId: 't', summary: 'In review · updated today', summaryId: 's', icon: LucideIcon({ icon: FileText, name: 'file-text' }), actions: raw(pushButton('Open')) }) },
      { id: 'icon-actions', label: 'Icon and action, no summary', height: 72,
        render: () => PanelHeader({ title: 'Package details', titleId: 't', icon: LucideIcon({ icon: Folder, name: 'folder' }), actions: raw(pushButton('Done')) }) },
      { id: 'no-icon', label: 'No icon, summary and action', height: 96,
        render: () => PanelHeader({ title: 'Workspace settings', titleId: 't', summary: 'Manage members, billing, and integrations.', summaryId: 's', actions: raw(pushButton('New')) }) },
      { id: 'title-only', label: 'Title only', height: 64,
        render: () => PanelHeader({ title: 'Recent activity', titleId: 't' }) },
      { id: 'page-heading', label: 'Page heading (h1) with action', height: 72,
        render: () => PanelHeader({ title: 'UI foundations', titleId: 't', headingLevel: 1, actions: raw(pushButton('New pattern')) }) },
    ],
  },
  'toolbar-control-group': {
    css: ['foundation', 'layout', 'toolbar', 'toolbar-text', 'toolbar-control-group'],
    selector: '#frame',
    width: 520,
    frameWidth: 'max-content',
    variants: [
      { id: 'icon-buttons', label: 'Bordered group of icon buttons', height: 56,
        render: () => ToolbarControlGroup({ label: 'View', children: raw(iconButton(List, 'list', 'List') + iconButton(Columns3, 'columns-3', 'Columns') + iconButton(Settings, 'settings', 'Settings')) }) },
      { id: 'borderless-single', label: 'Borderless single control', height: 56,
        render: () => ToolbarControlGroup({ appearance: 'borderless', single: true, children: raw(iconButton(Plus, 'plus', 'Add')) }) },
      { id: 'with-text', label: 'Label text beside a control', height: 56,
        render: () => ToolbarControlGroup({ appearance: 'borderless', children: raw(html(ToolbarText({ text: 'Workspace', size: 'small' })) + iconButton(Bell, 'bell', 'Notifications')) }) },
      { id: 'push-buttons', label: 'Push-appearance buttons', height: 56,
        render: () => ToolbarControlGroup({ buttonAppearance: 'push', children: raw(iconButton(List, 'list', 'List') + iconButton(Columns3, 'columns-3', 'Columns')) }) },
    ],
  },
};

// Demo-only chrome for the raw buttons embedded in variants (production apps
// supply their own button component; these keep the captures realistic).
const FRAME_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; padding: 20px; background: #fff; font-family: system-ui, -apple-system, sans-serif; }
.dt-button { min-height: 32px; padding: 0 12px; border: 1px solid var(--kui-color-border); border-radius: var(--kui-radius-pill); color: var(--kui-color-text); background: var(--kui-color-surface-raised); font: inherit; cursor: pointer; }
.dt-icon-button { display: inline-grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: var(--kui-radius-m); color: var(--kui-color-text); background: transparent; cursor: pointer; }
.dt-icon-button svg { width: 18px; height: 18px; }
`;

async function buildComponent(domotion, name, spec) {
  const cssText = (await Promise.all(spec.css.map((f) => readFile(resolve(root, `dist/styles/${f}.css`), 'utf8')))).join('\n');
  const dir = resolve(outRoot, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const rendered = [];
  for (const variant of spec.variants) {
    const frameWidth = typeof spec.frameWidth === 'number' ? `${spec.frameWidth}px` : spec.frameWidth;
    const page = `<!doctype html><html><head><meta charset="utf-8"><style>${FRAME_CSS}${cssText}</style></head><body><div id="frame" style="width:${frameWidth};display:inline-block">${html(variant.render())}</div></body></html>`;
    const pagePath = resolve(dir, `${variant.id}.html`);
    const svgPath = resolve(dir, `${variant.id}.svg`);
    await writeFile(pagePath, page);
    await execFileAsync(process.execPath, [domotion, 'capture', pagePath, '-o', svgPath, '--selector', spec.selector, '--width', String(spec.width), '--height', String(variant.height + 40), '--real-text', '--optimize'], { env: { ...process.env, DOMOTION_NO_OPEN: '1' } });
    await rm(pagePath);
    const svg = await readFile(svgPath, 'utf8');
    const dims = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
    rendered.push({ ...variant, file: `${variant.id}.svg`, content: svg, width: dims ? Number(dims[1]) : spec.width, height: dims ? Number(dims[2]) : variant.height });
    console.log(`  ${name}/${variant.id}.svg`);
  }

  // Library file: embed a COPY of each variant inline (a positioned nested <svg>)
  // with a caption. External <image href="…"> / <use href="…"> references render
  // blank in many SVG viewers/rasterizers; inlining keeps the one file
  // self-contained everywhere. Each variant's own ids and domotion font-family
  // names are namespaced first so inlined copies don't collide in the one document.
  const gap = 16;
  const captionH = 22;
  let y = gap;
  const rows = rendered.map((v, index) => {
    const top = y;
    y += captionH + v.height + gap;
    const inner = nestVariant(namespaceSvg(v.content, `v${index}-`), gap, top + captionH);
    return `  <text x="${gap}" y="${top + 14}" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#6e6e73">${v.label}</text>\n${inner}`;
  });
  const libW = Math.max(...rendered.map((v) => v.width)) + gap * 2;
  const library = `<svg xmlns="http://www.w3.org/2000/svg" width="${libW}" height="${y}" viewBox="0 0 ${libW} ${y}">\n  <rect width="${libW}" height="${y}" fill="#ffffff"/>\n${rows.join('\n')}\n</svg>\n`;
  await writeFile(resolve(outRoot, `${name}.svg`), library);
  console.log(`  ${name}.svg (library, ${rendered.length} variants inlined)`);
}

/**
 * Prefix a self-contained variant SVG's local ids and domotion-generated
 * font-family names (`dmf0`, `dmf1`, …) so multiple copies can be inlined into one
 * document without colliding. Rewrites `id="X"` definitions plus every `#X`
 * reference (url(#X), href="#X") and every `dmf<n>` token.
 */
function namespaceSvg(svg, prefix) {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  let out = svg;
  // Longest ids first so a shorter id is never a prefix of a longer one mid-rewrite.
  for (const id of [...new Set(ids)].sort((a, b) => b.length - a.length)) {
    out = out.replaceAll(`id="${id}"`, `id="${prefix}${id}"`);
    out = out.replaceAll(`#${id}`, `#${prefix}${id}`);
  }
  return out.replace(/\bdmf(\d+)\b/g, `${prefix}dmf$1`);
}

/** Position a variant SVG as a nested <svg> at (x, y) within the library sheet. */
function nestVariant(svg, x, y) {
  return `  ${svg.trim().replace(/<svg\s/, `<svg x="${x}" y="${y}" `)}`;
}

const domotion = await resolveDomotion();
await mkdir(outRoot, { recursive: true });
for (const [name, spec] of Object.entries(COMPONENTS)) {
  console.log(`Building ${name} design template…`);
  await buildComponent(domotion, name, spec);
}
console.log('Design templates written to docs/design/templates/.');

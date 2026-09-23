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
import {
  Bell,
  CircleAlert,
  CircleCheck,
  Columns3,
  FileText,
  Filter,
  Folder,
  Inbox,
  List as ListIcon,
  Pencil,
  Plus,
  Rocket,
  Settings,
  Star,
  Trash2,
  TriangleAlert,
} from 'lucide';

import { AppTab } from '../dist/app-tab.js';
import { em, px } from '../dist/css-values.js';
import { EmptyState } from '../dist/empty-state.js';
import { List } from '../dist/list.js';
import { ListActionRow } from '../dist/list-action-row.js';
import { ListHeader } from '../dist/list-header.js';
import { ListItem } from '../dist/list-item.js';
import { LucideIcon } from '../dist/lucide-icon.js';
import { SegmentedControl } from '../dist/segmented-control.js';
import { Skeleton } from '../dist/skeleton.js';
import { StateBanner } from '../dist/state-banner.js';
import { TabBar } from '../dist/tab-bar.js';
import { Toolbar } from '../dist/toolbar.js';
import { ToolbarControlGroup } from '../dist/toolbar-control-group.js';
import { ToolbarText } from '../dist/toolbar-text.js';
import { TokenSearchField } from '../dist/token-search-field.js';
import { ValueTable, ValueTableRow } from '../dist/value-table.js';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Defaults to the committed template directory; the CI drift gate points this at a
// throwaway directory (DESIGN_TEMPLATES_OUT) to regenerate without clobbering.
const outRoot = process.env.DESIGN_TEMPLATES_OUT
  ? resolve(process.env.DESIGN_TEMPLATES_OUT)
  : resolve(root, 'docs/design/templates');

async function resolveDomotion() {
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

const html = (value) => String(value);
const icon = (glyph, name) => html(LucideIcon({ icon: glyph, name }));
const glyph = (g, name) => LucideIcon({ icon: g, name });
const iconButton = (g, name, label) =>
  `<button type="button" class="dt-icon-button" aria-label="${label}">${icon(g, name)}</button>`;
const pushButton = (label) =>
  `<button type="button" class="dt-button">${label}</button>`;

// Representative sample data — realistic placeholders, never lorem ipsum.
export const COMPONENTS = {
  list: {
    css: ['foundation', 'layout', 'list', 'list-header', 'list-item'],
    selector: '#frame',
    width: 420,
    frameWidth: 340,
    variants: [
      {
        id: 'stack',
        label: 'Standard gap and four dividers',
        height: 190,
        render: () =>
          List({
            gap: true,
            dividerSides: 'trbl',
            children: [
              ListHeader({
                label: 'Workspace',
                count: 2,
                countLabel: '2 items',
              }),
              ListItem({
                action: 'open-inbox',
                label: 'Inbox',
                icon: glyph(Inbox, 'inbox'),
                selected: true,
              }),
              ListItem({
                action: 'open-projects',
                label: 'Projects',
                icon: glyph(Folder, 'folder'),
              }),
            ],
          }),
      },
      {
        id: 'compact',
        label: 'Compact, no gap',
        height: 150,
        render: () =>
          List({
            dividerSides: 'lr',
            children: [
              ListItem({
                action: 'open-priority',
                label: 'Priority',
                icon: glyph(Star, 'star'),
              }),
              ListItem({
                action: 'open-all',
                label: 'All work',
                icon: glyph(ListIcon, 'list'),
              }),
            ],
          }),
      },
    ],
  },
  'toolbar-control-group': {
    css: [
      'foundation',
      'layout',
      'toolbar',
      'toolbar-text',
      'toolbar-control-group',
    ],
    selector: '#frame',
    width: 520,
    frameWidth: 'max-content',
    variants: [
      {
        id: 'icon-buttons',
        label: 'Bordered group of icon buttons',
        height: 56,
        render: () =>
          ToolbarControlGroup({
            label: 'View',
            children: raw(
              iconButton(ListIcon, 'list', 'List') +
                iconButton(Columns3, 'columns-3', 'Columns') +
                iconButton(Settings, 'settings', 'Settings'),
            ),
          }),
      },
      {
        id: 'borderless-single',
        label: 'Borderless single control',
        height: 56,
        render: () =>
          ToolbarControlGroup({
            appearance: 'borderless',
            single: true,
            children: raw(iconButton(Plus, 'plus', 'Add')),
          }),
      },
      {
        id: 'with-text',
        label: 'Label text beside a control',
        height: 56,
        render: () =>
          ToolbarControlGroup({
            appearance: 'borderless',
            children: raw(
              html(ToolbarText({ text: 'Workspace', size: 'small' })) +
                iconButton(Bell, 'bell', 'Notifications'),
            ),
          }),
      },
      {
        id: 'push-buttons',
        label: 'Push-appearance buttons',
        height: 56,
        render: () =>
          ToolbarControlGroup({
            buttonAppearance: 'push',
            children: raw(
              iconButton(ListIcon, 'list', 'List') +
                iconButton(Columns3, 'columns-3', 'Columns'),
            ),
          }),
      },
    ],
  },
  'list-item': {
    css: ['foundation', 'layout', 'lucide-icon', 'list-item'],
    selector: '#frame',
    width: 380,
    frameWidth: 320,
    variants: [
      {
        id: 'default',
        label: 'Icon and label',
        height: 52,
        render: () =>
          ListItem({
            label: 'Overview',
            icon: glyph(FileText, 'file-text'),
            action: 'select',
            itemId: 'overview',
          }),
      },
      {
        id: 'selected',
        label: 'Selected (aria-current)',
        height: 52,
        render: () =>
          ListItem({
            label: 'Billing & plans',
            icon: glyph(Settings, 'settings'),
            selected: true,
            action: 'select',
            itemId: 'billing',
          }),
      },
      {
        id: 'trailing',
        label: 'Trailing metadata',
        height: 52,
        render: () =>
          ListItem({
            label: 'Notifications',
            icon: glyph(Bell, 'bell'),
            trailing: raw('3'),
            action: 'select',
            itemId: 'notifications',
          }),
      },
      {
        id: 'multiline',
        label: 'Multiline label (icon aligns to first line)',
        height: 72,
        render: () =>
          ListItem({
            label:
              'Migrate the legacy billing pipeline to the new ledger service',
            multiline: true,
            icon: glyph(Star, 'star'),
            action: 'select',
            itemId: 'billing-migration',
          }),
      },
    ],
  },
  'list-header': {
    css: [
      'foundation',
      'layout',
      'lucide-icon',
      'disclosure-arrow',
      'list-header',
    ],
    selector: '#frame',
    width: 420,
    frameWidth: 380,
    variants: [
      {
        id: 'action',
        label: 'Label with an action',
        height: 52,
        render: () =>
          ListHeader({
            label: 'Team members',
            action: 'add-member',
            actionLabel: 'Add member',
            actionIcon: glyph(Plus, 'plus'),
          }),
      },
      {
        id: 'count',
        label: 'Label with a count pill',
        height: 52,
        render: () =>
          ListHeader({
            label: 'Open tickets',
            count: 12,
            countLabel: '12 open tickets',
          }),
      },
      {
        id: 'toggle-collapsed',
        label: 'Disclosure toggle, collapsed',
        height: 52,
        render: () =>
          ListHeader({ label: 'Archived', toggle: true, expanded: false }),
      },
      {
        id: 'toggle-expanded',
        label: 'Disclosure toggle, expanded',
        height: 52,
        render: () =>
          ListHeader({
            label: 'Recent',
            toggle: true,
            expanded: true,
            count: 5,
            countLabel: '5 recent',
          }),
      },
    ],
  },
  'list-action-row': {
    css: ['foundation', 'layout', 'lucide-icon', 'list-action-row'],
    selector: '#frame',
    width: 420,
    frameWidth: 380,
    variants: [
      {
        id: 'default',
        label: 'Primary with a trailing action',
        height: 52,
        render: () =>
          ListActionRow({
            label: 'staging.example.com',
            icon: glyph(Rocket, 'rocket'),
            action: 'open',
            itemId: 'staging',
            trailingAction: 'delete',
            trailingActionLabel: 'Delete deployment',
            trailingActionIcon: glyph(Trash2, 'trash-2'),
          }),
      },
      {
        id: 'selected',
        label: 'Selected primary',
        height: 52,
        render: () =>
          ListActionRow({
            label: 'production.example.com',
            icon: glyph(Rocket, 'rocket'),
            selected: true,
            action: 'open',
            itemId: 'production',
            trailingAction: 'edit',
            trailingActionLabel: 'Edit deployment',
            trailingActionIcon: glyph(Pencil, 'pencil'),
          }),
      },
    ],
  },
  'value-table': {
    css: ['foundation', 'layout', 'lucide-icon', 'value-table', 'skeleton'],
    selector: '#frame',
    width: 460,
    frameWidth: 420,
    variants: [
      {
        id: 'details',
        label: 'Key/value detail rows',
        height: 180,
        render: () =>
          ValueTable({
            label: 'Deployment details',
            children: [
              ValueTableRow({ label: 'Status', value: 'Live' }),
              ValueTableRow({
                label: 'Environment',
                value: 'Production',
                icon: glyph(Rocket, 'rocket'),
              }),
              ValueTableRow({ label: 'Region', value: 'us-east-1' }),
              ValueTableRow({ label: 'Last deploy', value: '2 hours ago' }),
            ],
          }),
      },
    ],
  },
  'state-banner': {
    css: ['foundation', 'layout', 'lucide-icon', 'state-banner'],
    selector: '#frame',
    width: 560,
    frameWidth: 500,
    variants: [
      {
        id: 'info',
        label: 'Info',
        height: 76,
        render: () =>
          StateBanner({
            tone: 'info',
            icon: glyph(CircleAlert, 'circle-alert'),
            title: 'Draft not published',
            detail: 'Changes are saved but only visible to your team.',
            action: raw(pushButton('Publish')),
          }),
      },
      {
        id: 'info-badge',
        label: 'Info with badge',
        height: 76,
        render: () =>
          StateBanner({
            tone: 'info',
            icon: glyph(CircleAlert, 'circle-alert'),
            title: 'Unanswered questions',
            badge: '1',
            action: raw(pushButton('Answer')),
          }),
      },
      {
        id: 'success',
        label: 'Success',
        height: 76,
        render: () =>
          StateBanner({
            tone: 'success',
            icon: glyph(CircleCheck, 'circle-check'),
            title: 'Deployment complete',
            detail: 'production.example.com is serving the new build.',
          }),
      },
      {
        id: 'warning',
        label: 'Warning',
        height: 76,
        render: () =>
          StateBanner({
            tone: 'warning',
            icon: glyph(TriangleAlert, 'triangle-alert'),
            title: 'Approaching your plan limit',
            detail: 'You have used 92% of this month’s build minutes.',
            action: raw(pushButton('Upgrade')),
          }),
      },
      {
        id: 'danger',
        label: 'Danger (alert)',
        height: 76,
        render: () =>
          StateBanner({
            tone: 'danger',
            urgency: 'alert',
            icon: glyph(CircleAlert, 'circle-alert'),
            title: 'Build failed',
            detail: 'Step “test” exited with code 1.',
            action: raw(pushButton('View log')),
          }),
      },
    ],
  },
  'empty-state': {
    css: ['foundation', 'layout', 'lucide-icon', 'empty-state'],
    selector: '#frame',
    width: 460,
    frameWidth: 420,
    variants: [
      {
        id: 'with-action',
        label: 'Icon, title, detail, and action',
        height: 180,
        render: () =>
          EmptyState({
            icon: glyph(Inbox, 'inbox'),
            title: 'No open tickets',
            detail: 'When someone files a ticket it will show up here.',
            action: raw(pushButton('New ticket')),
          }),
      },
      {
        id: 'filtered',
        label: 'No results for a filter',
        height: 150,
        render: () =>
          EmptyState({
            icon: glyph(Filter, 'filter'),
            title: 'No matches',
            detail: 'No tickets match the current filters.',
          }),
      },
    ],
  },
  skeleton: {
    css: ['foundation', 'skeleton'],
    selector: '#frame',
    width: 360,
    frameWidth: 320,
    variants: [
      {
        id: 'block',
        label: 'Single block',
        height: 40,
        render: () => Skeleton({ width: em(16), height: em(1.5) }),
      },
      {
        id: 'lines',
        label: 'Paragraph lines',
        height: 84,
        render: () => Skeleton({ lines: 3 }),
      },
      {
        id: 'avatar',
        label: 'Circular (avatar)',
        height: 56,
        render: () =>
          Skeleton({ width: em(3), height: em(3), radius: px(999) }),
      },
    ],
  },
  'segmented-control': {
    css: [
      'foundation',
      'layout',
      'lucide-icon',
      'toolbar-control-group',
      'segmented-control',
    ],
    selector: '#frame',
    width: 460,
    frameWidth: 'max-content',
    variants: [
      {
        id: 'equal',
        label: 'Equal-width rounded',
        height: 48,
        render: () =>
          SegmentedControl({
            id: 'view',
            label: 'View',
            value: 'board',
            shape: 'rounded',
            layout: 'equal',
            choices: [
              { value: 'board', label: 'Board' },
              { value: 'list', label: 'List' },
              { value: 'timeline', label: 'Timeline' },
            ],
          }),
      },
      {
        id: 'pill-small',
        label: 'Pill, small',
        height: 48,
        render: () =>
          SegmentedControl({
            id: 'range',
            label: 'Range',
            value: 'week',
            shape: 'pill',
            size: 'small',
            choices: [
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ],
          }),
      },
    ],
  },
  'tab-bar': {
    css: ['foundation', 'layout', 'lucide-icon', 'tab-bar', 'app-tab'],
    selector: '#frame',
    width: 640,
    frameWidth: 600,
    variants: [
      {
        id: 'workspace-tabs',
        label: 'Selected tab among peers',
        height: 56,
        render: () =>
          TabBar({
            id: 'files',
            label: 'Open files',
            children: [
              AppTab({
                id: 'readme',
                name: 'README.md',
                leading: glyph(FileText, 'file-text'),
                selected: true,
              }),
              AppTab({
                id: 'index',
                name: 'index.ts',
                leading: glyph(FileText, 'file-text'),
              }),
              AppTab({
                id: 'styles',
                name: 'styles.css',
                leading: glyph(FileText, 'file-text'),
              }),
            ],
          }),
      },
    ],
  },
  'token-search-field': {
    css: [
      'foundation',
      'layout',
      'lucide-icon',
      'toolbar-control-group',
      'token-search-field',
    ],
    selector: '#frame',
    width: 560,
    frameWidth: 520,
    variants: [
      {
        id: 'tokens',
        label: 'Text with atomic tokens',
        height: 60,
        render: () =>
          TokenSearchField({
            id: 'search',
            label: 'Search tickets',
            query: 'payments is:open ',
            tokens: [{ value: 'is:open', label: 'is:open', offset: 9 }],
            placeholder: 'Search tickets',
          }),
      },
      {
        id: 'empty',
        label: 'Empty, expanded',
        height: 60,
        render: () =>
          TokenSearchField({
            id: 'search-empty',
            label: 'Search',
            placeholder: 'Search tickets',
          }),
      },
    ],
  },
  toolbar: {
    css: [
      'foundation',
      'layout',
      'lucide-icon',
      'toolbar-text',
      'toolbar-control-group',
      'toolbar',
    ],
    selector: '#frame',
    width: 640,
    frameWidth: 600,
    variants: [
      {
        id: 'title-and-actions',
        label: 'Title with a trailing group',
        height: 64,
        render: () =>
          Toolbar({
            label: 'Workspace',
            leading: ToolbarControlGroup({
              appearance: 'borderless',
              single: true,
              children: ToolbarText({ text: 'Northstar', size: 'large' }),
            }),
            trailing: ToolbarControlGroup({
              label: 'View',
              children: raw(
                iconButton(ListIcon, 'list', 'List') +
                  iconButton(Columns3, 'columns-3', 'Columns') +
                  iconButton(Settings, 'settings', 'Settings'),
              ),
            }),
          }),
      },
    ],
  },
  'toolbar-text': {
    css: ['foundation', 'toolbar-text'],
    selector: '#frame',
    width: 360,
    frameWidth: 'max-content',
    variants: [
      {
        id: 'large',
        label: 'Large (title)',
        height: 40,
        render: () =>
          ToolbarText({ text: 'Northstar migration', size: 'large' }),
      },
      {
        id: 'default',
        label: 'Default',
        height: 36,
        render: () => ToolbarText({ text: 'Workspace settings' }),
      },
      {
        id: 'small',
        label: 'Small (label)',
        height: 32,
        render: () => ToolbarText({ text: 'Filters', size: 'small' }),
      },
    ],
  },
};

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
const frameCss = (theme) => `
* { box-sizing: border-box; }
body { margin: 0; padding: 20px; background: ${theme.pageBackground}; font-family: system-ui, -apple-system, sans-serif; }
.dt-button { min-height: 32px; padding: 0 12px; border: 1px solid var(--kui-color-border); border-radius: var(--kui-radius-pill); color: var(--kui-color-text); background: var(--kui-color-surface-raised); font: inherit; cursor: pointer; }
.dt-icon-button { display: inline-grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: var(--kui-radius-m); color: var(--kui-color-text); background: transparent; cursor: pointer; }
.dt-icon-button svg { width: 18px; height: 18px; }
`;

// `ui-monospace` resolves to different fonts on developer and hosted macOS
// machines. Keep the public component fallback unchanged, but pin the capture
// fixture to a font shipped by macOS so its text metrics are reproducible.
const captureCss = `:root { --kui-font-mono: "Courier New", monospace; }`;

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

async function buildComponent(domotion, name, spec) {
  const cssText = (
    await Promise.all(
      spec.css.map((f) =>
        readFile(resolve(root, `dist/styles/${f}.css`), 'utf8'),
      ),
    )
  ).join('\n');
  const dir = resolve(outRoot, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const frameWidth =
    typeof spec.frameWidth === 'number'
      ? `${spec.frameWidth}px`
      : spec.frameWidth;
  const rendered = [];
  for (const variant of spec.variants) {
    const themed = {};
    for (const theme of THEMES) {
      const page = `<!doctype html><html><head><meta charset="utf-8"><style>${frameCss(theme)}${cssText}${captureCss}</style></head><body><div id="frame" style="width:${frameWidth};display:inline-block">${html(variant.render())}</div></body></html>`;
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
  for (const [name, spec] of Object.entries(COMPONENTS)) {
    console.log(`Building ${name} design template…`);
    await buildComponent(domotion, name, spec);
  }
  console.log('Design templates written to docs/design/templates/.');
}

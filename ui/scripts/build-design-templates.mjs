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

import { build } from 'esbuild';
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
  MoreHorizontal,
  Pencil,
  Plus,
  Rocket,
  Search,
  Settings,
  Star,
  Trash2,
  TriangleAlert,
} from 'lucide';

import { TabBarItem } from '../dist/tab-bar-item.js';
import { Button } from '../dist/button.js';
import { Checkbox } from '../dist/checkbox.js';
import { Chip } from '../dist/chip.js';
import { ChoiceChips } from '../dist/choice-chips.js';
import { MessageComposer } from '../dist/message-composer.js';
import { em, fillColor, px } from '../dist/css-values.js';
import { EmptyState } from '../dist/empty-state.js';
import { Disclosure } from '../dist/disclosure.js';
import { List } from '../dist/list.js';
import { ProgressBar } from '../dist/progress-bar.js';
import { ProgressRing } from '../dist/progress-ring.js';
import { ListActionRow } from '../dist/list-action-row.js';
import { ListHeader } from '../dist/list-header.js';
import { ListItem } from '../dist/list-item.js';
import { LucideIcon } from '../dist/lucide-icon.js';
import { RadioGroup } from '../dist/radio-group.js';
import { Row } from '../dist/row.js';
import { SegmentedControl } from '../dist/segmented-control.js';
import { Select } from '../dist/select.js';
import { Skeleton } from '../dist/skeleton.js';
import { StateBanner } from '../dist/state-banner.js';
import { Switch } from '../dist/switch.js';
import { TabBar } from '../dist/tab-bar.js';
import { Text } from '../dist/text.js';
import { TextField } from '../dist/text-field.js';
import { Toolbar } from '../dist/toolbar.js';
import { ToolbarControlGroup } from '../dist/toolbar-control-group.js';
import { ToolbarText } from '../dist/toolbar-text.js';
import { SearchField } from '../dist/search-field.js';
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
const brandButton = (label) =>
  `<button type="button" class="dt-button" data-variant="brand">${label}</button>`;

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
        label: 'Standard Gap and Four Dividers',
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
        label: 'Compact, No Gap',
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
                label: 'All Work',
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
      ...['neutral', 'brand', 'success', 'warning', 'danger'].map(
        (tileTone) => ({
          id: `icon-tile-${tileTone}`,
          label: `${tileTone[0].toUpperCase()}${tileTone.slice(1)} Quiet Icon Tile`,
          height: 56,
          render: () =>
            ToolbarControlGroup({
              single: true,
              tileTone,
              children: glyph(Settings, 'settings'),
            }),
        }),
      ),
      {
        id: 'icon-buttons',
        label: 'Bordered Group of Icon Buttons',
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
        label: 'Borderless Single Control',
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
        label: 'Label Text Beside a Control',
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
        // A template cannot carry backdrop-filter (the capture would rasterize
        // it into an embedded image design tools cannot load), so the glass
        // group drops the filter and is drawn over sample dusk color bands: the
        // translucent material, specular edge, and shadow read as designed,
        // without the live blur.
        id: 'glass',
        label: 'Glass Material Over Artwork',
        height: 72,
        render: () =>
          raw(
            `<div style="position:relative;padding:8px;display:inline-block;--kui-chrome-material-filter:none">` +
              // Flat dusk bands behind the group: a gradient backdrop would
              // keep a nested SVG that design tools cannot load.
              `<div style="position:absolute;inset:0;display:flex">` +
              ['#1b2a5c', '#7a3f6e', '#c2577a', '#f4b36b']
                .map(
                  (color) => `<div style="flex:1;background:${color}"></div>`,
                )
                .join('') +
              `</div><div style="position:relative">${html(
                ToolbarControlGroup({
                  label: 'Glass Navigation',
                  material: 'glass',
                  children: raw(
                    iconButton(ListIcon, 'list', 'List') +
                      iconButton(Columns3, 'columns-3', 'Columns') +
                      iconButton(Settings, 'settings', 'Settings'),
                  ),
                }),
              )}</div></div>`,
          ),
      },
      {
        id: 'push-buttons',
        label: 'Push-Appearance Buttons',
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
        label: 'Icon and Label',
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
            label: 'Billing & Plans',
            icon: glyph(Settings, 'settings'),
            selected: true,
            action: 'select',
            itemId: 'billing',
          }),
      },
      {
        id: 'trailing',
        label: 'Trailing Metadata',
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
        label: 'Multiline Label (Icon Aligns to First Line)',
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
      {
        id: 'icon-tile',
        label: 'Tone Icon Tile',
        height: 52,
        render: () =>
          ListItem({
            label: 'Notifications',
            icon: glyph(Bell, 'bell'),
            iconTile: 'brand',
            action: 'select',
            itemId: 'notifications-tile',
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
        label: 'Label with an Action',
        height: 52,
        render: () =>
          ListHeader({
            label: 'Team Members',
            action: 'add-member',
            actionLabel: 'Add member',
            actionIcon: glyph(Plus, 'plus'),
          }),
      },
      {
        id: 'count',
        label: 'Label with a Count Pill',
        height: 52,
        render: () =>
          ListHeader({
            label: 'Open Tickets',
            count: 12,
            countLabel: '12 open tickets',
          }),
      },
      ...['xs', 'm', 'l', 'xl'].map((size) => ({
        id: `size-${size}`,
        label: `Label Size ${size.toUpperCase()}`,
        height: 52,
        render: () => ListHeader({ label: 'Team Members', size }),
      })),
      {
        id: 'inline-action',
        label: 'Inline Label with an Action',
        height: 52,
        render: () =>
          ListHeader({
            label: 'Queued',
            inline: true,
            action: 'add-queued',
            actionLabel: 'Add queued item',
            actionIcon: glyph(Plus, 'plus'),
          }),
      },
      {
        id: 'toggle-collapsed',
        label: 'Disclosure Toggle, Collapsed',
        height: 52,
        render: () =>
          ListHeader({ label: 'Archived', toggle: true, expanded: false }),
      },
      {
        id: 'toggle-expanded',
        label: 'Disclosure Toggle, Expanded',
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
        label: 'Primary with a Trailing Action',
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
        label: 'Selected Primary',
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
      {
        id: 'trailing-menu',
        label: 'Trailing Overflow Menu',
        height: 52,
        render: () =>
          ListActionRow({
            label: 'preview.example.com',
            icon: glyph(Rocket, 'rocket'),
            action: 'open',
            itemId: 'preview',
            trailingMenu: {
              label: 'Actions for preview.example.com',
              icon: glyph(MoreHorizontal, 'more-horizontal'),
              items: [
                { label: 'Edit', action: 'edit' },
                { kind: 'divider' },
                { label: 'Delete', action: 'delete', tone: 'danger' },
              ],
            },
          }),
      },
      {
        id: 'icon-tile',
        label: 'Colored Icon Tile',
        height: 52,
        render: () =>
          ListActionRow({
            label: 'Deploy Preview',
            icon: glyph(Rocket, 'rocket'),
            iconTile: { color: fillColor('#0090ff') },
            action: 'open',
            itemId: 'deploy-preview',
            trailingAction: 'edit',
            trailingActionLabel: 'Edit Deploy Preview',
            trailingActionIcon: glyph(Pencil, 'pencil'),
          }),
      },
    ],
  },
  chip: {
    css: ['foundation', 'layout', 'row', 'lucide-icon', 'value-table', 'chip'],
    selector: '#frame',
    width: 460,
    frameWidth: 420,
    variants: [
      {
        id: 'tags',
        label: 'Removable, Link, and Plain Tags',
        height: 48,
        render: () =>
          Row({
            gap: 'xs',
            wrap: true,
            children: [
              Chip({
                children: 'Urgent',
                tone: 'info',
                itemId: 'urgent',
                removeAction: 'remove-tag',
                removeLabel: 'Remove Urgent tag',
              }),
              Chip({
                children: 'report.md',
                href: '/files/report.md',
                download: 'report.md',
                icon: glyph(FileText, 'file-text'),
              }),
              Chip({ children: 'Backlog', appearance: 'solid' }),
            ],
          }),
      },
      {
        id: 'action-filters',
        label: 'Action Chips in a Compact Value Table',
        height: 190,
        render: () => {
          const filters = (tokens, unavailable = []) =>
            Row({
              gap: '2xs',
              wrap: true,
              children: tokens.map((token) =>
                Chip({
                  children: token,
                  action: 'insert-filter',
                  actionLabel: `Insert filter ${token}`,
                  itemId: token,
                  size: 'compact',
                  shape: 'rounded',
                  disabled: unavailable.includes(token),
                }),
              ),
            });
          return ValueTable({
            label: 'Search Filters',
            density: 'compact',
            children: [
              ValueTableRow({
                label: 'Status',
                value: filters(['is:draft', 'is:sent', 'is:awarded']),
              }),
              ValueTableRow({
                label: 'Ownership',
                value: filters(['is:mine', 'is:shared']),
              }),
              ValueTableRow({
                label: 'Site',
                value: filters(['site:Karachi', 'site:Lahore']),
              }),
              ValueTableRow({
                label: 'Content',
                value: filters(
                  ['has:questions', 'has:attachments'],
                  ['has:attachments'],
                ),
              }),
            ],
          });
        },
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
        label: 'Key/Value Detail Rows',
        height: 180,
        render: () =>
          ValueTable({
            label: 'Deployment Details',
            children: [
              ValueTableRow({ label: 'Status', value: 'Live' }),
              ValueTableRow({
                label: 'Environment',
                value: 'Production',
                icon: glyph(Rocket, 'rocket'),
              }),
              ValueTableRow({ label: 'Region', value: 'us-east-1' }),
              ValueTableRow({ label: 'Last Deploy', value: '2 hours ago' }),
            ],
          }),
      },
    ],
  },
  disclosure: {
    css: [
      'foundation',
      'layout',
      'lucide-icon',
      'disclosure-arrow',
      'text',
      'list',
      'disclosure',
    ],
    selector: '#frame',
    width: 460,
    frameWidth: 420,
    variants: [
      {
        id: 'plain',
        label: 'Closed and Open',
        height: 140,
        render: () =>
          List({
            gap: 'xs',
            children: [
              Disclosure({
                title: 'Advanced Settings',
                detail: '3 options',
                children: Text({
                  children: 'Proxy, timeout, and retry limits.',
                }),
              }),
              Disclosure({
                title: 'Release Notes',
                open: true,
                children: Text({ children: 'Faster sync and four fixes.' }),
              }),
            ],
          }),
      },
      {
        id: 'framed-sunken',
        label: 'Framed and Sunken',
        height: 150,
        render: () =>
          List({
            gap: 'xs',
            children: [
              Disclosure({
                title: 'When am I billed?',
                appearance: 'framed',
                open: true,
                children: Text({ children: 'On the first of each month.' }),
              }),
              Disclosure({
                title: 'Build Log',
                detail: '412 lines',
                appearance: 'sunken',
                children: Text({ children: 'npm run build' }),
              }),
            ],
          }),
      },
    ],
  },
  'progress-bar': {
    css: ['foundation', 'layout', 'list', 'progress-bar'],
    selector: '#frame',
    width: 460,
    frameWidth: 420,
    variants: [
      {
        id: 'determinate',
        label: 'Labeled with a Readout',
        height: 60,
        render: () =>
          ProgressBar({
            label: 'Uploading Files',
            value: 4,
            max: 12,
            valueText: '4 of 12 files',
            showValue: true,
          }),
      },
      {
        id: 'tones',
        label: 'Tones and Compact',
        height: 150,
        render: () =>
          List({
            gap: 'xs',
            children: [
              ProgressBar({
                label: 'Confidence',
                value: 0.82,
                tone: 'success',
                showValue: true,
              }),
              ProgressBar({
                label: 'Storage Used',
                value: 0.93,
                tone: 'warning',
                showValue: true,
              }),
              ProgressBar({
                ariaLabel: 'Sync Progress',
                value: 0.4,
                size: 'compact',
              }),
            ],
          }),
      },
    ],
  },
  'progress-ring': {
    css: ['foundation', 'layout', 'row', 'progress-ring'],
    selector: '#frame',
    width: 300,
    frameWidth: 'max-content',
    variants: [
      {
        id: 'sizes',
        label: 'Small, Medium, and Large',
        height: 44,
        render: () =>
          Row({
            gap: 'm',
            vAlign: 'middle',
            children: [
              ProgressRing({
                label: 'Upload, small',
                value: 0.33,
                size: 'small',
              }),
              ProgressRing({ label: 'Upload, medium', value: 0.33 }),
              ProgressRing({
                label: 'Upload, large',
                value: 0.33,
                size: 'large',
              }),
            ],
          }),
      },
      {
        id: 'tones',
        label: 'Tones',
        height: 32,
        render: () =>
          Row({
            gap: 'm',
            vAlign: 'middle',
            children: [
              ProgressRing({ label: 'Done', value: 0.75, tone: 'success' }),
              ProgressRing({ label: 'Quota', value: 0.9, tone: 'warning' }),
              ProgressRing({ label: 'Budget', value: 0.98, tone: 'danger' }),
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
            title: 'Draft Not Published',
            detail: 'Changes are saved but only visible to your team.',
            action: raw(pushButton('Publish')),
          }),
      },
      {
        id: 'info-badge',
        label: 'Info with Badge',
        height: 76,
        render: () =>
          StateBanner({
            tone: 'info',
            icon: glyph(CircleAlert, 'circle-alert'),
            title: 'Unanswered Questions',
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
            title: 'Deployment Complete',
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
            title: 'Approaching Your Plan Limit',
            detail: 'You have used 92% of this month’s build minutes.',
            action: raw(pushButton('Upgrade')),
          }),
      },
      {
        id: 'danger',
        label: 'Danger (Alert)',
        height: 76,
        render: () =>
          StateBanner({
            tone: 'danger',
            urgency: 'alert',
            icon: glyph(CircleAlert, 'circle-alert'),
            title: 'Build Failed',
            detail: 'Step “test” exited with code 1.',
            action: raw(pushButton('View Log')),
          }),
      },
      {
        id: 'strip',
        label: 'Strip (Full-Width Band)',
        height: 76,
        render: () =>
          StateBanner({
            presentation: 'strip',
            tone: 'warning',
            icon: glyph(TriangleAlert, 'triangle-alert'),
            title: 'Notifications Paused',
            detail: 'Desktop alerts resume when you reconnect.',
            copyLayout: 'stacked',
            action: raw(pushButton('Resume')),
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
        label: 'Icon, Title, Detail, and Action',
        height: 180,
        render: () =>
          EmptyState({
            icon: glyph(Inbox, 'inbox'),
            title: 'No Open Tickets',
            detail: 'When someone files a ticket it will show up here.',
            action: raw(pushButton('New Ticket')),
          }),
      },
      {
        id: 'filtered',
        label: 'No Results for a Filter',
        height: 150,
        render: () =>
          EmptyState({
            icon: glyph(Filter, 'filter'),
            title: 'No Matches',
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
        label: 'Single Block',
        height: 40,
        render: () => Skeleton({ width: em(16), height: em(1.5) }),
      },
      {
        id: 'lines',
        label: 'Paragraph Lines',
        height: 84,
        render: () => Skeleton({ lines: 3 }),
      },
      {
        id: 'avatar',
        label: 'Circular (Avatar)',
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
        label: 'Equal-Width Rounded',
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
        label: 'Pill, Small',
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
  'choice-chips': {
    css: ['foundation', 'layout', 'lucide-icon', 'choice-chips'],
    selector: '#frame',
    width: 600,
    frameWidth: 560,
    variants: [
      {
        id: 'color-palette',
        label: 'Wrapping Color Palette',
        height: 96,
        render: () =>
          ChoiceChips({
            name: 'color',
            label: 'Color',
            value: 'blue',
            choices: [
              {
                value: 'transparent',
                label: 'Transparent',
                swatch: 'transparent',
              },
              {
                value: 'blue',
                label: 'Blue',
                swatch: fillColor('#3b82f6'),
              },
              {
                value: 'green',
                label: 'Green',
                swatch: fillColor('#22c55e'),
              },
              {
                value: 'orange',
                label: 'Orange',
                swatch: fillColor('#f97316'),
              },
              {
                value: 'red',
                label: 'Red',
                swatch: fillColor('#ef4444'),
              },
              {
                value: 'purple',
                label: 'Purple',
                swatch: fillColor('#a855f7'),
              },
              {
                value: 'pink',
                label: 'Pink',
                swatch: fillColor('#ec4899'),
              },
              {
                value: 'teal',
                label: 'Teal',
                swatch: fillColor('#14b8a6'),
              },
              {
                value: 'gray',
                label: 'Gray',
                swatch: fillColor('#6b7280'),
              },
            ],
          }),
      },
      {
        id: 'compact-icons',
        label: 'Compact with Icons',
        height: 40,
        render: () =>
          ChoiceChips({
            name: 'view',
            label: 'View',
            value: 'board',
            size: 'compact',
            choices: [
              {
                value: 'board',
                label: 'Board',
                icon: LucideIcon({ icon: Columns3, name: 'columns-3' }),
              },
              {
                value: 'list',
                label: 'List',
                icon: LucideIcon({ icon: ListIcon, name: 'list' }),
              },
            ],
          }),
      },
      {
        id: 'multiple',
        label: 'Multiple Selection',
        height: 48,
        render: () =>
          ChoiceChips({
            name: 'labels',
            label: 'Labels',
            multiple: true,
            value: ['bug', 'docs'],
            choices: [
              {
                value: 'bug',
                label: 'Bug',
                swatch: fillColor('#ef4444'),
              },
              {
                value: 'feature',
                label: 'Feature',
                swatch: fillColor('#3b82f6'),
              },
              {
                value: 'docs',
                label: 'Docs',
                swatch: fillColor('#22c55e'),
              },
              {
                value: 'design',
                label: 'Design',
                swatch: fillColor('#a855f7'),
              },
              {
                value: 'chore',
                label: 'Chore',
                swatch: fillColor('#6b7280'),
              },
            ],
          }),
      },
    ],
  },
  'message-composer': {
    css: ['foundation', 'layout', 'text', 'message-composer'],
    selector: '#frame',
    width: 600,
    frameWidth: 560,
    variants: [
      {
        id: 'chat',
        label: 'Chat MessageComposer with Hint',
        height: 120,
        render: () =>
          MessageComposer({
            id: 'message',
            name: 'message',
            label: 'Message',
            placeholder: 'Ask about this build',
            hint: 'Answers use the latest nightly build.',
            trailing: raw(brandButton('Send')),
          }),
      },
      {
        id: 'prompt',
        label: 'Prompt with Taller Bounds',
        height: 168,
        render: () =>
          MessageComposer({
            id: 'prompt',
            name: 'prompt',
            label: 'Prompt',
            placeholder: 'Describe the change you want',
            minRows: 3,
            maxRows: 12,
            trailing: raw(brandButton('Generate')),
          }),
      },
    ],
  },
  'tab-bar': {
    css: ['foundation', 'layout', 'lucide-icon', 'tab-bar', 'tab-bar-item'],
    selector: '#frame',
    width: 640,
    frameWidth: 600,
    variants: [
      {
        id: 'workspace-tabs',
        label: 'Selected Tab Among Peers',
        height: 56,
        render: () =>
          TabBar({
            id: 'files',
            label: 'Open Files',
            children: [
              TabBarItem({
                id: 'readme',
                name: 'README.md',
                leading: glyph(FileText, 'file-text'),
                selected: true,
              }),
              TabBarItem({
                id: 'index',
                name: 'index.ts',
                leading: glyph(FileText, 'file-text'),
              }),
              TabBarItem({
                id: 'styles',
                name: 'styles.css',
                leading: glyph(FileText, 'file-text'),
              }),
            ],
          }),
      },
    ],
  },
  'search-field': {
    css: [
      'foundation',
      'layout',
      'lucide-icon',
      'toolbar-control-group',
      'search-field',
    ],
    selector: '#frame',
    width: 560,
    frameWidth: 520,
    variants: [
      {
        id: 'tokens',
        label: 'Text with Atomic Tokens',
        height: 60,
        render: () =>
          SearchField({
            id: 'search',
            label: 'Search Tickets',
            query: 'payments is:open ',
            tokens: [{ value: 'is:open', label: 'is:open', offset: 9 }],
            placeholder: 'Search tickets',
          }),
      },
      {
        id: 'empty',
        label: 'Empty, Expanded',
        height: 60,
        render: () =>
          SearchField({
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
        label: 'Title with a Trailing Group',
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
      ...[600, 320].map((width) => ({
        id: `width-visibility-${width}`,
        label: `Width Visibility (${width}px)`,
        height: 64,
        wireToolbarVisibility: true,
        render: () =>
          raw(
            `<div style="width:${width}px">${html(
              Toolbar({
                label: 'Workspace',
                leading: ToolbarText({ text: 'Workspace', hideBelow: px(176) }),
                trailing: [
                  ToolbarControlGroup({
                    single: true,
                    label: 'Refresh',
                    children: raw(iconButton(Rocket, 'rocket', 'Refresh')),
                  }),
                  ToolbarControlGroup({
                    hideBelow: px(416),
                    label: 'Utilities',
                    children: raw(
                      iconButton(Filter, 'filter', 'Filter') +
                        iconButton(Settings, 'settings', 'Settings'),
                    ),
                  }),
                  ToolbarControlGroup({
                    showBelow: px(416),
                    single: true,
                    label: 'More',
                    children: raw(
                      iconButton(Columns3, 'columns-3', 'More Actions'),
                    ),
                  }),
                ],
              }),
            )}</div>`,
          ),
      })),
    ],
  },
  button: {
    css: ['foundation', 'layout', 'row', 'lucide-icon', 'button'],
    selector: '#frame',
    width: 520,
    frameWidth: 'max-content',
    variants: [
      {
        id: 'tones',
        label: 'Primary Tones',
        height: 44,
        render: () =>
          Row({
            gap: 'xs',
            children: [
              Button({ children: 'Save Changes', tone: 'brand' }),
              Button({ children: 'Cancel' }),
              Button({ children: 'Delete Project', tone: 'danger' }),
            ],
          }),
      },
      {
        id: 'emphasis',
        label: 'Secondary and Plain Emphasis',
        height: 44,
        render: () =>
          Row({
            gap: 'xs',
            children: [
              Button({ children: 'Export', emphasis: 'secondary' }),
              Button({
                children: 'Remove',
                tone: 'danger',
                emphasis: 'secondary',
              }),
              Button({ children: 'Learn More', emphasis: 'plain' }),
            ],
          }),
      },
      {
        id: 'icons',
        label: 'With an Icon, and Icon Only',
        height: 44,
        render: () =>
          Row({
            gap: 'xs',
            children: [
              Button({
                children: 'New Ticket',
                tone: 'brand',
                icon: glyph(Plus, 'plus'),
              }),
              Button({
                children: 'Filters',
                icon: glyph(Filter, 'filter'),
              }),
              Button({
                icon: glyph(Settings, 'settings'),
                ariaLabel: 'Settings',
              }),
            ],
          }),
      },
      {
        id: 'states',
        label: 'Compact and Disabled',
        height: 44,
        render: () =>
          Row({
            gap: 'xs',
            vAlign: 'middle',
            children: [
              Button({ children: 'Compact', size: 'compact' }),
              Button({ children: 'Unavailable', disabled: true }),
            ],
          }),
      },
      {
        id: 'toggles',
        label: 'Toggle, Resting and Pressed',
        height: 44,
        render: () =>
          Row({
            gap: 'xs',
            children: [
              Button({ children: 'Favorite', pressed: false }),
              Button({
                children: 'Favorite',
                icon: glyph(Star, 'star'),
                pressed: true,
              }),
              Button({ children: 'Pinned', tone: 'brand', pressed: true }),
              Button({
                icon: glyph(Star, 'star'),
                ariaLabel: 'Favorite',
                pressed: true,
              }),
            ],
          }),
      },
      {
        id: 'pill',
        label: 'Pill Shape',
        height: 44,
        render: () =>
          Row({
            gap: 'xs',
            children: [
              Button({ children: 'Follow', tone: 'brand', shape: 'pill' }),
              Button({ children: 'Share', shape: 'pill' }),
              Button({
                icon: glyph(Plus, 'plus'),
                ariaLabel: 'Add',
                shape: 'pill',
              }),
            ],
          }),
      },
    ],
  },
  'text-field': {
    css: ['foundation', 'layout', 'lucide-icon', 'text-field'],
    selector: '#frame',
    width: 400,
    frameWidth: 360,
    variants: [
      {
        id: 'labeled',
        label: 'Label, Value, and Hint',
        height: 94,
        render: () =>
          TextField({
            label: 'Project Name',
            value: 'Northstar Migration',
            hint: 'Visible to collaborators.',
            clearable: true,
          }),
      },
      {
        id: 'search',
        label: 'Search with an Icon',
        height: 44,
        render: () =>
          TextField({
            ariaLabel: 'Search Tickets',
            placeholder: 'Search tickets',
            type: 'search',
            icon: glyph(Search, 'search'),
          }),
      },
      {
        id: 'error',
        label: 'Required with an Error',
        height: 94,
        render: () =>
          TextField({
            label: 'Email',
            type: 'email',
            value: 'robin@',
            required: true,
            error: 'Enter a complete email address.',
          }),
      },
      {
        id: 'multiline',
        label: 'Growing Multi-Line with a Count',
        height: 127,
        render: () =>
          TextField({
            label: 'Release Note',
            multiline: true,
            rows: 3,
            maxRows: 8,
            placeholder: 'Summarize what changed',
            maxLength: 200,
            showCount: true,
          }),
      },
      {
        id: 'compact',
        label: 'Compact',
        height: 54,
        render: () =>
          TextField({ label: 'Tag', value: 'design', size: 'compact' }),
      },
    ],
  },
  checkbox: {
    css: ['foundation', 'layout', 'list', 'checkbox'],
    selector: '#frame',
    width: 400,
    frameWidth: 360,
    variants: [
      {
        id: 'states',
        label: 'Checked, Unchecked, and Disabled',
        height: 106,
        render: () =>
          List({
            gap: 'xs',
            children: [
              Checkbox({ label: 'Include in release', checked: true }),
              Checkbox({
                label: 'Email summaries',
                hint: 'Sent every Monday morning.',
              }),
              Checkbox({
                label: 'Locked setting',
                checked: true,
                disabled: true,
              }),
            ],
          }),
      },
      {
        id: 'mixed',
        label: 'Mixed Parent',
        height: 76,
        wire: "import { wireCheckboxes } from './ui/dist/wire-checkboxes.js'; wireCheckboxes(document);",
        render: () =>
          List({
            gap: 'xs',
            children: [
              Checkbox({ label: 'All tasks', indeterminate: true }),
              Checkbox({ label: 'Design review', checked: true }),
              Checkbox({ label: 'Build release' }),
            ],
          }),
      },
      {
        id: 'error',
        label: 'Required with an Error',
        height: 50,
        render: () =>
          Checkbox({
            label: 'I accept the release terms',
            required: true,
            error: 'Accept the terms to continue.',
          }),
      },
      {
        id: 'compact',
        label: 'Compact',
        height: 44,
        render: () =>
          List({
            gap: 'xs',
            children: [
              Checkbox({
                label: 'Show archived',
                size: 'compact',
                checked: true,
              }),
              Checkbox({ label: 'Show drafts', size: 'compact' }),
            ],
          }),
      },
    ],
  },
  'radio-group': {
    css: ['foundation', 'layout', 'radio-group'],
    selector: '#frame',
    width: 400,
    frameWidth: 360,
    variants: [
      {
        id: 'vertical',
        label: 'Stacked Choices with Hints',
        height: 189,
        render: () =>
          RadioGroup({
            label: 'Layout Density',
            name: 'density',
            value: 'balanced',
            hint: 'Applies to every list.',
            choices: [
              { value: 'compact', label: 'Compact' },
              { value: 'balanced', label: 'Balanced' },
              {
                value: 'roomy',
                label: 'Roomy',
                hint: 'Larger rows for touch screens.',
              },
              { value: 'custom', label: 'Custom', disabled: true },
            ],
          }),
      },
      {
        id: 'horizontal',
        label: 'Horizontal, Compact, with an Error',
        height: 65,
        render: () =>
          RadioGroup({
            label: 'Release Channel',
            name: 'channel',
            size: 'compact',
            orientation: 'horizontal',
            required: true,
            error: 'Choose a channel.',
            choices: [
              { value: 'stable', label: 'Stable' },
              { value: 'beta', label: 'Beta' },
              { value: 'nightly', label: 'Nightly' },
            ],
          }),
      },
    ],
  },
  switch: {
    css: ['foundation', 'layout', 'list', 'switch'],
    selector: '#frame',
    width: 400,
    frameWidth: 360,
    variants: [
      {
        id: 'states',
        label: 'On, Off, and Disabled',
        height: 106,
        render: () =>
          List({
            gap: 'xs',
            children: [
              Switch({
                label: 'Live updates',
                checked: true,
                hint: 'The list refreshes as tickets change.',
              }),
              Switch({ label: 'Compact navigation' }),
              Switch({
                label: 'Managed setting',
                checked: true,
                disabled: true,
              }),
            ],
          }),
      },
      {
        id: 'compact',
        label: 'Compact',
        height: 44,
        render: () =>
          List({
            gap: 'xs',
            children: [
              Switch({
                label: 'Show archived',
                size: 'compact',
                checked: true,
              }),
              Switch({ label: 'Show drafts', size: 'compact' }),
            ],
          }),
      },
    ],
  },
  select: {
    css: ['foundation', 'layout', 'lucide-icon', 'select'],
    selector: '#frame',
    width: 400,
    frameWidth: 360,
    variants: [
      {
        id: 'form',
        label: 'Labeled Form Field',
        height: 94,
        render: () =>
          Select({
            label: 'Status',
            name: 'status',
            value: 'review',
            hint: 'Moves the ticket on the board.',
            choices: [
              { value: 'backlog', label: 'Backlog' },
              { value: 'review', label: 'In Review' },
              { value: 'done', label: 'Done' },
            ],
          }),
      },
      {
        id: 'icons',
        label: 'Choices with Icons',
        height: 65,
        render: () =>
          Select({
            label: 'Notify',
            name: 'notify',
            value: 'mentions',
            choices: [
              {
                value: 'all',
                label: 'Every Update',
                icon: Bell,
                iconName: 'bell',
              },
              {
                value: 'mentions',
                label: 'Mentions Only',
                icon: Star,
                iconName: 'star',
              },
            ],
          }),
      },
      {
        id: 'compact',
        label: 'Compact, Disabled',
        height: 53,
        render: () =>
          Select({
            label: 'Region',
            name: 'region',
            value: 'us-east',
            size: 'compact',
            disabled: true,
            choices: [{ value: 'us-east', label: 'US East' }],
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
        id: 'dark-tone',
        label: 'Dark Toolbar Tone',
        height: 40,
        render: () =>
          raw(
            `<div style="background:var(--kui-color-neutral-fill-loud)">${html(ToolbarText({ text: 'Quarterly report.pdf', tone: 'dark' }))}</div>`,
          ),
      },
      {
        id: 'large',
        label: 'Large (Title)',
        height: 40,
        render: () =>
          ToolbarText({ text: 'Northstar Migration', size: 'large' }),
      },
      {
        id: 'default',
        label: 'Default',
        height: 36,
        render: () => ToolbarText({ text: 'Workspace Settings' }),
      },
      {
        id: 'small',
        label: 'Small (Label)',
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
.dt-button[data-variant="brand"] { border-color: var(--kui-color-brand-border-loud); color: var(--kui-color-brand-on-loud); background: var(--kui-color-brand-fill-loud); }
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

async function buildComponent(domotion, name, spec) {
  const cssText = (
    await Promise.all(
      (await resolveTemplateStyles(spec.css)).map((f) =>
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
      const wire = variant.wireToolbarVisibility
        ? "import { wireToolbarVisibility } from './ui/dist/wire-toolbar-visibility.js'; wireToolbarVisibility(document);"
        : variant.wire;
      const wiring = wire
        ? `<script>${(await build({ stdin: { contents: wire, resolveDir: resolve(root, '..') }, bundle: true, format: 'iife', write: false })).outputFiles[0].text}</script>`
        : '';
      const page = `<!doctype html><html><head><meta charset="utf-8"><style>${frameCss(theme)}${cssText}${captureCss}</style></head><body><div id="frame" style="width:${frameWidth};display:inline-block">${html(variant.render())}</div>${wiring}</body></html>`;
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

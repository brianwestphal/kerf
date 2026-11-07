// KF-JN4PF5: each ux-demo configuration of the lists, tables, and column views, built in
// the editor the way a person would (palette drags, outline and canvas
// selection, Inspector fields), then exported and compared with what the demo
// renders. A configuration the editor cannot build yet has a ticket instead
// of a test.
import { expect, test } from '@playwright/test';

import { area } from '../areas.js';
import {
  addChild,
  addIcon,
  canvas,
  choose,
  dragComponent,
  emptySpot,
  exported,
  icon,
  newDocument,
  node,
  page as pane,
  pickIcon,
  select,
  setText,
  turnOn,
} from '../build.js';
import type { ActionRowSpec, ChoiceSpec, ItemSpec } from './helpers.js';
import {
  actionRowNode,
  actionRows,
  addInto,
  applySpec,
  axisGap,
  board,
  boardNode,
  buttonGroup,
  buttonGroupNode,
  buttonNode,
  configureSelect,
  contentItemInto,
  dataAttribute,
  deleteSelected,
  demoContentItem,
  editAsJson,
  explorer,
  EXPLORER_NODES,
  explorerZones,
  FILE_ICONS,
  FILE_NODES,
  frameShell,
  frameShellNode,
  insetControl,
  insetControlNode,
  insetPane,
  insetPaneNode,
  insetText,
  insetTextNode,
  itemContent,
  itemNode,
  listItems,
  LONG_VALUE,
  OUTLINE_NODES,
  preview,
  previewNode,
  referenceBanner,
  referenceBannerNode,
  RESULT_PICKER,
  rootPane,
  rootPaneNode,
  selectNode,
  setCss,
  setTags,
  shortcuts,
  stacked,
  summaryContent,
  summaryRows,
  summaryRowsNode,
  textNode,
  tileCommands,
  trailingButton,
  treeNodeZone,
  treeZone,
  valueRow,
  valueRows,
  valueTable,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
});

test('builds ValueTable › Populated', async ({ page }) => {
  const rows = [
    valueRow('Package', '@kerfjs/ui'),
    valueRow('Rendering', 'Kerf SafeHtml', 'wrench'),
    valueRow('Styles', 'Explicit CSS subpaths'),
  ];
  await dragComponent(page, 'ValueTable', () => emptySpot(page));
  await valueTable(
    page,
    { text: { label: 'Package Metadata' } },
    rows.map(([spec]) => spec),
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'value-table',
        { label: 'Package Metadata' },
        {
          children: valueRows(
            rows.map(([spec]) => spec),
            rows.map(([, props]) => props),
          ),
        },
      ),
    ),
  );
});

test('builds ValueTable › Compact Metadata', async ({ page }) => {
  const rows = [valueRow('Host', 'localhost'), valueRow('Port', '5432')];
  await dragComponent(page, 'ValueTable', () => emptySpot(page));
  await valueTable(
    page,
    { choices: { density: 'compact' }, text: { label: 'Connection Metadata' } },
    rows.map(([spec]) => spec),
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'value-table',
        { label: 'Connection Metadata', density: 'compact' },
        {
          children: valueRows(
            rows.map(([spec]) => spec),
            rows.map(([, props]) => props),
          ),
        },
      ),
    ),
  );
});

test('builds ValueTable › Sunken Pane', async ({ page }) => {
  const rows = [
    valueRow('Owner', 'Workspace team'),
    valueRow('Review State', 'Ready'),
    valueRow('Source', 'Procurement brief'),
  ];
  await dragComponent(page, 'Pane', () => emptySpot(page));
  await select(page, /^Pane/, 1);
  await applySpec(page, {
    choices: { appearance: 'sunken' },
    flags: ['deepInset'],
  });
  await dragComponent(page, 'ValueTable', () => emptySpot(page));
  await valueTable(
    page,
    { text: { label: 'Assumptions' } },
    rows.map(([spec]) => spec),
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'pane',
        { appearance: 'sunken', deepInset: true },
        {
          content: [
            node(
              'value-table',
              { label: 'Assumptions' },
              {
                children: valueRows(
                  rows.map(([spec]) => spec),
                  rows.map(([, props]) => props),
                ),
              },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds ValueTable › Label Column and Stacking', async ({ page }) => {
  const rows = [
    valueRow('Server', 'hotsheet.example.com:4174', 'server'),
    valueRow('Store', '~/Documents/kerf.hs2'),
    valueRow('Status', 'Connected'),
  ];
  await dragComponent(page, 'ValueTable', () => emptySpot(page));
  await valueTable(
    page,
    {
      choices: { stackBelow: 'compact' },
      text: { label: 'Connection Details' },
    },
    rows.map(([spec]) => spec),
    { labelWidth: 'px(160)' },
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'value-table',
        {
          label: 'Connection Details',
          labelWidth: { $css: 'px(160)' },
          stackBelow: 'compact',
        },
        {
          children: valueRows(
            rows.map(([spec]) => spec),
            rows.map(([, props]) => props),
          ),
        },
      ),
    ),
  );
});

// KF-3Y2GS2: a placeholder row's required value is "", its skeleton slot.
test('builds ValueTable › Placeholder', async ({ page }) => {
  const rows = [
    valueRow('Package', '', undefined, true),
    valueRow('Rendering', '', 'wrench', true),
    valueRow('Styles', '', undefined, true),
  ];
  await dragComponent(page, 'ValueTable', () => emptySpot(page));
  await valueTable(
    page,
    { text: { label: 'Loading Metadata' } },
    rows.map(([spec]) => spec),
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'value-table',
        { label: 'Loading Metadata' },
        {
          children: valueRows(
            rows.map(([spec]) => spec),
            rows.map(([, props]) => props),
          ),
        },
      ),
    ),
  );
});

test('builds ValuePreview › Two Read-Only Versions', async ({ page }) => {
  await preview(page, 'Their Latest Version', LONG_VALUE);
  await preview(page, 'Your Version', 'A local edit\nwith a second line.');
  await expect(
    canvas(page).locator('.kui-value-preview[data-kerf-node]').first(),
  ).toContainText('Second line keeps its indentation');
  expect(await exported(page)).toEqual(
    pane(
      previewNode({ label: 'Their Latest Version', value: LONG_VALUE }),
      previewNode({
        label: 'Your Version',
        value: 'A local edit\nwith a second line.',
      }),
    ),
  );
});

test('builds ValuePreview › Custom Bounds', async ({ page }) => {
  await preview(page, 'Long Change', LONG_VALUE, {
    minHeight: 'px(64)',
    maxHeight: 'px(160)',
  });
  expect(await exported(page)).toEqual(
    pane(
      previewNode({
        label: 'Long Change',
        value: LONG_VALUE,
        minHeight: { $css: 'px(64)' },
        maxHeight: { $css: 'px(160)' },
      }),
    ),
  );
});

test('builds ValuePreview › Empty Value', async ({ page }) => {
  await preview(page, 'Empty Version', '');
  expect(await exported(page)).toEqual(
    pane(previewNode({ label: 'Empty Version', value: '' })),
  );
});

// The path is the first render's; choosing rows is the app's wiring.
test('builds ColumnExplorer › Files', async ({ page }) => {
  test.slow();
  await explorer(
    page,
    {
      text: {
        id: 'files',
        label: 'Files',
        action: 'column-explorer-demo-choose',
      },
    },
    ['src', 'components', 'button-tsx'],
  );
  await select(page, /^ColumnExplorer/);
  await setCss(page, 'minColumnWidth', 'px(200)');
  // The preview of button.tsx: a compact ValueTable of its details.
  await addChild(page, 'ValueTable', 'preview');
  await valueTable(
    page,
    { choices: { density: 'compact' }, text: { label: 'File details' } },
    [
      { text: { label: 'Name', value: 'button.tsx' } },
      { text: { label: 'Size', value: '4 KB' } },
    ],
  );
  await expect(
    canvas(page).locator('[data-item-id="button-tsx"]'),
  ).toBeVisible();
  expect(await exported(page)).toEqual(
    pane(
      node(
        'column-explorer',
        {
          id: 'files',
          label: 'Files',
          nodes: EXPLORER_NODES,
          path: ['src', 'components', 'button-tsx'],
          action: 'column-explorer-demo-choose',
          minColumnWidth: { $css: 'px(200)' },
        },
        {
          ...explorerZones(),
          preview: [
            node(
              'value-table',
              { label: 'File details', density: 'compact' },
              {
                children: [
                  node('value-table#ValueTableRow', {
                    label: 'Name',
                    value: 'button.tsx',
                  }),
                  node('value-table#ValueTableRow', {
                    label: 'Size',
                    value: '4 KB',
                  }),
                ],
              },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds ColumnExplorer › Paged on a Phone', async ({ page }) => {
  test.slow();
  await explorer(
    page,
    {
      choices: { layout: 'paged' },
      text: {
        id: 'phone',
        label: 'Files on a phone',
        action: 'column-explorer-demo-choose',
      },
    },
    ['src'],
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'column-explorer',
        {
          id: 'phone',
          label: 'Files on a phone',
          nodes: EXPLORER_NODES,
          path: ['src'],
          action: 'column-explorer-demo-choose',
          layout: 'paged',
        },
        explorerZones(),
      ),
    ),
  );
});

test('builds ListInsetText › Inset Bare Text', async ({ page }) => {
  const text =
    'Aligned plain text — its left edge lands at the same inset as the item above.';
  await insetPane(page);
  await referenceBanner(page, 'neutral', 'Note where its title text starts.');
  await insetText(page, text);
  expect(await exported(page)).toEqual(
    pane(
      insetPaneNode(
        referenceBannerNode('neutral', 'Note where its title text starts.'),
        insetTextNode(text),
      ),
    ),
  );
});

test('builds ListInsetText › Horizontal-Only Inset', async ({ page }) => {
  const lines = [
    'First tight line — aligned, no vertical box space.',
    'Second tight line, packed against the first.',
  ];
  await insetPane(page);
  for (const line of lines) await insetText(page, line, 'rl');
  expect(await exported(page)).toEqual(
    pane(insetPaneNode(...lines.map((line) => insetTextNode(line, 'rl')))),
  );
});

test('builds ListInsetText › Selected Physical Sides', async ({ page }) => {
  const text = 'Top, bottom, and left are inset; the right edge stays flush.';
  await insetPane(page);
  await insetText(page, text, 'tbl');
  expect(await exported(page)).toEqual(
    pane(insetPaneNode(insetTextNode(text, 'tbl'))),
  );
});

test('builds ListInsetControl › Inset a Self-Bordered Control', async ({
  page,
}) => {
  await insetPane(page);
  await referenceBanner(page, 'info', 'Its edges are the alignment reference.');
  await insetControl(page, 'TextField', {
    text: {
      label: 'Filter Records',
      placeholder: 'An input that owns its border and padding',
    },
  });
  expect(await exported(page)).toEqual(
    pane(
      insetPaneNode(
        referenceBannerNode('info', 'Its edges are the alignment reference.'),
        insetControlNode(
          node('text-field', {
            label: 'Filter Records',
            placeholder: 'An input that owns its border and padding',
          }),
        ),
      ),
    ),
  );
});

test('builds ListInsetControl › Selected Physical Sides', async ({ page }) => {
  await insetPane(page);
  await insetControl(
    page,
    'TextField',
    {
      text: {
        label: 'Filter Selected Sides',
        placeholder: 'Right and bottom inset',
      },
    },
    'rb',
  );
  expect(await exported(page)).toEqual(
    pane(
      insetPaneNode(
        insetControlNode(
          node('text-field', {
            label: 'Filter Selected Sides',
            placeholder: 'Right and bottom inset',
          }),
          'rb',
        ),
      ),
    ),
  );
});

test('builds ListInsetControl › Stretch Any Self-Bordered Control', async ({
  page,
}) => {
  const statuses: readonly ChoiceSpec[] = [
    { value: 'review', label: 'In Review' },
    { value: 'ready', label: 'Ready' },
    { value: 'done', label: 'Done' },
  ];
  await insetPane(page);
  await insetControl(page, 'Select', {}, 'trl');
  await configureSelect(page, {
    choices: statuses,
    props: { text: { name: 'demo-inset-status', label: 'Status' } },
    pick: 'In Review',
  });
  await insetControl(
    page,
    'TextField',
    { text: { label: 'Assignee', placeholder: 'Search people' } },
    'trl',
  );
  await insetControl(page, 'Button', {
    choices: { emphasis: 'secondary' },
    text: { children: 'Assign' },
  });
  expect(await exported(page)).toEqual(
    pane(
      insetPaneNode(
        insetControlNode(
          selectNode(
            { name: 'demo-inset-status', value: 'review', label: 'Status' },
            { choices: statuses },
          ),
          'trl',
        ),
        insetControlNode(
          node('text-field', {
            label: 'Assignee',
            placeholder: 'Search people',
          }),
          'trl',
        ),
        insetControlNode(
          node('button', { children: 'Assign', emphasis: 'secondary' }),
        ),
      ),
    ),
  );
});

test('builds ListItem › Divided List', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'ListItem', () => emptySpot(page));
  await select(page, /^ListItem/);
  await setText(page, 'description', 'Member');
  await setText(page, 'action', 'log-projects');
  await choose(page, 'divider', 'after');
  for (let copy = 0; copy < 3; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  const names = ['Ana Ruiz', 'Ben Okafor', 'Chen Wei', 'Dana Holt'];
  for (const [index, name] of names.entries()) {
    await select(page, /^ListItem/, index);
    await setText(page, 'label', name);
    await setText(page, 'itemId', `member-${index}`);
    if (index === 1) await turnOn(page, 'selected');
    // The demo's last row passes divider="none", the default.
    if (index === names.length - 1) await choose(page, 'divider', 'Not set');
  }
  expect(await exported(page)).toEqual(
    pane(
      node('list', undefined, {
        children: names.map((label, index) =>
          node('list-item', {
            label,
            action: 'log-projects',
            itemId: `member-${index}`,
            description: 'Member',
            ...(index < names.length - 1 ? { divider: 'after' } : {}),
            ...(index === 1 ? { selected: true } : {}),
          }),
        ),
      }),
    ),
  );
});

test('builds ListItem › Filled Command Rows', async ({ page }) => {
  // The demo's list-item tokens are the catalog viewport's, not the view's.
  const rows = [
    { action: 'log-projects', itemId: 'tone-rest', label: 'New Project' },
    {
      action: 'log-projects',
      itemId: 'tone-selected',
      label: 'Current Project',
      selected: true,
    },
  ];
  const specs: ItemSpec[] = rows.map(({ selected, ...text }) => ({
    text,
    flags: selected ? ['selected'] : [],
  }));
  await listItems(page, specs);
  expect(await exported(page)).toEqual(
    pane(
      node('list', undefined, {
        children: rows.map((props, index) => itemNode(props, specs[index]!)),
      }),
    ),
  );
});

test('builds ListItem › Tone Icon Tiles', async ({ page }) => {
  // The tile current at first render (tile-run-tests) names no row here.
  const settings = [
    ['tile-general', 'General', 'settings', 'neutral'],
    ['tile-notifications', 'Notifications', 'bell', 'brand'],
    ['tile-backups', 'Backups', 'shield-check', 'success'],
    ['tile-storage', 'Storage', 'hard-drive', 'warning'],
    ['tile-reset', 'Reset Workspace', 'trash', 'danger'],
  ] as const;
  const specs: ItemSpec[] = settings.map(([itemId, label, glyph, tone]) => ({
    choices: { iconTile: tone },
    text: { action: 'select-icon-tile-row', itemId, label },
    glyph,
  }));
  await listItems(page, specs, ['data-demo-icon-tiles', 'list-item']);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { rootAttributes: { 'data-demo-icon-tiles': 'list-item' } },
        {
          children: settings.map(([itemId, label, , tone], index) =>
            itemNode(
              { action: 'select-icon-tile-row', itemId, label, iconTile: tone },
              specs[index]!,
            ),
          ),
        },
      ),
    ),
  );
});

// KF-86PM4R: Text's id is a prop, so the link's destination builds too.
test('builds ListItem › Native Navigation Link', async ({ page }) => {
  const link: ItemSpec = {
    text: {
      href: '#list-item-link-target',
      itemId: 'link',
      label: 'Jump to List Destination',
    },
    glyph: 'folder',
    trailing: 'Link',
  };
  await dragComponent(page, 'ListItemLink', () => emptySpot(page));
  await select(page, /^ListItemLink/);
  await applySpec(page, link);
  await itemContent(page, /^ListItemLink/, 0, link);
  await addInto(page, /^Pane/, 'Text');
  await select(page, /^Text(?![A-Z])/, 1);
  await applySpec(page, {
    choices: { variant: 'span' },
    text: { children: 'List destination', id: 'list-item-link-target' },
  });
  await expect(canvas(page).locator('#list-item-link-target')).toHaveText(
    'List destination',
  );
  expect(await exported(page)).toEqual(
    pane(
      itemNode(
        {
          href: '#list-item-link-target',
          itemId: 'link',
          label: 'Jump to List Destination',
        },
        link,
        'list-item#ListItemLink',
      ),
      node('text', {
        children: 'List destination',
        variant: 'span',
        id: 'list-item-link-target',
      }),
    ),
  );
});

test('builds ListItem › External Navigation Link', async ({ page }) => {
  await dragComponent(page, 'ListItemLink', () => emptySpot(page));
  await select(page, /^ListItemLink/);
  await applySpec(page, {
    flags: ['external'],
    text: {
      href: 'https://example.com',
      itemId: 'external-link',
      label: 'Open External Example',
    },
  });
  await expect(
    canvas(page).locator('a[href="https://example.com"]'),
  ).toBeVisible();
  expect(await exported(page)).toEqual(
    pane(
      node('list-item#ListItemLink', {
        href: 'https://example.com',
        itemId: 'external-link',
        label: 'Open External Example',
        external: true,
      }),
    ),
  );
});

test('builds ListItem › Spacious Option and Centered Icon', async ({
  page,
}) => {
  const spec: ItemSpec = {
    choices: {
      density: 'spacious',
      divider: 'after',
      multilineIconAlign: 'center',
    },
    flags: ['multiline'],
    text: {
      action: 'log-settings',
      itemId: 'spacious',
      label: 'Create a Project from an Existing Repository with a Longer Name',
    },
    glyph: 'wrench',
    trailing: 'Open',
  };
  await dragComponent(page, 'ListItem', () => emptySpot(page));
  await select(page, /^ListItem/);
  await applySpec(page, spec);
  await itemContent(page, /^ListItem(?![A-Z])/, 0, spec);
  expect(await exported(page)).toEqual(
    pane(
      itemNode(
        {
          action: 'log-settings',
          itemId: 'spacious',
          label:
            'Create a Project from an Existing Repository with a Longer Name',
          density: 'spacious',
          divider: 'after',
          multiline: true,
          multilineIconAlign: 'center',
        },
        spec,
      ),
    ),
  );
});

test('builds ListItem › Drop Target', async ({ page }) => {
  await dragComponent(page, 'ListItem', () => emptySpot(page));
  await select(page, /^ListItem/);
  await applySpec(page, {
    text: {
      action: 'log-projects',
      itemId: 'drag-target',
      label: 'Move Ticket Here',
      state: 'drag-target',
    },
  });
  await expect(
    canvas(page).locator('.kui-list-item[data-state="drag-target"]'),
  ).toHaveCount(1);
  expect(await exported(page)).toEqual(
    pane(
      node('list-item', {
        action: 'log-projects',
        itemId: 'drag-target',
        label: 'Move Ticket Here',
        state: 'drag-target',
      }),
    ),
  );
});

// The reorder is the app's wiring; rows start unpressed toggles.
test('builds ListItem › Drag to Reorder', async ({ page }) => {
  const commands = [
    ['run-tests', 'Run Tests'],
    ['build', 'Build Package'],
    ['lint', 'Lint Sources'],
    ['deploy-preview', 'Deploy Preview'],
  ] as const;
  const specs: ItemSpec[] = commands.map(([itemId, label]) => ({
    choices: { pressed: 'Off' },
    flags: ['draggable'],
    text: { action: 'toggle-reorder-row', itemId, label },
    glyph: 'grip-vertical',
  }));
  await listItems(page, specs, ['data-list-id', 'demo-reorder-commands']);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { rootAttributes: { 'data-list-id': 'demo-reorder-commands' } },
        {
          children: commands.map(([itemId, label], index) =>
            itemNode(
              {
                action: 'toggle-reorder-row',
                itemId,
                label,
                pressed: false,
                draggable: true,
              },
              specs[index]!,
            ),
          ),
        },
      ),
    ),
  );
});

test('builds ListItem › Dragging and Insertion States', async ({ page }) => {
  const rows = [
    ['reorder-before', 'Drops Above This Row', { dropPosition: 'before' }],
    ['reorder-dragging', 'Row Being Dragged', { dragging: true }],
    ['reorder-after', 'Drops Below This Row', { dropPosition: 'after' }],
  ] as const;
  const specs: ItemSpec[] = rows.map(([itemId, label, state]) => ({
    choices:
      'dropPosition' in state
        ? { dropPosition: state.dropPosition }
        : ({} as Record<string, string>),
    flags: 'dragging' in state ? ['draggable', 'dragging'] : ['draggable'],
    text: { action: 'log-projects', itemId, label },
  }));
  await listItems(page, specs);
  expect(await exported(page)).toEqual(
    pane(
      node('list', undefined, {
        children: rows.map(([itemId, label, state], index) =>
          itemNode(
            {
              action: 'log-projects',
              itemId,
              label,
              draggable: true,
              ...state,
            },
            specs[index]!,
          ),
        ),
      }),
    ),
  );
});

test('builds FramedList › Settings Rows', async ({ page }) => {
  test.slow();
  await dragComponent(page, 'FramedList', () => emptySpot(page));
  await select(page, /^FramedList(?!Row)/);
  await setText(page, 'label', 'Keyboard Shortcuts');
  // The list's and the row's seeded text each became a Text; neither stays.
  await addInto(page, /^FramedList(?!Row)/, 'FramedListRow', 0, 0);
  await addInto(page, /^FramedListRow/, 'Row', 0, 0);
  await select(page, /^Row/);
  await choose(page, 'gap', 's');
  await choose(page, 'vAlign', 'middle');
  for (const component of ['List', 'Text', 'Button', 'Button'])
    await addInto(page, /^Row/, component);
  await select(page, /^List(?![A-Z])/);
  await choose(page, 'flex', 'true');
  await addInto(page, /^List(?![A-Z])/, 'Text');
  await addInto(page, /^List(?![A-Z])/, 'Text');
  // Outline order: the List's two Texts, then the Row's keys Text.
  const [name, detail, keys] = shortcuts[0];
  await select(page, /^Text(?![A-Z])/, 0);
  await applySpec(page, {
    choices: { variant: 'span' },
    text: { children: name },
  });
  await select(page, /^Text(?![A-Z])/, 1);
  await applySpec(page, {
    choices: { variant: 'span', tone: 'quiet', size: 'compact' },
    text: { children: detail },
  });
  await select(page, /^Text(?![A-Z])/, 2);
  await applySpec(page, {
    choices: { variant: 'span', font: 'monospace', wrap: 'nowrap' },
    text: { children: keys },
  });
  for (const [index, [verb, glyph]] of [
    ['Edit', 'pencil'],
    ['Reset', 'rotate-ccw'],
  ].entries()) {
    await select(page, /^Button(?![A-Z])/, index);
    await applySpec(page, {
      choices: { emphasis: 'plain' },
      unsets: ['children'],
      text: {
        ariaLabel: `${verb} ${name} Shortcut`,
        action: `log-${verb.toLowerCase()}-shortcut`,
      },
    });
    await addIcon(page, 'icon', glyph);
  }
  await select(page, /^FramedListRow/);
  await page.keyboard.press('ControlOrMeta+d');
  await page.keyboard.press('ControlOrMeta+d');
  for (const [row, [name, detail, keys]] of shortcuts.entries()) {
    if (row === 0) continue;
    for (const [at, text] of [name, detail, keys].entries()) {
      await select(page, /^Text(?![A-Z])/, row * 3 + at);
      await setText(page, 'children', text);
    }
    for (const [at, verb] of ['Edit', 'Reset'].entries()) {
      await select(page, /^Button(?![A-Z])/, row * 2 + at);
      await setText(page, 'ariaLabel', `${verb} ${name} Shortcut`);
    }
  }
  await select(page, /^FramedListRow/, 1);
  await turnOn(page, 'highlighted');
  await expect(
    canvas(page).locator('.kui-framed-list__row[data-kerf-node]'),
  ).toHaveCount(3);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'framed-list',
        { label: 'Keyboard Shortcuts' },
        {
          children: shortcuts.map(([name, detail, keys], row) =>
            node(
              'framed-list#FramedListRow',
              row === 1 ? { highlighted: true } : undefined,
              {
                children: [
                  node(
                    'row',
                    { gap: 's', vAlign: 'middle' },
                    {
                      children: [
                        node(
                          'list',
                          { flex: true },
                          {
                            children: [
                              node('text', { children: name, variant: 'span' }),
                              node('text', {
                                children: detail,
                                variant: 'span',
                                tone: 'quiet',
                                size: 'compact',
                              }),
                            ],
                          },
                        ),
                        node('text', {
                          children: keys,
                          variant: 'span',
                          font: 'monospace',
                          wrap: 'nowrap',
                        }),
                        buttonNode(
                          {
                            ariaLabel: `Edit ${name} Shortcut`,
                            emphasis: 'plain',
                            action: 'log-edit-shortcut',
                          },
                          'pencil',
                        ),
                        buttonNode(
                          {
                            ariaLabel: `Reset ${name} Shortcut`,
                            emphasis: 'plain',
                            action: 'log-reset-shortcut',
                          },
                          'rotate-ccw',
                        ),
                      ],
                    },
                  ),
                ],
              },
            ),
          ),
        },
      ),
    ),
  );
});

test('builds FramedList › Base Surface', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await choose(page, 'controlInsets', 'tb');
  await addChild(page, 'FramedList');
  await select(page, /^FramedList(?!Row)/);
  await setText(page, 'label', 'Accounts');
  await choose(page, 'surface', 'base');
  await addInto(page, /^FramedList(?!Row)/, 'FramedListRow', 0, 0);
  await addInto(page, /^FramedList(?!Row)/, 'FramedListRow');
  for (const [index, text] of [
    'GitHub · connected',
    'Linear · not connected',
  ].entries()) {
    // Adding a Text turns the row's seeded text into a Text of its own,
    // which is kept; the added one is not.
    await addInto(page, /^FramedListRow/, 'Text', index);
    await deleteSelected(page);
    await select(page, /^Text(?![A-Z])/, index);
    await applySpec(page, {
      choices: { variant: 'span' },
      text: { children: text },
    });
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { controlInsets: 'tb' },
        {
          children: [
            node(
              'framed-list',
              { label: 'Accounts', surface: 'base' },
              {
                children: [
                  ...['GitHub · connected', 'Linear · not connected'].map(
                    (children) =>
                      node('framed-list#FramedListRow', undefined, {
                        children: [node('text', { children, variant: 'span' })],
                      }),
                  ),
                ],
              },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds TreeList › Files', async ({ page }) => {
  test.slow();
  await dragComponent(page, 'TreeList', () => emptySpot(page));
  await select(page, /^TreeList/);
  await applySpec(page, {
    text: {
      id: 'files',
      label: 'Files',
      selected: 'button',
      action: 'tree-list-demo-pick',
      toggleAction: 'tree-list-demo-toggle',
    },
  });
  await editAsJson(page, 'nodes', FILE_NODES);
  await choose(page, 'expanded', 'List…');
  await setTags(page, 'expanded', ['src', 'components']);
  for (const [at, glyph] of FILE_ICONS) {
    await treeNodeZone(page, at, 'icon');
    // An icon zone's row places the icon itself, selected.
    await area(page, 'Properties');
    await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
  }
  // components counts its three files with a Badge.
  await treeNodeZone(page, [0, 0], 'trailing');
  await addChild(page, 'Badge');
  await select(page, /^Badge/);
  await setText(page, 'children', '3');
  const tree = canvas(page).locator('.kui-tree-list');
  await expect(tree.locator('[data-item-id="legacy"]')).toBeVisible();
  await expect(tree.locator('.kui-badge')).toHaveText('3');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'tree-list',
        {
          id: 'files',
          label: 'Files',
          nodes: FILE_NODES,
          expanded: ['src', 'components'],
          selected: 'button',
          action: 'tree-list-demo-pick',
          toggleAction: 'tree-list-demo-toggle',
        },
        {
          ...Object.fromEntries(
            FILE_ICONS.map(([at, glyph]) => [
              treeZone(at, 'icon'),
              [icon(glyph)],
            ]),
          ),
          [treeZone([0, 0], 'trailing')]: [node('badge', { children: '3' })],
        },
      ),
    ),
  );
});

test('builds TreeList › Compact Outline', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await addInto(page, /^List(?![A-Z])/, 'ListItem');
  await select(page, /^ListItem/);
  await applySpec(page, {
    text: {
      label: 'New node',
      description: 'Drag onto the outline, or choose to add at the end',
      action: 'tree-list-demo-new',
    },
    data: [['data-tree-list-demo-new', '']],
  });
  await addIcon(page, 'icon', 'plus');
  await addInto(page, /^Pane/, 'TreeList');
  await select(page, /^TreeList/);
  await applySpec(page, {
    choices: { density: 'compact' },
    text: {
      id: 'outline',
      label: 'Document outline',
      action: 'tree-list-demo-pick',
      toggleAction: 'tree-list-demo-toggle',
    },
  });
  await editAsJson(page, 'nodes', OUTLINE_NODES);
  await choose(page, 'expanded', 'List…');
  await setTags(page, 'expanded', ['pane', 'toolbar', 'folders']);
  await expect(
    canvas(page).locator('.kui-tree-list [data-item-id="compose"]'),
  ).toBeVisible();
  expect(await exported(page)).toEqual(
    pane(
      node('list', undefined, {
        children: [
          node(
            'list-item',
            {
              label: 'New node',
              description: 'Drag onto the outline, or choose to add at the end',
              action: 'tree-list-demo-new',
              rootAttributes: { 'data-tree-list-demo-new': '' },
            },
            { icon: [icon('plus')] },
          ),
        ],
      }),
      node('tree-list', {
        id: 'outline',
        label: 'Document outline',
        nodes: OUTLINE_NODES,
        expanded: ['pane', 'toolbar', 'folders'],
        action: 'tree-list-demo-pick',
        toggleAction: 'tree-list-demo-toggle',
        density: 'compact',
      }),
    ),
  );
});

test('builds ListActionRow › Colored Icon Tiles', async ({ page }) => {
  test.slow();
  const props = tileCommands.map(([itemId, label, description], index) => ({
    label,
    description,
    action: 'select-icon-tile-row',
    itemId,
    ...(index === 0 ? { selected: true } : {}),
    trailingAction: 'open-list-action-row-actions',
    trailingActionLabel: `Edit ${label}`,
    trailingActionVisibility: 'interaction',
  }));
  const specs: ActionRowSpec[] = tileCommands.map(
    ([itemId, label, description, glyph, color], index) => ({
      choices: { trailingActionVisibility: 'interaction' },
      flags: index === 0 ? ['selected'] : [],
      text: {
        label,
        description,
        action: 'select-icon-tile-row',
        itemId,
        trailingAction: 'open-list-action-row-actions',
        trailingActionLabel: `Edit ${label}`,
      },
      glyph,
      trailingGlyph: 'pencil',
      tile: {
        color,
        ...(index === 4 ? { foreground: "uiColor('brand-on-loud')" } : {}),
      },
    }),
  );
  await actionRows(page, specs, ['data-demo-icon-tiles', 'list-action-row']);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { rootAttributes: { 'data-demo-icon-tiles': 'list-action-row' } },
        {
          children: specs.map((spec, index) =>
            actionRowNode(props[index]!, spec),
          ),
        },
      ),
    ),
  );
});

test('builds ListActionRow › Compact Rows', async ({ page }) => {
  const commands = [
    ['compact-open-folder', 'Open Folder', 'folder'],
    ['compact-run-tests', 'Run Tests', 'terminal'],
    ['compact-read-docs', 'Read Docs', 'book-open'],
  ] as const;
  const props = commands.map(([itemId, label]) => ({
    label,
    density: 'compact',
    action: 'select-list-action-row',
    itemId,
    trailingAction: 'open-list-action-row-actions',
    trailingActionLabel: `Actions for ${label}`,
    trailingActionVisibility: 'interaction',
  }));
  const specs: ActionRowSpec[] = commands.map(([itemId, label, glyph]) => ({
    choices: { density: 'compact', trailingActionVisibility: 'interaction' },
    text: {
      label,
      action: 'select-list-action-row',
      itemId,
      trailingAction: 'open-list-action-row-actions',
      trailingActionLabel: `Actions for ${label}`,
    },
    glyph,
    trailingGlyph: 'ellipsis',
  }));
  await actionRows(page, specs, ['data-demo-compact-rows', 'list-action-row']);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { rootAttributes: { 'data-demo-compact-rows': 'list-action-row' } },
        {
          children: specs.map((spec, index) =>
            actionRowNode(props[index]!, spec),
          ),
        },
      ),
    ),
  );
});

// The reorder itself is the app's wiring (wireListReorder); rows start
// unpressed, a toggle that is off rather than a plain action.
test('builds ListActionRow › Drag to Reorder', async ({ page }) => {
  const files = [
    ['readme', 'README.md'],
    ['changelog', 'CHANGELOG.md'],
    ['package', 'package.json'],
  ] as const;
  const props = files.map(([itemId, label]) => ({
    label,
    action: 'toggle-reorder-row',
    itemId,
    pressed: false,
    draggable: true,
    trailingAction: 'open-list-action-row-actions',
    trailingActionLabel: `Actions for ${label}`,
    trailingActionVisibility: 'interaction',
  }));
  const specs: ActionRowSpec[] = files.map(([itemId, label]) => ({
    choices: { pressed: 'Off', trailingActionVisibility: 'interaction' },
    flags: ['draggable'],
    text: {
      label,
      action: 'toggle-reorder-row',
      itemId,
      trailingAction: 'open-list-action-row-actions',
      trailingActionLabel: `Actions for ${label}`,
    },
    glyph: 'grip-vertical',
    trailingGlyph: 'ellipsis',
  }));
  await actionRows(page, specs, ['data-list-id', 'demo-reorder-files']);
  await expect(
    canvas(page).locator('.kui-list-action-row [aria-pressed="false"]'),
  ).toHaveCount(3);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { rootAttributes: { 'data-list-id': 'demo-reorder-files' } },
        {
          children: specs.map((spec, index) =>
            actionRowNode(props[index]!, spec),
          ),
        },
      ),
    ),
  );
});

test('builds ListActionRow › Dragging and Insertion States', async ({
  page,
}) => {
  const rows = [
    ['Drops Above This Row', 'reorder-before', 'the row below the drop'],
    ['Row Being Dragged', 'reorder-dragging', 'the dragged row'],
    ['Drops Below This Row', 'reorder-after', 'the row above the drop'],
  ] as const;
  const state = [
    { dropPosition: 'before' },
    { dragging: true },
    { dropPosition: 'after' },
  ];
  const props = rows.map(([label, itemId, which], index) => ({
    label,
    action: 'select-list-action-row',
    itemId,
    draggable: true,
    ...state[index],
    trailingAction: 'open-list-action-row-actions',
    trailingActionLabel: `Actions for ${which}`,
  }));
  const specs: ActionRowSpec[] = rows.map(([label, itemId, which], index) => ({
    choices:
      index === 1
        ? ({} as Record<string, string>)
        : { dropPosition: index === 0 ? 'before' : 'after' },
    flags: index === 1 ? ['draggable', 'dragging'] : ['draggable'],
    text: {
      label,
      action: 'select-list-action-row',
      itemId,
      trailingAction: 'open-list-action-row-actions',
      trailingActionLabel: `Actions for ${which}`,
    },
    trailingGlyph: 'ellipsis',
  }));
  await actionRows(page, specs);
  expect(await exported(page)).toEqual(
    pane(
      node('list', undefined, {
        children: specs.map((spec, index) =>
          actionRowNode(props[index]!, spec),
        ),
      }),
    ),
  );
});

test('builds List › Shared Row Dividers', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await dataAttribute(page, 'data-demo-divider-list', '');
  await addChild(page, 'ListHeader');
  await applySpec(page, {
    choices: { divider: 'both' },
    text: { label: 'Section' },
  });
  await addInto(page, /^List(?![A-Z])/, 'ListItem');
  await applySpec(page, {
    choices: { divider: 'both' },
    text: { action: 'log-inbox', itemId: 'divider-row', label: 'Regular Row' },
  });
  await addInto(page, /^List(?![A-Z])/, 'ListActionRow');
  await applySpec(page, {
    choices: { divider: 'both' },
    text: {
      action: 'log-projects',
      itemId: 'divider-action-row',
      label: 'Action Row',
      trailingAction: 'log-settings',
      trailingActionLabel: 'Action row options',
    },
  });
  await trailingButton(page, 0, 'ellipsis');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { rootAttributes: { 'data-demo-divider-list': '' } },
        {
          children: [
            node('list-header', { label: 'Section', divider: 'both' }),
            node('list-item', {
              action: 'log-inbox',
              itemId: 'divider-row',
              label: 'Regular Row',
              divider: 'both',
            }),
            actionRowNode(
              {
                action: 'log-projects',
                itemId: 'divider-action-row',
                label: 'Action Row',
                divider: 'both',
                trailingAction: 'log-settings',
                trailingActionLabel: 'Action row options',
              },
              { trailingGlyph: 'ellipsis' },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds List › Shared Row Inset', async ({ page }) => {
  // The --kui-list-row-padding-inline token is the catalog viewport's.
  const inbox: ItemSpec = {
    text: { action: 'log-inbox', itemId: 'inset-inbox', label: 'Inbox' },
    glyph: 'inbox',
  };
  const settings: ItemSpec = {
    text: {
      action: 'log-settings',
      itemId: 'inset-settings',
      label: 'Settings',
    },
    glyph: 'settings',
  };
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await dataAttribute(page, 'data-demo-row-inset-list', '');
  await addChild(page, 'ListItem');
  await applySpec(page, inbox);
  await addInto(page, /^List(?![A-Z])/, 'ListActionRow');
  await applySpec(page, {
    text: {
      action: 'log-projects',
      itemId: 'inset-projects',
      label: 'Projects',
      trailingAction: 'log-settings',
      trailingActionLabel: 'Project Options',
    },
  });
  await addIcon(page, 'icon', 'folder');
  await trailingButton(page, 0, 'ellipsis');
  await addInto(page, /^List(?![A-Z])/, 'ListItem');
  await applySpec(page, settings);
  await itemContent(page, /^ListItem(?![A-Z])/, 0, inbox);
  await itemContent(page, /^ListItem(?![A-Z])/, 1, settings);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { rootAttributes: { 'data-demo-row-inset-list': '' } },
        {
          children: [
            itemNode(inbox.text!, inbox),
            actionRowNode(
              {
                action: 'log-projects',
                itemId: 'inset-projects',
                label: 'Projects',
                trailingAction: 'log-settings',
                trailingActionLabel: 'Project Options',
              },
              { glyph: 'folder', trailingGlyph: 'ellipsis' },
            ),
            itemNode(settings.text!, settings),
          ],
        },
      ),
    ),
  );
});

test('builds List › Physical-Axis Alignment', async ({ page }) => {
  const chips = ['Top', 'Middle', 'Bottom'];
  await frameShell(page);
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await applySpec(page, {
    choices: { gap: 'xs', hAlign: 'right', vAlign: 'full' },
  });
  for (const text of chips) {
    await addInto(page, /^List(?![A-Z])/, 'Chip');
    await setText(page, 'children', text);
  }
  await expect(canvas(page).locator('.kui-chip[data-kerf-node]')).toHaveText(
    chips,
  );
  expect(await exported(page)).toEqual(
    pane(
      frameShellNode(
        node(
          'list',
          { gap: 'xs', hAlign: 'right', vAlign: 'full' },
          { children: chips.map((children) => node('chip', { children })) },
        ),
      ),
    ),
  );
});

test('builds List › Side-Selectable Insets', async ({ page }) => {
  await frameShell(page);
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await applySpec(page, {
    choices: { gap: 'xs', textInsets: 'l', controlInsets: 'rb' },
  });
  await addChild(page, 'Chip');
  await setText(page, 'children', 'Text-aligned left edge');
  await addInto(page, /^List(?![A-Z])/, 'TextField');
  await applySpec(page, {
    text: { label: 'Inset List Control', value: 'Control edge' },
  });
  await addInto(page, /^List(?![A-Z])/, 'List');
  await choose(page, 'textInsets', 't');
  await addChild(page, 'Chip');
  await setText(page, 'children', 'Nested text-aligned top edge');
  expect(await exported(page)).toEqual(
    pane(
      frameShellNode(
        node(
          'list',
          { gap: 'xs', textInsets: 'l', controlInsets: 'rb' },
          {
            children: [
              node('chip', { children: 'Text-aligned left edge' }),
              node('text-field', {
                label: 'Inset List Control',
                value: 'Control edge',
              }),
              node(
                'list',
                { textInsets: 't' },
                {
                  children: [
                    node('chip', { children: 'Nested text-aligned top edge' }),
                  ],
                },
              ),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds List › Surface Behind a Strip', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await applySpec(page, {
    choices: { surface: 'base', controlInsets: 'tb', dividerSides: 'b' },
  });
  await addChild(page, 'StateBanner');
  await applySpec(page, {
    choices: { tone: 'info' },
    text: {
      title: 'Codex Hooks Are Not Installed',
      detail: 'Install them to sync agent activity.',
    },
  });
  await addChild(page, 'LucideIcon', 'icon');
  await pickIcon(
    page,
    page.locator('[data-editor-icon-place]'),
    'circle-question-mark',
  );
  await addInto(page, /^Pane/, 'List');
  await choose(page, 'controlInsets', 'tb');
  await contentItemInto(
    page,
    /^List(?![A-Z])/,
    1,
    'Work Area',
    'The lowered region continues below the strip.',
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { surface: 'base', controlInsets: 'tb', dividerSides: 'b' },
        {
          children: [
            node(
              'state-banner',
              {
                tone: 'info',
                title: 'Codex Hooks Are Not Installed',
                detail: 'Install them to sync agent activity.',
              },
              { icon: [icon('circle-question-mark')] },
            ),
          ],
        },
      ),
      node(
        'list',
        { controlInsets: 'tb' },
        {
          children: [
            demoContentItem(
              'Work Area',
              'The lowered region continues below the strip.',
            ),
          ],
        },
      ),
    ),
  );
});

test('builds List › Page Column', async ({ page }) => {
  const body =
    'A settings page keeps its forms at a readable width however wide the window grows, with no application CSS around the column.';
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await applySpec(page, {
    choices: { inset: 'document', contentWidth: 'compact', gap: 'm' },
    data: [['data-demo-page-column', '']],
  });
  await addChild(page, 'Text');
  await applySpec(page, {
    choices: { variant: 'h3' },
    text: { children: 'Settings' },
  });
  await addInto(page, /^List(?![A-Z])/, 'Text');
  await setText(page, 'children', body);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        {
          inset: 'document',
          contentWidth: 'compact',
          gap: 'm',
          rootAttributes: { 'data-demo-page-column': '' },
        },
        {
          children: [
            node('text', { children: 'Settings', variant: 'h3' }),
            node('text', { children: body }),
          ],
        },
      ),
    ),
  );
});

// KF-CW7Z38: the reader is named through List `landmark="region"` and
// `ariaLabel` instead of a role in rootAttributes.
test('builds List › Document Inset', async ({ page }) => {
  const copy = [
    'The reader keeps a generous inset so long lines of prose have room to breathe, without application padding around the stack.',
    'On a phone the inline inset narrows so the text column keeps a readable width.',
  ];
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await applySpec(page, {
    choices: { inset: 'document', gap: 'm', landmark: 'region' },
    text: { ariaLabel: 'Reader' },
  });
  await addChild(page, 'Text');
  await applySpec(page, {
    choices: { variant: 'h3' },
    text: { children: 'Release notes' },
  });
  for (const text of copy) {
    await addInto(page, /^List(?![A-Z])/, 'Text');
    await setText(page, 'children', text);
  }
  await expect(
    canvas(page).getByRole('region', { name: 'Reader' }),
  ).toBeVisible();
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        {
          inset: 'document',
          gap: 'm',
          landmark: 'region',
          ariaLabel: 'Reader',
        },
        {
          children: [
            node('text', { children: 'Release notes', variant: 'h3' }),
            ...copy.map((text) => node('text', { children: text })),
          ],
        },
      ),
    ),
  );
});

// KF-CW7Z38: the picker is a named List region (`landmark` and `ariaLabel`);
// its `data-demo-result-picker` hook stays a root data attribute.
test('builds List › Result Picker', async ({ page }) => {
  test.slow();
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await applySpec(page, {
    choices: { gap: '2xs', landmark: 'region' },
    flags: ['scrollable', 'frame'],
    text: { ariaLabel: 'Possible Duplicates' },
    data: [['data-demo-result-picker', '']],
  });
  await setCss(page, 'minHeight', 'rem(4.25)');
  await setCss(page, 'maxHeight', 'rem(14)');
  for (const [itemId, label, description] of RESULT_PICKER) {
    await addInto(page, /^List(?![A-Z])/, 'ListItem');
    await applySpec(page, {
      flags: ['multiline'],
      text: { action: 'log-result-picker', itemId, label, description },
    });
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        {
          gap: '2xs',
          landmark: 'region',
          scrollable: true,
          frame: true,
          ariaLabel: 'Possible Duplicates',
          minHeight: { $css: 'rem(4.25)' },
          maxHeight: { $css: 'rem(14)' },
          rootAttributes: { 'data-demo-result-picker': '' },
        },
        {
          children: RESULT_PICKER.map(([itemId, label, description]) =>
            node('list-item', {
              action: 'log-result-picker',
              itemId,
              label,
              description,
              multiline: true,
            }),
          ),
        },
      ),
    ),
  );
});

test('builds List › Divider Between Regions', async ({ page }) => {
  const folders = [
    ['log-inbox', 'divider-inbox', 'Inbox', 'inbox'],
    ['log-projects', 'divider-projects', 'Projects', 'folder'],
    ['log-drafts', 'divider-drafts', 'Drafts', 'file-text'],
  ] as const;
  const specs: ItemSpec[] = folders.map(
    ([action, itemId, label, glyph], index) => ({
      flags: index === 0 ? ['selected'] : [],
      text: { action, itemId, label },
      glyph,
    }),
  );
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await choose(page, 'gap', 'none');
  await addChild(page, 'List');
  await applySpec(page, { choices: { flex: 'none', dividerSides: 'r' } });
  for (const spec of specs) {
    await addInto(page, /^List(?![A-Z])/, 'ListItem');
    await applySpec(page, spec);
  }
  for (const [index, spec] of specs.entries())
    await itemContent(page, /^ListItem(?![A-Z])/, index, spec);
  await addInto(page, /^Row/, 'List');
  await choose(page, 'flex', 'true');
  await contentItemInto(
    page,
    /^List(?![A-Z])/,
    1,
    'Inbox',
    "12 unread conversations. The selected folder's contents appear in this region.",
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'none' },
        {
          children: [
            node(
              'list',
              { flex: 'none', dividerSides: 'r' },
              {
                children: folders.map(([action, itemId, label], index) =>
                  itemNode(
                    {
                      action,
                      itemId,
                      label,
                      ...(index === 0 ? { selected: true } : {}),
                    },
                    specs[index]!,
                  ),
                ),
              },
            ),
            node(
              'list',
              { flex: true },
              {
                children: [
                  demoContentItem(
                    'Inbox',
                    "12 unread conversations. The selected folder's contents appear in this region.",
                  ),
                ],
              },
            ),
          ],
        },
      ),
    ),
  );
});

// KF-FKRVR5: List › List View Transitions is not built, by design. Its rows
// are the app's `each()` output, each a raw keyed wrapper whose app CSS
// names its view transition; that animation is what the example shows, and
// a view document holds only components.
// KF-9JACQY: the sections are plain Lists in the scrolling List's major gap,
// and the Tools toggle names its List region through `controls`.
test('builds List › Scrollable Application List', async ({ page }) => {
  test.setTimeout(test.info().timeout * 4);
  const header = { label: 'Sidebar Toolbar', text: 'Workspace', size: 'small' };
  const footer = { label: 'Sidebar Footer', text: 'Ready', size: 'small' };
  const add = { ariaLabel: 'Add Workspace', action: 'log-add' };
  const settings = { ariaLabel: 'Sidebar Settings', action: 'log-settings' };
  const group = { appearance: 'borderless', single: true };
  await rootPane(page, {}, { header, footer });
  await buttonGroup(
    page,
    'trailing',
    { choices: { appearance: 'borderless' }, flags: ['single'] },
    [[{ text: add }, 'plus']],
  );
  await buttonGroup(
    page,
    'trailing',
    { choices: { appearance: 'borderless' }, flags: ['single'] },
    [[{ text: settings }, 'settings']],
    { nth: 1 },
  );
  await select(page, /^Pane/);
  await addChild(page, 'List', 'content');
  await area(page, 'Properties');
  await axisGap(page, 'none', 'l');
  await setCss(page, 'flex', 'flex(1)');
  await turnOn(page, 'scrollable');
  const LIST = /^List(?![A-Z])/;
  await addInto(page, LIST, 'List', 0);
  await addChild(page, 'ListHeader');
  await area(page, 'Properties');
  const workspace = {
    label: 'Workspace',
    count: '3',
    countLabel: '3 workspaces',
    action: 'log-add',
    actionLabel: 'Add workspace',
  };
  await applySpec(page, { text: workspace });
  await addIcon(page, 'actionIcon', 'plus');
  const rows: ItemSpec[] = [
    {
      flags: ['selected'],
      text: { action: 'log-inbox', itemId: 'inbox', label: 'Inbox' },
      glyph: 'inbox',
      trailing: '12',
    },
    {
      text: { action: 'log-projects', itemId: 'projects', label: 'Projects' },
      glyph: 'folder',
    },
    {
      text: {
        action: 'log-drafts',
        itemId: 'drafts',
        label: 'Drafts Without a Visible Icon',
      },
    },
  ];
  for (const row of rows) {
    await addInto(page, LIST, 'ListItem', 1);
    await applySpec(page, row);
  }
  await addInto(page, LIST, 'List', 0);
  await choose(page, 'gap', 'xs');
  await addChild(page, 'ListHeader');
  await area(page, 'Properties');
  const tools = {
    label: 'Tools',
    action: 'toggle-menu-tools',
    controls: 'menu-tools-content',
  };
  await applySpec(page, { flags: ['toggle', 'expanded'], text: tools });
  await addInto(page, LIST, 'List', 2);
  await setText(page, 'id', 'menu-tools-content');
  const toolRows: ItemSpec[] = [
    {
      flags: ['multiline'],
      text: {
        action: 'log-settings',
        label:
          'A multiline item demonstrates content that wraps without clipping',
      },
      glyph: 'wrench',
    },
    {
      flags: ['disabled'],
      text: { action: 'disabled', label: 'Unavailable' },
      glyph: 'circle-question-mark',
    },
  ];
  for (const row of toolRows) {
    await addInto(page, LIST, 'ListItem', 3);
    await applySpec(page, row);
  }
  for (const [index, row] of [...rows, ...toolRows].entries())
    await itemContent(page, /^ListItem(?![A-Z])/, index, row);
  await contentItemInto(
    page,
    LIST,
    3,
    'Shared Item Geometry',
    'The child owns its margin, border, and padding.',
  );
  await select(page, /^ContentItem/);
  await dataAttribute(page, 'data-content-item', '');
  const toggle = canvas(page).getByRole('button', { name: 'Tools' });
  await expect(toggle).toHaveAttribute('aria-controls', 'menu-tools-content');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const chrome = (
    spec: { label: string; text: string; size: string },
    button: Record<string, unknown>,
    glyph: string,
  ) =>
    node(
      'toolbar',
      { label: spec.label },
      {
        leading: [node('toolbar-text', { text: spec.text, size: spec.size })],
        trailing: [buttonGroupNode(group, [[button, glyph]])],
      },
    );
  const demo = demoContentItem(
    'Shared Item Geometry',
    'The child owns its margin, border, and padding.',
  ) as { props?: Record<string, unknown> };
  expect(await exported(page)).toEqual(
    rootPaneNode(undefined, {
      header: [chrome(header, add, 'plus')],
      footer: [chrome(footer, settings, 'settings')],
      content: [
        node(
          'list',
          {
            gap: { column: 'none', row: 'l' },
            flex: { $css: 'flex(1)' },
            scrollable: true,
          },
          {
            children: [
              node('list', undefined, {
                children: [
                  node(
                    'list-header',
                    { ...workspace, count: 3 },
                    { actionIcon: [icon('plus')] },
                  ),
                  ...rows.map((row) =>
                    itemNode(
                      {
                        ...row.text,
                        ...(row.flags?.includes('selected')
                          ? { selected: true }
                          : {}),
                      },
                      row,
                    ),
                  ),
                ],
              }),
              node(
                'list',
                { gap: 'xs' },
                {
                  children: [
                    node('list-header', {
                      ...tools,
                      toggle: true,
                      expanded: true,
                    }),
                    node(
                      'list',
                      { id: 'menu-tools-content' },
                      {
                        children: [
                          ...toolRows.map((row) =>
                            itemNode(
                              {
                                ...row.text,
                                [row.flags![0]!]: true,
                              },
                              row,
                            ),
                          ),
                          {
                            ...demo,
                            props: {
                              rootAttributes: { 'data-content-item': '' },
                            },
                          },
                        ],
                      },
                    ),
                  ],
                },
              ),
            ],
          },
        ),
      ],
    }),
  );
});

test('builds ListHeader › Label Sizes', async ({ page }) => {
  const sizes = [
    ['Extra Small', 'xs'],
    ['Small', 'sm'],
    ['Medium', 'm'],
    ['Large', 'l'],
    ['Extra Large', 'xl'],
  ] as const;
  await stacked(
    page,
    'List',
    'ListHeader',
    sizes.map(([label, size]) => ({
      choices: { size, headingLevel: '3' },
      text: { label },
    })),
    async () => {
      await choose(page, 'gap', 'xs');
      await dataAttribute(page, 'data-demo-list-header-sizes', '');
    },
  );
  await expect(
    canvas(page).locator('.kui-list-header[data-kerf-node] h3'),
  ).toHaveText(sizes.map(([label]) => label));
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs', rootAttributes: { 'data-demo-list-header-sizes': '' } },
        {
          children: sizes.map(([label, size]) =>
            node('list-header', { label, size, headingLevel: 3 }),
          ),
        },
      ),
    ),
  );
});

// KF-ZYQVHD: ListHeader status is text, typed straight into its field.
test('builds ListHeader › Needs Attention', async ({ page }) => {
  await dragComponent(page, 'ListHeader', () => emptySpot(page));
  await select(page, /^ListHeader/);
  await setText(page, 'label', 'Needs Attention');
  await setText(page, 'status', '3 blocked');
  await choose(page, 'indicatorTone', 'danger');
  await choose(page, 'density', 'compact');
  await choose(page, 'divider', 'before');
  await choose(page, 'headingLevel', '3');
  const header = canvas(page).locator('.kui-list-header[data-kerf-node]');
  await expect(header.locator('h3')).toHaveText('Needs Attention');
  await expect(header.locator('.kui-badge')).toHaveText('3 blocked');
  await expect(header.locator('.kui-badge .kui-badge')).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node('list-header', {
        label: 'Needs Attention',
        status: '3 blocked',
        indicatorTone: 'danger',
        density: 'compact',
        divider: 'before',
        headingLevel: 3,
      }),
    ),
  );
});

// KF-ZYQVHD: badge and status are both plain text.
test('builds ListHeader › Badge and Status Together', async ({ page }) => {
  await dragComponent(page, 'ListHeader', () => emptySpot(page));
  await select(page, /^ListHeader/);
  await setText(page, 'label', 'Purchases');
  await setText(page, 'badge', '3 lines unpriced');
  await setText(page, 'status', 'Needs review');
  await choose(page, 'indicatorTone', 'danger');
  await expect(
    canvas(page).locator('.kui-list-header[data-kerf-node] .kui-badge'),
  ).toHaveText(['3 lines unpriced', 'Needs review']);
  expect(await exported(page)).toEqual(
    pane(
      node('list-header', {
        label: 'Purchases',
        badge: '3 lines unpriced',
        status: 'Needs review',
        indicatorTone: 'danger',
      }),
    ),
  );
});

// KF-MN7QK5: the rows sit in a `List selectionMode="single"` listbox (no
// app-owned role="listbox" wrapper), and each title is a strong id Text plus
// a title Text. The editor seeds an option's `semanticRole`, the default.
test('builds SummaryRow › List Section', async ({ page }) => {
  test.setTimeout(test.info().timeout * 4);
  const list = {
    choices: { selectionMode: 'single', controlInsets: 'trbl' },
    text: { ariaLabel: 'Tickets' },
  };
  await summaryRows(page, 'row', list);
  await expect(
    canvas(page).getByRole('listbox', { name: 'Tickets' }),
  ).toBeVisible();
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    summaryRowsNode('row', {
      selectionMode: 'single',
      ariaLabel: 'Tickets',
      controlInsets: 'trbl',
    }),
  );
});

test('builds SummaryRow › Board Cards', async ({ page }) => {
  test.setTimeout(test.info().timeout * 4);
  const list = {
    choices: { selectionMode: 'single', gap: 'xs', controlInsets: 'trbl' },
    text: { ariaLabel: 'Board Column' },
  };
  await summaryRows(page, 'card', list);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    summaryRowsNode('card', {
      selectionMode: 'single',
      ariaLabel: 'Board Column',
      gap: 'xs',
      controlInsets: 'trbl',
    }),
  );
});

// KF-MN7QK5: the strong title is a span Text whose copy ends in the no-break
// space that kept it apart from the Open button.
test('builds SummaryRow › Diagnostic Group', async ({ page }) => {
  test.slow();
  await dragComponent(page, 'SummaryRow', () => emptySpot(page));
  await select(page, /^SummaryRow/);
  await applySpec(page, {
    choices: {
      semanticRole: 'group',
      listEdge: 'only',
      rail: 'danger',
    },
    flags: ['selected'],
    text: { ariaLabel: 'Unreadable ticket diagnostic' },
  });
  await summaryContent(page, 0, 'bug', async () => {
    await select(page, /^Text(?![A-Z])/);
    await applySpec(page, {
      choices: { variant: 'span', weight: 'strong' },
      text: { children: 'Unreadable ticket\u00a0' },
    });
    await select(page, /^SummaryRow/);
    await addChild(page, 'Button', 'title');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { size: 'compact', emphasis: 'secondary' },
      text: { children: 'Open', action: 'log-more' },
    });
  });
  await select(page, /^SummaryRow/);
  await addChild(page, 'Badge', 'metadata');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'danger', size: 'compact' },
    text: { children: 'Needs recovery' },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'summary-row',
        {
          semanticRole: 'group',
          ariaLabel: 'Unreadable ticket diagnostic',
          listEdge: 'only',
          rail: 'danger',
          selected: true,
        },
        {
          leading: [icon('bug')],
          title: [
            textNode('Unreadable ticket\u00a0', {
              variant: 'span',
              weight: 'strong',
            }),
            node('button', {
              children: 'Open',
              action: 'log-more',
              size: 'compact',
              emphasis: 'secondary',
            }),
          ],
          metadata: [
            node('badge', {
              children: 'Needs recovery',
              tone: 'danger',
              size: 'compact',
            }),
          ],
        },
      ),
    ),
  );
});

// KF-CW7Z38: the track is named through ColumnTrack `ariaLabel` and each
// column through List `landmark="region"`, not rootAttributes.
test('builds ColumnTrack › Scrolling Board', async ({ page }) => {
  test.setTimeout(test.info().timeout * 6);
  await board(page, { text: { ariaLabel: 'Board' } });
  await expect(
    canvas(page).getByRole('region', { name: 'Board', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(boardNode({ ariaLabel: 'Board' }));
});

test('builds ColumnTrack › Paged Board', async ({ page }) => {
  test.setTimeout(test.info().timeout * 6);
  await board(page, {
    choices: { layout: 'paged' },
    text: { ariaLabel: 'Paged Board' },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    boardNode({ layout: 'paged', ariaLabel: 'Paged Board' }),
  );
});

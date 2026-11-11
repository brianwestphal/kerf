// KF-JN4PF5: each ux-demo configuration of the status, progress, and badge components, built in
// the editor the way a person would (palette drags, outline and canvas
// selection, Inspector fields), then exported and compared with what the demo
// renders. A configuration the editor cannot build yet has a ticket instead
// of a test.
import { expect, test } from '@playwright/test';

import { area, inspectorOverview } from '../areas.js';
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
  outlineRow,
  page as pane,
  pickIcon,
  select,
  setText,
  showDataAttributes,
  showProp,
  turnOn,
  unset,
  zoneSpot,
} from '../build.js';
import {
  addInto,
  applySpec,
  chip,
  dataAttribute,
  deleteSelected,
  editAsJson,
  fileHref,
  GAUGE_RATE,
  rootBanner,
  rootPane,
  rootPaneNode,
  SEARCH_FILTERS,
  setCss,
  stacked,
  textInto,
  textNode,
  toolbar,
  TRANSCRIPT_FILES,
  valueTable,
  zoneGroup,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
});

test('builds LoadingSpinner › Meaningful', async ({ page }) => {
  await dragComponent(page, 'LoadingSpinner', () => emptySpot(page));
  await select(page, /^LoadingSpinner/);
  await setText(page, 'label', 'Loading preview…');
  await expect(
    canvas(page).locator(
      '[data-kerf-node] [aria-label="Loading preview…"], [data-kerf-node][aria-label="Loading preview…"]',
    ),
  ).toHaveCount(1);
  expect(await exported(page)).toEqual(
    pane(node('loading-spinner', { label: 'Loading preview…' })),
  );
});

test('builds LoadingSpinner › Decorative', async ({ page }) => {
  await dragComponent(page, 'LoadingSpinner', () => emptySpot(page));
  await select(page, /^LoadingSpinner/);
  expect(await exported(page)).toEqual(pane(node('loading-spinner')));
});

test('builds LoadingSpinner › Spinner Sizes', async ({ page }) => {
  const sizes = ['xs', 's', 'm', 'l', 'xl'];
  await stacked(
    page,
    'Row',
    'LoadingSpinner',
    [
      ...sizes.map((size) => ({ choices: { size } })),
      { unions: { size: ['Number…', '30'] } },
    ],
    async () => {
      await choose(page, 'gap', 'm');
      await dataAttribute(page, 'data-demo-spinner-sizes', '');
    },
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', rootAttributes: { 'data-demo-spinner-sizes': '' } },
        {
          children: [
            ...sizes.map((size) => node('loading-spinner', { size })),
            node('loading-spinner', { size: 30 }),
          ],
        },
      ),
    ),
  );
});

test('builds LoadingSpinner › Spinner Colors', async ({ page }) => {
  await stacked(
    page,
    'Row',
    'LoadingSpinner',
    [
      { choices: { size: 's' } },
      { choices: { size: 's' } },
      { choices: { size: 's' } },
    ],
    async () => {
      await choose(page, 'gap', 'm');
      await dataAttribute(page, 'data-demo-spinner-colors', '');
    },
  );
  for (const [index, color] of [
    [1, "uiColor('warning-on-quiet')"],
    [2, "foregroundColor('rebeccapurple')"],
  ] as const) {
    await select(page, /^LoadingSpinner/, index);
    await showProp(page, 'color');
    const field = page
      .locator('[data-editor-prop="color"]')
      .getByRole('textbox');
    await field.fill(color);
    await field.press('Enter');
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', rootAttributes: { 'data-demo-spinner-colors': '' } },
        {
          children: [
            node('loading-spinner', { size: 's' }),
            node('loading-spinner', {
              size: 's',
              color: { $css: "uiColor('warning-on-quiet')" },
            }),
            node('loading-spinner', {
              size: 's',
              color: { $css: "foregroundColor('rebeccapurple')" },
            }),
          ],
        },
      ),
    ),
  );
});

test('builds Chip › Removable Tag', async ({ page }) => {
  await chip(page, 'Urgent', {
    choices: { tone: 'info' },
    text: { itemId: 'urgent', removeLabel: 'Remove Urgent tag' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node('chip', {
        children: 'Urgent',
        tone: 'info',
        itemId: 'urgent',
        removeLabel: 'Remove Urgent tag',
        removeAction: 'log-chip-remove',
      }),
    ),
  );
});

test('builds Chip › Compact', async ({ page }) => {
  await chip(page, 'Reviewed', {
    choices: {
      tone: 'success',
      appearance: 'outline',
      shape: 'rounded',
      size: 'compact',
    },
    text: { itemId: 'reviewed', removeLabel: 'Remove Reviewed tag' },
  });
  await addIcon(page, 'icon', 'check');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'chip',
        {
          children: 'Reviewed',
          tone: 'success',
          appearance: 'outline',
          shape: 'rounded',
          size: 'compact',
          itemId: 'reviewed',
          removeLabel: 'Remove Reviewed tag',
          removeAction: 'log-chip-remove',
        },
        { icon: [icon('check')] },
      ),
    ),
  );
});

test('builds Chip › Disabled', async ({ page }) => {
  await chip(page, 'Locked', {
    choices: { tone: 'warning' },
    flags: ['disabled'],
    text: { itemId: 'locked', removeLabel: 'Remove Locked tag' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node('chip', {
        children: 'Locked',
        tone: 'warning',
        disabled: true,
        itemId: 'locked',
        removeLabel: 'Remove Locked tag',
        removeAction: 'log-chip-remove',
      }),
    ),
  );
});

test('builds Skeleton › Primitive', async ({ page }) => {
  await stacked(page, 'List', 'Skeleton', [{}, {}, {}, {}], () =>
    choose(page, 'gap', 'm'),
  );
  const css = [
    { width: 'em(12)' },
    { width: 'em(8)', height: 'em(1.5)', radius: 'em(0.75)' },
    {},
    { width: 'em(6)' },
  ];
  for (const [index, props] of css.entries()) {
    await select(page, /^Skeleton/, index);
    for (const [name, value] of Object.entries(props))
      await setCss(page, name, value);
  }
  await select(page, /^Skeleton/, 2);
  await setText(page, 'lines', '3');
  await select(page, /^Skeleton/, 3);
  await setText(page, 'label', 'Loading value…');
  const $css = (value: string) => ({ $css: value });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'm' },
        {
          children: [
            node('skeleton', { width: $css('em(12)') }),
            node('skeleton', {
              width: $css('em(8)'),
              height: $css('em(1.5)'),
              radius: $css('em(0.75)'),
            }),
            node('skeleton', { lines: 3 }),
            node('skeleton', { width: $css('em(6)'), label: 'Loading value…' }),
          ],
        },
      ),
    ),
  );
});

// KF-3Y2GS2: a placeholder row's required value is "", its skeleton slot.
test('builds Skeleton › In Composition', async ({ page }) => {
  await dragComponent(page, 'ValueTable', () => emptySpot(page));
  await select(page, /^ValueTable(?![A-Z])/);
  await setText(page, 'label', 'Placeholder Rows');
  // Two rows, as the demo has, from Children › Add a child.
  for (let row = 0; row < 2; row += 1) {
    await select(page, /^ValueTable(?![A-Z])/);
    await addChild(page, 'ValueTableRow');
  }
  // The table arrived holding a placeholder Text.
  await select(page, /^Text/);
  await inspectorOverview(page);
  await page.locator('[data-action="editor-delete"]').click();
  for (const [index, label] of ['Status', 'Owner'].entries()) {
    await select(page, /^ValueTableRow/, index);
    await setText(page, 'label', label);
    await setText(page, 'value', '');
    await turnOn(page, 'placeholder');
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'value-table',
        { label: 'Placeholder Rows' },
        {
          children: ['Status', 'Owner'].map((label) =>
            node('value-table#ValueTableRow', {
              label,
              value: '',
              placeholder: true,
            }),
          ),
        },
      ),
    ),
  );
});

test('builds ProgressRing › Tones and Indeterminate', async ({ page }) => {
  await stacked(
    page,
    'Row',
    'ProgressRing',
    [
      {
        choices: { tone: 'success' },
        text: { label: 'Claim Time Remaining', value: '0.75' },
      },
      {
        choices: { tone: 'warning' },
        text: { label: 'Quota Used', value: '0.9' },
      },
      {
        choices: { tone: 'danger' },
        text: { label: 'Error Budget Used', value: '0.98' },
      },
      { text: { label: 'Connecting' } },
    ],
    async () => {
      await choose(page, 'gap', 'm');
      await choose(page, 'vAlign', 'middle');
    },
  );
  // The status line after the rings.
  await select(page, /^Row/);
  await addChild(page, 'Text');
  await select(page, /^Text/);
  await setText(page, 'children', 'Connecting…');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', vAlign: 'middle' },
        {
          children: [
            node('progress-ring', {
              tone: 'success',
              label: 'Claim Time Remaining',
              value: 0.75,
            }),
            node('progress-ring', {
              tone: 'warning',
              label: 'Quota Used',
              value: 0.9,
            }),
            node('progress-ring', {
              tone: 'danger',
              label: 'Error Budget Used',
              value: 0.98,
            }),
            node('progress-ring', { label: 'Connecting' }),
            node('text', { children: 'Connecting…' }),
          ],
        },
      ),
    ),
  );
});

test('builds Gauge › Full', async ({ page }) => {
  await stacked(
    page,
    'Row',
    'Gauge',
    [
      { text: { label: 'Tokens per Minute', ...GAUGE_RATE.text } },
      { text: { label: 'Tokens per Minute, Standby', ...GAUGE_RATE.text } },
    ],
    async () => {
      await choose(page, 'gap', 'm');
      await choose(page, 'vAlign', 'middle');
      await turnOn(page, 'wrap');
    },
  );
  await select(page, /^Gauge(?![A-Z])/, 1);
  await setCss(page, 'size', 'remify(220)');
  for (const [label, step] of [
    ['Slow Down', '-1'],
    ['Speed Up', '1'],
  ] as const) {
    await select(page, /^Row/);
    await addChild(page, 'Button');
    await select(page, /^Button/, step === '-1' ? 0 : 1);
    await setText(page, 'children', label);
    await setText(page, 'action', 'step-gauge-demo');
    await dataAttribute(page, 'data-step', step);
  }
  await expect(canvas(page).locator('.kui-gauge').nth(1)).toHaveCSS(
    'width',
    '220px',
  );
  const gauge = (label: string, extra: object = {}) =>
    node('gauge', {
      label,
      value: 420,
      max: 1000,
      unit: 'tok/min',
      ...extra,
    });
  const button = (children: string, step: string) =>
    node('button', {
      children,
      action: 'step-gauge-demo',
      rootAttributes: { 'data-step': step },
    });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', vAlign: 'middle', wrap: true },
        {
          children: [
            gauge('Tokens per Minute'),
            gauge('Tokens per Minute, Standby', {
              size: { $css: 'remify(220)' },
            }),
            button('Slow Down', '-1'),
            button('Speed Up', '1'),
          ],
        },
      ),
    ),
  );
});

test('builds Gauge › Bare', async ({ page }) => {
  await stacked(
    page,
    'Row',
    'Gauge',
    [
      {
        choices: { variant: 'bare' },
        text: { label: 'Agent Tokens per Minute', ...GAUGE_RATE.text },
      },
    ],
    async () => {
      await choose(page, 'gap', 's');
      await choose(page, 'vAlign', 'middle');
    },
  );
  await select(page, /^Row/);
  await addChild(page, 'Text');
  await select(page, /^Text/);
  await setText(page, 'children', 'Agent activity');
  await expect(canvas(page).locator('.kui-gauge')).toHaveAttribute(
    'title',
    'Agent Tokens per Minute: 420 tok/min',
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 's', vAlign: 'middle' },
        {
          children: [
            node('gauge', {
              variant: 'bare',
              label: 'Agent Tokens per Minute',
              value: 420,
              max: 1000,
              unit: 'tok/min',
            }),
            node('text', { children: 'Agent activity' }),
          ],
        },
      ),
    ),
  );
});

test('builds Gauge › Tones and Colors', async ({ page }) => {
  await stacked(
    page,
    'Row',
    'Gauge',
    [
      {
        choices: { tone: 'success' },
        text: {
          label: 'Tickets Updated per Hour',
          value: '18',
          max: '40',
          unit: 'per hour',
        },
      },
      {
        choices: { tone: 'warning' },
        text: { label: 'Queue Depth', value: '72', max: '100' },
      },
      {
        choices: { tone: 'danger' },
        text: { label: 'Error Rate', value: '9.5', max: '10', unit: '%' },
      },
      { text: { label: 'Tokens per Minute, Night', ...GAUGE_RATE.text } },
    ],
    async () => {
      await choose(page, 'gap', 'm');
      await choose(page, 'vAlign', 'middle');
      await turnOn(page, 'wrap');
    },
  );
  const night = {
    track: { $css: 'fillColor("#2a0606")' },
    fill: { $css: 'fillColor("#a30d0d")' },
    needle: { $css: 'fillColor("#d63a3a")' },
    text: { $css: 'fillColor("#d63a3a")' },
  };
  await select(page, /^Gauge(?![A-Z])/, 3);
  await editAsJson(page, 'colors', night);
  await expect(
    canvas(page).locator('.kui-gauge').nth(3).locator('.kui-gauge__fill'),
  ).toHaveCSS('stroke', 'rgb(163, 13, 13)');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', vAlign: 'middle', wrap: true },
        {
          children: [
            node('gauge', {
              tone: 'success',
              label: 'Tickets Updated per Hour',
              value: 18,
              max: 40,
              unit: 'per hour',
            }),
            node('gauge', {
              tone: 'warning',
              label: 'Queue Depth',
              value: 72,
              max: 100,
            }),
            node('gauge', {
              tone: 'danger',
              label: 'Error Rate',
              value: 9.5,
              max: 10,
              unit: '%',
            }),
            node('gauge', {
              label: 'Tokens per Minute, Night',
              value: 420,
              max: 1000,
              unit: 'tok/min',
              colors: night,
            }),
          ],
        },
      ),
    ),
  );
});

test('builds EmptyState › Actionable', async ({ page }) => {
  await dragComponent(page, 'EmptyState', () => emptySpot(page));
  await select(page, /^EmptyState/);
  await setText(page, 'title', 'Nothing Here Yet');
  await setText(page, 'detail', 'Create the first item when you are ready.');
  await dragComponent(page, 'LucideIcon', () => zoneSpot(page, 'Icon'));
  await select(page, /^EmptyState/);
  await dragComponent(page, 'Button', () => zoneSpot(page, 'Action'));
  await select(page, /^LucideIcon/);
  await showProp(page, 'icon');
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('search');
  await page.locator('[data-editor-icon="search"]').click();
  await select(page, /^Button/);
  await setText(page, 'children', 'Create Item');
  await setText(page, 'action', 'log-add');
  await expect(
    canvas(page).locator('.kui-empty-state[data-kerf-node] .kui-button'),
  ).toHaveText('Create Item');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'empty-state',
        {
          title: 'Nothing Here Yet',
          detail: 'Create the first item when you are ready.',
        },
        {
          icon: [icon('search')],
          action: [
            node('button', { children: 'Create Item', action: 'log-add' }),
          ],
        },
      ),
    ),
  );
});

test('builds EmptyState › Busy', async ({ page }) => {
  await dragComponent(page, 'EmptyState', () => emptySpot(page));
  await select(page, /^EmptyState/);
  await setText(page, 'title', 'Loading Items');
  await setText(page, 'detail', 'The current view will remain stable.');
  await turnOn(page, 'busy');
  await expect(
    canvas(page).locator('.kui-empty-state[data-kerf-node]'),
  ).toContainText('Loading Items');
  expect(await exported(page)).toEqual(
    pane(
      node('empty-state', {
        title: 'Loading Items',
        detail: 'The current view will remain stable.',
        busy: true,
      }),
    ),
  );
});

test('builds StateBanner › Stacked Copy and Action', async ({ page }) => {
  await dragComponent(page, 'StateBanner', () => emptySpot(page));
  await select(page, /^StateBanner/);
  await choose(page, 'tone', 'warning');
  await setText(page, 'title', 'Migration Needs Review');
  await setText(
    page,
    'detail',
    'Check the imported projects before removing the old source.',
  );
  await choose(page, 'copyLayout', 'stacked');
  await choose(page, 'actionPlacement', 'below');
  await dragComponent(page, 'LucideIcon', () => zoneSpot(page, 'Icon'));
  await select(page, /^StateBanner/);
  await dragComponent(page, 'Button', () => zoneSpot(page, 'Action'));
  await select(page, /^LucideIcon/);
  await showProp(page, 'icon');
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('circle question mark');
  await page.locator('[data-editor-icon="circle-question-mark"]').click();
  await select(page, /^Button/);
  await setText(page, 'children', 'Review Projects');
  await choose(page, 'size', 'compact');
  await choose(page, 'shape', 'pill');
  await expect(
    canvas(page).locator('.kui-state-banner[data-kerf-node] .kui-button'),
  ).toHaveText('Review Projects');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'state-banner',
        {
          tone: 'warning',
          title: 'Migration Needs Review',
          detail: 'Check the imported projects before removing the old source.',
          copyLayout: 'stacked',
          actionPlacement: 'below',
        },
        {
          icon: [icon('circle-question-mark')],
          action: [
            node('button', {
              children: 'Review Projects',
              size: 'compact',
              shape: 'pill',
            }),
          ],
        },
      ),
    ),
  );
});

test('builds ProgressBar › Indeterminate', async ({ page }) => {
  await dragComponent(page, 'ProgressBar', () => emptySpot(page));
  await select(page, /^ProgressBar/);
  await setText(page, 'id', 'progress-bar-demo-migration');
  await setText(page, 'label', 'Migrating Database');
  // Without a value the bar sweeps a band across its track. A number field
  // emptied is unset.
  await setText(page, 'value', '');
  const bar = canvas(page).locator('progress');
  await expect(bar).toHaveCount(1);
  await expect(bar).not.toHaveAttribute('value');
  expect(await exported(page)).toEqual(
    pane(
      node('progress-bar', {
        id: 'progress-bar-demo-migration',
        label: 'Migrating Database',
      }),
    ),
  );
});

test('builds ProgressBar › Tones and Compact Size', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'ProgressBar', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^ProgressBar/);
  await setText(page, 'id', 'progress-bar-demo-confidence');
  await setText(page, 'label', 'Confidence');
  await setText(page, 'value', '0.82');
  await choose(page, 'tone', 'success');
  await turnOn(page, 'showValue');
  await select(page, /^ProgressBar/);
  await page.keyboard.press('ControlOrMeta+d');
  await page.keyboard.press('ControlOrMeta+d');
  await select(page, /^ProgressBar/, 1);
  await setText(page, 'id', 'progress-bar-demo-storage');
  await setText(page, 'label', 'Storage Used');
  await setText(page, 'value', '0.93');
  await choose(page, 'tone', 'warning');
  await select(page, /^ProgressBar/, 2);
  await unset(page, 'id');
  await unset(page, 'label');
  await setText(page, 'ariaLabel', 'Sync Progress');
  await setText(page, 'value', '0.4');
  await choose(page, 'tone', 'Default (brand)');
  await showProp(page, 'showValue');
  await page
    .locator('[data-editor-prop="showValue"] .kui-switch__control')
    .click();
  await choose(page, 'size', 'compact');
  await expect(canvas(page).locator('progress')).toHaveCount(3);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('progress-bar', {
              id: 'progress-bar-demo-confidence',
              label: 'Confidence',
              value: 0.82,
              tone: 'success',
              showValue: true,
            }),
            node('progress-bar', {
              id: 'progress-bar-demo-storage',
              label: 'Storage Used',
              value: 0.93,
              tone: 'warning',
              showValue: true,
            }),
            node('progress-bar', {
              ariaLabel: 'Sync Progress',
              value: 0.4,
              size: 'compact',
            }),
          ],
        },
      ),
    ),
  );
});

test('builds Badge › Count', async ({ page }) => {
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^Badge/);
  await setText(page, 'children', '12');
  await choose(page, 'tone', 'info');
  await choose(page, 'appearance', 'solid');
  await choose(page, 'size', 'compact');
  await setText(page, 'label', '12 unread items');
  await expect(canvas(page).locator('.kui-badge[data-kerf-node]')).toHaveText(
    '12',
  );
  expect(await exported(page)).toEqual(
    pane(
      node('badge', {
        children: '12',
        tone: 'info',
        appearance: 'solid',
        size: 'compact',
        label: '12 unread items',
      }),
    ),
  );
});

test('builds Badge › Dot', async ({ page }) => {
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^Badge/);
  await choose(page, 'tone', 'danger');
  await choose(page, 'size', 'dot');
  // A dot carries no text: clear the seeded placeholder.
  await unset(page, 'children');
  await setText(page, 'label', 'New activity');
  await expect(canvas(page).locator('.kui-badge[data-kerf-node]')).toHaveCount(
    1,
  );
  expect(await exported(page)).toEqual(
    pane(node('badge', { tone: 'danger', size: 'dot', label: 'New activity' })),
  );
});

test('builds Badge › Category Tag', async ({ page }) => {
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^Badge/);
  await setText(page, 'children', 'Design');
  await choose(page, 'tone', 'pop');
  await choose(page, 'appearance', 'outline');
  await choose(page, 'shape', 'rounded');
  await expect(canvas(page).locator('.kui-badge[data-kerf-node]')).toHaveText(
    'Design',
  );
  expect(await exported(page)).toEqual(
    pane(
      node('badge', {
        children: 'Design',
        tone: 'pop',
        appearance: 'outline',
        shape: 'rounded',
      }),
    ),
  );
});

// KF-65FTKX: rootAttributes edits as data-* name and value fields.
test('builds Badge › Icon and Title', async ({ page }) => {
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^Badge/);
  await setText(page, 'children', '82%');
  await choose(page, 'tone', 'success');
  await setText(page, 'title', 'Confidence of the latest completion');
  await setText(page, 'label', '82% confidence');
  // KF-FN28S3: data attributes are on the Integration page.
  await showDataAttributes(page);
  await page
    .locator('[data-action="editor-add-data-attribute"]')
    .filter({ visible: true })
    .click();
  const attribute = (part: string) =>
    page.locator(
      `[data-editor-attribute="0"][data-editor-attribute-part="${part}"]`,
    );
  const commit = async (part: string, text: string) => {
    await attribute(part).locator('input').fill(text);
    await attribute(part).locator('input').press('Enter');
  };
  // A reserved name is refused at the field; the document keeps its own.
  await commit('name', 'data-kerf-node');
  await expect(attribute('name')).toContainText('Reserved');
  await commit('name', 'data-band');
  await expect(attribute('name')).not.toContainText('Reserved');
  await commit('value', 'high');
  await addIcon(page, 'icon', 'gauge');
  const badge = canvas(page).locator('.kui-badge[data-kerf-node]');
  await expect(badge).toHaveText('82%');
  await expect(badge).toHaveAttribute('data-band', 'high');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'badge',
        {
          children: '82%',
          tone: 'success',
          title: 'Confidence of the latest completion',
          label: '82% confidence',
          rootAttributes: { 'data-band': 'high' },
        },
        { icon: [icon('gauge')] },
      ),
    ),
  );
});

test('builds Badge › Status', async ({ page }) => {
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^Badge/);
  await setText(page, 'children', 'Ready');
  await choose(page, 'tone', 'success');
  await expect(canvas(page).locator('.kui-badge[data-kerf-node]')).toHaveText(
    'Ready',
  );
  expect(await exported(page)).toEqual(
    pane(node('badge', { children: 'Ready', tone: 'success' })),
  );
});

test('builds Badge › Long Text', async ({ page }) => {
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^Badge/);
  await setText(page, 'children', 'customer-escalation-priority-review');
  await choose(page, 'tone', 'info');
  // A builder call caps the width; the badge truncates with an ellipsis.
  await showProp(page, 'maxWidth');
  const maxWidth = page
    .locator('[data-editor-prop="maxWidth"]')
    .getByRole('textbox');
  await maxWidth.fill('px(120)');
  await maxWidth.press('Enter');
  // KF-FN28S3: data attributes are on the Integration page.
  await showDataAttributes(page);
  await page
    .locator('[data-action="editor-add-data-attribute"]')
    .filter({ visible: true })
    .click();
  const attribute = (part: string) =>
    page.locator(
      `[data-editor-attribute="0"][data-editor-attribute-part="${part}"]`,
    );
  for (const [part, text] of [
    ['name', 'data-demo-badge'],
    ['value', 'truncate'],
  ] as const) {
    await attribute(part).locator('input').fill(text);
    await attribute(part).locator('input').press('Enter');
  }
  const badge = canvas(page).locator('.kui-badge[data-kerf-node]');
  await expect(badge).toHaveAttribute('data-demo-badge', 'truncate');
  expect((await badge.boundingBox())!.width).toBeLessThanOrEqual(121);
  expect(await exported(page)).toEqual(
    pane(
      node('badge', {
        children: 'customer-escalation-priority-review',
        tone: 'info',
        maxWidth: { $css: 'px(120)' },
        rootAttributes: { 'data-demo-badge': 'truncate' },
      }),
    ),
  );
});

test('builds Badge › Neutral Metadata', async ({ page }) => {
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^Badge/);
  await setText(page, 'children', 'Draft');
  await expect(canvas(page).locator('.kui-badge[data-kerf-node]')).toHaveText(
    'Draft',
  );
  expect(await exported(page)).toEqual(
    pane(node('badge', { children: 'Draft' })),
  );
});

// KF-B516FB: bannerTone starts as `info`, so the banner is a status saying
// Everything Is Connected with a check.
test('builds Feedback › Persistent, Empty, and Loading Feedback', async ({
  page,
}) => {
  test.slow();
  const glyph = async (zone: string, name: string) => {
    await addChild(page, 'LucideIcon', zone);
    await area(page, 'Properties');
    await pickIcon(page, page.locator('[data-editor-icon-place]'), name);
  };
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'm');
  await addInto(page, /^List/, 'StateBanner');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'info', urgency: 'status' },
    text: {
      title: 'Everything Is Connected',
      detail: 'State is expressed with text and color.',
    },
  });
  await glyph('icon', 'check');
  await select(page, /^StateBanner/);
  await addChild(page, 'Button', 'action');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'compact', shape: 'pill' },
    text: { children: 'Cycle Tone', action: 'cycle-tone' },
  });
  await addInto(page, /^List/, 'EmptyState');
  await area(page, 'Properties');
  await applySpec(page, {
    text: {
      title: 'Nothing Here Yet',
      detail: 'Create the first item when you are ready.',
    },
  });
  await glyph('icon', 'search');
  await select(page, /^EmptyState/);
  await addChild(page, 'Button', 'action');
  await area(page, 'Properties');
  await applySpec(page, {
    text: { children: 'Create Item', action: 'log-add' },
  });
  await addInto(page, /^List/, 'Row');
  await area(page, 'Properties');
  await applySpec(page, { choices: { vAlign: 'middle' }, flags: ['wrap'] });
  for (const [label, text] of [
    ['Loading preview…', 'Meaningfully labeled progress'],
    [undefined, 'Decorative progress'],
  ] as const) {
    await addInto(page, /^Row/, 'LoadingSpinner');
    await area(page, 'Properties');
    if (label) await setText(page, 'label', label);
    await addInto(page, /^Row/, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span' },
      text: { children: text },
    });
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'm' },
        {
          children: [
            node(
              'state-banner',
              {
                tone: 'info',
                urgency: 'status',
                title: 'Everything Is Connected',
                detail: 'State is expressed with text and color.',
              },
              {
                icon: [icon('check')],
                action: [
                  node('button', {
                    children: 'Cycle Tone',
                    size: 'compact',
                    shape: 'pill',
                    action: 'cycle-tone',
                  }),
                ],
              },
            ),
            node(
              'empty-state',
              {
                title: 'Nothing Here Yet',
                detail: 'Create the first item when you are ready.',
              },
              {
                icon: [icon('search')],
                action: [
                  node('button', {
                    children: 'Create Item',
                    action: 'log-add',
                  }),
                ],
              },
            ),
            node(
              'row',
              { vAlign: 'middle', wrap: true },
              {
                children: [
                  node('loading-spinner', { label: 'Loading preview…' }),
                  node('text', {
                    children: 'Meaningfully labeled progress',
                    variant: 'span',
                  }),
                  node('loading-spinner'),
                  node('text', {
                    children: 'Decorative progress',
                    variant: 'span',
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

test('builds Chip › Downloadable Files in Transcript Bubbles', async ({
  page,
}) => {
  test.setTimeout(test.info().timeout * 6);
  const bubbles = [
    ['user', 'end', 'brand-loud', 'Why is the build red?'],
    [
      'assistant',
      'start',
      'neutral',
      'The bundle budget grew and one design template drifted.',
    ],
  ] as const;
  await rootPane(page, { text: { label: 'Referenced Files' } }, {});
  await addInto(page, /^Pane/, 'List');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { gap: 'xs' },
    data: [['data-demo-chip-transcript', '']],
  });
  for (const [index, [group, bubble, appearance, text]] of bubbles.entries()) {
    await addInto(page, /^List(?!Item)/, 'ContentItem', 0);
    await area(page, 'Properties');
    await applySpec(page, { choices: { bubble, appearance } });
    await addChild(page, 'Grid');
    await area(page, 'Properties');
    await applySpec(page, { choices: { gap: 'xs' }, text: { columns: '1' } });
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span' },
      text: { children: text },
    });
    await addInto(page, /^Grid/, 'Row', index);
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { gap: 'xs' },
      flags: ['wrap'],
      data: [['data-demo-chip-files', group]],
    });
    for (const [name, glyph, body] of TRANSCRIPT_FILES[group]) {
      await addInto(page, /^Row/, 'Chip', index);
      await area(page, 'Properties');
      await applySpec(page, {
        choices: { tone: 'inherit' },
        flags: ['truncate'],
        text: { children: name, href: fileHref(body) },
        unions: { download: ['Text…', name] },
      });
      await addIcon(page, 'icon', glyph);
    }
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { label: 'Referenced Files' },
      {
        content: [
          node(
            'list',
            {
              gap: 'xs',
              rootAttributes: { 'data-demo-chip-transcript': '' },
            },
            {
              children: bubbles.map(([group, bubble, appearance, text]) =>
                node(
                  'content-item',
                  { bubble, appearance },
                  {
                    children: [
                      node(
                        'grid',
                        { gap: 'xs', columns: 1 },
                        {
                          children: [
                            node('text', { children: text, variant: 'span' }),
                            node(
                              'row',
                              {
                                gap: 'xs',
                                wrap: true,
                                rootAttributes: {
                                  'data-demo-chip-files': group,
                                },
                              },
                              {
                                children: TRANSCRIPT_FILES[group].map(
                                  ([name, glyph, body]) =>
                                    node(
                                      'chip',
                                      {
                                        children: name,
                                        tone: 'inherit',
                                        href: fileHref(body),
                                        download: name,
                                        truncate: true,
                                      },
                                      { icon: [icon(glyph)] },
                                    ),
                                ),
                              },
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
        ],
      },
    ),
  );
});

test('builds Chip › Action Chips in a Value Table', async ({ page }) => {
  test.setTimeout(test.info().timeout * 8);
  await dragComponent(page, 'ValueTable', () => emptySpot(page));
  await valueTable(
    page,
    { choices: { density: 'compact' }, text: { label: 'Search Filters' } },
    SEARCH_FILTERS.map(([label]) => ({ text: { label, value: '' } })),
  );
  for (const [index, [, tokens, unavailable]] of SEARCH_FILTERS.entries()) {
    // The value holds a Row of chips.
    await select(page, /^ValueTableRow/, index);
    await addChild(page, 'Row', 'value');
    await area(page, 'Properties');
    await applySpec(page, { choices: { gap: '2xs' }, flags: ['wrap'] });
    // The row's empty value text became a run beside the Row; it goes.
    await area(page, 'Outline');
    await outlineRow(page, /^Text “”/)
      .first()
      .click();
    await deleteSelected(page);
    for (const token of tokens) {
      await addInto(page, /^Row/, 'Chip', index);
      await area(page, 'Properties');
      await applySpec(page, {
        choices: { size: 'compact', shape: 'rounded' },
        flags: (unavailable as readonly string[]).includes(token)
          ? ['disabled']
          : [],
        text: {
          children: token,
          action: 'log-chip-insert',
          actionLabel: `Insert filter ${token}`,
          itemId: token,
        },
      });
    }
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'value-table',
        { label: 'Search Filters', density: 'compact' },
        {
          children: SEARCH_FILTERS.map(([label, tokens, unavailable]) =>
            node(
              'value-table#ValueTableRow',
              { label },
              {
                value: [
                  node(
                    'row',
                    { gap: '2xs', wrap: true },
                    {
                      children: tokens.map((token) =>
                        node('chip', {
                          children: token,
                          action: 'log-chip-insert',
                          actionLabel: `Insert filter ${token}`,
                          itemId: token,
                          size: 'compact',
                          shape: 'rounded',
                          ...((unavailable as readonly string[]).includes(token)
                            ? { disabled: true }
                            : {}),
                        }),
                      ),
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

// KF-B516FB: examples recorded as not built, by design:
// - Toast (3) and Tooltip (2): shown by `toast()` / `tooltip()` calls, not
//   placed in a view.
// - Foundation › Semantic Palette and Type and Spacing: token showcases.
// - EditorFrame (4): the frame wraps the app's own native textarea (source)
//   or rendered content (preview); that markup is the app's by contract.
// - DocumentBaseline › Full-Height Application Root: the specimen is the
//   app's root element itself, not a composition of components.
// AnchoredSurface › Help Inside a Modal waits on how the editor shows a
// closed modal dialog (KF-SYGSD0).
// KF-B516FB: a settings-driven playground builds its default state;
// badgePlayground starts info, quiet, pill and default.
test('builds Badge › Playground', async ({ page }) => {
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^Badge/);
  await applySpec(page, {
    choices: { tone: 'info' },
    text: { children: 'Ready' },
  });
  // Its other settings start at the Badge's own defaults.
  await expect(
    canvas(page).locator('.kui-badge[data-kerf-node]'),
  ).toHaveAttribute('data-appearance', 'quiet');
  expect(await exported(page)).toEqual(
    pane(node('badge', { children: 'Ready', tone: 'info' })),
  );
});

// The catalog viewport's banner tokens are not the view's.
test('builds StateBanner › Scoped Override', async ({ page }) => {
  await rootBanner(
    page,
    {
      choices: { tone: 'info' },
      text: {
        title: 'Consumer Palette',
        detail: 'Only this instance uses the override.',
      },
    },
    'check',
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'state-banner',
        {
          tone: 'info',
          title: 'Consumer Palette',
          detail: 'Only this instance uses the override.',
        },
        { icon: [icon('check')] },
      ),
    ),
  );
});

test('builds StateBanner › Strip', async ({ page }) => {
  await rootBanner(
    page,
    {
      choices: {
        presentation: 'strip',
        tone: 'warning',
        copyLayout: 'stacked',
      },
      text: {
        title: 'Notifications Paused',
        detail: 'Desktop alerts resume when you reconnect.',
      },
    },
    'circle-question-mark',
    'Resume',
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'state-banner',
        {
          presentation: 'strip',
          tone: 'warning',
          title: 'Notifications Paused',
          detail: 'Desktop alerts resume when you reconnect.',
          copyLayout: 'stacked',
        },
        {
          icon: [icon('circle-question-mark')],
          action: [
            node('button', {
              children: 'Resume',
              size: 'compact',
              shape: 'pill',
            }),
          ],
        },
      ),
    ),
  );
});

test('builds StateBanner › Placeholder', async ({ page }) => {
  await rootBanner(page, {
    choices: { tone: 'neutral' },
    flags: ['placeholder'],
    text: {
      title: 'Syncing Workspace',
      detail: 'Fetching the latest changes.',
    },
  });
  expect(await exported(page)).toEqual(
    pane(
      node('state-banner', {
        tone: 'neutral',
        title: 'Syncing Workspace',
        detail: 'Fetching the latest changes.',
        placeholder: true,
      }),
    ),
  );
});

// progressDemoFiles starts at 3 of 12; Upload Next File is the app's.
test('builds ProgressBar › Determinate', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await choose(page, 'gap', 'xs');
  await addChild(page, 'ProgressBar');
  await area(page, 'Properties');
  await applySpec(page, {
    flags: ['showValue'],
    text: {
      id: 'progress-bar-demo-upload',
      label: 'Uploading Files',
      value: '3',
      max: '12',
      valueText: '3 of 12 files',
    },
  });
  await addInto(page, /^List(?![A-Z])/, 'Row');
  await addChild(page, 'Button');
  await area(page, 'Properties');
  await applySpec(page, {
    text: { children: 'Upload Next File', action: 'step-progress-demo' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('progress-bar', {
              id: 'progress-bar-demo-upload',
              label: 'Uploading Files',
              value: 3,
              max: 12,
              valueText: '3 of 12 files',
              showValue: true,
            }),
            node('row', undefined, {
              children: [
                node('button', {
                  children: 'Upload Next File',
                  action: 'step-progress-demo',
                }),
              ],
            }),
          ],
        },
      ),
    ),
  );
});

test('builds ProgressRing › Sizes', async ({ page }) => {
  const sizes = ['small', 'medium', 'large'];
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await applySpec(page, { choices: { gap: 'm', vAlign: 'middle' } });
  for (const size of sizes) {
    await addInto(page, /^Row/, 'ProgressRing');
    await applySpec(page, {
      choices: { size },
      text: {
        label: `Upload Progress, ${size}`,
        value: '3',
        max: '12',
        valueText: '3 of 12 files',
      },
    });
  }
  await addInto(page, /^Row/, 'Button');
  await applySpec(page, {
    text: { children: 'Upload Next File', action: 'step-progress-demo' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', vAlign: 'middle' },
        {
          children: [
            ...sizes.map((size) =>
              node('progress-ring', {
                label: `Upload Progress, ${size}`,
                value: 3,
                max: 12,
                valueText: '3 of 12 files',
                size,
              }),
            ),
            node('button', {
              children: 'Upload Next File',
              action: 'step-progress-demo',
            }),
          ],
        },
      ),
    ),
  );
});

test('builds Chip › External Link', async ({ page }) => {
  await dragComponent(page, 'Chip', () => emptySpot(page));
  await select(page, /^Chip(?![A-Z])/);
  await applySpec(page, {
    choices: { tone: 'info' },
    flags: ['external'],
    text: {
      children: 'Kerf Source',
      href: 'https://github.com/brianwestphal/kerf',
      itemId: 'kerf-source',
    },
  });
  await addIcon(page, 'icon', 'external-link');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'chip',
        {
          children: 'Kerf Source',
          tone: 'info',
          href: 'https://github.com/brianwestphal/kerf',
          external: true,
          itemId: 'kerf-source',
        },
        { icon: [icon('external-link')] },
      ),
    ),
  );
});

test('builds Chip › Plain Label', async ({ page }) => {
  await dragComponent(page, 'Chip', () => emptySpot(page));
  await select(page, /^Chip(?![A-Z])/);
  await applySpec(page, {
    choices: { appearance: 'solid' },
    text: { children: 'Backlog' },
  });
  expect(await exported(page)).toEqual(
    pane(node('chip', { children: 'Backlog', appearance: 'solid' })),
  );
});

test('builds Chip › Icon and Truncated Label', async ({ page }) => {
  const label = 'Acme International Procurement and Manufacturing Limited';
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await applySpec(page, {
    choices: { gap: 'xs' },
    data: [['data-demo-chip-offer', '']],
  });
  await addChild(page, 'Chip');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'success' },
    flags: ['truncate'],
    text: { children: label },
  });
  await addIcon(page, 'icon', 'trophy');
  await textInto(page, /^Row/, '$129 / unit', 0, {
    choices: { variant: 'span', wrap: 'nowrap' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'xs', rootAttributes: { 'data-demo-chip-offer': '' } },
        {
          children: [
            node(
              'chip',
              { children: label, tone: 'success', truncate: true },
              { icon: [icon('trophy')] },
            ),
            textNode('$129 / unit', { variant: 'span', wrap: 'nowrap' }),
          ],
        },
      ),
    ),
  );
});

// KF-921WVX: the toggle's group sits in a plain Toolbar.
test('builds CornerStatus › Overlay', async ({ page }) => {
  await toolbar(page, 'Overlay');
  await zoneGroup(page, 'leading', { flags: ['single'] }, { keepButton: true });
  await select(page, /^ToolbarButton/);
  await applySpec(page, {
    text: {
      children: 'Toggle Loading Status',
      popoverTarget: 'catalog-corner-status',
    },
  });
  await addInto(page, /^Pane/, 'CornerStatus');
  await area(page, 'Properties');
  await setText(page, 'id', 'catalog-corner-status');
  // The banner turns the seeded text into a Text, which goes.
  await addInto(page, /^CornerStatus/, 'StateBanner', 0, 0);
  await select(page, /^StateBanner/);
  await applySpec(page, {
    choices: { tone: 'neutral', urgency: 'status' },
    text: { title: 'Updating Tickets… 3 of 12' },
  });
  await select(page, /^StateBanner/);
  await addChild(page, 'LoadingSpinner', 'icon');
  await area(page, 'Properties');
  await applySpec(page, {
    text: { label: 'Updating tickets…' },
    unions: { size: ['Number…', '16.8'] },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Overlay' },
        {
          leading: [
            node(
              'toolbar-control-group',
              { single: true },
              {
                children: [
                  node('toolbar-control-group#ToolbarButton', {
                    children: 'Toggle Loading Status',
                    popoverTarget: 'catalog-corner-status',
                  }),
                ],
              },
            ),
          ],
        },
      ),
      node(
        'corner-status',
        { id: 'catalog-corner-status' },
        {
          children: [
            node(
              'state-banner',
              {
                tone: 'neutral',
                urgency: 'status',
                title: 'Updating Tickets… 3 of 12',
              },
              {
                icon: [
                  node('loading-spinner', {
                    label: 'Updating tickets…',
                    size: 16.8,
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

test('builds CornerStatus › Embedded', async ({ page }) => {
  const banners = [
    ['neutral', 'Loading…', 'Loading project…'],
    ['info', 'Syncing 2 Providers', 'Syncing providers…'],
  ] as const;
  await dragComponent(page, 'CornerStatus', () => emptySpot(page));
  await select(page, /^CornerStatus/);
  await choose(page, 'presentation', 'embedded');
  for (const [index, [tone, title, spinner]] of banners.entries()) {
    // The first banner turns the seeded text into a Text, which goes.
    await addInto(
      page,
      /^CornerStatus/,
      'StateBanner',
      0,
      index === 0 ? 0 : undefined,
    );
    await select(page, /^StateBanner/, index);
    await applySpec(page, {
      choices: { tone, urgency: 'status' },
      text: { title },
    });
    await select(page, /^StateBanner/, index);
    await addChild(page, 'LoadingSpinner', 'icon');
    await area(page, 'Properties');
    await applySpec(page, {
      text: { label: spinner },
      unions: { size: ['Number…', '16.8'] },
    });
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'corner-status',
        { presentation: 'embedded' },
        {
          children: banners.map(([tone, title, spinner]) =>
            node(
              'state-banner',
              { tone, urgency: 'status', title },
              {
                icon: [node('loading-spinner', { label: spinner, size: 16.8 })],
              },
            ),
          ),
        },
      ),
    ),
  );
});

// KF-921WVX: the toggles' group sits in a plain Toolbar. Live state is a
// first-render snapshot: edgeActivityBusy starts off, edgeActivityMessage on.
test('builds EdgeActivityIndicator › Top-Edge Activity', async ({ page }) => {
  await toolbar(page, 'Top-Edge Activity');
  await zoneGroup(
    page,
    'leading',
    { text: { label: 'Edge Activity' } },
    { keepButton: true },
  );
  await select(page, /^ToolbarButton/);
  await applySpec(page, {
    choices: { pressed: 'Off' },
    text: { children: 'Start Activity', action: 'toggle-edge-activity-demo' },
  });
  await select(page, /^ToolbarControlGroup/);
  await addChild(page, 'ToolbarButton');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { pressed: 'On' },
    text: {
      children: 'Status Pill',
      action: 'toggle-edge-activity-message-demo',
    },
  });
  await addInto(page, /^Pane/, 'EdgeActivityIndicator');
  await area(page, 'Properties');
  await setText(page, 'message', 'Syncing 3 providers…');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Top-Edge Activity' },
        {
          leading: [
            node(
              'toolbar-control-group',
              { label: 'Edge Activity' },
              {
                children: [
                  node('toolbar-control-group#ToolbarButton', {
                    children: 'Start Activity',
                    action: 'toggle-edge-activity-demo',
                    pressed: false,
                  }),
                  node('toolbar-control-group#ToolbarButton', {
                    children: 'Status Pill',
                    action: 'toggle-edge-activity-message-demo',
                    pressed: true,
                  }),
                ],
              },
            ),
          ],
        },
      ),
      node('edge-activity-indicator', {
        busy: false,
        message: 'Syncing 3 providers…',
      }),
    ),
  );
});

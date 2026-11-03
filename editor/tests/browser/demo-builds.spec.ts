// KF-JN4PF5: each ux-demo configuration, built in the editor the way a
// person would (palette drags, outline and canvas selection, Inspector
// fields), then exported and compared with what the demo renders. A
// configuration the editor cannot build yet has a ticket instead of a test.
import { expect, type Page, test } from '@playwright/test';

import { area } from './areas.js';
import {
  addChild,
  addIcon,
  canvas,
  choose,
  chooseField,
  dragComponent,
  embedIn,
  embedInOther,
  emptySpot,
  exported,
  icon,
  newDocument,
  node,
  outlineRow,
  page as pane,
  pickIcon,
  select,
  setField,
  setText,
  sized,
  turnFieldOn,
  turnOn,
  zoneSpot,
} from './build.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
});

test('builds Button › Tones', async ({ page }) => {
  await dragComponent(page, 'Row', () => emptySpot(page));
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  for (let copy = 0; copy < 3; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  await select(page, /^Row/);
  await turnOn(page, 'wrap');
  const buttons = [
    ['Cancel', undefined],
    ['Save', 'brand'],
    ['Price Check', 'success'],
    ['Delete', 'danger'],
  ] as const;
  for (const [index, [label, tone]] of buttons.entries()) {
    await select(page, /^Button/, index);
    await setText(page, 'children', label);
    if (tone) await choose(page, 'tone', tone);
    await setText(page, 'action', 'log-more');
  }
  await expect(canvas(page).locator('.kui-button')).toHaveText(
    buttons.map(([label]) => label),
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { wrap: true },
        {
          children: buttons.map(([children, tone]) =>
            node('button', {
              children,
              ...(tone ? { tone } : {}),
              action: 'log-more',
            }),
          ),
        },
      ),
    ),
  );
});

/** A wrapping Row of three log-more Buttons, as `[label, tone, emphasis]`. */
async function buttonRow(
  page: Page,
  buttons: readonly (readonly [string, string, string | undefined])[],
) {
  await dragComponent(page, 'Row', () => emptySpot(page));
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  for (let copy = 1; copy < buttons.length; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  await select(page, /^Row/);
  await turnOn(page, 'wrap');
  for (const [index, [label, tone, emphasis]] of buttons.entries()) {
    await select(page, /^Button/, index);
    await setText(page, 'children', label);
    await choose(page, 'tone', tone);
    if (emphasis) await choose(page, 'emphasis', emphasis);
    await setText(page, 'action', 'log-more');
  }
  await expect(canvas(page).locator('.kui-button')).toHaveText(
    buttons.map(([label]) => label),
  );
}

/** The Buttons `buttonRow` builds, as the exported document spells them. */
const buttonNodes = (
  buttons: readonly (readonly [string, string, string | undefined])[],
) =>
  buttons.map(([children, tone, emphasis]) =>
    node('button', {
      children,
      tone,
      ...(emphasis ? { emphasis } : {}),
      action: 'log-more',
    }),
  );

test('builds Button › Emphasis', async ({ page }) => {
  const buttons = [
    ['Primary', 'brand', 'primary'],
    ['Secondary', 'brand', 'secondary'],
    ['Plain', 'brand', 'plain'],
  ] as const;
  await buttonRow(page, buttons);
  expect(await exported(page)).toEqual(
    pane(node('row', { wrap: true }, { children: buttonNodes(buttons) })),
  );
});

test('builds Button › Success Emphasis', async ({ page }) => {
  const buttons = [
    ['Price Check', 'success', undefined],
    ['Review Prices', 'success', 'secondary'],
    ['View Results', 'success', 'plain'],
  ] as const;
  await buttonRow(page, buttons);
  await select(page, /^Row/);
  await page.locator('[data-action="editor-add-data-attribute"]').click();
  const attribute = (part: string) =>
    page.locator(
      `[data-editor-attribute="0"][data-editor-attribute-part="${part}"]`,
    );
  for (const [part, text] of [
    ['name', 'data-demo-section'],
    ['value', 'success-emphasis'],
  ] as const) {
    await attribute(part).locator('input').fill(text);
    await attribute(part).locator('input').press('Enter');
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        {
          wrap: true,
          rootAttributes: { 'data-demo-section': 'success-emphasis' },
        },
        { children: buttonNodes(buttons) },
      ),
    ),
  );
});

test('builds Button › Compact and Icons', async ({ page }) => {
  await dragComponent(page, 'Row', () => emptySpot(page));
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Row/);
  await turnOn(page, 'wrap');
  await choose(page, 'vAlign', 'middle');
  // One Button set up, then duplicated twice and changed.
  await select(page, /^Button/);
  await setText(page, 'children', 'New Item');
  await choose(page, 'size', 'compact');
  await setText(page, 'action', 'log-more');
  await addIcon(page, 'icon', 'plus');
  await choose(page, 'size', 's');
  await select(page, /^Button/);
  await page.keyboard.press('ControlOrMeta+d');
  await page.keyboard.press('ControlOrMeta+d');
  // The second: a secondary link that downloads.
  await select(page, /^Button/, 1);
  await setText(page, 'children', 'Download');
  await choose(page, 'size', 'Not set');
  await choose(page, 'emphasis', 'secondary');
  await setText(page, 'action', '');
  await setText(page, 'href', '#button');
  await select(page, /^LucideIcon/, 1);
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('download');
  await page.locator('[data-editor-icon="download"]').click();
  // The third: a plain danger action.
  await select(page, /^Button/, 2);
  await setText(page, 'children', 'Remove');
  await choose(page, 'size', 'Not set');
  await choose(page, 'tone', 'danger');
  await choose(page, 'emphasis', 'plain');
  await select(page, /^LucideIcon/, 2);
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('trash');
  await page.locator('[data-editor-icon="trash"]').click();
  await expect(canvas(page).locator('.kui-button')).toHaveText([
    'New Item',
    'Download',
    'Remove',
  ]);
  const withIcon = (glyph: string) => ({ icon: [icon(glyph, { size: 's' })] });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { wrap: true, vAlign: 'middle' },
        {
          children: [
            node(
              'button',
              { children: 'New Item', size: 'compact', action: 'log-more' },
              withIcon('plus'),
            ),
            node(
              'button',
              { children: 'Download', emphasis: 'secondary', href: '#button' },
              withIcon('download'),
            ),
            node(
              'button',
              {
                children: 'Remove',
                tone: 'danger',
                emphasis: 'plain',
                action: 'log-more',
              },
              withIcon('trash'),
            ),
          ],
        },
      ),
    ),
  );
});

test('builds TextField › Labels and Hints', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'TextField', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^TextField/);
  await page.keyboard.press('ControlOrMeta+d');
  await select(page, /^TextField/);
  await setText(page, 'label', 'Project Name');
  await setText(page, 'value', 'Component library');
  await setText(page, 'hint', 'Visible to collaborators');
  await turnOn(page, 'clearable');
  await select(page, /^TextField/, 1);
  await setText(page, 'ariaLabel', 'Search Components');
  await setText(page, 'label', '');
  await setText(page, 'placeholder', 'Search components');
  await choose(page, 'type', 'search');
  await turnOn(page, 'clearable');
  await addIcon(page, 'icon', 'search');
  await choose(page, 'size', 's');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('text-field', {
              label: 'Project Name',
              value: 'Component library',
              hint: 'Visible to collaborators',
              clearable: true,
            }),
            node(
              'text-field',
              {
                ariaLabel: 'Search Components',
                placeholder: 'Search components',
                type: 'search',
                clearable: true,
              },
              { icon: [icon('search', { size: 's' })] },
            ),
          ],
        },
      ),
    ),
  );
});

/**
 * A List (gap xs) of TextFields, one per entry of `fields`: each entry's
 * `text` props are typed, its `choices` chosen and its `flags` turned on.
 */
type FieldSpec = {
  readonly text?: Readonly<Record<string, string>>;
  readonly choices?: Readonly<Record<string, string>>;
  readonly flags?: readonly string[];
  /** A `string | number` prop: its kind (`Text…`/`Number…`), then its value. */
  readonly unions?: Readonly<Record<string, readonly [string, string]>>;
};
async function textFields(page: Page, fields: readonly FieldSpec[]) {
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'TextField', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^TextField/);
  for (let copy = 1; copy < fields.length; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  for (const [index, field] of fields.entries()) {
    await select(page, /^TextField/, index);
    // Choices first: a type or multiline can change which props show.
    for (const [name, option] of Object.entries(field.choices ?? {}))
      await choose(page, name, option);
    for (const name of field.flags ?? []) await turnOn(page, name);
    for (const [name, value] of Object.entries(field.text ?? {}))
      await setText(page, name, value);
    for (const [name, [kind, value]] of Object.entries(field.unions ?? {})) {
      await choose(page, name, kind);
      const input = page
        .locator(
          `[data-editor-prop="${name}"]:not([data-editor-kind="choice"]) input`,
        )
        .first();
      await input.fill(value);
      await input.press('Enter');
    }
  }
  await expect(canvas(page).locator('.kui-text-field')).toHaveCount(
    fields.length,
  );
}

/** The List `textFields` builds, holding `props` per field. */
const textFieldList = (props: readonly Record<string, unknown>[]) =>
  pane(
    node(
      'list',
      { gap: 'xs' },
      { children: props.map((each) => node('text-field', each)) },
    ),
  );

test('builds TextField › Validation', async ({ page }) => {
  await textFields(page, [
    {
      choices: { type: 'email' },
      flags: ['required'],
      text: {
        label: 'Email',
        value: 'robin@',
        hint: 'Used for sign-in.',
        error: 'Enter a complete email address.',
      },
    },
    { flags: ['readOnly'], text: { label: 'Owner', value: 'Design Systems' } },
  ]);
  await expect(canvas(page).locator('[aria-invalid="true"]')).toHaveCount(1);
  expect(await exported(page)).toEqual(
    textFieldList([
      {
        type: 'email',
        required: true,
        label: 'Email',
        value: 'robin@',
        hint: 'Used for sign-in.',
        error: 'Enter a complete email address.',
      },
      { readOnly: true, label: 'Owner', value: 'Design Systems' },
    ]),
  );
});

test('builds TextField › Compact', async ({ page }) => {
  await textFields(page, [
    { choices: { size: 'compact' }, text: { label: 'Quantity', value: '12' } },
    {
      choices: { size: 'compact' },
      flags: ['disabled'],
      text: { label: 'Unit', value: 'pieces' },
    },
  ]);
  expect(await exported(page)).toEqual(
    textFieldList([
      { size: 'compact', label: 'Quantity', value: '12' },
      { size: 'compact', disabled: true, label: 'Unit', value: 'pieces' },
    ]),
  );
});

test('builds TextField › Multiple Lines', async ({ page }) => {
  await textFields(page, [
    {
      flags: ['multiline', 'showCount'],
      text: {
        rows: '4',
        label: 'Release Note',
        value: 'Every free component has a focused catalog route.',
        hint: 'Markdown is supported.',
        maxLength: '200',
      },
    },
    {
      flags: ['multiline'],
      text: {
        rows: '2',
        maxRows: '6',
        label: 'Comment',
        placeholder: 'Grows as you type',
      },
    },
  ]);
  await expect(canvas(page).locator('textarea')).toHaveCount(2);
  expect(await exported(page)).toEqual(
    textFieldList([
      {
        multiline: true,
        showCount: true,
        rows: 4,
        label: 'Release Note',
        value: 'Every free component has a focused catalog route.',
        hint: 'Markdown is supported.',
        maxLength: 200,
      },
      {
        multiline: true,
        rows: 2,
        maxRows: 6,
        label: 'Comment',
        placeholder: 'Grows as you type',
      },
    ]),
  );
});

test('builds TextField › Native Date', async ({ page }) => {
  await textFields(page, [
    {
      choices: { type: 'date' },
      flags: ['required'],
      text: { label: 'Needed By', name: 'neededBy', value: '2026-11-12' },
    },
    {
      choices: { type: 'date' },
      flags: ['readOnly'],
      text: { label: 'Received On', name: 'receivedOn', value: '2026-10-18' },
    },
  ]);
  await expect(canvas(page).locator('input[type="date"]')).toHaveCount(2);
  expect(await exported(page)).toEqual(
    textFieldList([
      {
        type: 'date',
        required: true,
        label: 'Needed By',
        name: 'neededBy',
        value: '2026-11-12',
      },
      {
        type: 'date',
        readOnly: true,
        label: 'Received On',
        name: 'receivedOn',
        value: '2026-10-18',
      },
    ]),
  );
});

test('builds TextField › Numeric Constraints', async ({ page }) => {
  await textFields(page, [
    {
      choices: { type: 'number' },
      text: { label: 'Customs Duty', value: '12.50' },
      unions: {
        min: ['Text…', '0'],
        max: ['Text…', '100'],
        step: ['Text…', '0.01'],
      },
    },
    {
      choices: { type: 'number' },
      text: { label: 'Exchange Rate', value: '1.2345' },
      unions: { step: ['Text…', 'any'] },
    },
    {
      choices: { type: 'number' },
      text: { label: 'AI Budget', value: '10' },
      unions: { min: ['Number…', '0'], step: ['Number…', '1'] },
    },
  ]);
  await expect(canvas(page).locator('input[type="number"]')).toHaveCount(3);
  expect(await exported(page)).toEqual(
    textFieldList([
      {
        type: 'number',
        label: 'Customs Duty',
        value: '12.50',
        min: '0',
        max: '100',
        step: '0.01',
      },
      { type: 'number', label: 'Exchange Rate', value: '1.2345', step: 'any' },
      { type: 'number', label: 'AI Budget', value: '10', min: 0, step: 1 },
    ]),
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

test('builds Select › Rendering Balance', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'Select', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^Select/);
  await setText(page, 'name', 'rendering-balance');
  await setText(page, 'ariaLabel', 'Rendering Balance');
  await setText(page, 'label', '');
  const choices = [
    ['quiet', 'Quiet', 'bell', 'Attention'],
    ['balanced', 'Balanced', 'sliders-horizontal', 'Attention'],
    ['explicit', 'Explicit', 'wrench', 'Control'],
  ] as const;
  await page.getByRole('button', { name: 'Configure choices' }).click();
  const dialog = page.locator('dialog[open]');
  for (const [index, [value, label, glyph, group]] of choices.entries()) {
    await dialog.getByText(`Choice ${index + 1}`, { exact: true }).click();
    await setField(page, 'choices', [index, 'value'], value);
    await setField(page, 'choices', [index, 'label'], label);
    await setField(page, 'choices', [index, 'group'], group);
    if (index === 0)
      await setField(
        page,
        'choices',
        [index, 'color'],
        'uiColor("success-on-quiet")',
      );
    if (index === 2)
      await turnFieldOn(page, 'choices', [index, 'separatorBefore']);
    await pickIcon(page, dialog.locator('[data-editor-icon-place]'), glyph);
    await dialog.getByRole('button', { name: 'Back' }).click();
  }
  await dialog.getByRole('button', { name: 'Done' }).click();
  // The first choice was selected, and its rename carried the value along.
  await expect(
    page.locator('[data-editor-prop="value"] .kui-select__trigger'),
  ).toHaveText('Quiet');
  await page.locator('[data-editor-promote-prop="renderSelected"]').click();
  await expect(canvas(page).locator('.kui-select__trigger')).toContainText(
    'Quiet',
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('select', {
              name: 'rendering-balance',
              ariaLabel: 'Rendering Balance',
              value: 'quiet',
              renderSelected: { $param: 'nodeRenderSelected' },
              choices: choices.map(([value, label, glyph, group], index) => ({
                value,
                label,
                group,
                icon: { $icon: glyph },
                iconName: glyph,
                ...(index === 0
                  ? { color: { $css: 'uiColor("success-on-quiet")' } }
                  : {}),
                ...(index === 2 ? { separatorBefore: true } : {}),
              })),
            }),
          ],
        },
      ),
    ),
  );
});

// KF-5ZEYKP, KF-7BB55F: a toolbar's native group buttons are ToolbarButtons.
test('builds Toolbar › Compact Density', async ({ page }) => {
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await dragComponent(page, 'ToolbarText', () => zoneSpot(page, 'Leading'));
  await select(page, /^Toolbar(?!Text)/);
  await dragComponent(page, 'ToolbarControlGroup', () =>
    zoneSpot(page, 'Trailing'),
  );
  await select(page, /^Toolbar(?!Text|Control|Button)/);
  await setText(page, 'label', 'Recent Activity');
  await choose(page, 'density', 'compact');
  await select(page, /^ToolbarText/);
  await setText(page, 'text', 'Recent Activity');
  await select(page, /^ToolbarControlGroup/);
  await setText(page, 'label', 'Activity Actions');
  await choose(page, 'size', 'compact');
  await choose(page, 'content', 'icon');
  // The seeded ToolbarButton becomes the first icon action, then a copy.
  await select(page, /^ToolbarButton/);
  await setText(page, 'ariaLabel', 'Refresh Activity');
  await setText(page, 'children', '');
  await addIcon(page, 'icon', 'refresh-cw');
  await select(page, /^ToolbarButton/);
  await page.keyboard.press('ControlOrMeta+d');
  await select(page, /^ToolbarButton/, 1);
  await setText(page, 'ariaLabel', 'Filter Activity');
  await select(page, /^LucideIcon/, 1);
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('funnel');
  await page.locator('[data-editor-icon="funnel"]').click();
  await expect(
    canvas(page).locator('.kui-toolbar-control-group button'),
  ).toHaveCount(2);
  const action = (ariaLabel: string, glyph: string) =>
    node(
      'toolbar-control-group#ToolbarButton',
      { ariaLabel },
      {
        icon: [icon(glyph)],
      },
    );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Recent Activity', density: 'compact' },
        {
          leading: [node('toolbar-text', { text: 'Recent Activity' })],
          trailing: [
            node(
              'toolbar-control-group',
              { label: 'Activity Actions', size: 'compact', content: 'icon' },
              {
                children: [
                  action('Refresh Activity', 'refresh-cw'),
                  action('Filter Activity', 'funnel'),
                ],
              },
            ),
          ],
        },
      ),
    ),
  );
});

// KF-GEQD7F: DemoFrameShell is a SunkenPanel and DemoChip an outlined Badge.
test('builds Row › Wrapped Row', async ({ page }) => {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await dragComponent(page, 'Row', () => emptySpot(page));
  await dragComponent(page, 'Badge', () => emptySpot(page));
  await select(page, /^SunkenPanel/);
  await setText(page, 'ariaLabel', 'Layout Example');
  await select(page, /^Row/);
  await choose(page, 'hAlign', 'full');
  await choose(page, 'vAlign', 'middle');
  await choose(page, 'gap', 'm');
  await turnOn(page, 'wrap');
  await select(page, /^Badge/);
  await choose(page, 'appearance', 'outline');
  await choose(page, 'shape', 'rounded');
  await choose(page, 'size', 'default');
  for (let copy = 0; copy < 4; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  const labels = [
    'Alpha',
    'Beta release',
    'Gamma',
    'Delta workspace',
    'Epsilon',
  ];
  for (const [index, label] of labels.entries()) {
    await select(page, /^Badge/, index);
    await setText(page, 'children', label);
  }
  await expect(canvas(page).locator('.kui-badge[data-kerf-node]')).toHaveText(
    labels,
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { ariaLabel: 'Layout Example' },
        {
          children: [
            node(
              'row',
              { hAlign: 'full', vAlign: 'middle', gap: 'm', wrap: true },
              {
                children: labels.map((children) =>
                  node('badge', {
                    children,
                    appearance: 'outline',
                    shape: 'rounded',
                    size: 'default',
                  }),
                ),
              },
            ),
          ],
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

// KF-VSWT2Q: each choice's content field leads from its form to its zone.
test('builds SegmentedControl › Rounded Rectangle', async ({ page }) => {
  await dragComponent(page, 'SegmentedControl', () => emptySpot(page));
  await select(page, /^SegmentedControl/);
  await setText(page, 'id', 'inspector-section');
  await setText(page, 'label', 'Inspector Section');
  await setText(page, 'action', 'select-segment-demo');
  await choose(page, 'shape', 'rounded');
  await choose(page, 'layout', 'equal');
  const choices = [
    ['summary', 'Summary', 'list'],
    ['activity', 'Activity', 'bell'],
    ['files', 'Files', 'folder'],
  ] as const;
  const dialog = page.locator('dialog[open]');
  for (const [index, [value, label, glyph]] of choices.entries()) {
    await select(page, /^SegmentedControl/);
    await page.getByRole('button', { name: 'Configure choices' }).click();
    await dialog.getByText(`Choice ${index + 1}`, { exact: true }).click();
    await setField(page, 'choices', [index, 'value'], value);
    await setField(page, 'choices', [index, 'label'], label);
    // The content row leaves the form for Children, its zone chosen.
    await page
      .locator(`[data-editor-content-add="choices.${index}.content"]`)
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.locator('[data-editor-add="zone"] .kui-select__trigger'),
    ).toContainText(`choices › ${index + 1} › content`);
    await addChild(page, 'LucideIcon');
    await select(page, /^LucideIcon/, index);
    await page.locator('[data-editor-icon-place]').first().click();
    await page.keyboard.type(glyph);
    await page.locator(`[data-editor-icon="${glyph}"]`).click();
    await select(page, /^SegmentedControl/);
    await addChild(page, 'Text', `choices › ${index + 1} › content`);
    await select(page, /^Text/, index);
    await choose(page, 'variant', 'span');
    await setText(page, 'children', label);
  }
  const control = canvas(page).locator(
    '[data-segmented-control-id="inspector-section"]',
  );
  await expect(control.locator('button')).toHaveText([
    'Summary',
    'Activity',
    'Files',
  ]);
  await expect(control.locator('button svg')).toHaveCount(3);
  await expect(control.locator('button[aria-pressed="true"]')).toHaveText(
    'Summary',
  );
  // Back in a filled choice's form, its content row counts its nodes.
  await select(page, /^SegmentedControl/);
  await page.getByRole('button', { name: 'Configure choices' }).click();
  await dialog.getByText('Activity', { exact: true }).click();
  await expect(
    page.locator('[data-editor-content-node="choices.1.content"]'),
  ).toContainText('2 items');
  await dialog.getByRole('button', { name: 'Done' }).click();
  expect(await exported(page)).toEqual(
    pane(
      node(
        'segmented-control',
        {
          id: 'inspector-section',
          label: 'Inspector Section',
          value: 'summary',
          action: 'select-segment-demo',
          shape: 'rounded',
          layout: 'equal',
          choices: choices.map(([value, label]) => ({ value, label })),
        },
        Object.fromEntries(
          choices.map(([, label, glyph], index) => [
            `choices.${index}.content`,
            [icon(glyph), node('text', { children: label, variant: 'span' })],
          ]),
        ),
      ),
    ),
  );
});

// KF-0W87ST: the group sits in a Toolbar; KF-NTK7YW: its icon is Lucide's
// own `arrow-down-a-z`, one tile in the picker.
test('builds PopupMenu › Icon Trigger in a Toolbar Group', async ({ page }) => {
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await dragComponent(page, 'ToolbarControlGroup', () =>
    zoneSpot(page, 'Leading'),
  );
  await select(page, /^Toolbar(?!Text|Control|Button)/);
  await setText(page, 'label', 'Icon Trigger in a Toolbar Group');
  await select(page, /^ToolbarControlGroup/);
  await turnOn(page, 'single');
  await turnOn(page, 'nestedDropdown');
  await choose(page, 'menuInset', 'compact');
  // The group's seeded ToolbarButton gives way to the menu.
  await select(page, /^ToolbarButton/);
  await page.locator('[data-action="editor-delete"]').click();
  await select(page, /^ToolbarControlGroup/);
  await addChild(page, 'PopupMenu');
  await select(page, /^PopupMenu/);
  await setText(page, 'label', 'Sort Tickets');
  // An icon-only trigger: a label, no seeded text.
  await setText(page, 'text', '');
  await page.locator('[data-editor-content-add="icon"]').click();
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('arrow down a z');
  await expect(page.locator('[data-editor-icon]')).toHaveCount(2);
  await page.locator('[data-editor-icon="arrow-down-a-z"]').click();
  await select(page, /^PopupMenu/);
  await page.getByRole('button', { name: 'Configure items' }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name: 'Remove Item 3' }).click();
  const items = [
    ['Recently Updated', 'sort-recent'],
    ['Priority', 'sort-priority'],
  ] as const;
  for (const [index, [label, action]] of items.entries()) {
    await dialog.getByText(`Item ${index + 1}`, { exact: true }).click();
    await setField(page, 'items', [index, 'label'], label);
    await setField(page, 'items', [index, 'action'], action);
    await dialog.getByRole('button', { name: 'Back' }).click();
  }
  await dialog.getByRole('button', { name: 'Done' }).click();
  const trigger = canvas(page).getByRole('button', { name: 'Sort Tickets' });
  await expect(trigger).toBeVisible();
  await expect(trigger.locator('[data-lucide="arrow-down-a-z"]')).toHaveCount(
    1,
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Icon Trigger in a Toolbar Group' },
        {
          leading: [
            node(
              'toolbar-control-group',
              { single: true, nestedDropdown: true, menuInset: 'compact' },
              {
                children: [
                  node(
                    'popup-menu',
                    {
                      label: 'Sort Tickets',
                      items: items.map(([label, action]) => ({
                        label,
                        action,
                      })),
                    },
                    { icon: [icon('arrow-down-a-z')] },
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

test('builds SegmentedControl › Pill', async ({ page }) => {
  await dragComponent(page, 'SegmentedControl', () => emptySpot(page));
  await select(page, /^SegmentedControl/);
  await setText(page, 'id', 'display-density');
  await setText(page, 'label', 'Display Density');
  await setText(page, 'action', 'select-segment-demo');
  await choose(page, 'appearance', 'outlined');
  await choose(page, 'shape', 'pill');
  await choose(page, 'size', 'small');
  const choices = [
    ['compact', 'Compact'],
    ['comfortable', 'Comfortable'],
    ['roomy', 'Roomy'],
  ] as const;
  await page.getByRole('button', { name: 'Configure choices' }).click();
  const dialog = page.locator('dialog[open]');
  for (const [index, [value, label]] of choices.entries()) {
    await dialog.getByText(`Choice ${index + 1}`, { exact: true }).click();
    await setField(page, 'choices', [index, 'value'], value);
    await setField(page, 'choices', [index, 'label'], label);
    if (index === 2) {
      await turnFieldOn(page, 'choices', [index, 'disabled']);
      await setField(
        page,
        'choices',
        [index, 'title'],
        'Roomy density is unavailable',
      );
    }
    await dialog.getByRole('button', { name: 'Back' }).click();
  }
  await dialog.getByRole('button', { name: 'Done' }).click();
  await choose(page, 'value', 'Comfortable');
  const control = canvas(page).locator(
    '[data-segmented-control-id="display-density"]',
  );
  await expect(control.locator('button')).toHaveText([
    'Compact',
    'Comfortable',
    'Roomy',
  ]);
  await expect(control.locator('button[aria-pressed="true"]')).toHaveText(
    'Comfortable',
  );
  await expect(control.locator('button').nth(2)).toBeDisabled();
  expect(await exported(page)).toEqual(
    pane(
      node('segmented-control', {
        id: 'display-density',
        label: 'Display Density',
        value: 'comfortable',
        action: 'select-segment-demo',
        appearance: 'outlined',
        shape: 'pill',
        size: 'small',
        choices: [
          { value: 'compact', label: 'Compact' },
          { value: 'comfortable', label: 'Comfortable' },
          {
            value: 'roomy',
            label: 'Roomy',
            disabled: true,
            title: 'Roomy density is unavailable',
          },
        ],
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

test('builds EmptyState › Actionable', async ({ page }) => {
  await dragComponent(page, 'EmptyState', () => emptySpot(page));
  await select(page, /^EmptyState/);
  await setText(page, 'title', 'Nothing Here Yet');
  await setText(page, 'detail', 'Create the first item when you are ready.');
  await dragComponent(page, 'LucideIcon', () => zoneSpot(page, 'Icon'));
  await select(page, /^EmptyState/);
  await dragComponent(page, 'Button', () => zoneSpot(page, 'Action'));
  await select(page, /^LucideIcon/);
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

test('builds Switch › Compact', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'Switch', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^Switch/);
  await choose(page, 'size', 'compact');
  await setText(page, 'label', 'Show avatars');
  await setText(page, 'action', 'switch-demo');
  await select(page, /^Switch/);
  // Duplicating selects the copy.
  await page.keyboard.press('ControlOrMeta+d');
  await setText(page, 'label', 'Show timestamps');
  await select(page, /^Switch/);
  await turnOn(page, 'checked');
  await expect(canvas(page).locator('.kui-switch')).toHaveCount(2);
  const toggle = (label: string, checked?: true) =>
    node('switch', {
      size: 'compact',
      label,
      ...(checked ? { checked } : {}),
      action: 'switch-demo',
    });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [toggle('Show avatars', true), toggle('Show timestamps')],
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
  // Without a value the bar sweeps a band across its track.
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
  await setText(page, 'id', '');
  await setText(page, 'label', '');
  await setText(page, 'ariaLabel', 'Sync Progress');
  await setText(page, 'value', '0.4');
  await choose(page, 'tone', 'Default (brand)');
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

test('builds a DemoContentItem (ContentItem › List › Text)', async ({
  page,
}) => {
  await dragComponent(page, 'ContentItem', () => emptySpot(page));
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'Text', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', '2xs');
  await select(page, /^Text/);
  await setText(page, 'children', 'Projects');
  await choose(page, 'variant', 'span');
  await choose(page, 'weight', 'strong');
  await select(page, /^Text/);
  await page.keyboard.press('ControlOrMeta+d');
  await setText(page, 'children', 'Each destination stays mounted.');
  await choose(page, 'weight', 'Default (regular)');
  await choose(page, 'tone', 'quiet');
  await choose(page, 'size', 'compact');
  await expect(
    canvas(page).locator('.kui-content-item[data-kerf-node] strong'),
  ).toHaveText('Projects');
  const text = (children: string, props: Record<string, unknown>) =>
    node('text', { children, variant: 'span', ...props });
  expect(await exported(page)).toEqual(
    pane(
      node('content-item', undefined, {
        children: [
          node(
            'list',
            { gap: '2xs' },
            {
              children: [
                text('Projects', { weight: 'strong' }),
                text('Each destination stays mounted.', {
                  tone: 'quiet',
                  size: 'compact',
                }),
              ],
            },
          ),
        ],
      }),
    ),
  );
});

/**
 * Fills a DemoContentItem's List and its title and detail Texts (the
 * composition the "builds a DemoContentItem" test assembles), given the
 * outline positions of that List and of its one Text so far.
 */
async function demoTexts(
  page: Page,
  at: { readonly list: number; readonly text: number },
  title: string,
  detail: string,
) {
  await select(page, /^List(?!Item)/, at.list);
  await choose(page, 'gap', '2xs');
  await select(page, /^Text/, at.text);
  await setText(page, 'children', title);
  await choose(page, 'variant', 'span');
  await choose(page, 'weight', 'strong');
  await page.keyboard.press('ControlOrMeta+d');
  await setText(page, 'children', detail);
  await choose(page, 'weight', 'Default (regular)');
  await choose(page, 'tone', 'quiet');
  await choose(page, 'size', 'compact');
}

/** A DemoContentItem's nodes as the exported document spells them. */
const demoContentItem = (title: string, detail: string) =>
  node('content-item', undefined, {
    children: [
      node(
        'list',
        { gap: '2xs' },
        {
          children: [
            node('text', {
              children: title,
              variant: 'span',
              weight: 'strong',
            }),
            node('text', {
              children: detail,
              variant: 'span',
              tone: 'quiet',
              size: 'compact',
            }),
          ],
        },
      ),
    ],
  });

test('builds TabNavigator › Persistent Tab Scenes', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await dragComponent(page, 'TabNavigator', () => emptySpot(page));
  await select(page, /^TabNavigator/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^TabNavigator/);
  await setText(page, 'id', 'catalog-tab-scaffold');
  await setText(page, 'label', 'Application Sections');
  const dialog = page.locator('dialog[open]');
  const item = (index: number) =>
    dialog.locator('[data-action="editor-open-field"]').nth(index).click();
  const back = () => dialog.getByRole('button', { name: 'Back' }).click();
  // Settings carries a text-free dot, the tab list's other member.
  await page.getByRole('button', { name: 'Configure tabs' }).click();
  await dialog.getByRole('button', { name: 'Remove Tab 3' }).click();
  await dialog.getByRole('button', { name: /Add/ }).last().click();
  await page.getByRole('menuitem', { name: 'Dot badge' }).click();
  await item(0);
  await setField(page, 'tabs', [0, 'id'], 'projects');
  await setField(page, 'tabs', [0, 'label'], 'Projects');
  await chooseField(page, 'tabs', [0, 'appearance'], 'sunken');
  await chooseField(page, 'tabs', [0, 'badge'], 'Number…');
  await setField(page, 'tabs', [0, 'badge'], '3');
  await setField(page, 'tabs', [0, 'badgeLabel'], '3 updated');
  await back();
  await item(1);
  await setField(page, 'tabs', [1, 'id'], 'search');
  await setField(page, 'tabs', [1, 'label'], 'Search');
  await turnFieldOn(page, 'tabs', [1, 'deepInset']);
  await chooseField(page, 'tabs', [1, 'tabIndex'], '0');
  await turnFieldOn(page, 'tabs', [1, 'outlined']);
  await back();
  await item(2);
  await setField(page, 'tabs', [2, 'id'], 'settings');
  await setField(page, 'tabs', [2, 'label'], 'Settings');
  await setField(page, 'tabs', [2, 'badgeLabel'], 'Update available');
  await back();
  // KF-2XH5XS: the list names each tab's member.
  await expect(
    dialog.locator('[data-action="editor-open-field"]').nth(2),
  ).toContainText('Dot badge');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await setText(page, 'active', 'projects');
  const glyphs = ['folder-kanban', 'search', 'settings'];
  for (const [index, glyph] of glyphs.entries()) {
    await select(page, /^TabNavigator/);
    await page.getByRole('button', { name: 'Configure tabs' }).click();
    await item(index);
    // The tab's Icon row adds a LucideIcon and selects it.
    await dialog.getByText('Icon', { exact: true }).click();
    await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
  }
  // Each scene is a DemoContentItem, as the demo writes it.
  const scenes = [
    ['Projects', 'Each destination stays mounted when inactive.'],
    ['Search', 'This plain scene uses a deeper content inset.'],
    ['Settings', 'Promote these destinations to a rail on desktop.'],
  ] as const;
  // The active tab's content is a drop target on the canvas.
  await select(page, /^TabNavigator/);
  await dragComponent(page, 'ContentItem', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'tab1Content slot — drop here',
    }),
  );
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'Text', () => emptySpot(page));
  await demoTexts(page, { list: 0, text: 0 }, ...scenes[0]);
  // The inactive tabs' content takes children from Children › Add a child.
  for (const index of [1, 2]) {
    await select(page, /^TabNavigator/);
    await addChild(page, 'ContentItem', `tabs › ${index + 1} › content`);
    await addChild(page, 'List');
    await addChild(page, 'Text');
    const [title, detail] = scenes[index]!;
    await demoTexts(page, { list: index, text: index * 2 }, title, detail);
  }
  const navigator = canvas(page).locator('.kui-tab-scaffold[data-kerf-node]');
  await expect(navigator.getByRole('tab')).toHaveCount(3);
  await expect(navigator.locator('.kui-badge').first()).toHaveText('3');
  await expect(
    navigator.locator('.kui-content-item[data-kerf-node]').first(),
  ).toContainText('Each destination stays mounted when inactive.');
  await select(page, /^TabNavigator/);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-tab-navigator-1440.png'),
  });
  const tab = (id: string, label: string, props: Record<string, unknown>) => ({
    id,
    label,
    ...props,
  });
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'tab-navigator',
          {
            id: 'catalog-tab-scaffold',
            label: 'Application Sections',
            tabs: [
              tab('projects', 'Projects', {
                appearance: 'sunken',
                badge: 3,
                badgeLabel: '3 updated',
              }),
              tab('search', 'Search', {
                deepInset: true,
                tabIndex: 0,
                outlined: true,
              }),
              tab('settings', 'Settings', {
                badge: true,
                badgeLabel: 'Update available',
              }),
            ],
            active: 'projects',
          },
          Object.fromEntries([
            ...glyphs.map((glyph, index) => [
              `tabs.${index}.icon`,
              [icon(glyph)],
            ]),
            ...scenes.map(([title, detail], index) => [
              `tabs.${index}.content`,
              [demoContentItem(title, detail)],
            ]),
          ]),
        ),
      ),
    ),
  );
});

test('builds TabNavigator › NavStack Inside a Tab', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await dragComponent(page, 'TabNavigator', () => emptySpot(page));
  await select(page, /^TabNavigator/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^TabNavigator/);
  await setText(page, 'id', 'catalog-tab-scaffold-nested');
  await setText(page, 'label', 'Project Sections');
  const dialog = page.locator('dialog[open]');
  const item = (index: number) =>
    dialog.locator('[data-action="editor-open-field"]').nth(index).click();
  const back = () => dialog.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Configure tabs' }).click();
  await dialog.getByRole('button', { name: 'Remove Tab 3' }).click();
  for (const [index, id] of ['projects', 'search'].entries()) {
    await item(index);
    await setField(page, 'tabs', [index, 'id'], id);
    await setField(
      page,
      'tabs',
      [index, 'label'],
      id[0]!.toUpperCase() + id.slice(1),
    );
    await back();
  }
  await dialog.getByRole('button', { name: 'Done' }).click();
  await setText(page, 'active', 'projects');
  const glyphs = ['folder-kanban', 'search'];
  for (const [index, glyph] of glyphs.entries()) {
    await select(page, /^TabNavigator/);
    await page.getByRole('button', { name: 'Configure tabs' }).click();
    await item(index);
    await dialog.getByText('Icon', { exact: true }).click();
    await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
  }
  // The Projects tab owns a NavStack, dropped into its content.
  await select(page, /^TabNavigator/);
  await dragComponent(page, 'NavStack', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'tab1Content slot — drop here',
    }),
  );
  await select(page, /^NavStack/);
  await setText(page, 'id', 'catalog-tab-scaffold-project-stack');
  await setText(page, 'label', 'Projects Navigation');
  await page.getByRole('button', { name: 'Configure views' }).click();
  await dialog.getByRole('button', { name: 'Remove View 3' }).click();
  await dialog.getByRole('button', { name: 'Remove View 2' }).click();
  await item(0);
  await setField(page, 'views', [0, 'key'], 'projects');
  await dialog.getByText('Toolbar', { exact: true }).click();
  await setField(page, 'views', [0, 'toolbar', 'title'], 'Projects');
  await back();
  await dialog.getByText('Pane', { exact: true }).click();
  await chooseField(page, 'views', [0, 'pane', 'appearance'], 'sunken');
  await back();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await select(page, /^NavStack/);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'view1Content slot — drop here',
    }),
  );
  await dragComponent(page, 'ListItem', () => emptySpot(page));
  await select(page, /^ListItem/);
  await setText(page, 'action', 'open-tab-scaffold-project');
  await setText(page, 'itemId', 'atlas');
  await setText(page, 'label', 'Project Atlas');
  await setText(
    page,
    'description',
    'Open this project while keeping the tab bar in place.',
  );
  // The trailing row's + opens Children › Add a child on its zone.
  await page.locator('[data-editor-content-add="trailing"]').click();
  await addChild(page, 'LucideIcon');
  await select(page, /^LucideIcon/, 0);
  await pickIcon(
    page,
    page.locator('[data-editor-icon-place]'),
    'chevron-right',
  );
  // Search is a DemoContentItem scene.
  await select(page, /^TabNavigator/);
  await addChild(page, 'ContentItem', 'tabs › 2 › content');
  await addChild(page, 'List');
  await addChild(page, 'Text');
  await demoTexts(
    page,
    { list: 1, text: 0 },
    'Search',
    'The Projects stack remains mounted.',
  );
  await select(page, /^TabNavigator/);
  const navigator = canvas(page).locator('.kui-tab-scaffold[data-kerf-node]');
  await expect(navigator.locator('.kui-nav-stack')).toContainText(
    'Project Atlas',
  );
  await expect(navigator.getByRole('tab')).toHaveCount(2);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-tab-navigator-nested-1440.png'),
  });
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'tab-navigator',
          {
            id: 'catalog-tab-scaffold-nested',
            label: 'Project Sections',
            tabs: [
              { id: 'projects', label: 'Projects' },
              { id: 'search', label: 'Search' },
            ],
            active: 'projects',
          },
          {
            'tabs.0.icon': [icon('folder-kanban')],
            'tabs.1.icon': [icon('search')],
            'tabs.0.content': [
              node(
                'nav-stack',
                {
                  id: 'catalog-tab-scaffold-project-stack',
                  label: 'Projects Navigation',
                  views: [
                    {
                      key: 'projects',
                      toolbar: { title: 'Projects' },
                      pane: { appearance: 'sunken' },
                    },
                  ],
                },
                {
                  'views.0.content': [
                    node('list', undefined, {
                      children: [
                        node(
                          'list-item',
                          {
                            label: 'Project Atlas',
                            action: 'open-tab-scaffold-project',
                            itemId: 'atlas',
                            description:
                              'Open this project while keeping the tab bar in place.',
                          },
                          { trailing: [icon('chevron-right')] },
                        ),
                      ],
                    }),
                  ],
                },
              ),
            ],
            'tabs.1.content': [
              demoContentItem('Search', 'The Projects stack remains mounted.'),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds NavStack › Interactive Push and Pop', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await dragComponent(page, 'NavStack', () => emptySpot(page));
  await select(page, /^NavStack/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^NavStack/);
  await setText(page, 'id', 'catalog-nav-stack');
  await setText(page, 'label', 'Project Library');
  await setText(page, 'backLabel', 'Back to Library');
  const dialog = page.locator('dialog[open]');
  const back = () => dialog.getByRole('button', { name: 'Back' }).click();
  const configure = async (...rows: string[]) => {
    await select(page, /^NavStack/);
    await page.getByRole('button', { name: 'Configure views' }).click();
    await dialog.locator('[data-action="editor-open-field"]').first().click();
    for (const row of rows)
      await dialog.getByText(row, { exact: true }).click();
  };
  // The demo's stack starts from one view: the library.
  await page.getByRole('button', { name: 'Configure views' }).click();
  await dialog.getByRole('button', { name: 'Remove View 3' }).click();
  await dialog.getByRole('button', { name: 'Remove View 2' }).click();
  await dialog.locator('[data-action="editor-open-field"]').first().click();
  await setField(page, 'views', [0, 'key'], 'library');
  await dialog.getByText('Pane', { exact: true }).click();
  await chooseField(page, 'views', [0, 'pane', 'appearance'], 'sunken');
  await back();
  await dialog.getByText('Toolbar', { exact: true }).click();
  await setField(page, 'views', [0, 'toolbar', 'title'], 'Library');
  await back();
  await dialog.getByText('Bottom toolbar', { exact: true }).click();
  await setField(page, 'views', [0, 'bottomToolbar', 'label'], 'View Status');
  await dialog.getByRole('button', { name: 'Done' }).click();
  // A toolbar zone's + opens Children › Add a child on that zone.
  const toolbarText = async (rows: string[], text: string) => {
    await configure(...rows);
    // The new node is selected.
    await addChild(page, 'ToolbarText');
    await area(page, 'Properties');
    await setText(page, 'text', text);
    await choose(page, 'size', 'small');
  };
  await toolbarText(['Toolbar', 'Trailing'], 'Projects');
  await toolbarText(['Bottom toolbar', 'Leading'], '2 saved projects');
  // The library's content: a counted header over two project rows.
  await select(page, /^NavStack/);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'view1Content slot — drop here',
    }),
  );
  await dragComponent(page, 'ListHeader', () => emptySpot(page));
  await select(page, /^ListHeader/);
  await setText(page, 'label', 'Saved Projects');
  await setText(page, 'count', '2');
  await setText(page, 'countLabel', '2 saved projects');
  // Dropped on the header's bottom edge, the row lands after it.
  await dragComponent(
    page,
    'ListItem',
    () => canvas(page).locator('.kui-list-header[data-kerf-node]'),
    0.9,
  );
  const projects = [
    [
      'atlas',
      'Project Atlas',
      'Navigation and workspace patterns for the Kerf UI catalog.',
    ],
    [
      'relay',
      'Project Relay',
      'Interaction contracts shared across responsive application layouts.',
    ],
  ] as const;
  await select(page, /^ListItem/);
  await setText(page, 'action', 'open-nav-stack-project');
  await turnOn(page, 'multiline');
  // The icon row adds a LucideIcon; the trailing row opens Children.
  await addIcon(page, 'icon', 'folder');
  await select(page, /^ListItem/);
  await page.locator('[data-editor-content-add="trailing"]').click();
  await addChild(page, 'LucideIcon');
  await area(page, 'Properties');
  await pickIcon(
    page,
    page.locator('[data-editor-icon-place]'),
    'chevron-right',
  );
  // The second row is a copy of the first with its own project.
  await select(page, /^ListItem/);
  await page.keyboard.press('ControlOrMeta+d');
  for (const [index, [id, label, summary]] of projects.entries()) {
    await select(page, /^ListItem/, index);
    await setText(page, 'itemId', id);
    await setText(page, 'label', label);
    await setText(page, 'description', summary);
  }
  await select(page, /^NavStack/);
  const stack = canvas(page).locator('.kui-nav-stack[data-kerf-node]');
  await expect(stack.locator('.kui-list-item')).toHaveCount(2);
  await expect(stack).toContainText('2 saved projects');
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-nav-stack-1440.png'),
  });
  const toolbarTextNode = (text: string) =>
    node('toolbar-text', { text, size: 'small' });
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'nav-stack',
          {
            id: 'catalog-nav-stack',
            label: 'Project Library',
            backLabel: 'Back to Library',
            views: [
              {
                key: 'library',
                pane: { appearance: 'sunken' },
                toolbar: { title: 'Library' },
                bottomToolbar: { label: 'View Status' },
              },
            ],
          },
          {
            'views.0.toolbar.trailing': [toolbarTextNode('Projects')],
            'views.0.bottomToolbar.leading': [
              toolbarTextNode('2 saved projects'),
            ],
            'views.0.content': [
              node('list', undefined, {
                children: [
                  node('list-header', {
                    label: 'Saved Projects',
                    count: 2,
                    countLabel: '2 saved projects',
                  }),
                  ...projects.map(([id, label, summary]) =>
                    node(
                      'list-item',
                      {
                        action: 'open-nav-stack-project',
                        multiline: true,
                        itemId: id,
                        label,
                        description: summary,
                      },
                      {
                        icon: [icon('folder')],
                        trailing: [icon('chevron-right')],
                      },
                    ),
                  ),
                ],
              }),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds NavStack › Configured Toolbar', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await dragComponent(page, 'NavStack', () => emptySpot(page));
  await select(page, /^NavStack/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^NavStack/);
  await setText(page, 'id', 'catalog-nav-stack-configured');
  await setText(page, 'label', 'Configured Project Library');
  const dialog = page.locator('dialog[open]');
  const back = () => dialog.getByRole('button', { name: 'Back' }).click();
  // toolbarConfig: a level-2 title with a bottom divider.
  await page.getByRole('button', { name: 'Configure toolbar config' }).click();
  await chooseField(page, 'toolbarConfig', ['headingLevel'], '2');
  await chooseField(page, 'toolbarConfig', ['dividerSides'], 'b');
  // A form this small opens in the Inspector; its back button returns.
  await page
    .locator('#editor-inspector-stack')
    .getByRole('button', { name: 'Back' })
    .click();
  await page.getByRole('button', { name: 'Configure views' }).click();
  await dialog.getByRole('button', { name: 'Remove View 3' }).click();
  await dialog.getByRole('button', { name: 'Remove View 2' }).click();
  await dialog.locator('[data-action="editor-open-field"]').first().click();
  await setField(page, 'views', [0, 'key'], 'library');
  await dialog.getByText('Toolbar', { exact: true }).click();
  await setField(page, 'views', [0, 'toolbar', 'title'], 'Library');
  await back();
  await dialog.getByRole('button', { name: 'Done' }).click();
  // A toolbar zone's + opens Children › Add a child on that zone; the new
  // group is selected, holding one seeded ToolbarButton.
  const group = async (zone: string, label: string) => {
    await select(page, /^NavStack/);
    await page.getByRole('button', { name: 'Configure views' }).click();
    await dialog.locator('[data-action="editor-open-field"]').first().click();
    await dialog.getByText('Toolbar', { exact: true }).click();
    await dialog.getByText(zone, { exact: true }).click();
    await addChild(page, 'ToolbarControlGroup');
    await area(page, 'Properties');
    await setText(page, 'label', label);
  };
  /** The seeded button as an icon command. */
  const command = async (nth: number, ariaLabel: string, glyph: string) => {
    await select(page, /^ToolbarButton/, nth);
    await setText(page, 'ariaLabel', ariaLabel);
    await setText(page, 'children', '');
    await setText(page, 'action', 'nav-stack-demo-command');
    await addIcon(page, 'icon', glyph);
  };
  await group('Leading', 'Sidebar');
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  await command(0, 'Show Sidebar', 'panel-left');
  // The center group sorts before the leading one in the outline.
  await group('Center', 'Project Layout');
  await command(0, 'List Layout', 'list');
  await select(page, /^ToolbarButton/, 0);
  await page.keyboard.press('ControlOrMeta+d');
  await setText(page, 'ariaLabel', 'Grid Layout');
  await select(page, /^LucideIcon/, 1);
  await pickIcon(page, page.locator('[data-editor-icon-place]'), 'layout-grid');
  await select(page, /^ToolbarButton/, 0);
  await choose(page, 'pressed', 'On');
  // The other layout is a toggle that is off, not a plain action (KF-K9VBB4).
  await select(page, /^ToolbarButton/, 1);
  await choose(page, 'pressed', 'Off');
  // The library's two project rows.
  await select(page, /^NavStack/);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'view1Content slot — drop here',
    }),
  );
  await dragComponent(page, 'ListItem', () =>
    canvas(page).locator('[data-editor-empty]', { hasText: 'List is empty' }),
  );
  await select(page, /^ListItem/);
  await setText(page, 'action', 'open-configured-nav-stack-project');
  await addIcon(page, 'icon', 'folder');
  await select(page, /^ListItem/);
  await page.locator('[data-editor-content-add="trailing"]').click();
  await addChild(page, 'LucideIcon');
  await area(page, 'Properties');
  await pickIcon(
    page,
    page.locator('[data-editor-icon-place]'),
    'chevron-right',
  );
  await select(page, /^ListItem/);
  await page.keyboard.press('ControlOrMeta+d');
  const projects = [
    ['atlas', 'Project Atlas'],
    ['relay', 'Project Relay'],
  ] as const;
  for (const [index, [id, label]] of projects.entries()) {
    await select(page, /^ListItem/, index);
    await setText(page, 'itemId', id);
    await setText(page, 'label', label);
  }
  await select(page, /^NavStack/);
  const stack = canvas(page).locator('.kui-nav-stack[data-kerf-node]');
  await expect(stack.locator('.kui-list-item')).toHaveCount(2);
  await expect(stack.locator('.kui-toolbar-control-group button')).toHaveCount(
    3,
  );
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-nav-stack-configured-1440.png'),
  });
  const button = (
    ariaLabel: string,
    glyph: string,
    props: Record<string, unknown> = {},
  ) =>
    node(
      'toolbar-control-group#ToolbarButton',
      { ariaLabel, action: 'nav-stack-demo-command', ...props },
      { icon: [icon(glyph)] },
    );
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'nav-stack',
          {
            id: 'catalog-nav-stack-configured',
            label: 'Configured Project Library',
            toolbarConfig: { headingLevel: 2, dividerSides: 'b' },
            views: [{ key: 'library', toolbar: { title: 'Library' } }],
          },
          {
            'views.0.toolbar.leading': [
              node(
                'toolbar-control-group',
                { label: 'Sidebar', appearance: 'borderless', single: true },
                { children: [button('Show Sidebar', 'panel-left')] },
              ),
            ],
            'views.0.toolbar.center': [
              node(
                'toolbar-control-group',
                { label: 'Project Layout' },
                {
                  children: [
                    button('List Layout', 'list', { pressed: true }),
                    button('Grid Layout', 'layout-grid', { pressed: false }),
                  ],
                },
              ),
            ],
            'views.0.content': [
              node('list', undefined, {
                children: projects.map(([id, label]) =>
                  node(
                    'list-item',
                    {
                      action: 'open-configured-nav-stack-project',
                      itemId: id,
                      label,
                    },
                    {
                      icon: [icon('folder')],
                      trailing: [icon('chevron-right')],
                    },
                  ),
                ),
              }),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds NavStack › Overlay Chrome', async ({ page }) => {
  // Eighteen inbox rows built one by one outrun a slow test's budget in
  // WebKit on CI.
  test.setTimeout(240_000);
  await dragComponent(page, 'NavStack', () => emptySpot(page));
  await select(page, /^NavStack/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^NavStack/);
  await setText(page, 'id', 'catalog-nav-stack-overlay');
  await setText(page, 'label', 'Overlay Inbox');
  await setText(page, 'backLabel', 'Back to Inbox');
  await choose(page, 'chromePresentation', 'overlay');
  await choose(page, 'bottomToolbarPresentation', 'overlay');
  const dialog = page.locator('dialog[open]');
  const stack = page.locator('#editor-inspector-stack');
  // The stack's own bottom toolbar, laid over its views.
  await page.getByRole('button', { name: 'Configure bottom toolbar' }).click();
  await setField(page, 'bottomToolbar', ['label'], 'Inbox Actions');
  await stack.getByRole('button', { name: 'Back' }).click();
  const bottomZone = async (zone: string, component: string) => {
    await select(page, /^NavStack/);
    await page
      .getByRole('button', { name: 'Configure bottom toolbar' })
      .click();
    await stack.getByText(zone, { exact: true }).click();
    // The new node is selected.
    await addChild(page, component);
    await area(page, 'Properties');
  };
  const command = async (nth: number, ariaLabel: string, glyph: string) => {
    await select(page, /^ToolbarButton/, nth);
    await setText(page, 'ariaLabel', ariaLabel);
    await setText(page, 'children', '');
    await setText(page, 'action', 'nav-stack-demo-command');
    await addIcon(page, 'icon', glyph);
  };
  await bottomZone('Leading', 'ToolbarControlGroup');
  await setText(page, 'label', 'Filter');
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  await command(0, 'Filter Messages', 'funnel');
  await bottomZone('Center', 'ToolbarText');
  await setText(page, 'text', 'Updated Just Now');
  await choose(page, 'size', 'small');
  await bottomZone('Trailing', 'ToolbarControlGroup');
  await setText(page, 'label', 'Compose');
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  await command(1, 'New Message', 'square-pen');
  // One inbox view.
  await select(page, /^NavStack/);
  await page.getByRole('button', { name: 'Configure views' }).click();
  await dialog.getByRole('button', { name: 'Remove View 3' }).click();
  await dialog.getByRole('button', { name: 'Remove View 2' }).click();
  await dialog.locator('[data-action="editor-open-field"]').first().click();
  await setField(page, 'views', [0, 'key'], 'inbox');
  await dialog.getByText('Toolbar', { exact: true }).click();
  await setField(page, 'views', [0, 'toolbar', 'title'], 'Inbox');
  await dialog.getByRole('button', { name: 'Back' }).click();
  await dialog.getByRole('button', { name: 'Done' }).click();
  // The inbox: four kinds of message, repeated.
  await select(page, /^NavStack/);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'view1Content slot — drop here',
    }),
  );
  await dragComponent(page, 'ListItem', () =>
    canvas(page).locator('[data-editor-empty]', { hasText: 'List is empty' }),
  );
  await inbox(page, 'open-overlay-nav-stack-message');
  await select(page, /^NavStack/);
  const navStack = canvas(page).locator('.kui-nav-stack[data-kerf-node]');
  await expect(navStack.locator('.kui-list-item')).toHaveCount(18);
  await expect(navStack).toContainText('Updated Just Now');
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-nav-stack-overlay-1440.png'),
  });
  const button = (ariaLabel: string, glyph: string) =>
    node(
      'toolbar-control-group#ToolbarButton',
      { ariaLabel, action: 'nav-stack-demo-command' },
      { icon: [icon(glyph)] },
    );
  const group = (label: string, child: unknown) =>
    node(
      'toolbar-control-group',
      { label, appearance: 'borderless', single: true },
      { children: [child] },
    );
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'nav-stack',
          {
            id: 'catalog-nav-stack-overlay',
            label: 'Overlay Inbox',
            backLabel: 'Back to Inbox',
            chromePresentation: 'overlay',
            bottomToolbarPresentation: 'overlay',
            bottomToolbar: { label: 'Inbox Actions' },
            views: [{ key: 'inbox', toolbar: { title: 'Inbox' } }],
          },
          {
            'bottomToolbar.leading': [
              group('Filter', button('Filter Messages', 'funnel')),
            ],
            'bottomToolbar.center': [
              node('toolbar-text', { text: 'Updated Just Now', size: 'small' }),
            ],
            'bottomToolbar.trailing': [
              group('Compose', button('New Message', 'square-pen')),
            ],
            'views.0.content': [inboxNodes('open-overlay-nav-stack-message')],
          },
        ),
      ),
    ),
  );
});

test('builds NavStack › Compact Chrome', async ({ page }) => {
  // Eighteen inbox rows built one by one outrun a slow test's budget in
  // WebKit on CI.
  test.setTimeout(240_000);
  await dragComponent(page, 'NavStack', () => emptySpot(page));
  await select(page, /^NavStack/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^NavStack/);
  await setText(page, 'id', 'catalog-nav-stack-compact-chrome');
  await setText(page, 'label', 'Compact Chrome Messages');
  await setText(page, 'backLabel', 'Back to Messages');
  const dialog = page.locator('dialog[open]');
  const back = () => dialog.getByRole('button', { name: 'Back' }).click();
  const configure = async (...rows: string[]) => {
    await select(page, /^NavStack/);
    await page.getByRole('button', { name: 'Configure views' }).click();
    await dialog.locator('[data-action="editor-open-field"]').first().click();
    for (const row of rows)
      await dialog.getByText(row, { exact: true }).click();
  };
  // One view, the message list, whose Pane declares its compact chrome: the
  // filter header lies over the list until opened, the status footer
  // scrolls with it.
  await page.getByRole('button', { name: 'Configure views' }).click();
  await dialog.getByRole('button', { name: 'Remove View 3' }).click();
  await dialog.getByRole('button', { name: 'Remove View 2' }).click();
  await dialog.locator('[data-action="editor-open-field"]').first().click();
  await setField(page, 'views', [0, 'key'], 'compact');
  await dialog.getByText('Toolbar', { exact: true }).click();
  await setField(page, 'views', [0, 'toolbar', 'title'], 'Messages');
  await back();
  for (const list of ['headerList', 'footerList'] as const) {
    await dialog
      .getByText(list === 'headerList' ? 'Header list' : 'Footer list', {
        exact: true,
      })
      .click();
    await chooseField(page, 'views', [0, list, 'textInsets'], 'trbl');
    await back();
  }
  await dialog.getByText('Pane', { exact: true }).click();
  await dialog.getByText('Compact chrome', { exact: true }).click();
  await chooseField(
    page,
    'views',
    [0, 'pane', 'compactChrome', 'header'],
    'overlay',
  );
  await chooseField(
    page,
    'views',
    [0, 'pane', 'compactChrome', 'footer'],
    'scroll',
  );
  await back();
  // The filters start closed: the demo passes `header: false`.
  await dialog.getByText('Compact chrome open', { exact: true }).click();
  await turnFieldOn(page, 'views', [0, 'pane', 'compactChromeOpen', 'header']);
  await turnFieldOn(page, 'views', [0, 'pane', 'compactChromeOpen', 'header']);
  await dialog.getByRole('button', { name: 'Done' }).click();
  // The toolbar's Filter toggle, off while the filters are closed.
  await configure('Toolbar', 'Trailing');
  await addChild(page, 'ToolbarControlGroup');
  await area(page, 'Properties');
  await setText(page, 'label', 'Filter');
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  await select(page, /^ToolbarButton/);
  await setText(page, 'ariaLabel', 'Show Filters');
  await setText(page, 'children', '');
  await setText(page, 'action', 'toggle-compact-chrome-demo');
  await addIcon(page, 'icon', 'funnel');
  // Off, not unset: a toggle whose filters are closed (KF-K9VBB4).
  await select(page, /^ToolbarButton/);
  await choose(page, 'pressed', 'Off');
  // The header and footer lines.
  const line = async (row: string, text: string) => {
    await configure(row);
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await setText(page, 'children', text);
    await choose(page, 'size', 'compact');
    await choose(page, 'tone', 'quiet');
    await turnOn(page, 'flush');
  };
  await line('Header', 'Showing unread messages from this week');
  await line('Footer', '18 messages, updated just now');
  // The messages.
  await select(page, /^NavStack/);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'view1Content slot — drop here',
    }),
  );
  await dragComponent(page, 'ListItem', () =>
    canvas(page).locator('[data-editor-empty]', { hasText: 'List is empty' }),
  );
  await inbox(page, 'open-compact-chrome-message');
  await select(page, /^NavStack/);
  const navStack = canvas(page).locator('.kui-nav-stack[data-kerf-node]');
  await expect(navStack.locator('.kui-list-item')).toHaveCount(18);
  await expect(navStack).toContainText('18 messages, updated just now');
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-nav-stack-compact-1440.png'),
  });
  const text = (children: string) =>
    node('text', { children, size: 'compact', tone: 'quiet', flush: true });
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'nav-stack',
          {
            id: 'catalog-nav-stack-compact-chrome',
            label: 'Compact Chrome Messages',
            backLabel: 'Back to Messages',
            views: [
              {
                key: 'compact',
                toolbar: { title: 'Messages' },
                headerList: { textInsets: 'trbl' },
                footerList: { textInsets: 'trbl' },
                pane: {
                  compactChrome: { header: 'overlay', footer: 'scroll' },
                  compactChromeOpen: { header: false },
                },
              },
            ],
          },
          {
            'views.0.toolbar.trailing': [
              node(
                'toolbar-control-group',
                { label: 'Filter', appearance: 'borderless', single: true },
                {
                  children: [
                    node(
                      'toolbar-control-group#ToolbarButton',
                      {
                        ariaLabel: 'Show Filters',
                        action: 'toggle-compact-chrome-demo',
                        pressed: false,
                      },
                      { icon: [icon('funnel')] },
                    ),
                  ],
                },
              ),
            ],
            'views.0.header': [text('Showing unread messages from this week')],
            'views.0.footer': [text('18 messages, updated just now')],
            'views.0.content': [inboxNodes('open-compact-chrome-message')],
          },
        ),
      ),
    ),
  );
});

/** The inbox's four kinds of message, as the NavStack demo's INBOX has them. */
const INBOX_KINDS = [
  ['Design Review', 'calendar', 'brand'],
  ['Backup Complete', 'shield-check', 'success'],
  ['Storage Almost Full', 'bell', 'warning'],
  ['Weekly Summary', 'mail', 'neutral'],
] as const;

/**
 * Fills the empty List just dropped into a NavStack view with the NavStack
 * demo's 18-row inbox: four kinds of message with icon tiles, repeated, each
 * row running `action`.
 */
async function inbox(page: Page, action: string) {
  await select(page, /^ListItem/);
  await setText(page, 'action', action);
  await addIcon(page, 'icon', 'calendar');
  for (const [index, [label, glyph, tone]] of INBOX_KINDS.entries()) {
    if (index > 0) {
      await select(page, /^ListItem/, index - 1);
      await page.keyboard.press('ControlOrMeta+d');
      // The icon a copy brings is the kind before's; pick its own. The
      // copy's icon is the outline row right after it.
      await area(page, 'Outline');
      const rows = page.locator('[data-action="editor-select-node"]');
      const texts = await rows.allTextContents();
      let seen = -1;
      const at = texts.findIndex(
        (text) => /^ListItem/.test(text) && ++seen === index,
      );
      await rows.nth(at + 1).click();
      await area(page, 'Properties');
      await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
    }
    await select(page, /^ListItem/, index);
    await setText(page, 'label', label);
    await choose(page, 'iconTile', tone);
  }
  // The rest repeat the four kinds in order: copy one, paste after the last.
  for (let index = INBOX_KINDS.length; index < 18; index += 1) {
    await select(page, /^ListItem/, index - INBOX_KINDS.length);
    await page.keyboard.press('ControlOrMeta+c');
    await select(page, /^ListItem/, index - 1);
    await page.keyboard.press('ControlOrMeta+v');
  }
  for (let index = 0; index < 18; index += 1) {
    await select(page, /^ListItem/, index);
    await setText(page, 'itemId', `overlay-inbox-${index + 1}`);
  }
}

/** The inbox `inbox()` builds, as the exported document spells it. */
const inboxNodes = (action: string) =>
  node('list', undefined, {
    children: Array.from({ length: 18 }, (_, index) => {
      const [label, glyph, tone] = INBOX_KINDS[index % 4]!;
      return node(
        'list-item',
        { action, label, iconTile: tone, itemId: `overlay-inbox-${index + 1}` },
        { icon: [icon(glyph)] },
      );
    }),
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
  await setText(page, 'children', '');
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
  await page.locator('[data-action="editor-add-data-attribute"]').click();
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
  const maxWidth = page
    .locator('[data-editor-prop="maxWidth"]')
    .getByRole('textbox');
  await maxWidth.fill('px(120)');
  await maxWidth.press('Enter');
  await page.locator('[data-action="editor-add-data-attribute"]').click();
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

// KF-BGKYYH: one card of the feed (the demo repeats it for each story),
// with its effects built in the effects list editor, one switched by Kind.
test('builds ScrollEffect › Reveal and Fade in a Feed', async ({ page }) => {
  const title = 'Harbor Survey';
  const detail = 'Tide tables and mooring notes for the north basin.';
  await dragComponent(page, 'ScrollEffect', () => emptySpot(page));
  await select(page, /^ScrollEffect/);
  await addChild(page, 'ContentItem');
  await addChild(page, 'List');
  await addChild(page, 'Text');
  await demoTexts(page, { list: 0, text: 0 }, title, detail);
  await select(page, /^ScrollEffect/);
  const dialog = page.locator('dialog[open]');
  const item = (index: number) =>
    dialog.locator('[data-action="editor-open-field"]').nth(index).click();
  const back = () => dialog.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Configure effects' }).click();
  // Remove the seeded parallax (one, KF-T3PYVC), then add a reveal twice and
  // a fade.
  const remove = dialog.getByRole('button', { name: /^Remove / });
  await expect(remove).toHaveCount(1);
  await remove.click();
  for (const preset of ['Reveal', 'Reveal', 'Fade']) {
    await dialog.getByRole('button', { name: /Add/ }).last().click();
    await page.getByRole('menuitem', { name: preset, exact: true }).click();
  }
  await item(0);
  await chooseField(page, 'effects', [0, 'range'], 'entry');
  await setField(page, 'effects', [0, 'rangeEnd'], '50');
  await back();
  // The second becomes a scale: its range carries over, and `from` appears.
  await item(1);
  await chooseField(page, 'effects', [1, 'range'], 'entry');
  await setField(page, 'effects', [1, 'rangeEnd'], '50');
  await chooseField(page, 'effects', [1], 'Scale');
  await setField(page, 'effects', [1, 'from'], '0.94');
  await back();
  await item(2);
  await chooseField(page, 'effects', [2, 'range'], 'exit');
  await back();
  await expect(dialog.locator('[data-action="editor-open-field"]')).toHaveText([
    /Reveal/,
    /Scale/,
    /Fade/,
  ]);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(canvas(page).locator('[data-kerf-node] strong')).toHaveText(
    title,
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'scroll-effect',
        {
          effects: [
            { kind: 'reveal', range: 'entry', rangeEnd: 50 },
            { kind: 'scale', range: 'entry', rangeEnd: 50, from: 0.94 },
            { kind: 'fade', range: 'exit' },
          ],
        },
        { children: [demoContentItem(title, detail)] },
      ),
    ),
  );
});

// KF-RMEME0: the root Pane fills its parent (`fill`), so its footer rests at
// the bottom edge and its content scrolls between the pinned header and footer.
// A new document's root Pane starts with `fill` on (KF-Z70DBC).
test('builds Pane › Fill', async ({ page }) => {
  await select(page, /^Pane/);
  await expect(
    page.locator('[data-editor-prop="fill"]').getByRole('switch'),
  ).toBeChecked();
  await choose(page, 'element', 'section');
  await setText(page, 'label', 'Notes');
  const toolbar = async (zone: string, label: string) => {
    await select(page, /^Pane/);
    await addChild(page, 'Toolbar', zone);
    await area(page, 'Properties');
    await setText(page, 'label', label);
    await dragComponent(page, 'ToolbarText', () => zoneSpot(page, 'Leading'));
  };
  await toolbar('header', 'Notes Header');
  await toolbar('footer', 'Notes Footer');
  await select(page, /^ToolbarText/);
  await setText(page, 'text', 'Notes');
  await choose(page, 'size', 'xlarge');
  await select(page, /^ToolbarText/, 1);
  await setText(page, 'text', '3 notes');
  await choose(page, 'size', 'small');
  const notes = [
    'Groceries for the weekend',
    'Call about the lease renewal',
    'Book the ferry for Saturday',
  ];
  await select(page, /^Pane/);
  await addChild(page, 'ContentItem', 'content');
  await area(page, 'Properties');
  await setText(page, 'children', notes[0]!);
  for (const [index, note] of notes.entries()) {
    if (index === 0) continue;
    await select(page, /^ContentItem/, index - 1);
    await page.keyboard.press('ControlOrMeta+d');
    await setText(page, 'children', note);
  }
  const root = canvas(page).locator('.kui-pane[data-kerf-node]').first();
  await expect(root).toHaveAttribute('data-fill', 'true');
  await expect(root.locator('.kui-content-item')).toHaveText(notes);
  const leading = (text: string, size: string) => [
    node('toolbar-text', { text, size }),
  ];
  expect(await exported(page)).toEqual(
    node(
      'pane',
      { fill: true, element: 'section', label: 'Notes' },
      {
        header: [
          node(
            'toolbar',
            { label: 'Notes Header' },
            { leading: leading('Notes', 'xlarge') },
          ),
        ],
        content: notes.map((children) => node('content-item', { children })),
        footer: [
          node(
            'toolbar',
            { label: 'Notes Footer' },
            { leading: leading('3 notes', 'small') },
          ),
        ],
      },
    ),
  );
});

// The other Workbench configurations wait on KF-EZN7H2: a panel's nested
// Configure rows (its toolbar, toggle, pane) do not open yet.
test('builds Workbench › Full Desktop Workspace', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await dragComponent(page, 'Workbench', () => emptySpot(page));
  await select(page, /^Workbench/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^Workbench/);
  await setText(page, 'id', 'catalog-workbench-full');
  await setText(page, 'label', 'Project Workbench');
  await setText(page, 'mainLabel', 'Editor');
  await choose(page, 'mainTabIndex', '0');
  await turnOn(page, 'mainOutlined');
  // The work area holds one node, so its seeded Text becomes the title of a
  // DemoContentItem by embedding it in a List, then the List in a ContentItem.
  await select(page, /^Text/);
  await embedInOther(page, 'List');
  await embedInOther(page, 'ContentItem');
  // Each panel is a static panel whose content slot takes a DemoContentItem.
  await panel(page, 'leftRail', 'Navigator');
  await panel(page, 'rightRail', 'Inspector', () =>
    chooseField(page, 'rightRail', ['tabIndex'], '0'),
  );
  await panel(page, 'bottomDrawer', 'Console');
  // The outline lists the panels' content before the work area's.
  const regions = [
    ['Navigator', 'Files and symbols'],
    ['Inspector', 'Selection details'],
    ['Console', 'Build output and diagnostics'],
    ['Editor', 'The central work area expands into free space.'],
  ] as const;
  for (const [index, [title, detail]] of regions.entries())
    await demoTexts(page, { list: index, text: index * 2 }, title, detail);
  await select(page, /^Workbench/);
  const workbench = canvas(page).locator('.kui-workbench[data-kerf-node]');
  await expect(workbench.locator('strong')).toHaveText([
    'Navigator',
    'Editor',
    'Console',
    'Inspector',
  ]);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-workbench-full-1440.png'),
  });
  const [navigator, inspector, drawer, editor] = regions.map(
    ([title, detail]) => demoContentItem(title, detail),
  );
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'workbench',
          {
            id: 'catalog-workbench-full',
            label: 'Project Workbench',
            mainLabel: 'Editor',
            mainTabIndex: 0,
            mainOutlined: true,
            leftRail: { label: 'Navigator' },
            rightRail: { label: 'Inspector', tabIndex: 0 },
            bottomDrawer: { label: 'Console' },
          },
          {
            main: [editor],
            'leftRail.content': [navigator],
            'rightRail.content': [inspector],
            'bottomDrawer.content': [drawer],
          },
        ),
      ),
    ),
  );
});

/**
 * Makes Workbench panel `prop` a static panel named `label`, sets its other
 * fields with `fields` while its form is open, and drops a DemoContentItem's
 * ContentItem, List, and Text into its content slot on the canvas.
 */
async function panel(
  page: Page,
  prop: string,
  label: string,
  fields?: () => Promise<void>,
) {
  await select(page, /^Workbench/);
  await choose(page, prop, 'Static panel…');
  await configure(page, prop);
  await setField(page, prop, ['label'], label);
  await fields?.();
  await back(page);
  await dragComponent(page, 'ContentItem', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: `${prop}Content slot — drop here`,
    }),
  );
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'Text', () => emptySpot(page));
}

/** Opens a Workbench prop's form from its row (`Configure left rail`). */
async function configure(page: Page, prop: string) {
  const words = prop.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
  await page.getByRole('button', { name: `Configure ${words}` }).click();
}

/** Opens the form of the object at `path` inside prop `prop`'s form. */
const openField = (
  page: Page,
  prop: string,
  path: readonly (string | number)[],
) =>
  page
    .locator(`[data-editor-open='${JSON.stringify({ prop, path })}']`)
    // A row of a form the stack has left stays in the page, hidden.
    .filter({ visible: true })
    .first()
    .click();

/** Leaves the Inspector's open form for the one it was opened from. */
const back = (page: Page) =>
  page
    .locator('#editor-inspector-stack')
    .getByRole('button', { name: 'Back', exact: true })
    .click();

/** Leaves every open form for the selected node's Properties. */
async function backOut(page: Page) {
  const button = page
    .locator('#editor-inspector-stack')
    .getByRole('button', { name: 'Back', exact: true });
  while (await button.isVisible()) await button.click();
}

/**
 * Adds a ToolbarText reading `text` to content field `zone` of the open
 * form (`mainToolbar.title`), from its row's add button, at `size` if given.
 */
async function toolbarText(
  page: Page,
  zone: string,
  text: string,
  size?: string,
) {
  await page.locator(`[data-editor-content-add="${zone}"]`).click();
  await addChild(page, 'ToolbarText');
  await area(page, 'Properties');
  await setText(page, 'text', text);
  if (size) await choose(page, 'size', size);
}

/** A ToolbarText node as the exported document spells it. */
const toolbarTextNode = (text: string, size?: string) =>
  node('toolbar-text', { text, ...(size ? { size } : {}) });

/**
 * Starts a Workbench build: the Workbench in a SizedRegion, with `id` and
 * `label`, its seeded work-area Text embedded as a DemoContentItem's title,
 * and an xlarge title on a main toolbar labeled the same.
 */
async function workbench(
  page: Page,
  id: string,
  label: string,
  mainTitle: string,
) {
  await dragComponent(page, 'Workbench', () => emptySpot(page));
  await select(page, /^Workbench/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^Workbench/);
  await setText(page, 'id', id);
  await setText(page, 'label', label);
  await select(page, /^Text/);
  await embedInOther(page, 'List');
  await embedInOther(page, 'ContentItem');
  await select(page, /^Workbench/);
  await configure(page, 'mainToolbar');
  await setField(page, 'mainToolbar', ['label'], mainTitle);
  await toolbarText(page, 'mainToolbar.title', mainTitle, 'xlarge');
}

test('builds Workbench › Responsive Overlay Drawer', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await workbench(
    page,
    'catalog-workbench-responsive-drawer',
    'Responsive Drawer Workbench',
    'Editor',
  );
  await select(page, /^Workbench/);
  await turnOn(page, 'overlayBackdrop');
  await configure(page, 'mainBottomToolbar');
  await setField(page, 'mainBottomToolbar', ['label'], 'Editor Status');
  await toolbarText(page, 'mainBottomToolbar.leading', 'Ready', 'small');
  // The output drawer: 180px, an overlay at narrow widths, with a titled
  // toolbar whose toggle hides it.
  await panel(page, 'bottomDrawer', 'Output', async () => {
    await setField(page, 'bottomDrawer', ['size'], '180');
    await chooseField(page, 'bottomDrawer', ['responsiveOverlayAt'], 'narrow');
    await openField(page, 'bottomDrawer', ['toolbar']);
    await setField(page, 'bottomDrawer', ['toolbar', 'label'], 'Output');
    await openField(page, 'bottomDrawer', ['toolbar', 'toggle']);
    await setField(
      page,
      'bottomDrawer',
      ['toolbar', 'toggle', 'action'],
      'toggle-workbench-output',
    );
    await setField(
      page,
      'bottomDrawer',
      ['toolbar', 'toggle', 'name'],
      'Output',
    );
    await back(page);
    await back(page);
  });
  const regions = [
    ['Build Output', 'Inline above 704 px; an overlay below it'],
    [
      'Narrow the Workbench',
      'At 704 px or narrower the output drawer overlays the bottom of the editor instead of taking its own track.',
    ],
  ] as const;
  for (const [index, [title, detail]] of regions.entries())
    await demoTexts(page, { list: index, text: index * 2 }, title, detail);
  // The drawer's toolbar title, from its form.
  await select(page, /^Workbench/);
  await configure(page, 'bottomDrawer');
  await openField(page, 'bottomDrawer', ['toolbar']);
  await toolbarText(page, 'bottomDrawer.toolbar.title', 'Output');
  await select(page, /^Workbench/);
  const shell = canvas(page).locator('.kui-workbench[data-kerf-node]');
  await expect(shell.locator('strong')).toHaveText([
    'Narrow the Workbench',
    'Build Output',
  ]);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-workbench-drawer-1440.png'),
  });
  const [drawer, editor] = regions.map(([title, detail]) =>
    demoContentItem(title, detail),
  );
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'workbench',
          {
            id: 'catalog-workbench-responsive-drawer',
            label: 'Responsive Drawer Workbench',
            mainToolbar: { label: 'Editor' },
            overlayBackdrop: true,
            mainBottomToolbar: { label: 'Editor Status' },
            bottomDrawer: {
              label: 'Output',
              size: 180,
              responsiveOverlayAt: 'narrow',
              toolbar: {
                label: 'Output',
                toggle: { action: 'toggle-workbench-output', name: 'Output' },
              },
            },
          },
          {
            main: [editor],
            'mainToolbar.title': [toolbarTextNode('Editor', 'xlarge')],
            'mainBottomToolbar.leading': [toolbarTextNode('Ready', 'small')],
            'bottomDrawer.content': [drawer],
            'bottomDrawer.toolbar.title': [toolbarTextNode('Output')],
          },
        ),
      ),
    ),
  );
});

/**
 * Opens the forms down to panel `prop`'s content field `zone`
 * (`toolbar.leading`) and adds the Workbench demo's `iconGroup` to it: a
 * borderless single ToolbarControlGroup named `label` holding one icon ToolbarButton (the outline's `nth`) that runs
 * the demo command `glyph`, kept beside the toggle on collapse when
 * `relocate`.
 */
async function iconGroup(
  page: Page,
  prop: string,
  zone: string,
  [label, glyph, nth]: readonly [string, string, number],
  relocate = false,
) {
  await select(page, /^Workbench/);
  await configure(page, prop);
  const steps = zone
    .split('.')
    .map((step) => (/^\d+$/.test(step) ? Number(step) : step));
  for (let depth = 1; depth < steps.length; depth += 1)
    await openField(page, prop, steps.slice(0, depth));
  await page.locator(`[data-editor-content-add="${prop}.${zone}"]`).click();
  await addChild(page, 'ToolbarControlGroup');
  await area(page, 'Properties');
  await setText(page, 'label', label);
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  if (relocate) await turnOn(page, 'relocateOnCollapse');
  await select(page, /^ToolbarButton/, nth);
  await setText(page, 'ariaLabel', label);
  await setText(page, 'children', '');
  await setText(page, 'action', 'workbench-demo-command');
  await dataAttribute(page, 'data-demo-command', glyph);
  await addIcon(page, 'icon', glyph);
}

/** An `iconGroup` as the exported document spells it. */
const iconGroupNode = (label: string, glyph: string, relocate = false) =>
  node(
    'toolbar-control-group',
    {
      label,
      appearance: 'borderless',
      single: true,
      ...(relocate ? { relocateOnCollapse: true } : {}),
    },
    {
      children: [
        node(
          'toolbar-control-group#ToolbarButton',
          {
            ariaLabel: label,
            action: 'workbench-demo-command',
            rootAttributes: { 'data-demo-command': glyph },
          },
          { icon: [icon(glyph)] },
        ),
      ],
    },
  );

/** Sets panel `prop`'s toolbar label and its toggle's action and name. */
async function panelToolbar(
  page: Page,
  prop: string,
  label: string,
  action: string,
) {
  await openField(page, prop, ['toolbar']);
  await setField(page, prop, ['toolbar', 'label'], label);
  await openField(page, prop, ['toolbar', 'toggle']);
  await setField(page, prop, ['toolbar', 'toggle', 'action'], action);
  await setField(page, prop, ['toolbar', 'toggle', 'name'], label);
  await back(page);
  await back(page);
}

test('builds Workbench › Controlled Collapsed Panels', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await workbench(
    page,
    'catalog-workbench-collapsed',
    'Focused Editor Workbench',
    'Editor',
  );
  await panel(page, 'leftRail', 'Navigator', () =>
    panelToolbar(
      page,
      'leftRail',
      'Navigator',
      'toggle-workbench-collapsed-navigator',
    ),
  );
  await panel(page, 'rightRail', 'Inspector');
  // The console: 120px, with no separator, fading as it slides, and its
  // content free to overflow.
  await panel(page, 'bottomDrawer', 'Console', async () => {
    await setField(page, 'bottomDrawer', ['size'], '120');
    await chooseField(page, 'bottomDrawer', ['separator'], 'hidden');
    await chooseField(page, 'bottomDrawer', ['collapseMotion'], 'fade-slide');
    await chooseField(page, 'bottomDrawer', ['contentOverflow'], 'visible');
    await panelToolbar(
      page,
      'bottomDrawer',
      'Console',
      'toggle-workbench-console',
    );
  });
  const regions = [
    ['Navigator', 'Still mounted'],
    ['Inspector', 'Visible peripheral panel'],
    ['Console', 'Still mounted'],
    [
      'App-Owned Collapsed Flags',
      'A closed panel lends its always-available groups and its toggle to the editor toolbars.',
    ],
  ] as const;
  for (const [index, [title, detail]] of regions.entries())
    await demoTexts(page, { list: index, text: index * 2 }, title, detail);
  await select(page, /^Workbench/);
  await configure(page, 'bottomDrawer');
  await openField(page, 'bottomDrawer', ['toolbar']);
  await toolbarText(page, 'bottomDrawer.toolbar.title', 'Console');
  // The navigator's always-available groups: New File stays in the closed
  // panel, Search Files moves to the editor toolbar.
  await iconGroup(page, 'leftRail', 'toolbar.leading', [
    'New File',
    'file-plus',
    0,
  ]);
  await iconGroup(
    page,
    'leftRail',
    'toolbar.trailing',
    ['Search Files', 'search', 1],
    true,
  );
  // Both start closed, as the app's flags say.
  for (const prop of ['leftRail', 'bottomDrawer']) {
    await select(page, /^Workbench/);
    await configure(page, prop);
    await turnFieldOn(page, prop, ['collapsed']);
    await back(page);
  }
  await select(page, /^Workbench/);
  const shell = canvas(page).locator('.kui-workbench[data-kerf-node]');
  // The closed panels stay mounted; Search Files and the navigator's
  // toggle lead the editor toolbar.
  await expect(shell.locator('strong')).toHaveText([
    'Navigator',
    'App-Owned Collapsed Flags',
    'Console',
    'Inspector',
  ]);
  await expect(
    shell.getByRole('button', { name: 'Search Files' }),
  ).toBeVisible();
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-workbench-collapsed-1440.png'),
  });
  const [navigator, inspector, drawer, editor] = regions.map(
    ([title, detail]) => demoContentItem(title, detail),
  );
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'workbench',
          {
            id: 'catalog-workbench-collapsed',
            label: 'Focused Editor Workbench',
            mainToolbar: { label: 'Editor' },
            leftRail: {
              label: 'Navigator',
              collapsed: true,
              toolbar: {
                label: 'Navigator',
                toggle: {
                  action: 'toggle-workbench-collapsed-navigator',
                  name: 'Navigator',
                },
              },
            },
            rightRail: { label: 'Inspector' },
            bottomDrawer: {
              label: 'Console',
              collapsed: true,
              size: 120,
              separator: 'hidden',
              collapseMotion: 'fade-slide',
              contentOverflow: 'visible',
              toolbar: {
                label: 'Console',
                toggle: { action: 'toggle-workbench-console', name: 'Console' },
              },
            },
          },
          {
            main: [editor],
            'mainToolbar.title': [toolbarTextNode('Editor', 'xlarge')],
            'leftRail.content': [navigator],
            'leftRail.toolbar.leading': [
              iconGroupNode('New File', 'file-plus'),
            ],
            'leftRail.toolbar.trailing': [
              iconGroupNode('Search Files', 'search', true),
            ],
            'rightRail.content': [inspector],
            'bottomDrawer.content': [drawer],
            'bottomDrawer.toolbar.title': [toolbarTextNode('Console')],
          },
        ),
      ),
    ),
  );
});

/** Makes panel `prop` resizable between `min` and `max` px from `size`. */
async function resizablePanel(
  page: Page,
  prop: string,
  size: number,
  [min, max]: readonly [number, number],
) {
  await setField(page, prop, ['size'], String(size));
  await chooseField(page, prop, ['resizable'], 'Custom…');
  await openField(page, prop, ['resizable']);
  await setField(page, prop, ['resizable', 'min'], String(min));
  await setField(page, prop, ['resizable', 'max'], String(max));
  await back(page);
}

/** Adds data attribute `name` reading `value` to the selected node. */
async function dataAttribute(page: Page, name: string, value: string) {
  await page.locator('[data-action="editor-add-data-attribute"]').click();
  const part = (which: string) =>
    page
      .locator(
        `[data-editor-attribute="0"][data-editor-attribute-part="${which}"]`,
      )
      .locator('input');
  await part('name').fill(name);
  await part('name').press('Enter');
  await part('value').fill(value);
  await part('value').press('Enter');
}

test('builds Workbench › Resizable Panels', async ({ page }) => {
  // Thirteen inspector rows, each named in the Inspector, outrun a slow
  // test's budget in Firefox.
  test.setTimeout(240_000);
  await workbench(
    page,
    'catalog-workbench-resizable',
    'Resizable Workbench',
    'Editor',
  );
  await select(page, /^Workbench/);
  await turnOn(page, 'overlayBackdrop');
  // The work area: the resize instructions above an interactive item that
  // shows what an open overlay rail covers.
  await select(page, /^ContentItem/);
  await embedInOther(page, 'List');
  await choose(page, 'gap', 'l');
  await addChild(page, 'ContentItem', 'children');
  await area(page, 'Properties');
  await turnOn(page, 'interactive');
  await setText(page, 'action', 'workbench-demo-command');
  await setText(page, 'itemId', 'underlay');
  await setText(page, 'ariaLabel', 'Select Underlying Item');
  await setText(page, 'children', 'Select Underlying Item');
  await dataAttribute(page, 'data-demo-underlay', '');
  // The navigator: 240px, resizable from 180 to 400.
  await panel(page, 'leftRail', 'Navigator', async () => {
    await resizablePanel(page, 'leftRail', 240, [180, 400]);
    await panelToolbar(
      page,
      'leftRail',
      'Navigator',
      'toggle-workbench-navigator',
    );
  });
  // The inspector: 160px, resizable from 160 to 360, with a ticket header,
  // an updated footer, and a bottom toolbar's search.
  await panel(page, 'rightRail', 'Inspector', async () => {
    await resizablePanel(page, 'rightRail', 160, [160, 360]);
    await panelToolbar(
      page,
      'rightRail',
      'Inspector',
      'toggle-workbench-inspector',
    );
    await openField(page, 'rightRail', ['headerList']);
    await chooseField(page, 'rightRail', ['headerList', 'gap'], '2xs');
    await chooseField(page, 'rightRail', ['headerList', 'textInsets'], 'trbl');
    await back(page);
    await openField(page, 'rightRail', ['footerList']);
    await chooseField(page, 'rightRail', ['footerList', 'textInsets'], 'trbl');
    await back(page);
    await openField(page, 'rightRail', ['bottomToolbar']);
    await setField(
      page,
      'rightRail',
      ['bottomToolbar', 'label'],
      'Inspector Actions',
    );
    await back(page);
  });
  await select(page, /^ContentItem/, 1);
  await embedInOther(page, 'List');
  await choose(page, 'gap', 'l');
  // The console: 160px, resizable from 120 to 320, scrolling its content,
  // which ends in a menu that opens upward.
  await panel(page, 'bottomDrawer', 'Console', async () => {
    await resizablePanel(page, 'bottomDrawer', 160, [120, 320]);
    await chooseField(page, 'bottomDrawer', ['contentOverflow'], 'auto');
  });
  await select(page, /^ContentItem/, 2);
  await embedInOther(page, 'List');
  await choose(page, 'gap', 'l');
  await addChild(page, 'PopupMenu', 'children');
  await area(page, 'Properties');
  await setText(page, 'text', 'Create Item');
  await choose(page, 'placement', 'top-start');
  await page.getByRole('button', { name: 'Configure items' }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name: 'Remove Item 3' }).click();
  const items = [
    ['New Terminal', 'create-terminal'],
    ['New Task', 'create-task'],
  ] as const;
  for (const [index, [label, action]] of items.entries()) {
    await dialog.getByText(`Item ${index + 1}`, { exact: true }).click();
    await setField(page, 'items', [index, 'label'], label);
    await setField(page, 'items', [index, 'action'], action);
    await dialog.getByRole('button', { name: 'Back' }).click();
  }
  await dialog.getByRole('button', { name: 'Done' }).click();
  // Each region's DemoContentItem; a panel's list holds its rows above the
  // DemoContentItem's own List.
  const regions = [
    ['Files and Symbols', '180–400 px wide'],
    ['Selection', '160–360 px wide'],
    ['Console', '120–320 px tall'],
    [
      'Resize the Panels',
      'Drag a separator, or focus it and use the arrow keys, Home, or End. The editor keeps at least 320 px, so a rail stops growing there; a hidden panel returns at its last size.',
    ],
  ] as const;
  const lists = [0, 2, 4, 6];
  for (const [index, [title, detail]] of regions.entries())
    await demoTexts(
      page,
      { list: lists[index]!, text: index * 2 },
      title,
      detail,
    );
  // The inspector's twelve fields: the Selection row duplicated, then
  // each copy named in turn.
  const fields = 12;
  await select(page, /^ContentItem/, 1);
  for (let copy = 0; copy < fields; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  await expect(outlineRow(page, /^ContentItem/)).toHaveCount(fields + 5);
  for (let field = 1; field <= fields; field += 1) {
    await select(page, /^Text/, 2 + field * 2);
    await setText(page, 'children', `Field ${field}`);
    await select(page, /^Text/, 3 + field * 2);
    await setText(page, 'children', 'Scrollable inspector detail');
  }
  // The inspector's header, footer, and bottom toolbar content.
  await select(page, /^Workbench/);
  await configure(page, 'rightRail');
  await toolbarText(page, 'rightRail.header', 'Ticket #42');
  await choose(page, 'headingLevel', '3');
  await page.keyboard.press('ControlOrMeta+d');
  await setText(page, 'text', 'Open for review');
  await choose(page, 'headingLevel', 'Not set');
  await choose(page, 'size', 'small');
  await select(page, /^Workbench/);
  await configure(page, 'rightRail');
  await toolbarText(page, 'rightRail.footer', 'Updated just now', 'small');
  await iconGroup(page, 'rightRail', 'bottomToolbar.trailing', [
    'Search Inspector',
    'search',
    0,
  ]);
  // The toolbars' titles.
  for (const [prop, title] of [
    ['leftRail', 'Navigator'],
    ['rightRail', 'Inspector'],
  ] as const) {
    await select(page, /^Workbench/);
    await configure(page, prop);
    await openField(page, prop, ['toolbar']);
    await toolbarText(page, `${prop}.toolbar.title`, title);
  }
  // The inspector starts hidden, as the app's flag says.
  await select(page, /^Workbench/);
  await configure(page, 'rightRail');
  await turnFieldOn(page, 'rightRail', ['collapsed']);
  await back(page);
  await select(page, /^Workbench/);
  const shell = canvas(page).locator('.kui-workbench[data-kerf-node]');
  await expect(shell.locator('strong')).toHaveCount(fields + 4);
  await expect(
    shell.getByRole('button', { name: 'Select Underlying Item' }),
  ).toBeVisible();
  await expect(
    shell.getByRole('button', { name: 'Create Item' }),
  ).toBeVisible();
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-workbench-resizable-1440.png'),
  });
  const [navigator, selection, output, editor] = regions.map(
    ([title, detail]) => demoContentItem(title, detail),
  );
  const list = (...children: unknown[]) =>
    node('list', { gap: 'l' }, { children });
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'workbench',
          {
            id: 'catalog-workbench-resizable',
            label: 'Resizable Workbench',
            mainToolbar: { label: 'Editor' },
            overlayBackdrop: true,
            leftRail: {
              label: 'Navigator',
              size: 240,
              resizable: { min: 180, max: 400 },
              toolbar: {
                label: 'Navigator',
                toggle: {
                  action: 'toggle-workbench-navigator',
                  name: 'Navigator',
                },
              },
            },
            rightRail: {
              label: 'Inspector',
              size: 160,
              resizable: { min: 160, max: 360 },
              collapsed: true,
              toolbar: {
                label: 'Inspector',
                toggle: {
                  action: 'toggle-workbench-inspector',
                  name: 'Inspector',
                },
              },
              headerList: { gap: '2xs', textInsets: 'trbl' },
              footerList: { textInsets: 'trbl' },
              bottomToolbar: { label: 'Inspector Actions' },
            },
            bottomDrawer: {
              label: 'Console',
              size: 160,
              resizable: { min: 120, max: 320 },
              contentOverflow: 'auto',
            },
          },
          {
            main: [
              list(
                editor,
                node('content-item', {
                  interactive: true,
                  action: 'workbench-demo-command',
                  itemId: 'underlay',
                  ariaLabel: 'Select Underlying Item',
                  children: 'Select Underlying Item',
                  rootAttributes: { 'data-demo-underlay': '' },
                }),
              ),
            ],
            'mainToolbar.title': [toolbarTextNode('Editor', 'xlarge')],
            'leftRail.content': [navigator],
            'leftRail.toolbar.title': [toolbarTextNode('Navigator')],
            'rightRail.content': [
              list(
                selection,
                ...Array.from({ length: fields }, (_, index) =>
                  demoContentItem(
                    `Field ${index + 1}`,
                    'Scrollable inspector detail',
                  ),
                ),
              ),
            ],
            'rightRail.toolbar.title': [toolbarTextNode('Inspector')],
            'rightRail.header': [
              node('toolbar-text', { text: 'Ticket #42', headingLevel: 3 }),
              toolbarTextNode('Open for review', 'small'),
            ],
            'rightRail.footer': [toolbarTextNode('Updated just now', 'small')],
            'rightRail.bottomToolbar.trailing': [
              iconGroupNode('Search Inspector', 'search'),
            ],
            'bottomDrawer.content': [
              list(
                output,
                node('popup-menu', {
                  text: 'Create Item',
                  placement: 'top-start',
                  items: items.map(([label, action]) => ({ label, action })),
                }),
              ),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds Workbench › Navigating Ticket Rail', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.setTimeout(180_000);
  await workbench(
    page,
    'catalog-workbench-navigation',
    'Ticket Workbench',
    'Workspace',
  );
  await demoTexts(
    page,
    { list: 0, text: 0 },
    'Workspace',
    'Open a ticket in the right rail.',
  );
  // The right rail: a 360px navigation panel whose toolbar keeps only the
  // rail toggle, over a NavStack starting at the ticket collection.
  await select(page, /^Workbench/);
  await choose(page, 'rightRail', 'Navigation panel…');
  await configure(page, 'rightRail');
  await setField(page, 'rightRail', ['label'], 'Tickets');
  await setField(page, 'rightRail', ['size'], '360');
  await openField(page, 'rightRail', ['toolbar']);
  await setField(
    page,
    'rightRail',
    ['toolbar', 'label'],
    'Ticket Rail Toolbar',
  );
  await openField(page, 'rightRail', ['toolbar', 'toggle']);
  await setField(
    page,
    'rightRail',
    ['toolbar', 'toggle', 'action'],
    'toggle-workbench-ticket-rail',
  );
  await setField(page, 'rightRail', ['toolbar', 'toggle', 'name'], 'Tickets');
  await back(page);
  await back(page);
  const view = ['navStack', 'views', 0] as const;
  await openField(page, 'rightRail', ['navStack']);
  await setField(
    page,
    'rightRail',
    ['navStack', 'id'],
    'catalog-workbench-ticket-stack',
  );
  await setField(page, 'rightRail', ['navStack', 'label'], 'Ticket Navigation');
  // The detail views are pushed while the app runs; the stack starts with
  // the collection alone.
  await openField(page, 'rightRail', ['navStack', 'views']);
  await page.getByRole('button', { name: 'Remove View 3' }).click();
  await page.getByRole('button', { name: 'Remove View 2' }).click();
  await openField(page, 'rightRail', view);
  await setField(page, 'rightRail', [...view, 'key'], 'collection');
  await openField(page, 'rightRail', [...view, 'toolbar']);
  await setField(page, 'rightRail', [...view, 'toolbar', 'title'], 'Tickets');
  await backOut(page);
  // The collection's three tickets: one interactive ContentItem with a
  // DemoContentItem-style List, duplicated, then each renamed.
  await select(page, /^Workbench/);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'view1Content slot — drop here',
    }),
  );
  await select(page, /^List(?!Item)/);
  await choose(page, 'gap', 'l');
  await addChild(page, 'ContentItem', 'children');
  await area(page, 'Properties');
  await turnOn(page, 'interactive');
  await setText(page, 'action', 'open-workbench-ticket');
  await addChild(page, 'List', 'children');
  await addChild(page, 'Text', 'children');
  // The rail's Lists come before the work area's in the outline.
  await demoTexts(
    page,
    { list: 1, text: 0 },
    'T-42',
    'Review the workspace rail',
  );
  const tickets = ['T-42', 'T-43', 'T-44'];
  await select(page, /^ContentItem/);
  await page.keyboard.press('ControlOrMeta+d');
  await page.keyboard.press('ControlOrMeta+d');
  for (const [index, id] of tickets.entries()) {
    await select(page, /^ContentItem/, index);
    await setText(page, 'itemId', id);
    await setText(page, 'ariaLabel', `Open Ticket ${id}`);
    await select(page, /^Text/, index * 2);
    await setText(page, 'children', id);
  }
  // The collection's header: a level-3 title over a quiet count.
  await select(page, /^Workbench/);
  await configure(page, 'rightRail');
  await openField(page, 'rightRail', ['navStack']);
  await openField(page, 'rightRail', ['navStack', 'views']);
  await openField(page, 'rightRail', view);
  await page
    .locator('[data-editor-content-add="rightRail.navStack.views.0.header"]')
    .click();
  await addChild(page, 'List');
  await area(page, 'Properties');
  await choose(page, 'gap', '2xs');
  await choose(page, 'textInsets', 'rl');
  await addChild(page, 'ToolbarText', 'children');
  await area(page, 'Properties');
  await setText(page, 'text', 'Ticket Queue');
  await choose(page, 'headingLevel', '3');
  // The header's List, by the zone its outline row names.
  await select(page, /^List.*header$/);
  await addChild(page, 'Text', 'children');
  await area(page, 'Properties');
  await setText(page, 'children', 'Three open tickets');
  await choose(page, 'tone', 'quiet');
  await choose(page, 'size', 'compact');
  await iconGroup(page, 'rightRail', 'navStack.views.0.toolbar.leading', [
    'Choose Project',
    'search',
    0,
  ]);
  await select(page, /^Workbench/);
  const shell = canvas(page).locator('.kui-workbench[data-kerf-node]');
  await expect(shell.getByRole('button', { name: /^Open Ticket/ })).toHaveCount(
    3,
  );
  await expect(shell.locator('strong')).toHaveText(['Workspace', ...tickets]);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-workbench-navigation-1440.png'),
  });
  const ticket = (id: string) => {
    const item = demoContentItem(id, 'Review the workspace rail');
    return {
      ...item,
      props: {
        interactive: true,
        action: 'open-workbench-ticket',
        itemId: id,
        ariaLabel: `Open Ticket ${id}`,
      },
    };
  };
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'workbench',
          {
            id: 'catalog-workbench-navigation',
            label: 'Ticket Workbench',
            mainToolbar: { label: 'Workspace' },
            rightRail: {
              label: 'Tickets',
              size: 360,
              toolbar: {
                label: 'Ticket Rail Toolbar',
                toggle: {
                  action: 'toggle-workbench-ticket-rail',
                  name: 'Tickets',
                },
              },
              navStack: {
                id: 'catalog-workbench-ticket-stack',
                label: 'Ticket Navigation',
                views: [{ key: 'collection', toolbar: { title: 'Tickets' } }],
              },
            },
          },
          {
            main: [
              demoContentItem('Workspace', 'Open a ticket in the right rail.'),
            ],
            'mainToolbar.title': [toolbarTextNode('Workspace', 'xlarge')],
            'rightRail.navStack.views.0.content': [
              node('list', { gap: 'l' }, { children: tickets.map(ticket) }),
            ],
            'rightRail.navStack.views.0.header': [
              node(
                'list',
                { gap: '2xs', textInsets: 'rl' },
                {
                  children: [
                    node('toolbar-text', {
                      text: 'Ticket Queue',
                      headingLevel: 3,
                    }),
                    node('text', {
                      children: 'Three open tickets',
                      tone: 'quiet',
                      size: 'compact',
                    }),
                  ],
                },
              ),
            ],
            'rightRail.navStack.views.0.toolbar.leading': [
              iconGroupNode('Choose Project', 'search'),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds SplitView › Roomy List-Detail Split', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await dragComponent(page, 'SplitView', () => emptySpot(page));
  await select(page, /^SplitView/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^SplitView/);
  await setText(page, 'id', 'catalog-split-view-roomy');
  await setText(page, 'label', 'Messages');
  await setText(page, 'listTitle', 'Threads');
  await setText(page, 'detailTitle', 'Project update');
  // A 240px list column, capped at 40% of the split.
  await choose(page, 'listWidth', 'Custom…');
  await page.getByRole('button', { name: 'Configure list width' }).click();
  await setField(page, 'listWidth', ['size'], '240');
  await setField(page, 'listWidth', ['maxFraction'], '0.4');
  await page
    .locator('#editor-inspector-stack')
    .getByRole('button', { name: 'Back' })
    .click();
  // The list pane's seeded Text becomes the list: embedded in a List, which
  // takes the counted header and the message rows, and then deleted.
  await select(page, /^Text/);
  await embedInOther(page, 'List');
  await addChild(page, 'ListHeader', 'children');
  await area(page, 'Properties');
  await setText(page, 'label', 'Inbox');
  await setText(page, 'count', String(MESSAGES.length));
  await setText(page, 'countLabel', `${MESSAGES.length} messages`);
  await messageRows(page, 'select-roomy-split-view-message');
  await select(page, /^Text/);
  await page.locator('[data-action="editor-delete"]').click();
  // The detail pane's seeded Text becomes a DemoContentItem's eyebrow.
  await messageDetail(page);
  const [first] = MESSAGES;
  await select(page, /^SplitView/);
  const split = canvas(page).locator('.kui-split-view[data-kerf-node]');
  await expect(split.locator('.kui-list-item')).toHaveCount(3);
  await expect(split.locator('strong')).toHaveText(first.subject);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-split-view-roomy-1440.png'),
  });
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'split-view',
          {
            id: 'catalog-split-view-roomy',
            label: 'Messages',
            listTitle: 'Threads',
            detailTitle: first.subject,
            listWidth: { size: 240, maxFraction: 0.4 },
          },
          {
            list: [
              node('list', undefined, {
                children: [
                  node('list-header', {
                    label: 'Inbox',
                    count: MESSAGES.length,
                    countLabel: `${MESSAGES.length} messages`,
                  }),
                  ...messageItems('select-roomy-split-view-message'),
                ],
              }),
            ],
            detail: [messageDetailNode()],
          },
        ),
      ),
    ),
  );
});

test('builds SplitView › Interactive Compact Drill-Down', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await dragComponent(page, 'SplitView', () => emptySpot(page));
  await select(page, /^SplitView/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^SplitView/);
  await setText(page, 'id', 'catalog-split-view-compact');
  await setText(page, 'label', 'Compact Messages');
  await turnOn(page, 'compact');
  await setText(page, 'listTitle', 'Inbox');
  await setText(page, 'backLabel', 'Back to Inbox');
  // compactStack: a level-2 title with a bottom divider.
  await configure(page, 'compactStack');
  await openField(page, 'compactStack', ['toolbarConfig']);
  await chooseField(
    page,
    'compactStack',
    ['toolbarConfig', 'headingLevel'],
    '2',
  );
  await chooseField(
    page,
    'compactStack',
    ['toolbarConfig', 'dividerSides'],
    'b',
  );
  await backOut(page);
  /** Adds the demo's `iconGroup` to compactStack content field `zone`. */
  const group = async (zone: string, label: string, glyph: string) => {
    await select(page, /^SplitView/);
    await configure(page, 'compactStack');
    const steps = zone.split('.');
    for (let depth = 1; depth < steps.length; depth += 1)
      await openField(page, 'compactStack', steps.slice(0, depth));
    await page
      .locator(`[data-editor-content-add="compactStack.${zone}"]`)
      .click();
    await addChild(page, 'ToolbarControlGroup');
    await area(page, 'Properties');
    await setText(page, 'label', label);
    await choose(page, 'appearance', 'borderless');
    await turnOn(page, 'single');
    // The new group, selected, holds one seeded ToolbarButton: the first
    // ToolbarButton row after the group's row in the outline.
    await area(page, 'Outline');
    await expect(
      page.locator('[data-action="editor-select-node"][aria-selected="true"]'),
    ).toHaveText(/^ToolbarControlGroup/);
    const nth = await page
      .locator('[data-action="editor-select-node"]')
      .evaluateAll((rows) => {
        const at = rows.findIndex(
          (row) => row.getAttribute('aria-selected') === 'true',
        );
        return rows
          .slice(0, at)
          .filter((row) => /^ToolbarButton/.test(row.textContent!.trim()))
          .length;
      });
    await select(page, /^ToolbarButton/, nth);
    await setText(page, 'ariaLabel', label);
    await setText(page, 'children', '');
    await setText(page, 'action', 'split-view-demo-command');
    await addIcon(page, 'icon', glyph);
  };
  await group('list.toolbar.trailing', 'Compose', 'square-pen');
  await group('detail.toolbar.trailing', 'Reply', 'reply');
  await group('detail.bottomToolbar.trailing', 'Archive', 'archive');
  // The detail's bottom toolbar: its label and a small status line.
  await select(page, /^SplitView/);
  await configure(page, 'compactStack');
  await openField(page, 'compactStack', ['detail']);
  await openField(page, 'compactStack', ['detail', 'bottomToolbar']);
  await setField(
    page,
    'compactStack',
    ['detail', 'bottomToolbar', 'label'],
    'Message Actions',
  );
  await toolbarText(
    page,
    'compactStack.detail.bottomToolbar.leading',
    'Received today',
    'small',
  );
  // The list pane's seeded Text becomes the message list; the detail's
  // seeded Text is deleted, so no message is open (KF-YCM09F).
  await select(page, /^Text/);
  await embedInOther(page, 'List');
  await addChild(page, 'ListHeader', 'children');
  await area(page, 'Properties');
  await setText(page, 'label', 'Inbox');
  await setText(page, 'count', String(MESSAGES.length));
  await setText(page, 'countLabel', `${MESSAGES.length} messages`);
  await messageRows(page, 'open-split-view-message', false);
  await select(page, /^Text/);
  await page.locator('[data-action="editor-delete"]').click();
  await select(page, /^Text/);
  await page.locator('[data-action="editor-delete"]').click();
  await select(page, /^SplitView/);
  const split = canvas(page).locator('.kui-split-view[data-kerf-node]');
  await expect(split.locator('.kui-list-item')).toHaveCount(3);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-split-view-compact-1440.png'),
  });
  const groupNode = (label: string, glyph: string) =>
    node(
      'toolbar-control-group',
      { label, appearance: 'borderless', single: true },
      {
        children: [
          node(
            'toolbar-control-group#ToolbarButton',
            { ariaLabel: label, action: 'split-view-demo-command' },
            { icon: [icon(glyph)] },
          ),
        ],
      },
    );
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'split-view',
          {
            id: 'catalog-split-view-compact',
            label: 'Compact Messages',
            compact: true,
            listTitle: 'Inbox',
            backLabel: 'Back to Inbox',
            compactStack: {
              toolbarConfig: { headingLevel: 2, dividerSides: 'b' },
              detail: { bottomToolbar: { label: 'Message Actions' } },
            },
          },
          {
            'compactStack.list.toolbar.trailing': [
              groupNode('Compose', 'square-pen'),
            ],
            'compactStack.detail.toolbar.trailing': [
              groupNode('Reply', 'reply'),
            ],
            'compactStack.detail.bottomToolbar.leading': [
              toolbarTextNode('Received today', 'small'),
            ],
            'compactStack.detail.bottomToolbar.trailing': [
              groupNode('Archive', 'archive'),
            ],
            list: [
              node('list', undefined, {
                children: [
                  node('list-header', {
                    label: 'Inbox',
                    count: MESSAGES.length,
                    countLabel: `${MESSAGES.length} messages`,
                  }),
                  ...messageItems('open-split-view-message', false),
                ],
              }),
            ],
            detail: [],
          },
        ),
      ),
    ),
  );
});

test('builds SplitView › Resizable, Collapsible List', async ({ page }) => {
  // A whole screen built step by step runs long in Firefox.
  test.slow();
  await dragComponent(page, 'SplitView', () => emptySpot(page));
  await select(page, /^SplitView/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^SplitView/);
  await setText(page, 'id', 'catalog-split-view-resizable');
  await setText(page, 'label', 'Resizable Messages');
  await setText(page, 'listTitle', 'Threads');
  await setText(page, 'detailTitle', 'Project update');
  // The list's ResizableRegion: 280px between 220 and 420, a hidden
  // separator, and a fade-slide collapse restored from the bottom corner.
  const dialog = page.locator('dialog[open]');
  await page.getByRole('button', { name: 'Configure resizable' }).click();
  await setField(page, 'resizable', ['size'], '280');
  await setField(page, 'resizable', ['min'], '220');
  await setField(page, 'resizable', ['max'], '420');
  await chooseField(page, 'resizable', ['separator'], 'hidden');
  await chooseField(page, 'resizable', ['collapseMotion'], 'fade-slide');
  await chooseField(page, 'resizable', ['restorePosition'], 'bottom-start');
  await dialog.getByRole('button', { name: 'Done' }).click();
  /** The seeded ToolbarButton `nth` as an icon command. */
  const command = async (nth: number, ariaLabel: string, glyph: string) => {
    await select(page, /^ToolbarButton/, nth);
    await setText(page, 'ariaLabel', ariaLabel);
    await setText(page, 'children', '');
    await setText(page, 'action', 'toggle-split-view-list');
    await addIcon(page, 'icon', glyph);
  };
  // The list pane: a Pane whose header toolbar names the threads and hides
  // them, over the message rows.
  await select(page, /^Text/);
  await embedInOther(page, 'List');
  await embedInOther(page, 'Pane');
  await addChild(page, 'Toolbar', 'header');
  await area(page, 'Properties');
  await setText(page, 'label', 'Threads');
  // Even in this narrow column each empty zone is its own drop target
  // (KF-K3EKKF).
  await dragComponent(page, 'ToolbarText', () => zoneSpot(page, 'Leading'));
  await select(page, /^ToolbarText/);
  await setText(page, 'text', 'Threads');
  await select(page, /^Toolbar(?!Text|Button|ControlGroup)/);
  await addChild(page, 'ToolbarControlGroup', 'trailing');
  await area(page, 'Properties');
  await setText(page, 'label', 'Hide Threads');
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  await command(0, 'Hide Threads', 'panel-left-close');
  await messageRows(page, 'select-roomy-split-view-message');
  await select(page, /^Text/);
  await page.locator('[data-action="editor-delete"]').click();
  await messageDetail(page);
  // The restore control: a FloatingToolbar docked in the corner, holding
  // the button that shows the threads again.
  await select(page, /^SplitView/);
  await page.getByRole('button', { name: 'Configure resizable' }).click();
  await dialog.getByRole('button', { name: 'Add to restore control' }).click();
  await addChild(page, 'FloatingToolbar');
  await area(page, 'Properties');
  await setText(page, 'label', 'Threads');
  await choose(page, 'position', 'bottom-start');
  await addChild(page, 'ToolbarControlGroup');
  await area(page, 'Properties');
  await setText(page, 'label', 'Threads');
  await turnOn(page, 'single');
  // The outline lists the restore control before the list pane.
  await command(0, 'Show Threads', 'panel-left-open');
  // The FloatingToolbar arrived holding a placeholder Text.
  await select(page, /^Text/);
  await expect(page.locator('[data-editor-prop="children"] input')).toHaveValue(
    'FloatingToolbar',
  );
  await page.locator('[data-action="editor-delete"]').click();
  await select(page, /^SplitView/);
  const [first] = MESSAGES;
  const split = canvas(page).locator('.kui-split-view[data-kerf-node]');
  await expect(split.locator('.kui-list-item')).toHaveCount(3);
  await expect(split.locator('strong')).toHaveText(first.subject);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-split-view-resizable-1440.png'),
  });
  const button = (ariaLabel: string, glyph: string) =>
    node(
      'toolbar-control-group#ToolbarButton',
      { ariaLabel, action: 'toggle-split-view-list' },
      { icon: [icon(glyph)] },
    );
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'split-view',
          {
            id: 'catalog-split-view-resizable',
            label: 'Resizable Messages',
            listTitle: 'Threads',
            detailTitle: first.subject,
            resizable: {
              size: 280,
              min: 220,
              max: 420,
              separator: 'hidden',
              collapseMotion: 'fade-slide',
              restorePosition: 'bottom-start',
            },
          },
          {
            list: [
              node('pane', undefined, {
                header: [
                  node(
                    'toolbar',
                    { label: 'Threads' },
                    {
                      leading: [node('toolbar-text', { text: 'Threads' })],
                      trailing: [
                        node(
                          'toolbar-control-group',
                          {
                            label: 'Hide Threads',
                            appearance: 'borderless',
                            single: true,
                          },
                          {
                            children: [
                              button('Hide Threads', 'panel-left-close'),
                            ],
                          },
                        ),
                      ],
                    },
                  ),
                ],
                content: [
                  node('list', undefined, {
                    children: messageItems('select-roomy-split-view-message'),
                  }),
                ],
              }),
            ],
            detail: [messageDetailNode()],
            'resizable.restoreControl': [
              node(
                'floating-toolbar',
                { label: 'Threads', position: 'bottom-start' },
                {
                  children: [
                    node(
                      'toolbar-control-group',
                      { label: 'Threads', single: true },
                      {
                        children: [button('Show Threads', 'panel-left-open')],
                      },
                    ),
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

test('builds TabNavigator › Translucent Tab Bar', async ({ page }) => {
  // Forty-eight rows, each named in the Inspector, outrun even a slow
  // test's budget in Firefox.
  test.setTimeout(240_000);
  await dragComponent(page, 'TabNavigator', () => emptySpot(page));
  await select(page, /^TabNavigator/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^TabNavigator/);
  await setText(page, 'id', 'catalog-tab-scaffold-overlay');
  await setText(page, 'label', 'Mail Sections');
  await choose(page, 'barPresentation', 'overlay');
  const dialog = page.locator('dialog[open]');
  const item = (index: number) =>
    dialog.locator('[data-action="editor-open-field"]').nth(index).click();
  const sections = [
    ['inbox', 'Inbox', 'Message', 'inbox'],
    ['sent', 'Sent', 'Sent message', 'send'],
  ] as const;
  await page.getByRole('button', { name: 'Configure tabs' }).click();
  await dialog.getByRole('button', { name: 'Remove Tab 3' }).click();
  for (const [index, [id, label, , glyph]] of sections.entries()) {
    await item(index);
    await setField(page, 'tabs', [index, 'id'], id);
    await setField(page, 'tabs', [index, 'label'], label);
    // The tab's Icon row adds a LucideIcon and selects it.
    await dialog.getByText('Icon', { exact: true }).click();
    await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
    await select(page, /^TabNavigator/);
    await page.getByRole('button', { name: 'Configure tabs' }).click();
  }
  await dialog.getByRole('button', { name: 'Done' }).click();
  await setText(page, 'active', 'inbox');
  const rows = 24;
  /**
   * Fills the List just added to section `index`'s tab with its rows: one
   * ListItem described once, duplicated, then each named in turn.
   */
  const messages = async (index: number) => {
    const [prefix, , name] = sections[index]!;
    await addChild(page, 'ListItem');
    await area(page, 'Properties');
    await setText(page, 'action', 'log-tab-scaffold-message');
    await setText(
      page,
      'description',
      'Scrolls visibly beneath the translucent tab bar.',
    );
    // Duplicate from the outline, where the shortcut acts on the node.
    await select(page, /^ListItem/, index * rows);
    for (let copy = 1; copy < rows; copy += 1)
      await page.keyboard.press('ControlOrMeta+d');
    await expect(outlineRow(page, /^ListItem/)).toHaveCount((index + 1) * rows);
    for (let row = 0; row < rows; row += 1) {
      await select(page, /^ListItem/, index * rows + row);
      await setText(page, 'itemId', `${prefix}-${row + 1}`);
      await setText(page, 'label', `${name} ${row + 1}`);
    }
  };
  // The active tab's content is a drop target on the canvas; the inactive
  // tab's takes children from Children › Add a child.
  await select(page, /^TabNavigator/);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'tab1Content slot — drop here',
    }),
  );
  await select(page, /^List(?!Item)/);
  await messages(0);
  await select(page, /^TabNavigator/);
  await addChild(page, 'List', 'tabs › 2 › content');
  await messages(1);
  await select(page, /^TabNavigator/);
  const navigator = canvas(page).locator('.kui-tab-scaffold[data-kerf-node]');
  await expect(navigator.getByRole('tab')).toHaveText(['Inbox', 'Sent']);
  await expect(
    navigator.locator('.kui-list-item[data-kerf-node]').first(),
  ).toContainText('Message 1');
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jn4pf5-tab-navigator-overlay-1440.png'),
  });
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'tab-navigator',
          {
            id: 'catalog-tab-scaffold-overlay',
            label: 'Mail Sections',
            barPresentation: 'overlay',
            tabs: sections.map(([id, label]) => ({ id, label })),
            active: 'inbox',
          },
          Object.fromEntries(
            sections.flatMap(([prefix, , name, glyph], index) => [
              [`tabs.${index}.icon`, [icon(glyph)]],
              [
                `tabs.${index}.content`,
                [
                  node('list', undefined, {
                    children: Array.from({ length: rows }, (_, row) =>
                      node('list-item', {
                        action: 'log-tab-scaffold-message',
                        itemId: `${prefix}-${row + 1}`,
                        label: `${name} ${row + 1}`,
                        description:
                          'Scrolls visibly beneath the translucent tab bar.',
                      }),
                    ),
                  }),
                ],
              ],
            ]),
          ),
        ),
      ),
    ),
  );
});

/** The split-view demo's messages (`ui/ux-demo/demos/split-view.tsx`). */
const MESSAGES = [
  {
    id: 'project-update',
    subject: 'Project update',
    sender: 'Mina Chen',
    preview: 'The interaction pass is ready for review.',
    body: 'The interaction pass is ready. Please review the navigation and responsive states before Thursday.',
  },
  {
    id: 'design-review',
    subject: 'Design review',
    sender: 'Sam Rivera',
    preview: 'Notes from today’s component review.',
    body: 'Today’s review notes cover list density, detail hierarchy, and the remaining compact-layout checks.',
  },
  {
    id: 'launch-plan',
    subject: 'Launch plan',
    sender: 'Avery Singh',
    preview: 'Beta milestones and owner assignments.',
    body: 'The beta milestones now have owners. The final readiness check is scheduled for next week.',
  },
] as const;

/**
 * Adds the three message rows to the document's first List, the first one
 * selected, each opening `action` (the split-view demo's `messageList`).
 */
async function messageRows(page: Page, action: string, selected = true) {
  await select(page, /^List(?!Item|Header)/);
  await addChild(page, 'ListItem');
  await area(page, 'Properties');
  await setText(page, 'action', action);
  await turnOn(page, 'multiline');
  await addIcon(page, 'icon', 'message-square-text');
  // The demo names the glyph's icon "message".
  await setText(page, 'name', 'message');
  await select(page, /^ListItem/);
  await page.locator('[data-editor-content-add="trailing"]').click();
  await addChild(page, 'LucideIcon');
  await area(page, 'Properties');
  await pickIcon(
    page,
    page.locator('[data-editor-icon-place]'),
    'chevron-right',
  );
  await select(page, /^ListItem/);
  await page.keyboard.press('ControlOrMeta+d');
  await page.keyboard.press('ControlOrMeta+d');
  for (const [index, message] of MESSAGES.entries()) {
    await select(page, /^ListItem/, index);
    await setText(page, 'itemId', message.id);
    await setText(page, 'label', message.subject);
    await setText(
      page,
      'description',
      `${message.sender} · ${message.preview}`,
    );
  }
  if (!selected) return;
  // The first message is the one in view.
  await select(page, /^ListItem/);
  await turnOn(page, 'selected');
}

/** The rows `messageRows` builds, as the exported document spells them. */
const messageItems = (action: string, selected = true) =>
  MESSAGES.map((message, index) =>
    node(
      'list-item',
      {
        action,
        itemId: message.id,
        label: message.subject,
        description: `${message.sender} · ${message.preview}`,
        ...(selected && index === 0 ? { selected: true } : {}),
        multiline: true,
      },
      {
        icon: [icon('message-square-text', { name: 'message' })],
        trailing: [icon('chevron-right')],
      },
    ),
  );

/**
 * Turns the first Text, the detail pane's seeded one, into the first
 * message's detail: a DemoContentItem with an eyebrow, by embedding it in a
 * List and the List in a ContentItem.
 */
async function messageDetail(page: Page) {
  const [first] = MESSAGES;
  await select(page, /^Text/);
  await embedInOther(page, 'List');
  await choose(page, 'gap', '2xs');
  await embedInOther(page, 'ContentItem');
  await select(page, /^Text/);
  await setText(page, 'children', `From ${first.sender}`);
  await choose(page, 'variant', 'span');
  await choose(page, 'tone', 'quiet');
  await choose(page, 'size', 'compact');
  await page.keyboard.press('ControlOrMeta+d');
  await setText(page, 'children', first.subject);
  await choose(page, 'tone', 'Not set');
  await choose(page, 'size', 'Not set');
  await choose(page, 'weight', 'strong');
  await page.keyboard.press('ControlOrMeta+d');
  await setText(page, 'children', first.body);
  await choose(page, 'weight', 'Default (regular)');
  await choose(page, 'tone', 'quiet');
  await choose(page, 'size', 'compact');
}

/** The detail `messageDetail` builds, as the exported document spells it. */
function messageDetailNode() {
  const [first] = MESSAGES;
  const text = (children: string, props: Record<string, unknown>) =>
    node('text', { children, variant: 'span', ...props });
  return node('content-item', undefined, {
    children: [
      node(
        'list',
        { gap: '2xs' },
        {
          children: [
            text(`From ${first.sender}`, { tone: 'quiet', size: 'compact' }),
            text(first.subject, { weight: 'strong' }),
            text(first.body, { tone: 'quiet', size: 'compact' }),
          ],
        },
      ),
    ],
  });
}

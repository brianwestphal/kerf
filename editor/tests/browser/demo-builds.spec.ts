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
  emptySpot,
  exported,
  icon,
  newDocument,
  node,
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
  // A whole screen built step by step runs long in Firefox.
  test.slow();
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
  // A whole screen built step by step runs long in Firefox.
  test.slow();
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
  // Start from no effects, then add a reveal twice and a fade.
  const remove = dialog.getByRole('button', { name: /^Remove / });
  while ((await remove.count()) > 0) await remove.first().click();
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

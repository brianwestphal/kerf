// KF-JN4PF5: each ux-demo configuration, built in the editor the way a
// person would (palette drags, outline and canvas selection, Inspector
// fields), then exported and compared with what the demo renders. A
// configuration the editor cannot build yet has a ticket instead of a test.
import { expect, test } from '@playwright/test';

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
  setField,
  setText,
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

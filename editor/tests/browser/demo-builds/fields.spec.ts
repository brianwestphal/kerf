// KF-JN4PF5: each ux-demo configuration of the form fields and pickers, built in
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
  chooseField,
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
  showProp,
  turnFieldOn,
  turnOff,
  turnOn,
  unset,
  zoneSpot,
} from '../build.js';
import type { ChoiceSpec, SelectSpec } from './helpers.js';
import {
  addInto,
  applySpec,
  balanceChoices,
  channelChoices,
  choiceChips,
  choiceValues,
  choiceZones,
  chooseEmptyValue,
  chooseValues,
  closeButton,
  colorChoices,
  colorSwatches,
  composerSend,
  composerSendNode,
  configureChoices,
  configureSelect,
  css,
  dataAttribute,
  DIALOG,
  dialogSurface,
  dialogTrigger,
  dialogTriggerNode,
  editAsJson,
  iconOnlyGroup,
  iconOnlyGroupProps,
  labelChoices,
  labelFilter,
  labelFilterNode,
  nameParam,
  openConfigure,
  openField,
  PALETTE,
  readout,
  readoutNode,
  selectAlone,
  selectNode,
  setCss,
  setTags,
  stacked,
  swatch,
  textFieldList,
  textFields,
  toolbarChoices,
  toolbarGroup,
  toolbarGroupNode,
  toolbarIconSelect,
  toolbarIconSelectNode,
  toolbarSelect,
  xsList,
  zoneButtons,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
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
  await unset(page, 'label');
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

// KF-38KD5N: spellcheck's Off writes an explicit false.
test('builds TextField › Exact Entry', async ({ page }) => {
  const exact = { autocorrect: 'off', spellcheck: 'Off' };
  await textFields(page, [
    {
      choices: { autocapitalize: 'off', ...exact },
      text: {
        label: 'Confirmation Phrase',
        placeholder: 'Type the phrase exactly',
      },
    },
    {
      choices: { inputMode: 'numeric', ...exact },
      text: { label: 'Card Number' },
    },
    {
      choices: { autocapitalize: 'words', ...exact },
      flags: ['multiline'],
      text: { rows: '2', label: 'Place Names' },
    },
  ]);
  await expect(canvas(page).locator('[spellcheck="false"]')).toHaveCount(3);
  const spelling = { autocorrect: 'off', spellcheck: false };
  expect(await exported(page)).toEqual(
    textFieldList([
      {
        autocapitalize: 'off',
        ...spelling,
        label: 'Confirmation Phrase',
        placeholder: 'Type the phrase exactly',
      },
      { inputMode: 'numeric', ...spelling, label: 'Card Number' },
      {
        autocapitalize: 'words',
        ...spelling,
        multiline: true,
        rows: 2,
        label: 'Place Names',
      },
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

test('builds Checkbox › States', async ({ page }) => {
  await stacked(
    page,
    'List',
    'Checkbox',
    [
      {
        flags: ['checked'],
        text: { label: 'Include in release', action: 'checkbox-demo' },
      },
      {
        text: {
          label: 'Email summaries',
          hint: 'Sent every Monday morning.',
          action: 'checkbox-demo',
        },
      },
      { flags: ['checked', 'disabled'], text: { label: 'Locked setting' } },
      {
        flags: ['required'],
        text: {
          label: 'I accept the release terms',
          error: 'Accept the terms to publish.',
          action: 'checkbox-demo',
        },
      },
    ],
    () => choose(page, 'gap', 'xs'),
  );
  await expect(canvas(page).locator('input[type="checkbox"]')).toHaveCount(4);
  expect(await exported(page)).toEqual(
    xsList('checkbox', [
      { checked: true, label: 'Include in release', action: 'checkbox-demo' },
      {
        label: 'Email summaries',
        hint: 'Sent every Monday morning.',
        action: 'checkbox-demo',
      },
      { checked: true, disabled: true, label: 'Locked setting' },
      {
        required: true,
        label: 'I accept the release terms',
        error: 'Accept the terms to publish.',
        action: 'checkbox-demo',
      },
    ]),
  );
});

test('builds Checkbox › Compact', async ({ page }) => {
  await stacked(
    page,
    'List',
    'Checkbox',
    [
      {
        choices: { size: 'compact' },
        flags: ['checked'],
        text: { label: 'Show archived', action: 'checkbox-demo' },
      },
      {
        choices: { size: 'compact' },
        text: {
          label: 'Show drafts',
          hint: 'Only yours.',
          action: 'checkbox-demo',
        },
      },
    ],
    () => choose(page, 'gap', 'xs'),
  );
  expect(await exported(page)).toEqual(
    xsList('checkbox', [
      {
        size: 'compact',
        checked: true,
        label: 'Show archived',
        action: 'checkbox-demo',
      },
      {
        size: 'compact',
        label: 'Show drafts',
        hint: 'Only yours.',
        action: 'checkbox-demo',
      },
    ]),
  );
});

// Live demo state is a static snapshot of the demo's first render here, as
// in SegmentedControl › Pill: the snapshot is the document's initial state,
// and the demo's action handler is what changes it.
test('builds Checkbox › Mixed State', async ({ page }) => {
  // checkboxTasks starts as ['design']: All is mixed, Design is checked.
  await stacked(
    page,
    'List',
    'Checkbox',
    [
      {
        text: {
          label: 'All tasks',
          name: 'tasks-all',
          action: 'checkbox-demo',
        },
        flags: ['indeterminate'],
      },
      ...[
        ['design', 'Design review'],
        ['build', 'Build release'],
        ['ship', 'Ship to customers'],
      ].map(([value, label]) => ({
        text: {
          label: label!,
          name: 'tasks',
          value: value!,
          action: 'checkbox-demo',
        },
        ...(value === 'design' ? { flags: ['checked'] } : {}),
      })),
    ],
    () => choose(page, 'gap', 'xs'),
  );
  await expect(canvas(page).locator('.kui-checkbox')).toHaveCount(4);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('checkbox', {
              label: 'All tasks',
              name: 'tasks-all',
              indeterminate: true,
              action: 'checkbox-demo',
            }),
            node('checkbox', {
              label: 'Design review',
              name: 'tasks',
              value: 'design',
              checked: true,
              action: 'checkbox-demo',
            }),
            node('checkbox', {
              label: 'Build release',
              name: 'tasks',
              value: 'build',
              action: 'checkbox-demo',
            }),
            node('checkbox', {
              label: 'Ship to customers',
              name: 'tasks',
              value: 'ship',
              action: 'checkbox-demo',
            }),
          ],
        },
      ),
    ),
  );
});

test('builds Switch › Settings', async ({ page }) => {
  // switchLiveUpdates starts on, so its hint is the live one.
  await stacked(
    page,
    'List',
    'Switch',
    [
      {
        text: {
          label: 'Live updates',
          hint: 'The list refreshes as tickets change.',
          action: 'switch-demo',
        },
        flags: ['checked'],
      },
      { text: { label: 'Compact navigation', action: 'switch-demo' } },
      { text: { label: 'Managed setting' }, flags: ['checked', 'disabled'] },
    ],
    () => choose(page, 'gap', 'xs'),
  );
  await expect(canvas(page).locator('.kui-switch')).toHaveCount(3);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('switch', {
              label: 'Live updates',
              checked: true,
              hint: 'The list refreshes as tickets change.',
              action: 'switch-demo',
            }),
            node('switch', {
              label: 'Compact navigation',
              action: 'switch-demo',
            }),
            node('switch', {
              label: 'Managed setting',
              checked: true,
              disabled: true,
            }),
          ],
        },
      ),
    ),
  );
});

test('builds CheckboxGroup › Vertical', async ({ page }) => {
  await dragComponent(page, 'CheckboxGroup', () => emptySpot(page));
  await configureChoices(page, /^CheckboxGroup/, channelChoices);
  await select(page, /^CheckboxGroup/);
  // checkboxGroupChannels starts as ['email'].
  await applySpec(page, {
    text: {
      label: 'Notification Channels',
      name: 'notification-channels',
      hint: 'Sent to your work account.',
      action: 'checkbox-group-demo',
    },
  });
  await chooseValues(page, ['Email']);
  await expect(canvas(page).locator('input[type="checkbox"]')).toHaveCount(4);
  expect(await exported(page)).toEqual(
    pane(
      node('checkbox-group', {
        label: 'Notification Channels',
        name: 'notification-channels',
        value: ['email'],
        hint: 'Sent to your work account.',
        action: 'checkbox-group-demo',
        choices: choiceValues(channelChoices),
      }),
    ),
  );
});

test('builds CheckboxGroup › Horizontal and Compact', async ({ page }) => {
  const platforms: readonly ChoiceSpec[] = [
    { value: 'macos', label: 'macOS' },
    { value: 'windows', label: 'Windows' },
    { value: 'linux', label: 'Linux' },
  ];
  await dragComponent(page, 'CheckboxGroup', () => emptySpot(page));
  await configureChoices(page, /^CheckboxGroup/, platforms);
  await select(page, /^CheckboxGroup/);
  // checkboxGroupPlatforms starts empty, so the group shows its error.
  await applySpec(page, {
    choices: { size: 'compact', orientation: 'horizontal' },
    text: {
      label: 'Platforms',
      name: 'platforms',
      error: 'Choose a platform.',
      action: 'checkbox-group-demo',
    },
  });
  // Nothing checked: an unset value is the demo's empty list.
  await expect(
    page.locator('[data-editor-kind="value-choices"] input:checked'),
  ).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node('checkbox-group', {
        label: 'Platforms',
        name: 'platforms',
        size: 'compact',
        orientation: 'horizontal',
        error: 'Choose a platform.',
        action: 'checkbox-group-demo',
        choices: choiceValues(platforms),
      }),
    ),
  );
});

test('builds RadioGroup › Vertical', async ({ page }) => {
  const densities: readonly ChoiceSpec[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'roomy', label: 'Roomy', hint: 'Larger rows for touch screens.' },
    { value: 'custom', label: 'Custom', disabled: true },
  ];
  await dragComponent(page, 'RadioGroup', () => emptySpot(page));
  await configureChoices(page, /^RadioGroup/, densities);
  await select(page, /^RadioGroup/);
  // radioDensity starts as 'balanced'.
  await applySpec(page, {
    text: {
      label: 'Layout Density',
      name: 'layout-density',
      hint: 'Applies to every list.',
      action: 'radio-group-demo',
    },
  });
  await choose(page, 'value', 'Balanced');
  await expect(canvas(page).locator('input[type="radio"]')).toHaveCount(4);
  expect(await exported(page)).toEqual(
    pane(
      node('radio-group', {
        label: 'Layout Density',
        name: 'layout-density',
        value: 'balanced',
        hint: 'Applies to every list.',
        action: 'radio-group-demo',
        choices: choiceValues(densities),
      }),
    ),
  );
});

test('builds RadioGroup › Horizontal and Compact', async ({ page }) => {
  const channels: readonly ChoiceSpec[] = [
    { value: 'stable', label: 'Stable' },
    { value: 'beta', label: 'Beta' },
    { value: 'nightly', label: 'Nightly' },
  ];
  await dragComponent(page, 'RadioGroup', () => emptySpot(page));
  await configureChoices(page, /^RadioGroup/, channels);
  await select(page, /^RadioGroup/);
  await applySpec(page, {
    choices: { size: 'compact', orientation: 'horizontal' },
    flags: ['required'],
    text: {
      label: 'Release Channel',
      name: 'release-channel',
      error: 'Choose a channel.',
      action: 'radio-group-demo',
    },
  });
  expect(await exported(page)).toEqual(
    pane(
      node('radio-group', {
        label: 'Release Channel',
        name: 'release-channel',
        size: 'compact',
        orientation: 'horizontal',
        required: true,
        error: 'Choose a channel.',
        action: 'radio-group-demo',
        choices: choiceValues(channels),
      }),
    ),
  );
});

test('builds SegmentedControl › Toolbar', async ({ page }) => {
  const views: readonly ChoiceSpec[] = [
    { value: 'list', label: 'List View', glyph: 'list' },
    { value: 'columns', label: 'Columns View', glyph: 'columns-3' },
    { value: 'settings', label: 'Settings View', glyph: 'settings' },
  ];
  // The group sits in a plain Toolbar's leading zone (KF-0W87ST).
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await dragComponent(page, 'ToolbarControlGroup', () =>
    zoneSpot(page, 'Leading'),
  );
  await select(page, /^Toolbar(?!Text|Control|Button)/);
  await setText(page, 'label', 'Toolbar');
  // The group's seeded ToolbarButton gives way to the control.
  await select(page, /^ToolbarButton/);
  await inspectorOverview(page);
  await page.locator('[data-action="editor-delete"]').click();
  await select(page, /^ToolbarControlGroup/);
  await addChild(page, 'SegmentedControl');
  await configureChoices(page, /^SegmentedControl/, views, 'content');
  await select(page, /^SegmentedControl/);
  // toolbarChoice starts as 'list'.
  await applySpec(page, {
    choices: { appearance: 'toolbar', shape: 'pill', size: 'small' },
    text: {
      id: 'standalone-toolbar-view',
      label: 'Toolbar View Mode',
      action: 'select-segment-demo',
    },
  });
  await choose(page, 'value', 'List View');
  await expect(
    canvas(page).locator('.kui-segmented-control button svg'),
  ).toHaveCount(3);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Toolbar' },
        {
          leading: [
            node('toolbar-control-group', undefined, {
              children: [
                node(
                  'segmented-control',
                  {
                    id: 'standalone-toolbar-view',
                    label: 'Toolbar View Mode',
                    value: 'list',
                    action: 'select-segment-demo',
                    appearance: 'toolbar',
                    shape: 'pill',
                    size: 'small',
                    choices: choiceValues(views),
                  },
                  choiceZones(views, 'content'),
                ),
              ],
            }),
          ],
        },
      ),
    ),
  );
});

test('builds SegmentedControl › Placeholder', async ({ page }) => {
  const views: readonly ChoiceSpec[] = [
    { value: 'list', label: 'List View' },
    { value: 'columns', label: 'Columns View' },
    { value: 'settings', label: 'Settings View' },
  ];
  await dragComponent(page, 'SegmentedControl', () => emptySpot(page));
  await configureChoices(page, /^SegmentedControl/, views);
  await select(page, /^SegmentedControl/);
  await applySpec(page, {
    flags: ['placeholder'],
    text: { id: 'segmented-placeholder', label: 'Loading View Mode' },
  });
  await chooseEmptyValue(page);
  expect(await exported(page)).toEqual(
    pane(
      node('segmented-control', {
        id: 'segmented-placeholder',
        label: 'Loading View Mode',
        value: '',
        choices: choiceValues(views),
        placeholder: true,
      }),
    ),
  );
});

test('builds SegmentedControl › Disabled', async ({ page }) => {
  const ranges: readonly ChoiceSpec[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];
  await dragComponent(page, 'SegmentedControl', () => emptySpot(page));
  await configureChoices(page, /^SegmentedControl/, ranges);
  await select(page, /^SegmentedControl/);
  await applySpec(page, {
    flags: ['disabled'],
    text: { id: 'segmented-disabled', label: 'Report Range' },
  });
  await choose(page, 'value', 'Week');
  expect(await exported(page)).toEqual(
    pane(
      node('segmented-control', {
        id: 'segmented-disabled',
        label: 'Report Range',
        value: 'week',
        choices: choiceValues(ranges),
        disabled: true,
      }),
    ),
  );
});

test('builds ChoiceChips › Color Palette', async ({ page }) => {
  test.slow();
  await choiceChips(page, colorChoices, {
    text: {
      id: 'choice-chips-color',
      name: 'command-color',
      label: 'Command Color',
      action: 'choice-chips-demo',
    },
  });
  // choiceChipsColor starts as 'blue'.
  await choose(page, 'value', 'Blue');
  expect(await exported(page)).toEqual(
    pane(
      node('choice-chips', {
        id: 'choice-chips-color',
        name: 'command-color',
        label: 'Command Color',
        value: 'blue',
        action: 'choice-chips-demo',
        choices: choiceValues(colorChoices),
      }),
    ),
  );
});

test('builds ChoiceChips › Compact with Icons', async ({ page }) => {
  const views: readonly ChoiceSpec[] = [
    { value: 'board', label: 'Board', glyph: 'columns-3' },
    { value: 'list', label: 'List', glyph: 'list' },
    {
      value: 'calendar',
      label: 'Calendar',
      glyph: 'calendar',
      disabled: true,
      title: 'Calendar view needs a due-date field',
    },
  ];
  await choiceChips(page, views, {
    choices: { size: 'compact' },
    text: {
      id: 'choice-chips-view',
      name: 'board-view',
      label: 'Board View',
      action: 'choice-chips-demo',
    },
  });
  // choiceChipsView starts as 'board'.
  await choose(page, 'value', 'Board');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'choice-chips',
        {
          id: 'choice-chips-view',
          name: 'board-view',
          label: 'Board View',
          size: 'compact',
          value: 'board',
          action: 'choice-chips-demo',
          choices: choiceValues(views),
        },
        choiceZones(views),
      ),
    ),
  );
});

test('builds ChoiceChips › Icon Picker', async ({ page }) => {
  // Twenty-two choices, each with an icon placed through its form.
  test.setTimeout(test.info().timeout * 8);
  const icons: readonly ChoiceSpec[] = (
    [
      ['star', 'Star'],
      ['heart', 'Heart'],
      ['bell', 'Bell'],
      ['bookmark', 'Bookmark'],
      ['camera', 'Camera'],
      ['cloud', 'Cloud'],
      ['code', 'Code'],
      ['coffee', 'Coffee'],
      ['flag', 'Flag'],
      ['folder', 'Folder'],
      ['gift', 'Gift'],
      ['globe', 'Globe'],
      ['house', 'House'],
      ['key', 'Key'],
      ['lightbulb', 'Light Bulb'],
      ['mail', 'Mail'],
      ['map', 'Map'],
      ['music', 'Music'],
      ['rocket', 'Rocket'],
      ['settings', 'Settings'],
      ['tag', 'Tag'],
      ['zap', 'Lightning'],
    ] as const
  ).map(([value, label]) => ({ value, label, glyph: value }));
  await choiceChips(page, icons, {
    choices: { presentation: 'icons' },
    text: {
      id: 'choice-chips-icon',
      name: 'command-icon',
      label: 'Command Icon',
      action: 'choice-chips-demo',
    },
  });
  await setCss(page, 'maxHeight', 'rem(7)');
  // choiceChipsIcon starts as 'star'.
  await choose(page, 'value', 'Star');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'choice-chips',
        {
          id: 'choice-chips-icon',
          name: 'command-icon',
          label: 'Command Icon',
          presentation: 'icons',
          maxHeight: { $css: 'rem(7)' },
          value: 'star',
          action: 'choice-chips-demo',
          choices: choiceValues(icons),
        },
        choiceZones(icons),
      ),
    ),
  );
});

test('builds ChoiceChips › Section Strip', async ({ page }) => {
  test.slow();
  const sections: readonly ChoiceSpec[] = [
    'All',
    'Business',
    'Money',
    'Technology',
    'Science',
    'Health',
    'Sports',
    'Culture',
    'Travel',
    'Transport',
  ].map((label) => ({ value: label.toLowerCase(), label }));
  await choiceChips(page, sections, {
    choices: { overflow: 'scroll' },
    text: {
      id: 'choice-chips-section',
      name: 'feed-section',
      label: 'Feed Section',
      action: 'choice-chips-demo',
    },
  });
  // choiceChipsSection starts as 'all'.
  await choose(page, 'value', 'All');
  expect(await exported(page)).toEqual(
    pane(
      node('choice-chips', {
        id: 'choice-chips-section',
        name: 'feed-section',
        label: 'Feed Section',
        overflow: 'scroll',
        value: 'all',
        action: 'choice-chips-demo',
        choices: choiceValues(sections),
      }),
    ),
  );
});

test('builds ChoiceChips › Toggle Selection', async ({ page }) => {
  const labels: readonly ChoiceSpec[] = (
    [
      ['bug', 'Bug', '#ef4444'],
      ['feature', 'Feature', '#3b82f6'],
      ['docs', 'Docs', '#22c55e'],
      ['design', 'Design', '#a855f7'],
      ['chore', 'Chore', '#6b7280'],
    ] as const
  ).map(([value, label, hex]) => ({
    value,
    label,
    swatch: `fillColor("${hex}")`,
  }));
  await choiceChips(page, labels, {
    choices: { multiple: 'toggle' },
    text: {
      id: 'choice-chips-labels',
      name: 'labels',
      label: 'Labels',
      action: 'choice-chips-demo',
    },
  });
  // choiceChipsLabels starts as ['bug', 'docs'].
  await chooseValues(page, ['Bug', 'Docs']);
  expect(await exported(page)).toEqual(
    pane(
      node('choice-chips', {
        id: 'choice-chips-labels',
        name: 'labels',
        label: 'Labels',
        multiple: 'toggle',
        value: ['bug', 'docs'],
        action: 'choice-chips-demo',
        choices: choiceValues(labels),
      }),
    ),
  );
});

test('builds ChoiceChips › Multi-Select Listbox', async ({ page }) => {
  const workspaces: readonly ChoiceSpec[] = [
    { value: 'atlas', label: 'Atlas' },
    { value: 'borealis', label: 'Borealis' },
    { value: 'cirrus', label: 'Cirrus' },
    { value: 'delta', label: 'Delta', disabled: true, title: 'Archived' },
    { value: 'ember', label: 'Ember' },
    { value: 'fjord', label: 'Fjord' },
  ];
  await choiceChips(page, workspaces, {
    choices: { multiple: 'true' },
    text: {
      id: 'choice-chips-workspaces',
      name: 'workspaces',
      label: 'Workspaces',
      action: 'choice-chips-demo',
    },
  });
  // choiceChipsWorkspaces starts as ['atlas'].
  await chooseValues(page, ['Atlas']);
  expect(await exported(page)).toEqual(
    pane(
      node('choice-chips', {
        id: 'choice-chips-workspaces',
        name: 'workspaces',
        label: 'Workspaces',
        multiple: true,
        value: ['atlas'],
        action: 'choice-chips-demo',
        choices: choiceValues(workspaces),
      }),
    ),
  );
});

// KF-8T2FT4: the chips inside a dark scheme scope, a Kerf-owned
// ContentItem prop (KF-GBPM07) in place of a `wa-dark` class.
test('builds ChoiceChips › On Dark Chrome', async ({ page }) => {
  test.slow();
  const intents: readonly ChoiceSpec[] = [
    { value: 'comment', label: 'Comment', glyph: 'message-square' },
    { value: 'bug', label: 'Bug', glyph: 'bug' },
    { value: 'change', label: 'Change', glyph: 'pencil' },
    { value: 'insert', label: 'Insert', glyph: 'plus' },
    { value: 'remove', label: 'Remove', glyph: 'minus' },
    { value: 'move', label: 'Move', glyph: 'move' },
    { value: 'question', label: 'Question', glyph: 'circle-question-mark' },
  ];
  await dragComponent(page, 'ContentItem', () => emptySpot(page));
  await select(page, /^ContentItem/);
  await applySpec(page, { choices: { appearance: 'surface', scheme: 'dark' } });
  await dragComponent(page, 'ChoiceChips', () => emptySpot(page));
  await configureChoices(page, /^ChoiceChips/, intents);
  await select(page, /^ChoiceChips/);
  await applySpec(page, {
    choices: { multiple: 'toggle', size: 'compact' },
    text: {
      id: 'choice-chips-intents',
      name: 'intents',
      label: 'Annotation Intents',
      action: 'choice-chips-demo',
    },
  });
  // choiceChipsIntents starts as ['comment'].
  await chooseValues(page, ['Comment']);
  await expect(
    canvas(page).locator('.kui-content-item .kui-choice-chips'),
  ).toHaveCount(1);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'content-item',
        { appearance: 'surface', scheme: 'dark' },
        {
          children: [
            node(
              'choice-chips',
              {
                id: 'choice-chips-intents',
                name: 'intents',
                label: 'Annotation Intents',
                multiple: 'toggle',
                size: 'compact',
                value: ['comment'],
                action: 'choice-chips-demo',
                choices: choiceValues(intents),
              },
              choiceZones(intents),
            ),
          ],
        },
      ),
    ),
  );
});

// KF-8T2FT4: the chips in a Form (KF-XX4Y95) inside a 560px modal dialog,
// named by a FieldLabel's id (KF-Q70Q9Y). The edit canvas shows the dialog
// embedded.
test('builds ChoiceChips › In a 560px Dialog', async ({ page }) => {
  test.slow();
  const id = 'choice-chips-dialog';
  await dialogTrigger(page, 'Edit Command', id);
  await dialogSurface(
    page,
    { text: { id, label: 'Edit Command' } },
    { preferredWidth: 'px(560)' },
  );
  // The Form takes the place of the dialog's seeded body Text.
  await addInto(page, DIALOG, 'Form', 0, 0);
  await select(page, /^Form(?![A-Z])/);
  await setText(page, 'id', `${id}-form`);
  await addInto(page, /^Form(?![A-Z])/, 'FieldLabel');
  await select(page, /^FieldLabel/);
  await applySpec(page, { text: { children: 'Color', id: `${id}-label` } });
  await addInto(page, /^Form(?![A-Z])/, 'ChoiceChips');
  await configureChoices(page, /^ChoiceChips/, colorChoices);
  await select(page, /^ChoiceChips/);
  await applySpec(page, {
    text: {
      id: `${id}-color`,
      name: 'color',
      labelledBy: `${id}-label`,
      action: 'choice-chips-demo',
    },
    // The FieldLabel names the group in place of the seeded label.
    unsets: ['label'],
  });
  // choiceChipsDialogColor starts as 'transparent'.
  await choose(page, 'value', 'Transparent');
  await zoneButtons(page, DIALOG, 'footer', [
    { text: { children: 'Cancel' }, close: true },
    {
      choices: { tone: 'brand' },
      text: { children: 'Save', action: 'save-choice-chips-dialog' },
    },
  ]);
  const shown = canvas(page).locator(`dialog#${id}`);
  await expect(shown).toBeVisible();
  await expect(
    shown.locator(`form#${id}-form .kui-choice-chips`),
  ).toHaveAttribute('aria-labelledby', `${id}-label`);
  await expect(shown.locator(`#${id}-label`)).toHaveText('Color');
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Edit Command', id),
      node(
        'surface-scaffold',
        { id, label: 'Edit Command', preferredWidth: css('px(560)') },
        {
          children: [
            node(
              'form',
              { id: `${id}-form` },
              {
                children: [
                  node('text#FieldLabel', {
                    children: 'Color',
                    id: `${id}-label`,
                  }),
                  node('choice-chips', {
                    id: `${id}-color`,
                    name: 'color',
                    labelledBy: `${id}-label`,
                    value: 'transparent',
                    action: 'choice-chips-demo',
                    choices: choiceValues(colorChoices),
                  }),
                ],
              },
            ),
          ],
          footer: [
            closeButton('Cancel'),
            node('button', {
              children: 'Save',
              tone: 'brand',
              action: 'save-choice-chips-dialog',
            }),
          ],
        },
      ),
    ),
  );
});

// Live demo state is a static snapshot of each demo's first render.
test('builds Slider › Labeled with a Readout', async ({ page }) => {
  await dragComponent(page, 'Slider', () => emptySpot(page));
  await select(page, /^Slider/);
  // The volume starts at 30.
  await applySpec(page, {
    flags: ['showValue'],
    text: {
      id: 'slider-demo-volume',
      label: 'Volume',
      value: '30',
      unit: '%',
      hint: 'Applies to every output device.',
      action: 'set-slider-demo',
    },
  });
  await expect(canvas(page).locator('input[type="range"]')).toHaveValue('30');
  expect(await exported(page)).toEqual(
    pane(
      node('slider', {
        id: 'slider-demo-volume',
        label: 'Volume',
        value: 30,
        showValue: true,
        unit: '%',
        hint: 'Applies to every output device.',
        action: 'set-slider-demo',
      }),
    ),
  );
});

test('builds Slider › Stepped with Ticks', async ({ page }) => {
  const ticks = [50, 100, 150, 200].map((value) => ({
    value,
    label: `${value}%`,
  }));
  await dragComponent(page, 'Slider', () => emptySpot(page));
  await select(page, /^Slider/);
  // The zoom starts at 100.
  await applySpec(page, {
    flags: ['showValue'],
    text: {
      id: 'slider-demo-zoom',
      label: 'Zoom',
      min: '50',
      max: '200',
      step: '25',
      value: '100',
      unit: '%',
      action: 'set-slider-demo',
    },
  });
  await editAsJson(page, 'ticks', ticks);
  await expect(canvas(page).locator('.kui-slider__tick')).toHaveCount(4);
  expect(await exported(page)).toEqual(
    pane(
      node('slider', {
        id: 'slider-demo-zoom',
        label: 'Zoom',
        value: 100,
        min: 50,
        max: 200,
        step: 25,
        showValue: true,
        unit: '%',
        ticks,
        action: 'set-slider-demo',
      }),
    ),
  );
});

test('builds Slider › Compact and Disabled', async ({ page }) => {
  // The opacity starts at 80.
  await stacked(
    page,
    'List',
    'Slider',
    [
      {
        flags: ['showValue'],
        choices: { size: 'compact' },
        text: {
          id: 'slider-demo-opacity',
          label: 'Layer Opacity',
          value: '80',
          unit: '%',
          action: 'set-slider-demo',
        },
      },
      {
        flags: ['disabled'],
        text: {
          id: 'slider-demo-locked',
          label: 'Locked Setting',
          value: '40',
        },
      },
    ],
    () => choose(page, 'gap', 'xs'),
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('slider', {
              id: 'slider-demo-opacity',
              label: 'Layer Opacity',
              value: 80,
              showValue: true,
              unit: '%',
              size: 'compact',
              action: 'set-slider-demo',
            }),
            node('slider', {
              id: 'slider-demo-locked',
              label: 'Locked Setting',
              value: 40,
              disabled: true,
            }),
          ],
        },
      ),
    ),
  );
});

test('builds Slider › Vertical', async ({ page }) => {
  await dragComponent(page, 'Slider', () => emptySpot(page));
  await select(page, /^Slider/);
  // The level starts at 60.
  await applySpec(page, {
    flags: ['showValue'],
    choices: { size: 'compact', orientation: 'vertical' },
    text: {
      id: 'slider-demo-level',
      label: 'Level',
      value: '60',
      unit: '%',
      action: 'set-slider-demo',
    },
  });
  await setCss(page, 'length', 'remify(120)');
  expect(await exported(page)).toEqual(
    pane(
      node('slider', {
        id: 'slider-demo-level',
        label: 'Level',
        value: 60,
        showValue: true,
        unit: '%',
        size: 'compact',
        orientation: 'vertical',
        length: { $css: 'remify(120)' },
        action: 'set-slider-demo',
      }),
    ),
  );
});

test('builds TagField › Labels', async ({ page }) => {
  await dragComponent(page, 'TagField', () => emptySpot(page));
  await select(page, /^TagField/);
  // The labels start as bug and docs, with no error shown.
  await applySpec(page, {
    text: {
      id: 'tag-field-demo-labels',
      label: 'Labels',
      name: 'labels',
      hint: 'Press Enter or a comma to add a label.',
    },
  });
  await setTags(page, 'tags', ['bug', 'docs']);
  expect(await exported(page)).toEqual(
    pane(
      node('tag-field', {
        id: 'tag-field-demo-labels',
        label: 'Labels',
        name: 'labels',
        tags: ['bug', 'docs'],
        hint: 'Press Enter or a comma to add a label.',
      }),
    ),
  );
});

test('builds TagField › Validated with a Limit', async ({ page }) => {
  await stacked(
    page,
    'List',
    'TagField',
    [
      {
        flags: ['required'],
        text: {
          id: 'tag-field-demo-recipients',
          label: 'Recipients',
          name: 'recipients',
          max: '3',
          placeholder: 'Add an email address…',
          hint: 'Up to three addresses.',
        },
      },
      {
        flags: ['disabled'],
        text: { id: 'tag-field-demo-locked', label: 'Locked Labels' },
      },
    ],
    () => choose(page, 'gap', 'xs'),
  );
  // The recipients start as mara@example.com.
  await select(page, /^TagField/, 0);
  await setTags(page, 'tags', ['mara@example.com']);
  await select(page, /^TagField/, 1);
  await setTags(page, 'tags', ['release', 'frozen']);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('tag-field', {
              id: 'tag-field-demo-recipients',
              label: 'Recipients',
              name: 'recipients',
              tags: ['mara@example.com'],
              max: 3,
              placeholder: 'Add an email address…',
              hint: 'Up to three addresses.',
              required: true,
            }),
            node('tag-field', {
              id: 'tag-field-demo-locked',
              label: 'Locked Labels',
              tags: ['release', 'frozen'],
              disabled: true,
            }),
          ],
        },
      ),
    ),
  );
});

test('builds Combobox › Add or Create a Tag', async ({ page }) => {
  // comboboxTags starts as ['bug']: one chip, and bug left out of the
  // suggestions.
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^Row/);
  await turnOn(page, 'wrap');
  await choose(page, 'controlInsets', 'rl');
  await dragComponent(page, 'Chip', () => emptySpot(page));
  await select(page, /^Chip/);
  await setText(page, 'children', 'bug');
  await select(page, /^List/);
  await addChild(page, 'ListInsetControl');
  await choose(page, 'sides', 'rl');
  await addChild(page, 'Combobox');
  // Adding a child turned the inset's seeded text into a Text node.
  await select(page, /^Text(?![A-Z])/);
  await area(page, 'Flow');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await select(page, /^Combobox/);
  await applySpec(page, {
    text: {
      id: 'demo-tag-combobox',
      label: 'Tag Name',
      placeholder: 'Search or create a tag',
      hint: 'Press Enter to add',
    },
  });
  const suggestions = ['design', 'docs', 'performance', 'regression'];
  await editAsJson(page, 'suggestions', suggestions);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node(
              'row',
              { wrap: true, controlInsets: 'rl' },
              { children: [node('chip', { children: 'bug' })] },
            ),
            node(
              'list-inset-control',
              { sides: 'rl' },
              {
                children: [
                  node('combobox', {
                    id: 'demo-tag-combobox',
                    label: 'Tag Name',
                    placeholder: 'Search or create a tag',
                    hint: 'Press Enter to add',
                    suggestions,
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

test('builds ColorField › Color Fields', async ({ page }) => {
  // The fill starts as #0a84ff (rgb) and the border as #1c1c1e80 (hsl).
  await stacked(
    page,
    'List',
    'ColorField',
    [
      {
        choices: { mode: 'rgb' },
        text: {
          id: 'color-field-demo-fill',
          label: 'Fill',
          name: 'fill',
          value: '#0a84ff',
          hint: 'Applies to the selected shapes.',
        },
      },
      {
        choices: { mode: 'hsl', size: 'compact' },
        text: {
          id: 'color-field-demo-border',
          label: 'Border',
          name: 'border',
          value: '#1c1c1e80',
        },
      },
      {
        flags: ['disabled'],
        text: {
          id: 'color-field-demo-locked',
          label: 'Theme Accent',
          value: '#bf5af2',
          error: 'The theme locks this color.',
        },
      },
    ],
    () => choose(page, 'gap', 'm'),
  );
  // Alpha is on by default; the locked field turns it off.
  await select(page, /^ColorField/, 2);
  await turnOff(page, 'alpha');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'm' },
        {
          children: [
            node('color-field', {
              id: 'color-field-demo-fill',
              label: 'Fill',
              name: 'fill',
              value: '#0a84ff',
              mode: 'rgb',
              hint: 'Applies to the selected shapes.',
            }),
            node('color-field', {
              id: 'color-field-demo-border',
              label: 'Border',
              name: 'border',
              value: '#1c1c1e80',
              mode: 'hsl',
              size: 'compact',
            }),
            node('color-field', {
              id: 'color-field-demo-locked',
              label: 'Theme Accent',
              value: '#bf5af2',
              alpha: false,
              disabled: true,
              error: 'The theme locks this color.',
            }),
          ],
        },
      ),
    ),
  );
});

test('builds ColorPicker › Full Picker', async ({ page }) => {
  const presets = [
    '#ff3b30',
    '#ff9500',
    '#ffcc00',
    '#34c759',
    '#00c7be',
    '#0a84ff',
    '#5e5ce6',
    '#bf5af2',
    '#ff375f',
    '#8e8e93',
  ].map(swatch);
  // The picker starts at #d8d8d8 (rgb) with two user colors.
  const samples = [
    { title: 'User Colors', swatches: ['#1e3a8a', '#f59e0b'].map(swatch) },
  ];
  await dragComponent(page, 'ColorPicker', () => emptySpot(page));
  await select(page, /^ColorPicker/);
  await applySpec(page, {
    choices: { mode: 'rgb' },
    text: {
      id: 'color-picker-demo',
      label: 'Fill Color',
      value: '#d8d8d8',
      name: 'fill',
      addSampleAction: 'add-color-sample-demo',
    },
  });
  await editAsJson(page, 'presets', presets);
  await editAsJson(page, 'samples', samples);
  expect(await exported(page)).toEqual(
    pane(
      node('color-picker', {
        id: 'color-picker-demo',
        label: 'Fill Color',
        value: '#d8d8d8',
        mode: 'rgb',
        name: 'fill',
        presets,
        samples,
        addSampleAction: 'add-color-sample-demo',
      }),
    ),
  );
});

test('builds ColorPicker › Without Opacity', async ({ page }) => {
  await dragComponent(page, 'ColorPicker', () => emptySpot(page));
  await select(page, /^ColorPicker/);
  await applySpec(page, {
    choices: { mode: 'hsb' },
    text: {
      id: 'color-picker-demo-opaque',
      label: 'Text Color',
      value: '#0a84ff',
    },
  });
  // Opacity and the eyedropper are on by default.
  await turnOff(page, 'alpha');
  await turnOff(page, 'eyedropper');
  expect(await exported(page)).toEqual(
    pane(
      node('color-picker', {
        id: 'color-picker-demo-opaque',
        label: 'Text Color',
        value: '#0a84ff',
        mode: 'hsb',
        alpha: false,
        eyedropper: false,
      }),
    ),
  );
});

test('builds ColorSwatches › Fixed Palette', async ({ page }) => {
  // The command color starts as #0a84ff.
  await dragComponent(page, 'ColorSwatches', () => emptySpot(page));
  await colorSwatches(
    page,
    0,
    PALETTE.slice(1),
    {
      text: {
        name: 'command-color',
        label: 'Command Color',
        action: 'pick-swatch-demo',
      },
    },
    'Blue',
  );
  await expect(canvas(page).locator('input[type="radio"]')).toHaveCount(10);
  expect(await exported(page)).toEqual(
    pane(
      node('color-swatches', {
        name: 'command-color',
        label: 'Command Color',
        swatches: PALETTE.slice(1),
        value: '#0a84ff',
        action: 'pick-swatch-demo',
      }),
    ),
  );
});

test('builds ColorSwatches › No Color, Compact, and Disabled', async ({
  page,
}) => {
  // The label color starts as none.
  await stacked(page, 'List', 'ColorSwatches', [{}, {}], () =>
    choose(page, 'gap', 'm'),
  );
  await colorSwatches(
    page,
    0,
    PALETTE,
    {
      choices: { size: 'compact' },
      text: {
        name: 'label-color',
        label: 'Label Color',
        action: 'pick-swatch-demo',
      },
    },
    'No Color',
  );
  await colorSwatches(
    page,
    1,
    PALETTE.slice(1, 6),
    {
      choices: { size: 'compact' },
      flags: ['disabled'],
      text: { name: 'locked-color', label: 'Locked Color' },
    },
    'Green',
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'm' },
        {
          children: [
            node('color-swatches', {
              name: 'label-color',
              label: 'Label Color',
              swatches: PALETTE,
              value: 'none',
              size: 'compact',
              action: 'pick-swatch-demo',
            }),
            node('color-swatches', {
              name: 'locked-color',
              label: 'Locked Color',
              swatches: PALETTE.slice(1, 6),
              value: '#34c759',
              size: 'compact',
              disabled: true,
            }),
          ],
        },
      ),
    ),
  );
});

test('builds FilePicker › Browse Trigger and Drop Zone', async ({ page }) => {
  // filePickerFiles starts empty, so no file list shows.
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await dataAttribute(page, 'data-demo-attachments-panel', '');
  await select(page, /^Row/);
  await applySpec(page, {
    choices: {
      hAlign: 'space-between',
      vAlign: 'middle',
      textInsets: 'l',
      controlInsets: 'r',
    },
  });
  await dragComponent(page, 'Text', () => emptySpot(page));
  await select(page, /^Text(?![A-Z])/);
  await applySpec(page, {
    choices: { variant: 'h3', size: 'compact' },
    flags: ['flush'],
    text: { children: 'Attachments' },
  });
  await select(page, /^Row/);
  await addChild(page, 'FilePickerTrigger');
  await applySpec(page, {
    flags: ['multiple'],
    text: {
      label: 'Add',
      accessibleLabel: 'Browse attachments',
      pickerId: 'demo-attachments',
    },
  });
  await addIcon(page, 'icon', 'plus');
  await select(page, /^List/);
  await addChild(page, 'FileDropZone');
  await applySpec(page, {
    flags: ['multiple'],
    text: {
      title: 'Drop attachments here or browse',
      detail: 'Images and PDFs, up to 10 MB each',
      accessibleLabel: 'Add attachments by dropping or choosing files',
      accept: 'image/*,.pdf',
      pickerId: 'demo-drop',
      dropScope: '[data-demo-attachments-panel]',
    },
  });
  await addIcon(page, 'icon', 'upload');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs', rootAttributes: { 'data-demo-attachments-panel': '' } },
        {
          children: [
            node(
              'row',
              {
                hAlign: 'space-between',
                vAlign: 'middle',
                textInsets: 'l',
                controlInsets: 'r',
              },
              {
                children: [
                  node('text', {
                    children: 'Attachments',
                    variant: 'h3',
                    size: 'compact',
                    flush: true,
                  }),
                  node(
                    'file-picker',
                    {
                      label: 'Add',
                      accessibleLabel: 'Browse attachments',
                      multiple: true,
                      pickerId: 'demo-attachments',
                    },
                    { icon: [icon('plus')] },
                  ),
                ],
              },
            ),
            node(
              'file-picker#FileDropZone',
              {
                title: 'Drop attachments here or browse',
                detail: 'Images and PDFs, up to 10 MB each',
                accessibleLabel:
                  'Add attachments by dropping or choosing files',
                accept: 'image/*,.pdf',
                multiple: true,
                pickerId: 'demo-drop',
                dropScope: '[data-demo-attachments-panel]',
              },
              { icon: [icon('upload')] },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds FilePicker › Button Look', async ({ page }) => {
  await dragComponent(page, 'Row', () => emptySpot(page));
  await dragComponent(page, 'FilePickerTrigger', () => emptySpot(page));
  await select(page, /^Row/);
  await applySpec(page, {
    choices: { gap: 'xs', vAlign: 'middle', controlInsets: 'trbl' },
    data: [['data-demo-file-buttons', '']],
  });
  await select(page, /^FilePicker/);
  await applySpec(page, {
    choices: { tone: 'brand' },
    text: {
      label: 'Import',
      accessibleLabel: 'Import a document',
      pickerId: 'demo-import',
    },
  });
  await addIcon(page, 'icon', 'folder-open');
  await select(page, /^Row/);
  await addChild(page, 'FilePickerTrigger');
  await applySpec(page, {
    choices: { emphasis: 'plain', size: 'compact' },
    text: { label: 'Open', pickerId: 'demo-open' },
  });
  await addIcon(page, 'icon', 'folder-open');
  await select(page, /^Row/);
  await addChild(page, 'Button');
  await applySpec(page, {
    choices: { emphasis: 'plain', size: 'compact' },
    text: { children: 'Save' },
  });
  await addIcon(page, 'icon', 'save');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        {
          gap: 'xs',
          vAlign: 'middle',
          controlInsets: 'trbl',
          rootAttributes: { 'data-demo-file-buttons': '' },
        },
        {
          children: [
            node(
              'file-picker',
              {
                label: 'Import',
                accessibleLabel: 'Import a document',
                tone: 'brand',
                pickerId: 'demo-import',
              },
              { icon: [icon('folder-open')] },
            ),
            node(
              'file-picker',
              {
                label: 'Open',
                emphasis: 'plain',
                size: 'compact',
                pickerId: 'demo-open',
              },
              { icon: [icon('folder-open')] },
            ),
            node(
              'button',
              { children: 'Save', emphasis: 'plain', size: 'compact' },
              { icon: [icon('save')] },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds FilePicker › Disabled', async ({ page }) => {
  await dragComponent(page, 'FileDropZone', () => emptySpot(page));
  await select(page, /^FileDropZone/);
  await applySpec(page, {
    flags: ['disabled'],
    text: { title: 'Uploads are paused' },
  });
  await addIcon(page, 'icon', 'upload');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'file-picker#FileDropZone',
        { title: 'Uploads are paused', disabled: true },
        { icon: [icon('upload')] },
      ),
    ),
  );
});

test('builds MessageComposer › Chat Composer', async ({ page }) => {
  const id = 'message-composer-demo-chat';
  await dragComponent(page, 'MessageComposer', () => emptySpot(page));
  await select(page, /^MessageComposer/);
  await applySpec(page, {
    flags: ['submitOnEnter'],
    text: {
      id,
      name: id,
      label: 'Message',
      placeholder: 'Ask about this build',
      hint: 'Answers use the latest nightly build.',
    },
  });
  await composerSend(page, 'Send', id);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'message-composer',
        {
          submitOnEnter: true,
          id,
          name: id,
          label: 'Message',
          placeholder: 'Ask about this build',
          hint: 'Answers use the latest nightly build.',
        },
        { trailing: [composerSendNode('Send', id)] },
      ),
    ),
  );
});

test('builds MessageComposer › Prompt with Leading Controls', async ({
  page,
}) => {
  const id = 'message-composer-demo-prompt';
  await dragComponent(page, 'MessageComposer', () => emptySpot(page));
  await select(page, /^MessageComposer/);
  await applySpec(page, {
    text: {
      id,
      name: id,
      label: 'Prompt',
      placeholder: 'Describe the change you want',
      minRows: '3',
      maxRows: '12',
    },
  });
  await composerSend(page, 'Generate', id);
  await select(page, /^MessageComposer/);
  await addChild(page, 'ToolbarControlGroup', 'leading');
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  await select(page, /^ToolbarButton/);
  await setText(page, 'ariaLabel', 'Attach File');
  await unset(page, 'children');
  await setText(page, 'action', 'attach-composer-demo');
  await addIcon(page, 'icon', 'paperclip');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'message-composer',
        {
          id,
          name: id,
          label: 'Prompt',
          placeholder: 'Describe the change you want',
          minRows: 3,
          maxRows: 12,
        },
        {
          trailing: [composerSendNode('Generate', id)],
          leading: [
            node(
              'toolbar-control-group',
              { appearance: 'borderless', single: true },
              {
                children: [
                  node(
                    'toolbar-control-group#ToolbarButton',
                    {
                      ariaLabel: 'Attach File',
                      action: 'attach-composer-demo',
                    },
                    { icon: [icon('paperclip')] },
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

test('builds SearchField › Saved-View Form Fields', async ({ page }) => {
  const tokens = [{ value: 'tag:client', label: 'tag:client', offset: 0 }];
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'TextField', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'm');
  await dataAttribute(page, 'data-demo-token-form', '');
  await select(page, /^TextField/);
  await applySpec(page, {
    flags: ['required'],
    text: {
      label: 'View Name',
      hint: 'Name this saved view.',
      value: 'Open procurement',
    },
  });
  await select(page, /^List/);
  await addChild(page, 'SearchField');
  await applySpec(page, {
    choices: { presentation: 'form-field' },
    flags: ['required'],
    text: {
      id: 'saved-view-query',
      label: 'Search Query',
      hint: 'Add filters to narrow the view.',
      query: 'status:open',
    },
  });
  await editAsJson(page, 'tokens', tokens);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'm', rootAttributes: { 'data-demo-token-form': '' } },
        {
          children: [
            node('text-field', {
              label: 'View Name',
              hint: 'Name this saved view.',
              required: true,
              value: 'Open procurement',
            }),
            node('search-field', {
              id: 'saved-view-query',
              label: 'Search Query',
              presentation: 'form-field',
              hint: 'Add filters to narrow the view.',
              required: true,
              query: 'status:open',
              tokens,
            }),
          ],
        },
      ),
    ),
  );
});

test('builds SearchField › Structured Ticket Search', async ({ page }) => {
  // The query and tokens start as below and the help is closed, so the
  // readout reads "2 filters · NOT  AND parser" (KF-7V2VGS).
  const query = 'NOT  AND parser';
  const tokens = [
    {
      value: 'tag:client',
      label: 'tag:client',
      offset: 4,
      accessibleLabel: 'client tag',
    },
    { value: 'is:active', label: 'is:active', offset: 4 },
  ];
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'SearchField', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^SearchField/);
  await applySpec(page, {
    flags: ['autofocus'],
    text: { id: 'catalog-search', label: 'Search Tickets', query },
  });
  await editAsJson(page, 'tokens', tokens);
  await editAsJson(page, 'editorAttributes', {
    'data-demo-search-field': 'true',
  });
  // The help button: the trailing action's object member (KF-BT1YG0).
  await choose(page, 'trailingAction', 'With expanded…');
  await openField(page, 'trailingAction', []);
  await setField(page, 'trailingAction', ['label'], 'Search Help');
  await setField(
    page,
    'trailingAction',
    ['action'],
    'toggle-search-field-help',
  );
  await setField(page, 'trailingAction', ['id'], 'catalog-search-field-help');
  await chooseField(page, 'trailingAction', ['haspopup'], 'dialog');
  // On, then off: the help starts closed.
  await turnFieldOn(page, 'trailingAction', ['expanded']);
  await turnFieldOn(page, 'trailingAction', ['expanded']);
  await page
    .locator('[data-editor-content-add="trailingAction.icon"]')
    .filter({ visible: true })
    .click();
  await area(page, 'Properties');
  await pickIcon(
    page,
    page.locator('[data-editor-icon-place]'),
    'circle-question-mark',
  );
  await select(page, /^List/);
  await addChild(page, 'Text');
  await readout(page, `2 filters · ${query}`, 'data-demo-search-field-readout');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node(
              'search-field',
              {
                id: 'catalog-search',
                label: 'Search Tickets',
                query,
                tokens,
                autofocus: true,
                trailingAction: {
                  label: 'Search Help',
                  action: 'toggle-search-field-help',
                  id: 'catalog-search-field-help',
                  expanded: false,
                  haspopup: 'dialog',
                },
                editorAttributes: { 'data-demo-search-field': 'true' },
              },
              { 'trailingAction.icon': [icon('circle-question-mark')] },
            ),
            readoutNode(
              `2 filters · ${query}`,
              'data-demo-search-field-readout',
            ),
          ],
        },
      ),
    ),
  );
});

test('builds SearchField › Grammar Assisted Search', async ({ page }) => {
  // The app supplies the grammar model, promoted to a param. Its result
  // starts as "No free text · 0 filters".
  const result = 'No free text · 0 filters';
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'SearchField', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^SearchField/);
  await applySpec(page, {
    text: { id: 'grammar-search', label: 'Search with Filters' },
  });
  await showProp(page, 'model');
  await page.locator('[data-editor-promote-prop="model"]').click();
  await nameParam(page, 'nodeModel', 'grammarSearchModel');
  for (const [label, action] of [
    ['Add Release Tag', 'commit-grammar-release'],
    ['Load Saved Search', 'replace-grammar-search'],
  ] as const) {
    await select(page, /^List/);
    await addChild(page, 'Button');
    await applySpec(page, {
      choices: { size: 'compact', emphasis: 'secondary' },
      text: { children: label, action },
    });
  }
  await select(page, /^List/);
  await addChild(page, 'Text');
  await applySpec(page, {
    choices: { variant: 'span', tone: 'quiet', size: 'compact' },
    text: { children: result },
    data: [['data-demo-grammar-result', '']],
  });
  const button = (children: string, action: string) =>
    node('button', {
      children,
      size: 'compact',
      emphasis: 'secondary',
      action,
    });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('search-field', {
              id: 'grammar-search',
              label: 'Search with Filters',
              model: { $param: 'grammarSearchModel' },
            }),
            button('Add Release Tag', 'commit-grammar-release'),
            button('Load Saved Search', 'replace-grammar-search'),
            node('text', {
              children: result,
              variant: 'span',
              tone: 'quiet',
              size: 'compact',
              rootAttributes: { 'data-demo-grammar-result': '' },
            }),
          ],
        },
      ),
    ),
  );
});

test('builds SearchField › Adoption Knobs', async ({ page }) => {
  // adoptionOpen starts open with an empty query and no tokens (unset), and
  // the readout as "No edits yet".
  const suggestions = ['status:open', 'owner:me', 'due:today'];
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'SearchField', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^SearchField/);
  await applySpec(page, {
    flags: ['collapsible', 'expanded'],
    text: {
      id: 'adoption-search',
      clearAction: 'clear-adoption-search',
      label: 'Filter Records',
      placeholder: 'Filter records',
      tokenPlaceholder: 'Add a filter…',
      expandLabel: 'Open filter',
    },
  });
  await editAsJson(page, 'editorAttributes', {
    'data-demo-adoption-search': 'true',
  });
  // The suggestions keep the empty field open: a named group (KF-7V2VGS).
  await select(page, /^List/);
  await addChild(page, 'Row');
  await applySpec(page, {
    flags: ['wrap'],
    text: { ariaLabel: 'Filter Suggestions' },
    data: [['data-search-field-keep-open', '']],
  });
  for (const value of suggestions) {
    await select(page, /^Row/);
    await addChild(page, 'Button');
    await applySpec(page, {
      choices: { size: 'compact', emphasis: 'secondary' },
      text: { children: value, action: 'add-adoption-token' },
      data: [['data-token-value', value]],
    });
  }
  await select(page, /^List/);
  await addChild(page, 'Text');
  await readout(page, 'No edits yet', 'data-demo-adoption-readout');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('search-field', {
              id: 'adoption-search',
              clearAction: 'clear-adoption-search',
              label: 'Filter Records',
              collapsible: true,
              expanded: true,
              placeholder: 'Filter records',
              tokenPlaceholder: 'Add a filter…',
              expandLabel: 'Open filter',
              editorAttributes: { 'data-demo-adoption-search': 'true' },
            }),
            node(
              'row',
              {
                wrap: true,
                ariaLabel: 'Filter Suggestions',
                rootAttributes: { 'data-search-field-keep-open': '' },
              },
              {
                children: suggestions.map((value) =>
                  node('button', {
                    children: value,
                    size: 'compact',
                    emphasis: 'secondary',
                    action: 'add-adoption-token',
                    rootAttributes: { 'data-token-value': value },
                  }),
                ),
              },
            ),
            readoutNode('No edits yet', 'data-demo-adoption-readout'),
          ],
        },
      ),
    ),
  );
});

test('builds SearchField › Collapsible', async ({ page }) => {
  // collapsibleSearchOpen starts closed, which an unset `expanded` is.
  await dragComponent(page, 'SearchField', () => emptySpot(page));
  await select(page, /^SearchField/);
  await applySpec(page, {
    flags: ['collapsible'],
    text: {
      id: 'collapsible-search',
      label: 'Find Records',
      placeholder: 'Find records',
      expandLabel: 'Open find',
    },
  });
  expect(await exported(page)).toEqual(
    pane(
      node('search-field', {
        id: 'collapsible-search',
        label: 'Find Records',
        collapsible: true,
        placeholder: 'Find records',
        expandLabel: 'Open find',
      }),
    ),
  );
});

test('builds SearchField › Disabled', async ({ page }) => {
  const tokens = [
    { value: 'tag:design-system', label: 'tag:design-system', offset: 7 },
  ];
  await dragComponent(page, 'SearchField', () => emptySpot(page));
  await select(page, /^SearchField/);
  await applySpec(page, {
    flags: ['disabled'],
    text: { id: 'disabled-search', label: 'Saved Search', query: 'release' },
  });
  await editAsJson(page, 'tokens', tokens);
  await addIcon(page, 'clearIcon', 'circle-x');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'search-field',
        {
          id: 'disabled-search',
          label: 'Saved Search',
          query: 'release',
          tokens,
          disabled: true,
        },
        { clearIcon: [icon('circle-x')] },
      ),
    ),
  );
});

test('builds TextField › End Toggle', async ({ page }) => {
  // The password starts hidden: type password, the eye icon, not pressed.
  await dragComponent(page, 'TextField', () => emptySpot(page));
  await select(page, /^TextField/);
  await applySpec(page, {
    choices: { type: 'password' },
    text: {
      label: 'Password',
      value: 'correct horse battery',
      autocomplete: 'off',
    },
  });
  await openField(page, 'toggle', []);
  await setField(page, 'toggle', ['label'], 'Show Password');
  await setField(page, 'toggle', ['action'], 'text-field-demo-reveal');
  // A toggle's `pressed` is required: on, then off, writes false.
  await turnFieldOn(page, 'toggle', ['pressed']);
  await turnFieldOn(page, 'toggle', ['pressed']);
  await page.locator('[data-editor-content-add="toggle.icon"]').click();
  await area(page, 'Properties');
  await pickIcon(page, page.locator('[data-editor-icon-place]'), 'eye');
  await expect(
    canvas(page).locator('.kui-text-field__toggle[aria-pressed="false"]'),
  ).toBeVisible();
  expect(await exported(page)).toEqual(
    pane(
      node(
        'text-field',
        {
          label: 'Password',
          type: 'password',
          value: 'correct horse battery',
          autocomplete: 'off',
          toggle: {
            label: 'Show Password',
            pressed: false,
            action: 'text-field-demo-reveal',
          },
        },
        { 'toggle.icon': [icon('eye')] },
      ),
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
  await unset(page, 'label');
  const choices = [
    ['quiet', 'Quiet', 'bell', 'Attention'],
    ['balanced', 'Balanced', 'sliders-horizontal', 'Attention'],
    ['explicit', 'Explicit', 'wrench', 'Control'],
  ] as const;
  await openConfigure(page, 'Configure choices');
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
  await showProp(page, 'value');
  await expect(
    page.locator('[data-editor-prop="value"] .kui-select__trigger'),
  ).toHaveText('Quiet');
  await showProp(page, 'renderSelected');
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

// Live demo state is a static snapshot of the demo's first render, as in
// Select › Rendering Balance: selectedChoice starts as 'balanced', and
// ticketLabels / ticketLabelFilter as ['bug', 'docs'].
test('builds Select › Multiple Selection', async ({ page }) => {
  const spec: SelectSpec = {
    choices: labelChoices,
    props: {
      flags: ['multiple'],
      text: {
        name: 'ticket-labels',
        label: 'Labels',
        placeholderText: 'No labels',
      },
    },
    pick: ['Bug', 'Docs'],
  };
  await selectAlone(page, spec);
  expect(await exported(page)).toEqual(
    pane(
      selectNode(
        {
          name: 'ticket-labels',
          multiple: true,
          value: ['bug', 'docs'],
          label: 'Labels',
          placeholderText: 'No labels',
        },
        spec,
      ),
    ),
  );
});

test('builds Select › Multiple Selection Actions', async ({ page }) => {
  const spec: SelectSpec = {
    choices: [
      { value: 'files', label: 'Files' },
      { value: 'windows', label: 'Windows' },
      {
        value: 'browsers',
        label: 'Web Browsers',
        disabled: true,
        disabledReason: 'Not yet supported',
      },
      { value: 'tabs', label: 'Tabs' },
    ],
    props: {
      flags: ['multiple'],
      text: {
        name: 'item-types',
        label: 'Item Types',
        placeholderText: 'No types',
        selectAllLabel: 'Select all',
        clearLabel: 'Clear',
      },
    },
    // itemTypes starts as ['files'].
    pick: ['Files'],
  };
  await selectAlone(page, spec);
  expect(await exported(page)).toEqual(
    pane(
      selectNode(
        {
          name: 'item-types',
          multiple: true,
          value: ['files'],
          label: 'Item Types',
          placeholderText: 'No types',
          selectAllLabel: 'Select all',
          clearLabel: 'Clear',
        },
        spec,
      ),
    ),
  );
});

test('builds Select › Toolbar Filter', async ({ page }) => {
  await toolbarSelect(
    page,
    'Toolbar Filter',
    iconOnlyGroup('Label Filter'),
    labelFilter('ticket-label-filter', true),
  );
  expect(await exported(page)).toEqual(
    pane(
      toolbarGroupNode('Toolbar Filter', iconOnlyGroupProps('Label Filter'), [
        labelFilterNode('ticket-label-filter', true),
      ]),
    ),
  );
});

test('builds Select › Toolbar Filter Beside Actions', async ({ page }) => {
  await toolbarGroup(
    page,
    'Toolbar Filter Beside Actions',
    { text: { label: 'Ticket View' } },
    { keepButton: true },
  );
  // The pin button: the group's seeded ToolbarButton.
  await select(page, /^ToolbarButton/);
  await setText(page, 'ariaLabel', 'Pin View');
  await unset(page, 'children');
  await setText(page, 'action', 'log-pin');
  await addIcon(page, 'icon', 'pin');
  await select(page, /^ToolbarControlGroup/);
  await addChild(page, 'Select');
  await configureSelect(
    page,
    labelFilter('toolbar-ticket-label-filter', false),
  );
  await select(page, /^ToolbarControlGroup/);
  await addChild(page, 'PopupMenu');
  await setText(page, 'label', 'More Actions');
  await unset(page, 'text');
  await addIcon(page, 'icon', 'ellipsis');
  await select(page, /^PopupMenu/);
  await openConfigure(page, 'Configure items');
  const dialog = page.locator('dialog[open]');
  for (const extra of [3, 2])
    await dialog.getByRole('button', { name: `Remove Item ${extra}` }).click();
  await dialog.getByText('Item 1', { exact: true }).click();
  await setField(page, 'items', [0, 'label'], 'Archive');
  await setField(page, 'items', [0, 'action'], 'log-more');
  await dialog.getByRole('button', { name: 'Done' }).click();
  expect(await exported(page)).toEqual(
    pane(
      toolbarGroupNode(
        'Toolbar Filter Beside Actions',
        { label: 'Ticket View' },
        [
          node(
            'toolbar-control-group#ToolbarButton',
            { ariaLabel: 'Pin View', action: 'log-pin' },
            { icon: [icon('pin')] },
          ),
          labelFilterNode('toolbar-ticket-label-filter', false),
          node(
            'popup-menu',
            {
              label: 'More Actions',
              items: [{ label: 'Archive', action: 'log-more' }],
            },
            { icon: [icon('ellipsis')] },
          ),
        ],
      ),
    ),
  );
});

test('builds Select › Accessible Name Without a Visible Label', async ({
  page,
}) => {
  const spec: SelectSpec = {
    choices: balanceChoices,
    props: {
      text: {
        name: 'plain-rendering-balance',
        ariaLabel: 'Plain Rendering Balance',
      },
      unsets: ['label'],
    },
    pick: 'Balanced',
  };
  await selectAlone(page, spec);
  expect(await exported(page)).toEqual(
    pane(
      selectNode(
        {
          name: 'plain-rendering-balance',
          value: 'balanced',
          ariaLabel: 'Plain Rendering Balance',
        },
        spec,
      ),
    ),
  );
});

test('builds Select › Visible Label', async ({ page }) => {
  const spec: SelectSpec = {
    choices: balanceChoices,
    props: {
      choices: { triggerWidth: 'fill' },
      text: {
        name: 'labeled-rendering-balance',
        label: 'Rendering Preference',
        hint: 'Controls how much rendering detail is shown.',
      },
    },
    pick: 'Balanced',
  };
  await selectAlone(page, spec);
  expect(await exported(page)).toEqual(
    pane(
      selectNode(
        {
          name: 'labeled-rendering-balance',
          value: 'balanced',
          label: 'Rendering Preference',
          triggerWidth: 'fill',
          hint: 'Controls how much rendering detail is shown.',
        },
        spec,
      ),
    ),
  );
});

test('builds Select › Compact Selected Text', async ({ page }) => {
  // The demo's renderSelected wraps the label in a no-wrap Text; the app
  // supplies it, so it is a param. The selected-text tokens belong to the
  // catalog stage, not the view.
  const spec: SelectSpec = {
    choices: [{ value: 'long', label: 'A Very Long Workspace Name' }],
    props: {
      choices: {
        presentation: 'toolbar-borderless',
        size: 'compact',
        triggerWidth: 'fit-content',
      },
      text: { name: 'compact-workspace', ariaLabel: 'Workspace' },
      unsets: ['label'],
    },
    pick: 'A Very Long Workspace Name',
    renderSelected: true,
  };
  await selectAlone(page, spec);
  await setCss(page, 'maxTriggerWidth', 'remify(160)');
  expect(await exported(page)).toEqual(
    pane(
      selectNode(
        {
          name: 'compact-workspace',
          value: 'long',
          ariaLabel: 'Workspace',
          presentation: 'toolbar-borderless',
          size: 'compact',
          triggerWidth: 'fit-content',
          maxTriggerWidth: { $css: 'remify(160)' },
        },
        spec,
      ),
    ),
  );
});

test('builds Select › Toolbar Icon', async ({ page }) => {
  await toolbarSelect(
    page,
    'Toolbar Icon',
    iconOnlyGroup('Rendering Mode'),
    toolbarIconSelect(
      'toolbar-default-rendering-balance',
      'Default Toolbar Rendering Balance',
    ),
  );
  expect(await exported(page)).toEqual(
    pane(
      toolbarGroupNode('Toolbar Icon', iconOnlyGroupProps('Rendering Mode'), [
        toolbarIconSelectNode(
          'toolbar-default-rendering-balance',
          'Default Toolbar Rendering Balance',
        ),
      ]),
    ),
  );
});

test('builds Select › Round Toolbar Icon', async ({ page }) => {
  await toolbarSelect(
    page,
    'Round Toolbar Icon',
    iconOnlyGroup('Workspace Sort', { choices: { shape: 'pill' } }),
    toolbarIconSelect('toolbar-round-rendering-balance', 'Workspace Sort'),
  );
  await turnOff(page, 'caret');
  expect(await exported(page)).toEqual(
    pane(
      toolbarGroupNode(
        'Round Toolbar Icon',
        iconOnlyGroupProps('Workspace Sort', { shape: 'pill' }),
        [
          toolbarIconSelectNode(
            'toolbar-round-rendering-balance',
            'Workspace Sort',
            { caret: false },
          ),
        ],
      ),
    ),
  );
});

test('builds Select › Round Toolbar Custom Icon', async ({ page }) => {
  // The demo's renderSelected draws the choice's icon; the app supplies it.
  await toolbarSelect(
    page,
    'Round Toolbar Custom Icon',
    iconOnlyGroup('Custom Workspace Sort', { choices: { shape: 'pill' } }),
    toolbarIconSelect(
      'toolbar-round-custom-rendering-balance',
      'Custom Workspace Sort',
      {},
      { renderSelected: true },
    ),
  );
  await turnOff(page, 'caret');
  expect(await exported(page)).toEqual(
    pane(
      toolbarGroupNode(
        'Round Toolbar Custom Icon',
        iconOnlyGroupProps('Custom Workspace Sort', { shape: 'pill' }),
        [
          toolbarIconSelectNode(
            'toolbar-round-custom-rendering-balance',
            'Custom Workspace Sort',
            { caret: false },
            { renderSelected: true },
          ),
        ],
      ),
    ),
  );
});

test('builds Select › Popup Note', async ({ page }) => {
  // The note starts shown and the device as 'phone'.
  const devices: readonly ChoiceSpec[] = [
    { value: 'phone', label: 'Phone', group: 'Handheld' },
    { value: 'tablet', label: 'Tablet', group: 'Handheld' },
    { value: 'laptop', label: 'Laptop', group: 'Desktop' },
  ];
  const note = 'Touch input and the on-screen keyboard aren’t emulated.';
  await toolbarSelect(
    page,
    'Preview Device',
    { flags: ['single'], text: { label: 'Preview Device' } },
    {
      choices: devices,
      props: {
        choices: {
          presentation: 'toolbar-borderless',
          focusRingOwner: 'group',
        },
        text: {
          name: 'popup-note-device',
          ariaLabel: 'Preview Device',
          popupNote: note,
        },
        unsets: ['label'],
      },
      pick: 'Phone',
    },
  );
  expect(await exported(page)).toEqual(
    pane(
      toolbarGroupNode(
        'Preview Device',
        { label: 'Preview Device', single: true },
        [
          selectNode(
            {
              name: 'popup-note-device',
              value: 'phone',
              ariaLabel: 'Preview Device',
              presentation: 'toolbar-borderless',
              focusRingOwner: 'group',
              popupNote: note,
            },
            { choices: devices },
          ),
        ],
      ),
    ),
  );
});

test('builds Select › Compact Toolbar Icon', async ({ page }) => {
  await toolbarSelect(
    page,
    'Compact Toolbar Icon',
    iconOnlyGroup('Rendering Mode', { choices: { size: 'compact' } }),
    toolbarIconSelect(
      'toolbar-rendering-balance',
      'Toolbar Rendering Balance',
      {
        choices: { size: 'compact' },
      },
    ),
  );
  expect(await exported(page)).toEqual(
    pane(
      toolbarGroupNode(
        'Compact Toolbar Icon',
        iconOnlyGroupProps('Rendering Mode', { size: 'compact' }),
        [
          toolbarIconSelectNode(
            'toolbar-rendering-balance',
            'Toolbar Rendering Balance',
            { size: 'compact' },
          ),
        ],
      ),
    ),
  );
});

test('builds Select › Long Options Within Viewport', async ({ page }) => {
  const long =
    'Attention Needed for Project Configuration and Deployment Settings';
  const choices: readonly ChoiceSpec[] = [
    { value: 'quiet', label: 'Quiet', iconData: 'bell' },
    { value: 'balanced', label: long, iconData: 'sliders-horizontal' },
    { value: 'explicit', label: 'Explicit', iconData: 'wrench' },
  ];
  // The group sits at the toolbar's trailing edge (KF-6NBJKY).
  await toolbarSelect(
    page,
    'Long Options Within Viewport',
    {
      choices: { size: 'compact', content: 'icon' },
      flags: ['single'],
      text: { label: 'Project Attention' },
    },
    {
      ...toolbarIconSelect('viewport-attention', 'Project Attention', {
        choices: { size: 'compact' },
      }),
      choices,
      pick: long,
    },
    'Trailing',
  );
  expect(await exported(page)).toEqual(
    pane(
      toolbarGroupNode(
        'Long Options Within Viewport',
        {
          label: 'Project Attention',
          size: 'compact',
          content: 'icon',
          single: true,
        },
        [
          selectNode(
            {
              name: 'viewport-attention',
              value: 'balanced',
              ariaLabel: 'Project Attention',
              presentation: 'toolbar-borderless',
              size: 'compact',
              selectedPresentation: 'icon-only',
              focusRingOwner: 'group',
            },
            { choices },
          ),
        ],
        'trailing',
      ),
    ),
  );
});

test('builds Select › Navigation Label', async ({ page }) => {
  const spec: SelectSpec = {
    choices: ['Quiet', 'Balanced', 'Explicit'].map((word) => ({
      value: word.toLowerCase(),
      label: `${word} Navigation Workspace`,
    })),
    props: {
      choices: {
        presentation: 'navigation',
        triggerWidth: 'max-content',
        size: 'compact',
      },
      text: {
        name: 'navigation-rendering-balance',
        ariaLabel: 'Navigation Rendering Balance',
        labelMaxWidth: '120',
      },
      unsets: ['label'],
    },
    pick: 'Balanced Navigation Workspace',
  };
  await selectAlone(page, spec);
  expect(await exported(page)).toEqual(
    pane(
      selectNode(
        {
          name: 'navigation-rendering-balance',
          value: 'balanced',
          ariaLabel: 'Navigation Rendering Balance',
          presentation: 'navigation',
          triggerWidth: 'max-content',
          size: 'compact',
          labelMaxWidth: 120,
        },
        spec,
      ),
    ),
  );
});

test('builds Select › View Title', async ({ page }) => {
  // selectViewTitle starts as 'queue'. A List with no gap holds the toolbar
  // and its rows (KF-RV23XY).
  const views: readonly ChoiceSpec[] = [
    { value: 'queue', label: 'Queue' },
    { value: 'active', label: 'Active' },
    { value: 'archive', label: 'Archive' },
  ];
  const rows = ['Review Incoming Tickets', 'Check Assigned Work'];
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'none');
  await dataAttribute(page, 'data-demo-section', 'select-view-title');
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await dragComponent(page, 'ToolbarControlGroup', () =>
    zoneSpot(page, 'Leading'),
  );
  await select(page, /^Toolbar(?!Text|Control|Button)/);
  await unset(page, 'label');
  await select(page, /^ToolbarControlGroup/);
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  await select(page, /^ToolbarButton/);
  await inspectorOverview(page);
  await page.locator('[data-action="editor-delete"]').click();
  await select(page, /^ToolbarControlGroup/);
  await addChild(page, 'Select');
  await configureSelect(page, {
    choices: views,
    props: {
      choices: { presentation: 'title' },
      flags: ['focusRingInset'],
      text: { name: 'view-title-demo', ariaLabel: 'Ticket View' },
      unsets: ['label'],
    },
    pick: 'Queue',
  });
  await select(page, /^List/);
  await addChild(page, 'List');
  await choose(page, 'gap', 'none');
  for (const label of rows) {
    await select(page, /^List(?![A-Z])/, 1);
    await addChild(page, 'ListItem');
    await applySpec(page, { text: { label, action: 'select-demo-ticket' } });
  }
  await expect(canvas(page).locator('.kui-list-item')).toHaveCount(2);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        {
          gap: 'none',
          rootAttributes: { 'data-demo-section': 'select-view-title' },
        },
        {
          children: [
            node('toolbar', undefined, {
              leading: [
                node(
                  'toolbar-control-group',
                  { appearance: 'borderless', single: true },
                  {
                    children: [
                      selectNode(
                        {
                          name: 'view-title-demo',
                          value: 'queue',
                          ariaLabel: 'Ticket View',
                          presentation: 'title',
                          focusRingInset: true,
                        },
                        { choices: views },
                      ),
                    ],
                  },
                ),
              ],
            }),
            node(
              'list',
              { gap: 'none' },
              {
                children: rows.map((label) =>
                  node('list-item', { label, action: 'select-demo-ticket' }),
                ),
              },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds Select › Inline Status Badge', async ({ page }) => {
  // The demo's renderSelected draws a success Badge; the app supplies it.
  const spec: SelectSpec = {
    choices: toolbarChoices,
    props: {
      choices: { presentation: 'inline' },
      text: { name: 'inline-status', ariaLabel: 'Status' },
      unsets: ['label'],
    },
    pick: 'Balanced',
    renderSelected: true,
  };
  await selectAlone(page, spec);
  await turnOff(page, 'caret');
  expect(await exported(page)).toEqual(
    pane(
      selectNode(
        {
          name: 'inline-status',
          value: 'balanced',
          ariaLabel: 'Status',
          presentation: 'inline',
          caret: false,
        },
        spec,
      ),
    ),
  );
});

test('builds Select › Placeholder', async ({ page }) => {
  const spec: SelectSpec = {
    choices: [],
    props: {
      flags: ['placeholder'],
      text: {
        name: 'select-placeholder',
        label: 'Rendering Balance',
        ariaLabel: 'Rendering Balance',
        hint: 'Loading selection options.',
      },
      unions: { value: ['Text…', ''] },
    },
  };
  await selectAlone(page, spec);
  expect(await exported(page)).toEqual(
    pane(
      selectNode(
        {
          name: 'select-placeholder',
          value: '',
          label: 'Rendering Balance',
          ariaLabel: 'Rendering Balance',
          hint: 'Loading selection options.',
          placeholder: true,
        },
        spec,
      ),
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
    await openConfigure(page, 'Configure choices');
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
    await showProp(page, 'icon');
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
  await openConfigure(page, 'Configure choices');
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
  await openConfigure(page, 'Configure choices');
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

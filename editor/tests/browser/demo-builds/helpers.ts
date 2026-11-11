// Shared steps and expected nodes for the demo-build specs (KF-JN4PF5:
// build every ux-demo configuration in the editor; KF-5MVBPB: split by
// component group).
import { expect, type Page } from '@playwright/test';

import { area, inspectorOverview, inspectorTop } from '../areas.js';
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
  node,
  outlineRow,
  page as pane,
  pickIcon,
  select,
  setField,
  setText,
  showConfigure,
  showParam,
  showProp,
  turnFieldOn,
  turnOff,
  turnOn,
  unset,
  zoneSpot,
} from '../build.js';

/** A wrapping Row of three log-more Buttons, as `[label, tone, emphasis]`. */
export async function buttonRow(
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
export const buttonNodes = (
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

/** A Button FieldSpec plus the icon its `icon` content holds. */
export type ButtonSpec = FieldSpec & { readonly glyph?: string };

/**
 * Places `buttons` in a wrapping Row (inside `parent` when given), each set
 * up by its spec, then gives the Row `data` attributes.
 */
export async function buttons(
  page: Page,
  specs: readonly ButtonSpec[],
  row: FieldSpec = {},
) {
  await stacked(page, 'Row', 'Button', specs, async () => {
    await turnOn(page, 'wrap');
    await applySpec(page, row);
  });
  for (const [index, spec] of specs.entries()) {
    if (!spec.glyph) continue;
    await select(page, /^Button(?![A-Z])/, index);
    await addIcon(page, 'icon', spec.glyph);
  }
  await expect(canvas(page).locator('.kui-button')).toHaveCount(specs.length);
}

/** A Button node, holding `glyph`'s icon when given. */
export const buttonNode = (props: Record<string, unknown>, glyph?: string) =>
  node('button', props, glyph ? { icon: [icon(glyph)] } : undefined);

/** The wrapping Row `buttons` builds. */
export const buttonRowNode = (
  children: unknown[],
  rootAttributes?: Record<string, string>,
) =>
  node(
    'row',
    { wrap: true, ...(rootAttributes ? { rootAttributes } : {}) },
    { children },
  );

/** Promotes prop `label` of the selected node to a param. */
export async function promote(page: Page, label: string) {
  // KF-QWDPM3: Promote to a param is on the Properties overview.
  await area(page, 'Properties');
  const picker = page.locator('[data-editor-promote]');
  await picker.locator('.kui-select__trigger').click();
  await picker.getByRole('option', { name: label, exact: true }).click();
  await page.getByRole('button', { name: 'Promote', exact: true }).click();
}

/**
 * Renames the selected node's param `from` to `to` from its bound prop's
 * row (KF-1HEZZZ), which renames every use of it too.
 */
export async function nameParam(page: Page, from: string, to: string) {
  await showParam(page, from);
  const field = page
    .locator(`[data-editor-param="${from}"] input`)
    .filter({ visible: true });
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(to);
  await page.keyboard.press('Enter');
  await expect(
    page.locator(`[data-editor-param="${to}"]`).filter({ visible: true }),
  ).toHaveCount(1);
}

/** Binds prop `label` of the selected node to source `source`. */
export async function bind(page: Page, label: string, source: string) {
  // KF-QWDPM3: Bind a prop is on the Properties overview.
  await area(page, 'Properties');
  for (const [part, option] of [
    ['prop', label],
    ['source', source],
  ] as const) {
    const control = page.locator(`[data-editor-bind="${part}"]`);
    await control.locator('.kui-select__trigger').click();
    await control.getByRole('option', { name: option, exact: true }).click();
  }
}

/** The four focus-ring-inset Buttons of the clipping examples. */
export const insetButtons: readonly ButtonSpec[] = [
  ['Dismiss', undefined],
  ['Confirm', 'brand'],
  ['Apply', 'success'],
  ['Erase', 'danger'],
].map(([children, tone]) => ({
  ...(tone ? { choices: { tone } } : {}),
  flags: ['focusRingInset'],
  text: { children: children!, action: 'log-more' },
}));

export const insetButtonNodes = () =>
  insetButtons.map((spec) =>
    buttonNode({
      children: spec.text!.children,
      ...(spec.choices ? { tone: spec.choices.tone } : {}),
      focusRingInset: true,
      action: 'log-more',
    }),
  );

/** A SplitButton FieldSpec plus the icon its `icon` content holds. */
export type SplitSpec = FieldSpec & { readonly glyph?: string };

/** A SplitButton spec for its four required strings, then `rest`. */
export const split = (
  label: string,
  action: string,
  optionsLabel: string,
  optionsAction: string,
  rest: SplitSpec = {},
): SplitSpec => ({
  ...rest,
  text: { label, action, optionsLabel, optionsAction, ...rest.text },
});

/** The SplitButton node a `split` spec builds, with `props` added. */
export const splitNode = (
  label: string,
  action: string,
  optionsLabel: string,
  optionsAction: string,
  props: Record<string, unknown> = {},
  glyph?: string,
) =>
  node(
    'split-button',
    { label, action, optionsLabel, optionsAction, ...props },
    glyph ? { icon: [icon(glyph)] } : undefined,
  );

/** Places `specs` in a wrapping Row configured by `row`. */
export async function splitButtons(
  page: Page,
  specs: readonly SplitSpec[],
  row: FieldSpec = {},
) {
  await stacked(page, 'Row', 'SplitButton', specs, async () => {
    await turnOn(page, 'wrap');
    await applySpec(page, row);
  });
  for (const [index, spec] of specs.entries()) {
    if (!spec.glyph) continue;
    await select(page, /^SplitButton/, index);
    await addIcon(page, 'icon', spec.glyph);
  }
  await expect(canvas(page).locator('.kui-split-button')).toHaveCount(
    specs.length,
  );
}

/** A focus-ring-inset SplitButton of the clipping examples. */
export const insetSplit = (label: string, tone?: string): SplitSpec =>
  split(
    label,
    'log-split-button-pill',
    `${label} Options`,
    'log-split-button-pill-options',
    { flags: ['focusRingInset'], ...(tone ? { choices: { tone } } : {}) },
  );

export const insetSplitNode = (label: string, tone?: string) =>
  splitNode(
    label,
    'log-split-button-pill',
    `${label} Options`,
    'log-split-button-pill-options',
    { focusRingInset: true, ...(tone ? { tone } : {}) },
  );

/**
 * A List (gap xs) of TextFields, one per entry of `fields`: each entry's
 * `text` props are typed, its `choices` chosen and its `flags` turned on.
 */
export type FieldSpec = {
  readonly text?: Readonly<Record<string, string>>;
  readonly choices?: Readonly<Record<string, string>>;
  readonly flags?: readonly string[];
  /** A `string | number` prop: its kind (`Text…`/`Number…`), then its value. */
  readonly unions?: Readonly<Record<string, readonly [string, string]>>;
  /** Text props cleared with their Not set toggle (a seeded placeholder). */
  readonly unsets?: readonly string[];
  /** Boolean props on by default, turned off. */
  readonly offs?: readonly string[];
  /** Data attributes, `[name, value]`, added to the node's root. */
  readonly data?: readonly (readonly [string, string])[];
};

/** Applies a FieldSpec to the selected node. */
export async function applySpec(page: Page, field: FieldSpec) {
  // Choices first: a type or multiline can change which props show.
  for (const [name, option] of Object.entries(field.choices ?? {}))
    await choose(page, name, option);
  for (const name of field.flags ?? []) await turnOn(page, name);
  for (const name of field.offs ?? []) await turnOff(page, name);
  for (const [name, value] of Object.entries(field.text ?? {}))
    await setText(page, name, value);
  for (const [name, [kind, value]] of Object.entries(field.unions ?? {})) {
    await choose(page, name, kind);
    const input = page
      .locator(
        `[data-editor-prop="${name}"]:not([data-editor-kind="choice"]) input`,
      )
      .filter({ visible: true })
      .first();
    await input.fill(value);
    await input.press('Enter');
  }
  for (const name of field.unsets ?? []) await unset(page, name);
  for (const [index, [name, value]] of (field.data ?? []).entries())
    await dataAttribute(page, name, value, index);
}

/**
 * Places `container` (configured by `setup`) holding one `component` per
 * entry of `items`, each configured by its spec.
 */
export async function stacked(
  page: Page,
  container: string,
  component: string,
  items: readonly FieldSpec[],
  setup: () => Promise<void> = async () => {},
) {
  await dragComponent(page, container, () => emptySpot(page));
  await dragComponent(page, component, () => emptySpot(page));
  await select(page, new RegExp(`^${container}`));
  await setup();
  const own = new RegExp(`^${component}(?![A-Z])`);
  await select(page, own);
  for (let copy = 1; copy < items.length; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  for (const [index, item] of items.entries()) {
    await select(page, own, index);
    await applySpec(page, item);
  }
}

/** A List (gap xs) of TextFields, one per entry of `fields`. */
export async function textFields(page: Page, fields: readonly FieldSpec[]) {
  await stacked(page, 'List', 'TextField', fields, () =>
    choose(page, 'gap', 'xs'),
  );
  await expect(canvas(page).locator('.kui-text-field')).toHaveCount(
    fields.length,
  );
}

/** The List `textFields` builds, holding `props` per field. */
export const textFieldList = (props: readonly Record<string, unknown>[]) =>
  pane(
    node(
      'list',
      { gap: 'xs' },
      { children: props.map((each) => node('text-field', each)) },
    ),
  );

export const xsList = (
  component: string,
  props: readonly Record<string, unknown>[],
) =>
  pane(
    node(
      'list',
      { gap: 'xs' },
      { children: props.map((each) => node(component, each)) },
    ),
  );

/** A Chip configured by `spec`, removable through the demo's action. */
export async function chip(page: Page, text: string, spec: FieldSpec) {
  await dragComponent(page, 'Chip', () => emptySpot(page));
  await select(page, /^Chip(?![A-Z])/);
  await setText(page, 'children', text);
  await applySpec(page, spec);
  await setText(page, 'removeAction', 'log-chip-remove');
}

/** Types builder call `value` into css-value prop `name` of the selection. */
export async function setCss(page: Page, name: string, value: string) {
  await showProp(page, name);
  // A length-or-keyword prop picks Custom… to show its builder field.
  const css = page
    .locator(`[data-editor-prop="${name}"][data-editor-kind="css"]`)
    .filter({ visible: true });
  if (
    !(await css.count()) &&
    (await page
      .locator(`[data-editor-prop="${name}"]`)
      .filter({ visible: true })
      .count())
  )
    await choose(page, name, 'Custom…');
  const field = page
    .locator(`[data-editor-prop="${name}"][data-editor-kind="css"]`)
    .or(page.locator(`[data-editor-prop="${name}"]:not([data-editor-kind])`))
    .filter({ visible: true })
    .getByRole('textbox')
    .first();
  await field.fill(value);
  await field.press('Enter');
}

/** A ValueTableRow FieldSpec plus the icon its `icon` zone holds. */
export type RowSpec = FieldSpec & { readonly glyph?: string };

/**
 * Configures the ValueTable already placed (set up by `table`) and fills
 * it with one ValueTableRow per spec.
 */
export async function valueTable(
  page: Page,
  table: FieldSpec,
  rows: readonly RowSpec[],
  css: Readonly<Record<string, string>> = {},
) {
  await select(page, /^ValueTable(?![A-Z])/);
  await applySpec(page, table);
  for (const [name, value] of Object.entries(css))
    await setCss(page, name, value);
  // The table arrived holding a placeholder Text, which the rows replace.
  await addInto(page, /^ValueTable(?![A-Z])/, 'ValueTableRow', 0, 0);
  for (let row = 1; row < rows.length; row += 1)
    await addInto(page, /^ValueTable(?![A-Z])/, 'ValueTableRow');
  for (const [index, row] of rows.entries()) {
    await select(page, /^ValueTableRow/, index);
    await applySpec(page, row);
    if (row.glyph) await addIcon(page, 'icon', row.glyph);
  }
  await expect(
    canvas(page).locator('.kui-value-table__row[data-kerf-node]'),
  ).toHaveCount(rows.length);
}

/** The ValueTableRow nodes `rows` build, given each row's props. */
export const valueRows = (
  rows: readonly RowSpec[],
  props: readonly Record<string, unknown>[],
) =>
  rows.map((row, index) =>
    node(
      'value-table#ValueTableRow',
      props[index]!,
      row.glyph ? { icon: [icon(row.glyph)] } : undefined,
    ),
  );

/** A row's spec and props from its label, value, icon, and placeholder. */
export function valueRow(
  label: string,
  value: string,
  glyph?: string,
  placeholder = false,
): [RowSpec, Record<string, unknown>] {
  return [
    {
      text: { label, value },
      flags: placeholder ? ['placeholder'] : [],
      ...(glyph ? { glyph } : {}),
    },
    { label, value, ...(placeholder ? { placeholder: true } : {}) },
  ];
}

/**
 * Types `value` into a multi-line text prop: Enter starts each new line,
 * and leaving the field (Tab) commits it (KF-8FCJ02).
 */
export async function setLines(page: Page, name: string, value: string) {
  await showProp(page, name);
  const field = page
    .locator(`[data-editor-prop="${name}"]`)
    .filter({ visible: true })
    .first()
    .locator('textarea');
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  if (value) await page.keyboard.type(value);
  else await page.keyboard.press('Backspace');
  await page.keyboard.press('Tab');
  await expect(field).toHaveValue(value);
}

/** The ValuePreview demos' long value: line breaks and a long token. */
export const LONG_VALUE = [
  'A title with a deliberate line break',
  'Second line keeps its indentation and a long token:',
  `    ${'recorded-source-'.repeat(18)}`,
  'A final line remains available by scrolling.',
].join('\n');

/** Adds a SunkenPanel holding a ValuePreview to `parent`, set up by `spec`. */
export async function preview(
  page: Page,
  label: string,
  value: string,
  css: Readonly<Record<string, string>> = {},
) {
  await addInto(page, /^Pane/, 'SunkenPanel');
  await addChild(page, 'ValuePreview');
  await setText(page, 'label', label);
  await setLines(page, 'value', value);
  for (const [name, builder] of Object.entries(css))
    await setCss(page, name, builder);
}

export const previewNode = (props: Record<string, unknown>) =>
  node('sunken-panel', undefined, {
    children: [node('value-preview', props)],
  });

/** The ColumnExplorer demos' nodes (Music loads on demand). */
export const EXPLORER_NODES = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button-tsx', label: 'button.tsx' },
          { id: 'list-item-tsx', label: 'list-item.tsx' },
          {
            id: 'legacy-tsx',
            label: 'legacy.tsx',
            description: 'Read-only',
            disabled: true,
          },
        ],
      },
      { id: 'notes-md', label: 'notes.md' },
    ],
  },
  { id: 'music', label: 'Music', hasChildren: true },
  { id: 'readme-md', label: 'README.md' },
];

export const EXPLORER_ICONS: readonly (readonly [readonly number[], string])[] =
  [
    [[0], 'folder'],
    [[0, 0], 'folder'],
    [[0, 0, 0], 'file-code'],
    [[0, 0, 1], 'file-code'],
    [[0, 0, 2], 'file-code'],
    [[0, 1], 'file'],
    [[1], 'music'],
    [[2], 'file'],
  ];

/** Places a ColumnExplorer with the demo's nodes, icons, and `path`. */
export async function explorer(
  page: Page,
  spec: FieldSpec,
  path: readonly string[],
) {
  await dragComponent(page, 'ColumnExplorer', () => emptySpot(page));
  await select(page, /^ColumnExplorer/);
  await applySpec(page, spec);
  await editAsJson(page, 'nodes', EXPLORER_NODES);
  await setTags(page, 'path', path);
  for (const [at, glyph] of EXPLORER_ICONS) {
    await treeNodeZone(page, at, 'icon', /^ColumnExplorer/);
    await area(page, 'Properties');
    await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
  }
}

/** The icon zones the ColumnExplorer demos' nodes fill. */
export const explorerZones = () =>
  Object.fromEntries(
    EXPLORER_ICONS.map(([at, glyph]) => [treeZone(at, 'icon'), [icon(glyph)]]),
  );

export const GAUGE_RATE = {
  text: { value: '420', max: '1000', unit: 'tok/min' },
} as const;

/** One choice of a `choices` prop, as the Configure choices form sets it. */
export type ChoiceSpec = {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
  readonly title?: string;
  readonly disabled?: boolean;
  /** `transparent`, or a color builder call typed through Custom…. */
  readonly swatch?: string;
  /** An icon placed in the choice's node zone (`icon` or `content`). */
  readonly glyph?: string;
  /** Icon data picked in the form (a Select choice's `icon`). */
  readonly iconData?: string;
  readonly group?: string;
  readonly disabledReason?: string;
};

/**
 * Clicks a prop's Configure button and waits for what it opens: a form
 * pushed onto the Inspector (a new top view, or a new Back button in a
 * dialog's stack) or a dialog. KF-GHMFPC: the
 * dropped-click retry this used to need is gone. The drop it hid was WebKit
 * scrolling the Inspector about 300ms after an edit, when the debounced
 * autosave rewrote the Preview header's status, so a click aimed at a stable
 * button landed on the row below. KF-NV427Y fixed that late scroll-anchoring
 * jump (the Inspector's panes opt out of anchoring), so the click no longer
 * waits for the save to settle.
 */
export async function openConfigure(
  page: Page,
  name: string,
  scope: Pick<Page, 'getByRole'> = page,
) {
  // KF-QWDPM3: a prop's Configure row is on its group's Properties page.
  if (scope === page) await showConfigure(page, name);
  const backs = page
    .getByRole('button', { name: 'Back', exact: true })
    .filter({ visible: true });
  const dialogs = page.locator('dialog[open]');
  // KF-QWDPM3: over a Properties page, a pushed form replaces the page's
  // Back rather than adding one; the Inspector's top view changes instead.
  const top = () => inspectorTop(page).getAttribute('data-nav-key');
  const before = {
    backs: await backs.count(),
    dialogs: await dialogs.count(),
    top: await top(),
  };
  await scope
    .getByRole('button', { name })
    .filter({ visible: true })
    .first()
    .click();
  await expect(async () => {
    expect(
      (await backs.count()) > before.backs ||
        (await dialogs.count()) > before.dialogs ||
        (await top()) !== before.top,
    ).toBe(true);
  }).toPass({ timeout: 10_000 });
}

/**
 * Fills the selected `owner`'s `choices` from Configure choices (adding rows
 * past the three seeded ones), then places each choice's icon in its `zone`
 * through the form's content row.
 */
export async function configureChoices(
  page: Page,
  owner: RegExp,
  choices: readonly ChoiceSpec[],
  zone = 'icon',
) {
  await select(page, owner);
  await openConfigure(page, 'Configure choices');
  // A dialog the canvas shows embedded is document content, not the form's.
  const dialog = page.locator('dialog[open]:not([data-editor-canvas] dialog)');
  for (let added = 3; added < choices.length; added += 1)
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  for (let extra = 3; extra > choices.length; extra -= 1)
    await dialog
      .getByRole('button', { name: `Remove Choice ${extra}`, exact: true })
      .click();
  for (const [index, choice] of choices.entries()) {
    await dialog.getByText(`Choice ${index + 1}`, { exact: true }).click();
    await setField(page, 'choices', [index, 'value'], choice.value);
    await setField(page, 'choices', [index, 'label'], choice.label);
    if (choice.hint)
      await setField(page, 'choices', [index, 'hint'], choice.hint);
    if (choice.title)
      await setField(page, 'choices', [index, 'title'], choice.title);
    if (choice.group)
      await setField(page, 'choices', [index, 'group'], choice.group);
    if (choice.disabled)
      await turnFieldOn(page, 'choices', [index, 'disabled']);
    if (choice.disabledReason)
      await setField(
        page,
        'choices',
        [index, 'disabledReason'],
        choice.disabledReason,
      );
    if (choice.iconData)
      await pickIcon(
        page,
        dialog.locator('[data-editor-icon-place]'),
        choice.iconData,
      );
    if (choice.swatch === 'transparent')
      await chooseField(page, 'choices', [index, 'swatch'], 'transparent');
    else if (choice.swatch) {
      await chooseField(page, 'choices', [index, 'swatch'], 'Custom…');
      await setField(page, 'choices', [index, 'swatch'], choice.swatch);
    }
    await dialog
      .getByRole('button', { name: 'Back', exact: true })
      .filter({ visible: true })
      .click();
  }
  // A choice may itself be labeled Done.
  await dialog.locator('[data-action="editor-field-done"]').click();
  for (const [index, choice] of choices.entries()) {
    if (!choice.glyph) continue;
    await select(page, owner);
    await openConfigure(page, 'Configure choices');
    await dialog.getByText(choice.label, { exact: true }).click();
    // The content row closes the form.
    await page
      .locator(`[data-editor-content-add="choices.${index}.${zone}"]`)
      .click();
    await expect(dialog).toHaveCount(0);
    // An icon zone's row places the icon itself; a content zone's row
    // leads to Add a child, its zone chosen. Either way the icon is selected.
    if (zone === 'icon') await area(page, 'Properties');
    else await addChild(page, 'LucideIcon');
    await pickIcon(
      page,
      page.locator('[data-editor-icon-place]'),
      choice.glyph,
    );
  }
}

/** The `choices` value a list of ChoiceSpecs exports (icons are zones). */
export const choiceValues = (choices: readonly ChoiceSpec[]) =>
  choices.map(({ glyph: _glyph, swatch, iconData, ...rest }) => ({
    ...rest,
    ...(iconData ? { icon: { $icon: iconData }, iconName: iconData } : {}),
    ...(swatch === 'transparent'
      ? { swatch }
      : swatch
        ? { swatch: { $css: swatch } }
        : {}),
  }));

/** The icon zones a list of ChoiceSpecs exports. */
export const choiceZones = (choices: readonly ChoiceSpec[], zone = 'icon') =>
  Object.fromEntries(
    choices.flatMap((choice, index) =>
      choice.glyph ? [[`choices.${index}.${zone}`, [icon(choice.glyph)]]] : [],
    ),
  );

/**
 * Picks `labels` in an array value's multi-choice control (KF-8MEWP2), in
 * choice order; none picked is `[]`.
 */
export async function chooseValues(page: Page, labels: readonly string[]) {
  await showProp(page, 'value');
  const control = page
    .locator('[data-editor-prop="value"][data-editor-kind="value-choices"]')
    .filter({ visible: true });
  await expect(control).toBeVisible();
  const boxes = control.locator('input[type="checkbox"]');
  for (let index = 0; index < (await boxes.count()); index += 1) {
    const box = boxes.nth(index);
    const name = await box.evaluate(
      (input) => input.closest('label')?.textContent?.trim() ?? '',
    );
    if ((await box.isChecked()) !== labels.includes(name)) await box.click();
  }
  const checked = await control
    .locator('input:checked')
    .evaluateAll((inputs) =>
      inputs.map((input) => input.closest('label')?.textContent?.trim()),
    );
  expect(checked).toEqual(labels);
}

/** Picks the empty value `""` in a value picker (KF-8MEWP2). */
export async function chooseEmptyValue(page: Page) {
  await choose(page, 'value', 'Empty ("")');
}

export const channelChoices: readonly ChoiceSpec[] = [
  { value: 'email', label: 'Email' },
  {
    value: 'push',
    label: 'Push notifications',
    hint: 'On devices where you are signed in.',
  },
  { value: 'digest', label: 'Weekly digest' },
  { value: 'sms', label: 'Text messages', disabled: true },
];

export const colorChoices: readonly ChoiceSpec[] = [
  { value: 'transparent', label: 'Transparent', swatch: 'transparent' },
  ...(
    [
      ['blue', '#3b82f6'],
      ['green', '#22c55e'],
      ['orange', '#f97316'],
      ['red', '#ef4444'],
      ['purple', '#a855f7'],
      ['pink', '#ec4899'],
      ['teal', '#14b8a6'],
      ['gray', '#6b7280'],
    ] as const
  ).map(([value, hex]) => ({
    value,
    label: value[0]!.toUpperCase() + value.slice(1),
    swatch: `fillColor("${hex}")`,
  })),
];

/** A ChoiceChips group: its choices, then `spec`'s props. */
export async function choiceChips(
  page: Page,
  choices: readonly ChoiceSpec[],
  spec: FieldSpec,
) {
  await dragComponent(page, 'ChoiceChips', () => emptySpot(page));
  await configureChoices(page, /^ChoiceChips/, choices);
  await select(page, /^ChoiceChips/);
  await applySpec(page, spec);
  await expect(canvas(page).locator('.kui-choice-chips')).toHaveCount(1);
}

/**
 * Replaces list prop `prop` of the selected node with `value` through its
 * Configure dialog's Edit as JSON, as a person pastes a list in.
 */
export async function editAsJson(page: Page, prop: string, value: unknown) {
  await showProp(page, prop);
  await page
    .locator(`[data-editor-open='${JSON.stringify({ prop, path: [] })}']`)
    // A row of a form the stack has left stays in the page, hidden.
    .filter({ visible: true })
    .first()
    .click();
  // A set list opens its form in a dialog; an unset one opens it in place
  // of the Inspector's Properties. A dialog the canvas shows embedded
  // (KF-SYGSD0) is document content, not the form's.
  const dialog = page.locator('dialog[open]:not([data-editor-canvas] dialog)');
  // The form remembers JSON mode once a list was edited that way.
  const toJson = page
    .getByRole('button', { name: 'Edit as JSON' })
    .filter({ visible: true });
  const json = page.locator('textarea:visible').first();
  await expect(toJson.first().or(json).first()).toBeVisible();
  if (await toJson.count()) await toJson.first().click();
  await json.fill(JSON.stringify(value, null, 2));
  await json.press('ControlOrMeta+Enter');
  if (await dialog.count()) {
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toHaveCount(0);
  } else await back(page);
}

/**
 * Replaces a tags prop's tags: Enter adds each new one, then the old ones
 * are removed (adding first keeps a required list from emptying).
 */
export async function setTags(
  page: Page,
  prop: string,
  tags: readonly string[],
) {
  await showProp(page, prop);
  // A union's tags follow its type Select, which shares the prop name.
  const control = page
    .locator(`[data-editor-prop="${prop}"]:not([data-editor-kind="choice"])`)
    .filter({ visible: true })
    .first();
  const remove = control.getByRole('button', { name: /^Remove / });
  const old = await remove.count();
  // A click could land on a chip; focus the editor and type at its end.
  await control.getByRole('searchbox').focus();
  await page.keyboard.press('ControlOrMeta+End');
  for (const tag of tags) {
    await page.keyboard.type(tag);
    await page.keyboard.press('Enter');
  }
  await expect(remove).toHaveCount(old + tags.length);
  for (let left = old; left > 0; left -= 1) {
    await remove.first().click();
    await expect(remove).toHaveCount(left - 1 + tags.length);
  }
}

/** A ColorSwatch as the demos spell it: the color's hex, upper-cased. */
export const swatch = (value: string) => ({
  value,
  label: value.toUpperCase(),
  color: { $css: `fillColor("${value}")` },
});

export const PALETTE = [
  { value: 'none', label: 'No Color', color: 'transparent' },
  ...(
    [
      ['#ff3b30', 'Red'],
      ['#ff9500', 'Orange'],
      ['#ffcc00', 'Yellow'],
      ['#34c759', 'Green'],
      ['#00c7be', 'Teal'],
      ['#0a84ff', 'Blue'],
      ['#5e5ce6', 'Indigo'],
      ['#bf5af2', 'Purple'],
      ['#ff375f', 'Pink'],
      ['#8e8e93', 'Gray'],
    ] as const
  ).map(([value, label]) => ({
    value,
    label,
    color: { $css: `fillColor("${value}")` },
  })),
];

/** Sets up the `nth` ColorSwatches: its swatches, props, then value. */
export async function colorSwatches(
  page: Page,
  nth: number,
  swatches: readonly unknown[],
  spec: FieldSpec,
  pick: string,
) {
  await select(page, /^ColorSwatches/, nth);
  await editAsJson(page, 'swatches', swatches);
  await applySpec(page, spec);
  // The value picks a swatch by its label (KF-H1X3S7).
  await choose(page, 'value', pick);
}

/** The brand send Button of the composer examples, in its trailing zone. */
export async function composerSend(page: Page, label: string, id: string) {
  // The seeded trailing Text gives way to the Button.
  await select(page, /^Text(?![A-Z])/);
  await area(page, 'Flow');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await select(page, /^MessageComposer/);
  await addChild(page, 'Button', 'trailing');
  await applySpec(page, {
    choices: { tone: 'brand' },
    text: { children: label, action: 'send-composer-demo' },
    data: [['data-message-composer-id', id]],
  });
}

export const composerSendNode = (label: string, id: string) =>
  node('button', {
    children: label,
    tone: 'brand',
    action: 'send-composer-demo',
    rootAttributes: { 'data-message-composer-id': id },
  });

/** A quiet compact readout Text, live, carrying data hook `hook`. */
export async function readout(page: Page, text: string, hook: string) {
  await applySpec(page, {
    choices: {
      variant: 'span',
      tone: 'quiet',
      size: 'compact',
      live: 'polite',
    },
    text: { children: text },
    data: [[hook, '']],
  });
}

export const readoutNode = (text: string, hook: string) =>
  node('text', {
    children: text,
    variant: 'span',
    tone: 'quiet',
    size: 'compact',
    live: 'polite',
    rootAttributes: { [hook]: '' },
  });

/** The demos' DemoListInsetPane: a SunkenPanel named for the example. */
export async function insetPane(page: Page) {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await select(page, /^SunkenPanel/);
  await setText(page, 'ariaLabel', 'List Inset Example');
}

export const insetPaneNode = (...children: unknown[]) =>
  node('sunken-panel', { ariaLabel: 'List Inset Example' }, { children });

/** A reference StateBanner with a check icon, added to the SunkenPanel. */
export async function referenceBanner(
  page: Page,
  tone: string,
  detail: string,
) {
  await select(page, /^SunkenPanel/);
  await addChild(page, 'StateBanner');
  await applySpec(page, {
    choices: { tone },
    text: { title: 'A Content Item, for Reference', detail },
  });
  await addChild(page, 'LucideIcon', 'icon');
  await pickIcon(page, page.locator('[data-editor-icon-place]'), 'check');
}

export const referenceBannerNode = (tone: string, detail: string) =>
  node(
    'state-banner',
    { tone, title: 'A Content Item, for Reference', detail },
    { icon: [icon('check')] },
  );

/** Adds a ListInsetText reading `text` (on `sides`) to the SunkenPanel. */
export async function insetText(page: Page, text: string, sides?: string) {
  await select(page, /^SunkenPanel/);
  await addChild(page, 'ListInsetText');
  await setText(page, 'children', text);
  if (sides) await choose(page, 'sides', sides);
}

export const insetTextNode = (children: string, sides?: string) =>
  node('list-inset-text', { children, ...(sides ? { sides } : {}) });

/**
 * Adds a ListInsetControl (on `sides`) holding a `component`, set up by
 * `spec`, to the SunkenPanel; the inset's seeded text gives way to it.
 */
export async function insetControl(
  page: Page,
  component: string,
  spec: FieldSpec,
  sides?: string,
) {
  await select(page, /^SunkenPanel/);
  await addChild(page, 'ListInsetControl');
  if (sides) await choose(page, 'sides', sides);
  await addChild(page, component);
  // Adding a child turned the inset's seeded text into a Text node.
  await select(page, /^Text(?![A-Z])/);
  await area(page, 'Flow');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await select(page, new RegExp(`^${component}(?![A-Z])`), -1);
  await applySpec(page, spec);
}

export const insetControlNode = (child: unknown, sides?: string) =>
  node('list-inset-control', sides ? { sides } : undefined, {
    children: [child],
  });

/** A ListItem FieldSpec plus its icon and a trailing span Text. */
export type ItemSpec = FieldSpec & {
  readonly glyph?: string;
  readonly trailing?: string;
};

/** Gives the `index`th node named `name` its icon and trailing Text. */
export async function itemContent(
  page: Page,
  name: RegExp,
  index: number,
  { glyph, trailing }: ItemSpec,
) {
  if (glyph) {
    await select(page, name, index);
    await addIcon(page, 'icon', glyph);
  }
  if (!trailing) return;
  await select(page, name, index);
  await addChild(page, 'Text', 'trailing');
  await applySpec(page, {
    choices: { variant: 'span' },
    text: { children: trailing },
  });
}

/** A List of ListItems, each set up by its spec. */
export async function listItems(
  page: Page,
  items: readonly ItemSpec[],
  data?: readonly [string, string],
) {
  await stacked(page, 'List', 'ListItem', items, async () => {
    if (data) await dataAttribute(page, ...data);
  });
  for (const [index, item] of items.entries())
    await itemContent(page, /^ListItem(?![A-Z])/, index, item);
  await expect(
    canvas(page).locator('.kui-list-item[data-kerf-node]'),
  ).toHaveCount(items.length);
}

/** The node an ItemSpec builds (of `type`), given its props. */
export const itemNode = (
  props: Record<string, unknown>,
  { glyph, trailing }: ItemSpec,
  type = 'list-item',
) =>
  node(
    type,
    props,
    glyph || trailing
      ? {
          ...(glyph ? { icon: [icon(glyph)] } : {}),
          ...(trailing
            ? {
                trailing: [
                  node('text', { children: trailing, variant: 'span' }),
                ],
              }
            : {}),
        }
      : undefined,
  );

// KF-5ZEYKP, KF-7BB55F: a toolbar's native group buttons are ToolbarButtons.
export const labelChoices: readonly ChoiceSpec[] = [
  'Bug',
  'Feature',
  'Docs',
  'Design',
  'Performance',
].map((label) => ({ value: label.toLowerCase(), label }));

export const balanceChoices: readonly ChoiceSpec[] = [
  { value: 'quiet', label: 'Quiet' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'explicit', label: 'Explicit' },
];

/** The toolbar Selects' choices, each with its icon. */
export const toolbarChoices: readonly ChoiceSpec[] = [
  { value: 'quiet', label: 'Quiet', iconData: 'bell' },
  { value: 'balanced', label: 'Balanced', iconData: 'sliders-horizontal' },
  { value: 'explicit', label: 'Explicit', iconData: 'wrench' },
];

/** How a Select is set up: its choices, props, value, and extras. */
export type SelectSpec = {
  readonly choices: readonly ChoiceSpec[];
  readonly props: FieldSpec;
  /** The picked choice's label, or labels when `multiple`. */
  readonly pick?: string | readonly string[];
  readonly triggerIcon?: string;
  /** The app supplies `renderSelected`, promoted to a param. */
  readonly renderSelected?: boolean;
};

/** Sets up the selected Select (the `nth` one) as `spec` says. */
export async function configureSelect(page: Page, spec: SelectSpec, nth = 0) {
  await configureChoices(page, /^Select/, spec.choices);
  await select(page, /^Select/, nth);
  await applySpec(page, spec.props);
  if (Array.isArray(spec.pick)) await chooseValues(page, spec.pick);
  else if (typeof spec.pick === 'string')
    await choose(page, 'value', spec.pick);
  if (spec.renderSelected) {
    await showProp(page, 'renderSelected');
    await page
      .locator('[data-editor-promote-prop="renderSelected"]')
      .filter({ visible: true })
      .click();
  }
  if (spec.triggerIcon) {
    await showProp(page, 'triggerIcon');
    await page.locator('[data-editor-content-add="triggerIcon"]').click();
    await area(page, 'Properties');
    await pickIcon(
      page,
      page.locator('[data-editor-icon-place]'),
      spec.triggerIcon,
    );
  }
}

/** A lone Select on the page, set up as `spec` says. */
export async function selectAlone(page: Page, spec: SelectSpec) {
  await dragComponent(page, 'Select', () => emptySpot(page));
  await configureSelect(page, spec);
  // A placeholder Select renders a static box, not the interactive control.
  await expect(
    canvas(page).locator('[data-component="select"][data-kerf-node]'),
  ).toHaveCount(1);
}

/** The Select node `spec` builds, with `props` as exported. */
export const selectNode = (
  props: Record<string, unknown>,
  spec: Pick<SelectSpec, 'choices' | 'triggerIcon' | 'renderSelected'>,
) =>
  node(
    'select',
    {
      ...props,
      choices: choiceValues(spec.choices),
      ...(spec.renderSelected
        ? { renderSelected: { $param: 'nodeRenderSelected' } }
        : {}),
    },
    spec.triggerIcon ? { triggerIcon: [icon(spec.triggerIcon)] } : undefined,
  );

/**
 * A Toolbar labeled `label` holding one ToolbarControlGroup (set up by
 * `group`) in `zone`, its seeded ToolbarButton removed unless `keepButton`;
 * the group is selected afterwards.
 */
export async function toolbarGroup(
  page: Page,
  label: string,
  group: FieldSpec,
  { zone = 'Leading', keepButton = false } = {},
) {
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await dragComponent(page, 'ToolbarControlGroup', () => zoneSpot(page, zone));
  await select(page, /^Toolbar(?!Text|Control|Button)/);
  await setText(page, 'label', label);
  await select(page, /^ToolbarControlGroup/);
  await applySpec(page, group);
  if (!keepButton) {
    await select(page, /^ToolbarButton/);
    await inspectorOverview(page);
    await page.locator('[data-action="editor-delete"]').click();
    await select(page, /^ToolbarControlGroup/);
  }
}

/** The Toolbar `toolbarGroup` builds, holding `children` in its group. */
export const toolbarGroupNode = (
  label: string,
  group: Record<string, unknown>,
  children: unknown[],
  zone = 'leading',
) =>
  node(
    'toolbar',
    { label },
    {
      [zone]: [node('toolbar-control-group', group, { children })],
    },
  );

/** A group holding one Select, as most toolbar Select examples use. */
export async function toolbarSelect(
  page: Page,
  label: string,
  group: FieldSpec,
  spec: SelectSpec,
  zone = 'Leading',
) {
  await toolbarGroup(page, label, group, { zone });
  await addChild(page, 'Select');
  await configureSelect(page, spec);
  await expect(canvas(page).locator('kui-select')).toHaveCount(1);
}

/** The icon-only label filter both toolbar filter examples use. */
export const labelFilter = (name: string, inGroup: boolean): SelectSpec => ({
  choices: labelChoices,
  props: {
    flags: ['multiple'],
    choices: {
      presentation: 'toolbar-borderless',
      selectedPresentation: 'icon-only',
      ...(inGroup ? { focusRingOwner: 'group' } : {}),
    },
    text: { name, ariaLabel: 'Filter by Label' },
    unsets: ['label'],
  },
  pick: ['Bug', 'Docs'],
  triggerIcon: 'funnel',
});

export const labelFilterNode = (name: string, inGroup: boolean) =>
  selectNode(
    {
      name,
      multiple: true,
      value: ['bug', 'docs'],
      ariaLabel: 'Filter by Label',
      presentation: 'toolbar-borderless',
      selectedPresentation: 'icon-only',
      ...(inGroup ? { focusRingOwner: 'group' } : {}),
    },
    labelFilter(name, inGroup),
  );

/** An icon-only toolbar group: its label, then extra group props. */
export const iconOnlyGroup = (
  label: string,
  rest: FieldSpec = {},
): FieldSpec => ({
  ...rest,
  choices: { content: 'icon', focusRing: 'outline', ...rest.choices },
  flags: ['single', ...(rest.flags ?? [])],
  text: { label },
});

export const iconOnlyGroupProps = (label: string, rest = {}) => ({
  label,
  content: 'icon',
  focusRing: 'outline',
  single: true,
  ...rest,
});

/** An icon-only toolbar Select of the toolbar choices. */
export const toolbarIconSelect = (
  name: string,
  ariaLabel: string,
  rest: FieldSpec = {},
  extra: Partial<SelectSpec> = {},
): SelectSpec => ({
  choices: toolbarChoices,
  props: {
    ...rest,
    choices: {
      presentation: 'toolbar-borderless',
      selectedPresentation: 'icon-only',
      focusRingOwner: 'group',
      ...rest.choices,
    },
    text: { name, ariaLabel },
    unsets: ['label'],
  },
  pick: 'Balanced',
  ...extra,
});

export const toolbarIconSelectNode = (
  name: string,
  ariaLabel: string,
  rest: Record<string, unknown> = {},
  extra: Partial<SelectSpec> = {},
) =>
  selectNode(
    {
      name,
      value: 'balanced',
      ariaLabel,
      presentation: 'toolbar-borderless',
      selectedPresentation: 'icon-only',
      focusRingOwner: 'group',
      ...rest,
    },
    { choices: toolbarChoices, ...extra },
  );

export const shortcuts = [
  ['New Ticket', 'Create a ticket in the current project.', 'N'],
  ['Search', 'Focus the search field.', '/'],
  ['Complete Ticket', 'Mark the selected ticket done.', '⌘ ↵'],
] as const;

/**
 * Deletes the selected node with the Inspector's Delete, which a bare text
 * node (with no Flow area) has too.
 */
export async function deleteSelected(page: Page) {
  await inspectorOverview(page);
  await page.locator('[data-action="editor-delete"]').click();
}

/**
 * Adds `component` to the selected container; when the container held
 * seeded text, that text became a Text node, and is deleted.
 */
export async function addInto(
  page: Page,
  parent: RegExp,
  component: string,
  parentIndex = 0,
  seededText?: number,
) {
  await select(page, parent, parentIndex);
  await addChild(page, component);
  if (seededText === undefined) return;
  await select(page, /^Text(?![A-Z])/, seededText);
  await deleteSelected(page);
}

/** The TreeList › Compact Outline demo's nodes; all but the root drag. */
export const OUTLINE_NODES = [
  {
    id: 'pane',
    label: 'Pane',
    description: 'Root',
    children: [
      {
        id: 'toolbar',
        label: 'Toolbar',
        description: 'header',
        draggable: true,
        children: [
          {
            id: 'title',
            label: 'ToolbarText',
            description: 'leading',
            draggable: true,
          },
          {
            id: 'compose',
            label: 'composeButton',
            description: 'trailing',
            draggable: true,
          },
        ],
      },
      {
        id: 'folders',
        label: 'folderList',
        description: 'content',
        draggable: true,
        children: [],
      },
    ],
  },
];

/** The TreeList › Files demo's first render: docs is not loaded yet. */
export const FILE_NODES = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button', label: 'button.tsx' },
          { id: 'list-item', label: 'list-item.tsx' },
          {
            id: 'legacy',
            label: 'legacy.tsx',
            description: 'Read-only',
            disabled: true,
          },
        ],
      },
      { id: 'index', label: 'index.ts' },
    ],
  },
  { id: 'docs', label: 'docs', hasChildren: true },
  { id: 'readme', label: 'README.md' },
];

/** Each Files node's icon, by its place in `nodes`. */
export const FILE_ICONS: readonly (readonly [readonly number[], string])[] = [
  [[0], 'folder'],
  [[0, 0], 'folder'],
  [[0, 0, 0], 'file-code'],
  [[0, 0, 1], 'file-code'],
  [[0, 0, 2], 'file-code'],
  [[0, 1], 'file-code'],
  [[1], 'folder'],
  [[2], 'file'],
];

/** A tree node's zone name: `nodes.0.children.1.icon` for [0, 1]. */
export const treeZone = (at: readonly number[], zone: string) =>
  `nodes.${at.join('.children.')}.${zone}`;

/**
 * Opens the selected TreeList's nodes form down to the node at `at`, then
 * follows its `zone` row, which closes the form for the zone's content.
 */
export async function treeNodeZone(
  page: Page,
  at: readonly number[],
  zone: string,
  owner = /^TreeList/,
) {
  await select(page, owner);
  await showProp(page, 'nodes');
  const open = (path: readonly (number | string)[]) =>
    page
      .locator(
        `[data-editor-open='${JSON.stringify({ prop: 'nodes', path })}']`,
      )
      .filter({ visible: true })
      .first()
      .click();
  await open([]);
  // The form remembers JSON mode, which nodes were last set in.
  const asList = page
    .getByRole('button', { name: 'Edit as list' })
    .filter({ visible: true });
  if (await asList.count()) await asList.click();
  const path: (number | string)[] = [];
  for (const [depth, index] of at.entries()) {
    if (depth > 0) {
      path.push('children');
      await open(path);
    }
    path.push(index);
    await open(path);
  }
  await page
    .locator(`[data-editor-content-add="${treeZone(at, zone)}"]`)
    .click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
}

/** A ListActionRow FieldSpec plus its icons and a custom icon tile. */
export type ActionRowSpec = FieldSpec & {
  readonly glyph?: string;
  readonly trailingGlyph?: string;
  readonly tile?: { readonly color: string; readonly foreground?: string };
};

/**
 * Replaces the palette's trailing menu with a button icon on the `index`th
 * ListActionRow. Clear the menu first so the row remains on a valid variant
 * throughout the edit and wait for the editor to commit that change.
 */
export async function trailingButton(page: Page, index: number, glyph: string) {
  await select(page, /^ListActionRow/, index);
  await openConfigure(page, 'Configure trailing menu');
  const reset = page
    .locator('[data-action="editor-reset-field"]')
    .filter({ visible: true });
  await expect(reset).toHaveAttribute(
    'data-editor-step',
    JSON.stringify({ prop: 'trailingMenu', path: [] }),
  );
  await reset.click();
  await expect(reset).toBeDisabled();
  await back(page);
  await addIcon(page, 'trailingActionIcon', glyph);
}

/** A List of ListActionRows, each set up by its spec. */
export async function actionRows(
  page: Page,
  rows: readonly ActionRowSpec[],
  data?: readonly [string, string],
) {
  await stacked(page, 'List', 'ListActionRow', rows, async () => {
    if (data) await dataAttribute(page, ...data);
  });
  for (const [index, row] of rows.entries()) {
    await select(page, /^ListActionRow/, index);
    if (row.tile) {
      await choose(page, 'iconTile', 'Custom…');
      await openConfigure(page, 'Configure icon tile');
      await setField(page, 'iconTile', ['color'], row.tile.color);
      if (row.tile.foreground)
        await setField(page, 'iconTile', ['foreground'], row.tile.foreground);
      await back(page);
    }
    if (row.glyph) {
      await select(page, /^ListActionRow/, index);
      await addIcon(page, 'icon', row.glyph);
    }
    await trailingButton(page, index, row.trailingGlyph!);
  }
  await expect(
    canvas(page).locator('.kui-list-action-row[data-kerf-node]'),
  ).toHaveCount(rows.length);
}

/** The ListActionRow node an ActionRowSpec builds, given its props. */
export const actionRowNode = (
  props: Record<string, unknown>,
  { glyph, trailingGlyph, tile }: ActionRowSpec,
) =>
  node(
    'list-action-row',
    {
      ...props,
      ...(tile
        ? {
            iconTile: {
              color: { $css: tile.color },
              ...(tile.foreground
                ? { foreground: { $css: tile.foreground } }
                : {}),
            },
          }
        : {}),
    },
    glyph || trailingGlyph
      ? {
          ...(glyph ? { icon: [icon(glyph)] } : {}),
          ...(trailingGlyph
            ? { trailingActionIcon: [icon(trailingGlyph)] }
            : {}),
        }
      : undefined,
  );

export const tileCommands = [
  [
    'tile-run-tests',
    'Run Tests',
    'npm test',
    'terminal',
    "fillColor('#30a46c')",
  ],
  [
    'tile-deploy-preview',
    'Deploy Preview',
    'npm run deploy',
    'rocket',
    "fillColor('#0090ff')",
  ],
  [
    'tile-format-code',
    'Format Code',
    'npm run format',
    'paintbrush',
    "fillColor('#ffc53d')",
  ],
  [
    'tile-clean-build',
    'Clean Build',
    'npm run clean',
    'trash',
    "fillColor('#e5484d')",
  ],
  [
    'tile-open-docs',
    'Open Docs',
    'npm run docs',
    'book-open',
    "uiColor('brand-fill-loud')",
  ],
] as const;

/**
 * Adds a DemoContentItem (ContentItem › List › title and detail Texts) to
 * the `index`th node named `parent`.
 */
export async function contentItemInto(
  page: Page,
  parent: RegExp,
  index: number,
  title: string,
  detail: string,
) {
  await addInto(page, parent, 'ContentItem', index);
  await addChild(page, 'List');
  await choose(page, 'gap', '2xs');
  await addChild(page, 'Text');
  await applySpec(page, {
    choices: { variant: 'span', weight: 'strong' },
    text: { children: title },
  });
  // Focus is still in the Inspector, so the Duplicate button copies it.
  await inspectorOverview(page);
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await applySpec(page, {
    choices: {
      weight: 'Default (regular)',
      tone: 'quiet',
      size: 'compact',
    },
    text: { children: detail },
  });
}

/** A DemoFrameShell: the SunkenPanel the layout demos frame examples in. */
export async function frameShell(page: Page) {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await select(page, /^SunkenPanel/);
  await setText(page, 'ariaLabel', 'Layout Example');
}

export const frameShellNode = (...children: unknown[]) =>
  node('sunken-panel', { ariaLabel: 'Layout Example' }, { children });

export const RESULT_PICKER = [
  [
    'result-1',
    'Dialog footer hides the last message',
    'Closed last week, surface scaffold',
  ],
  ['result-2', 'Transcript stops above the composer', 'Open, chat dialog'],
  [
    'result-3',
    'MessageComposer grows past the panel on phones',
    'Closed in September, composer',
  ],
  [
    'result-4',
    'Floating footer loses its offset after resize',
    'Open, surface scaffold',
  ],
  [
    'result-5',
    'Scrollable list compresses multiline rows',
    'Closed in August, list',
  ],
] as const;

/**
 * Fills a DemoContentItem's List and its title and detail Texts (the
 * composition the "builds a DemoContentItem" test assembles), given the
 * outline positions of that List and of its one Text so far.
 */
export async function demoTexts(
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
export const demoContentItem = (title: string, detail: string) =>
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

/** The inbox's four kinds of message, as the NavStack demo's INBOX has them. */
export const INBOX_KINDS = [
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
export async function inbox(page: Page, action: string) {
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
export const inboxNodes = (action: string) =>
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

/**
 * Makes Workbench panel `prop` a static panel named `label`, sets its other
 * fields with `fields` while its form is open, and drops a DemoContentItem's
 * ContentItem, List, and Text into its content slot on the canvas.
 */
export async function panel(
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
export async function configure(page: Page, prop: string) {
  const words = prop.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
  await openConfigure(page, `Configure ${words}`);
}

/**
 * Opens the form of the object at `path` inside prop `prop`'s form, and
 * waits until one of its own fields shows. (Its KF-52Q3AP dropped-click
 * retry never fired in two logged CI runs and was removed in KF-GHMFPC.)
 */
export async function openField(
  page: Page,
  prop: string,
  path: readonly (string | number)[],
) {
  if (!path.length) await showProp(page, prop);
  const row = page
    .locator(`[data-editor-open='${JSON.stringify({ prop, path })}']`)
    // A row of a form the stack has left stays in the page, hidden.
    .filter({ visible: true })
    .first();
  // A field (or nested row) inside the opened form: its path extends this
  // one, so a top-level form's fields start with a quoted field name.
  const open = JSON.stringify({ prop, path }).slice(0, -2);
  const inside = path.length ? `${open},` : `${open}"`;
  const opened = page
    .locator(
      `[data-editor-field^='${inside}'], [data-editor-open^='${inside}']`,
    )
    .filter({ visible: true })
    .first();
  await row.click();
  await expect(opened).toBeVisible();
}

/** Leaves the Inspector's open form for the one it was opened from. */
export const back = (page: Page) =>
  page
    .locator('#editor-inspector-stack')
    .getByRole('button', { name: 'Back', exact: true })
    .click();

/** Leaves every open form for the selected node's Properties. */
export async function backOut(page: Page) {
  const button = page
    .locator('#editor-inspector-stack')
    .getByRole('button', { name: 'Back', exact: true });
  while (await button.isVisible()) await button.click();
}

/**
 * Adds a ToolbarText reading `text` to content field `zone` of the open
 * form (`mainToolbar.title`), from its row's add button, at `size` if given.
 */
export async function toolbarText(
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

/** Places one ToolbarText, set up by `spec`, at the document's root. */
export async function bareToolbarText(page: Page, spec: FieldSpec) {
  await dragComponent(page, 'ToolbarText', () => emptySpot(page));
  await select(page, /^ToolbarText/);
  await applySpec(page, spec);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
}

/** A bare ToolbarText reading `text`, at `size` and `heading` level. */
export async function sizedToolbarText(
  page: Page,
  text: string,
  size?: string,
  heading?: string,
) {
  await bareToolbarText(page, {
    choices: {
      ...(size ? { size } : {}),
      ...(heading ? { headingLevel: heading } : {}),
    },
    text: { text },
  });
  await expect(canvas(page).locator('.kui-toolbar-text')).toHaveText(text);
  expect(await exported(page)).toEqual(
    pane(
      node('toolbar-text', {
        text,
        ...(size ? { size } : {}),
        ...(heading ? { headingLevel: Number(heading) } : {}),
      }),
    ),
  );
}

export const OVERFLOW_LABEL =
  'A very long workspace name that does not fit the available width and keeps going past two lines';

/** A bare large ToolbarText reading OVERFLOW_LABEL, wrapped or capped. */
export async function overflowToolbarText(
  page: Page,
  wrap: boolean,
  maxLines?: string,
) {
  await bareToolbarText(page, {
    choices: { size: 'large' },
    flags: wrap ? ['wrap'] : [],
    text: { text: OVERFLOW_LABEL, ...(maxLines ? { maxLines } : {}) },
  });
  expect(await exported(page)).toEqual(
    pane(
      node('toolbar-text', {
        text: OVERFLOW_LABEL,
        size: 'large',
        ...(wrap ? { wrap: true } : {}),
        ...(maxLines ? { maxLines: Number(maxLines) } : {}),
      }),
    ),
  );
}

export const TOOLBAR = /^Toolbar(?!Text|Control|Button)/;

/**
 * Adds a ToolbarControlGroup (set up by `spec`) to the `nth` Toolbar's
 * `zone`; the group's seeded ToolbarButton stays only when `keepButton`.
 */
export async function zoneGroup(
  page: Page,
  zone: string,
  spec: FieldSpec,
  { nth = 0, keepButton = false } = {},
) {
  await select(page, TOOLBAR, nth);
  await addChild(page, 'ToolbarControlGroup', zone);
  await area(page, 'Properties');
  await applySpec(page, spec);
  if (keepButton) return;
  await select(page, /^ToolbarButton/, -1);
  await deleteSelected(page);
}

/** Sets up the selected ToolbarButton as an icon-only button. */
export async function iconButton(page: Page, spec: FieldSpec, glyph: string) {
  await applySpec(page, { ...spec, unsets: ['children'] });
  await addIcon(page, 'icon', glyph);
}

/** A ToolbarButton's spec and the glyph of its icon. */
export type IconButtonSpec = readonly [FieldSpec, string];

/**
 * Adds a ToolbarControlGroup (set up by `spec` and `css`) to the `nth`
 * Toolbar's `zone`, holding one icon-only ToolbarButton per entry. Zones
 * are built in order, so the newest group's buttons are the outline's last.
 */
export async function buttonGroup(
  page: Page,
  zone: string,
  spec: FieldSpec,
  buttons: readonly IconButtonSpec[],
  { nth = 0, css = {} as Readonly<Record<string, string>> } = {},
) {
  await zoneGroup(page, zone, spec, { nth, keepButton: true });
  for (const [name, value] of Object.entries(css))
    await setCss(page, name, value);
  for (const [index, [button, glyph]] of buttons.entries()) {
    if (index > 0) {
      await select(page, /^ToolbarControlGroup/, -1);
      await addChild(page, 'ToolbarButton');
      await area(page, 'Properties');
    } else await select(page, /^ToolbarButton/, -1);
    await iconButton(page, button, glyph);
  }
}

/** The group `buttonGroup` builds, given each button's exported props. */
export const buttonGroupNode = (
  props: Record<string, unknown>,
  buttons: readonly (readonly [Record<string, unknown>, string])[],
) =>
  node('toolbar-control-group', props, {
    children: buttons.map(([button, glyph]) =>
      node('toolbar-control-group#ToolbarButton', button, {
        icon: [icon(glyph)],
      }),
    ),
  });

/** Places a Toolbar labeled `label`, set up by `spec`. */
export async function toolbar(page: Page, label: string, spec: FieldSpec = {}) {
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await select(page, TOOLBAR);
  await applySpec(page, { ...spec, text: { label, ...spec.text } });
}

/** Adds a ToolbarText (set up by `spec`) to the `nth` Toolbar's `zone`. */
export async function zoneText(
  page: Page,
  zone: string,
  spec: FieldSpec,
  nth = 0,
) {
  await select(page, TOOLBAR, nth);
  await addChild(page, 'ToolbarText', zone);
  await area(page, 'Properties');
  await applySpec(page, spec);
}

/**
 * The ToolbarControlGroup demos' frame: a Toolbar labeled `label` with one
 * group in its leading zone. Every group passes the demo's shape, `pill`
 * at first render; `buttons` fill it with icon-only ToolbarButtons.
 */
export async function demoGroup(
  page: Page,
  label: string,
  group: FieldSpec,
  buttons: readonly IconButtonSpec[] = [],
) {
  await toolbar(page, label);
  const spec = { ...group, choices: { ...group.choices, shape: 'pill' } };
  if (buttons.length) await buttonGroup(page, 'leading', spec, buttons);
  else await zoneGroup(page, 'leading', spec);
}

/** The Toolbar `demoGroup` builds, its group holding `children`. */
export const demoGroupNode = (
  label: string,
  group: Record<string, unknown>,
  children: unknown[],
) =>
  node(
    'toolbar',
    { label },
    {
      leading: [
        node(
          'toolbar-control-group',
          { ...group, shape: 'pill' },
          { children },
        ),
      ],
    },
  );

/** An icon-only ToolbarButton node. */
export const toolbarButtonNode = (
  props: Record<string, unknown>,
  glyph: string,
) =>
  node('toolbar-control-group#ToolbarButton', props, { icon: [icon(glyph)] });

export const SORT_ITEMS = [
  { label: 'Recently Updated', action: 'sort-recent' },
  { label: 'Priority', action: 'sort-priority' },
];

/** A Toolbar group holding the sort PopupMenu, labeled `label`. */
export async function sortMenu(
  page: Page,
  example: string,
  label: string,
  caret: boolean,
) {
  await demoGroup(page, example, {
    choices: { menuInset: 'compact' },
    flags: ['single', 'nestedDropdown'],
  });
  await addInto(page, /^ToolbarControlGroup/, 'PopupMenu');
  await setText(page, 'label', label);
  await unset(page, 'text');
  if (!caret) await turnOff(page, 'caret');
  await addIcon(page, 'icon', 'arrow-down-a-z');
  await select(page, /^PopupMenu/);
  await editAsJson(page, 'items', SORT_ITEMS);
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode(
        example,
        { single: true, nestedDropdown: true, menuInset: 'compact' },
        [
          node(
            'popup-menu',
            {
              label,
              ...(caret ? {} : { caret: false }),
              items: SORT_ITEMS,
            },
            { icon: [icon('arrow-down-a-z')] },
          ),
        ],
      ),
    ),
  );
}

/** Single-group examples: a group of icon buttons in a plain Toolbar. */
export const buttonExamples: readonly (readonly [
  string,
  FieldSpec,
  Record<string, unknown>,
  readonly (readonly [FieldSpec, Record<string, unknown>, string])[],
])[] = [
  [
    'Button Group',
    { text: { label: 'View Actions' } },
    { label: 'View Actions' },
    [
      [
        { text: { ariaLabel: 'Favorite View', action: 'log-favorite' } },
        { ariaLabel: 'Favorite View', action: 'log-favorite' },
        'star',
      ],
      [
        { text: { ariaLabel: 'More Actions', action: 'log-more' } },
        { ariaLabel: 'More Actions', action: 'log-more' },
        'ellipsis',
      ],
    ],
  ],
  [
    'Single Button',
    { flags: ['single'] },
    { single: true },
    [
      [
        { text: { ariaLabel: 'Pin View', action: 'log-pin' } },
        { ariaLabel: 'Pin View', action: 'log-pin' },
        'pin',
      ],
    ],
  ],
  [
    'Borderless Group',
    { choices: { appearance: 'borderless' }, flags: ['single'] },
    { appearance: 'borderless', single: true },
    [
      [
        { text: { ariaLabel: 'Show Sidebar', action: 'log-sidebar' } },
        { ariaLabel: 'Show Sidebar', action: 'log-sidebar' },
        'panel-left-open',
      ],
    ],
  ],
  [
    'Push Button, Resting',
    { choices: { buttonAppearance: 'push' }, flags: ['single'] },
    { buttonAppearance: 'push', single: true },
    [
      [
        {
          choices: { pressed: 'Off' },
          text: { ariaLabel: 'Resting Comparison', action: 'log-resting' },
        },
        {
          ariaLabel: 'Resting Comparison',
          action: 'log-resting',
          pressed: false,
        },
        'git-compare',
      ],
    ],
  ],
  [
    'Push Button, Pressed',
    { choices: { buttonAppearance: 'push' }, flags: ['single'] },
    { buttonAppearance: 'push', single: true },
    [
      [
        {
          choices: { pressed: 'On' },
          text: { ariaLabel: 'Pressed Comparison', action: 'log-pressed' },
        },
        {
          ariaLabel: 'Pressed Comparison',
          action: 'log-pressed',
          pressed: true,
        },
        'git-compare',
      ],
    ],
  ],
  [
    'Pop Selected Tone',
    {
      choices: { selectedChrome: 'filled', selectedTone: 'pop' },
      text: { label: 'Featured Action' },
    },
    { label: 'Featured Action', selectedChrome: 'filled', selectedTone: 'pop' },
    [
      [
        {
          choices: { pressed: 'On' },
          text: { ariaLabel: 'Featured', action: 'log-featured' },
        },
        { ariaLabel: 'Featured', action: 'log-featured', pressed: true },
        'star',
      ],
    ],
  ],
  [
    'Dark Group',
    { choices: { tone: 'dark' }, text: { label: 'Dark Navigation' } },
    { label: 'Dark Navigation', tone: 'dark' },
    [
      [
        { text: { ariaLabel: 'Previous', action: 'log-previous' } },
        { ariaLabel: 'Previous', action: 'log-previous' },
        'chevron-left',
      ],
      [
        { text: { ariaLabel: 'Next', action: 'log-next' } },
        { ariaLabel: 'Next', action: 'log-next' },
        'chevron-right',
      ],
    ],
  ],
];

/** Builds `buttonExamples`' entry for `example`. */
export async function buttonExample(page: Page, example: string) {
  const [, group, groupProps, buttons] = buttonExamples.find(
    ([name]) => name === example,
  )!;
  await demoGroup(
    page,
    example,
    group,
    buttons.map(([spec, , glyph]) => [spec, glyph]),
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode(
        example,
        groupProps,
        buttons.map(([, props, glyph]) => toolbarButtonNode(props, glyph)),
      ),
    ),
  );
}

// KF-921WVX: each tone is a heading identity, a Toolbar holding the tile
// group and a ToolbarText. The demo's toolbarGroupShape starts as 'pill'.
export const tileTones = [
  'neutral',
  'brand',
  'success',
  'warning',
  'danger',
] as const;

export const toneName = (tone: string) =>
  tone.charAt(0).toUpperCase() + tone.slice(1);

/** Places a List with no gap, carrying `section` as its demo hook. */
export async function demoSection(page: Page, section: string) {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'none');
  await dataAttribute(page, 'data-demo-section', section);
}

/** The List `demoSection` builds, holding `children`. */
export const demoSectionNode = (section: string, children: unknown[]) =>
  node(
    'list',
    { gap: 'none', rootAttributes: { 'data-demo-section': section } },
    { children },
  );

/** Adds a SearchField to the last ToolbarControlGroup, set up by `spec`. */
export async function groupSearch(page: Page, spec: FieldSpec) {
  await select(page, /^ToolbarControlGroup/, -1);
  await addChild(page, 'SearchField');
  await area(page, 'Properties');
  await applySpec(page, {
    ...spec,
    choices: { presentation: 'toolbar-group', ...spec.choices },
  });
}

// The avatar is a bundled asset whose URL the app supplies: a param.
export const avatarGroup = (
  label: string,
  rest: FieldSpec = {},
): FieldSpec => ({
  ...rest,
  choices: { content: 'avatar', selectedTone: 'neutral', ...rest.choices },
  text: { label },
});

/**
 * Opens the selected `owner`'s `prop` form down to the entry at `steps`
 * (indexes, with a nested list's key between them) and follows its `zone`
 * row, which places that zone's content (an icon zone, its icon).
 */
export async function entryZone(
  page: Page,
  owner: RegExp,
  prop: string,
  steps: readonly (number | string)[],
  zone: string,
) {
  await select(page, owner);
  await showProp(page, prop);
  const open = (path: readonly (number | string)[]) =>
    page
      .locator(`[data-editor-open='${JSON.stringify({ prop, path })}']`)
      .filter({ visible: true })
      .first()
      .click();
  await open([]);
  const asList = page
    .getByRole('button', { name: 'Edit as list' })
    .filter({ visible: true });
  if (await asList.count()) await asList.click();
  for (let depth = 1; depth <= steps.length; depth += 1)
    await open(steps.slice(0, depth));
  await page
    .locator(`[data-editor-content-add="${[prop, ...steps, zone].join('.')}"]`)
    .click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
}

/** Places each `[steps, glyph, name?]` icon in the PopupMenu's items. */
export async function menuIcons(
  page: Page,
  icons: readonly (readonly [readonly (number | string)[], string, string?])[],
) {
  for (const [steps, glyph, name] of icons) {
    await entryZone(page, /^PopupMenu/, 'items', steps, 'icon');
    await area(page, 'Properties');
    await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
    if (name) await setText(page, 'name', name);
  }
}

/** The icon zones `menuIcons` fills, as the export spells them. */
export const menuIconZones = (
  icons: readonly (readonly [readonly (number | string)[], string, string?])[],
) =>
  Object.fromEntries(
    icons.map(([steps, glyph, name]) => [
      ['items', ...steps, 'icon'].join('.'),
      [icon(glyph, name ? { name } : {})],
    ]),
  );

/** Places a lone PopupMenu set up by `spec`, with `items`. */
export async function lonePopupMenu(
  page: Page,
  spec: FieldSpec,
  items: unknown,
) {
  await dragComponent(page, 'PopupMenu', () => emptySpot(page));
  await select(page, /^PopupMenu/);
  await applySpec(page, spec);
  await editAsJson(page, 'items', items);
}

/** A TabBarItem FieldSpec plus its icons and trailing spinner. */
export type TabSpec = FieldSpec & {
  readonly leading?: string;
  readonly closeIcon?: readonly [string, string];
  readonly spinner?: boolean;
};

/**
 * Places a TabBar (set up by `bar`) holding one TabBarItem per spec, each
 * added to its tabs zone and set up in turn.
 */
export async function tabBar(
  page: Page,
  bar: FieldSpec,
  tabs: readonly TabSpec[],
) {
  await dragComponent(page, 'TabBar', () => emptySpot(page));
  await select(page, /^TabBar(?!Item)/);
  await applySpec(page, bar);
  // The TabBar arrives holding one TabBarItem: the first tab.
  for (const [index, tab] of tabs.entries()) {
    if (index === 0) await select(page, /^TabBarItem/);
    else {
      await select(page, /^TabBar(?!Item)/);
      await addChild(page, 'TabBarItem', 'tabs');
      await area(page, 'Properties');
    }
    await applySpec(page, tab);
    // The tab's decorations are zones, filled from Children › Add a child.
    const place = async (zone: string, glyph: string) => {
      await select(page, /^TabBarItem/, -1);
      await addChild(page, 'LucideIcon', zone);
      await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
    };
    if (tab.leading) await place('leading-decoration', tab.leading);
    if (tab.closeIcon) {
      await place('close-icon', tab.closeIcon[0]);
      await setText(page, 'name', tab.closeIcon[1]);
    }
    if (tab.spinner) {
      await select(page, /^TabBarItem/, -1);
      await addChild(page, 'LoadingSpinner', 'trailing-decoration');
    }
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
}

/** The TabBar `tabBar` builds, given each tab's exported props. */
export const tabBarNode = (
  bar: Record<string, unknown>,
  tabs: readonly (readonly [Record<string, unknown>, TabSpec])[],
) =>
  node('tab-bar', bar, {
    tabs: tabs.map(([props, spec]) => {
      const zones: Record<string, unknown[]> = {};
      if (spec.leading) zones['leading-decoration'] = [icon(spec.leading)];
      if (spec.spinner)
        zones['trailing-decoration'] = [node('loading-spinner')];
      if (spec.closeIcon)
        zones['close-icon'] = [
          icon(spec.closeIcon[0], { name: spec.closeIcon[1] }),
        ];
      return node('tabs', props, Object.keys(zones).length ? zones : undefined);
    }),
  });

/** A non-closable tab named `name`, first selected, at `id`. */
export const plainTab = (
  id: string,
  name: string,
  selected: boolean,
  extra: FieldSpec = {},
): TabSpec => ({
  ...extra,
  flags: [...(selected ? ['selected'] : []), ...(extra.flags ?? [])],
  offs: ['closable'],
  text: { id, name, ...extra.text },
});

/** `plainTab`'s exported props. */
export const plainTabProps = (
  id: string,
  name: string,
  selected: boolean,
  extra: Record<string, unknown> = {},
) => ({
  id,
  name,
  ...(selected ? { selected: true } : {}),
  closable: false,
  ...extra,
});

/** Adds a borderless single group, one icon button, to TabBar `zone`. */
export async function tabBarGroup(
  page: Page,
  zone: string,
  button: FieldSpec,
  glyph: string,
) {
  await select(page, /^TabBar(?!Item)/);
  await addChild(page, 'ToolbarControlGroup', zone);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { appearance: 'borderless' },
    flags: ['single'],
  });
  await select(page, /^ToolbarButton/, -1);
  await iconButton(page, button, glyph);
}

/** `tabBarGroup`'s exported group. */
export const tabBarGroupNode = (
  button: Record<string, unknown>,
  glyph: string,
) =>
  buttonGroupNode({ appearance: 'borderless', single: true }, [
    [button, glyph],
  ]);

/** Adds a Button (set up by `spec`) to TabBar `zone`. */
export async function tabBarButton(page: Page, zone: string, spec: FieldSpec) {
  await select(page, /^TabBar(?!Item)/);
  await addChild(page, 'Button', zone);
  await area(page, 'Properties');
  await applySpec(page, spec);
}

/** The demos' two pill or segmented tabs. */
export const pairTabs = (presentation: 'pill' | 'segmented') =>
  (
    [
      [`${presentation}-one`, 'Overview', true],
      [`${presentation}-two`, 'Activity', false],
    ] as const
  ).map(
    ([id, name, selected]) =>
      [
        plainTab(id, name, selected, {
          choices:
            presentation === 'segmented'
              ? { presentation, size: 'compact' }
              : { presentation, size: 'default' },
        }),
        plainTabProps(id, name, selected, {
          presentation,
          size: presentation === 'segmented' ? 'compact' : 'default',
        }),
      ] as const,
  );

export const SPLIT_NAMES = [
  'Overview',
  'Backlog',
  'Activity',
  'Automations',
  'Settings',
];

export const OVERFLOW_NAMES = [
  ...SPLIT_NAMES,
  'Releases',
  'Milestones',
  'Reports',
  'Integrations',
  'Members',
];

/** Non-closable tabs named `names`, ids `${prefix}-<name>`, first selected. */
export const namedTabs = (
  prefix: string,
  names: readonly string[],
  extra: Readonly<Record<string, string>> = {},
) =>
  names.map((name, index) => {
    const id = `${prefix}-${name.toLowerCase()}`;
    return [
      plainTab(id, name, index === 0, { choices: extra }),
      plainTabProps(id, name, index === 0, extra),
    ] as const;
  });

/**
 * KF-RE1EBK: adds a TabPanel to the `nth` `parent`'s zone (`zone` when
 * given), named by tab `tabId`, hidden when asked.
 */
export async function tabPanel(
  page: Page,
  parent: RegExp,
  id: string,
  tabId: string,
  { hidden = false, zone }: { hidden?: boolean; zone?: string } = {},
) {
  await select(page, parent);
  await addChild(page, 'TabPanel', zone);
  await area(page, 'Properties');
  await applySpec(page, {
    text: { id, tabId },
    ...(hidden ? { flags: ['hidden'] } : {}),
  });
}

/**
 * Adds a Text to the selected node's children and deletes the text run its
 * seeded text became (a ListInsetText's), leaving the Text selected.
 */
export async function textInPlaceOfRun(page: Page) {
  await addChild(page, 'Text');
  await area(page, 'Outline');
  await outlineRow(page, /^Text “/)
    .first()
    .click();
  await deleteSelected(page);
  await select(page, /^Text(?![A-Z])/, -1);
}

/** Adds a Text reading `text` (with `spec`) to the `nth` `parent`. */
export async function textInto(
  page: Page,
  parent: RegExp,
  text: string,
  nth = 0,
  spec: FieldSpec = {},
) {
  await addInto(page, parent, 'Text', nth);
  await applySpec(page, { ...spec, text: { children: text, ...spec.text } });
}

export const textNode = (
  children: string,
  props: Record<string, unknown> = {},
) => node('text', { children, ...props });

/** Places a SunkenPanel, set up by `spec`, at the first empty spot. */
export async function sunkenPanel(page: Page, spec: FieldSpec, nth = 0) {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await select(page, /^SunkenPanel/, nth);
  await applySpec(page, spec);
}

export const SUNKEN = /^SunkenPanel/;

/** A Pane chrome Toolbar: its label and its leading ToolbarText. */
export type ChromeSpec = {
  readonly label: string;
  readonly text: string;
  readonly size?: string;
  readonly description?: string;
};

/**
 * Sets up the document's root Pane as a demo Pane: `spec` (fill turned off,
 * as the demos leave it), header and footer Toolbars, and ContentItems.
 */
export async function rootPane(
  page: Page,
  spec: FieldSpec,
  {
    header,
    footer,
    items = [],
  }: {
    header?: ChromeSpec;
    footer?: ChromeSpec;
    items?: readonly string[];
  },
) {
  await select(page, /^Pane/);
  // The root starts filled; a spec naming fill keeps it.
  const keepFill = spec.flags?.includes('fill') ?? false;
  await applySpec(page, {
    ...spec,
    flags: spec.flags?.filter((flag) => flag !== 'fill'),
    offs: [...(keepFill ? [] : ['fill']), ...(spec.offs ?? [])],
  });
  for (const [zone, chrome] of [
    ['header', header],
    ['footer', footer],
  ] as const) {
    if (!chrome) continue;
    await select(page, /^Pane/);
    await addChild(page, 'Toolbar', zone);
    await area(page, 'Properties');
    await setText(page, 'label', chrome.label);
    await addChild(page, 'ToolbarText', 'leading');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: chrome.size ? { size: chrome.size } : {},
      text: {
        text: chrome.text,
        ...(chrome.description ? { description: chrome.description } : {}),
      },
    });
  }
  for (const item of items) {
    await select(page, /^Pane/);
    await addChild(page, 'ContentItem', 'content');
    await area(page, 'Properties');
    await setText(page, 'children', item);
  }
}

/** A chrome Toolbar node. */
export const chromeNode = ({ label, text, size, description }: ChromeSpec) =>
  node(
    'toolbar',
    { label },
    {
      leading: [
        node('toolbar-text', {
          text,
          ...(description ? { description } : {}),
          ...(size ? { size } : {}),
        }),
      ],
    },
  );

/** The root Pane `rootPane` builds, given its exported props. */
export const rootPaneNode = (
  props: Record<string, unknown> | undefined,
  {
    header,
    footer,
    content = [],
  }: { header?: unknown[]; footer?: unknown[]; content?: unknown[] },
) =>
  node('pane', props, {
    ...(header ? { header } : {}),
    content,
    ...(footer ? { footer } : {}),
  });

export const items = (texts: readonly string[]) =>
  texts.map((children) => node('content-item', { children }));

/**
 * Sets up the `nth` NavStack as the SizedRegion demo's `stack()`: one
 * sunken view titled `title`, holding a List with one DemoContentItem.
 */
export async function demoStack(
  page: Page,
  nth: number,
  id: string,
  title: string,
) {
  const dialog = page.locator('dialog[open]');
  const back = () => dialog.getByRole('button', { name: 'Back' }).click();
  await select(page, /^NavStack/, nth);
  await setText(page, 'id', id);
  await setText(page, 'label', title);
  await openConfigure(page, 'Configure views');
  await dialog.getByRole('button', { name: 'Remove View 3' }).click();
  await dialog.getByRole('button', { name: 'Remove View 2' }).click();
  await dialog.locator('[data-action="editor-open-field"]').first().click();
  await setField(page, 'views', [0, 'key'], 'root');
  await dialog.getByText('Toolbar', { exact: true }).click();
  await setField(page, 'views', [0, 'toolbar', 'title'], title);
  await back();
  await dialog.getByText('Pane', { exact: true }).click();
  await chooseField(page, 'views', [0, 'pane', 'appearance'], 'sunken');
  await back();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await select(page, /^NavStack/, nth);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'view1Content slot — drop here',
    }),
  );
}

/** The NavStack `demoStack` builds. */
export const demoStackNode = (id: string, title: string) =>
  node(
    'nav-stack',
    {
      id,
      label: title,
      views: [
        {
          key: 'root',
          toolbar: { title },
          pane: { appearance: 'sunken' },
        },
      ],
    },
    {
      'views.0.content': [
        node('list', undefined, {
          children: [demoContentItem(...FILLS)],
        }),
      ],
    },
  );

export const FILLS = [
  'Fills the Region',
  "The stack's scenes take the height the SizedRegion gives them.",
] as const;

/**
 * Places a CollapsiblePanel set up by `spec` (its `size` a number), holding
 * one DemoContentItem titled `title`.
 */
export async function demoPanel(
  page: Page,
  spec: FieldSpec,
  size: string,
  [title, detail]: readonly [string, string],
) {
  await dragComponent(page, 'CollapsiblePanel', () => emptySpot(page));
  await select(page, /^CollapsiblePanel/);
  await applySpec(page, spec);
  await setText(page, 'size', size);
  await contentItemInto(page, /^CollapsiblePanel/, 0, title, detail);
}

export const LEFT_RAIL = [
  'Navigator',
  'Collapse from panel chrome; restore from adjacent chrome.',
] as const;

export const RIGHT_RAIL = [
  'Inspector',
  'The application owns size and collapsed state.',
] as const;

export const BOTTOM_DRAWER = [
  'Build Output',
  'Use Workbench when several panels form one shell.',
] as const;

/** A CollapsiblePanel `toolbar` with a title and a toggle, as configured. */
export type PanelToolbarSpec = {
  readonly label: string;
  readonly title?: string;
  readonly toggle: { readonly action: string; readonly name: string };
};

/**
 * Configures the selected panel's (or relocated control's) `toolbar`: its
 * label, toggle, and a ToolbarText title.
 */
export async function ownToolbar(
  page: Page,
  owner: RegExp,
  nth: number,
  { label, title, toggle }: PanelToolbarSpec,
) {
  const dialog = page.locator('dialog[open]');
  await select(page, owner, nth);
  await openConfigure(page, 'Configure toolbar');
  await setField(page, 'toolbar', ['label'], label);
  await openConfigure(page, 'Configure toggle', dialog);
  await setField(page, 'toolbar', ['toggle', 'action'], toggle.action);
  await setField(page, 'toolbar', ['toggle', 'name'], toggle.name);
  await dialog.getByRole('button', { name: 'Back' }).click();
  if (!title) {
    await dialog.getByRole('button', { name: 'Done' }).click();
    return;
  }
  await dialog.getByRole('button', { name: 'Add to title' }).click();
  await addChild(page, 'ToolbarText');
  await area(page, 'Properties');
  await setText(page, 'text', title);
}

/** The `toolbar` value and title zone `panelToolbar` builds. */
export const panelToolbarProps = ({ label, toggle }: PanelToolbarSpec) => ({
  toolbar: { label, toggle },
});

export const panelTitleZone = (title: string) => ({
  'toolbar.title': [node('toolbar-text', { text: title })],
});

export const CONSOLE_TOOLBAR: PanelToolbarSpec = {
  label: 'Console',
  title: 'Console',
  toggle: { action: 'toggle-catalog-panel-restore', name: 'Console' },
};

/** The relocation example's navigator icon commands: label, glyph, relocate. */
export const NAVIGATOR_COMMANDS = [
  ['leading', 'New File', 'file-plus', false],
  ['trailing', 'Search Files', 'search', true],
] as const;

/**
 * Configures the `nth` panel or relocated control's `toolbar` as the
 * navigator's: a label, the toggle, and a borderless icon command group in
 * its leading and trailing zones.
 */
export async function navigatorToolbar(page: Page, owner: RegExp, nth: number) {
  const dialog = page.locator('dialog[open]');
  await ownToolbar(page, owner, nth, {
    label: 'Navigator',
    toggle: { action: 'toggle-catalog-panel-relocation', name: 'Navigator' },
  });
  for (const [zone, label, glyph, relocate] of NAVIGATOR_COMMANDS) {
    await select(page, owner, nth);
    await openConfigure(page, 'Configure toolbar');
    await dialog.getByRole('button', { name: `Add to ${zone}` }).click();
    await addChild(page, 'ToolbarControlGroup');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { appearance: 'borderless' },
      flags: relocate ? ['single', 'relocateOnCollapse'] : ['single'],
      text: { label },
    });
    await select(page, /^ToolbarButton/, -1);
    await applySpec(page, {
      text: { ariaLabel: label, action: 'collapsible-panel-demo-command' },
      unsets: ['children'],
    });
    await addIcon(page, 'icon', glyph);
  }
}

/** The navigator `toolbar` value and zones `navigatorToolbar` builds. */
export const navigatorToolbarProps = {
  toolbar: {
    label: 'Navigator',
    toggle: { action: 'toggle-catalog-panel-relocation', name: 'Navigator' },
  },
};

export const navigatorToolbarZones = Object.fromEntries(
  NAVIGATOR_COMMANDS.map(([zone, label, glyph, relocate]) => [
    `toolbar.${zone}`,
    [
      buttonGroupNode(
        {
          label,
          appearance: 'borderless',
          single: true,
          ...(relocate ? { relocateOnCollapse: true } : {}),
        },
        [
          [
            { ariaLabel: label, action: 'collapsible-panel-demo-command' },
            glyph,
          ],
        ],
      ),
    ],
  ]),
);

export const ANCHORED_REQUEST_COPY =
  'Conversation content stays in a readable column while a request docks to the bottom of the main column.';

export const ANCHORED_REQUEST_DESCRIPTION =
  'The assistant wants to read three files in this workspace.';

/** A Button that shows or hides the popover dialog `id`. */
export const popoverButtonNode = (
  children: string,
  id: string,
  action: 'show' | 'hide',
  props: Record<string, unknown> = {},
) =>
  node('button', {
    children,
    ...props,
    popoverTarget: id,
    popoverTargetAction: action,
  });

/** Places a ResizableRegion set up by `spec`, with its numeric sizes. */
export async function region(
  page: Page,
  spec: FieldSpec,
  sizes: Readonly<Record<'size' | 'min' | 'max', string>>,
) {
  await dragComponent(page, 'ResizableRegion', () => emptySpot(page));
  await select(page, /^ResizableRegion/);
  await applySpec(page, spec);
  for (const [name, value] of Object.entries(sizes))
    await setText(page, name, value);
}

export const CATALOG_PANEL = [
  'Catalog Panel',
  'Navigation or inspector content, 180⁠–⁠420 px wide.',
] as const;

/** A demo `itemCopy` List: a strong title over a quiet compact detail. */
export const itemCopyNode = (title: string, detail: string) =>
  (demoContentItem(title, detail).zones as { children: unknown[] }).children[0];

/** Adds an `itemCopy` List to the selected container. */
export async function itemCopy(page: Page, title: string, detail: string) {
  await addChild(page, 'List');
  await area(page, 'Properties');
  await choose(page, 'gap', '2xs');
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { variant: 'span', weight: 'strong' },
    text: { children: title },
  });
  // Focus is still in the Inspector, so the Duplicate button copies it.
  await inspectorOverview(page);
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await applySpec(page, {
    choices: { weight: 'Default (regular)', tone: 'quiet', size: 'compact' },
    text: { children: detail },
  });
}

/** Places a List of selectable ContentItems named `ariaLabel`. */
export async function selectableList(page: Page, ariaLabel: string) {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List/);
  await applySpec(page, {
    choices: { selectionMode: 'multiple' },
    text: { ariaLabel },
  });
}

/** Adds an interactive, multiply selectable ContentItem to the outer List. */
export async function selectableItem(
  page: Page,
  text: FieldSpec['text'],
  data = {},
) {
  await addInto(page, /^List(?!Item)/, 'ContentItem', 0);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { selectionMode: 'multiple' },
    flags: ['interactive'],
    text,
    data: Object.entries(data),
  });
}

export const RICH_CARDS = [
  ['demand-a', 'Demand Line A'],
  ['demand-b', 'Demand Line B'],
] as const;

export const CONVERSATION = [
  ['message-1', 'Why did the nightly build fail?'],
  ['message-2', 'The bundle budget check failed.'],
  ['message-3', 'Rebaseline the budget with a reason.'],
] as const;

/**
 * A sunken-main Workbench `id`, labeled `label`, in a SizedRegion: its
 * seeded main Text becomes a ContentItem reading `main`.
 */
export async function sunkenWorkbench(
  page: Page,
  id: string,
  label: string,
  main: string,
) {
  await dragComponent(page, 'Workbench', () => emptySpot(page));
  await select(page, /^Workbench/);
  // Below the root it needs a height of its own (KF-6MGYSG).
  await embedIn(page, 'SizedRegion');
  await select(page, /^Workbench/);
  await setText(page, 'id', id);
  await setText(page, 'label', label);
  await select(page, /^Text/);
  await deleteSelected(page);
  await select(page, /^Workbench/);
  await addChild(page, 'ContentItem', 'main');
  await area(page, 'Properties');
  await setText(page, 'children', main);
  await select(page, /^Workbench/);
  // A PaneConfig form is large enough to open in a dialog.
  await configure(page, 'mainPane');
  await chooseField(page, 'mainPane', ['appearance'], 'sunken');
  await page
    .locator('dialog[open]')
    .getByRole('button', { name: 'Done' })
    .click();
}

/** A ContentItem node reading `text`. */
export const textItemNode = (text: string) =>
  node('content-item', { children: text });

export const albumHeader = (description?: string) => ({
  label: 'Album Header',
  text: 'Night Drive',
  size: 'xlarge',
  ...(description ? { description } : {}),
});

/**
 * Adds a DemoChip to the `nth` `parent`: an outlined, rounded Badge, compact
 * unless the chip is `wide` or `tall` (then the default Badge size).
 */
export async function demoChip(
  page: Page,
  parent: RegExp,
  label: string,
  nth = 0,
  big = false,
) {
  await addInto(page, parent, 'Badge', nth);
  await applySpec(page, {
    choices: {
      appearance: 'outline',
      shape: 'rounded',
      size: big ? 'default' : 'compact',
    },
    text: { children: label },
  });
}

export const demoChipNode = (children: string, big = false) =>
  node('badge', {
    children,
    appearance: 'outline',
    shape: 'rounded',
    size: big ? 'default' : 'compact',
  });

/**
 * A DemoFrameShell holding a `container` (Row or List, set up by `spec`)
 * of DemoChips with a Spacer (set up by `spacer`) between them.
 */
export async function spacedChips(
  page: Page,
  container: 'Row' | 'List',
  spec: FieldSpec,
  [before, after]: readonly [string, string],
  spacer: FieldSpec,
) {
  await frameShell(page);
  await dragComponent(page, container, () => emptySpot(page));
  const owner = container === 'Row' ? /^Row/ : /^List(?![A-Z])/;
  await select(page, owner);
  await applySpec(page, spec);
  await demoChip(page, owner, before);
  await addInto(page, owner, 'Spacer');
  await applySpec(page, spacer);
  await demoChip(page, owner, after);
}

export const spacedChipsNode = (
  container: string,
  props: Record<string, unknown>,
  [before, after]: readonly [string, string],
  spacer: Record<string, unknown>,
) =>
  frameShellNode(
    node(container, props, {
      children: [
        demoChipNode(before),
        node('spacer', spacer),
        demoChipNode(after),
      ],
    }),
  );

/** The Row demos' three chips: `prefix` one/two/three, the second tall. */
export async function rowChips(
  page: Page,
  owner: RegExp,
  prefix = '',
  nth = 0,
) {
  const names = prefix
    ? [`${prefix} one`, `${prefix} two`, `${prefix} three`]
    : ['One', 'Two', 'Three'];
  for (const [index, name] of names.entries())
    await demoChip(page, owner, name, nth, index === 1);
}

export const rowChipNodes = (prefix = '') =>
  (prefix
    ? [`${prefix} one`, `${prefix} two`, `${prefix} three`]
    : ['One', 'Two', 'Three']
  ).map((name, index) => demoChipNode(name, index === 1));

/** A DemoFrameShell holding one Row set up by `spec`. */
export async function shellRow(page: Page, spec: FieldSpec) {
  await frameShell(page);
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await applySpec(page, spec);
}

/**
 * Splits the selected Row's gap into per-axis values (KF-VA14AP): Columns
 * and rows, then a size Select for each axis.
 */
export async function axisGap(page: Page, column: string, row: string) {
  await choose(page, 'gap', 'Columns and rows…');
  await chooseField(page, 'gap', ['column'], column);
  await chooseField(page, 'gap', ['row'], row);
}

/**
 * Adds a Disclosure (set up by `spec`) to the `nth` `parent`, and removes
 * the bare text it is seeded with (a text node with no Properties).
 */
export async function disclosureInto(
  page: Page,
  parent: RegExp,
  spec: FieldSpec,
  nth = 0,
) {
  await addInto(page, parent, 'Disclosure', nth);
  await applySpec(page, spec);
  await addChild(page, 'Text');
  await area(page, 'Outline');
  await outlineRow(page, /^Text “Disclosure”/).click();
  await deleteSelected(page);
  // The added Text stays, its copy set by the caller (textInto adds one
  // more), so remove it too: the caller adds the copy it wants.
  await select(page, /^Text(?![A-Z])/, -1);
  await deleteSelected(page);
}

/**
 * KF-DE348P: a plain Button that owns a DisclosureArrow icon and reports
 * its state with `expanded`. Each demo's open state starts false.
 */
export async function disclosureButton(
  page: Page,
  label: string,
  action: string,
  arrow: FieldSpec = {},
) {
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  await applySpec(page, {
    choices: { emphasis: 'plain', expanded: 'Off' },
    text: { children: label, action },
  });
  await addChild(page, 'DisclosureArrow', 'icon');
  await area(page, 'Properties');
  await applySpec(page, arrow);
}

/** The Button `disclosureButton` builds, its arrow given `arrow` props. */
export const disclosureButtonNode = (
  label: string,
  action: string,
  arrow: Record<string, unknown> = {},
  arrowZones?: Record<string, unknown[]>,
) =>
  node(
    'button',
    { children: label, emphasis: 'plain', expanded: false, action },
    {
      icon: [node('disclosure-arrow', { open: false, ...arrow }, arrowZones)],
    },
  );

/** Places a Grid set up by `spec` (and `css`) at the first empty spot. */
export async function grid(
  page: Page,
  spec: FieldSpec,
  css: Readonly<Record<string, string>> = {},
) {
  await dragComponent(page, 'Grid', () => emptySpot(page));
  await select(page, /^Grid/);
  await applySpec(page, spec);
  for (const [name, value] of Object.entries(css))
    await setCss(page, name, value);
}

/** Adds a framed surface ContentItem reading `text` to the Grid. */
export async function gridTile(page: Page, text: string) {
  await addInto(page, /^Grid/, 'ContentItem');
  await applySpec(page, {
    choices: { appearance: 'surface', frame: 'framed' },
    text: { children: text },
  });
}

export const gridTileNode = (children: string) =>
  node('content-item', { children, appearance: 'surface', frame: 'framed' });

/** Adds a TextField with `label` and `value` to the Grid. */
export async function gridField(page: Page, label: string, value: string) {
  await addInto(page, /^Grid/, 'TextField');
  await applySpec(page, { text: { label, value } });
}

export const DOCUMENT_TILES = [
  'Brief',
  'Budget',
  'Contract',
  'Invoice',
  'Receipt',
] as const;

/** A nested Pane (set up by `spec`) at the first empty spot; Pane 1. */
export async function nestedPane(page: Page, spec: FieldSpec) {
  await dragComponent(page, 'Pane', () => emptySpot(page));
  await select(page, /^Pane/, 1);
  await applySpec(page, spec);
}

export const nestedPaneNode = (
  props: Record<string, unknown>,
  content: unknown[],
) => node('pane', props, { content });

/** A DemoContentItem in the nested Pane, then `spec` on that item. */
export async function copyItem(
  page: Page,
  title: string,
  detail: string,
  spec: FieldSpec,
  index = 0,
) {
  await contentItemInto(page, /^Pane/, 1, title, detail);
  await select(page, /^ContentItem/, index);
  await applySpec(page, spec);
}

/** `copyItem`'s node: a DemoContentItem given `props`. */
export const copyItemNode = (
  title: string,
  detail: string,
  props: Record<string, unknown>,
) => ({ ...demoContentItem(title, detail), props });

export const FEED_TITLES = [
  'Harbor at dusk',
  'Morning coastline',
  'Night crossing',
] as const;

/**
 * Closes the open Configure form: Done for one the field dialog holds, Back
 * for one open in place of the Inspector's Properties.
 */
export async function closeForm(page: Page) {
  const dialog = page.locator('dialog[open]:not([data-editor-canvas] dialog)');
  if (await dialog.count()) {
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toHaveCount(0);
  } else await backOut(page);
}

/**
 * Binds the open form's field `label` to `source` with Bind a field, or
 * promotes it to a param when `source` is left out (KF-3QEZFB).
 */
export async function bindField(page: Page, label: string, source?: string) {
  const pick = async (part: string, option: string) => {
    const control = page
      .locator(`[data-editor-bind="${part}"]`)
      .filter({ visible: true });
    await control.locator('.kui-select__trigger').click();
    await control.getByRole('option', { name: option, exact: true }).click();
  };
  await pick('field', label);
  if (source) await pick('field-source', source);
  else
    await page
      .getByRole('button', { name: 'Promote to a param' })
      .filter({ visible: true })
      .click();
  await expect(
    page.locator('[data-editor-bind="field-source"]').filter({ visible: true }),
  ).toContainText(source ?? 'Param ');
}

/** Renames the param an open object form's bound field uses (KF-5ZMAEM). */
export async function nameFieldParam(page: Page, from: string, to: string) {
  const field = page
    .locator(`[data-editor-param="${from}"] input`)
    .filter({ visible: true });
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(to);
  await page.keyboard.press('Enter');
  await expect(
    page.locator(`[data-editor-param="${to}"]`).filter({ visible: true }),
  ).toHaveCount(1);
}

/** The Interactive Cards demo's three cards' `itemCopy` titles and details. */
export const CARD_COPY = [
  ['Line Item 42', 'Select this item for review.'],
  ['Card with Action', 'The inner button acts on its own.'],
  ['Locked Item', 'Unavailable while processing.'],
] as const;

export const DOCUMENT_CARDS = [
  ['document-a', 'Document A'],
  ['document-b', 'Document B'],
] as const;

/** Adds a Row (set up by `row`) holding a Button to ContentSwap side `zone`. */
export async function swapButtonRow(
  page: Page,
  owner: RegExp,
  ownerIndex: number,
  zone: string,
  row: FieldSpec,
  button: FieldSpec,
) {
  await select(page, owner, ownerIndex);
  await addChild(page, 'Row', zone);
  await area(page, 'Properties');
  await applySpec(page, row);
  await addChild(page, 'Button');
  await area(page, 'Properties');
  await applySpec(page, button);
}

/** Deletes a ContentSwap's seeded side Texts ("A" and "B"). */
export async function dropSwapSeeds(page: Page) {
  for (let side = 0; side < 2; side += 1) {
    await select(page, /^Text(?![A-Z])/);
    await deleteSelected(page);
  }
}

/** A root-level Text: its copy, a FieldSpec, and its builder-call css. */
export type RootText = {
  readonly text: string;
  readonly spec?: FieldSpec;
  readonly css?: Readonly<Record<string, string>>;
};

/**
 * Places one Text per entry at the document's root, in order. A demo's
 * native `data-demo-copy` attribute is the Text's root data attribute.
 */
export async function rootTexts(page: Page, texts: readonly RootText[]) {
  for (const [index, { text, spec = {}, css = {} }] of texts.entries()) {
    if (index === 0) {
      await dragComponent(page, 'Text', () => emptySpot(page));
      await select(page, /^Text(?![A-Z])/);
    } else await addInto(page, /^Pane/, 'Text');
    await applySpec(page, { ...spec, text: { children: text, ...spec.text } });
    for (const [name, value] of Object.entries(css))
      await setCss(page, name, value);
  }
}

/**
 * KF-YBMVVM: adds a text run reading `value` to the `nth` `parent`'s zone,
 * after the nodes already in it.
 */
export async function textRun(
  page: Page,
  parent: RegExp,
  nth: number,
  value: string,
) {
  await select(page, parent, nth);
  await addChild(page, 'Text run');
  const field = page.locator('[data-editor-text-run] input');
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

/** A `#text` run as the exported document spells it. */
export const runNode = (value: string) => ({ type: '#text', value });

/** A transcript file the Chip demo offers for download. */
export const TRANSCRIPT_FILES = {
  user: [['failing-checks.log', 'file-text', 'bundle budget: +213 B']],
  assistant: [
    ['chip.tsx', 'file-code', 'export function Chip() {}'],
    [
      'design-template-drift-report-2026-10-13.md',
      'file-text',
      '# Design template drift',
    ],
  ],
} as const;

export const fileHref = (body: string) =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`;

export const SEARCH_FILTERS = [
  ['Status', ['is:draft', 'is:sent', 'is:awarded'], []],
  ['Ownership', ['is:mine', 'is:shared'], []],
  ['Site', ['site:Karachi', 'site:Lahore', 'site:Islamabad'], []],
  ['Content', ['has:questions', 'has:attachments'], ['has:attachments']],
] as const;

/**
 * KF-B516FB: a BackdropImage in the root Pane labeled `label`; its artwork
 * is the app's generated URL, a param named `param`.
 */
export async function backdrop(page: Page, label: string, param: string) {
  await rootPane(page, { text: { label } }, {});
  await select(page, /^Pane/);
  await addChild(page, 'BackdropImage', 'content');
  await area(page, 'Properties');
  await promote(page, 'Src');
  await nameParam(page, 'nodeSrc', param);
}

export const TRACKS = [
  ['Low Tide', '3:42'],
  ['Harbor Lights', '4:05'],
  ['Northbound', '3:18'],
  ['Glass Coast', '5:01'],
  ['Undertow', '3:56'],
  ['Night Ferry', '4:27'],
  ['Salt Air', '2:59'],
  ['Last Call', '4:12'],
  ['Lantern', '3:33'],
  ['Morning Swell', '4:48'],
] as const;

/** The BackdropImage demo's `TrackList`, added to the BackdropImage. */
export async function trackList(page: Page) {
  await addInto(page, /^BackdropImage/, 'List');
  await addChild(page, 'ListHeader');
  await area(page, 'Properties');
  await applySpec(page, {
    text: { label: 'Top Songs', count: '10', countLabel: '10 songs' },
  });
  for (const [index, [label, length]] of TRACKS.entries()) {
    await addInto(page, /^List(?![A-Z])/, 'ListItem');
    await area(page, 'Properties');
    await applySpec(page, {
      text: {
        action: 'log-backdrop-track',
        itemId: `track-${index + 1}`,
        label,
      },
    });
    await showProp(page, 'trailing');
    await page.locator('[data-editor-content-add="trailing"]').click();
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span', tone: 'quiet' },
      text: { children: length },
    });
  }
}

export const trackListNode = () =>
  node('list', undefined, {
    children: [
      node('list-header', {
        label: 'Top Songs',
        count: 10,
        countLabel: '10 songs',
      }),
      ...TRACKS.map(([label, length], index) =>
        node(
          'list-item',
          {
            action: 'log-backdrop-track',
            itemId: `track-${index + 1}`,
            label,
          },
          {
            trailing: [
              node('text', {
                children: length,
                variant: 'span',
                tone: 'quiet',
              }),
            ],
          },
        ),
      ),
    ],
  });

/** The BackdropImage overlay's title Toolbar. */
export async function titleOverlay(page: Page, label: string, text: string) {
  await select(page, /^BackdropImage/);
  await addChild(page, 'Toolbar', 'overlay');
  await area(page, 'Properties');
  await setText(page, 'label', label);
  await zoneText(
    page,
    'leading',
    { choices: { size: 'xlarge', headingLevel: '2' }, text: { text } },
    -1,
  );
}

export const titleOverlayNode = (label: string, text: string) =>
  node(
    'toolbar',
    { label },
    {
      leading: [
        node('toolbar-text', { text, size: 'xlarge', headingLevel: 2 }),
      ],
    },
  );

/** A Button reading `text` that carries an AnchoredSurface trigger hook. */
export async function surfaceTrigger(
  page: Page,
  text: string,
  trigger: string,
) {
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  await applySpec(page, {
    text: { children: text },
    data: [['data-anchored-surface-trigger', trigger]],
  });
}

export const surfaceTriggerNode = (text: string, trigger: string) =>
  node('button', {
    children: text,
    rootAttributes: { 'data-anchored-surface-trigger': trigger },
  });

export const FILLER_DETAIL =
  'Scroll the pane to move Night Harbor through the view.';

/** A LucideIcon's glyph, its name, and the rest of its setup. */
export type IconSpec = {
  readonly glyph: string;
  readonly name: string;
  readonly spec?: FieldSpec;
  readonly css?: Readonly<Record<string, string>>;
};

/** Sets up the selected LucideIcon: its glyph, name, props and css. */
export async function setupIcon(
  page: Page,
  { glyph, name, spec = {}, css = {} }: IconSpec,
) {
  await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
  await applySpec(page, { ...spec, text: { name, ...spec.text } });
  for (const [prop, value] of Object.entries(css))
    await setCss(page, prop, value);
}

/** One LucideIcon at the document's root. */
export async function rootIcon(page: Page, icon: IconSpec) {
  await dragComponent(page, 'LucideIcon', () => emptySpot(page));
  await select(page, /^LucideIcon/);
  await setupIcon(page, icon);
}

/** A Row (gap m, data hook) of LucideIcons. */
export async function iconRow(
  page: Page,
  hook: string,
  icons: readonly IconSpec[],
) {
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await applySpec(page, { choices: { gap: 'm' }, data: [[hook, '']] });
  for (const entry of icons) {
    await addInto(page, /^Row/, 'LucideIcon');
    await setupIcon(page, entry);
  }
}

/** The LucideIcon node an IconSpec builds, given its other exported props. */
export const iconNode = (
  { glyph, name }: IconSpec,
  props: Record<string, unknown> = {},
) => node('lucide-icon', { icon: { $icon: glyph }, name, ...props });

/** A root StateBanner set up by `spec`, with an icon and a pill Button. */
export async function rootBanner(
  page: Page,
  spec: FieldSpec,
  glyph?: string,
  action?: string,
) {
  await dragComponent(page, 'StateBanner', () => emptySpot(page));
  await select(page, /^StateBanner/);
  await applySpec(page, spec);
  if (glyph) {
    await addChild(page, 'LucideIcon', 'icon');
    await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
  }
  if (action) {
    await select(page, /^StateBanner/);
    await addChild(page, 'Button', 'action');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { size: 'compact', shape: 'pill' },
      text: { children: action },
    });
  }
}

/** A ToolbarText node as the exported document spells it. */
export const toolbarTextNode = (text: string, size?: string) =>
  node('toolbar-text', { text, ...(size ? { size } : {}) });

/**
 * Starts a Workbench build: the Workbench in a SizedRegion, with `id` and
 * `label`, its seeded work-area Text embedded as a DemoContentItem's title,
 * and an xlarge title on a main toolbar labeled the same.
 */
export async function workbench(
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

/**
 * Opens the forms down to panel `prop`'s content field `zone`
 * (`toolbar.leading`) and adds the Workbench demo's `iconGroup` to it: a
 * borderless single ToolbarControlGroup named `label` holding one icon ToolbarButton (the outline's `nth`) that runs
 * the demo command `glyph`, kept beside the toggle on collapse when
 * `relocate`.
 */
export async function iconGroup(
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
  await unset(page, 'children');
  await setText(page, 'action', 'workbench-demo-command');
  await dataAttribute(page, 'data-demo-command', glyph);
  await addIcon(page, 'icon', glyph);
}

/** An `iconGroup` as the exported document spells it. */
export const iconGroupNode = (label: string, glyph: string, relocate = false) =>
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
export async function panelToolbar(
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

/** Makes panel `prop` resizable between `min` and `max` px from `size`. */
export async function resizablePanel(
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
export async function dataAttribute(
  page: Page,
  name: string,
  value: string,
  index = 0,
) {
  // KF-QWDPM3: Data attributes are on the Properties overview.
  await area(page, 'Properties');
  await page.locator('[data-action="editor-add-data-attribute"]').click();
  const part = (which: string) =>
    page
      .locator(
        `[data-editor-attribute="${index}"][data-editor-attribute-part="${which}"]`,
      )
      .locator('input');
  await part('name').fill(name);
  await part('name').press('Enter');
  await part('value').fill(value);
  await part('value').press('Enter');
}

/** The split-view demo's messages (`ui/ux-demo/demos/split-view.tsx`). */
export const MESSAGES = [
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
export async function messageRows(page: Page, action: string, selected = true) {
  await select(page, /^List(?!Item|Header)/);
  await addChild(page, 'ListItem');
  await area(page, 'Properties');
  await setText(page, 'action', action);
  await turnOn(page, 'multiline');
  await addIcon(page, 'icon', 'message-square-text');
  // The demo names the glyph's icon "message".
  await setText(page, 'name', 'message');
  await select(page, /^ListItem/);
  await showProp(page, 'trailing');
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
export const messageItems = (action: string, selected = true) =>
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
export async function messageDetail(page: Page) {
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
export function messageDetailNode() {
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

// KF-JKVDKA: the dialog and sheet demos. The edit canvas shows every dialog
// embedded (KF-SYGSD0, KF-RWJ9KD), so its body and footer are built in place;
// each modal dialog's trigger is a `show-dialog` Button naming it.

/** A Button reading `text` that opens dialog `id`, at the first empty spot. */
export async function dialogTrigger(
  page: Page,
  text: string,
  id: string,
  spec: FieldSpec = {},
) {
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  await applySpec(page, {
    ...spec,
    text: { children: text, action: 'show-dialog', ...spec.text },
    data: [['data-dialog-id', id]],
  });
}

export const dialogTriggerNode = (
  text: string,
  id: string,
  props: Record<string, unknown> = {},
) =>
  node('button', {
    children: text,
    ...props,
    action: 'show-dialog',
    rootAttributes: { 'data-dialog-id': id },
  });

export const DIALOG = /^DialogSurface/;

/**
 * Appends a DialogSurface (the outline's `nth`) to the root Pane, set up by
 * `spec` and its css-value props `lengths` (builder calls), and leaves it
 * selected.
 */
export async function dialogSurface(
  page: Page,
  spec: FieldSpec,
  lengths: Readonly<Record<string, string>> = {},
  nth = 0,
) {
  await addInto(page, /^Pane/, 'DialogSurface');
  await select(page, DIALOG, nth);
  await applySpec(page, spec);
  for (const [name, value] of Object.entries(lengths))
    await setCss(page, name, value);
}

/** A `$css` value as the exported document spells it. */
export const css = (value: string) => ({ $css: value });

/** A Button set up by its spec; it closes its dialog when `close`. */
export type ZoneButton = FieldSpec & { readonly close?: boolean };

/** Adds one Button per entry of `buttons` to zone `zone` of `owner`. */
export async function zoneButtons(
  page: Page,
  owner: RegExp,
  zone: string,
  buttons: readonly ZoneButton[],
) {
  for (const { close, ...spec } of buttons) {
    await select(page, owner);
    await addChild(page, 'Button', zone);
    await area(page, 'Properties');
    await applySpec(page, {
      ...spec,
      data: close
        ? [['data-dialog-close', ''], ...(spec.data ?? [])]
        : spec.data,
    });
  }
}

export const closeButton = (
  children: string,
  props: Record<string, unknown> = {},
) =>
  node('button', {
    children,
    ...props,
    rootAttributes: { 'data-dialog-close': '' },
  });

/**
 * Replaces `owner`'s seeded body Text with a List holding one ListInsetText
 * per entry of `texts`.
 */
export async function insetTextList(
  page: Page,
  owner: RegExp,
  texts: readonly string[],
  nth = 0,
) {
  await addInto(page, owner, 'List', nth, 0);
  for (const text of texts) {
    await addInto(page, /^List(?![A-Z])/, 'ListInsetText', nth);
    await setText(page, 'children', text);
  }
}

export const insetTextListNode = (texts: readonly string[]) =>
  node('list', undefined, {
    children: texts.map((children) => node('list-inset-text', { children })),
  });

/** The outline's Text rows so far. */
export const textRows = (page: Page) =>
  page.locator('[data-action="editor-select-node"]', { hasText: /^Text\n/ });

/**
 * Adds a ListInsetText to the `nth` `parent` holding one span Text reading
 * `text` with id `id` (a dialog's `describedBy` target).
 */
export async function describedText(
  page: Page,
  parent: RegExp,
  text: string,
  id: string,
  nth = 0,
) {
  await addInto(page, parent, 'ListInsetText', nth);
  await addChild(page, 'Text');
  // Adding a child turned the inset's seeded text into a text run.
  await area(page, 'Outline');
  await outlineRow(page, /^Text “/)
    .first()
    .click();
  await deleteSelected(page);
  await select(page, /^Text(?![A-Z])/, -1);
  await applySpec(page, {
    choices: { variant: 'span' },
    text: { children: text, id },
  });
  await expect(canvas(page).locator(`span#${id}`)).toHaveText(text);
}

export const describedTextNode = (text: string, id: string) =>
  node('list-inset-text', undefined, {
    children: [node('text', { children: text, variant: 'span', id })],
  });

/** The dialog with id `id` as the canvas shows it: embedded, with `buttons`. */
export async function expectShown(
  page: Page,
  id: string,
  buttons: readonly string[],
) {
  const shown = canvas(page).locator(`dialog#${id}`);
  await expect(shown).toBeVisible();
  await expect(shown).toHaveAttribute('data-presentation', 'embedded');
  await expect(shown.getByRole('button')).toHaveCount(buttons.length);
  for (const name of buttons)
    await expect(
      shown.getByRole('button', { name, exact: true }),
    ).toBeVisible();
}

/**
 * Adds a ListInsetControl holding a TextField set up by `spec` to the List;
 * the inset's seeded text gives way to the field.
 */
export async function insetField(page: Page, spec: FieldSpec) {
  await addInto(page, /^List(?![A-Z])/, 'ListInsetControl');
  await area(page, 'Outline');
  const before = await textRows(page).count();
  await addChild(page, 'TextField');
  await select(page, /^Text(?![A-Z])/, before);
  await deleteSelected(page);
  await select(page, /^TextField/, -1);
  await applySpec(page, spec);
}

/** A plain Toolbar named `label` holding one single group's text button. */
export async function toolbarTrigger(
  page: Page,
  label: string,
  button: FieldSpec,
) {
  await toolbar(page, label);
  await zoneGroup(page, 'leading', { flags: ['single'] }, { keepButton: true });
  await select(page, /^ToolbarButton/);
  await applySpec(page, button);
}

export const toolbarTriggerNode = (
  label: string,
  button: Record<string, unknown>,
) =>
  node(
    'toolbar',
    { label },
    {
      leading: [
        node(
          'toolbar-control-group',
          { single: true },
          { children: [node('toolbar-control-group#ToolbarButton', button)] },
        ),
      ],
    },
  );

/** A chat message: who sent it, and its text. */
export type ChatMessage = readonly ['user' | 'assistant', string];

export const CHAT: readonly ChatMessage[] = [
  ['user', 'Why did the nightly build fail?'],
  [
    'assistant',
    'The bundle budget check failed: the demo bundle grew by 213 bytes after the dialog changes landed.',
  ],
  ['user', 'Which entry grew?'],
  [
    'assistant',
    'The surface scaffold entry. Its stylesheet gained the floating footer and fill-last body rules.',
  ],
  ['user', 'Is that expected?'],
  [
    'assistant',
    'Yes. Rebaseline the budget with a reason that names the new dialog layouts.',
  ],
  ['user', 'Anything else failing?'],
  ['assistant', 'No. Every other gate passed, including the browser suite.'],
];

export const THREAD: readonly ChatMessage[] = [
  ['user', 'Is the 5.2 release candidate ready to tag?'],
  [
    'assistant',
    'Almost. The changelog still lists the floating dialog header under Unreleased.',
  ],
  ['user', 'Move it under 5.2, then. What about the docs?'],
  [
    'assistant',
    'The accessibility guide gained the chrome-material contrast rule, and the catalog shows the new title bar.',
  ],
  ['user', 'Did the browser suite pass in every engine?'],
  [
    'assistant',
    'Chromium, Firefox, and WebKit all passed. Forced colors paints the title bar opaque with a visible edge.',
  ],
  ['user', 'And reduced transparency?'],
  [
    'assistant',
    'The title bar turns opaque, and the transcript still starts below it.',
  ],
  ['user', 'Great. Tag it after lunch.'],
  [
    'assistant',
    'Scheduled. I will post the release notes here once the tag is pushed.',
  ],
];

export const bubbleProps = (from: ChatMessage[0]) =>
  from === 'user'
    ? { bubble: 'end', appearance: 'brand-loud' }
    : { bubble: 'start', appearance: 'neutral' };

/**
 * Adds the chat demos' floating MessageComposer (`id`, `placeholder`) to the
 * dialog's footer, its seeded trailing Text giving way to the Send button.
 */
export async function dialogComposer(
  page: Page,
  id: string,
  placeholder: string,
) {
  await select(page, DIALOG);
  await addChild(page, 'MessageComposer', 'footer');
  await area(page, 'Properties');
  await applySpec(page, {
    flags: ['submitOnEnter'],
    text: { id, name: id, label: 'Message', placeholder },
  });
  await area(page, 'Outline');
  await outlineRow(page, /^Text/).last().click();
  await deleteSelected(page);
  await select(page, /^MessageComposer/);
  await addChild(page, 'Button', 'trailing');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'brand' },
    text: { children: 'Send', action: 'send-chat-dialog-message' },
  });
}

export const dialogComposerNode = (id: string, placeholder: string) =>
  node(
    'message-composer',
    { submitOnEnter: true, id, name: id, label: 'Message', placeholder },
    {
      trailing: [
        node('button', {
          children: 'Send',
          tone: 'brand',
          action: 'send-chat-dialog-message',
        }),
      ],
    },
  );

/**
 * Adds the scrolling transcript List (clearing the floating chrome on
 * `clearance`) to the dialog's body, with one bubble per message.
 */
export async function transcript(
  page: Page,
  clearance: string,
  messages: readonly ChatMessage[],
) {
  await select(page, DIALOG);
  await addChild(page, 'List', 'children');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { gap: 'xs', controlInsets: 'tb', scrollClearance: clearance },
    flags: ['scrollable'],
    data: [['data-demo-chat-transcript', '']],
  });
  for (const [from, text] of messages) {
    await addInto(page, /^List(?![A-Z])/, 'ContentItem');
    await applySpec(page, { choices: bubbleProps(from) });
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span' },
      text: { children: text },
    });
  }
  await expect(
    canvas(page).locator('[data-demo-chat-transcript] .kui-content-item'),
  ).toHaveCount(messages.length);
}

export const transcriptNode = (
  clearance: string,
  messages: readonly ChatMessage[],
) =>
  node(
    'list',
    {
      gap: 'xs',
      controlInsets: 'tb',
      scrollable: true,
      scrollClearance: clearance,
      rootAttributes: { 'data-demo-chat-transcript': '' },
    },
    {
      children: messages.map(([from, text]) =>
        node('content-item', bubbleProps(from), {
          children: [textNode(text, { variant: 'span' })],
        }),
      ),
    },
  );

export const WORKBENCH_DIALOG = /^WorkbenchDialog/;

/**
 * Makes WorkbenchDialog rail `prop` a static panel named `label` of `size`
 * px whose toolbar carries a ToolbarText title and a toggle running
 * `action`, and drops a List (insets tb), the outline's `list`th, in its
 * content slot.
 */
export async function dialogRail(
  page: Page,
  prop: string,
  label: string,
  size: number,
  action: string,
  list: number,
) {
  await select(page, WORKBENCH_DIALOG);
  await choose(page, prop, 'Static panel…');
  await configure(page, prop);
  await setField(page, prop, ['label'], label);
  await setField(page, prop, ['size'], String(size));
  await panelToolbar(page, prop, label, action);
  await openField(page, prop, ['toolbar']);
  await toolbarText(page, `${prop}.toolbar.title`, label);
  await select(page, WORKBENCH_DIALOG);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: `${prop}Content slot — drop here`,
    }),
  );
  // The outline lists the rails' content before the work area's.
  await select(page, /^List(?![A-Z])/, list);
  await choose(page, 'controlInsets', 'tb');
}

export const dialogRailProps = (
  label: string,
  size: number,
  action: string,
) => ({
  label,
  size,
  toolbar: { label, toggle: { action, name: label } },
});

/**
 * Fills the selected WorkbenchDialog's work area with a List (insets tb)
 * holding one ListInsetText reading `copy`, in place of its seeded Text.
 */
export async function workArea(page: Page, copy: string) {
  await addChild(page, 'List', 'main');
  // The seeded work-area Text gives way to the List.
  await select(page, /^Text(?![A-Z])/);
  await deleteSelected(page);
  await select(page, /^List(?![A-Z])/);
  await choose(page, 'controlInsets', 'tb');
  await addChild(page, 'ListInsetText');
  await area(page, 'Properties');
  await setText(page, 'children', copy);
}

/** The work-area List `workArea` builds. */
export const workAreaNode = (copy: string) =>
  node(
    'list',
    { controlInsets: 'tb' },
    { children: [node('list-inset-text', { children: copy })] },
  );

export const LAYERS = [
  ['title', 'Title', 'Text'],
  ['hero', 'Hero Image', 'Image'],
  ['caption', 'Caption', 'Text'],
  ['badge', 'Badge', 'Shape'],
] as const;

// KF-WBH5P2: ListDetailDialog's column fields. A ToolbarControlGroup in
// `list.toolbar` (or `detail.actions`) renders in the column's Toolbar, so
// it validates there.
export const LIST_DETAIL_DIALOG = /^ListDetailDialog/;

export const LDD_PROJECTS = [
  ['atlas', 'Atlas', 'Mara Chen', 'Active'],
  ['borealis', 'Borealis', 'Sam Rivera', 'Ready'],
  ['cirrus', 'Cirrus', 'Inez Okafor', 'Blocked'],
  ['delta', 'Delta', 'Theo Park', 'In review'],
  ['ember', 'Ember', 'Ana Ruiz', 'Active'],
  ['fjord', 'Fjord', 'Lena Holm', 'Archived'],
] as const;

export type LddProject = (typeof LDD_PROJECTS)[number];

/**
 * Places a List (insets tb) in the selected ListDetailDialog's `column`
 * content slot (`list` or `detail`); it is selected afterwards.
 */
export async function columnList(page: Page, column: 'list' | 'detail') {
  await select(page, LIST_DETAIL_DIALOG);
  await dragComponent(page, 'List', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: `${column}Content slot — drop here`,
    }),
  );
  await select(page, /^List(?![A-Z])/, column === 'list' ? 0 : 1);
  await choose(page, 'controlInsets', 'tb');
}

/**
 * Fills the ListDetailDialog's list column (titled Projects) with one
 * ListItem per project running `action`, Atlas selected.
 */
export async function projectColumn(
  page: Page,
  projects: readonly LddProject[],
  action: string,
) {
  await columnList(page, 'list');
  for (const [itemId, label, description] of projects) {
    await addInto(page, /^List(?![A-Z])/, 'ListItem', 0);
    await applySpec(page, {
      flags: itemId === 'atlas' ? ['selected'] : [],
      text: { label, description, itemId, action },
    });
  }
}

/** The list column's List `projectColumn` builds. */
export const projectColumnNode = (
  projects: readonly LddProject[],
  action: string,
) =>
  node(
    'list',
    { controlInsets: 'tb' },
    {
      children: projects.map(([itemId, label, description]) =>
        node('list-item', {
          label,
          description,
          itemId,
          action,
          ...(itemId === 'atlas' ? { selected: true } : {}),
        }),
      ),
    },
  );

/** The detail column's Project Details ValueTable for Atlas. */
export async function atlasDetails(page: Page) {
  await columnList(page, 'detail');
  await addInto(page, /^List(?![A-Z])/, 'ValueTable', 1);
  await valueTable(page, { text: { label: 'Project Details' } }, [
    valueRow('Owner', 'Mara Chen')[0],
    valueRow('Status', 'Active')[0],
  ]);
}

export const atlasDetailsNode = () =>
  node(
    'value-table',
    { label: 'Project Details' },
    {
      children: [
        ['Owner', 'Mara Chen'],
        ['Status', 'Active'],
      ].map(([label, value]) =>
        node('value-table#ValueTableRow', { label, value }),
      ),
    },
  );

/** Titles the ListDetailDialog's columns: Projects beside Atlas (Active). */
export async function columnTitles(page: Page) {
  await select(page, LIST_DETAIL_DIALOG);
  await configure(page, 'list');
  await setField(page, 'list', ['title'], 'Projects');
  await backOut(page);
  await configure(page, 'detail');
  await setField(page, 'detail', ['title'], 'Atlas');
  await setField(page, 'detail', ['description'], 'Active');
  await backOut(page);
}

export const LDD_DETAIL_COPY =
  'Each column scrolls on its own beneath its pinned chrome.';

export const SPLIT_PROJECTS = [
  'Atlas',
  'Borealis',
  'Cirrus',
  'Delta',
  'Ember',
  'Fjord',
] as const;

/**
 * Sets up the selected SplitView as the surface demos' project split (`id`):
 * a 240px list column of projects, Atlas selected, beside its detail copy.
 */
export async function projectSplit(page: Page, id: string) {
  await select(page, /^SplitView/);
  await applySpec(page, {
    text: {
      id,
      label: 'Projects',
      listTitle: 'Projects',
      detailTitle: 'Atlas',
    },
  });
  await choose(page, 'listWidth', 'Custom…');
  await openConfigure(page, 'Configure list width');
  await setField(page, 'listWidth', ['size'], '240');
  await setField(page, 'listWidth', ['maxFraction'], '0.4');
  await backOut(page);
  // Each pane's seeded Text is embedded in a List that takes the content,
  // and then deleted.
  await select(page, /^Text(?![A-Z])/);
  await embedInOther(page, 'List');
  for (const name of SPLIT_PROJECTS) {
    await addInto(page, /^List(?![A-Z])/, 'ListItem', 0);
    await applySpec(page, {
      flags: name === 'Atlas' ? ['selected'] : [],
      text: { label: name, itemId: name, action: 'log-more' },
    });
  }
  await select(page, /^Text(?![A-Z])/);
  await deleteSelected(page);
  await select(page, /^Text(?![A-Z])/);
  await embedInOther(page, 'List');
  await addInto(page, /^List(?![A-Z])/, 'ListInsetText', 1);
  await setText(page, 'children', SPLIT_DETAIL);
  await select(page, /^Text(?![A-Z])/);
  await deleteSelected(page);
  await expect(
    canvas(page).locator('.kui-split-view .kui-list-item'),
  ).toHaveCount(SPLIT_PROJECTS.length);
}

export const SPLIT_DETAIL =
  "Atlas is active. The split fills the surface's full height, and each column scrolls on its own.";

export const projectSplitNode = (id: string) =>
  node(
    'split-view',
    {
      id,
      label: 'Projects',
      listTitle: 'Projects',
      detailTitle: 'Atlas',
      listWidth: { size: 240, maxFraction: 0.4 },
    },
    {
      list: [
        node('list', undefined, {
          children: SPLIT_PROJECTS.map((name) =>
            node('list-item', {
              label: name,
              itemId: name,
              action: 'log-more',
              ...(name === 'Atlas' ? { selected: true } : {}),
            }),
          ),
        }),
      ],
      detail: [
        node('list', undefined, {
          children: [node('list-inset-text', { children: SPLIT_DETAIL })],
        }),
      ],
    },
  );

/**
 * The reader stack's first render: no reader open, Atlas first and
 * Borealis second, neither offset. The demo's two triggers sit in a Row
 * (its raw wrapper div became one, KF-JKVDKA).
 */
export const READERS = [
  ['atlas', 'Atlas Reader', 1],
  ['borealis', 'Borealis Reader', 2],
] as const;

export const READER_COPY =
  'This reader occupies the dialog body and keeps its overlay host inside the native top layer.';

export const READER_ITEMS = [{ label: 'Copy Link' }, { label: 'View History' }];

export type SummaryItem = {
  readonly id: string;
  readonly glyph: string;
  readonly title: string;
  readonly updated: string;
  readonly status: string;
  readonly tone: string;
  readonly rail?: string;
  readonly tags: readonly string[];
  readonly dimmed?: boolean;
};

/** The SummaryRow demo's three tickets; KF-12 starts selected. */
export const SUMMARY_ITEMS: readonly SummaryItem[] = [
  {
    id: 'KF-12',
    glyph: 'bug',
    title: 'Toolbar search overflows the trailing zone on narrow rails',
    updated: '2m',
    status: 'Started',
    tone: 'info',
    rail: 'warning',
    tags: ['toolbar', 'layout'],
  },
  {
    id: 'KF-13',
    glyph: 'lightbulb',
    title: 'Paged board snapping with a peeking next column',
    updated: '1h',
    status: 'Not started',
    tone: 'neutral',
    tags: ['board'],
  },
  {
    id: 'KF-14',
    glyph: 'list-todo',
    title: 'Document the summary row in the selection guide',
    updated: '3d',
    status: 'Completed',
    tone: 'success',
    tags: [],
    dimmed: true,
  },
];

export const SUMMARY_EDGES = ['start', undefined, 'end'] as const;

/**
 * A List (set up by `spec`) of the demo's option SummaryRows, each a
 * draggable option with a leading glyph, a strong id Text and a title Text,
 * a trailing time, and a metadata line of a Badge and Chips.
 */
export async function summaryRows(
  page: Page,
  presentation: 'row' | 'card',
  spec: FieldSpec,
) {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await applySpec(page, spec);
  for (const [index, item] of SUMMARY_ITEMS.entries()) {
    const edge = presentation === 'row' ? SUMMARY_EDGES[index] : undefined;
    await addInto(page, /^List(?![A-Z])/, 'SummaryRow');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: {
        ...(presentation === 'card' ? { presentation } : {}),
        ...(edge ? { listEdge: edge } : {}),
        ...(item.rail ? { rail: item.rail } : {}),
      },
      flags: [
        'draggable',
        ...(index === 0 ? ['selected'] : []),
        ...(item.dimmed ? ['dimmed'] : []),
      ],
      text: { trailingMeta: item.updated },
      data: [
        ['data-action', 'select-summary-row-demo'],
        ['data-item-id', item.id],
      ],
    });
    await summaryContent(page, index, item.glyph, async () => {
      // The row's seeded title copy is a Text: it becomes the strong id.
      await select(page, /^Text(?![A-Z])/, index * 2);
      await applySpec(page, {
        choices: { variant: 'span', weight: 'strong' },
        text: { children: item.id },
      });
      await select(page, /^SummaryRow/, index);
      await addChild(page, 'Text', 'title');
      await area(page, 'Properties');
      await applySpec(page, {
        choices: { variant: 'span' },
        text: { children: ` ${item.title}` },
      });
    });
    await select(page, /^SummaryRow/, index);
    await addChild(page, 'Badge', 'metadata');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { tone: item.tone, size: 'compact' },
      text: { children: item.status },
    });
    for (const tag of item.tags) {
      await select(page, /^SummaryRow/, index);
      await addChild(page, 'Chip', 'metadata');
      await area(page, 'Properties');
      await applySpec(page, {
        choices: { size: 'compact' },
        text: { children: tag },
      });
    }
  }
}

/** Gives the `index`th SummaryRow its leading glyph, then its title. */
export async function summaryContent(
  page: Page,
  index: number,
  glyph: string,
  title: () => Promise<void>,
) {
  await select(page, /^SummaryRow/, index);
  await addChild(page, 'LucideIcon', 'leading');
  await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
  await title();
}

/** The List of option SummaryRows `summaryRows` builds. */
export const summaryRowsNode = (
  presentation: 'row' | 'card',
  props: Record<string, unknown>,
) =>
  pane(
    node('list', props, {
      children: SUMMARY_ITEMS.map((item, index) => {
        const edge = presentation === 'row' ? SUMMARY_EDGES[index] : undefined;
        return node(
          'summary-row',
          {
            semanticRole: 'option',
            ...(presentation === 'card' ? { presentation } : {}),
            ...(edge ? { listEdge: edge } : {}),
            ...(item.rail ? { rail: item.rail } : {}),
            draggable: true,
            ...(index === 0 ? { selected: true } : {}),
            ...(item.dimmed ? { dimmed: true } : {}),
            trailingMeta: item.updated,
            rootAttributes: {
              'data-action': 'select-summary-row-demo',
              'data-item-id': item.id,
            },
          },
          {
            leading: [icon(item.glyph)],
            title: [
              textNode(item.id, { variant: 'span', weight: 'strong' }),
              textNode(` ${item.title}`, { variant: 'span' }),
            ],
            metadata: [
              node('badge', {
                children: item.status,
                tone: item.tone,
                size: 'compact',
              }),
              ...item.tags.map((tag) =>
                node('chip', { children: tag, size: 'compact' }),
              ),
            ],
          },
        );
      }),
    }),
  );

export type BoardColumn = {
  readonly title: string;
  readonly cards: readonly string[];
};

/** The ColumnTrack demo's five columns. */
export const BOARD: readonly BoardColumn[] = [
  { title: 'To Do', cards: ['Draft release notes', 'Audit tokens'] },
  { title: 'In Progress', cards: ['Paged board snapping'] },
  { title: 'Review', cards: ['ColumnTrack demo', 'Docs pass'] },
  { title: 'Done', cards: ['Ship Button toggles'] },
  { title: 'Later', cards: ['File drop zone'] },
];

/**
 * A ColumnTrack (set up by `track`) of the demo's columns: each a scrolling
 * List named as a region, holding a ListHeader and DemoContentItems.
 */
export async function board(page: Page, track: FieldSpec) {
  await dragComponent(page, 'ColumnTrack', () => emptySpot(page));
  await select(page, /^ColumnTrack/);
  await applySpec(page, track);
  let lists = 0;
  for (const [index, column] of BOARD.entries()) {
    // The track's seeded copy became a Text with its first child; it goes.
    await addInto(page, /^ColumnTrack/, 'List', 0, index ? undefined : 0);
    await select(page, /^List(?![A-Z])/, lists);
    await applySpec(page, {
      choices: { gap: 'xs', landmark: 'region' },
      flags: ['scrollable'],
      text: { ariaLabel: column.title },
    });
    await addChild(page, 'ListHeader');
    await setText(page, 'label', column.title);
    for (const card of column.cards)
      await contentItemInto(
        page,
        /^List(?![A-Z])/,
        lists,
        card,
        `In ${column.title}`,
      );
    // Each DemoContentItem holds a List of its own.
    lists += 1 + column.cards.length;
  }
}

/** The ColumnTrack `board` builds, given the track's props. */
export const boardNode = (props: Record<string, unknown>) =>
  pane(
    node('column-track', props, {
      children: BOARD.map((column) =>
        node(
          'list',
          {
            gap: 'xs',
            landmark: 'region',
            scrollable: true,
            ariaLabel: column.title,
          },
          {
            children: [
              node('list-header', { label: column.title }),
              ...column.cards.map((card) =>
                demoContentItem(card, `In ${column.title}`),
              ),
            ],
          },
        ),
      ),
    }),
  );

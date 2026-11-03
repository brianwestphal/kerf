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
  turnOff,
  turnOn,
  unset,
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
  await unset(page, 'action');
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

/** A Button FieldSpec plus the icon its `icon` content holds. */
type ButtonSpec = FieldSpec & { readonly glyph?: string };

/**
 * Places `buttons` in a wrapping Row (inside `parent` when given), each set
 * up by its spec, then gives the Row `data` attributes.
 */
async function buttons(
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
const buttonNode = (props: Record<string, unknown>, glyph?: string) =>
  node('button', props, glyph ? { icon: [icon(glyph)] } : undefined);

/** The wrapping Row `buttons` builds. */
const buttonRowNode = (
  children: unknown[],
  rootAttributes?: Record<string, string>,
) =>
  node(
    'row',
    { wrap: true, ...(rootAttributes ? { rootAttributes } : {}) },
    { children },
  );

test('builds Button › Full-Width Primary Action', async ({ page }) => {
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  await applySpec(page, {
    choices: { tone: 'brand' },
    flags: ['fill'],
    text: { children: 'Create Project', action: 'log-more' },
    data: [['data-demo-section', 'fill']],
  });
  await addIcon(page, 'icon', 'plus');
  await expect(canvas(page).locator('.kui-button')).toHaveText(
    'Create Project',
  );
  expect(await exported(page)).toEqual(
    pane(
      buttonNode(
        {
          children: 'Create Project',
          tone: 'brand',
          fill: true,
          action: 'log-more',
          rootAttributes: { 'data-demo-section': 'fill' },
        },
        'plus',
      ),
    ),
  );
});

test('builds Button › States', async ({ page }) => {
  await buttons(page, [
    {
      choices: { tone: 'brand' },
      flags: ['loading'],
      text: { children: 'Saving', action: 'log-more' },
    },
    {
      choices: { tone: 'success' },
      flags: ['loading'],
      text: { children: 'Checking Prices', action: 'log-more' },
    },
    {
      choices: { tone: 'success' },
      flags: ['disabled'],
      text: { children: 'Pricing Unavailable' },
    },
    { flags: ['disabled'], text: { children: 'Unavailable' } },
    {
      choices: { emphasis: 'secondary' },
      flags: ['disabled'],
      text: { children: 'Unavailable' },
    },
  ]);
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode([
        buttonNode({
          children: 'Saving',
          tone: 'brand',
          loading: true,
          action: 'log-more',
        }),
        buttonNode({
          children: 'Checking Prices',
          tone: 'success',
          loading: true,
          action: 'log-more',
        }),
        buttonNode({
          children: 'Pricing Unavailable',
          tone: 'success',
          disabled: true,
        }),
        buttonNode({ children: 'Unavailable', disabled: true }),
        buttonNode({
          children: 'Unavailable',
          emphasis: 'secondary',
          disabled: true,
        }),
      ]),
    ),
  );
});

test('builds Button › Current Step', async ({ page }) => {
  await buttons(
    page,
    [
      {
        flags: ['currentStep'],
        text: { children: 'Configure', action: 'log-more' },
      },
      { text: { children: 'Review', action: 'log-more' } },
      {
        flags: ['currentStep'],
        text: { children: 'Current Guide', href: '#button' },
      },
      { flags: ['currentStep', 'disabled'], text: { children: 'Locked Step' } },
    ],
    { data: [['data-demo-section', 'current-step']] },
  );
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode(
        [
          buttonNode({
            children: 'Configure',
            currentStep: true,
            action: 'log-more',
          }),
          buttonNode({ children: 'Review', action: 'log-more' }),
          buttonNode({
            children: 'Current Guide',
            href: '#button',
            currentStep: true,
          }),
          buttonNode({
            children: 'Locked Step',
            currentStep: true,
            disabled: true,
          }),
        ],
        { 'data-demo-section': 'current-step' },
      ),
    ),
  );
});

test('builds Button › Icon-Only', async ({ page }) => {
  await dragComponent(page, 'ListInsetControl', () => emptySpot(page));
  // Adding a child turns its seeded text into a Text node; delete that.
  await select(page, /^ListInsetControl/);
  await addChild(page, 'TextField');
  await select(page, /^Text(?![A-Z])/);
  await area(page, 'Flow');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await select(page, /^TextField/);
  await applySpec(page, {
    text: { label: 'Project Path', value: '~/Documents/projects/atlas' },
  });
  await select(page, /^ListInsetControl/);
  await addChild(page, 'Button');
  await applySpec(page, {
    text: { ariaLabel: 'Browse for a Folder', action: 'log-browse' },
    unsets: ['children'],
  });
  await addIcon(page, 'icon', 'folder-open');
  await expect(
    canvas(page).locator('.kui-button[aria-label="Browse for a Folder"]'),
  ).toBeVisible();
  expect(await exported(page)).toEqual(
    pane(
      node('list-inset-control', undefined, {
        children: [
          node('text-field', {
            label: 'Project Path',
            value: '~/Documents/projects/atlas',
          }),
          buttonNode(
            { ariaLabel: 'Browse for a Folder', action: 'log-browse' },
            'folder-open',
          ),
        ],
      }),
    ),
  );
});

test('builds Button › Icon-Only Tones and Sizes', async ({ page }) => {
  const iconOnly = (
    ariaLabel: string,
    glyph: string,
    action: string,
    rest: FieldSpec = {},
  ): ButtonSpec => ({
    ...rest,
    glyph,
    text: { ariaLabel, action, ...rest.text },
    unsets: ['children'],
  });
  await buttons(page, [
    iconOnly('Refresh', 'refresh-cw', 'log-refresh'),
    iconOnly('Refresh (Plain)', 'refresh-cw', 'log-refresh', {
      choices: { emphasis: 'plain' },
    }),
    iconOnly('Delete', 'trash', 'log-delete', {
      choices: { tone: 'danger', emphasis: 'secondary' },
      text: { title: 'Delete the Selected Draft' },
    }),
    iconOnly('Messages', 'message-square', 'log-more', {
      unions: { badge: ['Number…', '4'] },
      text: { badgeLabel: '4 unread' },
      data: [['data-demo-badge', 'count']],
    }),
    iconOnly('Downloads', 'download', 'log-more', {
      choices: { badge: 'true', badgeTone: 'info' },
      text: { badgeLabel: 'new download' },
      data: [['data-demo-badge', 'dot']],
    }),
    iconOnly('Refresh (Compact)', 'refresh-cw', 'log-refresh', {
      choices: { size: 'compact' },
    }),
  ]);
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode([
        buttonNode(
          { ariaLabel: 'Refresh', action: 'log-refresh' },
          'refresh-cw',
        ),
        buttonNode(
          {
            ariaLabel: 'Refresh (Plain)',
            emphasis: 'plain',
            action: 'log-refresh',
          },
          'refresh-cw',
        ),
        buttonNode(
          {
            ariaLabel: 'Delete',
            title: 'Delete the Selected Draft',
            tone: 'danger',
            emphasis: 'secondary',
            action: 'log-delete',
          },
          'trash',
        ),
        buttonNode(
          {
            ariaLabel: 'Messages',
            badge: 4,
            badgeLabel: '4 unread',
            action: 'log-more',
            rootAttributes: { 'data-demo-badge': 'count' },
          },
          'message-square',
        ),
        buttonNode(
          {
            ariaLabel: 'Downloads',
            badge: true,
            badgeLabel: 'new download',
            badgeTone: 'info',
            action: 'log-more',
            rootAttributes: { 'data-demo-badge': 'dot' },
          },
          'download',
        ),
        buttonNode(
          {
            ariaLabel: 'Refresh (Compact)',
            size: 'compact',
            action: 'log-refresh',
          },
          'refresh-cw',
        ),
      ]),
    ),
  );
});

/** Promotes prop `label` of the selected node to a param. */
async function promote(page: Page, label: string) {
  const picker = page.locator('[data-editor-promote]');
  await picker.locator('.kui-select__trigger').click();
  await picker.getByRole('option', { name: label, exact: true }).click();
  await page.getByRole('button', { name: 'Promote', exact: true }).click();
}

/**
 * Renames the selected node's param `from` to `to` from its bound prop's
 * row (KF-1HEZZZ), which renames every use of it too.
 */
async function nameParam(page: Page, from: string, to: string) {
  await area(page, 'Properties');
  const field = page.locator(`[data-editor-param="${from}"] input`);
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(to);
  await page.keyboard.press('Enter');
  await expect(page.locator(`[data-editor-param="${to}"]`)).toHaveCount(1);
}

/** Binds prop `label` of the selected node to source `source`. */
async function bind(page: Page, label: string, source: string) {
  for (const [part, option] of [
    ['prop', label],
    ['source', source],
  ] as const) {
    const control = page.locator(`[data-editor-bind="${part}"]`);
    await control.locator('.kui-select__trigger').click();
    await control.getByRole('option', { name: option, exact: true }).click();
  }
}

test('builds Button › Toggle', async ({ page }) => {
  const toggle = (rest: ButtonSpec): ButtonSpec => ({
    ...rest,
    text: { ...rest.text, action: 'toggle-button-demo' },
  });
  await buttons(page, [
    toggle({
      glyph: 'message-square',
      choices: { emphasis: 'plain' },
      text: { ariaLabel: 'Show Conversation' },
      unsets: ['children'],
    }),
    toggle({
      glyph: 'message-square',
      choices: { emphasis: 'secondary' },
      text: { children: 'Conversation' },
    }),
    toggle({ choices: { tone: 'brand' }, text: { children: 'Live' } }),
    toggle({ choices: { tone: 'success' }, text: { children: 'Approved' } }),
  ]);
  // The app owns the toggle's state: one param drives all four.
  await select(page, /^Button(?![A-Z])/, 0);
  await promote(page, 'Pressed');
  await nameParam(page, 'nodePressed', 'conversationOpen');
  for (const index of [1, 2, 3]) {
    await select(page, /^Button(?![A-Z])/, index);
    await bind(page, 'Pressed', 'Param conversationOpen');
  }
  const pressed = { $param: 'conversationOpen' };
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode([
        buttonNode(
          {
            ariaLabel: 'Show Conversation',
            emphasis: 'plain',
            pressed,
            action: 'toggle-button-demo',
          },
          'message-square',
        ),
        buttonNode(
          {
            children: 'Conversation',
            emphasis: 'secondary',
            pressed,
            action: 'toggle-button-demo',
          },
          'message-square',
        ),
        buttonNode({
          children: 'Live',
          tone: 'brand',
          pressed,
          action: 'toggle-button-demo',
        }),
        buttonNode({
          children: 'Approved',
          tone: 'success',
          pressed,
          action: 'toggle-button-demo',
        }),
      ]),
    ),
  );
});

test('builds Button › Shapes', async ({ page }) => {
  const inspector = (ariaLabel: string, rest: FieldSpec): ButtonSpec => ({
    ...rest,
    glyph: 'panel-right',
    choices: { emphasis: 'plain', ...rest.choices },
    text: { ariaLabel },
    unsets: ['children'],
  });
  await buttons(page, [
    {
      choices: { shape: 'pill' },
      text: { children: 'Pill', action: 'log-more' },
    },
    inspector('Inspector (Pill, Pressed)', {
      choices: { shape: 'pill', pressed: 'On' },
    }),
    inspector('Inspector (Pill)', {
      choices: { shape: 'pill', pressed: 'Off' },
    }),
    inspector('Inspector (Disabled)', {
      choices: { pressed: 'Off' },
      flags: ['disabled'],
    }),
  ]);
  const panel = (props: Record<string, unknown>) =>
    buttonNode({ emphasis: 'plain', ...props }, 'panel-right');
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode([
        buttonNode({ children: 'Pill', shape: 'pill', action: 'log-more' }),
        panel({
          ariaLabel: 'Inspector (Pill, Pressed)',
          shape: 'pill',
          pressed: true,
        }),
        panel({ ariaLabel: 'Inspector (Pill)', shape: 'pill', pressed: false }),
        panel({
          ariaLabel: 'Inspector (Disabled)',
          pressed: false,
          disabled: true,
        }),
      ]),
    ),
  );
});

/** The four focus-ring-inset Buttons of the clipping examples. */
const insetButtons: readonly ButtonSpec[] = [
  ['Dismiss', undefined],
  ['Confirm', 'brand'],
  ['Apply', 'success'],
  ['Erase', 'danger'],
].map(([children, tone]) => ({
  ...(tone ? { choices: { tone } } : {}),
  flags: ['focusRingInset'],
  text: { children: children!, action: 'log-more' },
}));

const insetButtonNodes = () =>
  insetButtons.map((spec) =>
    buttonNode({
      children: spec.text!.children,
      ...(spec.choices ? { tone: spec.choices.tone } : {}),
      focusRingInset: true,
      action: 'log-more',
    }),
  );

test('builds Button › Inside a Clipping Container', async ({ page }) => {
  await buttons(page, insetButtons, {
    data: [['data-demo-section', 'focus-ring-inset']],
  });
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode(insetButtonNodes(), {
        'data-demo-section': 'focus-ring-inset',
      }),
    ),
  );
});

test('builds Button › Inset Ring on a Sunken Surface', async ({ page }) => {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await select(page, /^SunkenPanel/);
  await setText(page, 'ariaLabel', 'Sunken Actions');
  await buttons(page, insetButtons, {
    data: [['data-demo-section', 'focus-ring-inset-sunken']],
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { ariaLabel: 'Sunken Actions' },
        {
          children: [
            buttonRowNode(insetButtonNodes(), {
              'data-demo-section': 'focus-ring-inset-sunken',
            }),
          ],
        },
      ),
    ),
  );
});

/** A SplitButton FieldSpec plus the icon its `icon` content holds. */
type SplitSpec = FieldSpec & { readonly glyph?: string };

/** A SplitButton spec for its four required strings, then `rest`. */
const split = (
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
const splitNode = (
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
async function splitButtons(
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

test('builds SplitButton › Full-Width Primary Action', async ({ page }) => {
  await dragComponent(page, 'ListInsetControl', () => emptySpot(page));
  await select(page, /^ListInsetControl/);
  await choose(page, 'sides', 'rl');
  // Adding a child turns its seeded text into a Text node; delete that.
  await addChild(page, 'SplitButton');
  await select(page, /^Text(?![A-Z])/);
  await area(page, 'Flow');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await select(page, /^SplitButton/);
  await applySpec(
    page,
    split(
      'Drive with Codex',
      'toggle-split-button-demo',
      'Choose Drive Provider, Model, and Effort',
      'toggle-split-button-options-demo',
      // The idle look, which the promoted params keep as their defaults.
      { flags: ['fill'], choices: { tone: 'success' } },
    ),
  );
  await addIcon(page, 'icon', 'play');
  // The app owns the running and menu state, so it supplies these four.
  await select(page, /^SplitButton/);
  for (const [prop, from, to] of [
    ['Label', 'nodeLabel', 'driveLabel'],
    ['Tone', 'nodeTone', 'driveTone'],
    ['Busy', 'nodeBusy', 'running'],
    ['Options expanded', 'nodeOptionsExpanded', 'optionsOpen'],
  ] as const) {
    await promote(page, prop);
    await nameParam(page, from, to);
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list-inset-control',
        { sides: 'rl' },
        {
          children: [
            node(
              'split-button',
              {
                label: { $param: 'driveLabel' },
                action: 'toggle-split-button-demo',
                optionsLabel: 'Choose Drive Provider, Model, and Effort',
                optionsAction: 'toggle-split-button-options-demo',
                optionsExpanded: { $param: 'optionsOpen' },
                tone: { $param: 'driveTone' },
                busy: { $param: 'running' },
                fill: true,
              },
              { icon: [icon('play')] },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds SplitButton › Tones and States', async ({ page }) => {
  await splitButtons(page, [
    split('Deploy', 'log-deploy', 'Deploy Options', 'log-deploy-options', {
      glyph: 'rocket',
    }),
    split('Delete', 'log-delete', 'Delete Options', 'log-delete-options', {
      choices: { tone: 'danger' },
    }),
    split('Publish', 'log-publish', 'Publish Options', 'log-publish-options', {
      flags: ['disabled'],
      text: { title: 'Nothing to publish' },
    }),
  ]);
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode([
        splitNode(
          'Deploy',
          'log-deploy',
          'Deploy Options',
          'log-deploy-options',
          {},
          'rocket',
        ),
        splitNode(
          'Delete',
          'log-delete',
          'Delete Options',
          'log-delete-options',
          {
            tone: 'danger',
          },
        ),
        splitNode(
          'Publish',
          'log-publish',
          'Publish Options',
          'log-publish-options',
          { disabled: true, title: 'Nothing to publish' },
        ),
      ]),
    ),
  );
});

test('builds SplitButton › Pill Shape', async ({ page }) => {
  const pill = (
    label: string,
    optionsLabel: string,
    rest: SplitSpec = {},
  ): SplitSpec =>
    split(
      label,
      'log-split-button-pill',
      optionsLabel,
      'log-split-button-pill-options',
      { ...rest, choices: { shape: 'pill', ...rest.choices } },
    );
  await splitButtons(page, [
    pill('Export', 'Export Formats', { glyph: 'download' }),
    pill('Run Checks', 'Check Options', { choices: { tone: 'neutral' } }),
  ]);
  const pillNode = (
    label: string,
    optionsLabel: string,
    props: Record<string, unknown> = {},
    glyph?: string,
  ) =>
    splitNode(
      label,
      'log-split-button-pill',
      optionsLabel,
      'log-split-button-pill-options',
      { shape: 'pill', ...props },
      glyph,
    );
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode([
        pillNode('Export', 'Export Formats', {}, 'download'),
        pillNode('Run Checks', 'Check Options', { tone: 'neutral' }),
      ]),
    ),
  );
});

/** A focus-ring-inset SplitButton of the clipping examples. */
const insetSplit = (label: string, tone?: string): SplitSpec =>
  split(
    label,
    'log-split-button-pill',
    `${label} Options`,
    'log-split-button-pill-options',
    { flags: ['focusRingInset'], ...(tone ? { choices: { tone } } : {}) },
  );

const insetSplitNode = (label: string, tone?: string) =>
  splitNode(
    label,
    'log-split-button-pill',
    `${label} Options`,
    'log-split-button-pill-options',
    { focusRingInset: true, ...(tone ? { tone } : {}) },
  );

test('builds SplitButton › Inside a Clipping Container', async ({ page }) => {
  const halves = [
    ['Sync', undefined],
    ['Archive', 'neutral'],
    ['Purge', 'danger'],
  ] as const;
  await splitButtons(
    page,
    halves.map(([label, tone]) => insetSplit(label, tone)),
    { data: [['data-demo-section', 'focus-ring-inset']] },
  );
  expect(await exported(page)).toEqual(
    pane(
      buttonRowNode(
        halves.map(([label, tone]) => insetSplitNode(label, tone)),
        { 'data-demo-section': 'focus-ring-inset' },
      ),
    ),
  );
});

test('builds SplitButton › Inset Ring on a Sunken Surface', async ({
  page,
}) => {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await select(page, /^SunkenPanel/);
  await setText(page, 'ariaLabel', 'Sunken Split Actions');
  await splitButtons(
    page,
    [insetSplit('Sync'), insetSplit('Purge', 'danger')],
    {
      data: [['data-demo-section', 'focus-ring-inset-sunken']],
    },
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { ariaLabel: 'Sunken Split Actions' },
        {
          children: [
            buttonRowNode(
              [insetSplitNode('Sync'), insetSplitNode('Purge', 'danger')],
              { 'data-demo-section': 'focus-ring-inset-sunken' },
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
  /** Text props cleared with their Not set toggle (a seeded placeholder). */
  readonly unsets?: readonly string[];
  /** Boolean props on by default, turned off. */
  readonly offs?: readonly string[];
  /** Data attributes, `[name, value]`, added to the node's root. */
  readonly data?: readonly (readonly [string, string])[];
};
/** Applies a FieldSpec to the selected node. */
async function applySpec(page: Page, field: FieldSpec) {
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
async function stacked(
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
async function textFields(page: Page, fields: readonly FieldSpec[]) {
  await stacked(page, 'List', 'TextField', fields, () =>
    choose(page, 'gap', 'xs'),
  );
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

const xsList = (component: string, props: readonly Record<string, unknown>[]) =>
  pane(
    node(
      'list',
      { gap: 'xs' },
      { children: props.map((each) => node(component, each)) },
    ),
  );

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

/** A Chip configured by `spec`, removable through the demo's action. */
async function chip(page: Page, text: string, spec: FieldSpec) {
  await dragComponent(page, 'Chip', () => emptySpot(page));
  await select(page, /^Chip(?![A-Z])/);
  await setText(page, 'children', text);
  await applySpec(page, spec);
  await setText(page, 'removeAction', 'log-chip-remove');
}

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

/** Types builder call `value` into css-value prop `name` of the selection. */
async function setCss(page: Page, name: string, value: string) {
  // A length-or-keyword prop picks Custom… to show its builder field.
  const css = page.locator(
    `[data-editor-prop="${name}"][data-editor-kind="css"]`,
  );
  if (
    !(await css.count()) &&
    (await page.locator(`[data-editor-prop="${name}"]`).count())
  )
    await choose(page, name, 'Custom…');
  const field = page
    .locator(`[data-editor-prop="${name}"][data-editor-kind="css"]`)
    .or(page.locator(`[data-editor-prop="${name}"]:not([data-editor-kind])`))
    .getByRole('textbox')
    .first();
  await field.fill(value);
  await field.press('Enter');
}

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

/** A ValueTableRow FieldSpec plus the icon its `icon` zone holds. */
type RowSpec = FieldSpec & { readonly glyph?: string };

/**
 * Configures the ValueTable already placed (set up by `table`) and fills
 * it with one ValueTableRow per spec.
 */
async function valueTable(
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
const valueRows = (
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
function valueRow(
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

/**
 * Types `value` into a multi-line text prop: Enter starts each new line,
 * and leaving the field (Tab) commits it (KF-8FCJ02).
 */
async function setLines(page: Page, name: string, value: string) {
  const field = page
    .locator(`[data-editor-prop="${name}"]`)
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
const LONG_VALUE = [
  'A title with a deliberate line break',
  'Second line keeps its indentation and a long token:',
  `    ${'recorded-source-'.repeat(18)}`,
  'A final line remains available by scrolling.',
].join('\n');

/** Adds a SunkenPanel holding a ValuePreview to `parent`, set up by `spec`. */
async function preview(
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

const previewNode = (props: Record<string, unknown>) =>
  node('sunken-panel', undefined, {
    children: [node('value-preview', props)],
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

/** The ColumnExplorer demos' nodes (Music loads on demand). */
const EXPLORER_NODES = [
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

const EXPLORER_ICONS: readonly (readonly [readonly number[], string])[] = [
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
async function explorer(page: Page, spec: FieldSpec, path: readonly string[]) {
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
const explorerZones = () =>
  Object.fromEntries(
    EXPLORER_ICONS.map(([at, glyph]) => [treeZone(at, 'icon'), [icon(glyph)]]),
  );

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

/** One choice of a `choices` prop, as the Configure choices form sets it. */
type ChoiceSpec = {
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
 * Fills the selected `owner`'s `choices` from Configure choices (adding rows
 * past the three seeded ones), then places each choice's icon in its `zone`
 * through the form's content row.
 */
async function configureChoices(
  page: Page,
  owner: RegExp,
  choices: readonly ChoiceSpec[],
  zone = 'icon',
) {
  await select(page, owner);
  await page.getByRole('button', { name: 'Configure choices' }).click();
  const dialog = page.locator('dialog[open]');
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
    await page.getByRole('button', { name: 'Configure choices' }).click();
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
const choiceValues = (choices: readonly ChoiceSpec[]) =>
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
const choiceZones = (choices: readonly ChoiceSpec[], zone = 'icon') =>
  Object.fromEntries(
    choices.flatMap((choice, index) =>
      choice.glyph ? [[`choices.${index}.${zone}`, [icon(choice.glyph)]]] : [],
    ),
  );

/**
 * Picks `labels` in an array value's multi-choice control (KF-8MEWP2), in
 * choice order; none picked is `[]`.
 */
async function chooseValues(page: Page, labels: readonly string[]) {
  const control = page.locator(
    '[data-editor-prop="value"][data-editor-kind="value-choices"]',
  );
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
async function chooseEmptyValue(page: Page) {
  await choose(page, 'value', 'Empty ("")');
}

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

const channelChoices: readonly ChoiceSpec[] = [
  { value: 'email', label: 'Email' },
  {
    value: 'push',
    label: 'Push notifications',
    hint: 'On devices where you are signed in.',
  },
  { value: 'digest', label: 'Weekly digest' },
  { value: 'sms', label: 'Text messages', disabled: true },
];

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

const colorChoices: readonly ChoiceSpec[] = [
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
async function choiceChips(
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

/**
 * Replaces list prop `prop` of the selected node with `value` through its
 * Configure dialog's Edit as JSON, as a person pastes a list in.
 */
async function editAsJson(page: Page, prop: string, value: unknown) {
  await page
    .locator(`[data-editor-open='${JSON.stringify({ prop, path: [] })}']`)
    // A row of a form the stack has left stays in the page, hidden.
    .filter({ visible: true })
    .first()
    .click();
  // A set list opens its form in a dialog; an unset one opens it in place
  // of the Inspector's Properties.
  const dialog = page.locator('dialog[open]');
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
async function setTags(page: Page, prop: string, tags: readonly string[]) {
  // A union's tags follow its type Select, which shares the prop name.
  const control = page
    .locator(`[data-editor-prop="${prop}"]:not([data-editor-kind="choice"])`)
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

/** A ColorSwatch as the demos spell it: the color's hex, upper-cased. */
const swatch = (value: string) => ({
  value,
  label: value.toUpperCase(),
  color: { $css: `fillColor("${value}")` },
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

const PALETTE = [
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
async function colorSwatches(
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

/** The brand send Button of the composer examples, in its trailing zone. */
async function composerSend(page: Page, label: string, id: string) {
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

const composerSendNode = (label: string, id: string) =>
  node('button', {
    children: label,
    tone: 'brand',
    action: 'send-composer-demo',
    rootAttributes: { 'data-message-composer-id': id },
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

/** A quiet compact readout Text, live, carrying data hook `hook`. */
async function readout(page: Page, text: string, hook: string) {
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

const readoutNode = (text: string, hook: string) =>
  node('text', {
    children: text,
    variant: 'span',
    tone: 'quiet',
    size: 'compact',
    live: 'polite',
    rootAttributes: { [hook]: '' },
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

/** The demos' DemoListInsetPane: a SunkenPanel named for the example. */
async function insetPane(page: Page) {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await select(page, /^SunkenPanel/);
  await setText(page, 'ariaLabel', 'List Inset Example');
}

const insetPaneNode = (...children: unknown[]) =>
  node('sunken-panel', { ariaLabel: 'List Inset Example' }, { children });

/** A reference StateBanner with a check icon, added to the SunkenPanel. */
async function referenceBanner(page: Page, tone: string, detail: string) {
  await select(page, /^SunkenPanel/);
  await addChild(page, 'StateBanner');
  await applySpec(page, {
    choices: { tone },
    text: { title: 'A Content Item, for Reference', detail },
  });
  await addChild(page, 'LucideIcon', 'icon');
  await pickIcon(page, page.locator('[data-editor-icon-place]'), 'check');
}

const referenceBannerNode = (tone: string, detail: string) =>
  node(
    'state-banner',
    { tone, title: 'A Content Item, for Reference', detail },
    { icon: [icon('check')] },
  );

/** Adds a ListInsetText reading `text` (on `sides`) to the SunkenPanel. */
async function insetText(page: Page, text: string, sides?: string) {
  await select(page, /^SunkenPanel/);
  await addChild(page, 'ListInsetText');
  await setText(page, 'children', text);
  if (sides) await choose(page, 'sides', sides);
}

const insetTextNode = (children: string, sides?: string) =>
  node('list-inset-text', { children, ...(sides ? { sides } : {}) });

/**
 * Adds a ListInsetControl (on `sides`) holding a `component`, set up by
 * `spec`, to the SunkenPanel; the inset's seeded text gives way to it.
 */
async function insetControl(
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

const insetControlNode = (child: unknown, sides?: string) =>
  node('list-inset-control', sides ? { sides } : undefined, {
    children: [child],
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

/** A ListItem FieldSpec plus its icon and a trailing span Text. */
type ItemSpec = FieldSpec & {
  readonly glyph?: string;
  readonly trailing?: string;
};

/** Gives the `index`th node named `name` its icon and trailing Text. */
async function itemContent(
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
async function listItems(
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
const itemNode = (
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
const labelChoices: readonly ChoiceSpec[] = [
  'Bug',
  'Feature',
  'Docs',
  'Design',
  'Performance',
].map((label) => ({ value: label.toLowerCase(), label }));

const balanceChoices: readonly ChoiceSpec[] = [
  { value: 'quiet', label: 'Quiet' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'explicit', label: 'Explicit' },
];

/** The toolbar Selects' choices, each with its icon. */
const toolbarChoices: readonly ChoiceSpec[] = [
  { value: 'quiet', label: 'Quiet', iconData: 'bell' },
  { value: 'balanced', label: 'Balanced', iconData: 'sliders-horizontal' },
  { value: 'explicit', label: 'Explicit', iconData: 'wrench' },
];

/** How a Select is set up: its choices, props, value, and extras. */
type SelectSpec = {
  readonly choices: readonly ChoiceSpec[];
  readonly props: FieldSpec;
  /** The picked choice's label, or labels when `multiple`. */
  readonly pick?: string | readonly string[];
  readonly triggerIcon?: string;
  /** The app supplies `renderSelected`, promoted to a param. */
  readonly renderSelected?: boolean;
};

/** Sets up the selected Select (the `nth` one) as `spec` says. */
async function configureSelect(page: Page, spec: SelectSpec, nth = 0) {
  await configureChoices(page, /^Select/, spec.choices);
  await select(page, /^Select/, nth);
  await applySpec(page, spec.props);
  if (Array.isArray(spec.pick)) await chooseValues(page, spec.pick);
  else if (typeof spec.pick === 'string')
    await choose(page, 'value', spec.pick);
  if (spec.renderSelected)
    await page.locator('[data-editor-promote-prop="renderSelected"]').click();
  if (spec.triggerIcon) {
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
async function selectAlone(page: Page, spec: SelectSpec) {
  await dragComponent(page, 'Select', () => emptySpot(page));
  await configureSelect(page, spec);
  // A placeholder Select renders a static box, not the interactive control.
  await expect(
    canvas(page).locator('[data-component="select"][data-kerf-node]'),
  ).toHaveCount(1);
}

/** The Select node `spec` builds, with `props` as exported. */
const selectNode = (
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
async function toolbarGroup(
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
    await page.locator('[data-action="editor-delete"]').click();
    await select(page, /^ToolbarControlGroup/);
  }
}

/** The Toolbar `toolbarGroup` builds, holding `children` in its group. */
const toolbarGroupNode = (
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
async function toolbarSelect(
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

/** The icon-only label filter both toolbar filter examples use. */
const labelFilter = (name: string, inGroup: boolean): SelectSpec => ({
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

const labelFilterNode = (name: string, inGroup: boolean) =>
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
const iconOnlyGroup = (label: string, rest: FieldSpec = {}): FieldSpec => ({
  ...rest,
  choices: { content: 'icon', focusRing: 'outline', ...rest.choices },
  flags: ['single', ...(rest.flags ?? [])],
  text: { label },
});

const iconOnlyGroupProps = (label: string, rest = {}) => ({
  label,
  content: 'icon',
  focusRing: 'outline',
  single: true,
  ...rest,
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
  await page.getByRole('button', { name: 'Configure items' }).click();
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

/** An icon-only toolbar Select of the toolbar choices. */
const toolbarIconSelect = (
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

const toolbarIconSelectNode = (
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
  await unset(page, 'children');
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

const shortcuts = [
  ['New Ticket', 'Create a ticket in the current project.', 'N'],
  ['Search', 'Focus the search field.', '/'],
  ['Complete Ticket', 'Mark the selected ticket done.', '⌘ ↵'],
] as const;

/**
 * Deletes the selected node with the Inspector's Delete, which a bare text
 * node (with no Flow area) has too.
 */
async function deleteSelected(page: Page) {
  await page.locator('[data-action="editor-delete"]').click();
}

/**
 * Adds `component` to the selected container; when the container held
 * seeded text, that text became a Text node, and is deleted.
 */
async function addInto(
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

/** The TreeList › Compact Outline demo's nodes; all but the root drag. */
const OUTLINE_NODES = [
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
const FILE_NODES = [
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
const FILE_ICONS: readonly (readonly [readonly number[], string])[] = [
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
const treeZone = (at: readonly number[], zone: string) =>
  `nodes.${at.join('.children.')}.${zone}`;

/**
 * Opens the selected TreeList's nodes form down to the node at `at`, then
 * follows its `zone` row, which closes the form for the zone's content.
 */
async function treeNodeZone(
  page: Page,
  at: readonly number[],
  zone: string,
  owner = /^TreeList/,
) {
  await select(page, owner);
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

/** A ListActionRow FieldSpec plus its icons and a custom icon tile. */
type ActionRowSpec = FieldSpec & {
  readonly glyph?: string;
  readonly trailingGlyph?: string;
  readonly tile?: { readonly color: string; readonly foreground?: string };
};

/**
 * Gives the `index`th ListActionRow its trailing button's icon; the
 * palette's row seeds a trailing menu, which the button replaces.
 */
async function trailingButton(page: Page, index: number, glyph: string) {
  await select(page, /^ListActionRow/, index);
  await addIcon(page, 'trailingActionIcon', glyph);
  await select(page, /^ListActionRow/, index);
  await page.getByRole('button', { name: 'Configure trailing menu' }).click();
  await page
    .locator('[data-action="editor-reset-field"]')
    .filter({ visible: true })
    .click();
}

/** A List of ListActionRows, each set up by its spec. */
async function actionRows(
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
      await page.getByRole('button', { name: 'Configure icon tile' }).click();
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
const actionRowNode = (
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

const tileCommands = [
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

/**
 * Adds a DemoContentItem (ContentItem › List › title and detail Texts) to
 * the `index`th node named `parent`.
 */
async function contentItemInto(
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

/** A DemoFrameShell: the SunkenPanel the layout demos frame examples in. */
async function frameShell(page: Page) {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await select(page, /^SunkenPanel/);
  await setText(page, 'ariaLabel', 'Layout Example');
}

const frameShellNode = (...children: unknown[]) =>
  node('sunken-panel', { ariaLabel: 'Layout Example' }, { children });

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
  await unset(page, 'text');
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
    await unset(page, 'children');
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
  test.setTimeout(test.info().timeout * 8);
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
    await unset(page, 'children');
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
  test.setTimeout(test.info().timeout * 8);
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
  await unset(page, 'children');
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

/** Places one ToolbarText, set up by `spec`, at the document's root. */
async function bareToolbarText(page: Page, spec: FieldSpec) {
  await dragComponent(page, 'ToolbarText', () => emptySpot(page));
  await select(page, /^ToolbarText/);
  await applySpec(page, spec);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
}

/** A bare ToolbarText reading `text`, at `size` and `heading` level. */
async function sizedToolbarText(
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

test('builds ToolbarText › Extra Large', ({ page }) =>
  sizedToolbarText(page, 'Workspace Settings', 'xlarge'));
test('builds ToolbarText › Fixed Extra Large', ({ page }) =>
  sizedToolbarText(page, 'Terminal Tickets', 'xlarge-fixed', '2'));
test('builds ToolbarText › Large', ({ page }) =>
  sizedToolbarText(page, 'Component Library', 'large'));
test('builds ToolbarText › Default', ({ page }) =>
  sizedToolbarText(page, 'Saved just now'));
test('builds ToolbarText › Small', ({ page }) =>
  sizedToolbarText(page, 'read-only', 'small'));
test('builds ToolbarText › Extra Small', ({ page }) =>
  sizedToolbarText(page, 'rail heading', 'xsmall'));

test('builds ToolbarText › Placeholder', async ({ page }) => {
  await bareToolbarText(page, {
    choices: { size: 'large' },
    flags: ['placeholder'],
    text: { text: '' },
  });
  expect(await exported(page)).toEqual(
    pane(node('toolbar-text', { text: '', size: 'large', placeholder: true })),
  );
});

const OVERFLOW_LABEL =
  'A very long workspace name that does not fit the available width and keeps going past two lines';

/** A bare large ToolbarText reading OVERFLOW_LABEL, wrapped or capped. */
async function overflowToolbarText(
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

test('builds ToolbarText › Ellipsis (Default)', ({ page }) =>
  overflowToolbarText(page, false));
test('builds ToolbarText › Wrap', ({ page }) =>
  overflowToolbarText(page, true));
test('builds ToolbarText › Wrap, Capped to 2 Lines', ({ page }) =>
  overflowToolbarText(page, true, '2'));

const TOOLBAR = /^Toolbar(?!Text|Control|Button)/;

/**
 * Adds a ToolbarControlGroup (set up by `spec`) to the `nth` Toolbar's
 * `zone`; the group's seeded ToolbarButton stays only when `keepButton`.
 */
async function zoneGroup(
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

test('builds ToolbarText › Dark Toolbar', async ({ page }) => {
  // The loud surface token is the catalog viewport's, not the view's.
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await select(page, TOOLBAR);
  await setText(page, 'label', 'Attachment Gallery');
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'dark' },
    text: { text: 'Quarterly report.pdf' },
  });
  await zoneGroup(page, 'trailing', {
    choices: { tone: 'dark', content: 'text' },
    flags: ['single'],
  });
  await addInto(page, /^ToolbarControlGroup/, 'ToolbarText');
  await applySpec(page, {
    choices: { tone: 'dark' },
    text: { text: 'Rename File', action: 'edit-toolbar-title' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Attachment Gallery' },
        {
          leading: [
            node('toolbar-text', {
              text: 'Quarterly report.pdf',
              tone: 'dark',
            }),
          ],
          trailing: [
            node(
              'toolbar-control-group',
              { tone: 'dark', single: true, content: 'text' },
              {
                children: [
                  node('toolbar-text', {
                    text: 'Rename File',
                    tone: 'dark',
                    action: 'edit-toolbar-title',
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

test('builds ToolbarText › Actionable Title Beside Status', async ({
  page,
}) => {
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await select(page, TOOLBAR);
  await setText(page, 'label', 'Demand Toolbar');
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'large' },
    text: {
      text: 'Annual Maintenance Procurement Plan',
      action: 'edit-toolbar-title',
    },
  });
  await select(page, TOOLBAR);
  await addChild(page, 'Chip', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'success' },
    text: { children: 'Approved' },
  });
  await zoneGroup(page, 'center', {
    choices: { content: 'search', sizing: 'grow' },
    flags: ['expanded'],
    text: { label: 'Search' },
  });
  await addInto(page, /^ToolbarControlGroup/, 'SearchField');
  await applySpec(page, {
    choices: { presentation: 'toolbar-group' },
    flags: ['fill'],
    text: {
      id: 'toolbar-text-demand-search',
      label: 'Search Demands',
      placeholder: 'Search demands',
    },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Demand Toolbar' },
        {
          leading: [
            node('toolbar-text', {
              text: 'Annual Maintenance Procurement Plan',
              size: 'large',
              action: 'edit-toolbar-title',
            }),
            node('chip', { children: 'Approved', tone: 'success' }),
          ],
          center: [
            node(
              'toolbar-control-group',
              {
                label: 'Search',
                content: 'search',
                sizing: 'grow',
                expanded: true,
              },
              {
                children: [
                  node('search-field', {
                    id: 'toolbar-text-demand-search',
                    label: 'Search Demands',
                    placeholder: 'Search demands',
                    presentation: 'toolbar-group',
                    fill: true,
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

test('builds ToolbarText › Supporting Text', async ({ page }) => {
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await select(page, TOOLBAR);
  await setText(page, 'label', 'Command Editor Heading');
  // The leading icon tile: a single brand-tile group holding an icon.
  await zoneGroup(page, 'leading', {
    choices: { tileTone: 'brand' },
    flags: ['single'],
    text: { label: 'Commands' },
  });
  await addInto(page, /^ToolbarControlGroup/, 'LucideIcon');
  await pickIcon(
    page,
    page.locator('[data-editor-icon-place]'),
    'square-terminal',
  );
  await select(page, TOOLBAR);
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'xlarge', headingLevel: '2' },
    text: {
      text: 'Custom Commands',
      id: 'toolbar-text-description-title',
      description: 'Changes save automatically.',
      descriptionId: 'toolbar-text-description-copy',
    },
  });
  await zoneGroup(
    page,
    'trailing',
    { flags: ['single'], text: { label: 'Close' } },
    { keepButton: true },
  );
  await select(page, /^ToolbarButton/);
  await applySpec(page, { text: { ariaLabel: 'Close' }, unsets: ['children'] });
  await addIcon(page, 'icon', 'x');
  // The second heading: a plain title with a description.
  await addInto(page, /^Pane/, 'Toolbar');
  await setText(page, 'label', 'Repository Status Heading');
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'xlarge' },
    text: {
      text: 'Repository Status',
      description: 'Working tree is clean',
    },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Command Editor Heading' },
        {
          leading: [
            node(
              'toolbar-control-group',
              { single: true, tileTone: 'brand', label: 'Commands' },
              { children: [icon('square-terminal')] },
            ),
            node('toolbar-text', {
              text: 'Custom Commands',
              size: 'xlarge',
              headingLevel: 2,
              id: 'toolbar-text-description-title',
              description: 'Changes save automatically.',
              descriptionId: 'toolbar-text-description-copy',
            }),
          ],
          trailing: [
            node(
              'toolbar-control-group',
              { single: true, label: 'Close' },
              {
                children: [
                  node(
                    'toolbar-control-group#ToolbarButton',
                    { ariaLabel: 'Close' },
                    { icon: [icon('x')] },
                  ),
                ],
              },
            ),
          ],
        },
      ),
      node(
        'toolbar',
        { label: 'Repository Status Heading' },
        {
          leading: [
            node('toolbar-text', {
              text: 'Repository Status',
              size: 'xlarge',
              description: 'Working tree is clean',
            }),
          ],
        },
      ),
    ),
  );
});

/** Sets up the selected ToolbarButton as an icon-only button. */
async function iconButton(page: Page, spec: FieldSpec, glyph: string) {
  await applySpec(page, { ...spec, unsets: ['children'] });
  await addIcon(page, 'icon', glyph);
}

// floatingToolbarOpen starts false: the first render shows the work area
// and its unpressed Show toggle; the floating toolbar is the app's state.
test('builds FloatingToolbar › Floating over Content', async ({ page }) => {
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await select(page, TOOLBAR);
  await applySpec(page, {
    choices: { dividerSides: 'b' },
    text: { label: 'Work Area' },
  });
  await zoneGroup(page, 'leading', {
    choices: { appearance: 'borderless' },
    flags: ['single'],
  });
  await addInto(page, /^ToolbarControlGroup/, 'ToolbarText');
  await applySpec(page, {
    choices: { size: 'small' },
    text: { text: 'Terminals' },
  });
  await zoneGroup(
    page,
    'trailing',
    { choices: { appearance: 'borderless' }, flags: ['single'] },
    { keepButton: true },
  );
  await select(page, /^ToolbarButton/);
  await iconButton(
    page,
    {
      choices: { pressed: 'Off' },
      text: {
        ariaLabel: 'Show Floating Toolbar',
        action: 'toggle-floating-toolbar',
      },
    },
    'panel-bottom-open',
  );
  await addInto(page, /^Pane/, 'ContentItem');
  await setText(
    page,
    'children',
    'Scrolling content sits behind the floating toolbar.',
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Work Area', dividerSides: 'b' },
        {
          leading: [
            node(
              'toolbar-control-group',
              { appearance: 'borderless', single: true },
              {
                children: [
                  node('toolbar-text', { text: 'Terminals', size: 'small' }),
                ],
              },
            ),
          ],
          trailing: [
            node(
              'toolbar-control-group',
              { appearance: 'borderless', single: true },
              {
                children: [
                  node(
                    'toolbar-control-group#ToolbarButton',
                    {
                      ariaLabel: 'Show Floating Toolbar',
                      action: 'toggle-floating-toolbar',
                      pressed: false,
                    },
                    { icon: [icon('panel-bottom-open')] },
                  ),
                ],
              },
            ),
          ],
        },
      ),
      node('content-item', {
        children: 'Scrolling content sits behind the floating toolbar.',
      }),
    ),
  );
});

test('builds FloatingToolbar › Inline Restore Cluster', async ({ page }) => {
  await dragComponent(page, 'FloatingToolbar', () => emptySpot(page));
  await select(page, /^FloatingToolbar/);
  await applySpec(page, {
    choices: { placement: 'inline' },
    text: { label: 'Inline Drawer Restore' },
  });
  // The group takes the place of the toolbar's seeded text.
  await addInto(page, /^FloatingToolbar/, 'ToolbarControlGroup', 0, 0);
  await select(page, /^ToolbarControlGroup/);
  await applySpec(page, {
    flags: ['single'],
    text: { label: 'Restore Drawer' },
  });
  await select(page, /^ToolbarButton/);
  await iconButton(page, { text: { ariaLabel: 'Restore Drawer' } }, 'terminal');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'floating-toolbar',
        { label: 'Inline Drawer Restore', placement: 'inline' },
        {
          children: [
            node(
              'toolbar-control-group',
              { label: 'Restore Drawer', single: true },
              {
                children: [
                  node(
                    'toolbar-control-group#ToolbarButton',
                    { ariaLabel: 'Restore Drawer' },
                    { icon: [icon('terminal')] },
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

/** A ToolbarButton's spec and the glyph of its icon. */
type IconButtonSpec = readonly [FieldSpec, string];

/**
 * Adds a ToolbarControlGroup (set up by `spec` and `css`) to the `nth`
 * Toolbar's `zone`, holding one icon-only ToolbarButton per entry. Zones
 * are built in order, so the newest group's buttons are the outline's last.
 */
async function buttonGroup(
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
const buttonGroupNode = (
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
async function toolbar(page: Page, label: string, spec: FieldSpec = {}) {
  await dragComponent(page, 'Toolbar', () => emptySpot(page));
  await select(page, TOOLBAR);
  await applySpec(page, { ...spec, text: { label, ...spec.text } });
}

test('builds Toolbar › Container Width Visibility', async ({ page }) => {
  await toolbar(page, 'Workspace Width Visibility');
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await setText(page, 'text', 'Workspace');
  await setCss(page, 'hideBelow', 'px(176)');
  await buttonGroup(
    page,
    'trailing',
    { flags: ['single'], text: { label: 'Refresh Workspace' } },
    [
      [
        { text: { ariaLabel: 'Refresh Workspace', action: 'width-refresh' } },
        'refresh-cw',
      ],
    ],
  );
  await buttonGroup(
    page,
    'trailing',
    { text: { label: 'Workspace Utilities' } },
    [
      [
        { text: { ariaLabel: 'Filter Workspace', action: 'width-filter' } },
        'funnel',
      ],
      [
        { text: { ariaLabel: 'Workspace Settings', action: 'log-settings' } },
        'settings',
      ],
    ],
    { css: { hideBelow: 'px(416)' } },
  );
  // The overflow menu stands in for the utilities below 416px.
  await zoneGroup(page, 'trailing', {
    flags: ['single', 'nestedDropdown'],
    text: { label: 'More Workspace Actions' },
  });
  await select(page, /^ToolbarControlGroup/, -1);
  await setCss(page, 'showBelow', 'px(416)');
  await addChild(page, 'PopupMenu');
  await area(page, 'Properties');
  await setText(page, 'label', 'More Workspace Actions');
  await unset(page, 'text');
  await addIcon(page, 'icon', 'ellipsis');
  await select(page, /^PopupMenu/);
  await editAsJson(page, 'items', [
    { label: 'Filter Workspace', action: 'width-filter' },
    { label: 'Workspace Settings', action: 'log-settings' },
  ]);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Workspace Width Visibility' },
        {
          leading: [
            node('toolbar-text', {
              text: 'Workspace',
              hideBelow: { $css: 'px(176)' },
            }),
          ],
          trailing: [
            buttonGroupNode({ label: 'Refresh Workspace', single: true }, [
              [
                { ariaLabel: 'Refresh Workspace', action: 'width-refresh' },
                'refresh-cw',
              ],
            ]),
            buttonGroupNode(
              { label: 'Workspace Utilities', hideBelow: { $css: 'px(416)' } },
              [
                [
                  { ariaLabel: 'Filter Workspace', action: 'width-filter' },
                  'funnel',
                ],
                [
                  { ariaLabel: 'Workspace Settings', action: 'log-settings' },
                  'settings',
                ],
              ],
            ),
            node(
              'toolbar-control-group',
              {
                label: 'More Workspace Actions',
                single: true,
                nestedDropdown: true,
                showBelow: { $css: 'px(416)' },
              },
              {
                children: [
                  node(
                    'popup-menu',
                    {
                      label: 'More Workspace Actions',
                      items: [
                        { label: 'Filter Workspace', action: 'width-filter' },
                        { label: 'Workspace Settings', action: 'log-settings' },
                      ],
                    },
                    { icon: [icon('ellipsis')] },
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

test('builds Toolbar › Focus Rings Across Toolbar Zones', async ({ page }) => {
  const group = (label: string) => ({
    choices: { focusRing: 'outline' },
    flags: ['single'],
    text: { label },
  });
  await toolbar(page, 'Focus Ring Zones', {
    choices: { responsive: 'stack', responsiveAt: 'compact' },
  });
  await buttonGroup(page, 'leading', group('Leading Action'), [
    [{ text: { ariaLabel: 'Leading Action' } }, 'funnel'],
  ]);
  await select(page, TOOLBAR);
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'large' },
    text: { text: 'A Long Toolbar Identity That Can Shrink' },
  });
  await buttonGroup(page, 'center', group('Center Action'), [
    [{ text: { ariaLabel: 'Center Action' } }, 'refresh-cw'],
  ]);
  await buttonGroup(page, 'trailing', group('Trailing Action'), [
    [{ text: { ariaLabel: 'Trailing Action' } }, 'settings'],
  ]);
  const groupNode = (label: string, glyph: string) =>
    buttonGroupNode({ label, focusRing: 'outline', single: true }, [
      [{ ariaLabel: label }, glyph],
    ]);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        {
          label: 'Focus Ring Zones',
          responsive: 'stack',
          responsiveAt: 'compact',
        },
        {
          leading: [
            groupNode('Leading Action', 'funnel'),
            node('toolbar-text', {
              text: 'A Long Toolbar Identity That Can Shrink',
              size: 'large',
            }),
          ],
          center: [groupNode('Center Action', 'refresh-cw')],
          trailing: [groupNode('Trailing Action', 'settings')],
        },
      ),
    ),
  );
});

test('builds Toolbar › Standalone Primary Action in Trailing', async ({
  page,
}) => {
  await toolbar(page, 'Project Heading', { choices: { responsive: 'wrap' } });
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'large' },
    text: { text: 'Project Tickets' },
  });
  await buttonGroup(
    page,
    'trailing',
    { flags: ['single'], text: { label: 'Other Actions' } },
    [[{ text: { ariaLabel: 'Refresh Tickets' } }, 'refresh-cw']],
  );
  await select(page, TOOLBAR);
  await addChild(page, 'Button', 'trailing');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'brand' },
    text: { children: 'New Ticket…', action: 'log-add' },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Project Heading', responsive: 'wrap' },
        {
          leading: [
            node('toolbar-text', { text: 'Project Tickets', size: 'large' }),
          ],
          trailing: [
            buttonGroupNode({ label: 'Other Actions', single: true }, [
              [{ ariaLabel: 'Refresh Tickets' }, 'refresh-cw'],
            ]),
            node('button', {
              children: 'New Ticket…',
              tone: 'brand',
              action: 'log-add',
            }),
          ],
        },
      ),
    ),
  );
});

/** Adds a ToolbarText (set up by `spec`) to the `nth` Toolbar's `zone`. */
async function zoneText(page: Page, zone: string, spec: FieldSpec, nth = 0) {
  await select(page, TOOLBAR, nth);
  await addChild(page, 'ToolbarText', zone);
  await area(page, 'Properties');
  await applySpec(page, spec);
}

test('builds Toolbar › Balanced Center with Trailing Actions', async ({
  page,
}) => {
  await toolbar(page, 'Ticket Header', {
    choices: { centerAlign: 'balanced' },
  });
  await zoneText(page, 'center', {
    choices: { size: 'large' },
    text: { text: 'TICKET-123' },
  });
  await buttonGroup(
    page,
    'trailing',
    { choices: { appearance: 'borderless' } },
    [
      [{ text: { ariaLabel: 'Refresh Ticket' } }, 'refresh-cw'],
      [{ text: { ariaLabel: 'Ticket Settings' } }, 'settings'],
    ],
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Ticket Header', centerAlign: 'balanced' },
        {
          center: [node('toolbar-text', { text: 'TICKET-123', size: 'large' })],
          trailing: [
            buttonGroupNode({ appearance: 'borderless' }, [
              [{ ariaLabel: 'Refresh Ticket' }, 'refresh-cw'],
              [{ ariaLabel: 'Ticket Settings' }, 'settings'],
            ]),
          ],
        },
      ),
    ),
  );
});

test('builds Toolbar › Gap Without Outer Inset', async ({ page }) => {
  // The --kui-toolbar-inset token is the catalog viewport's.
  const borderless = {
    choices: { appearance: 'borderless' },
    flags: ['single'],
  };
  await toolbar(page, 'Inset-Free Toolbar');
  await buttonGroup(page, 'leading', borderless, [
    [{ text: { ariaLabel: 'Filters' } }, 'funnel'],
  ]);
  await buttonGroup(page, 'trailing', borderless, [
    [{ text: { ariaLabel: 'Refresh' } }, 'refresh-cw'],
  ]);
  const group = (label: string, glyph: string) =>
    buttonGroupNode({ appearance: 'borderless', single: true }, [
      [{ ariaLabel: label }, glyph],
    ]);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Inset-Free Toolbar' },
        {
          leading: [group('Filters', 'funnel')],
          trailing: [group('Refresh', 'refresh-cw')],
        },
      ),
    ),
  );
});

test('builds Toolbar › Stacked Actions Wrap', async ({ page }) => {
  test.slow();
  const styles = [
    ['Bold', 'bold'],
    ['Italic', 'italic'],
    ['Underline', 'underline'],
  ] as const;
  await toolbar(page, 'Stacked Editor Controls', {
    choices: { responsive: 'stack', responsiveAt: 'compact' },
  });
  await zoneText(page, 'leading', {
    choices: { size: 'small' },
    text: { text: 'Draft' },
  });
  // The style toggles start unpressed: Off, not a plain action.
  await buttonGroup(
    page,
    'trailing',
    { choices: { buttonAppearance: 'push' }, text: { label: 'Text Style' } },
    styles.map(([label, glyph]) => [
      { choices: { pressed: 'Off' }, text: { ariaLabel: label } },
      glyph,
    ]),
  );
  await buttonGroup(
    page,
    'trailing',
    { choices: { buttonAppearance: 'push' }, text: { label: 'Draft Actions' } },
    [
      [{ text: { ariaLabel: 'Filter Drafts' } }, 'funnel'],
      [{ text: { ariaLabel: 'Refresh Drafts' } }, 'refresh-cw'],
    ],
  );
  await buttonGroup(
    page,
    'trailing',
    { flags: ['single'], text: { label: 'More Draft Actions' } },
    [[{ text: { ariaLabel: 'More Draft Actions' } }, 'ellipsis']],
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        {
          label: 'Stacked Editor Controls',
          responsive: 'stack',
          responsiveAt: 'compact',
        },
        {
          leading: [node('toolbar-text', { text: 'Draft', size: 'small' })],
          trailing: [
            buttonGroupNode(
              { label: 'Text Style', buttonAppearance: 'push' },
              styles.map(([label, glyph]) => [
                { ariaLabel: label, pressed: false },
                glyph,
              ]),
            ),
            buttonGroupNode(
              { label: 'Draft Actions', buttonAppearance: 'push' },
              [
                [{ ariaLabel: 'Filter Drafts' }, 'funnel'],
                [{ ariaLabel: 'Refresh Drafts' }, 'refresh-cw'],
              ],
            ),
            buttonGroupNode({ label: 'More Draft Actions', single: true }, [
              [{ ariaLabel: 'More Draft Actions' }, 'ellipsis'],
            ]),
          ],
        },
      ),
    ),
  );
});

test('builds Toolbar › Heading Identity Stays Whole', async ({ page }) => {
  await toolbar(page, 'Q3 Release', { choices: { responsive: 'wrap' } });
  await zoneGroup(page, 'leading', {
    choices: { appearance: 'borderless' },
    flags: ['single'],
  });
  await addInto(page, /^ToolbarControlGroup/, 'LucideIcon');
  await pickIcon(page, page.locator('[data-editor-icon-place]'), 'file-text');
  await zoneText(page, 'leading', {
    choices: { size: 'xlarge' },
    text: { text: 'Q3 Release' },
  });
  await zoneGroup(
    page,
    'trailing',
    {
      choices: { appearance: 'borderless', content: 'text' },
      flags: ['single'],
    },
    { keepButton: true },
  );
  await select(page, /^ToolbarButton/, -1);
  await applySpec(page, { text: { children: 'Publish', action: 'log-add' } });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Q3 Release', responsive: 'wrap' },
        {
          leading: [
            node(
              'toolbar-control-group',
              { appearance: 'borderless', single: true },
              { children: [icon('file-text')] },
            ),
            node('toolbar-text', { text: 'Q3 Release', size: 'xlarge' }),
          ],
          trailing: [
            node(
              'toolbar-control-group',
              { appearance: 'borderless', content: 'text', single: true },
              {
                children: [
                  node('toolbar-control-group#ToolbarButton', {
                    children: 'Publish',
                    action: 'log-add',
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

test('builds Toolbar › Trailing Search Priority', async ({ page }) => {
  const yielding = (label: string) => ({
    choices: { visibility: 'yield-to-expanded-sibling' },
    flags: ['single'],
    text: { label },
  });
  await toolbar(page, 'Search Tickets', {
    choices: { responsive: 'trailing-priority' },
  });
  await zoneText(page, 'leading', {
    choices: { size: 'large' },
    text: { text: 'Tickets' },
  });
  await zoneGroup(page, 'trailing', {
    choices: { content: 'search' },
    flags: ['expanded'],
  });
  await addInto(page, /^ToolbarControlGroup/, 'SearchField');
  await applySpec(page, {
    choices: { presentation: 'toolbar-group' },
    flags: ['collapsible', 'expanded'],
    text: {
      id: 'trailing-priority-search',
      label: 'Search Tickets',
      placeholder: 'Search tickets',
    },
  });
  await buttonGroup(page, 'trailing', yielding('View'), [
    [{ text: { ariaLabel: 'List View' } }, 'file-text'],
  ]);
  await buttonGroup(page, 'trailing', yielding('Actions'), [
    [{ text: { ariaLabel: 'More Actions' } }, 'ellipsis'],
  ]);
  const yieldingNode = (label: string, button: string, glyph: string) =>
    buttonGroupNode(
      { label, single: true, visibility: 'yield-to-expanded-sibling' },
      [[{ ariaLabel: button }, glyph]],
    );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Search Tickets', responsive: 'trailing-priority' },
        {
          leading: [node('toolbar-text', { text: 'Tickets', size: 'large' })],
          trailing: [
            node(
              'toolbar-control-group',
              { content: 'search', expanded: true },
              {
                children: [
                  node('search-field', {
                    id: 'trailing-priority-search',
                    label: 'Search Tickets',
                    collapsible: true,
                    expanded: true,
                    presentation: 'toolbar-group',
                    placeholder: 'Search tickets',
                  }),
                ],
              },
            ),
            yieldingNode('View', 'List View', 'file-text'),
            yieldingNode('Actions', 'More Actions', 'ellipsis'),
          ],
        },
      ),
    ),
  );
});

/**
 * The ToolbarControlGroup demos' frame: a Toolbar labeled `label` with one
 * group in its leading zone. Every group passes the demo's shape, `pill`
 * at first render; `buttons` fill it with icon-only ToolbarButtons.
 */
async function demoGroup(
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
const demoGroupNode = (
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
const toolbarButtonNode = (props: Record<string, unknown>, glyph: string) =>
  node('toolbar-control-group#ToolbarButton', props, { icon: [icon(glyph)] });

// The demo's toolbarGroupShape starts as 'pill'.
test('builds ToolbarControlGroup › Shape', async ({ page }) => {
  const shapes: readonly ChoiceSpec[] = [
    { value: 'pill', label: 'Pill' },
    { value: 'rounded', label: 'Rounded' },
  ];
  await toolbar(page, 'Shape');
  await zoneGroup(page, 'leading', {});
  await addInto(page, /^ToolbarControlGroup/, 'SegmentedControl');
  await configureChoices(page, /^SegmentedControl/, shapes);
  await select(page, /^SegmentedControl/);
  await applySpec(page, {
    choices: { appearance: 'toolbar', shape: 'pill', size: 'small' },
    text: {
      id: 'toolbar-group-shape',
      label: 'Group Shape',
      action: 'select-segment-demo',
    },
  });
  await choose(page, 'value', 'Pill');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Shape' },
        {
          leading: [
            node('toolbar-control-group', undefined, {
              children: [
                node('segmented-control', {
                  id: 'toolbar-group-shape',
                  label: 'Group Shape',
                  value: 'pill',
                  action: 'select-segment-demo',
                  appearance: 'toolbar',
                  shape: 'pill',
                  size: 'small',
                  choices: choiceValues(shapes),
                }),
              ],
            }),
          ],
        },
      ),
    ),
  );
});

test('builds ToolbarControlGroup › Corner Count', async ({ page }) => {
  await demoGroup(page, 'Corner Count', { flags: ['single'] }, [
    [
      {
        text: { ariaLabel: 'Hidden Workspaces, 3 hidden', action: 'log-more' },
        data: [['data-demo-corner-count', '']],
      },
      'eye-off',
    ],
  ]);
  // The count is a corner Badge beside the glyph in the button's icon.
  await select(page, /^ToolbarButton/);
  await addChild(page, 'Badge', 'icon');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: {
      tone: 'warning',
      appearance: 'solid',
      size: 'compact',
      placement: 'corner',
    },
    flags: ['ariaHidden'],
    text: { children: '3' },
  });
  await expect(
    canvas(page).locator('.kui-toolbar-control-group .kui-badge'),
  ).toHaveText('3');
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode('Corner Count', { single: true }, [
        node(
          'toolbar-control-group#ToolbarButton',
          {
            ariaLabel: 'Hidden Workspaces, 3 hidden',
            action: 'log-more',
            rootAttributes: { 'data-demo-corner-count': '' },
          },
          {
            icon: [
              icon('eye-off'),
              node('badge', {
                children: '3',
                tone: 'warning',
                appearance: 'solid',
                size: 'compact',
                placement: 'corner',
                ariaHidden: true,
              }),
            ],
          },
        ),
      ]),
    ),
  );
});

// toolbarChoice starts as 'list'.
test('builds ToolbarControlGroup › Segmented Choices', async ({ page }) => {
  const views: readonly ChoiceSpec[] = [
    { value: 'list', label: 'List View', glyph: 'list' },
    { value: 'columns', label: 'Columns View', glyph: 'columns-3' },
    { value: 'settings', label: 'Settings View', glyph: 'settings' },
  ];
  await demoGroup(page, 'Segmented Choices', {});
  await addInto(page, /^ToolbarControlGroup/, 'SegmentedControl');
  await configureChoices(page, /^SegmentedControl/, views, 'content');
  await select(page, /^SegmentedControl/);
  await applySpec(page, {
    choices: { appearance: 'toolbar', shape: 'pill', size: 'small' },
    text: {
      id: 'toolbar-view',
      label: 'View Mode',
      action: 'select-segment-demo',
    },
  });
  await choose(page, 'value', 'List View');
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode('Segmented Choices', {}, [
        node(
          'segmented-control',
          {
            id: 'toolbar-view',
            label: 'View Mode',
            value: 'list',
            action: 'select-segment-demo',
            appearance: 'toolbar',
            shape: 'pill',
            size: 'small',
            choices: choiceValues(views),
          },
          choiceZones(views, 'content'),
        ),
      ]),
    ),
  );
});

const SORT_ITEMS = [
  { label: 'Recently Updated', action: 'sort-recent' },
  { label: 'Priority', action: 'sort-priority' },
];

/** A Toolbar group holding the sort PopupMenu, labeled `label`. */
async function sortMenu(
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

test('builds ToolbarControlGroup › Popup Menu', ({ page }) =>
  sortMenu(page, 'Popup Menu', 'Sort Tickets', true));
test('builds ToolbarControlGroup › Popup Menu (Icon Only)', ({ page }) =>
  sortMenu(page, 'Popup Menu (Icon Only)', 'Sort Direction', false));

test('builds ToolbarControlGroup › Action Link', async ({ page }) => {
  await demoGroup(page, 'Action Link', {
    choices: { content: 'mixed' },
    flags: ['single'],
  });
  await addInto(page, /^ToolbarControlGroup/, 'ToolbarActionLink');
  await applySpec(page, {
    flags: ['external'],
    text: {
      href: 'https://github.com/brianwestphal/kerf',
      label: 'Repository',
    },
  });
  await addIcon(page, 'icon', 'external-link');
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode('Action Link', { content: 'mixed', single: true }, [
        node(
          'toolbar-control-group#ToolbarActionLink',
          {
            href: 'https://github.com/brianwestphal/kerf',
            label: 'Repository',
            external: true,
          },
          { icon: [icon('external-link')] },
        ),
      ]),
    ),
  );
});

/** Single-group examples: a group of icon buttons in a plain Toolbar. */
const buttonExamples: readonly (readonly [
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
async function buttonExample(page: Page, example: string) {
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

test('builds ToolbarControlGroup › Button Group', ({ page }) =>
  buttonExample(page, 'Button Group'));
test('builds ToolbarControlGroup › Single Button', ({ page }) =>
  buttonExample(page, 'Single Button'));
test('builds ToolbarControlGroup › Borderless Group', ({ page }) =>
  buttonExample(page, 'Borderless Group'));
test('builds ToolbarControlGroup › Push Button, Resting', ({ page }) =>
  buttonExample(page, 'Push Button, Resting'));
test('builds ToolbarControlGroup › Push Button, Pressed', ({ page }) =>
  buttonExample(page, 'Push Button, Pressed'));
test('builds ToolbarControlGroup › Pop Selected Tone', ({ page }) =>
  buttonExample(page, 'Pop Selected Tone'));
test('builds ToolbarControlGroup › Dark Group', ({ page }) =>
  buttonExample(page, 'Dark Group'));

test('builds ToolbarControlGroup › Icon-State Toggle', async ({ page }) => {
  await demoGroup(
    page,
    'Icon-State Toggle',
    { text: { label: 'Ticket Actions' } },
    [
      [
        {
          choices: { pressed: 'On', selectedChrome: 'none' },
          text: { ariaLabel: 'Up Next', action: 'log-up-next' },
        },
        'star',
      ],
      [{ text: { ariaLabel: 'Share', action: 'log-share' } }, 'share-2'],
    ],
  );
  // The filled star shows the pressed state.
  await select(page, /^LucideIcon/);
  await choose(page, 'appearance', 'solid');
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode('Icon-State Toggle', { label: 'Ticket Actions' }, [
        node(
          'toolbar-control-group#ToolbarButton',
          {
            ariaLabel: 'Up Next',
            pressed: true,
            selectedChrome: 'none',
            action: 'log-up-next',
          },
          { icon: [icon('star', { appearance: 'solid' })] },
        ),
        toolbarButtonNode(
          { ariaLabel: 'Share', action: 'log-share' },
          'share-2',
        ),
      ]),
    ),
  );
});

// toolbarSort starts as 'recent'.
test('builds ToolbarControlGroup › Select Beside Actions', async ({ page }) => {
  const sortChoices: readonly ChoiceSpec[] = [
    { value: 'recent', label: 'Recently Updated', iconData: 'calendar-clock' },
    { value: 'priority', label: 'Priority', iconData: 'flag' },
    { value: 'title', label: 'Title', iconData: 'arrow-down-a-z' },
  ];
  await demoGroup(
    page,
    'Select Beside Actions',
    { text: { label: 'Ticket View' } },
    [
      [
        {
          choices: { pressed: 'On' },
          text: { ariaLabel: 'Pin View', action: 'log-pin' },
        },
        'pin',
      ],
    ],
  );
  await addInto(page, /^ToolbarControlGroup/, 'Select');
  await configureSelect(page, {
    choices: sortChoices,
    props: {
      choices: {
        presentation: 'toolbar-borderless',
        selectedPresentation: 'icon-only',
      },
      text: { name: 'toolbar-group-sort', ariaLabel: 'Sort Tickets' },
      unsets: ['label'],
    },
    pick: 'Recently Updated',
  });
  await addInto(page, /^ToolbarControlGroup/, 'PopupMenu');
  await setText(page, 'label', 'More Actions');
  await unset(page, 'text');
  await addIcon(page, 'icon', 'ellipsis');
  await select(page, /^PopupMenu/);
  await editAsJson(page, 'items', [{ label: 'Archive', action: 'log-more' }]);
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode('Select Beside Actions', { label: 'Ticket View' }, [
        toolbarButtonNode(
          { ariaLabel: 'Pin View', action: 'log-pin', pressed: true },
          'pin',
        ),
        selectNode(
          {
            name: 'toolbar-group-sort',
            value: 'recent',
            ariaLabel: 'Sort Tickets',
            presentation: 'toolbar-borderless',
            selectedPresentation: 'icon-only',
          },
          { choices: sortChoices },
        ),
        node(
          'popup-menu',
          {
            label: 'More Actions',
            items: [{ label: 'Archive', action: 'log-more' }],
          },
          { icon: [icon('ellipsis')] },
        ),
      ]),
    ),
  );
});

// KF-921WVX: each tone is a heading identity, a Toolbar holding the tile
// group and a ToolbarText. The demo's toolbarGroupShape starts as 'pill'.
const tileTones = ['neutral', 'brand', 'success', 'warning', 'danger'] as const;
const toneName = (tone: string) => tone.charAt(0).toUpperCase() + tone.slice(1);

test('builds ToolbarControlGroup › Icon Tile Tones', async ({ page }) => {
  test.slow();
  for (const [index, tone] of tileTones.entries()) {
    if (index === 0) await toolbar(page, `${toneName(tone)} Heading`);
    else {
      await addInto(page, /^Pane/, 'Toolbar');
      await setText(page, 'label', `${toneName(tone)} Heading`);
    }
    await zoneGroup(
      page,
      'leading',
      {
        choices: { tileTone: tone, shape: 'pill' },
        flags: ['single'],
        text: { label: `${toneName(tone)} Icon Tile` },
      },
      { nth: index },
    );
    await addInto(page, /^ToolbarControlGroup/, 'LucideIcon', index);
    await pickIcon(page, page.locator('[data-editor-icon-place]'), 'settings');
    await zoneText(
      page,
      'leading',
      { text: { text: `${toneName(tone)} Heading Identity` } },
      index,
    );
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      ...tileTones.map((tone) =>
        node(
          'toolbar',
          { label: `${toneName(tone)} Heading` },
          {
            leading: [
              node(
                'toolbar-control-group',
                {
                  single: true,
                  tileTone: tone,
                  shape: 'pill',
                  label: `${toneName(tone)} Icon Tile`,
                },
                { children: [icon('settings')] },
              ),
              node('toolbar-text', {
                text: `${toneName(tone)} Heading Identity`,
              }),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds ToolbarControlGroup › Busy Action', async ({ page }) => {
  // toolbarGroupBusy starts false, which an unset `busy` is.
  const busyGroup = (flags: string[], choices = {}): FieldSpec => ({
    choices: { ...choices, shape: 'pill' },
    flags,
    text: { busyLabel: 'Running pricing check' },
  });
  await toolbar(page, 'Busy Action');
  await buttonGroup(page, 'leading', busyGroup(['single']), [
    [
      {
        text: { ariaLabel: 'Run Pricing Check', action: 'log-pricing-check' },
      },
      'git-compare',
    ],
  ]);
  await zoneGroup(
    page,
    'leading',
    busyGroup(['single'], { content: 'mixed' }),
    {
      keepButton: true,
    },
  );
  await select(page, /^ToolbarButton/, -1);
  await applySpec(page, {
    text: { children: 'Price Check', action: 'log-pricing-check' },
  });
  await addIcon(page, 'icon', 'git-compare');
  await select(page, TOOLBAR);
  await addChild(page, 'Button', 'trailing');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { emphasis: 'secondary' },
    text: {
      children: 'Start pricing check',
      action: 'toggle-toolbar-group-busy',
    },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Busy Action' },
        {
          leading: [
            buttonGroupNode(
              {
                single: true,
                shape: 'pill',
                busyLabel: 'Running pricing check',
              },
              [
                [
                  {
                    ariaLabel: 'Run Pricing Check',
                    action: 'log-pricing-check',
                  },
                  'git-compare',
                ],
              ],
            ),
            node(
              'toolbar-control-group',
              {
                single: true,
                content: 'mixed',
                shape: 'pill',
                busyLabel: 'Running pricing check',
              },
              {
                children: [
                  node(
                    'toolbar-control-group#ToolbarButton',
                    { children: 'Price Check', action: 'log-pricing-check' },
                    { icon: [icon('git-compare')] },
                  ),
                ],
              },
            ),
          ],
          trailing: [
            node('button', {
              children: 'Start pricing check',
              emphasis: 'secondary',
              action: 'toggle-toolbar-group-busy',
            }),
          ],
        },
      ),
    ),
  );
});

/** Places a List with no gap, carrying `section` as its demo hook. */
async function demoSection(page: Page, section: string) {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'none');
  await dataAttribute(page, 'data-demo-section', section);
}

/** The List `demoSection` builds, holding `children`. */
const demoSectionNode = (section: string, children: unknown[]) =>
  node(
    'list',
    { gap: 'none', rootAttributes: { 'data-demo-section': section } },
    { children },
  );

/** Adds a SearchField to the last ToolbarControlGroup, set up by `spec`. */
async function groupSearch(page: Page, spec: FieldSpec) {
  await select(page, /^ToolbarControlGroup/, -1);
  await addChild(page, 'SearchField');
  await area(page, 'Properties');
  await applySpec(page, {
    ...spec,
    choices: { presentation: 'toolbar-group', ...spec.choices },
  });
}

test('builds ToolbarControlGroup › Collapsible Search', async ({ page }) => {
  // toolbarGroupSearchOpen starts closed: the group is single and neither
  // the group nor the field is expanded.
  await demoSection(page, 'toolbar-group-search');
  await addInto(page, /^List/, 'Toolbar');
  await setText(page, 'label', 'Collapsible Search');
  await zoneGroup(page, 'leading', {
    choices: {
      shape: 'pill',
      content: 'search',
      focusRing: 'halo',
      expandedOverflow: 'visible',
    },
    flags: ['single'],
  });
  await groupSearch(page, {
    flags: ['collapsible'],
    text: {
      id: 'toolbar-group-search',
      label: 'Search Views',
      placeholder: 'Search views',
      expandLabel: 'Open search',
    },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      demoSectionNode('toolbar-group-search', [
        node(
          'toolbar',
          { label: 'Collapsible Search' },
          {
            leading: [
              node(
                'toolbar-control-group',
                {
                  shape: 'pill',
                  content: 'search',
                  focusRing: 'halo',
                  expandedOverflow: 'visible',
                  single: true,
                },
                {
                  children: [
                    node('search-field', {
                      id: 'toolbar-group-search',
                      label: 'Search Views',
                      collapsible: true,
                      presentation: 'toolbar-group',
                      placeholder: 'Search views',
                      expandLabel: 'Open search',
                    }),
                  ],
                },
              ),
            ],
          },
        ),
      ]),
    ),
  );
});

test('builds ToolbarControlGroup › Wrapping Zone Sizing', async ({ page }) => {
  test.slow();
  // toolbarStackSearchOpen starts closed: the rail search is single,
  // content-sized, and neither expanded nor filling.
  const views: readonly ChoiceSpec[] = [
    { value: 'list', label: 'List' },
    { value: 'board', label: 'Board' },
  ];
  const sortGroup = (nth: number) =>
    buttonGroup(
      page,
      'trailing',
      { flags: ['single'], text: { label: 'Sort' } },
      [[{ text: { ariaLabel: 'Sort Tickets' } }, 'arrow-down-a-z']],
      { nth },
    );
  await demoSection(page, 'toolbar-group-sizing');
  for (const nth of [0, 1]) {
    await addInto(page, /^List/, 'Toolbar');
    await select(page, TOOLBAR, nth);
    await unset(page, 'label');
    await choose(page, 'responsive', 'stack');
  }
  // The first toolbar: a growing search, then View and Sort.
  await zoneGroup(page, 'trailing', {
    choices: { content: 'search', sizing: 'grow' },
    flags: ['expanded', 'single'],
    text: { growBasis: '19rem', label: 'Search' },
  });
  await groupSearch(page, {
    flags: ['collapsible', 'expanded'],
    text: {
      id: 'toolbar-group-grow-search',
      label: 'Search Tickets',
      placeholder: 'Search tickets',
    },
  });
  await buttonGroup(
    page,
    'trailing',
    { flags: ['single'], text: { label: 'View' } },
    [[{ text: { ariaLabel: 'List View' } }, 'list']],
  );
  await sortGroup(0);
  // The rail: a filling SegmentedControl, Sort, and a collapsed search.
  await zoneGroup(
    page,
    'trailing',
    { choices: { sizing: 'fill' }, text: { label: 'Rail View' } },
    { nth: 1 },
  );
  await addInto(page, /^ToolbarControlGroup/, 'SegmentedControl', -1);
  await configureChoices(page, /^SegmentedControl/, views);
  await select(page, /^SegmentedControl/);
  // KF-FMGEJ6: WebKit drops the label commit when it repeats the group's
  // "Rail View", so commit another value first.
  await setText(page, 'label', 'Rail');
  await applySpec(page, {
    choices: { appearance: 'toolbar' },
    text: {
      id: 'toolbar-group-fill-view',
      label: 'Rail View',
      action: 'select-segment-demo',
    },
  });
  await choose(page, 'value', 'List');
  await sortGroup(1);
  await zoneGroup(
    page,
    'trailing',
    {
      choices: {
        content: 'search',
        visibility: 'hide-collapsed-tiny',
        sizing: 'content',
        placement: 'end',
      },
      flags: ['single'],
      text: { label: 'Search' },
    },
    { nth: 1 },
  );
  await groupSearch(page, {
    flags: ['collapsible'],
    text: {
      id: 'toolbar-stack-search',
      label: 'Search Tickets',
      expandLabel: 'Open search',
      placeholder: 'Search tickets',
    },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  const sortNode = buttonGroupNode({ label: 'Sort', single: true }, [
    [{ ariaLabel: 'Sort Tickets' }, 'arrow-down-a-z'],
  ]);
  expect(await exported(page)).toEqual(
    pane(
      demoSectionNode('toolbar-group-sizing', [
        node(
          'toolbar',
          { responsive: 'stack' },
          {
            trailing: [
              node(
                'toolbar-control-group',
                {
                  content: 'search',
                  sizing: 'grow',
                  growBasis: '19rem',
                  expanded: true,
                  single: true,
                  label: 'Search',
                },
                {
                  children: [
                    node('search-field', {
                      id: 'toolbar-group-grow-search',
                      label: 'Search Tickets',
                      collapsible: true,
                      expanded: true,
                      presentation: 'toolbar-group',
                      placeholder: 'Search tickets',
                    }),
                  ],
                },
              ),
              buttonGroupNode({ label: 'View', single: true }, [
                [{ ariaLabel: 'List View' }, 'list'],
              ]),
              sortNode,
            ],
          },
        ),
        node(
          'toolbar',
          { responsive: 'stack' },
          {
            trailing: [
              node(
                'toolbar-control-group',
                { sizing: 'fill', label: 'Rail View' },
                {
                  children: [
                    node('segmented-control', {
                      id: 'toolbar-group-fill-view',
                      label: 'Rail View',
                      value: 'list',
                      action: 'select-segment-demo',
                      appearance: 'toolbar',
                      choices: choiceValues(views),
                    }),
                  ],
                },
              ),
              sortNode,
              node(
                'toolbar-control-group',
                {
                  content: 'search',
                  visibility: 'hide-collapsed-tiny',
                  sizing: 'content',
                  placement: 'end',
                  single: true,
                  label: 'Search',
                },
                {
                  children: [
                    node('search-field', {
                      id: 'toolbar-stack-search',
                      label: 'Search Tickets',
                      collapsible: true,
                      presentation: 'toolbar-group',
                      expandLabel: 'Open search',
                      placeholder: 'Search tickets',
                    }),
                  ],
                },
              ),
            ],
          },
        ),
      ]),
    ),
  );
});

test('builds ToolbarControlGroup › Compact Mixed Controls', async ({
  page,
}) => {
  await demoGroup(
    page,
    'Compact Mixed Controls',
    {
      choices: { size: 'compact', content: 'mixed' },
      flags: ['nestedDropdown'],
      text: { label: 'Compact Formatting' },
    },
    [],
  );
  await addInto(page, /^ToolbarControlGroup/, 'ToolbarButton');
  await applySpec(page, {
    choices: { pressed: 'On' },
    text: { children: 'Favorite' },
  });
  await addIcon(page, 'icon', 'star');
  await addInto(page, /^ToolbarControlGroup/, 'PopupMenu');
  await setText(page, 'text', 'More');
  await unset(page, 'label');
  await select(page, /^PopupMenu/);
  await editAsJson(page, 'items', [{ label: 'Archive' }]);
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode(
        'Compact Mixed Controls',
        {
          label: 'Compact Formatting',
          size: 'compact',
          content: 'mixed',
          nestedDropdown: true,
        },
        [
          node(
            'toolbar-control-group#ToolbarButton',
            { children: 'Favorite', pressed: true },
            { icon: [icon('star')] },
          ),
          node('popup-menu', { text: 'More', items: [{ label: 'Archive' }] }),
        ],
      ),
    ),
  );
});

// The avatar is a bundled asset whose URL the app supplies: a param.
const avatarGroup = (label: string, rest: FieldSpec = {}): FieldSpec => ({
  ...rest,
  choices: { content: 'avatar', selectedTone: 'neutral', ...rest.choices },
  text: { label },
});

test('builds ToolbarControlGroup › Avatar Profile', async ({ page }) => {
  await demoGroup(
    page,
    'Avatar Profile',
    avatarGroup('Profile', { flags: ['scrim', 'single'] }),
    [],
  );
  await select(page, /^ToolbarControlGroup/);
  await promote(page, 'Avatar image');
  await nameParam(page, 'nodeAvatarImage', 'profileImageUrl');
  await addInto(page, /^ToolbarControlGroup/, 'ToolbarButton');
  await applySpec(page, {
    text: { ariaLabel: 'Open Brian Profile' },
    unsets: ['children'],
  });
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode(
        'Avatar Profile',
        {
          label: 'Profile',
          content: 'avatar',
          selectedTone: 'neutral',
          scrim: true,
          single: true,
          avatarImage: { $param: 'profileImageUrl' },
        },
        [
          node('toolbar-control-group#ToolbarButton', {
            ariaLabel: 'Open Brian Profile',
          }),
        ],
      ),
    ),
  );
});

// toolbarAvatarChoice starts as 'primary'.
test('builds ToolbarControlGroup › Avatar Selection', async ({ page }) => {
  const profiles = [
    ['Primary Profile', 'primary', 'On'],
    ['Secondary Profile', 'secondary', 'Off'],
  ] as const;
  await demoGroup(page, 'Avatar Selection', avatarGroup('Profile View'), []);
  await select(page, /^ToolbarControlGroup/);
  await promote(page, 'Avatar image');
  await nameParam(page, 'nodeAvatarImage', 'profileImageUrl');
  for (const [ariaLabel, value, pressed] of profiles) {
    await addInto(page, /^ToolbarControlGroup/, 'ToolbarButton');
    await applySpec(page, {
      choices: { pressed },
      text: { ariaLabel, action: 'select-avatar-demo' },
      unsets: ['children'],
      data: [['data-avatar-value', value]],
    });
  }
  expect(await exported(page)).toEqual(
    pane(
      demoGroupNode(
        'Avatar Selection',
        {
          label: 'Profile View',
          content: 'avatar',
          selectedTone: 'neutral',
          avatarImage: { $param: 'profileImageUrl' },
        },
        profiles.map(([ariaLabel, value, pressed]) =>
          node('toolbar-control-group#ToolbarButton', {
            ariaLabel,
            pressed: pressed === 'On',
            action: 'select-avatar-demo',
            rootAttributes: { 'data-avatar-value': value },
          }),
        ),
      ),
    ),
  );
});

// The artwork is the app's generated SVG URL: a promoted param.
test('builds ToolbarControlGroup › Glass Material', async ({ page }) => {
  test.slow();
  const glass = (label: string, single = false): FieldSpec => ({
    choices: { material: 'glass' },
    flags: single ? ['single'] : [],
    text: { label },
  });
  await dragComponent(page, 'Pane', () => emptySpot(page));
  await select(page, /^Pane/, 1);
  await applySpec(page, {
    choices: { headerPresentation: 'clear', scrollEdge: 'material' },
    text: { label: 'Glass Over Artwork' },
  });
  await addChild(page, 'Toolbar', 'header');
  await area(page, 'Properties');
  await setText(page, 'label', 'Glass Controls');
  await buttonGroup(
    page,
    'leading',
    {
      ...glass('Glass Navigation'),
      choices: { material: 'glass', shape: 'pill' },
    },
    [
      [
        { text: { ariaLabel: 'Earlier Photo', action: 'log-previous' } },
        'chevron-left',
      ],
      [
        { text: { ariaLabel: 'Later Photo', action: 'log-next' } },
        'chevron-right',
      ],
    ],
  );
  await buttonGroup(
    page,
    'trailing',
    {
      ...glass('Glass Share', true),
      choices: { material: 'glass', shape: 'pill' },
    },
    [[{ text: { ariaLabel: 'Share Photo', action: 'log-share' } }, 'share-2']],
  );
  await select(page, /^Pane/, 1);
  await addChild(page, 'BackdropImage', 'content');
  await area(page, 'Properties');
  await promote(page, 'Src');
  await nameParam(page, 'nodeSrc', 'skylineUrl');
  await select(page, /^BackdropImage/);
  await turnOn(page, 'underChrome');
  await setText(page, 'alt', '');
  await setCss(page, 'height', 'rem(12.5)');
  await setCss(page, 'fadeTo', "uiColor('surface')");
  const titles = [
    'Coastal Ridge',
    'Harbor Lights',
    'Northbound',
    'Glass Coast',
  ];
  for (const title of titles) {
    await addInto(page, /^BackdropImage/, 'ContentItem');
    await setText(page, 'children', title);
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'pane',
        {
          label: 'Glass Over Artwork',
          headerPresentation: 'clear',
          scrollEdge: 'material',
        },
        {
          header: [
            node(
              'toolbar',
              { label: 'Glass Controls' },
              {
                leading: [
                  buttonGroupNode(
                    {
                      label: 'Glass Navigation',
                      material: 'glass',
                      shape: 'pill',
                    },
                    [
                      [
                        { ariaLabel: 'Earlier Photo', action: 'log-previous' },
                        'chevron-left',
                      ],
                      [
                        { ariaLabel: 'Later Photo', action: 'log-next' },
                        'chevron-right',
                      ],
                    ],
                  ),
                ],
                trailing: [
                  buttonGroupNode(
                    {
                      label: 'Glass Share',
                      material: 'glass',
                      single: true,
                      shape: 'pill',
                    },
                    [
                      [
                        { ariaLabel: 'Share Photo', action: 'log-share' },
                        'share-2',
                      ],
                    ],
                  ),
                ],
              },
            ),
          ],
          content: [
            node(
              'backdrop-image',
              {
                src: { $param: 'skylineUrl' },
                alt: '',
                height: { $css: 'rem(12.5)' },
                fadeTo: { $css: "uiColor('surface')" },
                underChrome: true,
              },
              {
                children: titles.map((children) =>
                  node('content-item', { children }),
                ),
              },
            ),
          ],
        },
      ),
    ),
  );
});

/**
 * Opens the selected `owner`'s `prop` form down to the entry at `steps`
 * (indexes, with a nested list's key between them) and follows its `zone`
 * row, which places that zone's content (an icon zone, its icon).
 */
async function entryZone(
  page: Page,
  owner: RegExp,
  prop: string,
  steps: readonly (number | string)[],
  zone: string,
) {
  await select(page, owner);
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
async function menuIcons(
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
const menuIconZones = (
  icons: readonly (readonly [readonly (number | string)[], string, string?])[],
) =>
  Object.fromEntries(
    icons.map(([steps, glyph, name]) => [
      ['items', ...steps, 'icon'].join('.'),
      [icon(glyph, name ? { name } : {})],
    ]),
  );

test('builds PopupMenu › Grouped Commands with Icons', async ({ page }) => {
  const items = [
    { kind: 'heading', label: 'Ticket' },
    { label: 'Duplicate', action: 'log-more' },
    { label: 'Archive', action: 'log-more' },
    { kind: 'divider' },
    { label: 'Delete', action: 'log-more', disabled: true },
  ];
  const icons = [
    [[1], 'copy'],
    [[2], 'archive'],
    [[4], 'trash'],
  ] as const;
  await toolbar(page, 'Grouped Commands with Icons');
  await zoneGroup(page, 'leading', {
    choices: { content: 'mixed', menuInset: 'compact' },
    flags: ['single', 'nestedDropdown'],
  });
  await addInto(page, /^ToolbarControlGroup/, 'PopupMenu');
  await setText(page, 'text', 'Actions');
  await unset(page, 'label');
  await addIcon(page, 'icon', 'ellipsis');
  await select(page, /^PopupMenu/);
  await editAsJson(page, 'items', items);
  await menuIcons(page, icons);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Grouped Commands with Icons' },
        {
          leading: [
            node(
              'toolbar-control-group',
              {
                single: true,
                content: 'mixed',
                nestedDropdown: true,
                menuInset: 'compact',
              },
              {
                children: [
                  node(
                    'popup-menu',
                    { text: 'Actions', items },
                    { icon: [icon('ellipsis')], ...menuIconZones(icons) },
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

test('builds PopupMenu › Trailing Toolbar Menu', async ({ page }) => {
  const items = [
    { label: 'Export', action: 'log-more' },
    { label: 'Print', action: 'log-more' },
  ];
  await toolbar(page, 'Ticket View');
  await zoneText(page, 'leading', {
    choices: { size: 'xlarge' },
    text: { text: 'Tickets' },
  });
  await zoneGroup(page, 'trailing', {
    choices: { menuInset: 'compact' },
    flags: ['single', 'nestedDropdown'],
  });
  await addInto(page, /^ToolbarControlGroup/, 'PopupMenu');
  await setText(page, 'label', 'More Actions');
  await unset(page, 'text');
  await choose(page, 'placement', 'bottom-end');
  await addIcon(page, 'icon', 'ellipsis');
  await select(page, /^PopupMenu/);
  await editAsJson(page, 'items', items);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Ticket View' },
        {
          leading: [node('toolbar-text', { text: 'Tickets', size: 'xlarge' })],
          trailing: [
            node(
              'toolbar-control-group',
              { single: true, nestedDropdown: true, menuInset: 'compact' },
              {
                children: [
                  node(
                    'popup-menu',
                    { label: 'More Actions', placement: 'bottom-end', items },
                    { icon: [icon('ellipsis')] },
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

test('builds PopupMenu › Outlined Trigger Beside Buttons', async ({ page }) => {
  const items = ['Item', 'Heading', 'Divider'].map((label) => ({
    label,
    action: 'log-more',
  }));
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await choose(page, 'gap', 's');
  await turnOn(page, 'wrap');
  await addChild(page, 'PopupMenu');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { emphasis: 'secondary', size: 'compact' },
    text: { text: 'Add' },
    unsets: ['label'],
  });
  await addIcon(page, 'icon', 'plus');
  await select(page, /^PopupMenu/);
  await editAsJson(page, 'items', items);
  await addInto(page, /^Row/, 'Button');
  await applySpec(page, {
    choices: { emphasis: 'secondary', size: 'compact' },
    text: { children: 'Reset', action: 'log-more' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 's', wrap: true },
        {
          children: [
            node(
              'popup-menu',
              { text: 'Add', emphasis: 'secondary', size: 'compact', items },
              { icon: [icon('plus')] },
            ),
            node('button', {
              children: 'Reset',
              emphasis: 'secondary',
              size: 'compact',
              action: 'log-more',
            }),
          ],
        },
      ),
    ),
  );
});

/** Places a lone PopupMenu set up by `spec`, with `items`. */
async function lonePopupMenu(page: Page, spec: FieldSpec, items: unknown) {
  await dragComponent(page, 'PopupMenu', () => emptySpot(page));
  await select(page, /^PopupMenu/);
  await applySpec(page, spec);
  await editAsJson(page, 'items', items);
}

test('builds PopupMenu › Status Badge Trigger', async ({ page }) => {
  const items = [
    { label: 'Not Started', action: 'log-more', checked: false },
    {
      label: 'Started',
      checked: true,
      submenu: [
        { label: 'Working', action: 'log-more', checked: true },
        { label: 'Testing', action: 'log-more', checked: false },
      ],
    },
    { label: 'Completed', action: 'log-more', checked: false },
  ];
  await lonePopupMenu(
    page,
    {
      text: { label: 'Status: Started' },
      unsets: ['text'],
      data: [['data-popup-badge-menu', '']],
    },
    items,
  );
  await addChild(page, 'Badge', 'triggerContent');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'info', appearance: 'solid' },
    text: { children: 'Started' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'popup-menu',
        {
          label: 'Status: Started',
          items,
          rootAttributes: { 'data-popup-badge-menu': '' },
        },
        {
          triggerContent: [
            node('badge', {
              children: 'Started',
              tone: 'info',
              appearance: 'solid',
            }),
          ],
        },
      ),
    ),
  );
});

// popupSortChoice starts as 'recent'.
test('builds PopupMenu › Checked Choices', async ({ page }) => {
  const items = [
    { label: 'Updated', action: 'sort-recent', checked: true },
    { label: 'Priority', action: 'sort-priority', checked: false },
    { kind: 'divider' },
    { label: 'More Sort Options', action: 'log-more' },
  ];
  await lonePopupMenu(
    page,
    {
      text: { text: 'Sort Choices' },
      unsets: ['label'],
      data: [['data-popup-checked-menu', '']],
    },
    items,
  );
  expect(await exported(page)).toEqual(
    pane(
      node('popup-menu', {
        text: 'Sort Choices',
        items,
        rootAttributes: { 'data-popup-checked-menu': '' },
      }),
    ),
  );
});

test('builds PopupMenu › Nested Decisions', async ({ page }) => {
  const items = [
    {
      label: 'Decide',
      submenu: [
        { kind: 'heading', label: 'Review' },
        {
          label: 'Approve',
          action: 'log-decision',
          checked: true,
          attributes: { 'data-decision': 'approve' },
        },
        {
          label: 'Reject',
          action: 'log-decision',
          tone: 'danger',
          disabled: true,
          disabledReason: 'A price is required',
          attributes: { 'data-decision': 'reject' },
        },
        { kind: 'divider' },
        { kind: 'heading', label: 'More' },
        {
          label: 'Other…',
          action: 'log-decision',
          attributes: { 'data-decision': 'other' },
        },
      ],
    },
  ];
  // The demo names each glyph after its decision.
  const icons = [
    [[0], 'gavel', 'decide'],
    [[0, 'submenu', 1], 'thumbs-up', 'approve'],
    [[0, 'submenu', 2], 'thumbs-down', 'reject'],
    [[0, 'submenu', 5], 'ellipsis', 'other'],
  ] as const;
  await lonePopupMenu(
    page,
    { text: { text: 'Decide' }, unsets: ['label'] },
    items,
  );
  await menuIcons(page, icons);
  expect(await exported(page)).toEqual(
    pane(node('popup-menu', { text: 'Decide', items }, menuIconZones(icons))),
  );
});

// KF-921WVX: the adjacent action group sits in a plain Toolbar. The
// context menu's anchor is a first-render snapshot of popupContextAnchor.
test('builds PopupMenu › Context Menu', async ({ page }) => {
  const items = [
    { label: 'Open', action: 'log-context-open' },
    {
      label: 'More Actions',
      submenu: [{ label: 'Copy Reference', action: 'log-more' }],
    },
    { label: 'Archive', action: 'log-more', tone: 'danger' },
  ];
  await dragComponent(page, 'ListItem', () => emptySpot(page));
  await select(page, /^ListItem/);
  await applySpec(page, {
    text: { label: 'Demand draft', action: 'log-more' },
    data: [['data-popup-menu-context-target', '']],
  });
  await addInto(page, /^Pane/, 'Toolbar');
  await setText(page, 'label', 'Context Menu');
  await zoneGroup(page, 'leading', { flags: ['single'] }, { keepButton: true });
  await select(page, /^ToolbarButton/);
  await applySpec(page, {
    text: {
      ariaLabel: 'Demand Actions',
      action: 'open-demand-actions',
      title: 'Demand Actions',
    },
    unsets: ['children'],
  });
  await addIcon(page, 'icon', 'ellipsis');
  await select(page, /^LucideIcon/);
  await setText(page, 'name', 'actions');
  await addInto(page, /^Pane/, 'PopupMenu');
  await area(page, 'Properties');
  await applySpec(page, {
    flags: ['context'],
    text: { label: 'Demand Actions' },
    data: [['data-popup-context-menu', '']],
    unsets: ['text'],
  });
  await editAsJson(page, 'items', items);
  await editAsJson(page, 'anchor', { x: 0, y: 0 });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node('list-item', {
        label: 'Demand draft',
        action: 'log-more',
        rootAttributes: { 'data-popup-menu-context-target': '' },
      }),
      node(
        'toolbar',
        { label: 'Context Menu' },
        {
          leading: [
            node(
              'toolbar-control-group',
              { single: true },
              {
                children: [
                  node(
                    'toolbar-control-group#ToolbarButton',
                    {
                      ariaLabel: 'Demand Actions',
                      action: 'open-demand-actions',
                      title: 'Demand Actions',
                    },
                    { icon: [icon('ellipsis', { name: 'actions' })] },
                  ),
                ],
              },
            ),
          ],
        },
      ),
      node('popup-menu', {
        context: true,
        label: 'Demand Actions',
        anchor: { x: 0, y: 0 },
        rootAttributes: { 'data-popup-context-menu': '' },
        items,
      }),
    ),
  );
});

test('builds PopupMenu › Standalone in a Popup Surface', async ({ page }) => {
  const items = [
    { label: 'Inbox', action: 'log-more' },
    { label: 'Archive', action: 'log-more' },
  ];
  await dragComponent(page, 'PopupSurface', () => emptySpot(page));
  await select(page, /^PopupSurface/);
  await choose(page, 'inset', 'list-zero');
  await addInto(page, /^PopupSurface/, 'PopupMenu', 0, 0);
  await select(page, /^PopupMenu/);
  await applySpec(page, { text: { text: 'Choose View' }, unsets: ['label'] });
  await editAsJson(page, 'items', items);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'surface-scaffold#PopupSurface',
        { inset: 'list-zero' },
        { children: [node('popup-menu', { text: 'Choose View', items })] },
      ),
    ),
  );
});

/** A TabBarItem FieldSpec plus its icons and trailing spinner. */
type TabSpec = FieldSpec & {
  readonly leading?: string;
  readonly closeIcon?: readonly [string, string];
  readonly spinner?: boolean;
};

/**
 * Places a TabBar (set up by `bar`) holding one TabBarItem per spec, each
 * added to its tabs zone and set up in turn.
 */
async function tabBar(page: Page, bar: FieldSpec, tabs: readonly TabSpec[]) {
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
const tabBarNode = (
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

// The demo's non-data and mixed-case root attributes are protection
// fixtures TabBarItem drops; a view document carries only data-*.
test('builds Tabs › Selected and Closable', async ({ page }) => {
  const tab: TabSpec = {
    flags: ['selected'],
    text: { id: 'guidelines', name: 'Guidelines' },
    data: [['data-demo-tab-source', 'workspace']],
    leading: 'panel-left',
    closeIcon: ['x', 'custom-tab-close'],
  };
  await tabBar(
    page,
    {
      text: {
        id: 'tab-bar-item-selected',
        label: 'Selected TabBarItem Specimen',
      },
    },
    [tab],
  );
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(
        { id: 'tab-bar-item-selected', label: 'Selected TabBarItem Specimen' },
        [
          [
            {
              id: 'guidelines',
              name: 'Guidelines',
              selected: true,
              rootAttributes: { 'data-demo-tab-source': 'workspace' },
            },
            tab,
          ],
        ],
      ),
    ),
  );
});

test('builds Tabs › Compact and Segmented', async ({ page }) => {
  const tabs: TabSpec[] = [
    {
      choices: { presentation: 'segmented', size: 'compact' },
      flags: ['selected'],
      offs: ['closable'],
      text: { id: 'activity', name: 'Activity' },
    },
    {
      choices: { presentation: 'icon-only', size: 'compact' },
      offs: ['closable'],
      text: { id: 'status', name: 'Status' },
      leading: 'circle-dot',
    },
  ];
  await tabBar(
    page,
    {
      choices: { presentation: 'segmented' },
      text: {
        id: 'tab-bar-item-compact',
        label: 'Compact TabBarItem Specimen',
      },
    },
    tabs,
  );
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(
        {
          id: 'tab-bar-item-compact',
          label: 'Compact TabBarItem Specimen',
          presentation: 'segmented',
        },
        [
          [
            {
              id: 'activity',
              name: 'Activity',
              selected: true,
              closable: false,
              presentation: 'segmented',
              size: 'compact',
            },
            tabs[0]!,
          ],
          [
            {
              id: 'status',
              name: 'Status',
              closable: false,
              presentation: 'icon-only',
              size: 'compact',
            },
            tabs[1]!,
          ],
        ],
      ),
    ),
  );
});

test('builds Tabs › Truncated Label', async ({ page }) => {
  const tab: TabSpec = {
    flags: ['selected'],
    offs: ['closable'],
    text: {
      id: 'long-label',
      name: 'A Deliberately Long Document Name',
      labelMaxWidth: '120',
    },
  };
  const bar = {
    id: 'tab-bar-item-truncated',
    label: 'Truncated TabBarItem Specimen',
  };
  await tabBar(page, { text: bar }, [tab]);
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(bar, [
        [
          {
            id: 'long-label',
            name: 'A Deliberately Long Document Name',
            selected: true,
            closable: false,
            labelMaxWidth: 120,
          },
          tab,
        ],
      ]),
    ),
  );
});

test('builds Tabs › Drop Target and Visible Name', async ({ page }) => {
  const tabs: TabSpec[] = [
    {
      flags: ['selected'],
      offs: ['closable'],
      text: { id: 'project-grid', name: 'Project Grid' },
    },
    {
      choices: { nameOverflow: 'visible' },
      flags: ['dropTarget'],
      offs: ['closable'],
      text: {
        id: 'accounting',
        name: 'Accounting Project',
        labelMaxWidth: '80',
      },
    },
  ];
  const bar = {
    id: 'tab-bar-item-drop-target',
    label: 'Drop-Target TabBarItem Specimen',
  };
  await tabBar(page, { text: bar }, tabs);
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(bar, [
        [
          {
            id: 'project-grid',
            name: 'Project Grid',
            selected: true,
            closable: false,
          },
          tabs[0]!,
        ],
        [
          {
            id: 'accounting',
            name: 'Accounting Project',
            closable: false,
            dropTarget: true,
            labelMaxWidth: 80,
            nameOverflow: 'visible',
          },
          tabs[1]!,
        ],
      ]),
    ),
  );
});

test('builds Tabs › Placeholder', async ({ page }) => {
  const tab: TabSpec = {
    flags: ['placeholder'],
    text: { id: 'loading', name: '' },
  };
  const bar = {
    id: 'tab-bar-item-placeholder',
    label: 'Loading TabBarItem Specimen',
  };
  await tabBar(page, { text: bar }, [tab]);
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(bar, [[{ id: 'loading', name: '', placeholder: true }, tab]]),
    ),
  );
});

test('builds Tabs › Pending', async ({ page }) => {
  const tabs: TabSpec[] = [
    { flags: ['selected'], text: { id: 'hot-sheet', name: 'hot-sheet' } },
    { flags: ['pending'], text: { id: 'alpha', name: 'alpha' }, spinner: true },
    { text: { id: 'beta', name: 'beta' } },
  ];
  const bar = {
    id: 'tab-bar-item-pending',
    label: 'Pending TabBarItem Specimen',
  };
  await tabBar(page, { text: bar }, tabs);
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(bar, [
        [{ id: 'hot-sheet', name: 'hot-sheet', selected: true }, tabs[0]!],
        [{ id: 'alpha', name: 'alpha', pending: true }, tabs[1]!],
        [{ id: 'beta', name: 'beta' }, tabs[2]!],
      ]),
    ),
  );
});

/** A non-closable tab named `name`, first selected, at `id`. */
const plainTab = (
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
const plainTabProps = (
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
async function tabBarGroup(
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
const tabBarGroupNode = (button: Record<string, unknown>, glyph: string) =>
  buttonGroupNode({ appearance: 'borderless', single: true }, [
    [button, glyph],
  ]);

/** Adds a Button (set up by `spec`) to TabBar `zone`. */
async function tabBarButton(page: Page, zone: string, spec: FieldSpec) {
  await select(page, /^TabBar(?!Item)/);
  await addChild(page, 'Button', zone);
  await area(page, 'Properties');
  await applySpec(page, spec);
}

/** The demos' two pill or segmented tabs. */
const pairTabs = (presentation: 'pill' | 'segmented') =>
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

test('builds TabBar › Rail · Intrinsic Allocation', async ({ page }) => {
  const tabs = pairTabs('pill');
  const bar = { id: 'rail-tab-bar', label: 'Rail Tab Bar' };
  await tabBar(
    page,
    { text: bar },
    tabs.map(([spec]) => spec),
  );
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(
        bar,
        tabs.map(([spec, props]) => [props, spec]),
      ),
    ),
  );
});

test('builds TabBar › Segmented · Fill Allocation', async ({ page }) => {
  const tabs = pairTabs('segmented');
  const bar = { id: 'segmented-tab-bar', label: 'Segmented Tab Bar' };
  await tabBar(
    page,
    { choices: { presentation: 'segmented', allocation: 'fill' }, text: bar },
    tabs.map(([spec]) => spec),
  );
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(
        { ...bar, presentation: 'segmented', allocation: 'fill' },
        tabs.map(([spec, props]) => [props, spec]),
      ),
    ),
  );
});

test('builds TabBar › Responsive Icon-Only Segmented Tabs', async ({
  page,
}) => {
  const segmented = { presentation: 'segmented', size: 'compact' };
  const tabs = (
    [
      ['responsive-overview', 'Overview', true, 'panel-left'],
      ['responsive-activity', 'Activity', false, 'square-plus'],
    ] as const
  ).map(
    ([id, name, selected, leading]) =>
      [
        { ...plainTab(id, name, selected, { choices: segmented }), leading },
        plainTabProps(id, name, selected, segmented),
      ] as const,
  );
  const bar = {
    id: 'responsive-icon-tab-bar',
    label: 'Responsive Project Tabs',
  };
  await tabBar(
    page,
    { choices: { presentation: 'segmented', iconOnlyAt: 'wide' }, text: bar },
    tabs.map(([spec]) => spec),
  );
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(
        { ...bar, presentation: 'segmented', iconOnlyAt: 'wide' },
        tabs.map(([spec, props]) => [props, spec]),
      ),
    ),
  );
});

const SPLIT_NAMES = [
  'Overview',
  'Backlog',
  'Activity',
  'Automations',
  'Settings',
];
const OVERFLOW_NAMES = [
  ...SPLIT_NAMES,
  'Releases',
  'Milestones',
  'Reports',
  'Integrations',
  'Members',
];

/** Non-closable tabs named `names`, ids `${prefix}-<name>`, first selected. */
const namedTabs = (
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

test('builds TabBar › Inspector · Adjacent and End Actions', async ({
  page,
}) => {
  test.slow();
  const tabs = namedTabs('split', SPLIT_NAMES, {
    presentation: 'segmented',
    size: 'compact',
  });
  const bar = { id: 'inspector-tab-bar', label: 'Inspector Tab Bar' };
  await tabBar(
    page,
    {
      choices: { presentation: 'inspector', trailingPlacement: 'adjacent' },
      text: bar,
    },
    tabs.map(([spec]) => spec),
  );
  await tabBarGroup(
    page,
    'trailing',
    { text: { ariaLabel: 'Add Inspector Section' } },
    'plus',
  );
  await tabBarGroup(
    page,
    'end',
    { text: { ariaLabel: 'Create Workspace Item' } },
    'square-plus',
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'tab-bar',
        { ...bar, presentation: 'inspector', trailingPlacement: 'adjacent' },
        {
          ...(
            tabBarNode(
              bar,
              tabs.map(([spec, props]) => [props, spec]),
            ) as {
              zones: Record<string, unknown[]>;
            }
          ).zones,
          trailing: [
            tabBarGroupNode({ ariaLabel: 'Add Inspector Section' }, 'plus'),
          ],
          end: [
            tabBarGroupNode(
              { ariaLabel: 'Create Workspace Item' },
              'square-plus',
            ),
          ],
        },
      ),
    ),
  );
});

test('builds TabBar › Project Strip · Primary Action', async ({ page }) => {
  test.slow();
  const tabs = namedTabs('overflow', OVERFLOW_NAMES);
  const bar = {
    id: 'raw-action-tab-bar',
    label: 'Project Tabs with Primary Action',
  };
  await tabBar(
    page,
    { choices: { trailingPlacement: 'adjacent' }, text: bar },
    tabs.map(([spec]) => spec),
  );
  await tabBarGroup(
    page,
    'leading',
    { text: { ariaLabel: 'Project Grid', action: 'log-more' } },
    'layout-grid',
  );
  await tabBarButton(page, 'trailing', {
    choices: { emphasis: 'plain' },
    text: { children: 'Add Tab', action: 'log-more' },
  });
  await tabBarButton(page, 'end', {
    choices: { tone: 'brand' },
    text: { children: 'New Ticket…', action: 'log-add' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'tab-bar',
        { ...bar, trailingPlacement: 'adjacent' },
        {
          ...(
            tabBarNode(
              bar,
              tabs.map(([spec, props]) => [props, spec]),
            ) as {
              zones: Record<string, unknown[]>;
            }
          ).zones,
          leading: [
            tabBarGroupNode(
              { ariaLabel: 'Project Grid', action: 'log-more' },
              'layout-grid',
            ),
          ],
          trailing: [
            node('button', {
              children: 'Add Tab',
              emphasis: 'plain',
              action: 'log-more',
            }),
          ],
          end: [
            node('button', {
              children: 'New Ticket…',
              tone: 'brand',
              action: 'log-add',
            }),
          ],
        },
      ),
    ),
  );
});

test('builds TabBar › Compact Project Tabs', async ({ page }) => {
  // The strip tokens are the catalog viewport's, not the view's.
  const tabs = [
    [
      {
        ...plainTab('compact-inspector', 'Inspector', false, {
          choices: { presentation: 'icon-only', size: 'compact' },
        }),
        leading: 'panel-left',
      },
      plainTabProps('compact-inspector', 'Inspector', false, {
        presentation: 'icon-only',
        size: 'compact',
      }),
    ],
    [
      plainTab('compact-attention', 'A Project with a Longer Name', false, {
        choices: { size: 'compact' },
        flags: ['attention'],
        text: { labelMaxWidth: '112' },
      }),
      plainTabProps(
        'compact-attention',
        'A Project with a Longer Name',
        false,
        {
          size: 'compact',
          labelMaxWidth: 112,
          attention: true,
        },
      ),
    ],
  ] as const;
  const bar = { id: 'compact-project-tab-bar', label: 'Compact Project Tabs' };
  await tabBar(
    page,
    { text: bar },
    tabs.map(([spec]) => spec),
  );
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(
        bar,
        tabs.map(([spec, props]) => [props, spec]),
      ),
    ),
  );
});

test('builds TabBar › Overflow · Scroll Dividers', async ({ page }) => {
  test.slow();
  const tabs = namedTabs('overflow', OVERFLOW_NAMES);
  const bar = { id: 'overflow-tab-bar', label: 'Overflowing Tab Bar' };
  await tabBar(
    page,
    { text: bar },
    tabs.map(([spec]) => spec),
  );
  await tabBarGroup(
    page,
    'leading',
    { text: { ariaLabel: 'Show Sidebar' } },
    'panel-left',
  );
  await tabBarGroup(
    page,
    'trailing',
    { text: { ariaLabel: 'Add Tab' } },
    'plus',
  );
  expect(await exported(page)).toEqual(
    pane(
      node('tab-bar', bar, {
        ...(
          tabBarNode(
            bar,
            tabs.map(([spec, props]) => [props, spec]),
          ) as {
            zones: Record<string, unknown[]>;
          }
        ).zones,
        leading: [tabBarGroupNode({ ariaLabel: 'Show Sidebar' }, 'panel-left')],
        trailing: [tabBarGroupNode({ ariaLabel: 'Add Tab' }, 'plus')],
      }),
    ),
  );
});

/** Adds a Text reading `text` (with `spec`) to the `nth` `parent`. */
async function textInto(
  page: Page,
  parent: RegExp,
  text: string,
  nth = 0,
  spec: FieldSpec = {},
) {
  await addInto(page, parent, 'Text', nth);
  await applySpec(page, { ...spec, text: { children: text, ...spec.text } });
}

const textNode = (children: string, props: Record<string, unknown> = {}) =>
  node('text', { children, ...props });

/** Places a SunkenPanel, set up by `spec`, at the first empty spot. */
async function sunkenPanel(page: Page, spec: FieldSpec, nth = 0) {
  await dragComponent(page, 'SunkenPanel', () => emptySpot(page));
  await select(page, /^SunkenPanel/, nth);
  await applySpec(page, spec);
}

const SUNKEN = /^SunkenPanel/;

test('builds SunkenPanel › Rounded Application Work Area', async ({ page }) => {
  await sunkenPanel(page, { text: { ariaLabel: 'Release Workspace' } });
  await addChild(page, 'StateBanner');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { tone: 'neutral' },
    text: { title: 'Release Candidate Ready' },
  });
  await addInto(page, SUNKEN, 'ValueTable');
  await valueTable(page, { text: { label: 'Release Details' } }, [
    { text: { label: 'Version', value: '5.0.0-beta.2' } },
    { text: { label: 'Checks', value: 'Passing' } },
  ]);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { ariaLabel: 'Release Workspace' },
        {
          children: [
            node('state-banner', {
              tone: 'neutral',
              title: 'Release Candidate Ready',
            }),
            node(
              'value-table',
              { label: 'Release Details' },
              {
                children: [
                  node('value-table#ValueTableRow', {
                    label: 'Version',
                    value: '5.0.0-beta.2',
                  }),
                  node('value-table#ValueTableRow', {
                    label: 'Checks',
                    value: 'Passing',
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

test('builds SunkenPanel › Focusable Outlined Surface', async ({ page }) => {
  await sunkenPanel(page, {
    choices: { tabIndex: '0' },
    flags: ['outlined'],
    text: { ariaLabel: 'Selected Work Surface' },
  });
  await textInto(page, SUNKEN, 'Selected work surface');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { ariaLabel: 'Selected Work Surface', tabIndex: 0, outlined: true },
        { children: [textNode('Selected work surface')] },
      ),
    ),
  );
});

test('builds SunkenPanel › Square-Corner Content Stack', async ({ page }) => {
  const lines = [
    'Recent activity',
    'Three checks completed.',
    'One beta is ready to publish.',
  ];
  await sunkenPanel(page, { choices: { shape: 'square' } });
  for (const line of lines) await textInto(page, SUNKEN, line);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { shape: 'square' },
        { children: lines.map((line) => textNode(line)) },
      ),
    ),
  );
});

test('builds SunkenPanel › Panel Fills a Work Area', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await choose(page, 'flex', 'true');
  await addChild(page, 'ContentItem');
  await area(page, 'Properties');
  await choose(page, 'appearance', 'info');
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await setText(page, 'children', 'Work area');
  await addInto(page, /^List(?![A-Z])/, 'SunkenPanel');
  await applySpec(page, {
    choices: { flex: 'true' },
    text: { ariaLabel: 'Growing Work Surface' },
  });
  await textInto(
    page,
    SUNKEN,
    'Content stays at the top while the surface fills space.',
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { flex: true },
        {
          children: [
            node(
              'content-item',
              { appearance: 'info' },
              { children: [textNode('Work area')] },
            ),
            node(
              'sunken-panel',
              { flex: true, ariaLabel: 'Growing Work Surface' },
              {
                children: [
                  textNode(
                    'Content stays at the top while the surface fills space.',
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

test('builds SunkenPanel › Direct Frame Fill', async ({ page }) => {
  await sunkenPanel(page, {
    flags: ['fill'],
    text: { ariaLabel: 'Full-Height Work Surface' },
  });
  await textInto(page, SUNKEN, 'Full-height surface');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { fill: true, ariaLabel: 'Full-Height Work Surface' },
        { children: [textNode('Full-height surface')] },
      ),
    ),
  );
});

test('builds SunkenPanel › Nested Surfaces', async ({ page }) => {
  const layers = ['First', 'Second', 'Third'];
  await sunkenPanel(page, { text: { ariaLabel: 'First Layer' } });
  await textInto(page, SUNKEN, 'First layer', 0);
  for (const [depth, layer] of layers.slice(1).entries()) {
    await addInto(page, SUNKEN, 'SunkenPanel', depth);
    await setText(page, 'ariaLabel', `${layer} Layer`);
    await textInto(page, SUNKEN, `${layer} layer`, depth + 1);
  }
  await addInto(page, SUNKEN, 'Button', 2);
  await setText(page, 'children', 'Focus Nested Control');
  const third = node(
    'sunken-panel',
    { ariaLabel: 'Third Layer' },
    {
      children: [
        textNode('Third layer'),
        node('button', { children: 'Focus Nested Control' }),
      ],
    },
  );
  const second = node(
    'sunken-panel',
    { ariaLabel: 'Second Layer' },
    { children: [textNode('Second layer'), third] },
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { ariaLabel: 'First Layer' },
        { children: [textNode('First layer'), second] },
      ),
    ),
  );
});

test('builds SunkenPanel › Pane and Nested Panel', async ({ page }) => {
  await dragComponent(page, 'Pane', () => emptySpot(page));
  await select(page, /^Pane/, 1);
  await applySpec(page, {
    choices: { appearance: 'sunken' },
    text: { label: 'Layered Pane' },
  });
  await sunkenPanel(page, { text: { ariaLabel: 'Pane Content Layer' } });
  await textInto(page, SUNKEN, 'The same lowered token paints both surfaces.');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'pane',
        { appearance: 'sunken', label: 'Layered Pane' },
        {
          content: [
            node(
              'sunken-panel',
              { ariaLabel: 'Pane Content Layer' },
              {
                children: [
                  textNode('The same lowered token paints both surfaces.'),
                ],
              },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds SunkenPanel › Nested Sunken Surfaces', async ({ page }) => {
  await sunkenPanel(page, { text: { ariaLabel: 'Nested Sunken Disclosure' } });
  await textInto(page, SUNKEN, 'Kerf sunken panel');
  await addInto(page, SUNKEN, 'Disclosure');
  await applySpec(page, {
    choices: { appearance: 'sunken' },
    flags: ['open'],
    text: { title: 'Nested Details' },
  });
  // The Disclosure's seeded text (the second Text) gives way to the child.
  await addInto(page, /^Disclosure/, 'Text');
  // A bare text node has no Properties: pick its outline row directly.
  await area(page, 'Outline');
  await outlineRow(page, /^Text “Disclosure”/).click();
  await deleteSelected(page);
  await select(page, /^Text(?![A-Z])/, -1);
  await setText(page, 'children', 'The lowered surface compounds here too.');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sunken-panel',
        { ariaLabel: 'Nested Sunken Disclosure' },
        {
          children: [
            textNode('Kerf sunken panel'),
            node(
              'disclosure',
              { title: 'Nested Details', appearance: 'sunken', open: true },
              {
                children: [textNode('The lowered surface compounds here too.')],
              },
            ),
          ],
        },
      ),
    ),
  );
});

/** A Pane chrome Toolbar: its label and its leading ToolbarText. */
type ChromeSpec = {
  readonly label: string;
  readonly text: string;
  readonly size?: string;
  readonly description?: string;
};

/**
 * Sets up the document's root Pane as a demo Pane: `spec` (fill turned off,
 * as the demos leave it), header and footer Toolbars, and ContentItems.
 */
async function rootPane(
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
const chromeNode = ({ label, text, size, description }: ChromeSpec) =>
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
const rootPaneNode = (
  props: Record<string, unknown>,
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

const items = (texts: readonly string[]) =>
  texts.map((children) => node('content-item', { children }));

test('builds Pane › Pane Structure and Separators', async ({ page }) => {
  const header = { label: 'Pane Header', text: 'Pane Header', size: 'large' };
  const footer = {
    label: 'Pane Footer',
    text: 'Optional footer',
    size: 'small',
  };
  await rootPane(
    page,
    { choices: { element: 'section' }, text: { label: 'Pane Anatomy' } },
    { header, footer, items: ['First content group'] },
  );
  await select(page, /^Pane/);
  const sides = ['block-start', 'block-end', 'inline-start', 'inline-end'];
  const separators = page.locator('[data-editor-prop="separators"]').first();
  for (const side of sides)
    await separators.getByRole('checkbox', { name: side, exact: true }).check();
  await select(page, /^Pane/);
  await addChild(page, 'ListInsetText', 'header');
  await area(page, 'Properties');
  await setText(page, 'children', 'Optional secondary header row');
  await select(page, /^Pane/);
  await addChild(page, 'ContentItem', 'content');
  await area(page, 'Properties');
  await setText(page, 'children', 'Framed content group');
  await choose(page, 'frame', 'framed');
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { element: 'section', label: 'Pane Anatomy', separators: sides },
      {
        header: [
          chromeNode(header),
          node('list-inset-text', {
            children: 'Optional secondary header row',
          }),
        ],
        content: [
          ...items(['First content group']),
          node('content-item', {
            children: 'Framed content group',
            frame: 'framed',
          }),
        ],
        footer: [chromeNode(footer)],
      },
    ),
  );
});

/**
 * Sets up the `nth` NavStack as the SizedRegion demo's `stack()`: one
 * sunken view titled `title`, holding a List with one DemoContentItem.
 */
async function demoStack(page: Page, nth: number, id: string, title: string) {
  const dialog = page.locator('dialog[open]');
  const back = () => dialog.getByRole('button', { name: 'Back' }).click();
  await select(page, /^NavStack/, nth);
  await setText(page, 'id', id);
  await setText(page, 'label', title);
  await page.getByRole('button', { name: 'Configure views' }).click();
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
const demoStackNode = (id: string, title: string) =>
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

const FILLS = [
  'Fills the Region',
  "The stack's scenes take the height the SizedRegion gives them.",
] as const;

test('builds SizedRegion › Fill Beside Other Content', async ({ page }) => {
  test.slow();
  await rootPane(page, { text: { label: 'Project' } }, {});
  await contentItemInto(
    page,
    /^Pane/,
    0,
    'Project Atlas',
    'Summary content sits above the nested layout.',
  );
  await addInto(page, /^Pane/, 'NavStack');
  await select(page, /^NavStack/);
  await embedIn(page, 'SizedRegion');
  // The stack fills its slots while the region still has a height.
  await demoStack(page, 0, 'sized-region-fill', 'Activity');
  await contentItemInto(page, /^List(?!Item)/, 1, ...FILLS);
  await select(page, /^SizedRegion/);
  await setText(page, 'minHeight', '');
  await dataAttribute(page, 'data-sized-region-demo', 'fill');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { label: 'Project' },
      {
        content: [
          demoContentItem(
            'Project Atlas',
            'Summary content sits above the nested layout.',
          ),
          node(
            'sized-region',
            { rootAttributes: { 'data-sized-region-demo': 'fill' } },
            { children: [demoStackNode('sized-region-fill', 'Activity')] },
          ),
        ],
      },
    ),
  );
});

test('builds SizedRegion › Minimum Height in Flowing Content', async ({
  page,
}) => {
  test.slow();
  await dragComponent(page, 'NavStack', () => emptySpot(page));
  await select(page, /^NavStack/);
  // Embedding starts the SizedRegion at the demo's rem(20) minimum.
  await embedIn(page, 'SizedRegion');
  await select(page, /^SizedRegion/);
  await dataAttribute(page, 'data-sized-region-demo', 'min');
  await demoStack(page, 0, 'sized-region-min', 'Notes');
  await contentItemInto(page, /^List(?!Item)/, 0, ...FILLS);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'sized-region',
        {
          minHeight: { $css: 'rem(20)' },
          rootAttributes: { 'data-sized-region-demo': 'min' },
        },
        { children: [demoStackNode('sized-region-min', 'Notes')] },
      ),
    ),
  );
});

test('builds SizedRegion › Bounded Fill', async ({ page }) => {
  test.slow();
  await rootPane(page, { text: { label: 'Inbox' } }, {});
  await addInto(page, /^Pane/, 'NavStack');
  await select(page, /^NavStack/);
  await embedIn(page, 'SizedRegion');
  // The stack fills its slots while the region still has a height.
  await demoStack(page, 0, 'sized-region-max', 'Messages');
  await contentItemInto(page, /^List(?!Item)/, 0, ...FILLS);
  await select(page, /^SizedRegion/);
  await setText(page, 'minHeight', '');
  await setCss(page, 'maxHeight', 'rem(18)');
  await dataAttribute(page, 'data-sized-region-demo', 'max');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { label: 'Inbox' },
      {
        content: [
          node(
            'sized-region',
            {
              maxHeight: { $css: 'rem(18)' },
              rootAttributes: { 'data-sized-region-demo': 'max' },
            },
            { children: [demoStackNode('sized-region-max', 'Messages')] },
          ),
        ],
      },
    ),
  );
});

/**
 * Places a CollapsiblePanel set up by `spec` (its `size` a number), holding
 * one DemoContentItem titled `title`.
 */
async function demoPanel(
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

const LEFT_RAIL = [
  'Navigator',
  'Collapse from panel chrome; restore from adjacent chrome.',
] as const;
const RIGHT_RAIL = [
  'Inspector',
  'The application owns size and collapsed state.',
] as const;
const BOTTOM_DRAWER = [
  'Build Output',
  'Use Workbench when several panels form one shell.',
] as const;

test('builds CollapsiblePanel › Left Rail', async ({ page }) => {
  await demoPanel(
    page,
    {
      choices: { side: 'left', tabIndex: '0' },
      flags: ['outlined'],
      text: { id: 'catalog-panel-left', label: 'Project Navigator' },
    },
    '280',
    LEFT_RAIL,
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'collapsible-panel',
        {
          id: 'catalog-panel-left',
          side: 'left',
          size: 280,
          label: 'Project Navigator',
          tabIndex: 0,
          outlined: true,
        },
        { children: [demoContentItem(...LEFT_RAIL)] },
      ),
    ),
  );
});

test('builds CollapsiblePanel › Right Rail', async ({ page }) => {
  await demoPanel(
    page,
    {
      choices: { side: 'right' },
      text: { id: 'catalog-panel-right', label: 'Selection Inspector' },
    },
    '280',
    RIGHT_RAIL,
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'collapsible-panel',
        {
          id: 'catalog-panel-right',
          side: 'right',
          size: 280,
          label: 'Selection Inspector',
        },
        { children: [demoContentItem(...RIGHT_RAIL)] },
      ),
    ),
  );
});

test('builds CollapsiblePanel › Bottom Drawer', async ({ page }) => {
  await demoPanel(
    page,
    {
      choices: { side: 'bottom' },
      text: { id: 'catalog-panel-bottom', label: 'Build Output' },
    },
    '180',
    BOTTOM_DRAWER,
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'collapsible-panel',
        {
          id: 'catalog-panel-bottom',
          side: 'bottom',
          size: 180,
          label: 'Build Output',
        },
        { children: [demoContentItem(...BOTTOM_DRAWER)] },
      ),
    ),
  );
});

/** A CollapsiblePanel `toolbar` with a title and a toggle, as configured. */
type PanelToolbarSpec = {
  readonly label: string;
  readonly title?: string;
  readonly toggle: { readonly action: string; readonly name: string };
};

/**
 * Configures the selected panel's (or relocated control's) `toolbar`: its
 * label, toggle, and a ToolbarText title.
 */
async function ownToolbar(
  page: Page,
  owner: RegExp,
  nth: number,
  { label, title, toggle }: PanelToolbarSpec,
) {
  const dialog = page.locator('dialog[open]');
  await select(page, owner, nth);
  await page.getByRole('button', { name: 'Configure toolbar' }).click();
  await setField(page, 'toolbar', ['label'], label);
  await dialog.getByRole('button', { name: 'Configure toggle' }).click();
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
const panelToolbarProps = ({ label, toggle }: PanelToolbarSpec) => ({
  toolbar: { label, toggle },
});
const panelTitleZone = (title: string) => ({
  'toolbar.title': [node('toolbar-text', { text: title })],
});

const CONSOLE_TOOLBAR: PanelToolbarSpec = {
  label: 'Console',
  title: 'Console',
  toggle: { action: 'toggle-catalog-panel-restore', name: 'Console' },
};

test('builds CollapsiblePanel › Restore Control', async ({ page }) => {
  test.slow();
  // restoreDrawerCollapsed starts true: the drawer and its restore control
  // are collapsed at first render.
  await nestedPane(page, {});
  await contentItemInto(
    page,
    /^Pane/,
    1,
    'App-Owned Collapsed Flag',
    'Hide the console from its own toolbar; restore it from the corner control.',
  );
  await addInto(page, /^Pane/, 'CollapsiblePanel', 0);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { side: 'bottom' },
    text: { id: 'catalog-panel-restore', label: 'Console' },
  });
  await setText(page, 'size', '140');
  await contentItemInto(
    page,
    /^CollapsiblePanel(?!Relocated)/,
    0,
    'Build Finished',
    'The drawer stays mounted while it is collapsed.',
  );
  await ownToolbar(page, /^CollapsiblePanel(?!Relocated)/, 0, CONSOLE_TOOLBAR);
  // The restore control: a FloatingToolbar holding the relocated toggle.
  await select(page, /^CollapsiblePanel(?!Relocated)/);
  await page.locator('[data-editor-content-add="restoreControl"]').click();
  await addChild(page, 'FloatingToolbar');
  await area(page, 'Properties');
  await setText(page, 'label', 'Console');
  // Its seeded text became a Text, which goes.
  await select(page, /^Text(?![A-Z])/, -1);
  await deleteSelected(page);
  await select(page, /^FloatingToolbar/);
  await addChild(page, 'CollapsiblePanelRelocated');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { side: 'bottom' },
    flags: ['collapsed'],
    text: { panelId: 'catalog-panel-restore' },
  });
  await ownToolbar(page, /^CollapsiblePanelRelocated/, 0, CONSOLE_TOOLBAR);
  await select(page, /^CollapsiblePanel(?!Relocated)/);
  await turnOn(page, 'collapsed');
  // The editor's header comes last: Add a child keeps the zone it last used.
  await select(page, /^Pane/, 1);
  await addChild(page, 'Toolbar', 'header');
  await area(page, 'Properties');
  await setText(page, 'label', 'Editor');
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'xlarge' },
    text: { text: 'Editor' },
  });
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-xvvex5-collapsible-restore-1440.png'),
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node('pane', undefined, {
        header: [
          node(
            'toolbar',
            { label: 'Editor' },
            { leading: [toolbarTextNode('Editor', 'xlarge')] },
          ),
        ],
        content: [
          demoContentItem(
            'App-Owned Collapsed Flag',
            'Hide the console from its own toolbar; restore it from the corner control.',
          ),
        ],
      }),
      node(
        'collapsible-panel',
        {
          id: 'catalog-panel-restore',
          side: 'bottom',
          size: 140,
          label: 'Console',
          collapsed: true,
          ...panelToolbarProps(CONSOLE_TOOLBAR),
        },
        {
          children: [
            demoContentItem(
              'Build Finished',
              'The drawer stays mounted while it is collapsed.',
            ),
          ],
          ...panelTitleZone('Console'),
          restoreControl: [
            node(
              'floating-toolbar',
              { label: 'Console' },
              {
                children: [
                  node(
                    'collapsible-panel#CollapsiblePanelRelocated',
                    {
                      panelId: 'catalog-panel-restore',
                      side: 'bottom',
                      collapsed: true,
                      ...panelToolbarProps(CONSOLE_TOOLBAR),
                    },
                    panelTitleZone('Console'),
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

/** The relocation example's navigator icon commands: label, glyph, relocate. */
const NAVIGATOR_COMMANDS = [
  ['leading', 'New File', 'file-plus', false],
  ['trailing', 'Search Files', 'search', true],
] as const;

/**
 * Configures the `nth` panel or relocated control's `toolbar` as the
 * navigator's: a label, the toggle, and a borderless icon command group in
 * its leading and trailing zones.
 */
async function navigatorToolbar(page: Page, owner: RegExp, nth: number) {
  const dialog = page.locator('dialog[open]');
  await ownToolbar(page, owner, nth, {
    label: 'Navigator',
    toggle: { action: 'toggle-catalog-panel-relocation', name: 'Navigator' },
  });
  for (const [zone, label, glyph, relocate] of NAVIGATOR_COMMANDS) {
    await select(page, owner, nth);
    await page.getByRole('button', { name: 'Configure toolbar' }).click();
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
const navigatorToolbarProps = {
  toolbar: {
    label: 'Navigator',
    toggle: { action: 'toggle-catalog-panel-relocation', name: 'Navigator' },
  },
};
const navigatorToolbarZones = Object.fromEntries(
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

test('builds CollapsiblePanel › Toolbar Relocation', async ({ page }) => {
  test.setTimeout(test.info().timeout * 6);
  // relocationRailCollapsed starts true: the rail and its relocated
  // controls are collapsed at first render.
  const rail = /^CollapsiblePanel(?!Relocated)/;
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await applySpec(page, { choices: { gap: 'none' }, flags: ['fill'] });
  await addChild(page, 'CollapsiblePanel');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { side: 'left', tabIndex: '0' },
    flags: ['outlined'],
    text: { id: 'catalog-panel-relocation', label: 'Navigator' },
  });
  await setText(page, 'size', '220');
  await contentItemInto(
    page,
    rail,
    0,
    'Files',
    'Panel-only New file waits here while closed.',
  );
  await navigatorToolbar(page, rail, 0);
  // The editor beside it: a flex List holding a Pane.
  await addInto(page, /^Row/, 'List');
  await choose(page, 'flex', 'true');
  await addChild(page, 'Pane');
  await contentItemInto(
    page,
    /^Pane/,
    1,
    'App-Owned Collapsed Flag',
    'Show the navigator from the editor toolbar; hide it from its own toolbar.',
  );
  // The rail's pinned header and its list insets.
  await select(page, rail);
  await page.locator('[data-editor-content-add="header"]').click();
  await addChild(page, 'ToolbarText');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'small' },
    text: { text: 'Pinned Files' },
  });
  await select(page, rail);
  await page.getByRole('button', { name: 'Configure header list' }).click();
  await chooseField(page, 'headerList', ['textInsets'], 'trbl');
  await page
    .locator('dialog[open]')
    .getByRole('button', { name: 'Done' })
    .or(
      page
        .locator('#editor-inspector-stack')
        .getByRole('button', { name: 'Back' }),
    )
    .first()
    .click();
  // The editor's header comes last: Add a child keeps the zone it last used.
  await select(page, /^Pane/, 1);
  await addChild(page, 'Toolbar', 'header');
  await area(page, 'Properties');
  await setText(page, 'label', 'Editor');
  await addChild(page, 'CollapsiblePanelRelocated', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { side: 'left' },
    flags: ['collapsed'],
    text: { panelId: 'catalog-panel-relocation' },
  });
  await navigatorToolbar(page, /^CollapsiblePanelRelocated/, 0);
  await select(page, TOOLBAR, -1);
  await addChild(page, 'ToolbarText', 'leading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'xlarge' },
    text: { text: 'Editor' },
  });
  await select(page, rail);
  await turnOn(page, 'collapsed');
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-xvvex5-collapsible-relocation-1440.png'),
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { fill: true, gap: 'none' },
        {
          children: [
            node(
              'collapsible-panel',
              {
                id: 'catalog-panel-relocation',
                side: 'left',
                size: 220,
                label: 'Navigator',
                tabIndex: 0,
                outlined: true,
                collapsed: true,
                headerList: { textInsets: 'trbl' },
                ...navigatorToolbarProps,
              },
              {
                children: [
                  demoContentItem(
                    'Files',
                    'Panel-only New file waits here while closed.',
                  ),
                ],
                header: [toolbarTextNode('Pinned Files', 'small')],
                ...navigatorToolbarZones,
              },
            ),
            node(
              'list',
              { flex: true },
              {
                children: [
                  node('pane', undefined, {
                    header: [
                      node(
                        'toolbar',
                        { label: 'Editor' },
                        {
                          leading: [
                            node(
                              'collapsible-panel#CollapsiblePanelRelocated',
                              {
                                panelId: 'catalog-panel-relocation',
                                side: 'left',
                                collapsed: true,
                                ...navigatorToolbarProps,
                              },
                              navigatorToolbarZones,
                            ),
                            toolbarTextNode('Editor', 'xlarge'),
                          ],
                        },
                      ),
                    ],
                    content: [
                      demoContentItem(
                        'App-Owned Collapsed Flag',
                        'Show the navigator from the editor toolbar; hide it from its own toolbar.',
                      ),
                    ],
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

test('builds Layout › Pane with Child-Owned Content Geometry', async ({
  page,
}) => {
  test.slow();
  await nestedPane(page, { choices: { contentElement: 'section' } });
  await addInto(page, /^Pane/, 'ContentItem', 1);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { appearance: 'surface', frame: 'framed' },
  });
  await addChild(page, 'Text');
  await select(page, /^Text(?![A-Z])/, 0);
  await applySpec(page, {
    choices: { weight: 'strong' },
    text: { children: 'One owner per item' },
  });
  await addInto(page, /^ContentItem/, 'Text');
  await area(page, 'Properties');
  await setText(
    page,
    'children',
    'Each content child owns its margin, border, background, padding, and radius.',
  );
  await addInto(page, /^Pane/, 'Row', 1);
  await area(page, 'Properties');
  await choose(page, 'controlInsets', 'l');
  for (const [text, spec] of [
    [
      'Primary Action',
      { choices: { tone: 'brand' }, text: { action: 'log-add' } },
    ],
    ['Secondary Action', { text: { action: 'log-more' } }],
  ] as const) {
    await addInto(page, /^Row/, 'Button');
    await area(page, 'Properties');
    await applySpec(page, { ...spec, text: { ...spec.text, children: text } });
  }
  await addInto(page, /^Pane/, 'Text', 1);
  await area(page, 'Properties');
  await setText(page, 'children', '24px major rhythm · 8px internal rhythm');
  // The header comes last: Add a child keeps the zone it last used.
  await select(page, /^Pane/, 1);
  await addChild(page, 'Toolbar', 'header');
  await area(page, 'Properties');
  await setText(page, 'label', 'Semantic Layout');
  await zoneText(page, 'leading', {
    choices: { size: 'xlarge' },
    text: { text: 'Semantic Layout', id: 'layout-title' },
  });
  await zoneGroup(
    page,
    'trailing',
    { choices: { appearance: 'borderless' }, flags: ['single'] },
    { keepButton: true },
  );
  await select(page, /^ToolbarButton/);
  await applySpec(page, { text: { children: 'New Item', action: 'log-add' } });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'pane',
        { contentElement: 'section' },
        {
          header: [
            node(
              'toolbar',
              { label: 'Semantic Layout' },
              {
                leading: [
                  node('toolbar-text', {
                    text: 'Semantic Layout',
                    size: 'xlarge',
                    id: 'layout-title',
                  }),
                ],
                trailing: [
                  node(
                    'toolbar-control-group',
                    { appearance: 'borderless', single: true },
                    {
                      children: [
                        node('toolbar-control-group#ToolbarButton', {
                          children: 'New Item',
                          action: 'log-add',
                        }),
                      ],
                    },
                  ),
                ],
              },
            ),
          ],
          content: [
            node(
              'content-item',
              { appearance: 'surface', frame: 'framed' },
              {
                children: [
                  node('text', {
                    children: 'One owner per item',
                    weight: 'strong',
                  }),
                  node('text', {
                    children:
                      'Each content child owns its margin, border, background, padding, and radius.',
                  }),
                ],
              },
            ),
            node(
              'row',
              { controlInsets: 'l' },
              {
                children: [
                  node('button', {
                    children: 'Primary Action',
                    tone: 'brand',
                    action: 'log-add',
                  }),
                  node('button', {
                    children: 'Secondary Action',
                    action: 'log-more',
                  }),
                ],
              },
            ),
            node('text', {
              children: '24px major rhythm · 8px internal rhythm',
            }),
          ],
        },
      ),
    ),
  );
});

/** Places a ResizableRegion set up by `spec`, with its numeric sizes. */
async function region(
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

const CATALOG_PANEL = [
  'Catalog Panel',
  'Navigation or inspector content, 180⁠–⁠420 px wide.',
] as const;

test('builds Resize › Horizontal Resize', async ({ page }) => {
  // regionSize starts at 276.
  await region(
    page,
    { text: { id: 'catalog-panel', label: 'Catalog Panel' } },
    { size: '276', min: '180', max: '420' },
  );
  // Its seeded text became a Text, which goes.
  await addInto(page, /^ResizableRegion/, 'Pane', 0, 0);
  await contentItemInto(page, /^Pane/, 1, ...CATALOG_PANEL);
  // The handle icon comes last: Add a child keeps the zone it last used.
  await select(page, /^ResizableRegion/);
  await addIcon(page, 'handleIcon', 'grip-vertical');
  await select(page, /^LucideIcon/);
  await setText(page, 'name', 'custom-resize-handle');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'resize',
        {
          id: 'catalog-panel',
          label: 'Catalog Panel',
          size: 276,
          min: 180,
          max: 420,
        },
        {
          children: [
            node('pane', undefined, {
              content: [demoContentItem(...CATALOG_PANEL)],
            }),
          ],
          handleIcon: [icon('grip-vertical', { name: 'custom-resize-handle' })],
        },
      ),
    ),
  );
});

test('builds Resize › Popup from a Clipped Drawer', async ({ page }) => {
  const items = [
    { label: 'New Terminal', action: 'create-terminal' },
    { label: 'New Task', action: 'create-task' },
  ];
  await region(
    page,
    {
      choices: { axis: 'vertical', edge: 'start' },
      text: { id: 'catalog-menu-drawer', label: 'Menu Drawer' },
    },
    { size: '120', min: '120', max: '240' },
  );
  // Its seeded text became a Text, which goes.
  await addInto(page, /^ResizableRegion/, 'PopupMenu', 0, 0);
  await select(page, /^PopupMenu/);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { placement: 'top-start' },
    text: { text: 'Create Item' },
    unsets: ['label'],
  });
  await editAsJson(page, 'items', items);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'resize',
        {
          id: 'catalog-menu-drawer',
          label: 'Menu Drawer',
          axis: 'vertical',
          edge: 'start',
          size: 120,
          min: 120,
          max: 240,
        },
        {
          children: [
            node('popup-menu', {
              text: 'Create Item',
              placement: 'top-start',
              items,
            }),
          ],
        },
      ),
    ),
  );
});

test('builds Resize › Collapsed Region Restore', async ({ page }) => {
  await region(
    page,
    {
      choices: { restorePosition: 'top-end' },
      text: { id: 'catalog-collapsed-panel', label: 'Collapsed Panel' },
    },
    { size: '240', min: '180', max: '420' },
  );
  // Its seeded text became a Text, which goes.
  await addInto(page, /^ResizableRegion/, 'Pane', 0, 0);
  // The restore control comes last: Add a child keeps the zone it last used.
  await select(page, /^ResizableRegion/);
  await page.locator('[data-editor-content-add="restoreControl"]').click();
  await addChild(page, 'FloatingToolbar');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { placement: 'inline' },
    text: { label: 'Restore Collapsed Panel' },
  });
  // Its seeded text became a Text, which goes.
  await select(page, /^Text(?![A-Z])/, -1);
  await deleteSelected(page);
  await select(page, /^FloatingToolbar/);
  await addChild(page, 'ToolbarControlGroup');
  await area(page, 'Properties');
  await applySpec(page, {
    flags: ['single'],
    text: { label: 'Restore Panel' },
  });
  await select(page, /^ToolbarButton/);
  await applySpec(page, {
    text: { ariaLabel: 'Restore Panel' },
    unsets: ['children'],
  });
  await addIcon(page, 'icon', 'panel-left-open');
  await select(page, /^ResizableRegion/);
  await turnOn(page, 'collapsed');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'resize',
        {
          id: 'catalog-collapsed-panel',
          label: 'Collapsed Panel',
          size: 240,
          min: 180,
          max: 420,
          collapsed: true,
          restorePosition: 'top-end',
        },
        {
          children: [node('pane')],
          restoreControl: [
            node(
              'floating-toolbar',
              { label: 'Restore Collapsed Panel', placement: 'inline' },
              {
                children: [
                  buttonGroupNode({ label: 'Restore Panel', single: true }, [
                    [{ ariaLabel: 'Restore Panel' }, 'panel-left-open'],
                  ]),
                ],
              },
            ),
          ],
        },
      ),
    ),
  );
});

/** A demo `itemCopy` List: a strong title over a quiet compact detail. */
const itemCopyNode = (title: string, detail: string) =>
  (demoContentItem(title, detail).zones as { children: unknown[] }).children[0];

/** Adds an `itemCopy` List to the selected container. */
async function itemCopy(page: Page, title: string, detail: string) {
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
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await applySpec(page, {
    choices: { weight: 'Default (regular)', tone: 'quiet', size: 'compact' },
    text: { children: detail },
  });
}

/** Places a List of selectable ContentItems named `ariaLabel`. */
async function selectableList(page: Page, ariaLabel: string) {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List/);
  await applySpec(page, {
    choices: { selectionMode: 'multiple' },
    text: { ariaLabel },
  });
}

/** Adds an interactive, multiply selectable ContentItem to the outer List. */
async function selectableItem(page: Page, text: FieldSpec['text'], data = {}) {
  await addInto(page, /^List(?!Item)/, 'ContentItem', 0);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { selectionMode: 'multiple' },
    flags: ['interactive'],
    text,
    data: Object.entries(data),
  });
}

const RICH_CARDS = [
  ['demand-a', 'Demand Line A'],
  ['demand-b', 'Demand Line B'],
] as const;

// KF-XVVEX5: contentCardSelections starts empty, so no card is selected.
test('builds ContentItem › Selectable Rich Cards', async ({ page }) => {
  test.slow();
  const items = [{ label: 'Show Details', action: 'log-more' }];
  await selectableList(page, 'Demand Lines');
  for (const [index, [id, label]] of RICH_CARDS.entries()) {
    await selectableItem(
      page,
      { action: 'select-rich-card', itemId: id, ariaLabel: label },
      { 'data-demo-item': id },
    );
    await addChild(page, 'Row');
    await area(page, 'Properties');
    await applySpec(page, { choices: { vAlign: 'middle' }, flags: ['wrap'] });
    await itemCopy(page, label, 'Review the quote and choose a decision.');
    await addInto(page, /^Row/, 'Button', index);
    await area(page, 'Properties');
    await applySpec(page, {
      text: { children: 'Open Quote', action: 'log-card-primary' },
    });
    await addInto(page, /^Row/, 'PopupMenu', index);
    await area(page, 'Properties');
    await applySpec(page, {
      text: { text: 'More Actions' },
      unsets: ['label'],
    });
    await editAsJson(page, 'items', items);
    await addInto(page, /^Row/, 'Button', index);
    await area(page, 'Properties');
    await applySpec(page, {
      text: { children: 'Approve', action: 'log-decision' },
      data: [['data-decision', 'approve']],
    });
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { selectionMode: 'multiple', ariaLabel: 'Demand Lines' },
        {
          children: RICH_CARDS.map(([id, label]) =>
            node(
              'content-item',
              {
                interactive: true,
                action: 'select-rich-card',
                itemId: id,
                selectionMode: 'multiple',
                ariaLabel: label,
                rootAttributes: { 'data-demo-item': id },
              },
              {
                children: [
                  node(
                    'row',
                    { vAlign: 'middle', wrap: true },
                    {
                      children: [
                        itemCopyNode(
                          label,
                          'Review the quote and choose a decision.',
                        ),
                        node('button', {
                          children: 'Open Quote',
                          action: 'log-card-primary',
                        }),
                        node('popup-menu', { text: 'More Actions', items }),
                        node('button', {
                          children: 'Approve',
                          action: 'log-decision',
                          rootAttributes: { 'data-decision': 'approve' },
                        }),
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

const CONVERSATION = [
  ['message-1', 'Why did the nightly build fail?'],
  ['message-2', 'The bundle budget check failed.'],
  ['message-3', 'Rebaseline the budget with a reason.'],
] as const;

// KF-XVVEX5: conversationSelections starts empty, so no message is selected.
test('builds ContentItem › Mixed Selectable and Non-Selectable Rows', async ({
  page,
}) => {
  test.slow();
  const message = async ([id, text]: (typeof CONVERSATION)[number]) => {
    await selectableItem(page, {
      action: 'select-conversation-message',
      itemId: id,
      ariaLabel: text,
    });
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span' },
      text: { children: text },
    });
  };
  await selectableList(page, 'Conversation');
  await message(CONVERSATION[0]);
  await message(CONVERSATION[1]);
  await addInto(page, /^List(?!Item)/, 'ContentItem', 0);
  await area(page, 'Properties');
  await turnOn(page, 'gridRow');
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { variant: 'span', tone: 'quiet', size: 'compact' },
    text: { children: '3 messages skipped' },
  });
  await addInto(page, /^List(?!Item)/, 'ContentItem', 0);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { appearance: 'surface', frame: 'framed' },
    flags: ['gridRow'],
  });
  await addChild(page, 'Row');
  await area(page, 'Properties');
  await choose(page, 'vAlign', 'middle');
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { variant: 'span' },
    text: { children: 'Ran 4 checks' },
  });
  await addInto(page, /^Row/, 'Button');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'compact', emphasis: 'secondary' },
    text: { children: 'Show Activity', action: 'log-more' },
  });
  await message(CONVERSATION[2]);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  const messageNode = ([id, text]: (typeof CONVERSATION)[number]) =>
    node(
      'content-item',
      {
        interactive: true,
        action: 'select-conversation-message',
        itemId: id,
        selectionMode: 'multiple',
        ariaLabel: text,
      },
      { children: [node('text', { children: text, variant: 'span' })] },
    );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { selectionMode: 'multiple', ariaLabel: 'Conversation' },
        {
          children: [
            messageNode(CONVERSATION[0]),
            messageNode(CONVERSATION[1]),
            node(
              'content-item',
              { gridRow: true },
              {
                children: [
                  node('text', {
                    children: '3 messages skipped',
                    variant: 'span',
                    tone: 'quiet',
                    size: 'compact',
                  }),
                ],
              },
            ),
            node(
              'content-item',
              { gridRow: true, appearance: 'surface', frame: 'framed' },
              {
                children: [
                  node(
                    'row',
                    { vAlign: 'middle' },
                    {
                      children: [
                        node('text', {
                          children: 'Ran 4 checks',
                          variant: 'span',
                        }),
                        node('button', {
                          children: 'Show Activity',
                          size: 'compact',
                          emphasis: 'secondary',
                          action: 'log-more',
                        }),
                      ],
                    },
                  ),
                ],
              },
            ),
            messageNode(CONVERSATION[2]),
          ],
        },
      ),
    ),
  );
});

/**
 * A sunken-main Workbench `id`, labeled `label`, in a SizedRegion: its
 * seeded main Text becomes a ContentItem reading `main`.
 */
async function sunkenWorkbench(
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
const textItemNode = (text: string) => node('content-item', { children: text });

// KF-W5N3MK: Pane › Edge-to-Edge Table (Regular Content Inset and Deep
// Inset) are not built. Their table is app-owned markup styled by app CSS
// that reads the Pane's inset variables, which is what those examples
// demonstrate; a view document holds only components.
test('builds Pane › Sunken Chat Workspace', async ({ page }) => {
  test.slow();
  await sunkenWorkbench(
    page,
    'sunken-chat',
    'Chat Workspace',
    'Welcome to the conversation',
  );
  await select(page, /^Workbench/);
  await addChild(page, 'ContentItem', 'mainFooter');
  await addChild(page, 'TextField');
  await area(page, 'Properties');
  await applySpec(page, {
    text: { ariaLabel: 'Message', placeholder: 'Write a message' },
    unsets: ['label'],
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'workbench',
          {
            id: 'sunken-chat',
            label: 'Chat Workspace',
            mainPane: { appearance: 'sunken' },
          },
          {
            main: [textItemNode('Welcome to the conversation')],
            mainFooter: [
              node('content-item', undefined, {
                children: [
                  node('text-field', {
                    ariaLabel: 'Message',
                    placeholder: 'Write a message',
                  }),
                ],
              }),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds Pane › Sunken Workbench Regions Without Pane Chrome', async ({
  page,
}) => {
  test.slow();
  await sunkenWorkbench(
    page,
    'sunken-raw-workbench',
    'Bare Work Regions',
    'Main work area',
  );
  await select(page, /^Workbench/);
  await choose(page, 'leftRail', 'Static panel…');
  await configure(page, 'leftRail');
  await setField(page, 'leftRail', ['label'], 'Navigator');
  await openField(page, 'leftRail', ['pane']);
  await chooseField(page, 'leftRail', ['pane', 'appearance'], 'sunken');
  await back(page);
  await back(page);
  await dragComponent(page, 'ContentItem', () =>
    canvas(page).locator('[data-editor-empty]', {
      hasText: 'leftRailContent slot — drop here',
    }),
  );
  // The rail sorts before the main area in the outline.
  await select(page, /^ContentItem/, 0);
  await setText(page, 'children', 'Navigator');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      sized(
        node(
          'workbench',
          {
            id: 'sunken-raw-workbench',
            label: 'Bare Work Regions',
            mainPane: { appearance: 'sunken' },
            leftRail: { label: 'Navigator', pane: { appearance: 'sunken' } },
          },
          {
            main: [textItemNode('Main work area')],
            'leftRail.content': [textItemNode('Navigator')],
          },
        ),
      ),
    ),
  );
});

test('builds Pane › Focusable Pane and Persistent Outline', async ({
  page,
}) => {
  await rootPane(
    page,
    {
      choices: { element: 'section', tabIndex: '0' },
      flags: ['outlined'],
      text: { label: 'Drop Target Pane' },
      data: [['data-demo-focus-pane', '']],
    },
    { items: ['Drop a project here.'] },
  );
  expect(await exported(page)).toEqual(
    rootPaneNode(
      {
        element: 'section',
        label: 'Drop Target Pane',
        tabIndex: 0,
        outlined: true,
        rootAttributes: { 'data-demo-focus-pane': '' },
      },
      { content: items(['Drop a project here.']) },
    ),
  );
});

test('builds Pane › Deep Inset Content', async ({ page }) => {
  const header = {
    label: 'Deep Inset Header',
    text: 'Projects',
    size: 'large',
  };
  await rootPane(
    page,
    { flags: ['deepInset'], text: { label: 'Deep Inset Example' } },
    { header, items: ['Direct content item'] },
  );
  await select(page, /^Pane/);
  await addChild(page, 'List', 'content');
  await addChild(page, 'ContentItem');
  await area(page, 'Properties');
  await setText(page, 'children', 'Nested List content item');
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { label: 'Deep Inset Example', deepInset: true },
      {
        header: [chromeNode(header)],
        content: [
          ...items(['Direct content item']),
          node('list', undefined, {
            children: items(['Nested List content item']),
          }),
        ],
      },
    ),
  );
});

test('builds Pane › Scroll Dividers', async ({ page }) => {
  test.slow();
  const updates = Array.from({ length: 12 }, (_, i) => `Update ${i + 1}`);
  const header = { label: 'Activity Header', text: 'Activity', size: 'large' };
  const footer = {
    label: 'Activity Footer',
    text: '12 updates',
    size: 'small',
  };
  await rootPane(
    page,
    {
      choices: { element: 'section', appearance: 'sunken' },
      text: { label: 'Scrolling Pane' },
      data: [['data-scroll-divider-demo', 'pane']],
    },
    { header, footer, items: updates },
  );
  expect(await exported(page)).toEqual(
    rootPaneNode(
      {
        element: 'section',
        label: 'Scrolling Pane',
        appearance: 'sunken',
        rootAttributes: { 'data-scroll-divider-demo': 'pane' },
      },
      {
        header: [chromeNode(header)],
        content: items(updates),
        footer: [chromeNode(footer)],
      },
    ),
  );
});

const albumHeader = (description?: string) => ({
  label: 'Album Header',
  text: 'Night Drive',
  size: 'xlarge',
  ...(description ? { description } : {}),
});

test('builds Pane › Background Color', async ({ page }) => {
  const songs = ['Overture', 'Neon Rain', 'Coastline', 'Last Exit'].map(
    (title, index) => `${index + 1}. ${title}`,
  );
  await rootPane(
    page,
    {
      choices: { element: 'section' },
      text: { label: 'Album' },
      data: [['data-background-demo', 'pane']],
    },
    { header: albumHeader(), items: songs },
  );
  await select(page, /^Pane/);
  await setCss(page, 'background', "fillColor('light-dark(#e6edfb, #1b2438)')");
  expect(await exported(page)).toEqual(
    rootPaneNode(
      {
        element: 'section',
        label: 'Album',
        background: { $css: "fillColor('light-dark(#e6edfb, #1b2438)')" },
        rootAttributes: { 'data-background-demo': 'pane' },
      },
      { header: [chromeNode(albumHeader())], content: items(songs) },
    ),
  );
});

test('builds Pane › Tinted Surface', async ({ page }) => {
  test.slow();
  const songs = [
    'Overture',
    'Neon Rain',
    'Coastline',
    'Last Exit',
    'Afterglow',
    'Static',
    'Slow Burn',
    'Homeward',
  ].map((title, index) => `${index + 1}. ${title}`);
  const header = albumHeader('12 songs, 48 minutes');
  await rootPane(
    page,
    {
      choices: { element: 'section', headerPresentation: 'overlay' },
      text: { label: 'Album' },
      data: [['data-tint-demo', 'pane']],
    },
    { header, items: songs },
  );
  await select(page, /^Pane/);
  await page.getByRole('button', { name: 'Configure tint' }).click();
  await setField(page, 'tint', ['color'], "fillColor('#5b2a86')");
  await chooseField(page, 'tint', ['scheme'], 'dark');
  await back(page);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      {
        element: 'section',
        label: 'Album',
        tint: { color: { $css: "fillColor('#5b2a86')" }, scheme: 'dark' },
        headerPresentation: 'overlay',
        rootAttributes: { 'data-tint-demo': 'pane' },
      },
      { header: [chromeNode(header)], content: items(songs) },
    ),
  );
});

test('builds Pane › Overlay Header', async ({ page }) => {
  test.slow();
  const kinds = [
    ['Design Review', 'calendar', 'brand'],
    ['Backup Complete', 'shield-check', 'success'],
    ['Storage Almost Full', 'bell', 'warning'],
    ['Weekly Summary', 'mail', 'neutral'],
  ] as const;
  const messages = Array.from({ length: 18 }, (_, index) => ({
    id: `inbox-${index + 1}`,
    ...(([label, glyph, tone]) => ({ label, glyph, tone }))(
      kinds[index % kinds.length]!,
    ),
  }));
  const header = { label: 'Inbox Header', text: 'Inbox', size: 'xlarge' };
  await rootPane(
    page,
    {
      choices: { element: 'section', headerPresentation: 'overlay' },
      text: { label: 'Inbox' },
      data: [['data-overlay-header-demo', 'pane']],
    },
    { header },
  );
  await select(page, /^Pane/);
  await addChild(page, 'List', 'content');
  // One row, set up and duplicated: each copy then takes its message.
  await addChild(page, 'ListItem');
  await area(page, 'Properties');
  await setText(page, 'action', 'log-inbox');
  for (let copy = 1; copy < messages.length; copy += 1)
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  for (const [index, message] of messages.entries()) {
    await select(page, /^ListItem/, index);
    await applySpec(page, {
      choices: { iconTile: message.tone },
      text: { itemId: message.id, label: message.label },
    });
    await addIcon(page, 'icon', message.glyph);
  }
  expect(await exported(page)).toEqual(
    rootPaneNode(
      {
        element: 'section',
        label: 'Inbox',
        headerPresentation: 'overlay',
        rootAttributes: { 'data-overlay-header-demo': 'pane' },
      },
      {
        header: [chromeNode(header)],
        content: [
          node('list', undefined, {
            children: messages.map((message) =>
              node(
                'list-item',
                {
                  action: 'log-inbox',
                  itemId: message.id,
                  label: message.label,
                  iconTile: message.tone,
                },
                { icon: [icon(message.glyph)] },
              ),
            ),
          }),
        ],
      },
    ),
  );
});

test('builds Pane › Sunken Auto Chrome', async ({ page }) => {
  test.slow();
  const entries = Array.from({ length: 12 }, (_, i) => `Entry ${i + 1}`);
  await rootPane(
    page,
    {
      choices: { appearance: 'sunken', chromePlacement: 'auto' },
      text: { label: 'Sunken Auto Workspace' },
      // Auto chrome measures a definite height, which the demo's tall
      // frame gives; at the root, the default fill gives it the canvas.
      flags: ['fill'],
    },
    {
      header: { label: 'Header', text: 'Header' },
      footer: { label: 'Footer', text: 'Footer' },
      items: entries,
    },
  );
  expect(await exported(page)).toEqual(
    rootPaneNode(
      {
        fill: true,
        appearance: 'sunken',
        chromePlacement: 'auto',
        label: 'Sunken Auto Workspace',
      },
      {
        header: [chromeNode({ label: 'Header', text: 'Header' })],
        content: items(entries),
        footer: [chromeNode({ label: 'Footer', text: 'Footer' })],
      },
    ),
  );
});

/**
 * Adds a DemoChip to the `nth` `parent`: an outlined, rounded Badge, compact
 * unless the chip is `wide` or `tall` (then the default Badge size).
 */
async function demoChip(
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

const demoChipNode = (children: string, big = false) =>
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
async function spacedChips(
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

const spacedChipsNode = (
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

test('builds Spacer › Named Dimensions', async ({ page }) => {
  await spacedChips(
    page,
    'Row',
    { choices: { vAlign: 'middle', gap: 'none' } },
    ['Before', 'After'],
    { choices: { width: 'm', height: 'l' } },
  );
  expect(await exported(page)).toEqual(
    pane(
      spacedChipsNode(
        'row',
        { vAlign: 'middle', gap: 'none' },
        ['Before', 'After'],
        {
          width: 'm',
          height: 'l',
        },
      ),
    ),
  );
});

test('builds Spacer › Flexible Space', async ({ page }) => {
  await spacedChips(
    page,
    'Row',
    { choices: { vAlign: 'middle', gap: 'none' } },
    ['Leading', 'Trailing'],
    { flags: ['flex'] },
  );
  expect(await exported(page)).toEqual(
    pane(
      spacedChipsNode(
        'row',
        { vAlign: 'middle', gap: 'none' },
        ['Leading', 'Trailing'],
        { flex: true },
      ),
    ),
  );
});

test('builds Spacer › Vertical Space', async ({ page }) => {
  await spacedChips(
    page,
    'List',
    { choices: { gap: 'none' } },
    ['Above', 'Below'],
    { choices: { height: 'm' } },
  );
  expect(await exported(page)).toEqual(
    pane(
      spacedChipsNode('list', { gap: 'none' }, ['Above', 'Below'], {
        height: 'm',
      }),
    ),
  );
});

/** The Row demos' three chips: `prefix` one/two/three, the second tall. */
async function rowChips(page: Page, owner: RegExp, prefix = '', nth = 0) {
  const names = prefix
    ? [`${prefix} one`, `${prefix} two`, `${prefix} three`]
    : ['One', 'Two', 'Three'];
  for (const [index, name] of names.entries())
    await demoChip(page, owner, name, nth, index === 1);
}

const rowChipNodes = (prefix = '') =>
  (prefix
    ? [`${prefix} one`, `${prefix} two`, `${prefix} three`]
    : ['One', 'Two', 'Three']
  ).map((name, index) => demoChipNode(name, index === 1));

/** A DemoFrameShell holding one Row set up by `spec`. */
async function shellRow(page: Page, spec: FieldSpec) {
  await frameShell(page);
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await applySpec(page, spec);
}

test('builds Row › Default Row', async ({ page }) => {
  await shellRow(page, {});
  await rowChips(page, /^Row/);
  expect(await exported(page)).toEqual(
    pane(frameShellNode(node('row', undefined, { children: rowChipNodes() }))),
  );
});

test('builds Row › Flex Participation', async ({ page }) => {
  await frameShell(page);
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await applySpec(page, { choices: { gap: 'xs', flex: 'true' } });
  for (const [index, [prefix, flex]] of (
    [
      ['Growing', 'true'],
      ['Fixed', 'none'],
    ] as const
  ).entries()) {
    await addInto(page, /^List(?![A-Z])/, 'Row');
    await applySpec(page, {
      choices: { flex, vAlign: 'middle' },
      flags: ['wrap'],
    });
    await rowChips(page, /^Row/, prefix, index);
  }
  expect(await exported(page)).toEqual(
    pane(
      frameShellNode(
        node(
          'list',
          { gap: 'xs', flex: true },
          {
            children: [
              node(
                'row',
                { flex: true, vAlign: 'middle', wrap: true },
                { children: rowChipNodes('Growing') },
              ),
              node(
                'row',
                { flex: 'none', vAlign: 'middle', wrap: true },
                { children: rowChipNodes('Fixed') },
              ),
            ],
          },
        ),
      ),
    ),
  );
});

test('builds Row › Side-Selectable Insets', async ({ page }) => {
  await shellRow(page, {
    choices: { textInsets: 'tbl', controlInsets: 'r', vAlign: 'middle' },
  });
  await rowChips(page, /^Row/);
  expect(await exported(page)).toEqual(
    pane(
      frameShellNode(
        node(
          'row',
          { textInsets: 'tbl', controlInsets: 'r', vAlign: 'middle' },
          { children: rowChipNodes() },
        ),
      ),
    ),
  );
});

/**
 * Splits the selected Row's gap into per-axis values (KF-VA14AP): Columns
 * and rows, then a size Select for each axis.
 */
async function axisGap(page: Page, column: string, row: string) {
  await choose(page, 'gap', 'Columns and rows…');
  await chooseField(page, 'gap', ['column'], column);
  await chooseField(page, 'gap', ['row'], row);
}

test('builds Row › Independent Gaps', async ({ page }) => {
  const labels = [
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
  ];
  await shellRow(page, { choices: { vAlign: 'top' }, flags: ['wrap'] });
  await axisGap(page, 'none', 'm');
  // A wide DemoChip is a default-size Badge.
  await demoChip(page, /^Row/, labels[0]!, 0, true);
  await select(page, /^Badge/);
  for (let copy = 1; copy < labels.length; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  for (const [index, label] of labels.entries()) {
    await select(page, /^Badge/, index);
    await setText(page, 'children', label);
  }
  await expect(canvas(page).locator('.kui-badge[data-kerf-node]')).toHaveText(
    labels,
  );
  expect(await exported(page)).toEqual(
    pane(
      frameShellNode(
        node(
          'row',
          { vAlign: 'top', wrap: true, gap: { column: 'none', row: 'm' } },
          { children: labels.map((label) => demoChipNode(label, true)) },
        ),
      ),
    ),
  );
});

test('builds Row › Nested Row Insets', async ({ page }) => {
  await shellRow(page, { choices: { textInsets: 'l', vAlign: 'middle' } });
  await axisGap(page, 'none', 'm');
  await demoChip(page, /^Row/, 'Outer');
  await addInto(page, /^Row/, 'Row');
  await applySpec(page, { choices: { controlInsets: 'b', vAlign: 'middle' } });
  await demoChip(page, /^Row/, 'Nested one', 1);
  await demoChip(page, /^Row/, 'Nested two', 1, true);
  expect(await exported(page)).toEqual(
    pane(
      frameShellNode(
        node(
          'row',
          {
            textInsets: 'l',
            vAlign: 'middle',
            gap: { column: 'none', row: 'm' },
          },
          {
            children: [
              demoChipNode('Outer'),
              node(
                'row',
                { controlInsets: 'b', vAlign: 'middle' },
                {
                  children: [
                    demoChipNode('Nested one'),
                    demoChipNode('Nested two', true),
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

test('builds Disclosure › Plain Disclosure', async ({ page }) => {
  const copy =
    'Proxy, request timeout, and retry limits apply to every connection this workspace makes.';
  await dragComponent(page, 'List', () => emptySpot(page));
  await disclosureInto(page, /^List(?![A-Z])/, {
    text: { title: 'Advanced Settings', detail: '3 options' },
  });
  await textInto(page, /^Disclosure/, copy);
  expect(await exported(page)).toEqual(
    pane(
      node('list', undefined, {
        children: [
          node(
            'disclosure',
            { title: 'Advanced Settings', detail: '3 options' },
            { children: [textNode(copy)] },
          ),
        ],
      }),
    ),
  );
});

/**
 * Adds a Disclosure (set up by `spec`) to the `nth` `parent`, and removes
 * the bare text it is seeded with (a text node with no Properties).
 */
async function disclosureInto(
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
async function disclosureButton(
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
const disclosureButtonNode = (
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

test('builds DisclosureArrow › Default', async ({ page }) => {
  await disclosureButton(page, 'Details', 'toggle-disclosure');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(disclosureButtonNode('Details', 'toggle-disclosure')),
  );
});

test('builds DisclosureArrow › Replacement Icon', async ({ page }) => {
  await disclosureButton(page, 'Preview', 'toggle-custom-disclosure', {
    choices: { openDirection: 'up', closedDirection: 'left' },
  });
  await addChild(page, 'LucideIcon', 'icon');
  await area(page, 'Properties');
  await pickIcon(page, page.locator('[data-editor-icon-place]'), 'arrow-right');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      disclosureButtonNode(
        'Preview',
        'toggle-custom-disclosure',
        { openDirection: 'up', closedDirection: 'left' },
        { icon: [icon('arrow-right')] },
      ),
    ),
  );
});

test('builds DisclosureArrow › Sized', async ({ page }) => {
  await disclosureButton(page, 'Activity', 'toggle-sized-disclosure');
  // The demo's remify(24) is rem(1.5); this prop's builders take rem().
  await setCss(page, 'size', 'rem(1.5)');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      disclosureButtonNode('Activity', 'toggle-sized-disclosure', {
        size: { $css: 'rem(1.5)' },
      }),
    ),
  );
});

test('builds Disclosure › Embedded in a Content Item', async ({ page }) => {
  const note =
    'Move the export button into the toolbar so it sits beside Share.';
  const feedback =
    'Group Export and Share in one control group, and keep Delete in the overflow menu.';
  await rootPane(page, { text: { label: 'Note' } }, {});
  await addInto(page, /^Pane/, 'ContentItem');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { frame: 'framed' },
    data: [['data-demo-item', 'embedded-disclosure']],
  });
  await addChild(page, 'List');
  await area(page, 'Properties');
  await choose(page, 'gap', 'xs');
  await textInto(page, /^List(?![A-Z])/, note, 0, { flags: ['flush'] });
  await disclosureInto(page, /^List(?![A-Z])/, {
    choices: { appearance: 'embedded' },
    text: { title: 'AI Feedback', detail: '2 suggestions' },
  });
  await textInto(page, /^Disclosure/, feedback, 0, {
    choices: { tone: 'quiet' },
    flags: ['flush'],
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { label: 'Note' },
      {
        content: [
          node(
            'content-item',
            {
              frame: 'framed',
              rootAttributes: { 'data-demo-item': 'embedded-disclosure' },
            },
            {
              children: [
                node(
                  'list',
                  { gap: 'xs' },
                  {
                    children: [
                      textNode(note, { flush: true }),
                      node(
                        'disclosure',
                        {
                          title: 'AI Feedback',
                          detail: '2 suggestions',
                          appearance: 'embedded',
                        },
                        {
                          children: [
                            textNode(feedback, { flush: true, tone: 'quiet' }),
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
      },
    ),
  );
});

test('builds Disclosure › Framed and Sunken', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await choose(page, 'gap', 'xs');
  await disclosureInto(page, /^List(?![A-Z])/, {
    choices: { appearance: 'framed' },
    flags: ['open'],
    text: { title: 'Release Notes' },
  });
  await textInto(
    page,
    /^Disclosure/,
    'Faster sync, a new export format, and four fixes.',
  );
  await disclosureInto(page, /^List(?![A-Z])/, {
    choices: { appearance: 'sunken' },
    text: { title: 'Build Log', detail: '412 lines' },
  });
  await textInto(page, /^Disclosure/, 'npm run build — completed in 18.4s', 1, {
    choices: { font: 'monospace' },
  });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node(
              'disclosure',
              { title: 'Release Notes', appearance: 'framed', open: true },
              {
                children: [
                  textNode('Faster sync, a new export format, and four fixes.'),
                ],
              },
            ),
            node(
              'disclosure',
              { title: 'Build Log', detail: '412 lines', appearance: 'sunken' },
              {
                children: [
                  textNode('npm run build — completed in 18.4s', {
                    font: 'monospace',
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

// The demo keys each FAQ row with data-key, a reserved name a view document
// does not carry (KUI-V015); the rows render the same without it.
test('builds Disclosure › Accordion', async ({ page }) => {
  const faq = [
    [
      'When am I billed?',
      'On the first of each month, for the seats active the day before.',
    ],
    [
      'Can I change the number of seats?',
      'Yes. Added seats are prorated; removed seats end with the period.',
    ],
    [
      'How do I export my data?',
      'Settings › Data › Export creates an archive of every project.',
    ],
  ] as const;
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List(?![A-Z])/);
  await choose(page, 'gap', 'xs');
  for (const [index, [title, answer]] of faq.entries()) {
    await disclosureInto(page, /^List(?![A-Z])/, {
      choices: { appearance: 'framed' },
      text: { title, name: 'disclosure-demo-faq' },
    });
    await textInto(page, /^Disclosure/, answer, index);
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: faq.map(([title, answer]) =>
            node(
              'disclosure',
              { title, name: 'disclosure-demo-faq', appearance: 'framed' },
              { children: [textNode(answer)] },
            ),
          ),
        },
      ),
    ),
  );
});

/** Places a Grid set up by `spec` (and `css`) at the first empty spot. */
async function grid(
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
async function gridTile(page: Page, text: string) {
  await addInto(page, /^Grid/, 'ContentItem');
  await applySpec(page, {
    choices: { appearance: 'surface', frame: 'framed' },
    text: { children: text },
  });
}

const gridTileNode = (children: string) =>
  node('content-item', { children, appearance: 'surface', frame: 'framed' });

/** Adds a TextField with `label` and `value` to the Grid. */
async function gridField(page: Page, label: string, value: string) {
  await addInto(page, /^Grid/, 'TextField');
  await applySpec(page, { text: { label, value } });
}

test('builds Grid › Two Columns', async ({ page }) => {
  await grid(page, { choices: { gap: 'm' }, text: { columns: '2' } });
  await gridField(page, 'Quantity', '12');
  await gridField(page, 'Unit', 'pieces');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'grid',
        { columns: 2, gap: 'm' },
        {
          children: [
            node('text-field', { label: 'Quantity', value: '12' }),
            node('text-field', { label: 'Unit', value: 'pieces' }),
          ],
        },
      ),
    ),
  );
});

test('builds Grid › Four Columns', async ({ page }) => {
  const labels = ['Q1', 'Q2', 'Q3', 'Q4 est.'];
  await grid(page, { choices: { gap: 'xs' }, text: { columns: '4' } });
  for (const label of labels) await gridTile(page, label);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'grid',
        { columns: 4, gap: 'xs' },
        { children: labels.map((label) => gridTileNode(label)) },
      ),
    ),
  );
});

test('builds Grid › Responsive Form Columns', async ({ page }) => {
  // The palette's Grid seeds one column; these tracks come from a width.
  await grid(
    page,
    { choices: { gap: 'm' }, text: { columns: '' } },
    { minColumnWidth: 'px(376)' },
  );
  await gridField(page, 'Provider Name', 'Example provider');
  await gridField(page, 'API Endpoint', 'https://example.test');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'grid',
        { minColumnWidth: { $css: 'px(376)' }, gap: 'm' },
        {
          children: [
            node('text-field', {
              label: 'Provider Name',
              value: 'Example provider',
            }),
            node('text-field', {
              label: 'API Endpoint',
              value: 'https://example.test',
            }),
          ],
        },
      ),
    ),
  );
});

test('builds Grid › Text and Control Insets', async ({ page }) => {
  await grid(page, {
    choices: { textInsets: 'l', controlInsets: 'rl' },
    text: { columns: '2' },
    data: [['data-demo-grid-insets', '']],
  });
  await textInto(page, /^Grid/, 'Text aligned to the full content inset', 0, {
    flags: ['flush'],
  });
  await gridField(page, 'Amount', '12');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'grid',
        {
          columns: 2,
          textInsets: 'l',
          controlInsets: 'rl',
          rootAttributes: { 'data-demo-grid-insets': '' },
        },
        {
          children: [
            textNode('Text aligned to the full content inset', { flush: true }),
            node('text-field', { label: 'Amount', value: '12' }),
          ],
        },
      ),
    ),
  );
});

test('builds Grid › Flex Participation', async ({ page }) => {
  const labels = ['One', 'Two', 'Three'];
  await frameShell(page);
  await dragComponent(page, 'Grid', () => emptySpot(page));
  await select(page, /^Grid/);
  await applySpec(page, {
    choices: { gap: 'xs', flex: 'true' },
    text: { columns: '3' },
  });
  for (const label of labels) await gridTile(page, label);
  expect(await exported(page)).toEqual(
    pane(
      frameShellNode(
        node(
          'grid',
          { columns: 3, gap: 'xs', flex: true },
          { children: labels.map((label) => gridTileNode(label)) },
        ),
      ),
    ),
  );
});

test('builds Grid › Sparse Document Tiles', async ({ page }) => {
  await grid(
    page,
    { choices: { gap: 'm' }, flags: ['autoFill'], text: { columns: '' } },
    { minColumnWidth: 'px(160)' },
  );
  await gridTile(page, 'One document');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'grid',
        { minColumnWidth: { $css: 'px(160)' }, autoFill: true, gap: 'm' },
        { children: [gridTileNode('One document')] },
      ),
    ),
  );
});

/** A nested Pane (set up by `spec`) at the first empty spot; Pane 1. */
async function nestedPane(page: Page, spec: FieldSpec) {
  await dragComponent(page, 'Pane', () => emptySpot(page));
  await select(page, /^Pane/, 1);
  await applySpec(page, spec);
}

const nestedPaneNode = (props: Record<string, unknown>, content: unknown[]) =>
  node('pane', props, { content });

/** A DemoContentItem in the nested Pane, then `spec` on that item. */
async function copyItem(
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
const copyItemNode = (
  title: string,
  detail: string,
  props: Record<string, unknown>,
) => ({ ...demoContentItem(title, detail), props });

test('builds ContentItem › Unframed and Framed Items', async ({ page }) => {
  await nestedPane(page, { text: { label: 'Content Items' } });
  await copyItem(
    page,
    'Workspace Details',
    'An ordinary item sits directly on the surface.',
    { data: [['data-demo-item', 'plain']] },
  );
  await copyItem(
    page,
    'Unsaved Changes',
    'A framed item reads as visibly bounded without moving its content.',
    { choices: { frame: 'framed' }, data: [['data-demo-item', 'framed']] },
    1,
  );
  expect(await exported(page)).toEqual(
    pane(
      nestedPaneNode({ label: 'Content Items' }, [
        copyItemNode(
          'Workspace Details',
          'An ordinary item sits directly on the surface.',
          { rootAttributes: { 'data-demo-item': 'plain' } },
        ),
        copyItemNode(
          'Unsaved Changes',
          'A framed item reads as visibly bounded without moving its content.',
          { frame: 'framed', rootAttributes: { 'data-demo-item': 'framed' } },
        ),
      ]),
    ),
  );
});

test('builds ContentItem › Focusable Item and Outlined Drop Target', async ({
  page,
}) => {
  await nestedPane(page, {
    flags: ['deepInset'],
    text: { label: 'Drop Target Items' },
  });
  await copyItem(page, 'Drop Target', 'Drop a file here or focus this item.', {
    choices: { tabIndex: '0' },
    flags: ['outlined'],
    data: [['data-demo-item', 'outlined']],
  });
  expect(await exported(page)).toEqual(
    pane(
      nestedPaneNode({ label: 'Drop Target Items', deepInset: true }, [
        copyItemNode('Drop Target', 'Drop a file here or focus this item.', {
          tabIndex: 0,
          outlined: true,
          rootAttributes: { 'data-demo-item': 'outlined' },
        }),
      ]),
    ),
  );
});

test('builds ContentItem › Surface and Semantic Appearances', async ({
  page,
}) => {
  test.slow();
  const appearances = [
    'transparent',
    'surface',
    'neutral',
    'info',
    'pop',
    'success',
    'warning',
    'danger',
  ];
  await grid(
    page,
    {
      choices: { gap: 'xs' },
      text: { columns: '' },
      data: [['data-demo-item-appearances', '']],
    },
    { minColumnWidth: 'rem(12)' },
  );
  for (const appearance of appearances) {
    await addInto(page, /^Grid/, 'ContentItem');
    await applySpec(page, {
      choices: { appearance },
      data: [['data-demo-item', `appearance-${appearance}`]],
    });
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span', weight: 'strong' },
      text: { children: appearance },
    });
  }
  expect(await exported(page)).toEqual(
    pane(
      node(
        'grid',
        {
          minColumnWidth: { $css: 'rem(12)' },
          gap: 'xs',
          rootAttributes: { 'data-demo-item-appearances': '' },
        },
        {
          children: appearances.map((appearance) =>
            node(
              'content-item',
              {
                appearance,
                rootAttributes: {
                  'data-demo-item': `appearance-${appearance}`,
                },
              },
              {
                children: [
                  textNode(appearance, { variant: 'span', weight: 'strong' }),
                ],
              },
            ),
          ),
        },
      ),
    ),
  );
});

test('builds ContentItem › Flush Content and Separate Card Actions', async ({
  page,
}) => {
  await nestedPane(page, { text: { label: 'Quotation Preview' } });
  await addInto(page, /^Pane/, 'ContentItem', 1);
  await applySpec(page, {
    flags: ['flush'],
    data: [['data-demo-item', 'flush']],
  });
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { variant: 'p' },
    text: {
      children: "A compact markdown preview can reach the item's block edges.",
    },
  });
  await addInto(page, /^Pane/, 'ContentItem', 1);
  await applySpec(page, {
    choices: { frame: 'framed' },
    data: [['data-demo-item', 'multi-action-card']],
  });
  await addChild(page, 'Row');
  await area(page, 'Properties');
  await applySpec(page, { choices: { vAlign: 'middle' }, flags: ['wrap'] });
  for (const [label, action] of [
    ['Open Quotation', 'log-card-primary'],
    ['More Actions', 'log-more'],
  ] as const) {
    await addInto(page, /^Row/, 'Button');
    await applySpec(page, {
      choices: { emphasis: 'plain' },
      text: { children: label, action },
    });
  }
  expect(await exported(page)).toEqual(
    pane(
      nestedPaneNode({ label: 'Quotation Preview' }, [
        node(
          'content-item',
          { flush: true, rootAttributes: { 'data-demo-item': 'flush' } },
          {
            children: [
              textNode(
                "A compact markdown preview can reach the item's block edges.",
                { variant: 'p' },
              ),
            ],
          },
        ),
        node(
          'content-item',
          {
            frame: 'framed',
            rootAttributes: { 'data-demo-item': 'multi-action-card' },
          },
          {
            children: [
              node(
                'row',
                { vAlign: 'middle', wrap: true },
                {
                  children: [
                    node('button', {
                      children: 'Open Quotation',
                      emphasis: 'plain',
                      action: 'log-card-primary',
                    }),
                    node('button', {
                      children: 'More Actions',
                      emphasis: 'plain',
                      action: 'log-more',
                    }),
                  ],
                },
              ),
            ],
          },
        ),
      ]),
    ),
  );
});

test('builds ContentItem › Transcript Bubbles', async ({ page }) => {
  const bubbles = [
    ['end', 'brand-loud', 'Summarize the failing checks.', 'user'],
    [
      'start',
      'neutral',
      'Two checks fail: the bundle budget grew by 213 bytes, and the design-template drift render is missing the new variant.',
      'assistant',
    ],
    ['end', 'brand-loud', 'Thanks!', undefined],
  ] as const;
  await nestedPane(page, { text: { label: 'Assistant Conversation' } });
  await addInto(page, /^Pane/, 'List', 1);
  await applySpec(page, {
    choices: { gap: 'xs' },
    data: [['data-demo-transcript', '']],
  });
  for (const [bubble, appearance, copy, who] of bubbles) {
    await addInto(page, /^List(?![A-Z])/, 'ContentItem');
    await applySpec(page, {
      choices: { bubble, appearance },
      data: who ? [['data-demo-bubble', who]] : [],
    });
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span' },
      text: { children: copy },
    });
  }
  expect(await exported(page)).toEqual(
    pane(
      nestedPaneNode({ label: 'Assistant Conversation' }, [
        node(
          'list',
          { gap: 'xs', rootAttributes: { 'data-demo-transcript': '' } },
          {
            children: bubbles.map(([bubble, appearance, copy, who]) =>
              node(
                'content-item',
                {
                  bubble,
                  appearance,
                  ...(who
                    ? { rootAttributes: { 'data-demo-bubble': who } }
                    : {}),
                },
                { children: [textNode(copy, { variant: 'span' })] },
              ),
            ),
          },
        ),
      ]),
    ),
  );
});

test('builds ContentItem › Pill Shape', async ({ page }) => {
  await nestedPane(page, { text: { label: 'Pill Content Item' } });
  await addInto(page, /^Pane/, 'ContentItem', 1);
  await applySpec(page, {
    choices: { frame: 'framed', shape: 'pill' },
    data: [['data-demo-item', 'pill']],
  });
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { variant: 'span' },
    text: { children: 'Three reviewers approved this change.' },
  });
  expect(await exported(page)).toEqual(
    pane(
      nestedPaneNode({ label: 'Pill Content Item' }, [
        node(
          'content-item',
          {
            frame: 'framed',
            shape: 'pill',
            rootAttributes: { 'data-demo-item': 'pill' },
          },
          {
            children: [
              textNode('Three reviewers approved this change.', {
                variant: 'span',
              }),
            ],
          },
        ),
      ]),
    ),
  );
});

/** Adds a Row (set up by `row`) holding a Button to ContentSwap side `zone`. */
async function swapButtonRow(
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
async function dropSwapSeeds(page: Page) {
  for (let side = 0; side < 2; side += 1) {
    await select(page, /^Text(?![A-Z])/);
    await deleteSelected(page);
  }
}

// contentSwapStep starts on 'a', so the first render pushes backward.
test('builds ContentSwap › Push Between Steps', async ({ page }) => {
  const steps = [
    [
      'a',
      'Step 1 of 2 · Choose the folder that holds the project.',
      'Next',
      'content-swap-next',
    ],
    [
      'b',
      'Step 2 of 2 · Confirm the connection settings.',
      'Back',
      'content-swap-back',
    ],
  ] as const;
  await dragComponent(page, 'ContentSwap', () => emptySpot(page));
  await select(page, /^ContentSwap/);
  await applySpec(page, {
    choices: { active: 'a', direction: 'backward' },
    text: { label: 'Connect a Project' },
  });
  for (const [index, [zone, copy, label, action]] of steps.entries()) {
    await select(page, /^ContentSwap/);
    await addChild(page, 'List', zone);
    await area(page, 'Properties');
    await applySpec(page, { choices: { gap: 'xs', controlInsets: 'tb' } });
    await addChild(page, 'ListInsetText');
    await area(page, 'Properties');
    await setText(page, 'children', copy);
    await swapButtonRow(
      page,
      /^List(?![A-Z])/,
      index,
      'children',
      { choices: { hAlign: 'right', controlInsets: 'rl' } },
      { text: { children: label, action } },
    );
  }
  await dropSwapSeeds(page);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'content-swap',
        { label: 'Connect a Project', active: 'a', direction: 'backward' },
        Object.fromEntries(
          steps.map(([zone, copy, label, action]) => [
            zone,
            [
              node(
                'list',
                { gap: 'xs', controlInsets: 'tb' },
                {
                  children: [
                    node('list-inset-text', { children: copy }),
                    node(
                      'row',
                      { hAlign: 'right', controlInsets: 'rl' },
                      {
                        children: [node('button', { children: label, action })],
                      },
                    ),
                  ],
                },
              ),
            ],
          ]),
        ),
      ),
    ),
  );
});

// contentSwapFaded starts on 'a'.
test('builds ContentSwap › Crossfade', async ({ page }) => {
  await dragComponent(page, 'ContentSwap', () => emptySpot(page));
  await select(page, /^ContentSwap/);
  await applySpec(page, { choices: { transition: 'crossfade', active: 'a' } });
  await swapButtonRow(
    page,
    /^ContentSwap/,
    0,
    'a',
    { choices: { controlInsets: 'trbl' } },
    {
      text: { children: 'Show Details', action: 'content-swap-fade' },
    },
  );
  await swapButtonRow(
    page,
    /^ContentSwap/,
    0,
    'b',
    { choices: { controlInsets: 'trbl' } },
    {
      choices: { tone: 'brand' },
      text: { children: 'Hide Details', action: 'content-swap-fade' },
    },
  );
  const side = (button: Record<string, unknown>) => [
    node(
      'row',
      { controlInsets: 'trbl' },
      { children: [node('button', button)] },
    ),
  ];
  await dropSwapSeeds(page);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'content-swap',
        { transition: 'crossfade', active: 'a' },
        {
          a: side({ children: 'Show Details', action: 'content-swap-fade' }),
          b: side({
            children: 'Hide Details',
            action: 'content-swap-fade',
            tone: 'brand',
          }),
        },
      ),
    ),
  );
});

/** A root-level Text: its copy, a FieldSpec, and its builder-call css. */
type RootText = {
  readonly text: string;
  readonly spec?: FieldSpec;
  readonly css?: Readonly<Record<string, string>>;
};

/**
 * Places one Text per entry at the document's root, in order. A demo's
 * native `data-demo-copy` attribute is the Text's root data attribute.
 */
async function rootTexts(page: Page, texts: readonly RootText[]) {
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

// KF-AC7AFR: the paragraph's `lang` and `ariaLabel` are declared Text props;
// its native `data-demo-copy` attribute is a root data attribute here.
test('builds Text › Semantic Variants', async ({ page }) => {
  test.slow();
  const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
  const paragraph =
    'Paragraph text keeps native semantics and accepts ordinary global, data, and ARIA attributes.';
  await rootTexts(page, [
    ...headings.map((variant) => ({
      text: `Heading level ${variant.slice(1)}`,
      spec: { choices: { variant } },
    })),
    {
      text: paragraph,
      spec: {
        text: {
          id: 'text-demo-paragraph',
          lang: 'en',
          ariaLabel: 'Example Paragraph',
        },
        data: [['data-demo-copy', 'paragraph']],
      },
    },
  ]);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      ...headings.map((variant) =>
        textNode(`Heading level ${variant.slice(1)}`, { variant }),
      ),
      textNode(paragraph, {
        id: 'text-demo-paragraph',
        lang: 'en',
        ariaLabel: 'Example Paragraph',
        rootAttributes: { 'data-demo-copy': 'paragraph' },
      }),
    ),
  );
});

/**
 * KF-YBMVVM: adds a text run reading `value` to the `nth` `parent`'s zone,
 * after the nodes already in it.
 */
async function textRun(page: Page, parent: RegExp, nth: number, value: string) {
  await select(page, parent, nth);
  await addChild(page, 'Text run');
  const field = page.locator('[data-editor-text-run] input');
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

/** A `#text` run as the exported document spells it. */
const runNode = (value: string) => ({ type: '#text', value });

test('builds Text › Control Margins', async ({ page }) => {
  test.slow();
  const copy = [
    [
      'A paragraph aligned with neighboring content items.',
      'trbl',
      'margin-all',
    ],
    [
      'Horizontal margins keep the same text column without a vertical gutter.',
      'rl',
      'margin-horizontal',
    ],
  ] as const;
  const flushCopy =
    'Flush supporting copy retains the exterior control gutter.';
  await rootTexts(page, [
    ...copy.map(([text, sides, hook]) => ({
      text,
      spec: {
        choices: { controlMargins: sides },
        data: [['data-demo-copy', hook]] as [string, string][],
      },
    })),
    {
      text: flushCopy,
      spec: {
        choices: { controlMargins: 'rl' },
        flags: ['flush'],
        data: [['data-demo-copy', 'margin-flush']] as [string, string][],
      },
    },
    { text: 'Inline ' },
  ]);
  // The sentence: its text becomes a run, then the inline Text and the
  // run after it follow.
  await page.getByRole('button', { name: 'Use as nodes' }).click();
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { variant: 'span', controlMargins: 'rl' },
    text: { children: 'copy' },
    data: [['data-demo-copy', 'margin-inline']],
  });
  await textRun(page, /^Text(?![A-Z])/, 3, ' stays in its sentence.');
  // The runs keep their spaces on the canvas.
  await expect(canvas(page)).toContainText(
    'Inline copy stays in its sentence.',
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      ...copy.map(([text, sides, hook]) =>
        textNode(text, {
          controlMargins: sides,
          rootAttributes: { 'data-demo-copy': hook },
        }),
      ),
      textNode(flushCopy, {
        controlMargins: 'rl',
        flush: true,
        rootAttributes: { 'data-demo-copy': 'margin-flush' },
      }),
      node('text', undefined, {
        children: [
          runNode('Inline '),
          textNode('copy', {
            variant: 'span',
            controlMargins: 'rl',
            rootAttributes: { 'data-demo-copy': 'margin-inline' },
          }),
          runNode(' stays in its sentence.'),
        ],
      }),
    ),
  );
});

test('builds LucideIcon › Inline with Text', async ({ page }) => {
  await rootTexts(page, [
    {
      text: 'Notifications ',
      spec: { data: [['data-demo-icon-inline', '']] },
    },
  ]);
  await page.getByRole('button', { name: 'Use as nodes' }).click();
  await addChild(page, 'LucideIcon');
  await area(page, 'Properties');
  await pickIcon(page, page.locator('[data-editor-icon-place]'), 'bell');
  await applySpec(page, { text: { name: 'bell-inline' }, flags: ['inline'] });
  await textRun(page, /^Text(?![A-Z])/, 0, ' are ready.');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'text',
        { rootAttributes: { 'data-demo-icon-inline': '' } },
        {
          children: [
            runNode('Notifications '),
            icon('bell', { name: 'bell-inline', inline: true }),
            runNode(' are ready.'),
          ],
        },
      ),
    ),
  );
});

test('builds Text › Strong Emphasis', async ({ page }) => {
  await rootTexts(page, [
    {
      text: 'Release Notes',
      spec: { choices: { variant: 'span', weight: 'strong' } },
    },
    {
      text: 'Updated a moment ago',
      spec: { choices: { variant: 'span', tone: 'quiet', size: 'compact' } },
    },
  ]);
  expect(await exported(page)).toEqual(
    pane(
      textNode('Release Notes', { variant: 'span', weight: 'strong' }),
      textNode('Updated a moment ago', {
        variant: 'span',
        tone: 'quiet',
        size: 'compact',
      }),
    ),
  );
});

test('builds Text › Text Colors', async ({ page }) => {
  await rootTexts(page, [
    { text: 'Inherited foreground' },
    {
      text: 'Warning foreground',
      css: { color: "uiColor('warning-on-quiet')" },
    },
    {
      text: 'Application foreground',
      css: { color: "foregroundColor('rebeccapurple')" },
    },
    {
      text: 'Explicit color overrides tone',
      spec: { choices: { tone: 'danger' } },
      css: { color: "uiColor('text-quiet')" },
    },
  ]);
  expect(await exported(page)).toEqual(
    pane(
      textNode('Inherited foreground'),
      textNode('Warning foreground', {
        color: { $css: "uiColor('warning-on-quiet')" },
      }),
      textNode('Application foreground', {
        color: { $css: "foregroundColor('rebeccapurple')" },
      }),
      textNode('Explicit color overrides tone', {
        tone: 'danger',
        color: { $css: "uiColor('text-quiet')" },
      }),
    ),
  );
});

test('builds Text › Group Title', async ({ page }) => {
  const title =
    'Attachments from the March design review with the extended team';
  await rootTexts(page, [
    {
      text: title,
      spec: {
        choices: { variant: 'h3', size: 'medium' },
        data: [['data-demo-copy', 'medium-heading']],
      },
    },
  ]);
  expect(await exported(page)).toEqual(
    pane(
      textNode(title, {
        variant: 'h3',
        size: 'medium',
        rootAttributes: { 'data-demo-copy': 'medium-heading' },
      }),
    ),
  );
});

test('builds Text › Flush Dialog Copy', async ({ page }) => {
  await rootTexts(page, [
    {
      text: 'Compact supporting copy inside a dialog body.',
      spec: {
        choices: { lineHeight: 'tight' },
        flags: ['flush'],
        data: [['data-demo-copy', 'flush']],
      },
    },
  ]);
  expect(await exported(page)).toEqual(
    pane(
      textNode('Compact supporting copy inside a dialog body.', {
        flush: true,
        lineHeight: 'tight',
        rootAttributes: { 'data-demo-copy': 'flush' },
      }),
    ),
  );
});

test('builds Text › Centered Status Copy', async ({ page }) => {
  const status =
    'The terminal could not start. Check the shell path in settings, then try again.';
  await rootTexts(page, [
    {
      text: status,
      spec: {
        choices: { align: 'center', tone: 'quiet' },
        data: [['data-demo-copy', 'align-center']],
      },
    },
    {
      text: 'Total: 42 items',
      spec: {
        choices: { align: 'end' },
        data: [['data-demo-copy', 'align-end']],
      },
    },
  ]);
  expect(await exported(page)).toEqual(
    pane(
      textNode(status, {
        align: 'center',
        tone: 'quiet',
        rootAttributes: { 'data-demo-copy': 'align-center' },
      }),
      textNode('Total: 42 items', {
        align: 'end',
        rootAttributes: { 'data-demo-copy': 'align-end' },
      }),
    ),
  );
});

test('builds Text › Long Copy and Truncation', async ({ page }) => {
  test.slow();
  const id =
    'DOCUMENT-2026-OCTOBER-PROCUREMENT-VERY-LONG-UNBROKEN-REFERENCE-123456789';
  const summary =
    'A long summary can stop after two lines while retaining a useful preview of the original message. Additional detail stays available in the full record, and the summary keeps the surrounding layout compact.';
  const path =
    'src/components/navigation/application-tabs/internal/tab-overflow-menu.tsx';
  const branch = 'feature/kf-482-procurement-approval-routing-refactor';
  const hook = (value: string) => [['data-demo-copy', value]] as const;
  await rootTexts(page, [
    {
      text: id,
      spec: { choices: { wrap: 'anywhere' }, data: hook('anywhere') },
    },
    {
      text: summary,
      spec: {
        choices: { wrap: 'normal' },
        text: { maxLines: '2' },
        data: hook('capped'),
      },
    },
  ]);
  // A truncating name yields to a fixed price in a Row.
  await addInto(page, /^Pane/, 'Row');
  await applySpec(page, { choices: { gap: 'xs', controlInsets: 'rl' } });
  await textInto(
    page,
    /^Row/,
    'Acme International Procurement and Manufacturing Limited',
    0,
    {
      choices: { variant: 'span', wrap: 'truncate' },
      data: hook('truncate'),
    },
  );
  await textInto(page, /^Row/, '$129 / unit', 0, {
    choices: { variant: 'span', wrap: 'nowrap' },
    data: hook('price'),
  });
  for (const [text, spec] of [
    [
      'This status stays on one line.',
      { choices: { wrap: 'nowrap' }, data: hook('nowrap') },
    ],
    [
      path,
      {
        choices: { wrap: 'truncate', truncate: 'middle', font: 'monospace' },
        data: hook('truncate-middle'),
      },
    ],
    [
      branch,
      {
        choices: { wrap: 'truncate', truncate: 'start', font: 'monospace' },
        data: hook('truncate-start'),
      },
    ],
  ] as const) {
    await addInto(page, /^Pane/, 'Text');
    await applySpec(page, { ...spec, text: { children: text } });
  }
  const copy = (value: string) => ({
    rootAttributes: { 'data-demo-copy': value },
  });
  expect(await exported(page)).toEqual(
    pane(
      textNode(id, { wrap: 'anywhere', ...copy('anywhere') }),
      textNode(summary, { wrap: 'normal', maxLines: 2, ...copy('capped') }),
      node(
        'row',
        { gap: 'xs', controlInsets: 'rl' },
        {
          children: [
            textNode(
              'Acme International Procurement and Manufacturing Limited',
              {
                variant: 'span',
                wrap: 'truncate',
                ...copy('truncate'),
              },
            ),
            textNode('$129 / unit', {
              variant: 'span',
              wrap: 'nowrap',
              ...copy('price'),
            }),
          ],
        },
      ),
      textNode('This status stays on one line.', {
        wrap: 'nowrap',
        ...copy('nowrap'),
      }),
      textNode(path, {
        wrap: 'truncate',
        truncate: 'middle',
        font: 'monospace',
        ...copy('truncate-middle'),
      }),
      textNode(branch, {
        wrap: 'truncate',
        truncate: 'start',
        font: 'monospace',
        ...copy('truncate-start'),
      }),
    ),
  );
});

/** A LucideIcon's glyph, its name, and the rest of its setup. */
type IconSpec = {
  readonly glyph: string;
  readonly name: string;
  readonly spec?: FieldSpec;
  readonly css?: Readonly<Record<string, string>>;
};

/** Sets up the selected LucideIcon: its glyph, name, props and css. */
async function setupIcon(
  page: Page,
  { glyph, name, spec = {}, css = {} }: IconSpec,
) {
  await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
  await applySpec(page, { ...spec, text: { name, ...spec.text } });
  for (const [prop, value] of Object.entries(css))
    await setCss(page, prop, value);
}

/** One LucideIcon at the document's root. */
async function rootIcon(page: Page, icon: IconSpec) {
  await dragComponent(page, 'LucideIcon', () => emptySpot(page));
  await select(page, /^LucideIcon/);
  await setupIcon(page, icon);
}

/** A Row (gap m, data hook) of LucideIcons. */
async function iconRow(page: Page, hook: string, icons: readonly IconSpec[]) {
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await applySpec(page, { choices: { gap: 'm' }, data: [[hook, '']] });
  for (const entry of icons) {
    await addInto(page, /^Row/, 'LucideIcon');
    await setupIcon(page, entry);
  }
}

/** The LucideIcon node an IconSpec builds, given its other exported props. */
const iconNode = (
  { glyph, name }: IconSpec,
  props: Record<string, unknown> = {},
) => node('lucide-icon', { icon: { $icon: glyph }, name, ...props });

test('builds LucideIcon › Decorative', async ({ page }) => {
  const bell = { glyph: 'bell', name: 'bell' };
  await rootIcon(page, bell);
  expect(await exported(page)).toEqual(pane(iconNode(bell)));
});

test('builds LucideIcon › Meaningful', async ({ page }) => {
  const bell = {
    glyph: 'bell',
    name: 'notification',
    spec: { text: { label: 'Notifications Ready' } },
  };
  await rootIcon(page, bell);
  expect(await exported(page)).toEqual(
    pane(iconNode(bell, { label: 'Notifications Ready' })),
  );
});

test('builds LucideIcon › Status with Hover Text', async ({ page }) => {
  const bell = {
    glyph: 'bell',
    name: 'bell-status',
    spec: {
      choices: { size: 'l' },
      text: {
        label: 'Notifications Paused',
        title: 'Notifications resume at 9:00',
      },
    },
  };
  await rootIcon(page, bell);
  expect(await exported(page)).toEqual(
    pane(
      iconNode(bell, {
        label: 'Notifications Paused',
        title: 'Notifications resume at 9:00',
        size: 'l',
      }),
    ),
  );
});

test('builds LucideIcon › Icon Sizes', async ({ page }) => {
  const named = ['xs', 's', 'm', 'l', 'xl'].map((size) => ({
    glyph: 'bell',
    name: `bell-${size}`,
    spec: { choices: { size } },
  }));
  const thirty = {
    glyph: 'bell',
    name: 'bell-30',
    spec: { unions: { size: ['Number…', '30'] as const } },
  };
  await iconRow(page, 'data-demo-icon-sizes', [...named, thirty]);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', rootAttributes: { 'data-demo-icon-sizes': '' } },
        {
          children: [
            ...named.map((entry) =>
              iconNode(entry, { size: entry.spec.choices.size }),
            ),
            iconNode(thirty, { size: 30 }),
          ],
        },
      ),
    ),
  );
});

test('builds LucideIcon › Outline and Solid', async ({ page }) => {
  const outline = { glyph: 'star', name: 'star-outline' };
  const solid = {
    glyph: 'star',
    name: 'star-solid',
    spec: { choices: { appearance: 'solid' } },
  };
  await iconRow(page, 'data-demo-icon-appearance', [outline, solid]);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', rootAttributes: { 'data-demo-icon-appearance': '' } },
        {
          children: [
            iconNode(outline),
            iconNode(solid, { appearance: 'solid' }),
          ],
        },
      ),
    ),
  );
});

test('builds LucideIcon › Icon Colors', async ({ page }) => {
  const inherited = { glyph: 'bell', name: 'bell-inherited' };
  const warning = {
    glyph: 'bell',
    name: 'bell-warning',
    css: { color: "uiColor('warning-on-quiet')" },
  };
  const custom = {
    glyph: 'star',
    name: 'star-custom',
    spec: { choices: { appearance: 'solid' } },
    css: { color: "foregroundColor('rebeccapurple')" },
  };
  await iconRow(page, 'data-demo-icon-colors', [inherited, warning, custom]);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'm', rootAttributes: { 'data-demo-icon-colors': '' } },
        {
          children: [
            iconNode(inherited),
            iconNode(warning, {
              color: { $css: "uiColor('warning-on-quiet')" },
            }),
            iconNode(custom, {
              appearance: 'solid',
              color: { $css: "foregroundColor('rebeccapurple')" },
            }),
          ],
        },
      ),
    ),
  );
});

/** A root StateBanner set up by `spec`, with an icon and a pill Button. */
async function rootBanner(
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
  await unset(page, 'children');
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
async function dataAttribute(
  page: Page,
  name: string,
  value: string,
  index = 0,
) {
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

test('builds Workbench › Resizable Panels', async ({ page }) => {
  // Thirteen inspector rows, each named in the Inspector, outrun a slow
  // test's budget in Firefox.
  test.setTimeout(test.info().timeout * 8);
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
  test.setTimeout(test.info().timeout * 6);
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
    await unset(page, 'children');
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
    await unset(page, 'children');
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
  await expect(
    page.locator('[data-editor-prop="children"] :is(input, textarea)'),
  ).toHaveValue('FloatingToolbar');
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
  test.setTimeout(test.info().timeout * 8);
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

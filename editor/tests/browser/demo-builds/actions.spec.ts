// KF-JN4PF5: each ux-demo configuration of Button and SplitButton, built in
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
  select,
  setText,
  showDataAttributes,
  showProp,
  turnOn,
  unset,
} from '../build.js';
import type { ButtonSpec, FieldSpec, SplitSpec } from './helpers.js';
import {
  applySpec,
  bind,
  buttonNode,
  buttonNodes,
  buttonRow,
  buttonRowNode,
  buttons,
  insetButtonNodes,
  insetButtons,
  insetSplit,
  insetSplitNode,
  nameParam,
  promote,
  split,
  splitButtons,
  splitNode,
} from './helpers.js';

// They build documents rather than test motion, so the Inspector's NavStack
// pushes and pops skip their transitions (KF-QWDPM3: every field opens its
// group's page; WebKit on CI passed 60s on the longest builds).
test.use({ contextOptions: { reducedMotion: 'reduce' } });

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
  await showProp(page, 'icon');
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
  await showProp(page, 'icon');
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

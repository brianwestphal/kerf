// KF-JN4PF5: each ux-demo configuration of the toolbars, menus, and tabs, built in
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
  page as pane,
  pickIcon,
  select,
  setField,
  setText,
  showProp,
  turnOff,
  turnOn,
  unset,
  zoneSpot,
} from '../build.js';
import type { ChoiceSpec, FieldSpec, TabSpec } from './helpers.js';
import {
  addInto,
  applySpec,
  avatarGroup,
  bareToolbarText,
  buttonExample,
  buttonGroup,
  buttonGroupNode,
  choiceValues,
  choiceZones,
  configureChoices,
  configureSelect,
  dataAttribute,
  demoGroup,
  demoGroupNode,
  demoSection,
  demoSectionNode,
  editAsJson,
  groupSearch,
  iconButton,
  lonePopupMenu,
  menuIcons,
  menuIconZones,
  namedTabs,
  nameParam,
  openConfigure,
  OVERFLOW_NAMES,
  overflowToolbarText,
  pairTabs,
  plainTab,
  plainTabProps,
  promote,
  runNode,
  selectNode,
  setCss,
  sizedToolbarText,
  sortMenu,
  SPLIT_NAMES,
  tabBar,
  tabBarButton,
  tabBarGroup,
  tabBarGroupNode,
  tabBarNode,
  tabPanel,
  textInPlaceOfRun,
  textNode,
  tileTones,
  toneName,
  TOOLBAR,
  toolbar,
  toolbarButtonNode,
  valueTable,
  zoneGroup,
  zoneText,
} from './helpers.js';

// They build documents rather than test motion, so the Inspector's NavStack
// pushes and pops skip their transitions (KF-QWDPM3: every field opens its
// group's page; WebKit on CI passed 60s on the longest builds).
test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
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
  await showProp(page, 'icon');
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
  await inspectorOverview(page);
  await page.locator('[data-action="editor-delete"]').click();
  await select(page, /^ToolbarControlGroup/);
  await addChild(page, 'PopupMenu');
  await select(page, /^PopupMenu/);
  await setText(page, 'label', 'Sort Tickets');
  // An icon-only trigger: a label, no seeded text.
  await unset(page, 'text');
  await showProp(page, 'icon');
  await page.locator('[data-editor-content-add="icon"]').click();
  await showProp(page, 'icon');
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('arrow down a z');
  await expect(page.locator('[data-editor-icon]')).toHaveCount(2);
  await page.locator('[data-editor-icon="arrow-down-a-z"]').click();
  await select(page, /^PopupMenu/);
  await openConfigure(page, 'Configure items');
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

test('builds ToolbarText › Ellipsis (Default)', ({ page }) =>
  overflowToolbarText(page, false));

test('builds ToolbarText › Wrap', ({ page }) =>
  overflowToolbarText(page, true));

test('builds ToolbarText › Wrap, Capped to 2 Lines', ({ page }) =>
  overflowToolbarText(page, true, '2'));

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

// KF-RE1EBK: reportTabActive starts as 'overview', so the History panel is
// hidden with the unavailable report's. Each panel is a TabPanel named by
// its tab, holding a Text.
test('builds ApplicationTabs › Named Disabled Tab', async ({ page }) => {
  test.slow();
  const reports = [
    ['overview', 'Overview', 'Overview report'],
    ['loading', 'Preparing Report', 'Report unavailable'],
    ['history', 'History', 'Report history'],
  ] as const;
  const extra = (id: string) => ({
    selectAction: 'select-report-tab',
    tabId: `report-${id}-tab`,
    panelId: `report-${id}-panel`,
  });
  const tabs = reports.map(
    ([id, name], index) =>
      [
        plainTab(id, name, index === 0, {
          text: extra(id),
          flags: id === 'loading' ? ['disabled'] : [],
        }),
        plainTabProps(id, name, index === 0, {
          ...extra(id),
          ...(id === 'loading' ? { disabled: true } : {}),
        }),
      ] as const,
  );
  const bar = { id: 'catalog-disabled-tabs', label: 'Report Tabs' };
  await tabBar(
    page,
    { choices: { activation: 'manual' }, text: bar },
    tabs.map(([spec]) => spec),
  );
  for (const [index, [id, , copy]] of reports.entries()) {
    await tabPanel(page, /^Pane/, `report-${id}-panel`, `report-${id}-tab`, {
      hidden: index > 0,
    });
    await addInto(page, /^TabPanel/, 'Text', index);
    await setText(page, 'children', copy);
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  const panels = canvas(page).locator('[role="tabpanel"]');
  await expect(panels).toHaveCount(3);
  await expect(canvas(page).locator('#report-overview-panel')).toHaveAttribute(
    'aria-labelledby',
    'report-overview-tab',
  );
  await expect(
    canvas(page).locator('#report-overview-tab[role="tab"]'),
  ).toHaveAttribute('aria-controls', 'report-overview-panel');
  expect(await exported(page)).toEqual(
    pane(
      tabBarNode(
        { ...bar, activation: 'manual' },
        tabs.map(([spec, props]) => [props, spec]),
      ),
      ...reports.map(([id, , copy], index) =>
        node(
          'tab-panel',
          {
            id: `report-${id}-panel`,
            tabId: `report-${id}-tab`,
            ...(index > 0 ? { hidden: true } : {}),
          },
          { children: [textNode(copy)] },
        ),
      ),
    ),
  );
});

// KF-RE1EBK: a first-render snapshot of the demo. tabBarActive starts as
// 'components' and no tab is pending, so the one TabPanel shows the
// Components heading without aria-busy. The footer's order readout is a
// strong span Text inside the quiet Text, beside an "Order: " run.
test('builds ApplicationTabs › Reorderable Application Tabs', async ({
  page,
}) => {
  test.slow();
  const tabs = [
    ['components', 'Components'],
    ['design-guidance', 'Design Guidance'],
    ['accessibility', 'Accessibility Contracts'],
    ['integration', 'Integration Patterns'],
    ['release-notes', 'Release Notes'],
    ['migration', 'Hot Sheet Migration'],
    ['examples', 'Consumer Examples'],
  ] as const;
  const shared = {
    panelId: 'catalog-active-panel',
    selectAction: 'select-reorder-tab',
    closeAction: 'close-reorder-tab',
  };
  // The demo's frame: the root Pane, not filled, with its test hook.
  await select(page, /^Pane/);
  await turnOff(page, 'fill');
  await dataAttribute(page, 'data-demo-application-tabs-frame', '');
  await select(page, /^Pane/);
  await addChild(page, 'TabBar', 'header');
  await area(page, 'Properties');
  const bar = { id: 'catalog-tabs', label: 'Open Catalog Pages' };
  await applySpec(page, { text: bar });
  // The TabBar arrives holding one tab: set up its shared props, then copy it.
  await select(page, /^TabBarItem/);
  await applySpec(page, { flags: ['draggable'], text: shared });
  await select(page, /^TabBarItem/);
  for (let copy = 1; copy < tabs.length; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  for (const [index, [id, name]] of tabs.entries()) {
    await select(page, /^TabBarItem/, index);
    if (index === 0) await turnOn(page, 'selected');
    await applySpec(page, {
      text: { id, name, tabId: `catalog-tab-${id}` },
      data: [['data-demo-tab-id', id]],
    });
  }
  await tabBarGroup(
    page,
    'leading',
    { text: { ariaLabel: 'Show Navigation', action: 'log-sidebar' } },
    'panel-left',
  );
  await tabBarGroup(
    page,
    'trailing',
    { text: { ariaLabel: 'Add Tab', action: 'add-demo-tab' } },
    'plus',
  );
  // The panel: a TabPanel holding the inset h3 heading.
  await tabPanel(
    page,
    /^Pane/,
    'catalog-active-panel',
    'catalog-tab-components',
    {
      zone: 'content',
    },
  );
  await addInto(page, /^TabPanel/, 'ListInsetText');
  await textInPlaceOfRun(page);
  await applySpec(page, {
    choices: { variant: 'h3' },
    text: { children: 'components' },
  });
  // The footer: a quiet compact Text whose order readout is a strong Text.
  const order = tabs.map(([, name]) => name).join(' · ');
  await select(page, /^Pane/);
  await addChild(page, 'ListInsetText', 'footer');
  await textInPlaceOfRun(page);
  await applySpec(page, {
    choices: { tone: 'quiet', size: 'compact' },
    text: { children: 'Order: ' },
  });
  await showProp(page, 'children');
  await page.getByRole('button', { name: 'Use as nodes' }).click();
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { variant: 'span', weight: 'strong' },
    text: { children: order },
    data: [['data-tab-order', '']],
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  await expect(canvas(page).locator('[data-tab-order]')).toHaveText(order);
  const panel = canvas(page).locator('#catalog-active-panel');
  await expect(panel).toHaveAttribute('role', 'tabpanel');
  await expect(panel).toHaveAttribute(
    'aria-labelledby',
    'catalog-tab-components',
  );
  await expect(panel).not.toHaveAttribute('aria-busy');
  await expect(panel.locator('h3')).toHaveText('components');
  const tabNode = ([id, name]: (typeof tabs)[number], index: number) =>
    node('tabs', {
      id,
      name,
      ...(index === 0 ? { selected: true } : {}),
      draggable: true,
      tabId: `catalog-tab-${id}`,
      ...shared,
      rootAttributes: { 'data-demo-tab-id': id },
    });
  expect(await exported(page)).toEqual(
    node(
      'pane',
      { rootAttributes: { 'data-demo-application-tabs-frame': '' } },
      {
        header: [
          node('tab-bar', bar, {
            tabs: tabs.map(tabNode),
            leading: [
              tabBarGroupNode(
                { ariaLabel: 'Show Navigation', action: 'log-sidebar' },
                'panel-left',
              ),
            ],
            trailing: [
              tabBarGroupNode(
                { ariaLabel: 'Add Tab', action: 'add-demo-tab' },
                'plus',
              ),
            ],
          }),
        ],
        content: [
          node(
            'tab-panel',
            { id: 'catalog-active-panel', tabId: 'catalog-tab-components' },
            {
              children: [
                node('list-inset-text', undefined, {
                  children: [textNode('components', { variant: 'h3' })],
                }),
              ],
            },
          ),
        ],
        footer: [
          node('list-inset-text', undefined, {
            children: [
              node(
                'text',
                { tone: 'quiet', size: 'compact' },
                {
                  children: [
                    runNode('Order: '),
                    textNode(order, {
                      variant: 'span',
                      weight: 'strong',
                      rootAttributes: { 'data-tab-order': '' },
                    }),
                  ],
                },
              ),
            ],
          }),
        ],
      },
    ),
  );
});

test('builds Headers › Page and Panel Headings', async ({ page }) => {
  test.slow();
  const rows = [
    ['Package', '@kerfjs/ui'],
    ['Rendering', 'Kerf SafeHtml'],
    ['Styles', 'Explicit CSS subpaths'],
  ] as const;
  /** A borderless single group in toolbar `nth`'s trailing zone. */
  const trailingAction = async (nth: number, label: string, action: string) => {
    await zoneGroup(
      page,
      'trailing',
      { choices: { appearance: 'borderless' }, flags: ['single'] },
      { nth, keepButton: true },
    );
    await select(page, /^ToolbarButton/, -1);
    await applySpec(page, { text: { children: label, action } });
  };
  await dragComponent(page, 'List', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'none');
  // The page heading.
  await addInto(page, /^List/, 'Toolbar');
  await setText(page, 'label', 'UI Foundations');
  await zoneText(page, 'leading', {
    choices: { size: 'xlarge', headingLevel: '1' },
    text: { text: 'UI Foundations', id: 'headers-page-title' },
  });
  await trailingAction(0, 'New Pattern', 'log-add');
  // The panel heading, with an icon tile before its title.
  await addInto(page, /^List/, 'Toolbar');
  await setText(page, 'label', 'Package Details');
  await zoneGroup(
    page,
    'leading',
    { choices: { appearance: 'borderless' }, flags: ['single'] },
    { nth: 1 },
  );
  await addInto(page, /^ToolbarControlGroup/, 'LucideIcon', 1);
  await area(page, 'Properties');
  await pickIcon(page, page.locator('[data-editor-icon-place]'), 'wrench');
  await zoneText(
    page,
    'leading',
    {
      choices: { size: 'xlarge' },
      text: { text: 'Package Details', id: 'headers-panel-title' },
    },
    1,
  );
  await trailingAction(1, 'Done', 'log-done');
  await addInto(page, /^List/, 'ListInsetText');
  await area(page, 'Properties');
  await choose(page, 'sides', 'rl');
  await setText(
    page,
    'children',
    'Production-backed primitives with explicit contracts.',
  );
  await addInto(page, /^List/, 'ValueTable');
  await valueTable(
    page,
    { text: { label: 'Package Metadata' } },
    rows.map(([label, value]) => ({ text: { label, value } })),
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  const action = (label: string, actionName: string) =>
    node(
      'toolbar-control-group',
      { appearance: 'borderless', single: true },
      {
        children: [
          node('toolbar-control-group#ToolbarButton', {
            children: label,
            action: actionName,
          }),
        ],
      },
    );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'none' },
        {
          children: [
            node(
              'toolbar',
              { label: 'UI Foundations' },
              {
                leading: [
                  node('toolbar-text', {
                    text: 'UI Foundations',
                    size: 'xlarge',
                    headingLevel: 1,
                    id: 'headers-page-title',
                  }),
                ],
                trailing: [action('New Pattern', 'log-add')],
              },
            ),
            node(
              'toolbar',
              { label: 'Package Details' },
              {
                leading: [
                  node(
                    'toolbar-control-group',
                    { appearance: 'borderless', single: true },
                    { children: [icon('wrench')] },
                  ),
                  node('toolbar-text', {
                    text: 'Package Details',
                    size: 'xlarge',
                    id: 'headers-panel-title',
                  }),
                ],
                trailing: [action('Done', 'log-done')],
              },
            ),
            node('list-inset-text', {
              sides: 'rl',
              children: 'Production-backed primitives with explicit contracts.',
            }),
            node(
              'value-table',
              { label: 'Package Metadata' },
              {
                children: rows.map(([label, value]) =>
                  node('value-table#ValueTableRow', { label, value }),
                ),
              },
            ),
          ],
        },
      ),
    ),
  );
});

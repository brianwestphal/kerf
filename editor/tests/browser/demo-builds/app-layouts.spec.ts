// KF-JN4PF5: each ux-demo configuration of the app layouts and dialog surfaces, built in
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
  showProp,
  sized,
  turnFieldOn,
  turnOn,
  unset,
  zoneSpot,
} from '../build.js';
import {
  addInto,
  applySpec,
  atlasDetails,
  atlasDetailsNode,
  back,
  backOut,
  CHAT,
  closeButton,
  columnTitles,
  configure,
  css,
  dataAttribute,
  deleteSelected,
  demoContentItem,
  demoTexts,
  describedText,
  describedTextNode,
  DIALOG,
  dialogComposer,
  dialogComposerNode,
  dialogRail,
  dialogRailProps,
  dialogSurface,
  dialogTrigger,
  dialogTriggerNode,
  editAsJson,
  expectShown,
  iconGroup,
  iconGroupNode,
  inbox,
  inboxNodes,
  insetField,
  insetTextList,
  insetTextListNode,
  LAYERS,
  LDD_DETAIL_COPY,
  LDD_PROJECTS,
  LIST_DETAIL_DIALOG,
  messageDetail,
  messageDetailNode,
  messageItems,
  messageRows,
  MESSAGES,
  openConfigure,
  openField,
  panel,
  panelToolbar,
  projectColumn,
  projectColumnNode,
  projectSplit,
  projectSplitNode,
  READER_COPY,
  READER_ITEMS,
  READERS,
  resizablePanel,
  setCss,
  THREAD,
  TOOLBAR,
  toolbarText,
  toolbarTextNode,
  toolbarTrigger,
  toolbarTriggerNode,
  transcript,
  transcriptNode,
  valueRow,
  valueTable,
  workArea,
  workAreaNode,
  workbench,
  WORKBENCH_DIALOG,
  zoneButtons,
  zoneText,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
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
  await openConfigure(page, 'Configure tabs');
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
    await openConfigure(page, 'Configure tabs');
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
  await openConfigure(page, 'Configure tabs');
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
    await openConfigure(page, 'Configure tabs');
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
  await openConfigure(page, 'Configure views');
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
  await showProp(page, 'trailing');
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
    await openConfigure(page, 'Configure views');
    await dialog.locator('[data-action="editor-open-field"]').first().click();
    for (const row of rows)
      await dialog.getByText(row, { exact: true }).click();
  };
  // The demo's stack starts from one view: the library.
  await openConfigure(page, 'Configure views');
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
  await showProp(page, 'trailing');
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
  await openConfigure(page, 'Configure toolbar config');
  await chooseField(page, 'toolbarConfig', ['headingLevel'], '2');
  await chooseField(page, 'toolbarConfig', ['dividerSides'], 'b');
  // A form this small opens in the Inspector; its back button returns.
  await page
    .locator('#editor-inspector-stack')
    .getByRole('button', { name: 'Back' })
    .click();
  await openConfigure(page, 'Configure views');
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
    await openConfigure(page, 'Configure views');
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
  await openConfigure(page, 'Configure bottom toolbar');
  await setField(page, 'bottomToolbar', ['label'], 'Inbox Actions');
  await stack.getByRole('button', { name: 'Back' }).click();
  const bottomZone = async (zone: string, component: string) => {
    await select(page, /^NavStack/);
    await openConfigure(page, 'Configure bottom toolbar');
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
  await openConfigure(page, 'Configure views');
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
    await openConfigure(page, 'Configure views');
    await dialog.locator('[data-action="editor-open-field"]').first().click();
    for (const row of rows)
      await dialog.getByText(row, { exact: true }).click();
  };
  // One view, the message list, whose Pane declares its compact chrome: the
  // filter header lies over the list until opened, the status footer
  // scrolls with it.
  await openConfigure(page, 'Configure views');
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
  await openConfigure(page, 'Configure items');
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
  await openConfigure(page, 'Configure list width');
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
  await inspectorOverview(page);
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
  await inspectorOverview(page);
  await page.locator('[data-action="editor-delete"]').click();
  await select(page, /^Text/);
  await inspectorOverview(page);
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
  await openConfigure(page, 'Configure resizable');
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
  await inspectorOverview(page);
  await page.locator('[data-action="editor-delete"]').click();
  await messageDetail(page);
  // The restore control: a FloatingToolbar docked in the corner, holding
  // the button that shows the threads again.
  await select(page, /^SplitView/);
  await openConfigure(page, 'Configure resizable');
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
  await showProp(page, 'children');
  await expect(
    page.locator('[data-editor-prop="children"] :is(input, textarea)'),
  ).toHaveValue('FloatingToolbar');
  await inspectorOverview(page);
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
  await openConfigure(page, 'Configure tabs');
  await dialog.getByRole('button', { name: 'Remove Tab 3' }).click();
  for (const [index, [id, label, , glyph]] of sections.entries()) {
    await item(index);
    await setField(page, 'tabs', [index, 'id'], id);
    await setField(page, 'tabs', [index, 'label'], label);
    // The tab's Icon row adds a LucideIcon and selects it.
    await dialog.getByText('Icon', { exact: true }).click();
    await pickIcon(page, page.locator('[data-editor-icon-place]'), glyph);
    await select(page, /^TabNavigator/);
    await openConfigure(page, 'Configure tabs');
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

test('builds SurfaceScaffold › Medium Dialog', async ({ page }) => {
  const id = 'catalog-medium-dialog';
  const copy = 'Dialog content uses list-owned item geometry.';
  await dialogTrigger(page, 'Open Dialog', id);
  await dialogSurface(page, {
    choices: {
      closeEmphasis: 'quiet',
      size: 'medium',
      presentation: 'modal',
      bodyInset: 'none',
      footerInset: 'comfortable',
    },
    text: { id, label: 'Edit Workspace' },
  });
  await insetTextList(page, DIALOG, [copy]);
  await zoneButtons(page, DIALOG, 'footer', [
    { text: { children: 'Cancel' }, close: true },
    { choices: { tone: 'brand' }, text: { children: 'Save' }, close: true },
  ]);
  await expectShown(page, id, ['Close', 'Cancel', 'Save']);
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Open Dialog', id),
      node(
        'surface-scaffold',
        {
          id,
          label: 'Edit Workspace',
          closeEmphasis: 'quiet',
          size: 'medium',
          presentation: 'modal',
          bodyInset: 'none',
          footerInset: 'comfortable',
        },
        {
          children: [insetTextListNode([copy])],
          footer: [
            closeButton('Cancel'),
            closeButton('Save', { tone: 'brand' }),
          ],
        },
      ),
    ),
  );
});

// KF-R7MSPP: the same panel as the modal dialog, authored embedded.
test('builds SurfaceScaffold › Embedded Dialog', async ({ page }) => {
  const id = 'catalog-embedded-dialog';
  const copy = 'The same panel as the modal dialog, shown where it sits.';
  await dialogSurface(page, {
    choices: { size: 'small', presentation: 'embedded' },
    text: { id, label: 'Edit Workspace' },
  });
  await insetTextList(page, DIALOG, [copy]);
  await zoneButtons(page, DIALOG, 'footer', [
    { text: { children: 'Cancel' }, close: true },
    { choices: { tone: 'brand' }, text: { children: 'Save' }, close: true },
  ]);
  await expectShown(page, id, ['Close', 'Cancel', 'Save']);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'surface-scaffold',
        {
          id,
          label: 'Edit Workspace',
          size: 'small',
          presentation: 'embedded',
        },
        {
          children: [insetTextListNode([copy])],
          footer: [
            closeButton('Cancel'),
            closeButton('Save', { tone: 'brand' }),
          ],
        },
      ),
    ),
  );
});

test('builds SurfaceScaffold › Viewport-Bounded Modal', async ({ page }) => {
  const id = 'catalog-bounded-dialog';
  const summary =
    'Closing this workspace stops its running tasks. Saved files remain available when you reopen it.';
  const review =
    'Review your changes before stopping the workspace. Unsaved terminal output will be lost.';
  await dialogTrigger(page, 'Open Bounded Dialog', id);
  await dialogSurface(
    page,
    {
      choices: { size: 'large', maxHeight: 'viewport', bodyInset: 'none' },
      text: {
        id,
        label: 'Close Workspace',
        describedBy: `${id}-summary`,
      },
    },
    { preferredWidth: 'rem(52)', viewportGutter: 'rem(0.5)' },
  );
  await addInto(page, DIALOG, 'List', 0, 0);
  await describedText(page, /^List(?![A-Z])/, summary, `${id}-summary`);
  await addInto(page, /^List(?![A-Z])/, 'ListInsetText');
  await setText(page, 'children', review);
  await zoneButtons(page, DIALOG, 'footer', [
    { text: { children: 'Keep Working' }, close: true },
    {
      choices: { tone: 'brand' },
      text: { children: 'Stop and Close' },
      close: true,
    },
  ]);
  await expectShown(page, id, ['Close', 'Keep Working', 'Stop and Close']);
  await expect(canvas(page).locator(`dialog#${id}`)).toHaveAttribute(
    'aria-describedby',
    `${id}-summary`,
  );
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Open Bounded Dialog', id),
      node(
        'surface-scaffold',
        {
          id,
          label: 'Close Workspace',
          describedBy: `${id}-summary`,
          size: 'large',
          preferredWidth: css('rem(52)'),
          viewportGutter: css('rem(0.5)'),
          maxHeight: 'viewport',
          bodyInset: 'none',
        },
        {
          children: [
            node('list', undefined, {
              children: [
                describedTextNode(summary, `${id}-summary`),
                node('list-inset-text', { children: review }),
              ],
            }),
          ],
          footer: [
            closeButton('Keep Working'),
            closeButton('Stop and Close', { tone: 'brand' }),
          ],
        },
      ),
    ),
  );
});

test('builds SurfaceScaffold › Alert Dialog', async ({ page }) => {
  const id = 'catalog-alert-dialog';
  const message = 'Delete this topic? Its saved stories are removed too.';
  await dialogTrigger(page, 'Delete Topic', id, {
    choices: { tone: 'danger' },
  });
  await dialogSurface(page, {
    choices: { size: 'small' },
    flags: ['alert'],
    text: { id, label: 'Delete Topic', describedBy: `${id}-message` },
  });
  // The ListInsetText takes the seeded body Text's place.
  await select(page, /^Text(?![A-Z])/);
  await deleteSelected(page);
  await describedText(page, DIALOG, message, `${id}-message`);
  await zoneButtons(page, DIALOG, 'footer', [
    { text: { children: 'Cancel' }, close: true },
    { choices: { tone: 'danger' }, text: { children: 'Delete' }, close: true },
  ]);
  await expectShown(page, id, ['Close', 'Cancel', 'Delete']);
  await expect(canvas(page).locator(`dialog#${id}`)).toHaveAttribute(
    'role',
    'alertdialog',
  );
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Delete Topic', id, { tone: 'danger' }),
      node(
        'surface-scaffold',
        {
          id,
          label: 'Delete Topic',
          alert: true,
          describedBy: `${id}-message`,
          size: 'small',
        },
        {
          children: [describedTextNode(message, `${id}-message`)],
          footer: [
            closeButton('Cancel'),
            closeButton('Delete', { tone: 'danger' }),
          ],
        },
      ),
    ),
  );
});

test('builds SurfaceScaffold › Capped Modal', async ({ page }) => {
  test.slow();
  const id = 'catalog-capped-dialog';
  const copy = [
    'Saved files remain available.',
    'Running tasks will stop.',
    'Terminal sessions will close.',
    'Unsaved output will be lost.',
    'Background synchronization will stop.',
    'Reopen the workspace to resume your work.',
  ];
  await dialogTrigger(page, 'Open Capped Dialog', id);
  await dialogSurface(
    page,
    {
      choices: { bodyInset: 'none' },
      text: { id, label: 'Review Workspace Changes' },
    },
    {
      preferredWidth: 'rem(30)',
      viewportGutter: 'rem(0.5)',
      maxHeight: 'rem(22.5)',
    },
  );
  await insetTextList(page, DIALOG, copy);
  await zoneButtons(page, DIALOG, 'footer', [
    { text: { children: 'Cancel Review' }, close: true },
  ]);
  await expectShown(page, id, ['Close', 'Cancel Review']);
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Open Capped Dialog', id),
      node(
        'surface-scaffold',
        {
          id,
          label: 'Review Workspace Changes',
          preferredWidth: css('rem(30)'),
          viewportGutter: css('rem(0.5)'),
          maxHeight: css('rem(22.5)'),
          bodyInset: 'none',
        },
        {
          children: [insetTextListNode(copy)],
          footer: [closeButton('Cancel Review')],
        },
      ),
    ),
  );
});

test('builds SurfaceScaffold › Resizable Bottom Sheet', async ({ page }) => {
  test.slow();
  const id = 'catalog-sheet-dialog';
  await dialogTrigger(page, 'Open New Message', id);
  await dialogSurface(
    page,
    {
      choices: { presentation: 'bottom-sheet', bodyInset: 'none' },
      flags: ['lightDismiss', 'resizable'],
      text: { id, label: 'New Message' },
    },
    { minHeight: 'rem(12.5)' },
  );
  await addInto(page, DIALOG, 'List', 0, 0);
  await insetField(page, { text: { label: 'To', name: 'catalog-sheet-to' } });
  await insetField(page, {
    text: { label: 'Subject', name: 'catalog-sheet-subject' },
  });
  await insetField(page, {
    flags: ['multiline'],
    text: { label: 'Message', name: 'catalog-sheet-message', rows: '4' },
  });
  await expect(
    canvas(page).locator(`dialog#${id}`).locator('.kui-text-field'),
  ).toHaveCount(3);
  const field = (props: Record<string, unknown>) =>
    node('list-inset-control', undefined, {
      children: [node('text-field', props)],
    });
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Open New Message', id),
      node(
        'surface-scaffold',
        {
          id,
          label: 'New Message',
          lightDismiss: true,
          presentation: 'bottom-sheet',
          minHeight: css('rem(12.5)'),
          resizable: true,
          bodyInset: 'none',
        },
        {
          children: [
            node('list', undefined, {
              children: [
                field({ label: 'To', name: 'catalog-sheet-to' }),
                field({ label: 'Subject', name: 'catalog-sheet-subject' }),
                field({
                  multiline: true,
                  label: 'Message',
                  name: 'catalog-sheet-message',
                  rows: 4,
                }),
              ],
            }),
          ],
        },
      ),
    ),
  );
});

// The core sheets open from `kerfjs/overlay` calls in the demo's action
// handlers; the view holds their triggers, each group in a plain Toolbar
// (KF-0W87ST: a bare demo specimen is wrapped in one).
test('builds SurfaceScaffold › Core Dialog as a Bottom Sheet', async ({
  page,
}) => {
  const label = 'Core Dialog as a Bottom Sheet';
  const button = { children: 'Discard Draft', action: 'open-overlay-sheet' };
  await toolbarTrigger(page, label, { text: button });
  expect(await exported(page)).toEqual(pane(toolbarTriggerNode(label, button)));
});

test('builds SurfaceScaffold › Resizable Core Sheet', async ({ page }) => {
  const label = 'Resizable Core Sheet';
  const button = { children: 'Show Up Next', action: 'open-up-next-sheet' };
  await toolbarTrigger(page, label, { text: button });
  expect(await exported(page)).toEqual(pane(toolbarTriggerNode(label, button)));
});

test('builds SurfaceScaffold › Zero-Inset List Popup', async ({ page }) => {
  const items = [{ label: 'Inbox' }, { label: 'Archive' }];
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

test('builds SurfaceScaffold › Chat Dialog', async ({ page }) => {
  test.setTimeout(test.info().timeout * 4);
  const id = 'catalog-chat-dialog';
  const notice = 'Answers use the latest nightly build.';
  await dialogTrigger(page, 'Open Assistant', id);
  await dialogSurface(
    page,
    {
      choices: {
        bodyInset: 'none',
        bodyLayout: 'fill-last',
        footerPresentation: 'floating',
        footerInset: 'none',
      },
      text: { id, label: 'Assistant' },
    },
    { viewportGutter: 'rem(0.5)', height: 'rem(35)', footerOffset: 'rem(0.5)' },
  );
  // The notice takes the seeded body Text's place.
  await addInto(page, DIALOG, 'StateBanner', 0, 0);
  await select(page, /^StateBanner/);
  await applySpec(page, {
    choices: { tone: 'neutral' },
    text: { title: notice },
  });
  await dialogComposer(page, 'catalog-chat-message', 'Ask about this build');
  await transcript(page, 'block-end', CHAT);
  await expectShown(page, id, ['Close', 'Send']);
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Open Assistant', id),
      node(
        'surface-scaffold',
        {
          id,
          label: 'Assistant',
          viewportGutter: css('rem(0.5)'),
          height: css('rem(35)'),
          bodyInset: 'none',
          bodyLayout: 'fill-last',
          footerPresentation: 'floating',
          footerOffset: css('rem(0.5)'),
          footerInset: 'none',
        },
        {
          children: [
            node('state-banner', { title: notice, tone: 'neutral' }),
            transcriptNode('block-end', CHAT),
          ],
          footer: [
            dialogComposerNode('catalog-chat-message', 'Ask about this build'),
          ],
        },
      ),
    ),
  );
});

test('builds SurfaceScaffold › Floating Title Bar', async ({ page }) => {
  test.setTimeout(test.info().timeout * 4);
  const id = 'catalog-thread-dialog';
  const description = 'Engineering · 5.2 candidate';
  await dialogTrigger(page, 'Open Release Thread', id);
  await dialogSurface(
    page,
    {
      choices: {
        bodyInset: 'none',
        bodyLayout: 'fill',
        headerPresentation: 'floating',
        footerPresentation: 'floating',
        footerInset: 'none',
      },
      text: {
        id,
        label: 'Release Thread',
        describedBy: `${id}-description`,
      },
    },
    { viewportGutter: 'rem(0.5)', height: 'rem(35)', footerOffset: 'rem(0.5)' },
  );
  // The transcript is the body's one child.
  await select(page, /^Text(?![A-Z])/);
  await deleteSelected(page);
  await select(page, DIALOG);
  await addChild(page, 'ToolbarText', 'heading');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'xlarge' },
    text: {
      text: 'Release Thread',
      description,
      descriptionId: `${id}-description`,
    },
  });
  await dialogComposer(page, 'catalog-thread-message', 'Reply to the thread');
  await transcript(page, 'both', THREAD);
  await expectShown(page, id, ['Close', 'Send']);
  await expect(canvas(page).locator(`#${id}-description`)).toHaveText(
    description,
  );
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Open Release Thread', id),
      node(
        'surface-scaffold',
        {
          id,
          label: 'Release Thread',
          describedBy: `${id}-description`,
          viewportGutter: css('rem(0.5)'),
          height: css('rem(35)'),
          bodyInset: 'none',
          bodyLayout: 'fill',
          headerPresentation: 'floating',
          footerPresentation: 'floating',
          footerOffset: css('rem(0.5)'),
          footerInset: 'none',
        },
        {
          children: [transcriptNode('both', THREAD)],
          heading: [
            node('toolbar-text', {
              text: 'Release Thread',
              size: 'xlarge',
              description,
              descriptionId: `${id}-description`,
            }),
          ],
          footer: [
            dialogComposerNode('catalog-thread-message', 'Reply to the thread'),
          ],
        },
      ),
    ),
  );
});

test('builds WorkbenchDialog › Edit Slide', async ({ page }) => {
  test.setTimeout(test.info().timeout * 4);
  const id = 'workbench-dialog-demo';
  const select_ = 'select-workbench-dialog-layer';
  await dialogTrigger(page, 'Edit Slide', id);
  await addInto(page, /^Pane/, 'WorkbenchDialog');
  await select(page, WORKBENCH_DIALOG);
  await applySpec(page, {
    text: {
      id,
      label: 'Edit Slide',
      title: 'Edit Slide',
      description: 'Slide 3 of 12',
    },
  });
  await setCss(page, 'viewportGutter', 'rem(0.5)');
  await setCss(page, 'height', 'rem(32.5)');
  await setCss(page, 'preferredWidth', 'rem(60)');
  await workArea(page, 'The slide canvas goes here. Hero Image is selected.');
  // The bottom toolbar's trailing Row of Cancel and Save Slide.
  await select(page, WORKBENCH_DIALOG);
  await configure(page, 'mainBottomToolbar');
  await setField(page, 'mainBottomToolbar', ['label'], 'Slide Actions');
  await page
    .locator('[data-editor-content-add="mainBottomToolbar.trailing"]')
    .click();
  await addChild(page, 'Row');
  await area(page, 'Properties');
  await applySpec(page, { choices: { hAlign: 'right', gap: 'xs' } });
  await zoneButtons(page, /^Row/, 'children', [
    {
      choices: { emphasis: 'secondary' },
      text: { children: 'Cancel' },
      close: true,
    },
    {
      choices: { tone: 'brand' },
      text: { children: 'Save Slide', action: 'log-more' },
    },
  ]);
  await dialogRail(
    page,
    'leftRail',
    'Layers',
    200,
    'toggle-workbench-dialog-layers',
    0,
  );
  for (const [itemId, label, kind] of LAYERS) {
    await addInto(page, /^List(?![A-Z])/, 'ListItem', 0);
    await applySpec(page, {
      flags: itemId === 'hero' ? ['selected'] : [],
      text: { label, description: kind, itemId, action: select_ },
    });
  }
  await dialogRail(
    page,
    'rightRail',
    'Inspector',
    220,
    'toggle-workbench-dialog-inspector',
    1,
  );
  await addInto(page, /^List(?![A-Z])/, 'ValueTable', 1);
  await valueTable(page, { text: { label: 'Layer Details' } }, [
    valueRow('Name', 'Hero Image')[0],
    valueRow('Kind', 'Image')[0],
    valueRow('Size', '1280 × 720')[0],
  ]);
  await select(page, WORKBENCH_DIALOG);
  const shown = canvas(page).locator(`#${id}`);
  await expect(shown).toBeVisible();
  await expect(shown.locator('.kui-list-item')).toHaveCount(LAYERS.length);
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-jkvdka-workbench-dialog-1440.png'),
  });
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Edit Slide', id),
      node(
        'workbench-dialog',
        {
          id,
          label: 'Edit Slide',
          title: 'Edit Slide',
          description: 'Slide 3 of 12',
          viewportGutter: css('rem(0.5)'),
          height: css('rem(32.5)'),
          preferredWidth: css('rem(60)'),
          mainBottomToolbar: { label: 'Slide Actions' },
          leftRail: dialogRailProps(
            'Layers',
            200,
            'toggle-workbench-dialog-layers',
          ),
          rightRail: dialogRailProps(
            'Inspector',
            220,
            'toggle-workbench-dialog-inspector',
          ),
        },
        {
          main: [
            workAreaNode('The slide canvas goes here. Hero Image is selected.'),
          ],
          'mainBottomToolbar.trailing': [
            node(
              'row',
              { hAlign: 'right', gap: 'xs' },
              {
                children: [
                  closeButton('Cancel', { emphasis: 'secondary' }),
                  node('button', {
                    children: 'Save Slide',
                    tone: 'brand',
                    action: 'log-more',
                  }),
                ],
              },
            ),
          ],
          'leftRail.content': [
            node(
              'list',
              { controlInsets: 'tb' },
              {
                children: LAYERS.map(([itemId, label, kind]) =>
                  node('list-item', {
                    label,
                    description: kind,
                    itemId,
                    action: select_,
                    ...(itemId === 'hero' ? { selected: true } : {}),
                  }),
                ),
              },
            ),
          ],
          'leftRail.toolbar.title': [toolbarTextNode('Layers')],
          'rightRail.content': [
            node(
              'list',
              { controlInsets: 'tb' },
              {
                children: [
                  node(
                    'value-table',
                    { label: 'Layer Details' },
                    {
                      children: [
                        ['Name', 'Hero Image'],
                        ['Kind', 'Image'],
                        ['Size', '1280 × 720'],
                      ].map(([label, value]) =>
                        node('value-table#ValueTableRow', { label, value }),
                      ),
                    },
                  ),
                ],
              },
            ),
          ],
          'rightRail.toolbar.title': [toolbarTextNode('Inspector')],
        },
      ),
    ),
  );
});

// KF-R7MSPP: a WorkbenchDialog authored embedded, its work area alone.
test('builds WorkbenchDialog › Embedded', async ({ page }) => {
  const id = 'workbench-dialog-embedded-demo';
  const copy = 'The slide canvas goes here.';
  await addInto(page, /^Pane/, 'WorkbenchDialog');
  await select(page, WORKBENCH_DIALOG);
  await applySpec(page, {
    flags: ['embedded'],
    text: {
      id,
      label: 'Slide Preview',
      title: 'Slide Preview',
      description: 'Slide 3 of 12',
    },
  });
  await setCss(page, 'height', 'rem(15)');
  await setCss(page, 'preferredWidth', 'rem(35)');
  await workArea(page, copy);
  await expect(canvas(page).locator(`#${id}`)).toContainText(copy);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'workbench-dialog',
        {
          id,
          label: 'Slide Preview',
          title: 'Slide Preview',
          description: 'Slide 3 of 12',
          embedded: true,
          height: css('rem(15)'),
          preferredWidth: css('rem(35)'),
        },
        { main: [workAreaNode(copy)] },
      ),
    ),
  );
});

test('builds ListDetailDialog › Project Details', async ({ page }) => {
  test.setTimeout(test.info().timeout * 4);
  const id = 'list-detail-dialog-demo';
  const action = 'select-list-detail-project';
  await dialogTrigger(page, 'Open Project Details', id);
  await addInto(page, /^Pane/, 'ListDetailDialog');
  await select(page, LIST_DETAIL_DIALOG);
  await applySpec(page, {
    text: { id, label: 'Project Details', backLabel: 'Back to Projects' },
  });
  await setCss(page, 'viewportGutter', 'rem(0.5)');
  await setCss(page, 'height', 'rem(30)');
  await columnTitles(page);
  // The list column's controls: a borderless single group holding New.
  await configure(page, 'list');
  await page.locator('[data-editor-content-add="list.toolbar"]').click();
  await addChild(page, 'ToolbarControlGroup');
  await area(page, 'Properties');
  await choose(page, 'appearance', 'borderless');
  await turnOn(page, 'single');
  await select(page, /^ToolbarButton/);
  await applySpec(page, {
    text: { children: 'New', ariaLabel: 'New Project', action: 'log-more' },
  });
  await projectColumn(page, LDD_PROJECTS, action);
  await atlasDetails(page);
  await addInto(page, /^List(?![A-Z])/, 'ListInsetText', 1);
  await setText(page, 'children', LDD_DETAIL_COPY);
  // The detail column's pinned footer: a Row of Done and Open Project.
  await select(page, LIST_DETAIL_DIALOG);
  await configure(page, 'detail');
  await page.locator('[data-editor-content-add="detail.footer"]').click();
  await addChild(page, 'Row');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { hAlign: 'right', gap: 'xs', controlInsets: 'trbl' },
  });
  await zoneButtons(page, /^Row/, 'children', [
    {
      choices: { emphasis: 'secondary' },
      text: { children: 'Done' },
      close: true,
    },
    {
      choices: { tone: 'brand' },
      text: { children: 'Open Project', action: 'log-more' },
    },
  ]);
  await select(page, LIST_DETAIL_DIALOG);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  const shown = canvas(page).locator(`#${id}`);
  await expect(shown).toBeVisible();
  await expect(shown.locator('.kui-list-item')).toHaveCount(
    LDD_PROJECTS.length,
  );
  await expect(
    shown.getByRole('button', { name: 'New Project', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('kf-wbh5p2-list-detail-dialog-1440.png'),
  });
  expect(await exported(page)).toEqual(
    pane(
      dialogTriggerNode('Open Project Details', id),
      node(
        'list-detail-dialog',
        {
          id,
          label: 'Project Details',
          backLabel: 'Back to Projects',
          viewportGutter: css('rem(0.5)'),
          height: css('rem(30)'),
          list: { title: 'Projects' },
          detail: { title: 'Atlas', description: 'Active' },
        },
        {
          'list.toolbar': [
            node(
              'toolbar-control-group',
              { appearance: 'borderless', single: true },
              {
                children: [
                  node('toolbar-control-group#ToolbarButton', {
                    children: 'New',
                    ariaLabel: 'New Project',
                    action: 'log-more',
                  }),
                ],
              },
            ),
          ],
          'list.content': [projectColumnNode(LDD_PROJECTS, action)],
          'detail.content': [
            node(
              'list',
              { controlInsets: 'tb' },
              {
                children: [
                  atlasDetailsNode(),
                  node('list-inset-text', { children: LDD_DETAIL_COPY }),
                ],
              },
            ),
          ],
          'detail.footer': [
            node(
              'row',
              { hAlign: 'right', gap: 'xs', controlInsets: 'trbl' },
              {
                children: [
                  closeButton('Done', { emphasis: 'secondary' }),
                  node('button', {
                    children: 'Open Project',
                    tone: 'brand',
                    action: 'log-more',
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

// KF-R7MSPP: a ListDetailDialog authored embedded, with no column controls.
test('builds ListDetailDialog › Embedded', async ({ page }) => {
  test.setTimeout(test.info().timeout * 2);
  const id = 'list-detail-dialog-embedded-demo';
  const projects = LDD_PROJECTS.slice(0, 2);
  await addInto(page, /^Pane/, 'ListDetailDialog');
  await select(page, LIST_DETAIL_DIALOG);
  await applySpec(page, {
    flags: ['embedded'],
    text: { id, label: 'Project Preview' },
  });
  await setCss(page, 'height', 'rem(17.5)');
  await setCss(page, 'preferredWidth', 'rem(35)');
  await columnTitles(page);
  await projectColumn(page, projects, 'log-more');
  await atlasDetails(page);
  const shown = canvas(page).locator(`#${id}`);
  await expect(shown).toBeVisible();
  await expect(shown.locator('.kui-list-item')).toHaveCount(projects.length);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list-detail-dialog',
        {
          id,
          label: 'Project Preview',
          embedded: true,
          height: css('rem(17.5)'),
          preferredWidth: css('rem(35)'),
          list: { title: 'Projects' },
          detail: { title: 'Atlas', description: 'Active' },
        },
        {
          'list.content': [projectColumnNode(projects, 'log-more')],
          'detail.content': [
            node(
              'list',
              { controlInsets: 'tb' },
              { children: [atlasDetailsNode()] },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds SurfaceScaffold › Embedded Popover Dialog', async ({ page }) => {
  test.setTimeout(test.info().timeout * 3);
  await dragComponent(page, 'PopoverDialogSurface', () => emptySpot(page));
  await select(page, /^PopoverDialogSurface/);
  await applySpec(page, {
    choices: { presentation: 'embedded', bodyLayout: 'fill' },
    text: { label: 'Repository Status Preview' },
  });
  await setCss(page, 'preferredWidth', 'rem(35)');
  await setCss(page, 'height', 'rem(17.5)');
  // The split takes the seeded body Text's place.
  await addInto(page, /^PopoverDialogSurface/, 'SplitView', 0, 0);
  await projectSplit(page, 'catalog-embedded-dialog-split');
  await expect(
    canvas(page).getByRole('dialog', { name: 'Repository Status Preview' }),
  ).toBeVisible();
  expect(await exported(page)).toEqual(
    pane(
      node(
        'surface-scaffold#PopoverDialogSurface',
        {
          label: 'Repository Status Preview',
          presentation: 'embedded',
          preferredWidth: css('rem(35)'),
          height: css('rem(17.5)'),
          bodyLayout: 'fill',
        },
        { children: [projectSplitNode('catalog-embedded-dialog-split')] },
      ),
    ),
  );
});

// KF-GFQ20S: the overlay surface shows embedded on the edit canvas
// (KF-T1V86Q), so its heading and split can be built in place; its trigger
// group sits in a plain Toolbar (KF-0W87ST).
test('builds SurfaceScaffold › Non-Modal Popover Dialog', async ({ page }) => {
  test.setTimeout(test.info().timeout * 3);
  const id = 'catalog-popover-dialog';
  const label = 'Non-Modal Popover Dialog';
  const button = { children: 'Open Repository Status', popoverTarget: id };
  const description = 'Three projects have uncommitted changes.';
  await toolbarTrigger(page, label, { text: button });
  await addInto(page, /^Pane/, 'PopoverDialogSurface');
  await select(page, /^PopoverDialogSurface/);
  await applySpec(page, {
    choices: { bodyLayout: 'fill-last' },
    text: {
      id,
      labelledBy: `${id}-title`,
      describedBy: `${id}-description`,
    },
    unsets: ['label'],
  });
  await setCss(page, 'preferredWidth', 'rem(45)');
  await setCss(page, 'height', 'rem(26.25)');
  await setCss(page, 'viewportGutter', 'rem(0.5)');
  // The heading Toolbar takes the seeded body Text's place; the split
  // follows it.
  await addInto(page, /^PopoverDialogSurface/, 'Toolbar', 0, 0);
  await select(page, TOOLBAR, 1);
  await setText(page, 'label', 'Repository Status Heading');
  await zoneText(
    page,
    'leading',
    {
      choices: { size: 'xlarge' },
      text: {
        text: 'Repository Status',
        id: `${id}-title`,
        description,
        descriptionId: `${id}-description`,
      },
    },
    1,
  );
  await addInto(page, /^PopoverDialogSurface/, 'SplitView');
  await projectSplit(page, `${id}-split`);
  const shown = canvas(page).getByRole('dialog', {
    name: 'Repository Status',
  });
  await expect(shown).toBeVisible();
  await expect(shown).toHaveAttribute('data-presentation', 'embedded');
  await expect(shown).toHaveAttribute('aria-describedby', `${id}-description`);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      toolbarTriggerNode(label, button),
      node(
        'surface-scaffold#PopoverDialogSurface',
        {
          id,
          labelledBy: `${id}-title`,
          describedBy: `${id}-description`,
          preferredWidth: css('rem(45)'),
          height: css('rem(26.25)'),
          viewportGutter: css('rem(0.5)'),
          bodyLayout: 'fill-last',
        },
        {
          children: [
            node(
              'toolbar',
              { label: 'Repository Status Heading' },
              {
                leading: [
                  node('toolbar-text', {
                    text: 'Repository Status',
                    size: 'xlarge',
                    id: `${id}-title`,
                    description,
                    descriptionId: `${id}-description`,
                  }),
                ],
              },
            ),
            projectSplitNode(`${id}-split`),
          ],
        },
      ),
    ),
  );
});

test('builds SurfaceScaffold › Controlled Reader Stack', async ({ page }) => {
  test.setTimeout(test.info().timeout * 4);
  await dragComponent(page, 'Row', () => emptySpot(page));
  await select(page, /^Row/);
  await choose(page, 'gap', 'xs');
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  await setText(page, 'children', 'Open Reader');
  await setText(page, 'action', 'push-dialog-stack');
  await inspectorOverview(page);
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await select(page, /^Button/, 1);
  await setText(page, 'children', 'Swap Order');
  await setText(page, 'action', 'reorder-dialog-stack');
  await turnOn(page, 'disabled');
  for (const [id, label, position] of READERS) {
    await dialogSurface(
      page,
      {
        choices: { height: 'viewport', bodyInset: 'none', bodyLayout: 'fill' },
        text: { id: `catalog-reader-${id}`, label },
        data: [['data-reader-id', id]],
      },
      { preferredWidth: 'rem(64)' },
      position - 1,
    );
    const nth = position - 1;
    await openConfigure(page, 'Configure stack');
    await setField(page, 'stack', ['position'], String(position));
    await setField(page, 'stack', ['count'], '2');
    await setField(page, 'stack', ['offset'], 'rem(0)');
    // Neither reader is open yet: the untouched required switches already
    // write false (KF-VQTDYG).
    await backOut(page);
    // The first reader's body holds no Text by now.
    await addInto(page, DIALOG, 'List', nth, 0);
    await addInto(page, /^List(?![A-Z])/, 'ListInsetText', nth);
    await setText(page, 'children', READER_COPY);
    await addInto(page, /^List(?![A-Z])/, 'ListItem', nth);
    await applySpec(page, {
      text: { label: 'Review ticket', itemId: id, action: 'log-more' },
    });
    await addInto(page, /^List(?![A-Z])/, 'ListInsetControl', nth);
    await addChild(page, 'PopupMenu');
    // Adding the menu turned the inset's seeded text into a Text.
    await area(page, 'Outline');
    await outlineRow(page, /^Text/).first().click();
    await deleteSelected(page);
    await select(page, /^PopupMenu/, nth);
    await applySpec(page, {
      text: { text: 'Reader Actions' },
      unsets: ['label'],
    });
    await editAsJson(page, 'items', READER_ITEMS);
  }
  await expect(canvas(page).locator('dialog')).toHaveCount(2);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { gap: 'xs' },
        {
          children: [
            node('button', {
              children: 'Open Reader',
              action: 'push-dialog-stack',
            }),
            node('button', {
              children: 'Swap Order',
              action: 'reorder-dialog-stack',
              disabled: true,
            }),
          ],
        },
      ),
      ...READERS.map(([id, label, position]) =>
        node(
          'surface-scaffold',
          {
            id: `catalog-reader-${id}`,
            label,
            preferredWidth: css('rem(64)'),
            height: 'viewport',
            bodyInset: 'none',
            bodyLayout: 'fill',
            stack: {
              open: false,
              active: false,
              position,
              count: 2,
              offset: css('rem(0)'),
            },
            rootAttributes: { 'data-reader-id': id },
          },
          {
            children: [
              node('list', undefined, {
                children: [
                  node('list-inset-text', { children: READER_COPY }),
                  node('list-item', {
                    label: 'Review ticket',
                    itemId: id,
                    action: 'log-more',
                  }),
                  node('list-inset-control', undefined, {
                    children: [
                      node('popup-menu', {
                        text: 'Reader Actions',
                        items: READER_ITEMS,
                      }),
                    ],
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

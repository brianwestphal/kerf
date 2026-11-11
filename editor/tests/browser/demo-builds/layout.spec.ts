// KF-JN4PF5: each ux-demo configuration of the layout primitives and surfaces, built in
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
  zoneSpot,
} from '../build.js';
import type { FieldSpec } from './helpers.js';
import {
  addInto,
  albumHeader,
  ANCHORED_REQUEST_COPY,
  ANCHORED_REQUEST_DESCRIPTION,
  applySpec,
  axisGap,
  back,
  backdrop,
  bindField,
  BOTTOM_DRAWER,
  buttonGroup,
  buttonGroupNode,
  CARD_COPY,
  CATALOG_PANEL,
  chromeNode,
  closeForm,
  configure,
  CONSOLE_TOOLBAR,
  contentItemInto,
  CONVERSATION,
  copyItem,
  copyItemNode,
  css,
  dataAttribute,
  deleteSelected,
  demoChip,
  demoChipNode,
  demoContentItem,
  demoPanel,
  demoStack,
  demoStackNode,
  demoTexts,
  describedText,
  disclosureButton,
  disclosureButtonNode,
  disclosureInto,
  DOCUMENT_CARDS,
  DOCUMENT_TILES,
  dropSwapSeeds,
  editAsJson,
  FEED_TITLES,
  FILLER_DETAIL,
  FILLS,
  frameShell,
  frameShellNode,
  grid,
  gridField,
  gridTile,
  gridTileNode,
  itemCopy,
  itemCopyNode,
  items,
  LEFT_RAIL,
  nameFieldParam,
  nameParam,
  navigatorToolbar,
  navigatorToolbarProps,
  navigatorToolbarZones,
  nestedPane,
  nestedPaneNode,
  openConfigure,
  openField,
  ownToolbar,
  panelTitleZone,
  panelToolbarProps,
  popoverButtonNode,
  promote,
  region,
  RICH_CARDS,
  RIGHT_RAIL,
  rootPane,
  rootPaneNode,
  rowChipNodes,
  rowChips,
  selectableItem,
  selectableList,
  setCss,
  shellRow,
  spacedChips,
  spacedChipsNode,
  SUNKEN,
  sunkenPanel,
  sunkenWorkbench,
  surfaceTrigger,
  surfaceTriggerNode,
  swapButtonRow,
  textInto,
  textItemNode,
  textNode,
  titleOverlay,
  titleOverlayNode,
  TOOLBAR,
  toolbar,
  toolbarTextNode,
  trackList,
  trackListNode,
  valueTable,
  zoneGroup,
  zoneText,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
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
  await openConfigure(page, 'Configure effects');
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
  await showProp(page, 'fill');
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
  await showProp(page, 'separators');
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
  await showProp(page, 'restoreControl');
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
  await showProp(page, 'header');
  await page.locator('[data-editor-content-add="header"]').click();
  await addChild(page, 'ToolbarText');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { size: 'small' },
    text: { text: 'Pinned Files' },
  });
  await select(page, rail);
  await openConfigure(page, 'Configure header list');
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

// KF-121Q7E: the CatalogExample and its viewport (the frame that names the
// `--demo-shell-main` anchor) are catalog chrome; the view is the column's
// content and the request surface, which docks to that application anchor.
// The edit canvas shows the surface embedded (KF-T1V86Q).
test('builds Layout › Top-Layer Popup Anchored to the Frame', async ({
  page,
}) => {
  test.setTimeout(test.info().timeout * 3);
  const id = 'layout-anchored-request';
  await dragComponent(page, 'Text', () => emptySpot(page));
  await select(page, /^Text(?![A-Z])/);
  await setText(page, 'children', ANCHORED_REQUEST_COPY);
  await addInto(page, /^Pane/, 'Spacer');
  await area(page, 'Properties');
  await turnOn(page, 'flex');
  await addInto(page, /^Pane/, 'Row');
  await area(page, 'Properties');
  await choose(page, 'controlInsets', 'l');
  await addInto(page, /^Row/, 'Button');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { popoverTargetAction: 'show' },
    text: { children: 'Show Request', popoverTarget: id },
    data: [['data-layout-anchor-trigger', '']],
  });
  await addInto(page, /^Pane/, 'PopoverDialogSurface');
  await select(page, /^PopoverDialogSurface/);
  await applySpec(page, {
    choices: { dismiss: 'manual' },
    text: {
      id,
      labelledBy: `${id}-title`,
      describedBy: `${id}-description`,
      anchorName: '--demo-shell-main',
    },
    unsets: ['label'],
    data: [['data-anchored-request-popup', '']],
  });
  await setCss(page, 'preferredWidth', 'rem(30)');
  // The heading List takes the seeded body Text's place.
  await addInto(page, /^PopoverDialogSurface/, 'List', 0, 1);
  await addInto(page, /^List(?![A-Z])/, 'Toolbar');
  await area(page, 'Properties');
  await setText(page, 'label', 'Request Heading');
  await zoneText(page, 'leading', {
    choices: { size: 'xlarge' },
    text: { text: 'Allow File Access?', id: `${id}-title` },
  });
  await describedText(
    page,
    /^List(?![A-Z])/,
    ANCHORED_REQUEST_DESCRIPTION,
    `${id}-description`,
  );
  await choose(page, 'tone', 'quiet');
  await select(page, /^ListInsetText/);
  await choose(page, 'sides', 'rl');
  await addInto(page, /^PopoverDialogSurface/, 'Row');
  await area(page, 'Properties');
  await choose(page, 'hAlign', 'right');
  await choose(page, 'controlInsets', 'rbl');
  for (const [children, spec] of [
    ['Deny', { choices: { emphasis: 'secondary' } }],
    ['Allow', { choices: { tone: 'brand' } }],
  ] as const) {
    await addInto(page, /^Row/, 'Button', 1);
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { ...spec.choices, popoverTargetAction: 'hide' },
      text: { children, popoverTarget: id },
    });
  }
  const shown = canvas(page).getByRole('dialog', {
    name: 'Allow File Access?',
  });
  await expect(shown).toBeVisible();
  await expect(shown).toHaveAttribute('data-presentation', 'embedded');
  await expect(shown.getByRole('button')).toHaveCount(2);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node('text', { children: ANCHORED_REQUEST_COPY }),
      node('spacer', { flex: true }),
      node(
        'row',
        { controlInsets: 'l' },
        {
          children: [
            popoverButtonNode('Show Request', id, 'show', {
              rootAttributes: { 'data-layout-anchor-trigger': '' },
            }),
          ],
        },
      ),
      node(
        'surface-scaffold#PopoverDialogSurface',
        {
          id,
          labelledBy: `${id}-title`,
          describedBy: `${id}-description`,
          dismiss: 'manual',
          anchorName: '--demo-shell-main',
          preferredWidth: css('rem(30)'),
          rootAttributes: { 'data-anchored-request-popup': '' },
        },
        {
          children: [
            node('list', undefined, {
              children: [
                node(
                  'toolbar',
                  { label: 'Request Heading' },
                  {
                    leading: [
                      node('toolbar-text', {
                        text: 'Allow File Access?',
                        size: 'xlarge',
                        id: `${id}-title`,
                      }),
                    ],
                  },
                ),
                node(
                  'list-inset-text',
                  { sides: 'rl' },
                  {
                    children: [
                      node('text', {
                        children: ANCHORED_REQUEST_DESCRIPTION,
                        variant: 'span',
                        tone: 'quiet',
                        id: `${id}-description`,
                      }),
                    ],
                  },
                ),
              ],
            }),
            node(
              'row',
              { hAlign: 'right', controlInsets: 'rbl' },
              {
                children: [
                  popoverButtonNode('Deny', id, 'hide', {
                    emphasis: 'secondary',
                  }),
                  popoverButtonNode('Allow', id, 'hide', { tone: 'brand' }),
                ],
              },
            ),
          ],
        },
      ),
    ),
  );
});

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
  await showProp(page, 'restoreControl');
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
  await openConfigure(page, 'Configure tint');
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
  // KF-Z9QDK8: 40s locally, past a slow test's 180s under CI's load.
  test.setTimeout(test.info().timeout * 8);
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
  for (let copy = 1; copy < messages.length; copy += 1) {
    await inspectorOverview(page);
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  }
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

// KF-MN7QK5: each tile's name is a strong span Text beside its Button
// (gridTileSelections starts empty, so no tile is selected).
test('builds Grid › Selectable Document Tiles', async ({ page }) => {
  test.slow();
  await grid(
    page,
    {
      choices: { gap: 's', selectionMode: 'multiple' },
      flags: ['autoFill'],
      text: { columns: '', ariaLabel: 'Documents' },
      data: [['data-demo-grid', 'selectable-tiles']],
    },
    { minColumnWidth: 'px(160)' },
  );
  for (const [index, name] of DOCUMENT_TILES.entries()) {
    await addInto(page, /^Grid/, 'ContentItem');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { selectionMode: 'multiple', frame: 'framed' },
      flags: ['interactive'],
      text: {
        action: 'select-grid-tile',
        itemId: `tile-${index + 1}`,
        ariaLabel: name,
      },
    });
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span', weight: 'strong' },
      text: { children: name },
    });
    await addInto(page, /^ContentItem/, 'Button', index);
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { size: 'compact' },
      text: { children: 'Add as Quote', action: 'log-card-primary' },
    });
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'grid',
        {
          minColumnWidth: { $css: 'px(160)' },
          autoFill: true,
          gap: 's',
          selectionMode: 'multiple',
          ariaLabel: 'Documents',
          rootAttributes: { 'data-demo-grid': 'selectable-tiles' },
        },
        {
          children: DOCUMENT_TILES.map((name, index) =>
            node(
              'content-item',
              {
                interactive: true,
                action: 'select-grid-tile',
                itemId: `tile-${index + 1}`,
                selectionMode: 'multiple',
                ariaLabel: name,
                frame: 'framed',
              },
              {
                children: [
                  textNode(name, { variant: 'span', weight: 'strong' }),
                  node('button', {
                    children: 'Add as Quote',
                    action: 'log-card-primary',
                    size: 'compact',
                  }),
                ],
              },
            ),
          ),
        },
      ),
    ),
  );
});

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

// KF-YNDRE1: the artwork is the app's generated SVG URLs. The first card
// promotes media.src and media.blurredSrc to params with the field-level
// Promote to a param, and the other cards bind the same params; the third
// card's overlay Button fills its media.overlay field zone.
test('builds ContentItem › Image-Tinted Feed Cards', async ({ page }) => {
  // About 50s locally: four cards, each with two object forms.
  test.setTimeout(test.info().timeout * 4);
  await nestedPane(page, {
    text: { label: 'Stories' },
    data: [['data-content-item-feed', 'true']],
  });
  for (const [index, title] of FEED_TITLES.entries()) {
    const light = index === 1;
    await addInto(page, /^Pane/, 'ContentItem', 1);
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { appearance: 'surface', frame: 'framed' },
      data: [['data-feed-card', String(index + 1)]],
    });
    await openConfigure(page, 'Configure media');
    // KF-PTMNSZ: Src binds before media's other required field (alt) is
    // set; Source judges the field alone.
    if (index === 0) {
      // KF-5ZMAEM: each promoted field's param is named in the form.
      await bindField(page, 'Src');
      await nameFieldParam(page, 'nodeMediaSrc', 'skylineUrl');
      await bindField(page, 'Blurred src');
      await nameFieldParam(page, 'nodeMediaBlurredSrc', 'skylineBlurredUrl');
    } else {
      await bindField(page, 'Src', 'Param skylineUrl');
      await bindField(page, 'Blurred src', 'Param skylineBlurredUrl');
    }
    // The demo's alt is empty: type it, then clear it.
    await setField(page, 'media', ['alt'], 'x');
    await page
      .locator(`[data-editor-field='{"prop":"media","path":["alt"]}'] input`)
      .fill('');
    await page.keyboard.press('Enter');
    await setField(page, 'media', ['aspectRatio'], String(16 / 9));
    await chooseField(page, 'media', ['parallax'], 'subtle');
    await turnFieldOn(page, 'media', ['deferOffscreen']);
    if (index === 2) {
      await setField(page, 'media', ['fadeTo'], "fillColor('#283a54')");
      await chooseField(page, 'media', ['scrim'], 'bottom');
      await turnFieldOn(page, 'media', ['edgeToEdge']);
    }
    await closeForm(page);
    await openConfigure(page, 'Configure tint');
    await setField(
      page,
      'tint',
      ['color'],
      `fillColor('${light ? '#dad9c8' : '#283a54'}')`,
    );
    await chooseField(page, 'tint', ['scheme'], light ? 'light' : 'dark');
    await setField(
      page,
      'tint',
      ['accent'],
      `fillColor('${light ? '#67502b' : '#8cb7df'}')`,
    );
    await closeForm(page);
    if (index === 2) {
      await addChild(page, 'Button', 'media › overlay');
      await area(page, 'Properties');
      await applySpec(page, {
        text: { children: 'Explore', action: 'log-more' },
      });
      await select(page, /^ContentItem/, index);
      await addChild(page, 'List', 'children');
    } else await addChild(page, 'List', 'children');
    await area(page, 'Properties');
    await choose(page, 'gap', '2xs');
    await addChild(page, 'Text');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { variant: 'span', weight: 'strong' },
      text: { children: title },
    });
    await inspectorOverview(page);
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await applySpec(page, {
      choices: { weight: 'Default (regular)', tone: 'quiet' },
      text: { children: 'A short dispatch from the coast.' },
    });
    // Each card's copy List follows the earlier cards' Lists and Rows.
    await select(page, /^List(?![A-Z])/, index);
    await addChild(page, 'Row');
    await area(page, 'Properties');
    await choose(page, 'vAlign', 'middle');
    await addChild(page, 'Button');
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { emphasis: 'link' },
      unions: { link: ['Text…', '#source'] },
      text: { children: 'Source' },
    });
    await addInto(page, /^Row/, 'Button', index);
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { emphasis: 'plain' },
      text: { children: 'Save', action: 'log-more' },
    });
  }
  await addInto(page, /^Pane/, 'ContentItem', 1);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { appearance: 'surface' },
    data: [['data-feed-card', 'no-image']],
  });
  await itemCopy(
    page,
    'Text-only update',
    'No image is available for this story.',
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  const media = (index: number) => ({
    src: { $param: 'skylineUrl' },
    alt: '',
    blurredSrc: { $param: 'skylineBlurredUrl' },
    aspectRatio: 16 / 9,
    parallax: 'subtle',
    deferOffscreen: true,
    ...(index === 2
      ? {
          fadeTo: { $css: "fillColor('#283a54')" },
          scrim: 'bottom',
          edgeToEdge: true,
        }
      : {}),
  });
  const copy = (title: string) =>
    node(
      'list',
      { gap: '2xs' },
      {
        children: [
          textNode(title, { variant: 'span', weight: 'strong' }),
          textNode('A short dispatch from the coast.', {
            variant: 'span',
            tone: 'quiet',
          }),
          node(
            'row',
            { vAlign: 'middle' },
            {
              children: [
                node('button', {
                  children: 'Source',
                  emphasis: 'link',
                  link: '#source',
                }),
                node('button', {
                  children: 'Save',
                  emphasis: 'plain',
                  action: 'log-more',
                }),
              ],
            },
          ),
        ],
      },
    );
  expect(await exported(page)).toEqual(
    pane(
      nestedPaneNode(
        {
          label: 'Stories',
          rootAttributes: { 'data-content-item-feed': 'true' },
        },
        [
          ...FEED_TITLES.map((title, index) => {
            const light = index === 1;
            return node(
              'content-item',
              {
                appearance: 'surface',
                frame: 'framed',
                media: media(index),
                tint: {
                  color: {
                    $css: `fillColor('${light ? '#dad9c8' : '#283a54'}')`,
                  },
                  scheme: light ? 'light' : 'dark',
                  accent: {
                    $css: `fillColor('${light ? '#67502b' : '#8cb7df'}')`,
                  },
                },
                rootAttributes: { 'data-feed-card': String(index + 1) },
              },
              {
                children: [copy(title)],
                ...(index === 2
                  ? {
                      'media.overlay': [
                        node('button', {
                          children: 'Explore',
                          action: 'log-more',
                        }),
                      ],
                    }
                  : {}),
              },
            );
          }),
          node(
            'content-item',
            {
              appearance: 'surface',
              rootAttributes: { 'data-feed-card': 'no-image' },
            },
            {
              children: [
                itemCopyNode(
                  'Text-only update',
                  'No image is available for this story.',
                ),
              ],
            },
          ),
        ],
      ),
    ),
  );
});

// KF-YNDRE1: contentCardSelected starts false and contentCardChoice
// document-a, so only Document A is selected; the two document cards are
// options of a single-select List instead of an app-owned listbox div.
test('builds ContentItem › Interactive Cards', async ({ page }) => {
  test.slow();
  // KF-GNK57N: the toggle cards sit in a List, so they space as one group.
  const card = async (index: number, spec: FieldSpec) => {
    await addInto(page, /^List(?![A-Z])/, 'ContentItem', 0);
    await area(page, 'Properties');
    await applySpec(page, spec);
    const [title, detail] = CARD_COPY[index]!;
    await itemCopy(page, title, detail);
  };
  await nestedPane(page, {
    choices: { appearance: 'sunken' },
    text: { label: 'Interactive Content Items' },
  });
  await addInto(page, /^Pane/, 'List', 1);
  await card(0, {
    choices: { selectionMode: 'toggle' },
    flags: ['interactive'],
    text: {
      action: 'toggle-content-card',
      itemId: 'line-42',
      ariaLabel: 'Line Item 42',
      title: 'Edit this quotation',
    },
    data: [['data-demo-item', 'toggle-card']],
  });
  await card(1, {
    choices: { selectionMode: 'toggle' },
    flags: ['interactive'],
    text: {
      action: 'toggle-content-card',
      itemId: 'card-with-action',
      ariaLabel: 'Card with Action',
    },
    data: [['data-demo-item', 'card-with-action']],
  });
  await addInto(page, /^ContentItem/, 'Button', 1);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { emphasis: 'plain' },
    text: { children: 'More Actions', action: 'log-more' },
  });
  await card(2, {
    flags: ['interactive', 'disabled'],
    text: {
      action: 'toggle-content-card',
      itemId: 'locked-card',
      ariaLabel: 'Locked Item',
    },
    data: [['data-demo-item', 'disabled-card']],
  });
  await addInto(page, /^Pane/, 'List', 1);
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { selectionMode: 'single' },
    text: { ariaLabel: 'Documents' },
  });
  for (const [id, label] of DOCUMENT_CARDS) {
    // The cards' List and their copy Lists come first: Documents is the 5th.
    await addInto(page, /^List(?![A-Z])/, 'ContentItem', 4);
    await area(page, 'Properties');
    await applySpec(page, {
      choices: { selectionMode: 'single' },
      flags: ['interactive', ...(id === 'document-a' ? ['selected'] : [])],
      text: { action: 'choose-content-card', itemId: id, ariaLabel: label },
      data: [['data-demo-item', id]],
    });
    await itemCopy(page, label, 'Choose a document.');
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  const cardNode = (
    index: number,
    props: Record<string, unknown>,
    extra: unknown[] = [],
  ) => {
    const [title, detail] = CARD_COPY[index]!;
    return node(
      'content-item',
      { interactive: true, action: 'toggle-content-card', ...props },
      { children: [itemCopyNode(title, detail), ...extra] },
    );
  };
  expect(await exported(page)).toEqual(
    pane(
      nestedPaneNode(
        { label: 'Interactive Content Items', appearance: 'sunken' },
        [
          node('list', undefined, {
            children: [
              cardNode(0, {
                itemId: 'line-42',
                selectionMode: 'toggle',
                ariaLabel: 'Line Item 42',
                title: 'Edit this quotation',
                rootAttributes: { 'data-demo-item': 'toggle-card' },
              }),
              cardNode(
                1,
                {
                  itemId: 'card-with-action',
                  selectionMode: 'toggle',
                  ariaLabel: 'Card with Action',
                  rootAttributes: { 'data-demo-item': 'card-with-action' },
                },
                [
                  node('button', {
                    children: 'More Actions',
                    emphasis: 'plain',
                    action: 'log-more',
                  }),
                ],
              ),
              cardNode(2, {
                itemId: 'locked-card',
                disabled: true,
                ariaLabel: 'Locked Item',
                rootAttributes: { 'data-demo-item': 'disabled-card' },
              }),
            ],
          }),
          node(
            'list',
            { selectionMode: 'single', ariaLabel: 'Documents' },
            {
              children: DOCUMENT_CARDS.map(([id, label]) =>
                node(
                  'content-item',
                  {
                    interactive: true,
                    action: 'choose-content-card',
                    itemId: id,
                    selectionMode: 'single',
                    ...(id === 'document-a' ? { selected: true } : {}),
                    ariaLabel: label,
                    rootAttributes: { 'data-demo-item': id },
                  },
                  { children: [itemCopyNode(label, 'Choose a document.')] },
                ),
              ),
            },
          ),
        ],
      ),
    ),
  );
});

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

test('builds BackdropImage › Scrim Under a Title', async ({ page }) => {
  test.slow();
  await backdrop(page, 'Place', 'skylineUrl');
  await select(page, /^BackdropImage/);
  await applySpec(page, {
    choices: { position: 'bottom', scrim: 'bottom' },
    text: { alt: 'Ridges at dusk under a low sun' },
  });
  // The demo's remify(240).
  await setCss(page, 'height', 'rem(15)');
  await addInto(page, /^BackdropImage/, 'ListInsetText');
  await area(page, 'Properties');
  await setText(
    page,
    'children',
    'A ridge walk above the harbor, best at dusk.',
  );
  // The overlay comes last: Add a child keeps the zone it last used.
  await select(page, /^BackdropImage/);
  await addChild(page, 'Toolbar', 'overlay');
  await area(page, 'Properties');
  await setText(page, 'label', 'Place');
  await zoneText(page, 'leading', {
    choices: { size: 'xlarge', headingLevel: '2' },
    text: { text: 'Coastal Ridge' },
  });
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { label: 'Place' },
      {
        content: [
          node(
            'backdrop-image',
            {
              src: { $param: 'skylineUrl' },
              alt: 'Ridges at dusk under a low sun',
              position: 'bottom',
              height: { $css: 'rem(15)' },
              scrim: 'bottom',
            },
            {
              children: [
                node('list-inset-text', {
                  children: 'A ridge walk above the harbor, best at dusk.',
                }),
              ],
              overlay: [
                node(
                  'toolbar',
                  { label: 'Place' },
                  {
                    leading: [
                      node('toolbar-text', {
                        text: 'Coastal Ridge',
                        size: 'xlarge',
                        headingLevel: 2,
                      }),
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

test('builds BackdropImage › Tiled Background', async ({ page }) => {
  await backdrop(page, 'Collection', 'tileUrl');
  await select(page, /^BackdropImage/);
  await applySpec(page, { choices: { repeat: 'repeat' }, text: { alt: '' } });
  // The demo's remify(160).
  await setCss(page, 'height', 'rem(10)');
  await setCss(page, 'fadeTo', "uiColor('surface')");
  await addInto(page, /^BackdropImage/, 'ListInsetText');
  await area(page, 'Properties');
  await setText(page, 'children', 'Patterned collection header.');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { label: 'Collection' },
      {
        content: [
          node(
            'backdrop-image',
            {
              src: { $param: 'tileUrl' },
              alt: '',
              repeat: 'repeat',
              height: { $css: 'rem(10)' },
              fadeTo: { $css: "uiColor('surface')" },
            },
            {
              children: [
                node('list-inset-text', {
                  children: 'Patterned collection header.',
                }),
              ],
            },
          ),
        ],
      },
    ),
  );
});

test('builds BackdropImage › Parallax Hero With Progressive Blur', async ({
  page,
}) => {
  test.setTimeout(test.info().timeout * 8);
  await rootPane(
    page,
    { text: { label: 'Artist' }, data: [['data-backdrop-demo', 'hero']] },
    {},
  );
  await select(page, /^Pane/);
  await addChild(page, 'BackdropImage', 'content');
  await area(page, 'Properties');
  await promote(page, 'Src');
  await nameParam(page, 'nodeSrc', 'skylineUrl');
  // The blurred copy is generated by the app too.
  await promote(page, 'Blur');
  await nameParam(page, 'nodeBlur', 'skylineBlur');
  await applySpec(page, { choices: { parallax: 'subtle' }, text: { alt: '' } });
  await setCss(page, 'fadeTo', "uiColor('surface')");
  await trackList(page);
  // The overlay comes last: Add a child keeps the zone it last used.
  await titleOverlay(page, 'Artist', 'Night Harbor');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      { label: 'Artist', rootAttributes: { 'data-backdrop-demo': 'hero' } },
      {
        content: [
          node(
            'backdrop-image',
            {
              src: { $param: 'skylineUrl' },
              blur: { $param: 'skylineBlur' },
              alt: '',
              parallax: 'subtle',
              fadeTo: { $css: "uiColor('surface')" },
            },
            {
              children: [trackListNode()],
              overlay: [titleOverlayNode('Artist', 'Night Harbor')],
            },
          ),
        ],
      },
    ),
  );
});

test('builds BackdropImage › Clear Header', async ({ page }) => {
  test.setTimeout(test.info().timeout * 8);
  await rootPane(
    page,
    {
      choices: { headerPresentation: 'clear', scrollEdge: 'material' },
      text: { label: 'Album' },
      data: [['data-backdrop-demo', 'clear-header']],
    },
    {},
  );
  await select(page, /^Pane/);
  await addChild(page, 'BackdropImage', 'content');
  await area(page, 'Properties');
  await promote(page, 'Src');
  await nameParam(page, 'nodeSrc', 'skylineUrl');
  await applySpec(page, {
    choices: { parallax: 'subtle' },
    flags: ['underChrome'],
    text: { alt: '' },
  });
  await setCss(page, 'fadeTo', "uiColor('surface')");
  await trackList(page);
  await titleOverlay(page, 'Album', 'Night Harbor');
  // The Pane's header, last for the same reason.
  await select(page, /^Pane/);
  await addChild(page, 'Toolbar', 'header');
  await area(page, 'Properties');
  await setText(page, 'label', 'Album Header');
  const glass = (label: string, single: boolean): FieldSpec => ({
    choices: { content: 'icon', material: 'glass' },
    flags: single ? ['single'] : [],
    text: { label },
  });
  const header = 1;
  await buttonGroup(
    page,
    'leading',
    glass('Navigation', true),
    [
      [
        { text: { ariaLabel: 'Back', action: 'log-backdrop-track' } },
        'chevron-left',
      ],
    ],
    { nth: header },
  );
  await buttonGroup(
    page,
    'trailing',
    glass('Album Actions', false),
    [
      [{ text: { ariaLabel: 'Share', action: 'log-backdrop-track' } }, 'share'],
      [
        { text: { ariaLabel: 'More', action: 'log-backdrop-track' } },
        'ellipsis',
      ],
    ],
    { nth: header },
  );
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  const action = (ariaLabel: string, glyph: string) =>
    [{ ariaLabel, action: 'log-backdrop-track' }, glyph] as const;
  expect(await exported(page)).toEqual(
    rootPaneNode(
      {
        label: 'Album',
        headerPresentation: 'clear',
        scrollEdge: 'material',
        rootAttributes: { 'data-backdrop-demo': 'clear-header' },
      },
      {
        header: [
          node(
            'toolbar',
            { label: 'Album Header' },
            {
              leading: [
                buttonGroupNode(
                  {
                    label: 'Navigation',
                    content: 'icon',
                    material: 'glass',
                    single: true,
                  },
                  [action('Back', 'chevron-left')],
                ),
              ],
              trailing: [
                buttonGroupNode(
                  {
                    label: 'Album Actions',
                    content: 'icon',
                    material: 'glass',
                  },
                  [action('Share', 'share'), action('More', 'ellipsis')],
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
              parallax: 'subtle',
              underChrome: true,
              fadeTo: { $css: "uiColor('surface')" },
            },
            {
              children: [trackListNode()],
              overlay: [titleOverlayNode('Album', 'Night Harbor')],
            },
          ),
        ],
      },
    ),
  );
});

// KF-B516FB: the surfaces open from wiring; the view holds their triggers.
test('builds AnchoredSurface › Interactive Help', async ({ page }) => {
  await surfaceTrigger(page, 'Explain This Field', 'element');
  expect(await exported(page)).toEqual(
    pane(surfaceTriggerNode('Explain This Field', 'element')),
  );
});

test('builds AnchoredSurface › Pointer Placement', async ({ page }) => {
  await surfaceTrigger(page, 'Open at Pointer', 'pointer');
  expect(await exported(page)).toEqual(
    pane(surfaceTriggerNode('Open at Pointer', 'pointer')),
  );
});

// mediaMuted starts false, so the volume icon is volume-2.
test('builds AnchoredSurface › Dark Tone for Media Chrome', async ({
  page,
}) => {
  await toolbar(page, 'Media Controls');
  await zoneGroup(
    page,
    'leading',
    {
      choices: { tone: 'dark' },
      flags: ['single'],
      text: { label: 'Playback' },
    },
    { keepButton: true },
  );
  await select(page, /^ToolbarButton/);
  await applySpec(page, {
    choices: { ariaHasPopup: 'dialog' },
    text: { ariaLabel: 'Volume' },
    data: [['data-anchored-surface-trigger', 'media']],
    unsets: ['children'],
  });
  await addIcon(page, 'icon', 'volume-2');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'toolbar',
        { label: 'Media Controls' },
        {
          leading: [
            node(
              'toolbar-control-group',
              { label: 'Playback', tone: 'dark', single: true },
              {
                children: [
                  node(
                    'toolbar-control-group#ToolbarButton',
                    {
                      ariaLabel: 'Volume',
                      ariaHasPopup: 'dialog',
                      rootAttributes: {
                        'data-anchored-surface-trigger': 'media',
                      },
                    },
                    { icon: [icon('volume-2')] },
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

// scrollEffectPlayground starts as reveal-fade over the default range.
test('builds ScrollEffect › Playground', async ({ page }) => {
  test.setTimeout(test.info().timeout * 8);
  const stories = (when: string) =>
    Array.from({ length: 10 }, (_, index) => `${when} Story ${index + 1}`);
  /** Ten DemoContentItems: one built, nine duplicated and retitled. */
  const fillers = async (titles: readonly string[], firstText: number) => {
    await contentItemInto(page, /^List(?!Item)/, 0, titles[0]!, FILLER_DETAIL);
    for (const [index, title] of titles.slice(1).entries()) {
      await select(page, /^ContentItem/, -1);
      await page.keyboard.press('ControlOrMeta+d');
      await select(page, /^Text(?![A-Z])/, firstText + (index + 1) * 2);
      await setText(page, 'children', title);
    }
  };
  await rootPane(
    page,
    {
      text: { label: 'Playground' },
      data: [['data-scroll-effect-demo', 'playground']],
    },
    {},
  );
  await addInto(page, /^Pane/, 'List');
  await fillers(stories('Earlier'), 0);
  await addInto(page, /^List(?!Item)/, 'ScrollEffect', 0);
  await area(page, 'Properties');
  await applySpec(page, { data: [['data-scroll-effect-target', '']] });
  const dialog = page.locator('dialog[open]');
  await openConfigure(page, 'Configure effects');
  await dialog.getByRole('button', { name: /^Remove / }).click();
  for (const preset of ['Reveal', 'Fade']) {
    await dialog.getByRole('button', { name: /Add/ }).last().click();
    await page.getByRole('menuitem', { name: preset, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Done' }).click();
  await contentItemInto(
    page,
    /^ScrollEffect/,
    0,
    'Night Harbor',
    'This card carries the effect. Change the preset or its range in Settings.',
  );
  await fillers(stories('Later'), 22);
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    rootPaneNode(
      {
        label: 'Playground',
        rootAttributes: { 'data-scroll-effect-demo': 'playground' },
      },
      {
        content: [
          node('list', undefined, {
            children: [
              ...stories('Earlier').map((title) =>
                demoContentItem(title, FILLER_DETAIL),
              ),
              node(
                'scroll-effect',
                {
                  effects: [{ kind: 'reveal' }, { kind: 'fade' }],
                  rootAttributes: { 'data-scroll-effect-target': '' },
                },
                {
                  children: [
                    demoContentItem(
                      'Night Harbor',
                      'This card carries the effect. Change the preset or its range in Settings.',
                    ),
                  ],
                },
              ),
              ...stories('Later').map((title) =>
                demoContentItem(title, FILLER_DETAIL),
              ),
            ],
          }),
        ],
      },
    ),
  );
});

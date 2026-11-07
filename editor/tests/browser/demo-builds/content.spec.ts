// KF-JN4PF5: each ux-demo configuration of Text and LucideIcon, built in
// the editor the way a person would (palette drags, outline and canvas
// selection, Inspector fields), then exported and compared with what the demo
// renders. A configuration the editor cannot build yet has a ticket instead
// of a test.
import { expect, test } from '@playwright/test';

import { area } from '../areas.js';
import {
  addChild,
  canvas,
  choose,
  exported,
  icon,
  newDocument,
  node,
  outlineRow,
  page as pane,
  pickIcon,
  select,
  setText,
} from '../build.js';
import type { FieldSpec, RootText } from './helpers.js';
import {
  addInto,
  applySpec,
  deleteSelected,
  iconNode,
  iconRow,
  rootIcon,
  rootTexts,
  runNode,
  textInto,
  textNode,
  textRun,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
});

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

// KF-MN7QK5: the "Inbox · 3 msg" line is a paragraph of two strong span
// Texts, the count quiet and compact, instead of a raw <strong>.
test('builds Text › Presentation Roles', async ({ page }) => {
  test.slow();
  const before: readonly RootText[] = [
    { text: 'Quiet supporting copy', spec: { choices: { tone: 'quiet' } } },
    {
      text: 'Danger or validation copy',
      spec: { choices: { tone: 'danger' } },
    },
    { text: 'Compact metadata', spec: { choices: { size: 'compact' } } },
    {
      text: 'Monospace identifier: INV-2048',
      spec: { choices: { font: 'monospace' } },
    },
    {
      text: 'Quiet compact code: PO-1042',
      spec: {
        choices: { tone: 'quiet', size: 'compact', font: 'monospace' },
      },
    },
  ];
  await rootTexts(page, before);
  // A child added to the paragraph turns its seeded copy into a text run,
  // which goes: the line is two Texts.
  await addInto(page, /^Pane/, 'Text');
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { variant: 'span', weight: 'strong' },
    text: { children: 'Inbox' },
  });
  await area(page, 'Outline');
  await outlineRow(page, /^Text “/).click();
  await deleteSelected(page);
  await select(page, /^Text(?![A-Z])/, before.length);
  await addChild(page, 'Text');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: {
      variant: 'span',
      weight: 'strong',
      tone: 'quiet',
      size: 'compact',
    },
    text: { children: ' · 3 msg' },
  });
  for (const [text, size] of [
    ['Large body copy', 'large'],
    ['Extra large body copy', 'xlarge'],
  ] as const) {
    await addInto(page, /^Pane/, 'Text');
    await applySpec(page, { choices: { size }, text: { children: text } });
  }
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      textNode('Quiet supporting copy', { tone: 'quiet' }),
      textNode('Danger or validation copy', { tone: 'danger' }),
      textNode('Compact metadata', { size: 'compact' }),
      textNode('Monospace identifier: INV-2048', { font: 'monospace' }),
      textNode('Quiet compact code: PO-1042', {
        tone: 'quiet',
        size: 'compact',
        font: 'monospace',
      }),
      node('text', undefined, {
        children: [
          textNode('Inbox', { variant: 'span', weight: 'strong' }),
          textNode(' · 3 msg', {
            variant: 'span',
            weight: 'strong',
            tone: 'quiet',
            size: 'compact',
          }),
        ],
      }),
      textNode('Large body copy', { size: 'large' }),
      textNode('Extra large body copy', { size: 'xlarge' }),
    ),
  );
});

// KF-P9NV94: the preview is a List `landmark="group"` named by its
// FieldLabel's id (`labelledBy`), beside the editable TextField it previews.
test('builds Text › Read-Only Field Preview', async ({ page }) => {
  test.slow();
  const labelId = 'needed-by-label';
  const date = 'October 16, 2026';
  /** Adds a `trl` ListInsetControl into `parent` holding `component`. */
  const insetHolding = async (
    parent: RegExp,
    parentIndex: number,
    component: string,
    spec: FieldSpec,
  ) => {
    await addInto(page, parent, 'ListInsetControl', parentIndex);
    await area(page, 'Properties');
    await choose(page, 'sides', 'trl');
    await addChild(page, component);
    // Adding a child turned the inset's seeded text into a Text node.
    await select(page, /^Text(?![A-Z])/);
    await deleteSelected(page);
    await select(page, new RegExp(`^${component}(?![A-Z])`));
    await applySpec(page, spec);
  };
  await addInto(page, /^Pane/, 'List');
  await area(page, 'Properties');
  await applySpec(page, {
    choices: { landmark: 'group' },
    text: { labelledBy: labelId },
  });
  await insetHolding(/^List(?![A-Z])/, 0, 'FieldLabel', {
    text: { children: 'Needed By', id: labelId },
  });
  await addInto(page, /^List(?![A-Z])/, 'ContentItem');
  await setText(page, 'children', date);
  await insetHolding(/^Pane/, 0, 'TextField', {
    text: { label: 'Needed By', value: date },
  });
  const group = canvas(page).locator('.kui-list[role="group"]');
  await expect(group).toHaveAttribute('aria-labelledby', labelId);
  await expect(canvas(page).locator(`#${labelId}`)).toHaveText('Needed By');
  await expect(page.getByText(/problems? in this document/)).toHaveCount(0);
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { landmark: 'group', labelledBy: labelId },
        {
          children: [
            node(
              'list-inset-control',
              { sides: 'trl' },
              {
                children: [
                  node('text#FieldLabel', {
                    children: 'Needed By',
                    id: labelId,
                  }),
                ],
              },
            ),
            node('content-item', { children: date }),
          ],
        },
      ),
      node(
        'list-inset-control',
        { sides: 'trl' },
        {
          children: [node('text-field', { label: 'Needed By', value: date })],
        },
      ),
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

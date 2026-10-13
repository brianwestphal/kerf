import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

// Doctor's internal source checker has no public declaration contract.
// @ts-expect-error JavaScript-only internal module
import * as copy from '../../doctor/copy-capitalization-checks.mjs';
import { UI_DOCTOR_RULES } from '../../doctor/index.mjs';

const { checkCopyCapitalization, titleStyleLabels, titleStyleViolation } =
  copy as {
    checkCopyCapitalization: (
      root: string,
      inputs: string[],
      selected?: string[],
    ) => Promise<
      {
        id: string;
        severity: string;
        message: string;
        action: string;
        location: { file: string; line: number };
      }[]
    >;
    titleStyleLabels: (
      file: string,
      source: string,
    ) => {
      text: string;
      display?: string;
      owner: string;
      line: number;
    }[];
    titleStyleViolation: (
      text: string,
    ) => { words: string[]; suggestion: string } | null;
  };

describe('titleStyleViolation', () => {
  test.each([
    'Save Draft',
    'Add to Favorites',
    'Don’t Save',
    'Export a Document as a PDF',
    'How to Start Your Computer',
    'Log In to the Server',
    'Back to Inbox',
    'Restore iPhone from a Backup',
    'Built-in Templates',
    'High-Level Events',
    'New Ticket…',
    'Save As…',
    'Sort By',
    'Collaborate with Others',
    'What to Do If Your iPhone Is Lost',
    'Settings: The Basics',
    'Updating Tickets… 3 of 12',
    'Edge-to-Edge Table, Deep Inset',
    'Up-to-Date Records',
  ])('accepts title style: %s', (text) => {
    expect(titleStyleViolation(text)).toBeNull();
  });

  test.each([
    ['iOS Settings'],
    ['macOS Release Notes'],
    ['Upgrade to GPT-5.6'],
    ['Open URL'],
    ['API Keys'],
    ['Edit config.json'],
    ['Q3 Release'],
    ['TICKET-123'],
    ['Visit example.com'],
    ['E-mail Address'],
  ])('ignores brands, acronyms, numbers, and code: %s', (text) => {
    expect(titleStyleViolation(text)).toBeNull();
  });

  test.each([
    'Release tasks could not be refreshed.',
    'Are you sure you want to quit?',
    'Saved!',
    '',
    'A label that keeps going well past anything a person would ever put on a single interface button',
  ])('leaves sentences and prose alone: %s', (text) => {
    expect(titleStyleViolation(text)).toBeNull();
  });

  test.each([
    ['Save draft', 'Save Draft', ['draft']],
    ['workspace settings', 'Workspace Settings', ['workspace', 'settings']],
    ['Back to inbox', 'Back to Inbox', ['inbox']],
    ['Log in', 'Log In', ['in']],
    ['Save as…', 'Save As…', ['as']],
    ['the Basics', 'The Basics', ['the']],
    ['Settings: the Basics', 'Settings: The Basics', ['the']],
    ['Pop-up Menu', 'Pop-Up Menu', ['Pop-up']],
    ['Up to date', 'Up to Date', ['date']],
    ['Show details for iOS', 'Show Details for iOS', ['details']],
    ['Open (beta) features', 'Open (Beta) Features', ['beta', 'features']],
    ['Edge-to-edge table', 'Edge-to-Edge Table', ['Edge-to-edge', 'table']],
  ])('reports %s', (text, suggestion, words) => {
    expect(titleStyleViolation(text)).toEqual({ words, suggestion });
  });
});

describe('titleStyleLabels', () => {
  const labels = (source: string) =>
    titleStyleLabels('view.tsx', source).map(
      ({ owner, text, display }) => `${owner}: ${display ?? text}`,
    );

  test('reads title-style props, entries, and button text', () => {
    expect(
      labels(`
        const items = [
          { label: 'Copy link', action: 'copy' },
          { kind: 'heading', label: 'Sort by' },
          { label: 'More', submenu: [{ label: 'Move to trash' }] },
        ];
        export const View = () => (
          <section>
            <ToolbarText text="Workspace settings" headingLevel={2} />
            <Toolbar title={<ToolbarText text="Project tickets" />} />
            <Toolbar leading={<ToolbarText text="Recent activity" />} />
            <ListHeader label="Saved projects" />
            <PopupMenu text="Sort choices" items={items} />
            <SegmentedControl id="v" label="View" value="a" choices={[{ value: 'a', label: 'List view' }]} />
            <EmptyState title="No release tasks" />
            <wa-button>Open dialog</wa-button>
            <button type="button"><LucideIcon node={plus} />New task</button>
            <FieldLabel>Needed by</FieldLabel>
            <button type="button" aria-label="Add project"><LucideIcon node={plus} /></button>
            <wa-button aria-label="Refresh tickets"><LucideIcon node={refresh} /></wa-button>
            <IconButton label="Browse for a folder" icon={folder} action="browse" />
            <IconToggleButton label="Show conversation" icon={chat} pressed={false} action="chat" />
            <PopupMenu label="More actions" items={items} />
            <SplitButton label="Publish" optionsLabel="Publish options" action="a" optionsAction="b" />
            <TokenSearchField id="s" label="Search" clearLabel="Clear search" />
          </section>
        );
      `),
    ).toEqual([
      'ToolbarText text: Workspace settings',
      'ToolbarText text: Project tickets',
      'ToolbarText text: Recent activity',
      'ListHeader label: Saved projects',
      'PopupMenu text: Sort choices',
      'PopupMenu items: Copy link',
      'PopupMenu items: Sort by',
      'PopupMenu items: More',
      'PopupMenu items: Move to trash',
      'SegmentedControl choices: List view',
      'EmptyState title: No release tasks',
      '<wa-button> text: Open dialog',
      '<button> text: New task',
      'FieldLabel: Needed by',
      '<button> aria-label: Add project',
      '<wa-button> aria-label: Refresh tickets',
      'IconButton label: Browse for a folder',
      'IconToggleButton label: Show conversation',
      'PopupMenu label: More actions',
      'PopupMenu items: Copy link',
      'PopupMenu items: Sort by',
      'PopupMenu items: More',
      'PopupMenu items: Move to trash',
      'SplitButton label: Publish',
      'SplitButton optionsLabel: Publish options',
      'TokenSearchField clearLabel: Clear search',
    ]);
  });

  test('reads catalog example and stack labels but not their notes', () => {
    expect(
      labels(`
        export const Demo = () => (
          <CatalogExampleStack label="Toolbar variants">
            <CatalogExample label="Heading identity stays whole" note="The title keeps its first line.">
              <ContentItem title="Open the ticket" ariaLabel="Build Output" />
            </CatalogExample>
            <CatalogExample label={\`\${name} distribution\`} />
          </CatalogExampleStack>
        );
      `),
    ).toEqual([
      'CatalogExampleStack label: Toolbar variants',
      'CatalogExample label: Heading identity stays whole',
      'CatalogExample label: ${name} distribution',
    ]);
  });

  test('reads template literals and judges only their static words', () => {
    const found = titleStyleLabels(
      'view.tsx',
      `
        export const View = () => (
          <>
            <IconButton label={\`Edit \${shortcut.name} shortcut\`} />
            <IconButton label={\`Reset \${shortcut.name} Shortcut\`} />
            <Toolbar label={\`\${name} for \${owner}\`} />
            <ListHeader label={\`\${count}s in the \${place}\`} />
            <section aria-label={\`the \${region}\`} />
            <StateBanner title={\`\${tone} banner\`} />
            <EmptyState title={\`\${count} tasks could not load.\`} />
            <LoadingSpinner label={\`Loading \${name} preview\`} />
          </>
        );
      `,
    );
    expect(found.map(({ owner, display }) => `${owner}: ${display}`)).toEqual([
      'IconButton label: Edit ${shortcut.name} shortcut',
      'IconButton label: Reset ${shortcut.name} Shortcut',
      'Toolbar label: ${name} for ${owner}',
      'ListHeader label: ${count}s in the ${place}',
      '<section> aria-label: the ${region}',
      'StateBanner title: ${tone} banner',
      'EmptyState title: ${count} tasks could not load.',
    ]);
    // Interpolated values are never judged and a word touching one is
    // skipped, while static words keep their first/last position rules.
    expect(
      found.map(({ text }) => titleStyleViolation(text)?.words ?? null),
    ).toEqual([['shortcut'], null, null, null, ['the'], ['banner'], null]);
  });

  test('reads panel toolbar toggle names from object literals and JSX', () => {
    expect(
      labels(`
        const drawer = { action: 'toggle-output', name: 'build output' };
        export const View = () => (
          <Workbench
            leftRail={{ label: 'Navigator', toolbar: { label: 'Navigator Header', toggle: { action: 'toggle-nav', name: 'navigator' } } }}
            bottomDrawer={{ label: 'Output', toolbar: { label: 'Output Header', toggle: drawer } }}
          />
        );
        export const Panel = () => (
          <CollapsiblePanel id="p" side="left" toggle={{ action: 'toggle-p', name: 'Inspector' }} />
        );
        const notAPanel = { toggle: { name: 'lowercase setting' } };
        const dynamic = { toggle: { action: 'a', name: title } };
      `).filter((label) => label.startsWith('panel toggle name')),
    ).toEqual([
      'panel toggle name: navigator',
      'panel toggle name: build output',
      'panel toggle name: Inspector',
    ]);
  });

  test('reads region and landmark names', () => {
    expect(
      labels(`
        const views = [
          {
            id: 'inbox',
            title: 'Inbox',
            toolbar: { label: 'Inbox header' },
            bottomToolbar: { label: 'Inbox actions' },
            pane: { contentLabel: 'Inbox messages' },
          },
        ];
        export const View = () => (
          <main aria-label="Ticket workspace">
            <Pane label="Workspace pages" contentLabel="Page list" />
            <Workbench
              label="Ticket workbench"
              leftRail={{ label: 'File navigator', toolbar: { label: 'Navigator header' }, pane: { contentLabel: 'Project files' } }}
              mainToolbar={{ label: 'Editor header' }}
              mainBottomToolbar={{ label: 'Editor footer' }}
              mainPane={{ contentLabel: 'Editor content' }}
            />
            <Toolbar label="Release toolbar" />
            <ToolbarControlGroup label="View actions" />
            <SunkenPanel ariaLabel="Build output" />
            <List ariaLabel="Saved projects" />
            <TabBar label="Open documents" />
            <NavStack label="Mail stack" views={views} bottomToolbar={{ label: 'Mail actions' }} />
            <CollapsiblePanel id="p" side="left" label="Side navigation" toolbar={{ label: 'Side header' }} bottomToolbar={{ label: 'Side footer' }} pane={{ contentLabel: 'Side content' }} />
            <FloatingToolbar label="Drawer controls" />
            <ResizableRegion label="Detail region" />
            <section aria-label="Task details" />
            <nav aria-label="Primary navigation" />
            <aside aria-label="Related tickets" />
            <div role="region" aria-label="Live preview" />
            <form aria-label="Search filters" />
          </main>
        );
      `),
    ).toEqual([
      '<main> aria-label: Ticket workspace',
      'Pane label: Workspace pages',
      'Pane contentLabel: Page list',
      'Workbench label: Ticket workbench',
      'Workbench leftRail: File navigator',
      'Workbench leftRail: Navigator header',
      'Workbench leftRail: Project files',
      'Workbench mainToolbar: Editor header',
      'Workbench mainBottomToolbar: Editor footer',
      'Workbench mainPane: Editor content',
      'Toolbar label: Release toolbar',
      'ToolbarControlGroup label: View actions',
      'SunkenPanel ariaLabel: Build output',
      'List ariaLabel: Saved projects',
      'TabBar label: Open documents',
      'NavStack label: Mail stack',
      'NavStack views: Inbox',
      'NavStack views: Inbox header',
      'NavStack views: Inbox actions',
      'NavStack views: Inbox messages',
      'NavStack bottomToolbar: Mail actions',
      'CollapsiblePanel label: Side navigation',
      'CollapsiblePanel toolbar: Side header',
      'CollapsiblePanel bottomToolbar: Side footer',
      'CollapsiblePanel pane: Side content',
      'FloatingToolbar label: Drawer controls',
      'ResizableRegion label: Detail region',
      '<section> aria-label: Task details',
      '<nav> aria-label: Primary navigation',
      '<aside> aria-label: Related tickets',
      '<div> aria-label: Live preview',
      '<form> aria-label: Search filters',
    ]);
  });

  test('reads raw Web Awesome field and radio-group labels, not option text', () => {
    expect(
      labels(`
        export const Form = () => (
          <form>
            <wa-input label="Project name" placeholder="Search tickets" />
            <wa-select label="Release channel" />
            <wa-textarea label="Release notes" />
            <wa-radio-group label="Notify me">
              <wa-radio value="all">Every new reply</wa-radio>
            </wa-radio-group>
            <wa-checkbox label="Show hidden files" />
            <wa-switch label="Sync over cellular" />
            <wa-radio label="Only mentions" />
          </form>
        );
      `),
    ).toEqual([
      '<wa-input> label: Project name',
      '<wa-select> label: Release channel',
      '<wa-textarea> label: Release notes',
      '<wa-radio-group> label: Notify me',
    ]);
  });

  test('never reads sentence-style text, status labels, or a labeled button’s aria-label', () => {
    expect(
      labels(`
        export const View = ({ name }: { name: string }) => (
          <section>
            <ToolbarText text="Saved just now" size="small" />
            <Toolbar label="Footer" leading={<ToolbarText text="12 updates" size="small" />} />
            <ToolbarText text="Workspace" description="Edit your workspace settings" headingLevel={2} />
            <ListItem label="Show hidden files" />
            <SegmentedControl id="v" label="Layout options" value="a" choices={[{ value: 'a', label: 'List', title: 'Show as a list' }]} />
            <StateBanner title={name} detail="Changes sync when you reconnect." />
            <wa-checkbox>Notify me about replies</wa-checkbox>
            <wa-button>Hello {name}</wa-button>
            <button type="button" aria-label="Close dialog">Close</button>
            <button type="button" aria-label={label}><LucideIcon node={x} /></button>
            <LoadingSpinner label="Loading tickets" />
            <Skeleton label="Loading the release list" />
            <div aria-label="Selection summary" />
            <Pane label={name} />
            <section aria-label="The list refreshes when you reconnect." />
          </section>
        );
      `),
    ).toEqual([
      'Toolbar label: Footer',
      'ToolbarText text: Workspace',
      'SegmentedControl choices: List',
      '<button> text: Close',
      '<section> aria-label: The list refreshes when you reconnect.',
    ]);
  });
});

describe('checkCopyCapitalization', () => {
  test('reports KUI-D040 warnings with a repaired label and skips tests', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'kerf-doctor-copy-'));
    try {
      await mkdir(resolve(root, 'src'));
      const files = [
        [
          'src/view.tsx',
          [
            'export const View = () => (',
            '  <section>',
            '    <wa-button>Save draft</wa-button>',
            '    <wa-button>Save Draft</wa-button>',
            '    <ListHeader label="iOS Builds" />',
            '  </section>',
            ');',
          ].join('\n'),
        ],
        ['src/view.test.tsx', '<wa-button>Save draft</wa-button>;'],
        ['src/view.ts', 'export const label = "save draft";'],
        ['src/other.tsx', '<ListHeader label="Needs attention" />;'],
        [
          'src/panel.tsx',
          "export const panel = { toggle: { action: 'toggle-output', name: 'output' } };",
        ],
        [
          'src/template.tsx',
          'export const Row = () => <IconButton label={`Edit ${shortcut.name} shortcut`} />;',
        ],
      ] as const;
      for (const [name, source] of files)
        await writeFile(resolve(root, name), source);
      const inputs = files.map(([name]) => resolve(root, name));
      const findings = await checkCopyCapitalization(root, inputs);
      expect(
        findings.map(
          (item) =>
            `${item.id} ${item.severity} ${item.location.file}:${item.location.line}`,
        ),
      ).toEqual([
        'KUI-D040 warning src/view.tsx:3',
        'KUI-D040 warning src/other.tsx:1',
        'KUI-D040 warning src/panel.tsx:1',
        'KUI-D040 warning src/template.tsx:1',
      ]);
      expect(findings[2]?.message).toBe(
        'panel toggle name "output" is not title-style capitalized ("output").',
      );
      expect(findings[0]?.message).toBe(
        '<wa-button> text "Save draft" is not title-style capitalized ("draft").',
      );
      expect(findings[0]?.action).toContain('Use "Save Draft"');
      expect(findings[3]?.message).toBe(
        'IconButton label "Edit ${shortcut.name} shortcut" is not title-style capitalized ("shortcut").',
      );
      expect(findings[3]?.action).toContain(
        'Use "Edit ${shortcut.name} Shortcut"',
      );
      expect(
        (await checkCopyCapitalization(root, inputs, ['src/view.tsx'])).map(
          (item) => item.location.file,
        ),
      ).toEqual(['src/view.tsx']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('is registered as a warning-level doctor rule', () => {
    expect(UI_DOCTOR_RULES['KUI-D040']).toEqual({
      severity: 'warning',
      title: 'Visible label is not title-style capitalized',
    });
  });
});

describe('UX demo copy', () => {
  const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const demoSources = async () =>
    (await readdir(resolve(uiRoot, 'ux-demo'), { recursive: true }))
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => resolve(uiRoot, 'ux-demo', name));

  test('every demo and recipe label, including example captions, is title style', async () => {
    const findings = await checkCopyCapitalization(uiRoot, await demoSources());
    expect(findings.map((item) => item.message)).toEqual([]);
  });

  test('demo content item titles are title style', async () => {
    // DemoContentItem is a private demo helper, so the shipped doctor does not
    // know it; its visible `title` is the name an item shows.
    const titles: string[] = [];
    for (const file of await demoSources()) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(
        /<DemoContentItem\b[^>]*?\btitle="([^"]+)"/g,
      ))
        titles.push(match[1]!);
      // The Workbench, CollapsiblePanel, and TabNavigator demos build their
      // regions and scenes through local helpers whose first argument is the
      // visible region title.
      for (const match of source.matchAll(
        /\b(?:content|region|scene)\('([^']+)'/g,
      ))
        titles.push(match[1]!);
    }
    expect(titles.length).toBeGreaterThan(5);
    expect(
      titles.filter((title) => titleStyleViolation(title) !== null),
    ).toEqual([]);
  });

  test('demo progress labels are sentence style with a trailing ellipsis', async () => {
    // writing.md: LoadingSpinner and Skeleton labels name the operation under
    // way, so they end with "…" — literal or template-literal alike.
    const labels: string[] = [];
    for (const file of await demoSources()) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(
        /<(?:LoadingSpinner|Skeleton)\b[^>]*?\blabel=(?:"([^"]+)"|\{`([^`]+)`\})/g,
      ))
        labels.push((match[1] ?? match[2])!);
    }
    expect(labels.length).toBeGreaterThan(5);
    expect(labels.filter((label) => !label.endsWith('…'))).toEqual([]);
  });
});

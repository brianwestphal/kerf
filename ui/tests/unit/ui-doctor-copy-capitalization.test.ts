import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

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
    ) => { text: string; owner: string; line: number }[];
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
  ])('reports %s', (text, suggestion, words) => {
    expect(titleStyleViolation(text)).toEqual({ words, suggestion });
  });
});

describe('titleStyleLabels', () => {
  const labels = (source: string) =>
    titleStyleLabels('view.tsx', source).map(
      ({ owner, text }) => `${owner}: ${text}`,
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

  test('never reads sentence-style text, region names, or a labeled button’s aria-label', () => {
    expect(
      labels(`
        export const View = ({ name }: { name: string }) => (
          <section>
            <ToolbarText text="Saved just now" size="small" />
            <Toolbar label="Footer" leading={<ToolbarText text="12 updates" size="small" />} />
            <ToolbarText text="Workspace" description="Edit your workspace settings" headingLevel={2} />
            <Pane label="Workspace pages" />
            <ListItem label="Show hidden files" />
            <SegmentedControl id="v" label="Layout options" value="a" choices={[{ value: 'a', label: 'List', title: 'Show as a list' }]} />
            <StateBanner title={name} detail="Changes sync when you reconnect." />
            <wa-checkbox>Notify me about replies</wa-checkbox>
            <wa-button>Hello {name}</wa-button>
            <button type="button" aria-label="Close dialog">Close</button>
            <button type="button" aria-label={label}><LucideIcon node={x} /></button>
            <section aria-label="Task workspace" />
            <Workbench label="Ticket workbench" />
            <ToolbarControlGroup label="View actions" />
            <wa-input label="Project name" placeholder="Search tickets" />
          </section>
        );
      `),
    ).toEqual([
      'ToolbarText text: Workspace',
      'SegmentedControl choices: List',
      '<button> text: Close',
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
      ]);
      expect(findings[0]?.message).toBe(
        '<wa-button> text "Save draft" is not title-style capitalized ("draft").',
      );
      expect(findings[0]?.action).toContain('Use "Save Draft"');
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

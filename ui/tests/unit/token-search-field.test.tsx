import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { mount, signal } from 'kerfjs';
import { CircleHelp } from 'lucide';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LucideIcon } from '../../src/lucide-icon.js';
import {
  placeTokenSearchCaret,
  readTokenSearchField,
  TokenSearchField,
  type TokenSearchToken,
} from '../../src/token-search-field.js';
import { ToolbarControlGroup } from '../../src/toolbar-control-group.js';

const asHtml = (value: unknown) => String(value);

describe('TokenSearchField', () => {
  beforeEach(() => document.body.replaceChildren());

  it('renders a visible form label, hint, and required searchbox without toolbar geometry', () => {
    const html = asHtml(
      TokenSearchField({
        id: 'saved-query',
        label: 'Search query',
        presentation: 'form-field',
        hint: 'Add filters to narrow the view.',
        required: true,
      }),
    );
    expect(html).toContain('class="kui-token-search__field"');
    expect(html).toContain('id="saved-query-label"');
    expect(html).toContain('data-token-search-form-label="saved-query"');
    expect(html).toContain(
      'class="kui-token-search__field-required" aria-hidden="true"',
    );
    expect(html).toContain('id="saved-query-hint"');
    expect(html).toContain('aria-labelledby="saved-query-label"');
    expect(html).toContain('aria-describedby="saved-query-hint"');
    expect(html).toContain('aria-required="true"');
    expect(html).not.toContain('aria-label="Search query"');
    expect(html).not.toContain('kui-toolbar');

    const optional = asHtml(
      TokenSearchField({
        id: 'optional-query',
        label: 'Optional query',
        presentation: 'form-field',
      }),
    );
    expect(optional).toContain('aria-labelledby="optional-query-label"');
    expect(optional).not.toContain('aria-describedby');
    expect(optional).not.toContain('aria-required');
    expect(optional).not.toContain('kui-token-search__field-hint');
  });

  it('renders ordered, editable atomic tokens inside a labeled searchbox', () => {
    const tokens: TokenSearchToken[] = [
      {
        value: 'tag:server',
        label: 'tag:server',
        offset: 4,
        accessibleLabel: 'server tag',
      },
      { value: 'is:active', label: 'is:active', offset: 0 },
    ];
    const html = asHtml(
      TokenSearchField({
        id: 'tickets',
        label: 'Search tickets',
        query: 'NOT  AND parser',
        tokens,
        autofocus: true,
        editorAttributes: { 'data-workspace-search': 'true' },
      }),
    );
    expect(html).toContain(
      'data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"',
    );
    expect(html).toContain(
      'data-workspace-search="true" class="kui-token-search__editor"',
    );
    expect(html).toContain('data-has-trailing="false"');
    expect(html).toContain(
      'role="searchbox" aria-label="Search tickets" contenteditable="true" spellcheck="false" autofocus',
    );
    expect(html).toMatch(
      /data-token-value="is:active".*NOT .*data-token-value="tag:server".* AND parser/s,
    );
    expect(html).toContain('aria-label="Edit server tag"');
    expect(html).toContain('aria-label="Remove server tag"');
    expect(html).toContain(
      'data-action="clear-token-search" aria-label="Clear search"',
    );
  });

  it('clamps token offsets and preserves input order for ties', () => {
    const html = asHtml(
      TokenSearchField({
        id: 'bounds',
        label: 'Bounded search',
        query: 'middle',
        tokens: [
          { value: 'negative', label: 'Negative', offset: -10 },
          { value: 'late-one', label: 'Late one', offset: 100 },
          { value: 'late-two', label: 'Late two' },
        ],
      }),
    );
    expect(html).toMatch(/Negative.*middle.*Late one.*Late two/s);
  });

  it('marks expanded fill without changing a collapsed search action', () => {
    const expanded = asHtml(
      TokenSearchField({
        id: 'fill-search',
        label: 'Fill search',
        collapsible: true,
        expanded: true,
        fill: true,
        presentation: 'toolbar-group',
      }),
    );
    expect(expanded).toContain('data-fill="true"');
    expect(expanded).toContain('data-expanded="true"');
    const collapsed = asHtml(
      TokenSearchField({
        id: 'fill-search',
        label: 'Fill search',
        collapsible: true,
        fill: true,
        presentation: 'toolbar-group',
      }),
    );
    expect(collapsed).toContain('data-fill="true"');
    expect(collapsed).toContain('data-expanded="false"');
    expect(collapsed).toContain('class="kui-token-search__expand"');
  });

  it('supports custom actions, adornments, disabled state, and token-aware placeholders', () => {
    const html = asHtml(
      TokenSearchField({
        id: 'saved',
        label: 'Saved query',
        tokens: [{ value: 'tag:client', label: 'tag:client' }],
        disabled: true,
        leading: <span>Filter</span>,
        trailingAction: {
          icon: <LucideIcon icon={CircleHelp} name="help" />,
          label: 'Saved search help',
          action: 'show-saved-search-help',
          id: 'saved-search-help',
        },
        editAction: 'edit-filter',
        removeAction: 'remove-filter',
        clearAction: 'clear-filter',
        clearLabel: 'Clear saved query',
        className: 'compact',
      }),
    );
    expect(html).toContain('class="kui-token-search compact"');
    expect(html).toContain('data-placeholder="Add search…"');
    expect(html).toContain('aria-disabled="true" contenteditable="false"');
    expect(html.match(/ disabled/g)).toHaveLength(4);
    expect(html).toContain('data-action="edit-filter"');
    expect(html).toContain('data-action="remove-filter"');
    expect(html).toContain(
      'data-action="clear-filter" aria-label="Clear saved query"',
    );
    expect(html).toContain('<span>Filter</span>');
    expect(html).toContain('data-lucide="help"');
    expect(html).toContain('data-has-trailing="true"');
    expect(html).toContain(
      'class="kui-token-search__trailing-action" id="saved-search-help" data-action="show-saved-search-help" aria-label="Saved search help" title="Saved search help" disabled',
    );
    expect(
      asHtml(
        TokenSearchField({
          id: 'passive',
          label: 'Passive trailing',
          trailing: <span>⌘K</span>,
        }),
      ),
    ).toContain(
      '<span class="kui-token-search__trailing"><span>⌘K</span></span>',
    );
    expect(
      asHtml(
        TokenSearchField({
          id: 'empty',
          label: 'Search',
          placeholder: 'Find records',
        }),
      ),
    ).toContain('data-placeholder="Find records"');
  });

  it('pins leading, first-line, clear, and trailing content to one fixed alignment slot', async () => {
    const css = await readFile(
      resolve(import.meta.dirname, '../../src/token-search-field.css'),
      'utf8',
    );
    expect(css).toContain('--kui-token-search-line-size: remify(34px)');
    expect(css).toMatch(
      /\.kui-token-search__leading[^}]+var\(--kui-token-search-line-size\)[^}]+remify\(16px\)/s,
    );
    expect(css).toMatch(
      /\.kui-token-search__editor[^}]+min-height: var\(--kui-token-search-line-size\)[^}]+1\.35em/s,
    );
    expect(css).toMatch(
      /\.kui-token-search__clear,[^}]+height: var\(--kui-token-search-line-size\)[^}]+place-items: center/s,
    );
    expect(css).toMatch(
      /\.kui-token-search__clear \{[^}]+border-radius: var\(--kui-radius-pill\)/s,
    );
    expect(css).toContain('max-height: remify(240px)');
    expect(css).toContain(
      '.kui-token-search__suggestions:has(> :nth-child(2))',
    );
  });

  it('optionally collapses to an iconic field, stays open with content, and animates standalone or grouped', async () => {
    const collapsed = asHtml(
      TokenSearchField({
        id: 'find',
        label: 'Find records',
        collapsible: true,
        expandAction: 'open-find',
      }),
    );
    expect(collapsed).toContain(
      'data-component="token-search-field" data-token-search-id="find" data-disabled="false" data-collapsible="true" data-expanded="false"',
    );
    expect(collapsed).toContain(
      'class="kui-token-search__expand" data-action="open-find" aria-label="Find records" title="Find records"',
    );
    expect(collapsed).not.toContain('role="searchbox"');

    const focused = asHtml(
      TokenSearchField({
        id: 'find',
        label: 'Find records',
        collapsible: true,
        expanded: true,
        presentation: 'toolbar-group',
      }),
    );
    expect(focused).toContain('data-collapsible="true" data-expanded="true"');
    expect(focused).toContain('data-presentation="toolbar-group"');
    expect(focused).toContain('role="searchbox"');
    expect(focused).not.toContain('data-action="expand-token-search"');

    const grouped = asHtml(
      ToolbarControlGroup({
        children: TokenSearchField({
          id: 'group-find',
          label: 'Find grouped records',
          collapsible: true,
          expanded: true,
          presentation: 'toolbar-group',
        }),
        content: 'search',
        focusRing: 'halo',
        expanded: true,
      }),
    );
    expect(grouped).toContain(
      'data-expanded="true" data-single="false" data-shape="pill" data-size="default" data-density="comfortable" data-content="search" data-focus-ring="halo"',
    );

    const populated = asHtml(
      TokenSearchField({
        id: 'find',
        label: 'Find records',
        collapsible: true,
        query: 'priority',
      }),
    );
    expect(populated).toContain('data-collapsible="true" data-expanded="true"');
    expect(populated).toContain('role="searchbox"');

    const fieldCss = await readFile(
      resolve(import.meta.dirname, '../../src/token-search-field.css'),
      'utf8',
    );
    const groupCss = await readFile(
      resolve(import.meta.dirname, '../../src/toolbar-control-group.css'),
      'utf8',
    );
    expect(fieldCss).toMatch(
      /\.kui-token-search\[data-collapsible="true"\][^{]*\{[^}]+width 0\.25s ease/s,
    );
    expect(fieldCss).toMatch(
      /\.kui-token-search\[data-presentation="toolbar-group"\]\[data-collapsible="true"\]/,
    );
    expect(groupCss).toMatch(
      /\.kui-toolbar-control-group\[data-content="search"\][^{]*\{[^}]+width 0\.25s ease/s,
    );
    expect(fieldCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]+transition-duration: 0s/,
    );
  });

  it('reads browser-edited text and token offsets without chip button text', () => {
    document.body.innerHTML = asHtml(
      TokenSearchField({
        id: 'tickets',
        label: 'Search tickets',
        query: 'NOT  AND parser',
        tokens: [{ value: 'tag:server', label: 'tag:server', offset: 4 }],
      }),
    );
    const editor = document.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    editor.append(
      document.createElement('br'),
      document.createTextNode('owner'),
    );
    expect(
      readTokenSearchField(editor, [
        { value: 'tag:server', label: 'Server', accessibleLabel: 'server tag' },
      ]),
    ).toEqual({
      query: 'NOT  AND parser owner',
      tokens: [
        {
          value: 'tag:server',
          label: 'Server',
          accessibleLabel: 'server tag',
          offset: 4,
        },
      ],
    });
    editor.querySelector<HTMLElement>(
      '[data-token-value="tag:server"]',
    )!.dataset.tokenValue = 'status:open';
    expect(readTokenSearchField(editor).tokens).toEqual([
      { value: 'status:open', label: 'status:open', offset: 4 },
    ]);
    delete editor.querySelector<HTMLElement>(
      '[data-component="token-search-token"]',
    )!.dataset.tokenValue;
    editor.prepend(document.createComment('ignored'));
    expect(readTokenSearchField(editor).tokens).toEqual([]);
  });

  it('keeps DOM-owned text across query renders and rebuilds the editor on a new revision', () => {
    const tokens = [{ value: 'tag:docs', label: 'tag:docs', offset: 0 }];
    const query = signal('');
    const revision = signal<number | undefined>(undefined);
    const root = document.createElement('div');
    document.body.append(root);
    const stop = mount(root, () =>
      TokenSearchField({
        id: 'reseed',
        label: 'Search',
        query: query.value,
        tokens,
        revision: revision.value,
      }),
    );
    const editor = () =>
      root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const first = editor();
    expect(first.dataset.key).toBe('reseed:tag:docs');
    // A query render with unchanged tokens leaves the typed-into editor alone.
    query.value = 'typed';
    expect(editor()).toBe(first);
    expect(readTokenSearchField(editor()).query).not.toContain('typed');
    // A new revision replaces the text programmatically.
    query.value = '() AND (saved)';
    revision.value = 1;
    expect(editor()).not.toBe(first);
    expect(editor().dataset.key).toBe('reseed@1:tag:docs');
    expect(readTokenSearchField(editor())).toMatchObject({
      query: '() AND (saved)',
      tokens: [{ value: 'tag:docs', offset: 0 }],
    });
    stop();
  });

  it('places the caret at a text offset or at the end while skipping chip text', () => {
    document.body.innerHTML = asHtml(
      TokenSearchField({
        id: 'tickets',
        label: 'Search tickets',
        query: 'beforeafter',
        tokens: [{ value: 'tag:server', label: 'tag:server', offset: 6 }],
      }),
    );
    const editor = document.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    placeTokenSearchCaret(editor, 3);
    expect(document.activeElement).toBe(editor);
    expect(globalThis.getSelection()?.anchorNode?.textContent).toBe('before');
    expect(globalThis.getSelection()?.anchorOffset).toBe(3);
    placeTokenSearchCaret(editor);
    expect(globalThis.getSelection()?.getRangeAt(0).collapsed).toBe(true);
    placeTokenSearchCaret(editor, 100);
    expect(globalThis.getSelection()?.getRangeAt(0).collapsed).toBe(true);

    const emptyEditor = document.createElement('div');
    emptyEditor.innerHTML = asHtml(
      TokenSearchField({
        id: 'empty-token',
        label: 'Empty token',
        tokens: [{ value: 'tag:a', label: 'tag:a', offset: 0 }],
      }),
    );
    const nestedEditor = emptyEditor.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    document.body.append(nestedEditor);
    placeTokenSearchCaret(nestedEditor, 0);
    expect(globalThis.getSelection()?.anchorOffset).toBe(0);

    const getSelection = vi
      .spyOn(globalThis, 'getSelection')
      .mockReturnValue(null);
    expect(() => placeTokenSearchCaret(nestedEditor)).not.toThrow();
    getSelection.mockRestore();
  });
});

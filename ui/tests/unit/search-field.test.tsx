import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { mount, signal } from 'kerfjs';
import { CircleHelp } from 'lucide';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolbarControlGroup } from '../../src/components/actions/toolbar-control-group/toolbar-control-group.js';
import {
  placeSearchFieldCaret,
  readSearchField,
  SearchField,
  type SearchFieldToken,
} from '../../src/components/forms/search-field/search-field.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';

const asHtml = (value: unknown) => String(value);

describe('SearchField', () => {
  beforeEach(() => document.body.replaceChildren());

  it('renders a visible form label, hint, and required searchbox without toolbar geometry', () => {
    const html = asHtml(
      SearchField({
        id: 'saved-query',
        label: 'Search Query',
        presentation: 'form-field',
        hint: 'Add filters to narrow the view.',
        required: true,
      }),
    );
    expect(html).toContain('class="kui-search-field__field"');
    expect(html).toContain('id="saved-query-label"');
    expect(html).toContain('data-search-field-form-label="saved-query"');
    expect(html).toContain(
      'class="kui-search-field__field-required" aria-hidden="true"',
    );
    expect(html).toContain('id="saved-query-hint"');
    expect(html).toContain('aria-labelledby="saved-query-label"');
    expect(html).toContain('aria-describedby="saved-query-hint"');
    expect(html).toContain('aria-required="true"');
    expect(html).not.toContain('aria-label="Search Query"');
    expect(html).not.toContain('kui-toolbar');

    const optional = asHtml(
      SearchField({
        id: 'optional-query',
        label: 'Optional query',
        presentation: 'form-field',
      }),
    );
    expect(optional).toContain('aria-labelledby="optional-query-label"');
    expect(optional).not.toContain('aria-describedby');
    expect(optional).not.toContain('aria-required');
    expect(optional).not.toContain('kui-search-field__field-hint');
  });

  it('places className on the rendered root in every presentation', () => {
    const form = asHtml(
      SearchField({
        id: 'form-query',
        label: 'Search',
        presentation: 'form-field',
        className: 'query-colors',
      }),
    );
    expect(form).toContain('class="kui-search-field__field query-colors"');
    expect(form).toContain('class="kui-search-field"');
    expect(form).not.toContain('class="kui-search-field query-colors"');
    const standalone = asHtml(
      SearchField({
        id: 'plain-query',
        label: 'Search',
        className: 'query-colors',
      }),
    );
    expect(standalone).toContain('class="kui-search-field query-colors"');
  });

  it('renders ordered, editable atomic tokens inside a labeled searchbox', () => {
    const tokens: SearchFieldToken[] = [
      {
        value: 'tag:server',
        label: 'tag:server',
        offset: 4,
        accessibleLabel: 'server tag',
      },
      { value: 'is:active', label: 'is:active', offset: 0 },
    ];
    const html = asHtml(
      SearchField({
        id: 'tickets',
        label: 'Search Tickets',
        query: 'NOT  AND parser',
        tokens,
        autofocus: true,
        editorAttributes: { 'data-workspace-search': 'true' },
      }),
    );
    expect(html).toContain(
      'data-component="search-field" data-search-field-id="tickets" data-disabled="false"',
    );
    expect(html).toContain(
      'data-workspace-search="true" class="kui-search-field__editor"',
    );
    expect(html).toContain('data-has-trailing="false"');
    expect(html).toContain(
      'role="searchbox" aria-label="Search Tickets" contenteditable="true" spellcheck="false" autofocus',
    );
    expect(html).toMatch(
      /data-token-value="is:active".*NOT .*data-token-value="tag:server".* AND parser/s,
    );
    expect(html).toContain('aria-label="Edit server tag"');
    expect(html).toContain('aria-label="Remove server tag"');
    expect(html).toContain(
      'data-action="clear-search-field" aria-label="Clear Search"',
    );
  });

  it('clamps token offsets and preserves input order for ties', () => {
    const html = asHtml(
      SearchField({
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
      SearchField({
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
      SearchField({
        id: 'fill-search',
        label: 'Fill search',
        collapsible: true,
        fill: true,
        presentation: 'toolbar-group',
      }),
    );
    expect(collapsed).toContain('data-fill="true"');
    expect(collapsed).toContain('data-expanded="false"');
    expect(collapsed).toContain('class="kui-search-field__expand"');
  });

  it('renders a stateful trailing action with ARIA state and domain metadata', () => {
    const disclosure = asHtml(
      SearchField({
        id: 'help',
        label: 'Search',
        query: 'status:open',
        trailingAction: {
          icon: <LucideIcon icon={CircleHelp} name="help" />,
          label: 'Search Help',
          action: 'toggle-search-help',
          expanded: true,
          controls: 'search-help-surface',
          haspopup: 'dialog',
          attributes: { 'data-help-topic': 'syntax' },
        },
      }),
    );
    expect(disclosure).toContain(
      '<button data-help-topic="syntax" type="button" class="kui-search-field__trailing-action" data-action="toggle-search-help" aria-label="Search Help" aria-expanded="true" aria-controls="search-help-surface" aria-haspopup="dialog" title="Search Help">',
    );
    expect(disclosure).not.toContain('aria-pressed');
    // The clear button precedes the trailing action in the same row.
    expect(disclosure.indexOf('kui-search-field__clear')).toBeLessThan(
      disclosure.indexOf('kui-search-field__trailing-action'),
    );
    const collapsedDisclosure = asHtml(
      SearchField({
        id: 'help',
        label: 'Search',
        presentation: 'form-field',
        trailingAction: {
          icon: <LucideIcon icon={CircleHelp} name="help" />,
          label: 'Search Help',
          action: 'toggle-search-help',
          expanded: false,
        },
      }),
    );
    expect(collapsedDisclosure).toContain('aria-expanded="false"');
    const toggle = asHtml(
      SearchField({
        id: 'case',
        label: 'Search',
        trailingAction: {
          icon: <LucideIcon icon={CircleHelp} name="help" />,
          label: 'Match Case',
          action: 'toggle-match-case',
          pressed: false,
        },
      }),
    );
    expect(toggle).toContain('aria-pressed="false"');
    expect(toggle).not.toContain('aria-expanded');
  });

  it('supports custom actions, adornments, disabled state, and token-aware placeholders', () => {
    const html = asHtml(
      SearchField({
        id: 'saved',
        label: 'Saved query',
        tokens: [{ value: 'tag:client', label: 'tag:client' }],
        disabled: true,
        leading: <span>Filter</span>,
        trailingAction: {
          icon: <LucideIcon icon={CircleHelp} name="help" />,
          label: 'Saved Search Help',
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
    expect(html).toContain('class="kui-search-field compact"');
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
      'class="kui-search-field__trailing-action" id="saved-search-help" data-action="show-saved-search-help" aria-label="Saved Search Help" title="Saved Search Help" disabled',
    );
    expect(
      asHtml(
        SearchField({
          id: 'passive',
          label: 'Passive trailing',
          trailing: <span>⌘K</span>,
        }),
      ),
    ).toContain(
      '<span class="kui-search-field__trailing"><span>⌘K</span></span>',
    );
    expect(
      asHtml(
        SearchField({
          id: 'empty',
          label: 'Search',
          placeholder: 'Find Records',
        }),
      ),
    ).toContain('data-placeholder="Find Records"');
  });

  it('pins leading, first-line, clear, and trailing content to one fixed alignment slot', async () => {
    const css = await readFile(
      resolve(
        import.meta.dirname,
        '../../src/components/forms/search-field/search-field.css',
      ),
      'utf8',
    );
    expect(css).toContain('--kui-search-field-line-size: remify(34px)');
    expect(css).toMatch(
      /\.kui-search-field__leading[^}]+var\(--kui-search-field-line-size\)[^}]+remify\(16px\)/s,
    );
    expect(css).toMatch(
      /\.kui-search-field__editor[^}]+min-height: var\(--kui-search-field-line-size\)[^}]+1\.35em/s,
    );
    expect(css).toMatch(
      /\.kui-search-field__clear,[^}]+height: var\(--kui-search-field-line-size\)[^}]+place-items: center/s,
    );
    expect(css).toMatch(
      /\.kui-search-field__clear \{[^}]+border-radius: var\(--kui-radius-pill\)/s,
    );
    expect(css).toContain('max-height: remify(240px)');
    expect(css).toContain(
      '.kui-search-field__suggestions:has(> :nth-child(2))',
    );
  });

  it('optionally collapses to an iconic field, stays open with content, and animates standalone or grouped', async () => {
    const collapsed = asHtml(
      SearchField({
        id: 'find',
        label: 'Find Records',
        collapsible: true,
        expandAction: 'open-find',
      }),
    );
    expect(collapsed).toContain(
      'data-component="search-field" data-search-field-id="find" data-disabled="false" data-collapsible="true" data-expanded="false"',
    );
    expect(collapsed).toContain(
      'class="kui-search-field__expand" data-action="open-find" aria-label="Find Records" title="Find Records"',
    );
    expect(collapsed).not.toContain('role="searchbox"');

    const focused = asHtml(
      SearchField({
        id: 'find',
        label: 'Find Records',
        collapsible: true,
        expanded: true,
        presentation: 'toolbar-group',
      }),
    );
    expect(focused).toContain('data-collapsible="true" data-expanded="true"');
    expect(focused).toContain('data-presentation="toolbar-group"');
    expect(focused).toContain('role="searchbox"');
    expect(focused).not.toContain('data-action="expand-search-field"');

    const grouped = asHtml(
      ToolbarControlGroup({
        children: SearchField({
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
      SearchField({
        id: 'find',
        label: 'Find Records',
        collapsible: true,
        query: 'priority',
      }),
    );
    expect(populated).toContain('data-collapsible="true" data-expanded="true"');
    expect(populated).toContain('role="searchbox"');

    const fieldCss = await readFile(
      resolve(
        import.meta.dirname,
        '../../src/components/forms/search-field/search-field.css',
      ),
      'utf8',
    );
    const groupCss = await readFile(
      resolve(
        import.meta.dirname,
        '../../src/components/actions/toolbar-control-group/toolbar-control-group.css',
      ),
      'utf8',
    );
    expect(fieldCss).toMatch(
      /\.kui-search-field\[data-collapsible="true"\][^{]*\{[^}]+width var\(--_kui-toolbar-group-search-width-duration, 0\.25s\) ease/s,
    );
    // Every search group owns the open/close motion and zeroes the field's
    // width transition; it asks the field's editor to stay on one line while it
    // opens (KF-CXQB30). A grow group animates its flex lengths instead and
    // hands the field a basis-wide minimum (KF-50K0JM).
    expect(groupCss).toMatch(
      /\.kui-toolbar-control-group\[data-content="search"\] \{[^}]+--_kui-toolbar-group-search-width-duration: 0s;\s*--_kui-toolbar-group-search-reveal-duration: 0\.25s;/s,
    );
    expect(fieldCss).toMatch(
      /> \.kui-search-field__editor \{\s*animation: kui-search-field-reveal\s+var\(--_kui-toolbar-group-search-reveal-duration, 0s\) linear;/,
    );
    expect(fieldCss).toMatch(
      /@keyframes kui-search-field-reveal \{[^}]*\{\s*overflow-wrap: normal;\s*white-space: pre;/,
    );
    expect(groupCss).toMatch(
      /\.kui-toolbar-control-group\[data-content="search"\]\[data-sizing="grow"\] \{[^}]+--_kui-toolbar-group-search-reveal-duration: 0s;[^}]+transition-property:\s*width, flex-basis, flex-grow, min-width/s,
    );
    expect(groupCss).toMatch(
      /--_kui-toolbar-group-grow-search-min-width: calc\(\s*var\(--kui-toolbar-group-grow-basis/,
    );
    expect(fieldCss).toMatch(
      /\.kui-search-field\[data-collapsible="true"\]\[data-expanded="true"\] \{\s*min-width: var\(--_kui-toolbar-group-grow-search-min-width, 0px\);/,
    );
    expect(fieldCss).toMatch(
      /\.kui-search-field\[data-presentation="toolbar-group"\]\[data-collapsible="true"\]/,
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
      SearchField({
        id: 'tickets',
        label: 'Search Tickets',
        query: 'NOT  AND parser',
        tokens: [{ value: 'tag:server', label: 'tag:server', offset: 4 }],
      }),
    );
    const editor = document.querySelector<HTMLElement>(
      '[data-search-field-editor]',
    )!;
    editor.append(
      document.createElement('br'),
      document.createTextNode('owner'),
    );
    expect(
      readSearchField(editor, [
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
    expect(readSearchField(editor).tokens).toEqual([
      { value: 'status:open', label: 'status:open', offset: 4 },
    ]);
    delete editor.querySelector<HTMLElement>(
      '[data-component="search-field-token"]',
    )!.dataset.tokenValue;
    editor.prepend(document.createComment('ignored'));
    expect(readSearchField(editor).tokens).toEqual([]);
  });

  it('keeps DOM-owned text across query renders and rebuilds the editor on a new revision', () => {
    const tokens = [{ value: 'tag:docs', label: 'tag:docs', offset: 0 }];
    const query = signal('');
    const revision = signal<number | undefined>(undefined);
    const root = document.createElement('div');
    document.body.append(root);
    const stop = mount(root, () =>
      SearchField({
        id: 'reseed',
        label: 'Search',
        query: query.value,
        tokens,
        revision: revision.value,
      }),
    );
    const editor = () =>
      root.querySelector<HTMLElement>('[data-search-field-editor]')!;
    const first = editor();
    expect(first.dataset.key).toBe('reseed:tag:docs');
    // A query render with unchanged tokens leaves the typed-into editor alone.
    query.value = 'typed';
    expect(editor()).toBe(first);
    expect(readSearchField(editor()).query).not.toContain('typed');
    // A new revision replaces the text programmatically.
    query.value = '() AND (saved)';
    revision.value = 1;
    expect(editor()).not.toBe(first);
    expect(editor().dataset.key).toBe('reseed@1:tag:docs');
    expect(readSearchField(editor())).toMatchObject({
      query: '() AND (saved)',
      tokens: [{ value: 'tag:docs', offset: 0 }],
    });
    stop();
  });

  it('places the caret at a text offset or at the end while skipping chip text', () => {
    document.body.innerHTML = asHtml(
      SearchField({
        id: 'tickets',
        label: 'Search Tickets',
        query: 'beforeafter',
        tokens: [{ value: 'tag:server', label: 'tag:server', offset: 6 }],
      }),
    );
    const editor = document.querySelector<HTMLElement>(
      '[data-search-field-editor]',
    )!;
    placeSearchFieldCaret(editor, 3);
    expect(document.activeElement).toBe(editor);
    expect(globalThis.getSelection()?.anchorNode?.textContent).toBe('before');
    expect(globalThis.getSelection()?.anchorOffset).toBe(3);
    placeSearchFieldCaret(editor);
    expect(globalThis.getSelection()?.getRangeAt(0).collapsed).toBe(true);
    placeSearchFieldCaret(editor, 100);
    expect(globalThis.getSelection()?.getRangeAt(0).collapsed).toBe(true);

    const emptyEditor = document.createElement('div');
    emptyEditor.innerHTML = asHtml(
      SearchField({
        id: 'empty-token',
        label: 'Empty token',
        tokens: [{ value: 'tag:a', label: 'tag:a', offset: 0 }],
      }),
    );
    const nestedEditor = emptyEditor.querySelector<HTMLElement>(
      '[data-search-field-editor]',
    )!;
    document.body.append(nestedEditor);
    placeSearchFieldCaret(nestedEditor, 0);
    expect(globalThis.getSelection()?.anchorOffset).toBe(0);

    const getSelection = vi
      .spyOn(globalThis, 'getSelection')
      .mockReturnValue(null);
    expect(() => placeSearchFieldCaret(nestedEditor)).not.toThrow();
    getSelection.mockRestore();
  });
});

import { CircleHelp } from 'lucide';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LucideIcon } from '../../src/lucide-icon.js';
import { placeTokenSearchCaret, readTokenSearchField, TokenSearchField, type TokenSearchToken } from '../../src/token-search-field.js';

const asHtml = (value: unknown) => String(value);

describe('TokenSearchField', () => {
  beforeEach(() => document.body.replaceChildren());

  it('renders ordered, editable atomic tokens inside a labeled searchbox', () => {
    const tokens: TokenSearchToken[] = [
      { value: 'tag:server', label: 'tag:server', offset: 4, accessibleLabel: 'server tag' },
      { value: 'is:active', label: 'is:active', offset: 0 },
    ];
    const html = asHtml(TokenSearchField({ id: 'tickets', label: 'Search tickets', query: 'NOT  AND parser', tokens, autofocus: true, editorAttributes: { 'data-workspace-search': 'true' } }));
    expect(html).toContain('data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"');
    expect(html).toContain('data-workspace-search="true" class="kui-token-search__editor"');
    expect(html).toContain('role="searchbox" aria-label="Search tickets" contenteditable="true" spellcheck="false" autofocus');
    expect(html).toMatch(/data-token-value="is:active".*NOT .*data-token-value="tag:server".* AND parser/s);
    expect(html).toContain('aria-label="Edit server tag"');
    expect(html).toContain('aria-label="Remove server tag"');
    expect(html).toContain('data-action="clear-token-search" aria-label="Clear search"');
  });

  it('clamps token offsets and preserves input order for ties', () => {
    const html = asHtml(TokenSearchField({ id: 'bounds', label: 'Bounded search', query: 'middle', tokens: [
      { value: 'negative', label: 'Negative', offset: -10 },
      { value: 'late-one', label: 'Late one', offset: 100 },
      { value: 'late-two', label: 'Late two' },
    ] }));
    expect(html).toMatch(/Negative.*middle.*Late one.*Late two/s);
  });

  it('supports custom actions, adornments, disabled state, and token-aware placeholders', () => {
    const html = asHtml(TokenSearchField({
      id: 'saved', label: 'Saved query', tokens: [{ value: 'tag:client', label: 'tag:client' }], disabled: true,
      leading: <span>Filter</span>, trailing: <button type="button"><LucideIcon icon={CircleHelp} name="help" /></button>,
      editAction: 'edit-filter', removeAction: 'remove-filter', clearAction: 'clear-filter', clearLabel: 'Clear saved query', className: 'compact',
    }));
    expect(html).toContain('class="kui-token-search compact"');
    expect(html).toContain('data-placeholder="Add search…"');
    expect(html).toContain('aria-disabled="true" contenteditable="false"');
    expect(html.match(/ disabled/g)).toHaveLength(3);
    expect(html).toContain('data-action="edit-filter"');
    expect(html).toContain('data-action="remove-filter"');
    expect(html).toContain('data-action="clear-filter" aria-label="Clear saved query"');
    expect(html).toContain('<span>Filter</span>');
    expect(html).toContain('data-lucide="help"');
    expect(asHtml(TokenSearchField({ id: 'empty', label: 'Search', placeholder: 'Find records' }))).toContain('data-placeholder="Find records"');
  });

  it('reads browser-edited text and token offsets without chip button text', () => {
    document.body.innerHTML = asHtml(TokenSearchField({ id: 'tickets', label: 'Search tickets', query: 'NOT  AND parser', tokens: [{ value: 'tag:server', label: 'tag:server', offset: 4 }] }));
    const editor = document.querySelector<HTMLElement>('[data-token-search-editor]')!;
    editor.append(document.createElement('br'), document.createTextNode('owner'));
    expect(readTokenSearchField(editor, [{ value: 'tag:server', label: 'Server', accessibleLabel: 'server tag' }])).toEqual({ query: 'NOT  AND parser owner', tokens: [{ value: 'tag:server', label: 'Server', accessibleLabel: 'server tag', offset: 4 }] });
    editor.querySelector<HTMLElement>('[data-token-value="tag:server"]')!.dataset.tokenValue = 'status:open';
    expect(readTokenSearchField(editor).tokens).toEqual([{ value: 'status:open', label: 'status:open', offset: 4 }]);
    delete editor.querySelector<HTMLElement>('[data-component="token-search-token"]')!.dataset.tokenValue;
    editor.prepend(document.createComment('ignored'));
    expect(readTokenSearchField(editor).tokens).toEqual([]);
  });

  it('places the caret at a text offset or at the end while skipping chip text', () => {
    document.body.innerHTML = asHtml(TokenSearchField({ id: 'tickets', label: 'Search tickets', query: 'beforeafter', tokens: [{ value: 'tag:server', label: 'tag:server', offset: 6 }] }));
    const editor = document.querySelector<HTMLElement>('[data-token-search-editor]')!;
    placeTokenSearchCaret(editor, 3);
    expect(document.activeElement).toBe(editor);
    expect(globalThis.getSelection()?.anchorNode?.textContent).toBe('before');
    expect(globalThis.getSelection()?.anchorOffset).toBe(3);
    placeTokenSearchCaret(editor);
    expect(globalThis.getSelection()?.getRangeAt(0).collapsed).toBe(true);
    placeTokenSearchCaret(editor, 100);
    expect(globalThis.getSelection()?.getRangeAt(0).collapsed).toBe(true);

    const emptyEditor = document.createElement('div');
    emptyEditor.innerHTML = asHtml(TokenSearchField({ id: 'empty-token', label: 'Empty token', tokens: [{ value: 'tag:a', label: 'tag:a', offset: 0 }] }));
    const nestedEditor = emptyEditor.querySelector<HTMLElement>('[data-token-search-editor]')!;
    document.body.append(nestedEditor);
    placeTokenSearchCaret(nestedEditor, 0);
    expect(globalThis.getSelection()?.anchorOffset).toBe(0);

    const getSelection = vi.spyOn(globalThis, 'getSelection').mockReturnValue(null);
    expect(() => placeTokenSearchCaret(nestedEditor)).not.toThrow();
    getSelection.mockRestore();
  });
});

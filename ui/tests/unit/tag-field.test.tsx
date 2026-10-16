import { mount, signal } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TagField } from '../../src/components/forms/tag-field/tag-field.js';
import { wireTagFields } from '../../src/components/forms/tag-field/wiring/wire-tag-fields.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

describe('TagField', () => {
  it('renders SearchField form-field chips with a hidden input per tag', () => {
    const host = render(
      TagField({
        id: 'labels',
        label: 'Labels',
        tags: ['bug', 'docs'],
        name: 'label',
        form: 'ticket',
        hint: 'Press Enter or a comma to add.',
        max: 5,
        required: true,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-tag-field')!;
    expect(root.dataset.component).toBe('tag-field');
    expect(root.dataset.tagFieldId).toBe('labels');
    expect(root.dataset.max).toBe('5');
    expect(root.hasAttribute('data-invalid')).toBe(false);
    const editor = root.querySelector<HTMLElement>('[data-tag-field-editor]')!;
    expect(editor.dataset.tagFieldEditor).toBe('labels');
    expect(editor.getAttribute('aria-labelledby')).toBe('labels-label');
    expect(editor.getAttribute('aria-describedby')).toBe('labels-hint');
    expect(editor.getAttribute('aria-required')).toBe('true');
    expect(
      [
        ...root.querySelectorAll<HTMLElement>(
          '[data-component="search-field-token"]',
        ),
      ].map((chip) => chip.dataset.tokenValue),
    ).toEqual(['bug', 'docs']);
    const hidden = [
      ...root.querySelectorAll<HTMLInputElement>('input[type="hidden"]'),
    ];
    expect(
      hidden.map((input) => [
        input.name,
        input.value,
        input.getAttribute('form'),
      ]),
    ).toEqual([
      ['label', 'bug', 'ticket'],
      ['label', 'docs', 'ticket'],
    ]);
    expect(
      root.querySelector('.kui-search-field__leading [data-lucide="tag"]'),
    ).not.toBeNull();
    expect(
      root
        .querySelector('[data-action="clear-tag-field"]')
        ?.getAttribute('aria-label'),
    ).toBe('Clear Tags');
  });

  it('shows an error in place of the hint, and submits nothing while disabled', () => {
    const host = render(
      TagField({
        id: 'x',
        label: 'Labels',
        tags: ['a'],
        name: 'label',
        hint: 'Hint',
        error: 'Too many labels.',
        disabled: true,
        className: 'app-tags',
        slot: 'fields',
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-tag-field')!;
    expect(root.className).toBe('kui-tag-field app-tags');
    expect(root.getAttribute('slot')).toBe('fields');
    expect(root.hasAttribute('data-invalid')).toBe(true);
    expect(root.querySelector('#x-hint')?.textContent).toBe('Too many labels.');
    expect(root.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
    expect(() => TagField({ id: 'y', label: 'L', tags: [], max: 0 })).toThrow(
      'TagField max must be a positive integer.',
    );
  });
});

describe('wireTagFields', () => {
  const hosts: HTMLElement[] = [];
  afterEach(() => {
    for (const host of hosts.splice(0)) host.remove();
  });

  function setup(
    initial: string[],
    options: Partial<Parameters<typeof wireTagFields>[1]> = {},
    max?: number,
  ) {
    const tags = signal(initial);
    const host = document.createElement('div');
    document.body.append(host);
    hosts.push(host);
    const dispose = mount(host, () => (
      <TagField
        id="labels"
        label="Labels"
        tags={tags.value}
        name="label"
        max={max}
      />
    ));
    const onChange = vi.fn(({ tags: next }: { tags: string[] }) => {
      tags.value = next;
    });
    const onReject = vi.fn();
    const stop = wireTagFields(host, { onChange, onReject, ...options });
    const editor = () =>
      host.querySelector<HTMLElement>('[data-tag-field-editor]')!;
    const type = (text: string) => {
      const span =
        editor().querySelector<HTMLElement>(
          '[data-search-field-text]:last-of-type',
        ) ?? editor();
      span.textContent = text;
      editor().dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
      );
    };
    const key = (key: string, target: Element = editor()) =>
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    return { tags, host, onChange, onReject, editor, type, key, stop, dispose };
  }

  it('adds typed text on Enter and on a delimiter, splitting several values', () => {
    const t = setup(['bug']);
    t.type('docs');
    t.key('Enter');
    expect(t.tags.value).toEqual(['bug', 'docs']);
    t.type('ui, perf');
    t.key(',');
    expect(t.tags.value).toEqual(['bug', 'docs', 'ui', 'perf']);
    expect(t.host.querySelectorAll('input[type="hidden"]')).toHaveLength(4);
    t.stop();
    t.dispose();
  });

  it('refuses duplicates, values past max, and invalid values', () => {
    const t = setup(
      ['bug'],
      { normalize: (v) => (v.trim() === 'nope' ? undefined : v.trim()) },
      2,
    );
    t.type('bug');
    t.key('Enter');
    expect(t.onReject).toHaveBeenLastCalledWith({
      id: 'labels',
      value: 'bug',
      reason: 'duplicate',
    });
    t.type('nope');
    t.key('Enter');
    expect(t.onReject).toHaveBeenLastCalledWith({
      id: 'labels',
      value: 'nope',
      reason: 'invalid',
    });
    t.type('docs, ui');
    t.key('Enter');
    expect(t.tags.value).toEqual(['bug', 'docs']);
    expect(t.onReject).toHaveBeenLastCalledWith({
      id: 'labels',
      value: 'ui',
      reason: 'max',
    });
    t.stop();
    t.dispose();
  });

  it('removes, clears, and edits tags through the chip and clear buttons', () => {
    const t = setup(['bug', 'docs', 'ui']);
    t.host
      .querySelector<HTMLElement>(
        '[data-action="remove-tag-field-tag"][data-token-value="docs"]',
      )!
      .click();
    expect(t.tags.value).toEqual(['bug', 'ui']);
    t.host
      .querySelector<HTMLElement>(
        '[data-action="edit-tag-field-tag"][data-token-value="ui"]',
      )!
      .click();
    expect(t.tags.value).toEqual(['bug']);
    t.host
      .querySelector<HTMLElement>('[data-action="clear-tag-field"]')!
      .click();
    expect(t.tags.value).toEqual([]);
    t.stop();
    t.dispose();
  });

  it('moves between chips with arrows and removes a focused chip with Backspace', async () => {
    const t = setup(['bug', 'docs']);
    const chips = () => [
      ...t.host.querySelectorAll<HTMLElement>(
        '[data-action="edit-tag-field-tag"]',
      ),
    ];
    chips()[1]!.focus();
    t.key('ArrowLeft', chips()[1]!);
    expect(document.activeElement).toBe(chips()[0]);
    t.key('ArrowLeft', chips()[0]!);
    expect(document.activeElement).toBe(chips()[0]);
    t.key('ArrowRight', chips()[0]!);
    expect(document.activeElement).toBe(chips()[1]);
    t.key('Backspace', chips()[1]!);
    expect(t.tags.value).toEqual(['bug']);
    await Promise.resolve();
    t.key('Delete', chips()[0]!);
    expect(t.tags.value).toEqual([]);
    t.stop();
    t.dispose();
  });

  it('commits on blur and on paste, and stops after dispose', () => {
    const t = setup([]);
    t.type('alpha');
    t.editor().dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    expect(t.tags.value).toEqual(['alpha']);
    t.type('omega');
    t.key('Tab');
    expect(t.tags.value).toEqual(['alpha', 'omega']);
    t.type('beta,gamma');
    t.editor().dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }),
    );
    expect(t.tags.value).toEqual(['alpha', 'omega', 'beta', 'gamma']);
    t.stop();
    t.type('delta');
    t.key('Enter');
    expect(t.tags.value).toEqual(['alpha', 'omega', 'beta', 'gamma']);
    t.dispose();
  });

  it('does not commit on blur when disabled by option', () => {
    const t = setup([], { commitOnBlur: false });
    t.type('alpha');
    t.editor().dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    expect(t.onChange).not.toHaveBeenCalled();
    t.stop();
    t.dispose();
  });

  it('moves from an empty caret to the last chip, and keeps text when focus moves onto a chip', () => {
    const t = setup(['bug', 'docs']);
    const editor = t.editor();
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(true);
    const selection = globalThis.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    t.key('ArrowLeft');
    expect(document.activeElement?.getAttribute('data-token-value')).toBe(
      'docs',
    );
    t.key('ArrowRight', document.activeElement!);
    t.type('pending');
    const chip = t.host.querySelector('[data-action="edit-tag-field-tag"]')!;
    editor.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: chip }),
    );
    expect(t.onChange).not.toHaveBeenCalled();
    t.stop();
    t.dispose();
  });

  it('keeps the placeholder hidden when a re-render arrives while text is typed', async () => {
    const tags = signal<string[]>([]);
    const error = signal<string | undefined>(undefined);
    const host = document.createElement('div');
    document.body.append(host);
    hosts.push(host);
    const dispose = mount(host, () => (
      <TagField
        id="mail"
        label="Recipients"
        tags={tags.value}
        error={error.value}
      />
    ));
    const stop = wireTagFields(host, {
      onChange: ({ tags: next }) => {
        tags.value = next;
      },
    });
    const editor = host.querySelector<HTMLElement>('[data-tag-field-editor]')!;
    const span =
      editor.querySelector<HTMLElement>('[data-search-field-text]') ?? editor;
    span.textContent = 'typed';
    editor.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    const field = host.querySelector<HTMLElement>('.kui-search-field')!;
    expect(field.dataset.placeholderVisible).toBe('false');
    error.value = 'Not an email address.';
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    expect(host.querySelector('[data-invalid]')).not.toBeNull();
    expect(field.dataset.placeholderVisible).toBe('false');
    stop();
    dispose();
  });

  it('removes the tag before the caret on Backspace and ignores other search fields', async () => {
    const t = setup(['bug', 'docs']);
    const other = document.createElement('div');
    other.innerHTML = String(
      <div data-component="search-field" data-search-field-id="plain">
        <div
          class="kui-search-field__editor"
          data-search-field-editor="plain"
          contenteditable="true"
        >
          <span
            class="kui-search-field__token"
            contenteditable="false"
            data-component="search-field-token"
            data-token-value="x"
          />
          <span data-search-field-text>{'\u200b'}</span>
        </div>
      </div>,
    );
    t.host.append(other);
    const caretAtEnd = (editor: HTMLElement) => {
      const text = [...editor.querySelectorAll('[data-search-field-text]')].at(
        -1,
      )!;
      editor.focus();
      const range = document.createRange();
      range.setStart(text.firstChild ?? text, 0);
      range.collapse(true);
      const selection = globalThis.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    };
    caretAtEnd(t.editor());
    t.key('Backspace');
    expect(t.tags.value).toEqual(['bug']);
    const plain = other.querySelector<HTMLElement>(
      '[data-search-field-editor]',
    )!;
    caretAtEnd(plain);
    plain.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Backspace',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(t.tags.value).toEqual(['bug']);
    // Typed text before the caret (after a chip) keeps ArrowLeft in the text.
    t.type('ab');
    caretAtEnd(t.editor());
    const text = [
      ...t.editor().querySelectorAll('[data-search-field-text]'),
    ].at(-1)!;
    const range = document.createRange();
    range.setStart(text.firstChild!, 2);
    range.collapse(true);
    globalThis.getSelection()!.removeAllRanges();
    globalThis.getSelection()!.addRange(range);
    t.key('ArrowLeft');
    expect(document.activeElement?.hasAttribute('data-token-value')).toBe(
      false,
    );
    // A caret outside the editor (or a range selection) leaves ArrowLeft alone.
    globalThis.getSelection()!.removeAllRanges();
    t.key('ArrowLeft');
    expect(document.activeElement?.hasAttribute('data-token-value')).toBe(
      false,
    );
    t.stop();
    t.dispose();
  });
});

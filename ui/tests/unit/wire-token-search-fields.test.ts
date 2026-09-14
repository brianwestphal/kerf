import { describe, expect, it, vi } from 'vitest';

import { wireTokenSearchFields } from '../../src/wire-token-search-fields.js';

describe('wireTokenSearchFields', () => {
  it('submits Enter without inserting a contenteditable line break', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"></div></div>';
    const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const onSubmit = vi.fn();
    const stop = wireTokenSearchFields(root, { onSubmit });
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

    editor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith({ id: 'tickets', editor });
    stop();
  });

  it('ignores composition, other keys, and disabled fields', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="true"><div data-token-search-editor="tickets" contenteditable="false"></div></div>';
    const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const onSubmit = vi.fn();
    const stop = wireTokenSearchFields(root, { onSubmit });

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }));

    expect(onSubmit).not.toHaveBeenCalled();
    stop();
  });
});

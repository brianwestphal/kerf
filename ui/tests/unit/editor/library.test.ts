// KF-Z54E4H: the component Library is an Xcode-style popover. The Preview
// toolbar's Library button and Shift+Cmd+L (Ctrl+Shift+L) open it with focus
// in its filter; it closes with focus back on the button; it remembers where
// it was pinned per browser; and play mode closes it.
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isPopoverPinned } from '../../../src/surface-scaffold.js';
import { resetPopovers } from '../helpers/popover.js';
import { createEditor } from './kerf-catalog.js';

const KEY = 'kerf-ui-editor:library';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  window.localStorage.clear();
  resetPopovers();
  vi.restoreAllMocks();
});

function open() {
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const editor = createEditor({});
  const stopMount = mount(root, editor.render);
  const unwireEditor = editor.wire(root);
  cleanup = () => {
    unwireEditor();
    stopMount();
  };
  const library = root.querySelector<HTMLElement>('#editor-library')!;
  const button = root.querySelector<HTMLElement>(
    '[data-editor-library-button]',
  )!;
  return { root, editor, library, button };
}

const shortcut = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', {
    key: 'L',
    shiftKey: true,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.body.dispatchEvent(event);
  return event;
};

describe('the component Library', () => {
  it('opens from the Preview toolbar’s Library button', () => {
    const { root, library, button } = open();
    expect(button.getAttribute('popovertarget')).toBe('editor-library');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.textContent).toContain('Library');
    expect(
      root.querySelector('[data-workbench-rail] [data-editor-palette]'),
    ).toBeNull();
    expect(library.querySelector('[data-editor-palette]')).not.toBeNull();
    expect(library.matches(':popover-open')).toBe(false);
  });

  it('names its shortcut for the platform', () => {
    const platform = vi.spyOn(window.navigator, 'platform', 'get');
    platform.mockReturnValue('MacIntel');
    expect(open().button.getAttribute('title')).toBe('Library (⇧⌘L)');
    cleanup!();
    platform.mockReturnValue('Win32');
    expect(open().button.getAttribute('title')).toBe('Library (Ctrl+Shift+L)');
  });

  it('toggles with Shift+Cmd+L or Ctrl+Shift+L, focusing its filter, then the button', () => {
    const { library, button } = open();
    const filter = library.querySelector<HTMLElement>(
      '[data-editor-palette-filter]',
    )!;
    expect(shortcut({ metaKey: true }).defaultPrevented).toBe(true);
    expect(library.matches(':popover-open')).toBe(true);
    expect(document.activeElement).toBe(filter);
    shortcut({ ctrlKey: true, key: 'l' });
    expect(library.matches(':popover-open')).toBe(false);
    expect(document.activeElement).toBe(button);
    // Other chords leave it alone.
    for (const init of [
      { metaKey: true, key: 'k' },
      { metaKey: true, shiftKey: false },
      { metaKey: true, altKey: true },
      {},
    ])
      expect(shortcut(init).defaultPrevented).toBe(false);
    expect(library.matches(':popover-open')).toBe(false);
  });

  it('returns focus to the button only from inside it or nowhere', () => {
    const { root, library, button } = open();
    library.showPopover();
    // Focus the person moved elsewhere stays there.
    const outline = root.querySelector<HTMLElement>('[role="tab"]')!;
    outline.focus();
    library.hidePopover();
    expect(document.activeElement).toBe(outline);
    library.showPopover();
    (document.activeElement as HTMLElement).blur();
    library.hidePopover();
    expect(document.activeElement).toBe(button);
  });

  it('remembers being pinned and where, per browser', () => {
    const first = open();
    first.library.showPopover();
    first.library
      .querySelector<HTMLElement>('[data-pinnable-popover-pin]')!
      .click();
    const stored = JSON.parse(window.localStorage.getItem(KEY)!) as {
      pinned: boolean;
      placement: { x: number; y: number } | null;
    };
    expect(stored.pinned).toBe(true);
    cleanup!();
    // A new editor restores it pinned, where it was.
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ pinned: true, placement: { x: 40, y: 60 } }),
    );
    const again = open();
    expect(isPopoverPinned(again.library)).toBe(true);
    again.library.showPopover();
    expect(
      again.library.style.getPropertyValue('--_kui-pinnable-popover-surface-x'),
    ).toBe('40px');
    cleanup!();
    // A placement it cannot read is left out; anything else opens transient.
    for (const value of [
      JSON.stringify({ pinned: true, placement: { x: 'a', y: 1 } }),
      'null',
      '{',
    ]) {
      window.localStorage.setItem(KEY, value);
      const editor = open();
      expect(isPopoverPinned(editor.library)).toBe(value.includes('true'));
      cleanup!();
    }
  });

  it('works without storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { library } = open();
    expect(isPopoverPinned(library)).toBe(false);
    library.showPopover();
    library.querySelector<HTMLElement>('[data-pinnable-popover-pin]')!.click();
    expect(isPopoverPinned(library)).toBe(true);
  });

  it('closes for play mode, and ignores its shortcut while playing', () => {
    const { root, library } = open();
    library.showPopover();
    root.querySelector<HTMLElement>('[data-action="editor-play"]')!.click();
    expect(library.matches(':popover-open')).toBe(false);
    expect(shortcut({ metaKey: true }).defaultPrevented).toBe(false);
    expect(library.matches(':popover-open')).toBe(false);
  });
});

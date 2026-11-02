// KF-59BF6C: a note inside the popup. Select and PopupMenu draw one popup,
// so both take `popupNote`: quiet text below the choices, announced as the
// listbox's or menu's description and never an option or item itself.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PopupMenu } from '../../src/components/actions/popup-menu/popup-menu.js';
import { Select } from '../../src/components/forms/select/select.js';

const html = (markup: { toString(): string }) => {
  const host = document.createElement('div');
  host.innerHTML = markup.toString();
  return host;
};

const NOTE = 'Touch and the on-screen keyboard aren’t emulated.';

describe('popupNote', () => {
  it('ends a Select popup with the note, the listbox’s description', () => {
    const host = html(
      <Select
        name="device"
        ariaLabel="Device"
        value="phone"
        multiple={false}
        choices={[
          { value: 'phone', label: 'Phone' },
          { value: 'tablet', label: 'Tablet' },
        ]}
        popupNote={NOTE}
      />,
    );
    const popup = host.querySelector('.kui-select__popup')!;
    const note = popup.lastElementChild!;
    expect(note.className).toBe('kui-select__note');
    expect(note.textContent).toBe(NOTE);
    expect(note.getAttribute('aria-hidden')).toBe('true');
    const listbox = popup.querySelector('[role="listbox"]')!;
    expect(listbox.getAttribute('aria-description')).toBe(NOTE);
    expect(listbox.contains(note)).toBe(false);
  });

  it('follows a multiple Select’s actions', () => {
    const host = html(
      <Select
        name="tags"
        label="Tags"
        multiple
        value={[]}
        choices={[{ value: 'a', label: 'A' }]}
        clearLabel="Clear"
        popupNote={NOTE}
      />,
    );
    const popup = host.querySelector('.kui-select__popup')!;
    expect(
      [...popup.children].map((child) => child.className.split(' ')[0]),
    ).toEqual([
      'kui-select__listbox',
      'kui-select__actions',
      'kui-select__note',
    ]);
  });

  it('draws nothing without a note', () => {
    const host = html(
      <Select
        name="device"
        label="Device"
        value="phone"
        choices={[{ value: 'phone', label: 'Phone' }]}
      />,
    );
    expect(host.querySelector('.kui-select__note')).toBeNull();
    expect(
      host.querySelector('[role="listbox"]')!.hasAttribute('aria-description'),
    ).toBe(false);
  });

  it('ends a PopupMenu’s top menu with the note, not its submenus', () => {
    const items = [
      { label: 'Copy', action: 'copy' },
      {
        label: 'Share',
        submenu: [{ label: 'Mail', action: 'mail' }],
      },
    ];
    const host = html(<PopupMenu text="Edit" items={items} popupNote={NOTE} />);
    const menu = host.querySelector(
      '.kui-popup-menu__menu:not([data-submenu])',
    )!;
    expect(menu.getAttribute('aria-description')).toBe(NOTE);
    const note = menu.lastElementChild!;
    expect(note.className).toBe('kui-popup-menu__note');
    expect(note.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelectorAll('.kui-popup-menu__note')).toHaveLength(1);
    // The note is part of the cached content's key.
    const plain = html(<PopupMenu text="Edit" items={items} />);
    expect(plain.querySelector('.kui-popup-menu__note')).toBeNull();
    expect(
      plain
        .querySelector('[data-component="popup-menu"]')!
        .getAttribute('data-key'),
    ).not.toBe(
      host
        .querySelector('[data-component="popup-menu"]')!
        .getAttribute('data-key'),
    );
  });

  it('styles both notes from the one popup contract', () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), 'utf8');
    const foundation = read('../../src/foundation.css');
    for (const token of [
      '--_kui-popup-note-gap',
      '--_kui-popup-note-padding',
      '--_kui-popup-note-font-size',
      '--_kui-popup-note-line-height',
    ]) {
      expect(foundation).toContain(`${token}:`);
      expect(read('../../src/components/forms/select/select.css')).toContain(
        `var(${token})`,
      );
      expect(
        read('../../src/components/actions/popup-menu/popup-menu.css'),
      ).toContain(`var(${token})`);
    }
  });
});

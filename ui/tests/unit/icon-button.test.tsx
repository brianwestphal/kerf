import { FolderOpen } from 'lucide';
import { describe, expect, it } from 'vitest';

import { IconButton } from '../../src/components/actions/icon-button/icon-button.js';

const render = (markup: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(markup);
  return host.firstElementChild as HTMLElement;
};

describe('IconButton', () => {
  it('renders an icon-only Button named by its label', () => {
    const button = render(
      IconButton({
        icon: FolderOpen,
        iconName: 'folder-open',
        label: 'Browse',
        action: 'browse',
      }),
    );
    expect(button.localName).toBe('button');
    expect(button.className).toBe('kui-button');
    expect(button.getAttribute('aria-label')).toBe('Browse');
    expect(button.hasAttribute('data-icon-only')).toBe(true);
    expect(button.getAttribute('data-action')).toBe('browse');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('.kui-button__label')).toBe(null);
    // The glyph is decorative: the button carries the name.
    expect(
      button.querySelector('.kui-button__icon')!.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(button.querySelector('[data-lucide="folder-open"]')).not.toBe(null);
  });

  it('forwards tone, emphasis, size, form type, and safe metadata', () => {
    const button = render(
      IconButton({
        icon: FolderOpen,
        iconName: 'folder-open',
        label: 'Delete',
        tone: 'danger',
        emphasis: 'secondary',
        size: 'compact',
        type: 'submit',
        disabled: true,
        id: 'delete',
        className: 'row-action',
        slot: 'end',
        rootAttributes: {
          'data-row': '3',
          'data-component': 'other',
        },
      }),
    );
    expect(button.getAttribute('data-row')).toBe('3');
    expect(button.id).toBe('delete');
    expect(button.className).toBe('kui-button row-action');
    expect(button.getAttribute('data-component')).toBe('button');
    expect(button.dataset).toMatchObject({
      tone: 'danger',
      emphasis: 'secondary',
      size: 'compact',
    });
    expect(button.getAttribute('type')).toBe('submit');
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('slot')).toBe('end');
  });
});

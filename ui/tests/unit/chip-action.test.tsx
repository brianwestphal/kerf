import { Filter } from 'lucide';
import { describe, expect, it } from 'vitest';

import {
  Chip,
  type ChipProps,
} from '../../src/components/feedback/chip/chip.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';

function render(props: ChipProps) {
  const host = document.createElement('div');
  host.innerHTML = String(Chip(props));
  return host.firstElementChild as HTMLElement;
}

describe('Chip action variant', () => {
  it('renders the whole chip as a native button carrying the delegated action and item identity', () => {
    const chip = render({
      children: 'is:mine',
      action: 'search-help-insert',
      itemId: 'is:mine',
      size: 'compact',
      shape: 'rounded',
      icon: LucideIcon({ icon: Filter, name: 'filter' }),
    });
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.getAttribute('type')).toBe('button');
    expect(chip.className).toBe('kui-chip');
    expect(chip.dataset.component).toBe('chip');
    expect(chip.dataset.action).toBe('search-help-insert');
    expect(chip.dataset.itemId).toBe('is:mine');
    expect(chip.dataset.size).toBe('compact');
    expect(chip.dataset.shape).toBe('rounded');
    expect(chip.dataset.tone).toBe('neutral');
    expect(chip.dataset.appearance).toBe('quiet');
    for (const name of [
      'disabled',
      'aria-label',
      'data-disabled',
      'data-link',
      'href',
      'role',
    ])
      expect(chip.hasAttribute(name), name).toBe(false);
    // No nested interactive content: the root is the only control.
    expect(chip.querySelector('button, a')).toBeNull();
    expect(
      chip.querySelector('.kui-chip__icon')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(chip.querySelector('.kui-chip__label')?.textContent).toBe('is:mine');
  });

  it('names the button with a trimmed actionLabel and ignores a blank one', () => {
    expect(
      render({
        children: 'is:mine',
        action: 'insert',
        actionLabel: '  Insert filter is:mine ',
      }).getAttribute('aria-label'),
    ).toBe('Insert filter is:mine');
    expect(
      render({
        children: 'is:mine',
        action: 'insert',
        actionLabel: '   ',
      }).hasAttribute('aria-label'),
    ).toBe(false);
  });

  it('disables the native button and marks the chip disabled', () => {
    const chip = render({
      children: 'has:questions',
      action: 'insert',
      itemId: 'has:questions',
      disabled: true,
    }) as HTMLButtonElement;
    expect(chip.disabled).toBe(true);
    expect(chip.hasAttribute('data-disabled')).toBe(true);
    expect(chip.dataset.action).toBe('insert');
  });

  it('keeps truncation, slot, and className on an action chip', () => {
    const chip = render({
      children: 'site:Karachi Industrial Estate',
      action: 'insert',
      truncate: true,
      className: 'app-filter',
      slot: 'start',
      tone: 'inherit',
    });
    expect(chip.className).toBe('kui-chip app-filter');
    expect(chip.getAttribute('slot')).toBe('start');
    expect(chip.dataset.tone).toBe('inherit');
    expect(chip.hasAttribute('data-truncate')).toBe(true);
    expect(chip.querySelector('.kui-chip__label')?.getAttribute('title')).toBe(
      'site:Karachi Industrial Estate',
    );
  });

  it('leaves plain, removable, and link chips without a root action', () => {
    expect(render({ children: 'Draft' }).hasAttribute('data-action')).toBe(
      false,
    );
    const removable = render({
      children: 'Urgent',
      removeAction: 'remove',
      removeLabel: 'Remove Urgent tag',
    });
    expect(removable.tagName).toBe('SPAN');
    expect(removable.hasAttribute('data-action')).toBe(false);
    expect(render({ children: 'Docs', href: '/docs' }).tagName).toBe('A');
  });

  it('rejects action combined with href or a remove button at runtime', () => {
    const message = /Chip action cannot be combined with href or removeAction/;
    expect(() =>
      Chip({ children: 'x', action: 'go', href: '/x' } as unknown as ChipProps),
    ).toThrow(message);
    expect(() =>
      Chip({
        children: 'x',
        action: 'go',
        removeAction: 'remove',
        removeLabel: 'Remove x',
      } as unknown as ChipProps),
    ).toThrow(message);
    expect(() =>
      Chip({
        children: 'x',
        action: 'go',
        removeLabel: 'Remove x',
      } as unknown as ChipProps),
    ).toThrow(message);
  });

  it('rejects action combined with href or a remove button at the type level', () => {
    // @ts-expect-error an action chip cannot also be a link
    const linked: ChipProps = { children: 'x', action: 'go', href: '/x' };
    expect(linked.children).toBe('x');
    // @ts-expect-error an action chip cannot carry a remove button
    const removable: ChipProps = {
      children: 'x',
      action: 'go',
      removeAction: 'remove',
      removeLabel: 'Remove x',
    };
    expect(removable.children).toBe('x');
    // @ts-expect-error actionLabel needs an action
    const orphan: ChipProps = { children: 'x', actionLabel: 'Insert x' };
    expect(orphan.children).toBe('x');
  });
});

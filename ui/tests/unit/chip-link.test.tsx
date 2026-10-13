import { FileText } from 'lucide';
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

describe('Chip link variant', () => {
  it('renders a native link with Chip geometry attributes and no button semantics', () => {
    const chip = render({
      children: 'chip.tsx',
      href: '/files/chip.tsx',
      icon: LucideIcon({ icon: FileText, name: 'file-text' }),
      itemId: 'chip-source',
    });
    expect(chip.tagName).toBe('A');
    expect(chip.className).toBe('kui-chip');
    expect(chip.dataset.component).toBe('chip');
    expect(chip.hasAttribute('data-link')).toBe(true);
    expect(chip.dataset.tone).toBe('neutral');
    expect(chip.dataset.itemId).toBe('chip-source');
    expect(chip.getAttribute('href')).toBe('/files/chip.tsx');
    for (const name of [
      'download',
      'target',
      'rel',
      'role',
      'aria-label',
      'aria-disabled',
      'tabindex',
      'type',
    ])
      expect(chip.hasAttribute(name), name).toBe(false);
    expect(chip.querySelector('button')).toBeNull();
    expect(
      chip.querySelector('.kui-chip__icon')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(chip.querySelector('.kui-chip__label')?.textContent).toBe(
      'chip.tsx',
    );
  });

  it('maps download to a bare attribute or a suggested file name', () => {
    expect(
      render({ children: 'Log', href: '/log', download: true }).getAttribute(
        'download',
      ),
    ).toBe('');
    expect(
      render({
        children: 'Report',
        href: '/r',
        download: 'report-2026.md',
      }).getAttribute('download'),
    ).toBe('report-2026.md');
    expect(
      render({ children: 'Log', href: '/log', download: false }).hasAttribute(
        'download',
      ),
    ).toBe(false);
  });

  it('opens an external link in a new tab with a safe rel and an announced name', () => {
    const chip = render({
      children: 'Spec',
      href: 'https://example.com/spec',
      external: true,
    });
    expect(chip.getAttribute('target')).toBe('_blank');
    expect(chip.getAttribute('rel')).toBe('noopener noreferrer');
    expect(chip.getAttribute('aria-label')).toBe('Spec (opens in new tab)');
    const numeric = render({ children: 42, href: '/42', external: true });
    expect(numeric.getAttribute('aria-label')).toBe('42 (opens in new tab)');
    const rich = render({
      children: LucideIcon({ icon: FileText, name: 'file-text' }),
      href: 'https://example.com',
      external: true,
    });
    expect(rich.hasAttribute('aria-label')).toBe(false);
    expect(rich.getAttribute('target')).toBe('_blank');
  });

  it('removes the destination from a disabled link chip', () => {
    const chip = render({
      children: 'archive.zip',
      href: '/archive.zip',
      download: 'archive.zip',
      external: true,
      disabled: true,
    });
    expect(chip.tagName).toBe('A');
    for (const name of ['href', 'download', 'target', 'rel'])
      expect(chip.hasAttribute(name), name).toBe(false);
    expect(chip.getAttribute('aria-disabled')).toBe('true');
    expect(chip.getAttribute('tabindex')).toBe('-1');
    expect(chip.hasAttribute('data-disabled')).toBe(true);
  });

  it('keeps truncation and the inherit tone on a link chip', () => {
    const chip = render({
      children: 'design-template-drift-report-2026-10-13.md',
      href: 'data:text/plain,report',
      download: 'design-template-drift-report-2026-10-13.md',
      tone: 'inherit',
      size: 'compact',
      truncate: true,
    });
    expect(chip.dataset.tone).toBe('inherit');
    expect(chip.dataset.size).toBe('compact');
    expect(chip.hasAttribute('data-truncate')).toBe(true);
    expect(chip.querySelector('.kui-chip__label')?.getAttribute('title')).toBe(
      'design-template-drift-report-2026-10-13.md',
    );
  });

  it('keeps a plain chip a span and accepts the inherit tone there too', () => {
    const chip = render({ children: 'Draft', tone: 'inherit' });
    expect(chip.tagName).toBe('SPAN');
    expect(chip.hasAttribute('data-link')).toBe(false);
    expect(chip.dataset.tone).toBe('inherit');
  });

  it('rejects a remove button or orphaned link options at the type level', () => {
    // @ts-expect-error a link chip cannot carry a remove button
    const linked: ChipProps = {
      children: 'x',
      href: '/x',
      removeAction: 'remove',
      removeLabel: 'Remove x',
    };
    expect(linked.children).toBe('x');
    // @ts-expect-error download belongs only to a link chip
    const orphan: ChipProps = { children: 'x', download: true };
    expect(orphan.children).toBe('x');
  });
});

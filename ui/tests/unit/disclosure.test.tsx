import { describe, expect, it } from 'vitest';

import { Disclosure } from '../../src/components/surfaces/disclosure/disclosure.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

describe('Disclosure', () => {
  it('renders a closed native details with an arrow, title, and detail', () => {
    const host = render(
      Disclosure({
        title: 'Advanced Settings',
        detail: '3 options',
        children: <p data-test-content="">Hidden until opened</p>,
      }),
    );
    const details = host.querySelector('details')!;
    expect(details.className).toBe('kui-disclosure');
    expect(details.dataset.component).toBe('disclosure');
    expect(details.dataset.appearance).toBe('plain');
    expect(details.open).toBe(false);
    expect(details.hasAttribute('name')).toBe(false);
    expect(details.hasAttribute('data-action')).toBe(false);
    const summary = details.querySelector(':scope > summary')!;
    expect(summary.className).toBe('kui-disclosure__summary');
    expect(
      summary
        .querySelector(':scope > .kui-disclosure-arrow')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(summary.querySelector('.kui-disclosure__title')?.textContent).toBe(
      'Advanced Settings',
    );
    expect(summary.querySelector('.kui-disclosure__detail')?.textContent).toBe(
      '3 options',
    );
    expect(
      details.querySelector(
        ':scope > .kui-disclosure__content [data-test-content]',
      ),
    ).not.toBeNull();
  });

  it('serializes open, an exclusive group, appearance, action, and identity', () => {
    const host = render(
      Disclosure({
        title: 'Billing',
        children: 'Invoices',
        open: true,
        name: 'settings',
        appearance: 'sunken',
        toggleAction: 'toggle-billing',
        id: 'billing',
        className: 'app-section',
        slot: 'sections',
        rootAttributes: {
          'data-key': 'billing',
          'data-component': 'spoofed',
          'data-action': 'spoofed',
        },
      }),
    );
    const details = host.querySelector('details')!;
    expect(details.open).toBe(true);
    expect(details.getAttribute('name')).toBe('settings');
    expect(details.dataset.appearance).toBe('sunken');
    expect(details.dataset.action).toBe('toggle-billing');
    expect(details.dataset.component).toBe('disclosure');
    expect(details.dataset.key).toBe('billing');
    expect(details.id).toBe('billing');
    expect(details.className).toBe('kui-disclosure app-section');
    expect(details.getAttribute('slot')).toBe('sections');
    expect(details.querySelector('.kui-disclosure__detail')).toBeNull();
    expect(
      details.querySelector('.kui-disclosure-arrow')?.getAttribute('data-open'),
    ).toBe('true');
  });

  it('renders the framed appearance', () => {
    const host = render(
      Disclosure({ title: 'Logs', children: 'Output', appearance: 'framed' }),
    );
    expect(host.querySelector('details')?.dataset.appearance).toBe('framed');
  });

  it('renders the embedded appearance with the same native structure', () => {
    const host = render(
      Disclosure({
        title: 'AI Feedback',
        detail: '2 suggestions',
        appearance: 'embedded',
        open: true,
        children: <p data-test-content="">Group Export and Share.</p>,
      }),
    );
    const details = host.querySelector('details')!;
    expect(details.className).toBe('kui-disclosure');
    expect(details.dataset.appearance).toBe('embedded');
    expect(details.open).toBe(true);
    const summary = details.querySelector(':scope > summary')!;
    expect(summary.className).toBe('kui-disclosure__summary');
    const arrow = summary.firstElementChild!;
    expect(arrow.classList.contains('kui-disclosure-arrow')).toBe(true);
    expect(arrow.getAttribute('aria-hidden')).toBe('true');
    expect(arrow.getAttribute('data-open')).toBe('true');
    expect(summary.querySelector('.kui-disclosure__title')?.textContent).toBe(
      'AI Feedback',
    );
    expect(summary.querySelector('.kui-disclosure__detail')?.textContent).toBe(
      '2 suggestions',
    );
    expect(
      details.querySelector(
        ':scope > .kui-disclosure__content [data-test-content]',
      ),
    ).not.toBeNull();
  });

  // KF-ND665K: a compact disclosure passes the arrow a 14px size and marks
  // its root; the default writes neither, and app attributes cannot spoof it.
  it('renders the compact size through the arrow prop and a protected data-size', () => {
    const compact = render(
      Disclosure({
        title: 'AI Feedback',
        size: 'compact',
        appearance: 'embedded',
        rootAttributes: { 'data-size': 'large' },
        children: 'Group Export and Share.',
      }),
    );
    const details = compact.querySelector('details')!;
    expect(details.dataset.size).toBe('compact');
    expect(
      details.querySelector('.kui-disclosure-arrow')!.getAttribute('style'),
    ).toContain('--kui-disclosure-arrow-size:0.875rem');
    const plain = render(
      Disclosure({
        title: 'Logs',
        rootAttributes: { 'data-size': 'compact' },
        children: 'Output',
      }),
    );
    expect(plain.querySelector('details')!.hasAttribute('data-size')).toBe(
      false,
    );
    expect(
      plain.querySelector('.kui-disclosure-arrow')!.getAttribute('style'),
    ).not.toContain('--kui-disclosure-arrow-size');
  });
});

import { describe, expect, it } from 'vitest';

import { ProgressBar } from '../../src/components/feedback/progress-bar/progress-bar.js';
import { ProgressRing } from '../../src/components/feedback/progress-ring/progress-ring.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

describe('ProgressBar', () => {
  it('renders a labeled determinate native progress with its value', () => {
    const host = render(
      ProgressBar({
        id: 'upload',
        label: 'Uploading Files',
        value: 3,
        max: 12,
        showValue: true,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-progress-bar')!;
    expect(root.dataset.component).toBe('progress-bar');
    expect(root.dataset.tone).toBe('brand');
    expect(root.dataset.size).toBe('default');
    expect(root.hasAttribute('data-indeterminate')).toBe(false);
    const progress = root.querySelector('progress')!;
    expect(progress.value).toBe(3);
    expect(progress.max).toBe(12);
    expect(progress.getAttribute('aria-labelledby')).toBe('upload-label');
    expect(progress.hasAttribute('aria-label')).toBe(false);
    expect(host.querySelector('#upload-label')?.textContent).toBe(
      'Uploading Files',
    );
    const shown = root.querySelector('.kui-progress-bar__value')!;
    expect(shown.textContent).toBe('25%');
    expect(shown.getAttribute('aria-hidden')).toBe('true');
  });

  it('is indeterminate without a value and names itself without a visible label', () => {
    const host = render(
      ProgressBar({
        ariaLabel: 'Migrating Database',
        tone: 'warning',
        size: 'compact',
        rootAttributes: {
          'data-key': 'migration',
          'data-component': 'spoofed',
        },
        className: 'app-progress',
        slot: 'status',
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-progress-bar')!;
    expect(root.className).toBe('kui-progress-bar app-progress');
    expect(root.dataset.key).toBe('migration');
    expect(root.dataset.component).toBe('progress-bar');
    expect(root.dataset.tone).toBe('warning');
    expect(root.dataset.size).toBe('compact');
    expect(root.hasAttribute('data-indeterminate')).toBe(true);
    expect(root.getAttribute('slot')).toBe('status');
    expect(root.querySelector('.kui-progress-bar__header')).toBeNull();
    const progress = root.querySelector('progress')!;
    expect(progress.hasAttribute('value')).toBe(false);
    expect(progress.getAttribute('aria-label')).toBe('Migrating Database');
  });

  it('uses valueText for speech and display, names an unlabeled visible label, and clamps', () => {
    const host = render(
      ProgressBar({
        label: 'Confidence',
        value: 9,
        max: 4,
        valueText: '4 of 4 checks',
        showValue: true,
        tone: 'success',
      }),
    );
    const progress = host.querySelector('progress')!;
    expect(progress.value).toBe(4);
    expect(progress.getAttribute('aria-label')).toBe('Confidence');
    expect(progress.getAttribute('aria-valuetext')).toBe('4 of 4 checks');
    expect(host.querySelector('.kui-progress-bar__value')?.textContent).toBe(
      '4 of 4 checks',
    );
    expect(
      render(
        ProgressBar({ ariaLabel: 'Sync', value: 1, showValue: true }),
      ).querySelector('.kui-progress-bar__value')?.textContent,
    ).toBe('100%');
  });

  it('renders a label row without a readout', () => {
    const host = render(ProgressBar({ label: 'Indexing', value: 0.5 }));
    expect(host.querySelector('.kui-progress-bar__label')?.textContent).toBe(
      'Indexing',
    );
    expect(host.querySelector('.kui-progress-bar__value')).toBeNull();
  });

  it('rejects an invalid max or value', () => {
    expect(() => ProgressBar({ ariaLabel: 'X', max: 0 })).toThrow(
      'ProgressBar max must be a positive number.',
    );
    expect(() => ProgressBar({ ariaLabel: 'X', value: -1 })).toThrow(
      'ProgressBar value must be zero or more.',
    );
  });
});

describe('ProgressRing', () => {
  it('renders a determinate progressbar ring with a percentage value', () => {
    const host = render(
      ProgressRing({
        label: 'Claim Time Remaining',
        value: 30,
        max: 120,
        valueText: '90 minutes left',
        id: 'claim',
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-progress-ring')!;
    expect(root.id).toBe('claim');
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-label')).toBe('Claim Time Remaining');
    expect(root.getAttribute('aria-valuenow')).toBe('25');
    expect(root.getAttribute('aria-valuemin')).toBe('0');
    expect(root.getAttribute('aria-valuemax')).toBe('100');
    expect(root.getAttribute('aria-valuetext')).toBe('90 minutes left');
    expect(root.dataset.size).toBe('medium');
    expect(root.getAttribute('style')).toBe('--_kui-progress-ring-size:1.5rem');
    const arc = root.querySelector('.kui-progress-ring__arc')!;
    const [dash, gap] = arc
      .getAttribute('stroke-dasharray')!
      .split(' ')
      .map(Number);
    expect(dash! / gap!).toBeCloseTo(0.25, 3);
    expect(root.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('spins a quarter arc without a value, in each size and tone', () => {
    const host = render(
      ProgressRing({
        label: 'Loading',
        size: 'large',
        tone: 'danger',
        className: 'app-ring',
        slot: 'trailing',
        rootAttributes: { 'data-key': 'ring', 'data-tone': 'spoofed' },
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-progress-ring')!;
    expect(root.hasAttribute('data-indeterminate')).toBe(true);
    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.dataset.tone).toBe('danger');
    expect(root.dataset.key).toBe('ring');
    expect(root.className).toBe('kui-progress-ring app-ring');
    expect(root.getAttribute('slot')).toBe('trailing');
    expect(root.getAttribute('style')).toBe('--_kui-progress-ring-size:2.5rem');
    expect(
      render(ProgressRing({ label: 'Inline', size: 'small', value: 2, max: 1 }))
        .querySelector('.kui-progress-ring')
        ?.getAttribute('aria-valuenow'),
    ).toBe('100');
  });

  it('rejects an invalid max or value', () => {
    expect(() => ProgressRing({ label: 'X', max: -1 })).toThrow(
      'ProgressRing max must be a positive number.',
    );
    expect(() => ProgressRing({ label: 'X', value: Number.NaN })).toThrow(
      'ProgressRing value must be zero or more.',
    );
  });
});

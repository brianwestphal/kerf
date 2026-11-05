import { describe, expect, it } from 'vitest';

import { Gauge } from '../../src/components/feedback/gauge/gauge.js';
import { fillColor, remify } from '../../src/shared/styles/css-values.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host.querySelector<HTMLElement>('.kui-gauge')!;
}

const needleAngle = (root: HTMLElement) =>
  /rotate\((-?[\d.]+)deg\)/.exec(
    root.querySelector('.kui-gauge__needle')!.getAttribute('style')!,
  )![1];

const fillDash = (root: HTMLElement) =>
  root.querySelector('.kui-gauge__fill')!.getAttribute('style');

describe('Gauge', () => {
  it('renders a named meter with the value, unit, and spoken text', () => {
    const root = render(
      Gauge({
        label: 'Tokens per Minute',
        value: 420,
        max: 1000,
        unit: 'tok/min',
      }),
    );
    expect(root.dataset.component).toBe('gauge');
    expect(root.dataset.tone).toBe('brand');
    expect(root.dataset.variant).toBe('full');
    expect(root.getAttribute('role')).toBe('meter');
    expect(root.getAttribute('aria-label')).toBe('Tokens per Minute');
    expect(root.getAttribute('aria-valuemin')).toBe('0');
    expect(root.getAttribute('aria-valuemax')).toBe('1000');
    expect(root.getAttribute('aria-valuenow')).toBe('420');
    expect(root.getAttribute('aria-valuetext')).toBe('420 tok/min');
    expect(root.hasAttribute('title')).toBe(false);
    expect(root.hasAttribute('data-pinned')).toBe(false);
    expect(root.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('svg')!.getAttribute('viewBox')).toBe(
      '0 0 100 98',
    );
    expect(root.querySelector('.kui-gauge__value')!.textContent).toBe('420');
    expect(root.querySelector('.kui-gauge__unit')!.textContent).toBe('tok/min');
    expect(root.querySelectorAll('.kui-gauge__tick')).toHaveLength(11);
    expect(root.querySelectorAll('.kui-gauge__tick--major')).toHaveLength(3);
    expect(fillDash(root)).toBe('stroke-dasharray:42 100');
    // 42% of a 240-degree sweep from -120 degrees.
    expect(needleAngle(root)).toBe('-19.2');
    expect(root.getAttribute('style')).toBe(`--_kui-gauge-size:${remify(88)}`);
  });

  it('maps zero and max to the two ends of the sweep', () => {
    const empty = render(Gauge({ label: 'Rate', value: 0, max: 5 }));
    expect(needleAngle(empty)).toBe('-120');
    expect(fillDash(empty)).toBe('stroke-dasharray:0 100');
    const full = render(Gauge({ label: 'Rate', value: 5, max: 5 }));
    expect(needleAngle(full)).toBe('120');
    expect(full.hasAttribute('data-pinned')).toBe(false);
  });

  it('pins a value above max at the end while the text keeps the real value', () => {
    const root = render(Gauge({ label: 'Rate', value: 1170, max: 1000 }));
    expect(root.getAttribute('aria-valuenow')).toBe('1000');
    expect(root.getAttribute('aria-valuetext')).toBe('1170');
    expect(root.hasAttribute('data-pinned')).toBe(true);
    expect(needleAngle(root)).toBe('120');
    expect(fillDash(root)).toBe('stroke-dasharray:100 100');
    expect(root.querySelector('.kui-gauge__value')!.textContent).toBe('1170');
  });

  it('rounds the default readout to one decimal and prefers valueText', () => {
    const rounded = render(Gauge({ label: 'Rate', value: 3.14159, max: 10 }));
    expect(rounded.querySelector('.kui-gauge__value')!.textContent).toBe('3.1');
    const custom = render(
      Gauge({
        label: 'Rate',
        value: 1200,
        max: 2000,
        valueText: '1.2k',
        unit: 'tok',
      }),
    );
    expect(custom.querySelector('.kui-gauge__value')!.textContent).toBe('1.2k');
    expect(custom.getAttribute('aria-valuetext')).toBe('1.2k tok');
    expect(custom.querySelector('.kui-gauge__unit')!.textContent).toBe('tok');
    expect(rounded.querySelector('.kui-gauge__unit')).toBeNull();
  });

  it('draws only the arc, fill, and needle when bare, with a hover title', () => {
    const root = render(
      Gauge({
        label: 'Agent Rate',
        value: 30,
        max: 60,
        unit: 'tok/min',
        variant: 'bare',
      }),
    );
    expect(root.dataset.variant).toBe('bare');
    expect(root.getAttribute('title')).toBe('Agent Rate: 30 tok/min');
    expect(root.querySelector('svg')!.getAttribute('viewBox')).toBe(
      '0 0 100 76',
    );
    expect(root.querySelector('.kui-gauge__tick')).toBeNull();
    expect(root.querySelector('text')).toBeNull();
    expect(root.querySelector('.kui-gauge__track')).not.toBeNull();
    expect(root.querySelector('.kui-gauge__needle circle')).not.toBeNull();
    expect(needleAngle(root)).toBe('0');
    expect(root.getAttribute('style')).toBe(`--_kui-gauge-size:${remify(40)}`);
  });

  it('takes a tone, a size, and a consumer palette as configuration', () => {
    const root = render(
      Gauge({
        label: 'Night Rate',
        value: 1,
        max: 2,
        tone: 'danger',
        size: remify(240),
        colors: {
          track: fillColor('#2a0606'),
          fill: fillColor('#a30d0d'),
          needle: fillColor('#d63a3a'),
          text: fillColor('#d63a3a'),
        },
      }),
    );
    expect(root.dataset.tone).toBe('danger');
    expect(root.getAttribute('style')).toBe(
      [
        `--_kui-gauge-size:${remify(240)}`,
        '--_kui-gauge-track:#2a0606',
        '--_kui-gauge-fill:#a30d0d',
        '--_kui-gauge-needle:#d63a3a',
        '--_kui-gauge-text:#d63a3a',
      ].join(';'),
    );
    const partial = render(
      Gauge({
        label: 'Rate',
        value: 1,
        max: 2,
        colors: { fill: fillColor('#a30d0d') },
      }),
    );
    expect(partial.getAttribute('style')).toBe(
      `--_kui-gauge-size:${remify(88)};--_kui-gauge-fill:#a30d0d`,
    );
  });

  it('keeps its own configuration attributes over rootAttributes and forwards id, class, and slot', () => {
    const root = render(
      Gauge({
        label: 'Rate',
        value: 1,
        max: 2,
        id: 'rate',
        className: 'tile-gauge',
        slot: 'start',
        rootAttributes: {
          'data-key': 'k',
          'data-variant': 'forged',
          'data-pinned': '',
        },
      }),
    );
    expect(root.id).toBe('rate');
    expect(root.className).toBe('kui-gauge tile-gauge');
    expect(root.getAttribute('slot')).toBe('start');
    expect(root.dataset.key).toBe('k');
    expect(root.dataset.variant).toBe('full');
    expect(root.hasAttribute('data-pinned')).toBe(false);
  });

  it.each([
    [{ value: 1, max: 0 }, 'Gauge max must be a positive number.'],
    [{ value: 1, max: Number.NaN }, 'Gauge max must be a positive number.'],
    [{ value: -1, max: 2 }, 'Gauge value must be zero or more.'],
    [
      { value: Number.POSITIVE_INFINITY, max: 2 },
      'Gauge value must be zero or more.',
    ],
  ])('rejects an invalid scale %o', (scale, message) => {
    expect(() => Gauge({ label: 'Rate', ...scale })).toThrow(
      new RangeError(message),
    );
  });
});

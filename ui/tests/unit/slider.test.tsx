import { describe, expect, it } from 'vitest';

import { Slider } from '../../src/components/forms/slider/slider.js';
import {
  syncSlider,
  wireSliders,
} from '../../src/components/forms/slider/wiring/wire-sliders.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  document.body.append(host);
  return host;
}

describe('Slider', () => {
  it('renders a labeled native range with a readout, fill, and hint', () => {
    const host = render(
      Slider({
        id: 'volume',
        label: 'Volume',
        value: 30,
        showValue: true,
        unit: '%',
        hint: 'Applies to every output device.',
        name: 'volume',
        action: 'set-volume',
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-slider')!;
    expect(root.dataset.component).toBe('slider');
    expect(root.dataset.size).toBe('default');
    expect(root.dataset.unit).toBe('%');
    const input = root.querySelector<HTMLInputElement>('input')!;
    expect(input.type).toBe('range');
    expect(input.id).toBe('volume');
    expect(input.name).toBe('volume');
    expect([input.min, input.max, input.step, input.value]).toEqual([
      '0',
      '100',
      '1',
      '30',
    ]);
    expect(input.dataset.action).toBe('set-volume');
    expect(input.getAttribute('aria-describedby')).toBe('volume-hint');
    expect(input.getAttribute('aria-valuetext')).toBe('30%');
    expect(input.style.getPropertyValue('--_kui-slider-fill')).toBe('30%');
    expect(root.querySelector('label')?.getAttribute('for')).toBe('volume');
    const output = root.querySelector('output')!;
    expect(output.textContent).toBe('30%');
    expect(output.getAttribute('for')).toBe('volume');
    expect(root.querySelector('#volume-hint')?.textContent).toBe(
      'Applies to every output device.',
    );
    host.remove();
  });

  it('defaults to the snapped midpoint, clamps, and renders ticks and an aria label', () => {
    const host = render(
      Slider({
        id: 'zoom',
        ariaLabel: 'Zoom',
        min: 50,
        max: 200,
        step: 25,
        ticks: [
          { value: 50, label: '50%' },
          { value: 100 },
          { value: 300, label: 'Max' },
        ],
        size: 'compact',
        disabled: true,
        form: 'settings',
        className: 'app-slider',
        slot: 'controls',
        rootAttributes: { 'data-key': 'zoom', 'data-unit': 'spoofed' },
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-slider')!;
    expect(root.className).toBe('kui-slider app-slider');
    expect(root.dataset.key).toBe('zoom');
    expect(root.hasAttribute('data-unit')).toBe(false);
    expect(root.querySelector('.kui-slider__header')).toBeNull();
    const input = root.querySelector<HTMLInputElement>('input')!;
    expect(input.value).toBe('125');
    expect(input.getAttribute('aria-label')).toBe('Zoom');
    expect(input.hasAttribute('aria-valuetext')).toBe(false);
    expect(input.disabled).toBe(true);
    expect(input.getAttribute('form')).toBe('settings');
    expect(input.hasAttribute('list')).toBe(false);
    expect(root.querySelector('#zoom-ticks')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    const ticks = [...root.querySelectorAll<HTMLElement>('.kui-slider__tick')];
    expect(ticks.map((t) => t.textContent)).toEqual(['50%', '', 'Max']);
    expect(
      ticks.map((t) => t.style.getPropertyValue('--_kui-slider-tick')),
    ).toEqual(['0%', '33.3333%', '100%']);
    expect(
      render(
        Slider({ id: 'over', ariaLabel: 'Over', value: 500 }),
      ).querySelector('input')?.value,
    ).toBe('100');
    host.remove();
  });

  it('rejects an inverted range or a non-positive step', () => {
    expect(() => Slider({ id: 'a', ariaLabel: 'A', min: 5, max: 1 })).toThrow(
      'Slider max must be a number at least min.',
    );
    expect(() => Slider({ id: 'a', ariaLabel: 'A', step: 0 })).toThrow(
      'Slider step must be a positive number.',
    );
  });
});

describe('wireSliders', () => {
  it('follows a drag: fill, readout, and spoken value text', () => {
    const host = render(
      Slider({
        id: 'drag',
        label: 'Brightness',
        value: 10,
        showValue: true,
        unit: '%',
      }),
    );
    const stop = wireSliders(host);
    const input = host.querySelector<HTMLInputElement>('input')!;
    input.value = '75';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.style.getPropertyValue('--_kui-slider-fill')).toBe('75%');
    expect(host.querySelector('output')?.textContent).toBe('75%');
    expect(input.getAttribute('aria-valuetext')).toBe('75%');
    stop();
    input.value = '20';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(host.querySelector('output')?.textContent).toBe('75%');
    host.remove();
  });

  it('ignores other inputs and syncs a unitless, readout-less slider', () => {
    const host = render(
      <div>
        <input type="text" class="other" />
        {Slider({ id: 'plain', ariaLabel: 'Plain', min: 10, max: 10 })}
      </div>,
    );
    const stop = wireSliders(host);
    host
      .querySelector('.other')!
      .dispatchEvent(new Event('input', { bubbles: true }));
    const input = host.querySelector<HTMLInputElement>('.kui-slider__input')!;
    syncSlider(input);
    expect(input.style.getPropertyValue('--_kui-slider-fill')).toBe('0%');
    expect(input.hasAttribute('aria-valuetext')).toBe(false);
    stop();
    host.remove();
  });
});

import { describe, expect, it } from 'vitest';

import { ColorSwatches } from '../../src/components/forms/color-swatches/color-swatches.js';
import { fillColor } from '../../src/shared/styles/css-values.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

const palette = [
  { value: 'none', label: 'No Color', color: 'transparent' as const },
  { value: '#ff3b30', label: 'Red', color: fillColor('#ff3b30') },
  { value: '#0a84ff', label: 'Blue', color: fillColor('#0a84ff') },
];

describe('ColorSwatches', () => {
  it('renders a labeled radio group of named swatches with the chosen one checked', () => {
    const host = render(
      ColorSwatches({
        name: 'color',
        label: 'Command Color',
        swatches: palette,
        value: '#0a84ff',
        action: 'pick-color',
        form: 'settings',
        id: 'swatches',
      }),
    );
    const root = host.querySelector<HTMLFieldSetElement>('fieldset')!;
    expect(root.className).toBe('kui-color-swatches');
    expect(root.dataset.component).toBe('color-swatches');
    expect(root.dataset.size).toBe('default');
    expect(root.id).toBe('swatches');
    expect(root.querySelector('legend')?.textContent).toBe('Command Color');
    const radios = [
      ...root.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ];
    expect(
      radios.map((r) => [
        r.name,
        r.value,
        r.getAttribute('aria-label'),
        r.checked,
      ]),
    ).toEqual([
      ['color', 'none', 'No Color', false],
      ['color', '#ff3b30', 'Red', false],
      ['color', '#0a84ff', 'Blue', true],
    ]);
    expect(
      radios.every(
        (r) =>
          r.dataset.action === 'pick-color' &&
          r.getAttribute('form') === 'settings',
      ),
    ).toBe(true);
    const swatches = [
      ...root.querySelectorAll<HTMLElement>('.kui-color-swatches__swatch'),
    ];
    expect(swatches.map((s) => s.title)).toEqual(['No Color', 'Red', 'Blue']);
    const dots = [
      ...root.querySelectorAll<HTMLElement>('.kui-color-swatches__dot'),
    ];
    expect(dots[0]!.dataset.swatch).toBe('transparent');
    expect(dots[0]!.hasAttribute('style')).toBe(false);
    expect(dots[1]!.dataset.swatch).toBe('color');
    expect(dots[1]!.getAttribute('style')).toBe(
      '--_kui-color-swatches-color:#ff3b30',
    );
  });

  it('names itself without a legend, sizes compact, disables, and keeps its markers', () => {
    const host = render(
      ColorSwatches({
        name: 'tint',
        ariaLabel: 'Tint',
        swatches: palette,
        size: 'compact',
        disabled: true,
        className: 'app-swatches',
        slot: 'tools',
        rootAttributes: { 'data-key': 'tint', 'data-size': 'spoofed' },
      }),
    );
    const root = host.querySelector<HTMLFieldSetElement>('fieldset')!;
    expect(root.getAttribute('aria-label')).toBe('Tint');
    expect(root.querySelector('legend')).toBeNull();
    expect(root.dataset.size).toBe('compact');
    expect(root.dataset.key).toBe('tint');
    expect(root.disabled).toBe(true);
    expect(root.className).toBe('kui-color-swatches app-swatches');
    expect(root.getAttribute('slot')).toBe('tools');
    expect(root.querySelectorAll('input:checked')).toHaveLength(0);
  });

  it('rejects a color that is not one CSS value', () => {
    expect(() =>
      ColorSwatches({
        name: 'c',
        ariaLabel: 'C',
        swatches: [
          { value: 'x', label: 'X', color: 'red; background: url(x)' as never },
        ],
      }),
    ).toThrow('A ColorSwatches color must be one CSS color value.');
  });
});

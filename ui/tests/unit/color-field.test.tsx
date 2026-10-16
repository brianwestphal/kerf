import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColorField } from '../../src/components/forms/color-field/color-field.js';
import { wireColorFields } from '../../src/components/forms/color-field/wiring/wire-color-fields.js';
import { fillColor } from '../../src/shared/styles/css-values.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  document.body.append(host);
  return host;
}

const flush = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));

afterEach(() => {
  document.body.replaceChildren();
});

describe('ColorField', () => {
  it('renders a labeled trigger with a swatch, hex, hint, error, and hidden input', () => {
    const host = render(
      ColorField({
        id: 'fill',
        label: 'Fill',
        value: 'rgba(10, 132, 255, 0.5)',
        mode: 'hsl',
        name: 'fill',
        form: 'doc',
        hint: 'Shapes only.',
        error: 'Too transparent.',
        required: true,
        size: 'compact',
        className: 'extra',
        slot: 'end',
        rootAttributes: { 'data-app': 'x', 'data-value': 'ignored' },
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-color-field')!;
    expect(root.className).toBe('kui-color-field extra');
    expect(root.dataset).toMatchObject({
      component: 'color-field',
      colorFieldId: 'fill',
      size: 'compact',
      value: '#0a84ff80',
      mode: 'hsl',
      app: 'x',
    });
    expect(root.hasAttribute('data-alpha')).toBe(true);
    expect(root.hasAttribute('data-invalid')).toBe(true);
    expect(root.getAttribute('slot')).toBe('end');
    const label = root.querySelector('label')!;
    expect(label.id).toBe('fill-label');
    expect(label.getAttribute('for')).toBe('fill');
    expect(label.querySelector('.kui-color-field__required')).not.toBeNull();
    const trigger = root.querySelector('button')!;
    expect(trigger.id).toBe('fill');
    expect(trigger.getAttribute('aria-labelledby')).toBe(
      'fill-label fill-value',
    );
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-describedby')).toBe(
      'fill-hint fill-error',
    );
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(
      root.querySelector('.kui-color-field__swatch')!.getAttribute('style'),
    ).toBe('--_kui-color-field-color:#0a84ff80');
    expect(root.querySelector('#fill-value')!.textContent).toBe('0A84FF80');
    expect(root.querySelector('#fill-hint')!.textContent).toBe('Shapes only.');
    expect(root.querySelector('#fill-error')!.textContent).toBe(
      'Too transparent.',
    );
    const hidden = root.querySelector<HTMLInputElement>('input[type=hidden]')!;
    expect(hidden.name).toBe('fill');
    expect(hidden.value).toBe('#0a84ff80');
    expect(hidden.getAttribute('form')).toBe('doc');
  });

  it('names a bare trigger with ariaLabel, drops opacity, and shows black for bad text', () => {
    const host = render(
      ColorField({
        id: 'accent',
        ariaLabel: 'Accent',
        value: '#bf5af280',
        alpha: false,
        disabled: true,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-color-field')!;
    expect(root.dataset.value).toBe('#bf5af2');
    expect(root.dataset.mode).toBe('rgb');
    expect(root.dataset.size).toBe('default');
    expect(root.hasAttribute('data-alpha')).toBe(false);
    expect(root.hasAttribute('data-invalid')).toBe(false);
    expect(root.querySelector('label')).toBeNull();
    const name = root.querySelector<HTMLElement>('#accent-label')!;
    expect(name.hidden).toBe(true);
    expect(name.textContent).toBe('Accent');
    const trigger = root.querySelector('button')!;
    expect(trigger.disabled).toBe(true);
    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
    expect(root.querySelector('input')).toBeNull();
    const bad = render(ColorField({ id: 'bad', label: 'Bad', value: 'nope' }));
    expect(
      bad.querySelector<HTMLElement>('.kui-color-field')!.dataset.value,
    ).toBe('#000000');
  });
});

describe('wireColorFields', () => {
  function setup(extra: Partial<Parameters<typeof ColorField>[0]> = {}) {
    const host = render(
      ColorField({
        id: 'fill',
        label: 'Fill',
        value: '#ff0000',
        mode: 'hsl',
        name: 'fill',
        ...extra,
      } as Parameters<typeof ColorField>[0]),
    );
    const onInput = vi.fn();
    const onChange = vi.fn();
    const stop = wireColorFields(host, {
      onInput,
      onChange,
      pickers: {
        fill: {
          presets: [
            { value: '#00ff00', label: 'Green', color: fillColor('#00ff00') },
          ],
        },
      },
    });
    const trigger = host.querySelector<HTMLButtonElement>('button')!;
    const picker = () =>
      document.querySelector<HTMLElement>('[data-component="color-picker"]');
    return { host, trigger, onInput, onChange, stop, picker };
  }

  it('opens a picker with the field value, model, label, and presets, previewing and reporting edits', async () => {
    const t = setup();
    t.trigger.click();
    expect(t.trigger.getAttribute('aria-expanded')).toBe('true');
    const picker = t.picker()!;
    expect(picker.id).toBe('fill-picker');
    expect(picker.getAttribute('aria-label')).toBe('Fill');
    expect(picker.dataset.value).toBe('#ff0000');
    expect(picker.dataset.mode).toBe('hsl');
    expect(picker.hasAttribute('data-alpha')).toBe(true);
    expect(
      picker.querySelector('[data-component="color-swatches"]'),
    ).not.toBeNull();
    // A second press while open does not stack another picker.
    t.trigger.click();
    expect(
      document.querySelectorAll('[data-component="color-picker"]'),
    ).toHaveLength(1);

    const hue = picker.querySelector<HTMLInputElement>(
      '.kui-color-picker__hue',
    )!;
    hue.value = '120';
    hue.dispatchEvent(new Event('input', { bubbles: true }));
    expect(t.onInput).toHaveBeenLastCalledWith({
      id: 'fill',
      value: '#00ff00',
      mode: 'hsl',
    });
    expect(t.host.querySelector('#fill-value')!.textContent).toBe('00FF00');
    expect(
      t.host
        .querySelector<HTMLElement>('.kui-color-field__swatch')!
        .style.getPropertyValue('--_kui-color-field-color'),
    ).toBe('#00ff00');
    expect(
      t.host.querySelector<HTMLInputElement>('input[type=hidden]')!.value,
    ).toBe('#00ff00');
    hue.dispatchEvent(new Event('change', { bubbles: true }));
    expect(t.onChange).toHaveBeenLastCalledWith({
      id: 'fill',
      value: '#00ff00',
      mode: 'hsl',
    });

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await flush();
    expect(t.picker()).toBeNull();
    expect(t.trigger.getAttribute('aria-expanded')).toBe('false');
    // It reopens on the committed value.
    t.trigger.click();
    expect(t.picker()!.dataset.value).toBe('#00ff00');
    t.stop();
    await flush();
    expect(t.picker()).toBeNull();
  });

  it('reports without callbacks, ignores disabled triggers and stray clicks, and falls back to a generic label', async () => {
    const host = render(
      `${ColorField({ id: 'a', ariaLabel: '', value: '#123456', alpha: false })}${ColorField({ id: 'b', label: 'B', value: '#000', disabled: true })}<p id="stray">x</p>`,
    );
    const stop = wireColorFields(host);
    host.querySelector<HTMLElement>('#stray')!.click();
    host.querySelector<HTMLButtonElement>('#b')!.click();
    expect(
      document.querySelector('[data-component="color-picker"]'),
    ).toBeNull();
    host.querySelector<HTMLButtonElement>('#a')!.click();
    const picker = document.querySelector<HTMLElement>(
      '[data-component="color-picker"]',
    )!;
    expect(picker.getAttribute('aria-label')).toBe('Color');
    expect(picker.hasAttribute('data-alpha')).toBe(false);
    const hue = picker.querySelector<HTMLInputElement>(
      '.kui-color-picker__hue',
    )!;
    hue.value = '0';
    hue.dispatchEvent(new Event('input', { bubbles: true }));
    hue.dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.querySelector('#a-value')!.textContent).toBe('561212');
    stop();
    await flush();
    expect(
      document.querySelector('[data-component="color-picker"]'),
    ).toBeNull();
    host.querySelector<HTMLButtonElement>('#a')!.click();
    expect(
      document.querySelector('[data-component="color-picker"]'),
    ).toBeNull();
  });
});

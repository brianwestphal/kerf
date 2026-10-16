import { mount, signal } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ColorPicker,
  type ColorPickerMode,
} from '../../src/components/forms/color-picker/color-picker.js';
import { wireColorPickers } from '../../src/components/forms/color-picker/wiring/wire-color-pickers.js';
import { fillColor } from '../../src/shared/styles/css-values.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

describe('ColorPicker', () => {
  it('renders the area, sliders, model menu, channel fields, and hex row from the value', () => {
    const host = render(
      ColorPicker({
        id: 'fill',
        label: 'Fill Color',
        value: 'rgba(216, 216, 216, 0.5)',
        name: 'fill',
        form: 'doc',
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-color-picker')!;
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-label')).toBe('Fill Color');
    expect(root.dataset.value).toBe('#d8d8d880');
    expect(root.dataset.mode).toBe('rgb');
    expect(root.hasAttribute('data-alpha')).toBe(true);
    const surface = root.querySelector<HTMLElement>(
      '.kui-color-picker__surface',
    )!;
    expect(surface.hasAttribute('data-morph-skip')).toBe(true);
    expect(surface.getAttribute('style')).toContain(
      '--_kui-color-picker-color:#d8d8d8',
    );
    const area = root.querySelector('.kui-color-picker__area')!;
    expect(area.getAttribute('role')).toBe('slider');
    expect(area.getAttribute('aria-valuetext')).toBe(
      'Saturation 0%, brightness 85%',
    );
    expect(
      root.querySelector<HTMLInputElement>('.kui-color-picker__hue')!.value,
    ).toBe('0');
    expect(
      root.querySelector<HTMLInputElement>('.kui-color-picker__opacity')!.value,
    ).toBe('50');
    expect(
      root.querySelector<HTMLSelectElement>('.kui-color-picker__mode')!.value,
    ).toBe('rgb');
    expect(
      [...root.querySelectorAll<HTMLOptionElement>('option')].map(
        (o) => o.textContent,
      ),
    ).toEqual(['RGBA', 'HSLA', 'HSBA', 'Grayscale']);
    expect(
      [
        ...root.querySelectorAll<HTMLInputElement>(
          '.kui-color-picker__channel',
        ),
      ].map((f) => [f.getAttribute('aria-label'), f.value]),
    ).toEqual([
      ['Red', '216'],
      ['Green', '216'],
      ['Blue', '216'],
    ]);
    expect(
      root.querySelector<HTMLInputElement>('.kui-color-picker__hex')!.value,
    ).toBe('D8D8D880');
    expect(
      root.querySelector<HTMLInputElement>('.kui-color-picker__opacity-field')!
        .value,
    ).toBe('50%');
    const hidden = root.querySelector<HTMLInputElement>(
      'input[type="hidden"]',
    )!;
    expect([hidden.name, hidden.value, hidden.getAttribute('form')]).toEqual([
      'fill',
      '#d8d8d880',
      'doc',
    ]);
    expect(
      root.querySelector<HTMLElement>('.kui-color-picker__eyedropper')!.hidden,
    ).toBe(true);
  });

  it("shows each model's channels, drops opacity, and renders presets, samples, and tools", () => {
    const fields = (mode: ColorPickerMode) =>
      [
        ...render(
          ColorPicker({ id: 'p', label: 'P', value: '#336699', mode }),
        ).querySelectorAll<HTMLInputElement>('.kui-color-picker__channel'),
      ]
        .filter((f) => !f.closest('label')!.hidden)
        .map((f) => [f.getAttribute('aria-label'), f.value]);
    expect(fields('hsl')).toEqual([
      ['Hue', '210'],
      ['Saturation', '50'],
      ['Lightness', '40'],
    ]);
    expect(fields('hsb')).toEqual([
      ['Hue', '210'],
      ['Saturation', '67'],
      ['Brightness', '60'],
    ]);
    expect(fields('gray')).toEqual([['Gray Level', '36']]);
    const host = render(
      ColorPicker({
        id: 'q',
        label: 'Q',
        value: 'nonsense',
        alpha: false,
        eyedropper: false,
        disabled: true,
        presets: [
          { value: '#ff0000', label: 'Red', color: fillColor('#ff0000') },
        ],
        samples: [
          {
            title: 'Document Colors',
            swatches: [
              { value: '#000000', label: 'Black', color: fillColor('#000000') },
            ],
          },
        ],
        addSampleAction: 'add-sample',
        className: 'app-picker',
        slot: 'inspector',
        rootAttributes: { 'data-key': 'q', 'data-value': 'spoofed' },
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-color-picker')!;
    expect(root.dataset.value).toBe('#000000');
    expect(root.dataset.key).toBe('q');
    expect(root.hasAttribute('data-alpha')).toBe(false);
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(root.className).toBe('kui-color-picker app-picker');
    expect(root.getAttribute('slot')).toBe('inspector');
    expect(root.querySelector('.kui-color-picker__opacity')).toBeNull();
    expect(root.querySelector('.kui-color-picker__eyedropper')).toBeNull();
    expect(
      [...root.querySelectorAll('option')].map((o) => o.textContent),
    ).toEqual(['RGB', 'HSL', 'HSB', 'Grayscale']);
    expect(
      root
        .querySelector('[data-action="add-sample"]')
        ?.getAttribute('aria-label'),
    ).toBe('Add to Samples');
    const groups = [
      ...root.querySelectorAll<HTMLElement>(':scope > .kui-color-swatches'),
    ];
    expect(
      groups.map(
        (g) =>
          g.getAttribute('aria-label') ??
          g.querySelector('legend')?.textContent,
      ),
    ).toEqual(['Presets', 'Document Colors']);
    expect(
      root.querySelector<HTMLInputElement>(
        'input[type="radio"][value="#000000"]',
      )!.checked,
    ).toBe(true);
    expect(root.querySelector('input[type="hidden"]')).toBeNull();
  });
});

describe('wireColorPickers', () => {
  const hosts: HTMLElement[] = [];
  afterEach(() => {
    for (const host of hosts.splice(0)) host.remove();
  });

  function setup(initial = '#d8d8d8', mode: ColorPickerMode = 'rgb') {
    const value = signal(initial);
    const host = document.createElement('div');
    document.body.append(host);
    hosts.push(host);
    const dispose = mount(host, () => (
      <ColorPicker
        id="fill"
        label="Fill"
        value={value.value}
        mode={mode}
        presets={[
          { value: '#ff0000', label: 'Red', color: fillColor('#ff0000') },
        ]}
      />
    ));
    const onInput = vi.fn();
    const onChange = vi.fn(({ value: next }: { value: string }) => {
      value.value = next;
    });
    const stop = wireColorPickers(host, { onInput, onChange });
    const q = <T extends Element>(selector: string) =>
      host.querySelector<T>(selector)!;
    return { value, host, onInput, onChange, stop, dispose, q };
  }

  it('moves the area with the arrow keys and commits on key up', () => {
    const t = setup('#ff0000');
    const area = t.q<HTMLElement>('.kui-color-picker__area');
    area.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(t.onInput).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'fill', value: '#ff1919', mode: 'rgb' }),
    );
    expect(area.getAttribute('aria-valuetext')).toBe(
      'Saturation 90%, brightness 100%',
    );
    area.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    );
    for (const key of [
      'ArrowRight',
      'ArrowUp',
      'PageUp',
      'PageDown',
      'Home',
      'End',
    ])
      area.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    area.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'x',
        bubbles: true,
        cancelable: true,
      }),
    );
    area.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'End', bubbles: true }),
    );
    expect(t.onChange).toHaveBeenCalledTimes(1);
    expect(t.value.value).toBe('#e60000');
    t.stop();
    t.dispose();
  });

  it('follows the hue and opacity sliders and reports kui-color events', () => {
    const t = setup('#ff0000');
    const events: string[] = [];
    t.host.addEventListener('kui-color-input', (e) =>
      events.push(`input ${(e as CustomEvent).detail.value}`),
    );
    t.host.addEventListener('kui-color-change', (e) =>
      events.push(`change ${(e as CustomEvent).detail.value}`),
    );
    const hue = t.q<HTMLInputElement>('.kui-color-picker__hue');
    hue.value = '120';
    hue.dispatchEvent(new Event('input', { bubbles: true }));
    hue.dispatchEvent(new Event('change', { bubbles: true }));
    const opacity = t.q<HTMLInputElement>('.kui-color-picker__opacity');
    opacity.value = '50';
    opacity.dispatchEvent(new Event('input', { bubbles: true }));
    opacity.dispatchEvent(new Event('change', { bubbles: true }));
    expect(events).toEqual([
      'input #00ff00',
      'change #00ff00',
      'input #00ff0080',
      'change #00ff0080',
    ]);
    expect(t.q<HTMLInputElement>('.kui-color-picker__hex').value).toBe(
      '00FF0080',
    );
    expect(
      t.q<HTMLInputElement>('.kui-color-picker__opacity-field').value,
    ).toBe('50%');
    t.stop();
    t.dispose();
  });

  it('commits channel, hex, and opacity fields on Enter or blur, restoring on Escape or bad input', () => {
    const t = setup('#d8d8d8');
    const field = (selector: string) => t.q<HTMLInputElement>(selector);
    const commit = (
      input: HTMLInputElement,
      text: string,
      how: 'enter' | 'blur' = 'enter',
    ) => {
      input.value = text;
      if (how === 'enter')
        input.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
          }),
        );
      else input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    };
    commit(field('[data-channel="0"]'), '255');
    expect(t.value.value).toBe('#ffd8d8');
    commit(field('.kui-color-picker__hex'), '#123', 'blur');
    expect(t.value.value).toBe('#112233');
    commit(field('.kui-color-picker__hex'), 'zz');
    expect(field('.kui-color-picker__hex').value).toBe('112233');
    commit(field('.kui-color-picker__hex'), '12345');
    expect(field('.kui-color-picker__hex').value).toBe('112233');
    commit(field('.kui-color-picker__opacity-field'), '25%');
    expect(t.value.value).toBe('#11223340');
    commit(field('.kui-color-picker__opacity-field'), 'half');
    expect(field('.kui-color-picker__opacity-field').value).toBe('25%');
    commit(field('[data-channel="1"]'), 'x');
    expect(field('[data-channel="1"]').value).toBe('34');
    field('[data-channel="2"]').value = '999';
    field('[data-channel="2"]').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(field('[data-channel="2"]').value).toBe('51');
    const before = t.onChange.mock.calls.length;
    field('[data-channel="2"]').dispatchEvent(
      new FocusEvent('focusout', { bubbles: true }),
    );
    expect(t.onChange.mock.calls.length).toBe(before);
    t.stop();
    t.dispose();
  });

  it("switches models, editing each one's channels, and applies swatches", () => {
    const t = setup('#336699');
    const select = t.q<HTMLSelectElement>('.kui-color-picker__mode');
    const channel = (i: number) =>
      t.q<HTMLInputElement>(`[data-channel="${i}"]`);
    const enter = (input: HTMLInputElement, text: string) => {
      input.value = text;
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    select.value = 'hsl';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(t.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'hsl' }),
    );
    expect(channel(0).getAttribute('aria-label')).toBe('Hue');
    enter(channel(2), '50');
    expect(t.value.value).toBe('#4080bf');
    select.value = 'hsb';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    enter(channel(1), '0');
    expect(t.value.value).toBe('#bfbfbf');
    select.value = 'rgb';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    enter(channel(0), '191');
    expect(t.value.value).toBe('#bfbfbf');
    select.value = 'gray';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(t.q('.kui-color-picker__channels').getAttribute('data-count')).toBe(
      '1',
    );
    expect((channel(1).closest('label') as HTMLLabelElement).hidden).toBe(true);
    enter(channel(0), '50');
    expect(t.value.value).toBe('#808080');
    const red = t.q<HTMLInputElement>('input[type="radio"][value="#ff0000"]');
    red.checked = true;
    red.dispatchEvent(new Event('change', { bubbles: true }));
    expect(t.value.value).toBe('#ff0000');
    t.stop();
    t.dispose();
  });

  it('adopts a new value and mode from an app re-render, keeping a switched model on a value change', async () => {
    const t = setup('#ff0000');
    const select = t.q<HTMLSelectElement>('.kui-color-picker__mode');
    select.value = 'hsb';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    t.value.value = '#0000ff';
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    expect(t.q<HTMLInputElement>('.kui-color-picker__hex').value).toBe(
      '0000FF',
    );
    expect(t.q<HTMLSelectElement>('.kui-color-picker__mode').value).toBe('hsb');
    expect(t.q<HTMLInputElement>('[data-channel="0"]').value).toBe('240');
    t.q<HTMLElement>('.kui-color-picker').dataset.mode = 'gray';
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    expect(t.q('.kui-color-picker__channels').getAttribute('data-count')).toBe(
      '1',
    );
    t.q<HTMLElement>('.kui-color-picker').dataset.value = 'bad';
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    expect(t.q<HTMLInputElement>('.kui-color-picker__hex').value).toBe(
      '0000FF',
    );
    t.stop();
    t.dispose();
  });

  it('samples the screen through the EyeDropper API where it exists', async () => {
    const open = vi
      .fn()
      .mockResolvedValueOnce({ sRGBHex: '#00ff00' })
      .mockRejectedValueOnce(new Error('dismissed'));
    (globalThis as Record<string, unknown>).EyeDropper = class {
      open = open;
    };
    try {
      const t = setup('#ff0000');
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
      const button = t.q<HTMLButtonElement>('.kui-color-picker__eyedropper');
      expect(button.hidden).toBe(false);
      button.click();
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
      expect(t.value.value).toBe('#00ff00');
      button.click();
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
      expect(t.value.value).toBe('#00ff00');
      t.stop();
      t.dispose();
    } finally {
      delete (globalThis as Record<string, unknown>).EyeDropper;
    }
  });

  it('drags the area with a pointer, ignores other buttons, disabled pickers, and strays', () => {
    const value = signal('#ff0000');
    const disabled = signal(false);
    const host = document.createElement('div');
    document.body.append(host);
    hosts.push(host);
    const dispose = mount(host, () => (
      <div>
        <ColorPicker
          id="drag"
          label="Drag"
          value={value.value}
          name="fill"
          disabled={disabled.value}
        />
        <input class="kui-color-picker__hex" value="stray" data-stray="" />
        <select class="stray-select" />
      </div>
    ));
    const onChange = vi.fn(({ value: next }: { value: string }) => {
      value.value = next;
    });
    const onInput = vi.fn();
    const stop = wireColorPickers(host, { onChange, onInput });
    const area = host.querySelector<HTMLElement>('.kui-color-picker__area')!;
    area.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const pointer = (type: string, x: number, y: number, button = 0) =>
      area.dispatchEvent(
        new PointerEvent(type, {
          clientX: x,
          clientY: y,
          button,
          bubbles: true,
          cancelable: true,
        }),
      );
    pointer('pointerdown', 50, 50, 2);
    expect(onInput).not.toHaveBeenCalled();
    pointer('pointermove', 50, 50);
    pointer('pointerup', 50, 50);
    expect(onChange).not.toHaveBeenCalled();
    pointer('pointerdown', 50, 50);
    pointer('pointermove', 100, 0);
    pointer('pointerup', 100, 0);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(value.value).toBe('#ff0000');
    expect(
      host.querySelector<HTMLInputElement>('input[type="hidden"]')!.value,
    ).toBe('#ff0000');
    // A stray field, select, and click outside any picker do nothing.
    const stray = host.querySelector<HTMLInputElement>('input[data-stray]')!;
    stray.value = '#00ff00';
    stray.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    stray.dispatchEvent(new Event('input', { bubbles: true }));
    stray.dispatchEvent(new Event('change', { bubbles: true }));
    host
      .querySelector('.stray-select')!
      .dispatchEvent(new Event('input', { bubbles: true }));
    host.click();
    host
      .querySelector<HTMLInputElement>('[data-channel="0"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
    // An RGB edit that lands on gray keeps the hue.
    const channel = (i: number) =>
      host.querySelector<HTMLInputElement>(`[data-channel="${i}"]`)!;
    channel(1).value = '255';
    channel(1).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    channel(2).value = '255';
    channel(2).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(value.value).toBe('#ffffff');
    expect(
      host.querySelector<HTMLInputElement>('.kui-color-picker__hue')!.value,
    ).toBe('60');
    // Disabled: the area takes no pointer or keys.
    disabled.value = true;
    const before = onInput.mock.calls.length;
    pointer('pointerdown', 10, 10);
    area.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
      }),
    );
    area.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }),
    );
    expect(onInput.mock.calls.length).toBe(before);
    stop();
    dispose();
  });

  it('mirrors the area arrows right to left', () => {
    const t = setup('#ff0000');
    const area = t.q<HTMLElement>('.kui-color-picker__area');
    area.style.direction = 'rtl';
    area.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(area.getAttribute('aria-valuetext')).toBe(
      'Saturation 90%, brightness 100%',
    );
    area.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(area.getAttribute('aria-valuetext')).toBe(
      'Saturation 100%, brightness 100%',
    );
    t.stop();
    t.dispose();
  });

  it('keeps an opaque picker opaque when a hex with alpha is typed or sampled', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    hosts.push(host);
    const dispose = mount(host, () => (
      <ColorPicker id="opaque" label="Opaque" value="#336699" alpha={false} />
    ));
    const onChange = vi.fn();
    const stop = wireColorPickers(host, { onChange });
    const hex = host.querySelector<HTMLInputElement>('.kui-color-picker__hex')!;
    hex.value = '11223380';
    hex.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: '#112233' }),
    );
    expect(hex.value).toBe('112233');
    stop();
    dispose();
  });
});

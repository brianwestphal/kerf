import {
  COLOR_PICKER_CHANNELS,
  COLOR_PICKER_SWATCH_ACTION,
  colorPickerAreaText,
  colorPickerChannels,
  type ColorPickerMode,
  colorPickerStyle,
} from '../color-picker.js';
import {
  formatHex,
  hslToRgb,
  type Hsva,
  hsvForValue,
  hsvToRgb,
  rgbToHsv,
} from '../model/color-model.js';

/** Reported to {@link WireColorPickersOptions.onInput} and `onChange`. */
export interface ColorPickerChange {
  id: string;
  /** `#rrggbb`, or `#rrggbbaa` below full opacity. */
  value: string;
  mode: ColorPickerMode;
  element: HTMLElement;
}

export interface WireColorPickersOptions {
  /** Every live change: a drag, an arrow key, a field edit. */
  onInput?: (change: ColorPickerChange) => void;
  /** A committed change: a drag or key run ending, a field or swatch commit, a mode switch. */
  onChange?: (change: ColorPickerChange) => void;
}

/** The live color each wired picker shows, keyed by its root element. */
interface PickerState {
  hsv: Hsva;
  mode: ColorPickerMode;
  /** The hex last reported or adopted, to tell an app re-render from an echo. */
  value: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isMode = (value: string | undefined): value is ColorPickerMode =>
  value === 'rgb' || value === 'hsl' || value === 'hsb' || value === 'gray';

/**
 * Make every ColorPicker under `root` interactive. The area takes pointer
 * drags and the arrow keys (Shift for steps of 10%); the hue and opacity
 * sliders are native ranges; channel, hex, and opacity fields commit on Enter
 * or blur; the model menu switches the channel fields; the screen sampler
 * opens the EyeDropper where the browser has it; preset and sample swatches
 * apply their color. Each change updates the picker at once, dispatches a
 * bubbling `kui-color-input` (or `kui-color-change` when committed) event
 * with `{ value, mode }`, and calls `onInput` / `onChange`. When the app
 * re-renders a picker with a different `value`, the picker adopts it.
 * Returns a disposer.
 */
export function wireColorPickers(
  root: HTMLElement,
  { onInput, onChange }: WireColorPickersOptions = {},
): () => void {
  const states = new WeakMap<HTMLElement, PickerState>();

  const pickerOf = (element: Element | null) =>
    element?.closest<HTMLElement>('[data-component="color-picker"]') ?? null;

  const alphaOn = (picker: HTMLElement) => picker.hasAttribute('data-alpha');

  const stateOf = (picker: HTMLElement): PickerState => {
    let state = states.get(picker);
    if (!state) {
      // The render always writes a formatted hex and a model.
      const value = picker.dataset.value!;
      state = {
        hsv: hsvForValue(value)!,
        mode: picker.dataset.mode as ColorPickerMode,
        value,
      };
      states.set(picker, state);
    }
    return state;
  };

  const hexOf = (picker: HTMLElement, hsv: Hsva) =>
    formatHex(hsvToRgb(alphaOn(picker) ? hsv : { ...hsv, a: 1 }));

  /** Repaint the wiring-owned surface from the state. */
  const paint = (picker: HTMLElement, skipField?: Element) => {
    const { hsv, mode } = stateOf(picker);
    const surface = picker.querySelector<HTMLElement>(
      '.kui-color-picker__surface',
    )!;
    surface.setAttribute('style', colorPickerStyle(hsv));
    const area = surface.querySelector<HTMLElement>('.kui-color-picker__area');
    area?.setAttribute('aria-valuenow', String(Math.round(hsv.s * 100)));
    area?.setAttribute('aria-valuetext', colorPickerAreaText(hsv));
    const hue = surface.querySelector<HTMLInputElement>(
      '.kui-color-picker__hue',
    );
    if (hue && hue !== skipField) hue.value = String(Math.round(hsv.h));
    const opacity = `${Math.round(hsv.a * 100)}%`;
    const slider = surface.querySelector<HTMLInputElement>(
      '.kui-color-picker__opacity',
    );
    if (slider && slider !== skipField) {
      slider.value = String(Math.round(hsv.a * 100));
      slider.setAttribute('aria-valuetext', opacity);
    }
    const channels = COLOR_PICKER_CHANNELS[mode];
    const values = colorPickerChannels(mode, hsv);
    surface
      .querySelector('.kui-color-picker__channels')
      ?.setAttribute('data-count', String(channels.length));
    for (const field of surface.querySelectorAll<HTMLInputElement>(
      '.kui-color-picker__channel',
    )) {
      const index = Number(field.dataset.channel);
      const channel = channels[index];
      const label = field.closest('label')!;
      label.hidden = channel === undefined;
      label.querySelector('.kui-color-picker__field-label')!.textContent =
        channel === undefined ? '' : channel.short;
      if (channel) field.setAttribute('aria-label', channel.name);
      if (field !== skipField)
        field.value = channel ? String(values[index]) : '';
      field.dataset.shown = field.value;
    }
    const hex = hexOf(picker, hsv);
    const hexField = surface.querySelector<HTMLInputElement>(
      '.kui-color-picker__hex',
    )!;
    if (hexField !== skipField) hexField.value = hex.slice(1).toUpperCase();
    hexField.dataset.shown = hexField.value;
    const opacityField = surface.querySelector<HTMLInputElement>(
      '.kui-color-picker__opacity-field',
    );
    if (opacityField && opacityField !== skipField)
      opacityField.value = opacity;
    if (opacityField) opacityField.dataset.shown = opacityField.value;
    const hidden = surface.querySelector<HTMLInputElement>(
      'input[type="hidden"]',
    );
    if (hidden) hidden.value = hex;
    surface.querySelector<HTMLSelectElement>('.kui-color-picker__mode')!.value =
      mode;
  };

  const report = (picker: HTMLElement, committed: boolean) => {
    const state = stateOf(picker);
    const value = hexOf(picker, state.hsv);
    state.value = value;
    const change: ColorPickerChange = {
      id: picker.dataset.colorPickerId!,
      value,
      mode: state.mode,
      element: picker,
    };
    picker.dispatchEvent(
      new CustomEvent(committed ? 'kui-color-change' : 'kui-color-input', {
        bubbles: true,
        detail: { value, mode: state.mode },
      }),
    );
    if (committed) onChange?.(change);
    else onInput?.(change);
  };

  const update = (
    picker: HTMLElement,
    next: Partial<Hsva>,
    committed: boolean,
    skipField?: Element,
  ) => {
    const state = stateOf(picker);
    state.hsv = { ...state.hsv, ...next };
    paint(picker, skipField);
    report(picker, committed);
  };

  const disabled = (picker: HTMLElement) =>
    picker.hasAttribute('data-disabled');

  // The area: pointer drags.
  let dragging: { picker: HTMLElement; area: HTMLElement } | undefined;
  const fromPointer = (event: PointerEvent, area: HTMLElement) => {
    const box = area.getBoundingClientRect();
    return {
      s: clamp((event.clientX - box.left) / box.width, 0, 1),
      v: clamp(1 - (event.clientY - box.top) / box.height, 0, 1),
    };
  };
  const onPointerDown = (event: PointerEvent) => {
    const area = (event.target as Element).closest<HTMLElement>(
      '.kui-color-picker__area',
    );
    const picker = pickerOf(area);
    if (!area || !picker || disabled(picker) || event.button !== 0) return;
    event.preventDefault();
    area.focus();
    area.setPointerCapture?.(event.pointerId);
    dragging = { picker, area };
    update(picker, fromPointer(event, area), false);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    update(dragging.picker, fromPointer(event, dragging.area), false);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    const { picker } = dragging;
    dragging = undefined;
    report(picker, true);
  };

  // The area: the arrow keys, Home / End, and Page Up / Down.
  const onKeyDown = (event: KeyboardEvent) => {
    const area = (event.target as Element).closest<HTMLElement>(
      '.kui-color-picker__area',
    );
    const picker = pickerOf(area);
    if (!area || !picker || disabled(picker)) {
      onFieldKey(event);
      return;
    }
    const step = event.shiftKey ? 0.1 : 0.01;
    const { s, v } = stateOf(picker).hsv;
    const rtl = globalThis.getComputedStyle(area).direction === 'rtl';
    const moves: Record<string, Partial<Hsva>> = {
      ArrowRight: { s: clamp(s + (rtl ? -step : step), 0, 1) },
      ArrowLeft: { s: clamp(s - (rtl ? -step : step), 0, 1) },
      ArrowUp: { v: clamp(v + step, 0, 1) },
      ArrowDown: { v: clamp(v - step, 0, 1) },
      PageUp: { v: clamp(v + 0.1, 0, 1) },
      PageDown: { v: clamp(v - 0.1, 0, 1) },
      Home: { s: 0 },
      End: { s: 1 },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    update(picker, move, false);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const picker = pickerOf(
      (event.target as Element).closest('.kui-color-picker__area'),
    );
    if (
      picker &&
      /^(Arrow|Page|Home$|End$)/.test(event.key) &&
      !disabled(picker)
    )
      report(picker, true);
  };

  // Fields: Enter commits; Escape restores the shown value.
  const commitField = (field: HTMLInputElement) => {
    const picker = pickerOf(field);
    if (!picker) return;
    // Leaving a field the person did not edit commits nothing.
    if (field.value === (field.dataset.shown ?? field.getAttribute('value')))
      return;
    const state = stateOf(picker);
    if (field.classList.contains('kui-color-picker__hex')) {
      const raw = field.value.trim().replace(/^#/, '');
      const next = /^[\da-f]{3,8}$/i.test(raw)
        ? hsvForValue(`#${raw}`, state.hsv)
        : undefined;
      if (next && [3, 4, 6, 8].includes(raw.length)) {
        update(picker, alphaOn(picker) ? next : { ...next, a: 1 }, true);
        return;
      }
      paint(picker);
      return;
    }
    if (field.classList.contains('kui-color-picker__opacity-field')) {
      const number = Number.parseFloat(field.value);
      if (Number.isFinite(number))
        update(picker, { a: clamp(number, 0, 100) / 100 }, true);
      else paint(picker);
      return;
    }
    const index = Number(field.dataset.channel);
    const channels = COLOR_PICKER_CHANNELS[state.mode];
    const channel = channels[index];
    const number = Number.parseFloat(field.value);
    if (!channel || !Number.isFinite(number)) {
      paint(picker);
      return;
    }
    const values = colorPickerChannels(state.mode, state.hsv);
    values[index] = clamp(number, 0, channel.max);
    const { a } = state.hsv;
    let next: Hsva;
    switch (state.mode) {
      case 'rgb':
        next = rgbToHsv({ r: values[0]!, g: values[1]!, b: values[2]!, a });
        if (next.s === 0) next.h = state.hsv.h;
        break;
      case 'hsl': {
        const rgba = hslToRgb({
          h: values[0]!,
          s: values[1]! / 100,
          l: values[2]! / 100,
          a,
        });
        next = { ...rgbToHsv(rgba), h: values[0]! };
        break;
      }
      case 'hsb':
        next = { h: values[0]!, s: values[1]! / 100, v: values[2]! / 100, a };
        break;
      case 'gray':
        next = { h: state.hsv.h, s: 0, v: values[0]! / 100, a };
        break;
    }
    update(picker, next, true);
  };
  const onFieldKey = (event: KeyboardEvent) => {
    const field = event.target;
    if (
      !(field instanceof HTMLInputElement) ||
      !field.matches(
        '.kui-color-picker__channel, .kui-color-picker__hex, .kui-color-picker__opacity-field',
      )
    )
      return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitField(field);
    } else if (event.key === 'Escape') {
      const picker = pickerOf(field);
      if (picker) paint(picker);
    }
  };
  const onFocusOut = (event: FocusEvent) => {
    const field = event.target;
    if (
      field instanceof HTMLInputElement &&
      field.matches(
        '.kui-color-picker__channel, .kui-color-picker__hex, .kui-color-picker__opacity-field',
      )
    )
      commitField(field);
  };

  // Sliders, the model menu, and swatches.
  const onInputEvent = (event: Event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const picker = pickerOf(input);
    if (!picker) return;
    if (input.classList.contains('kui-color-picker__hue')) {
      event.stopPropagation();
      update(picker, { h: Number(input.value) }, false, input);
    } else if (input.classList.contains('kui-color-picker__opacity')) {
      event.stopPropagation();
      update(picker, { a: Number(input.value) / 100 }, false, input);
    }
  };
  const onChangeEvent = (event: Event) => {
    const target = event.target;
    const picker = pickerOf(target as Element);
    if (!picker) return;
    if (
      target instanceof HTMLInputElement &&
      target.matches('.kui-color-picker__hue, .kui-color-picker__opacity')
    ) {
      event.stopPropagation();
      report(picker, true);
      return;
    }
    if (
      target instanceof HTMLSelectElement &&
      target.classList.contains('kui-color-picker__mode') &&
      isMode(target.value)
    ) {
      event.stopPropagation();
      stateOf(picker).mode = target.value;
      paint(picker);
      report(picker, true);
      return;
    }
    if (
      target instanceof HTMLInputElement &&
      target.dataset.action === COLOR_PICKER_SWATCH_ACTION
    ) {
      event.stopPropagation();
      const state = stateOf(picker);
      const next = hsvForValue(target.value, state.hsv);
      if (next) update(picker, next, true);
    }
  };

  // The screen sampler, where the browser has it.
  type EyeDropperConstructor = new () => {
    open(): Promise<{ sRGBHex: string }>;
  };
  const EyeDropperApi = (
    globalThis as typeof globalThis & { EyeDropper?: EyeDropperConstructor }
  ).EyeDropper;
  const revealSamplers = () => {
    if (!EyeDropperApi) return;
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      '.kui-color-picker__eyedropper[hidden]',
    ))
      button.hidden = false;
  };
  const onClick = (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      '.kui-color-picker__eyedropper',
    );
    const picker = pickerOf(button);
    if (!button || !picker || !EyeDropperApi || disabled(picker)) return;
    new EyeDropperApi().open().then(
      ({ sRGBHex }) => {
        const state = stateOf(picker);
        const next = hsvForValue(sRGBHex, state.hsv);
        if (next) update(picker, { ...next, a: state.hsv.a }, true);
      },
      () => {
        // The person dismissed the sampler; nothing changes.
      },
    );
  };

  // Adopt a new controlled value or mode from an app re-render. Only the
  // attribute that actually changed is adopted, so a value-only re-render
  // keeps a model the person switched to.
  const adopt = (picker: HTMLElement, attribute: string | null) => {
    const state = stateOf(picker);
    if (attribute === 'data-mode') {
      const mode = picker.dataset.mode;
      if (isMode(mode) && mode !== state.mode) {
        state.mode = mode;
        paint(picker);
      }
      return;
    }
    const value = picker.dataset.value;
    if (value === undefined || value === state.value) return;
    const next = hsvForValue(value, state.hsv);
    if (!next) return;
    state.hsv = next;
    state.value = value;
    paint(picker);
  };
  const observer = new MutationObserver((records) => {
    revealSamplers();
    for (const record of records) {
      if (record.type !== 'attributes') continue;
      const picker = record.target as HTMLElement;
      if (picker.matches('[data-component="color-picker"]'))
        adopt(picker, record.attributeName);
    }
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-value', 'data-mode'],
  });
  revealSamplers();

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('keyup', onKeyUp);
  root.addEventListener('focusout', onFocusOut);
  root.addEventListener('input', onInputEvent);
  root.addEventListener('change', onChangeEvent);
  root.addEventListener('click', onClick);
  return () => {
    observer.disconnect();
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerup', onPointerUp);
    root.removeEventListener('pointercancel', onPointerUp);
    root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('keyup', onKeyUp);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('input', onInputEvent);
    root.removeEventListener('change', onChangeEvent);
    root.removeEventListener('click', onClick);
  };
}

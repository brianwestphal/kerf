import { signal } from 'kerfjs';

import { openAnchoredSurface } from '../../../feedback/anchored-surface/anchored-surface.js';
import {
  ColorPicker,
  type ColorPickerMode,
  type ColorPickerProps,
} from '../../color-picker/color-picker.js';
import { wireColorPickers } from '../../color-picker/wiring/wire-color-pickers.js';

/** Reported to {@link WireColorFieldsOptions.onInput} and `onChange`. */
export interface ColorFieldChange {
  id: string;
  /** `#rrggbb`, or `#rrggbbaa` below full opacity. */
  value: string;
  mode: ColorPickerMode;
}

/** The picker options a field's popup takes beyond its value, model, and opacity. */
export type ColorFieldPickerOptions = Pick<
  ColorPickerProps,
  'presets' | 'samples' | 'addSampleAction' | 'eyedropper'
>;

export interface WireColorFieldsOptions {
  /** Every live edit in the open picker. */
  onInput?: (change: ColorFieldChange) => void;
  /** A committed edit: apply it and re-render the ColorField with it. */
  onChange?: (change: ColorFieldChange) => void;
  /** Per-field picker options (presets, samples, the sampler), keyed by field id. */
  pickers?: Readonly<Record<string, ColorFieldPickerOptions>>;
}

/**
 * Wire every ColorField under `root`: pressing a field's trigger opens a
 * ColorPicker in an AnchoredSurface below it, with the field's value, model,
 * and opacity, plus any `pickers[id]` options. Edits preview at once on the
 * trigger's swatch and hex and go to `onInput`; committed edits go to
 * `onChange`. Escape or a press outside closes the picker and returns focus
 * to the trigger. Returns a disposer that also closes an open picker.
 */
export function wireColorFields(
  root: HTMLElement,
  { onInput, onChange, pickers = {} }: WireColorFieldsOptions = {},
): () => void {
  const open = new Map<HTMLElement, () => void>();

  const preview = (field: HTMLElement, value: string) => {
    field
      .querySelector<HTMLElement>('.kui-color-field__swatch')!
      .style.setProperty('--_kui-color-field-color', value);
    field.querySelector('.kui-color-field__hex')!.textContent = value
      .slice(1)
      .toUpperCase();
    const hidden = field.querySelector<HTMLInputElement>(
      'input[type="hidden"]',
    );
    if (hidden) hidden.value = value;
  };

  const onClick = (event: MouseEvent) => {
    const trigger = (event.target as Element).closest<HTMLButtonElement>(
      '.kui-color-field__trigger',
    );
    const field = trigger?.closest<HTMLElement>(
      '[data-component="color-field"]',
    );
    if (!trigger || !field || trigger.disabled || open.has(field)) return;
    const id = field.dataset.colorFieldId!;
    const value = signal(field.dataset.value!);
    const mode = signal(field.dataset.mode as ColorPickerMode);
    const label =
      root.ownerDocument.getElementById(`${id}-label`)?.textContent?.trim() ||
      'Color';
    const handle = openAnchoredSurface(
      trigger,
      () => (
        <ColorPicker
          {...pickers[id]}
          id={`${id}-picker`}
          label={label}
          value={value.value}
          mode={mode.value}
          alpha={field.hasAttribute('data-alpha')}
        />
      ),
      { label, placement: 'bottom', align: 'start' },
    );
    trigger.setAttribute('aria-expanded', 'true');
    const report =
      (committed: boolean) =>
      (change: { value: string; mode: ColorPickerMode }) => {
        preview(field, change.value);
        const payload = { id, value: change.value, mode: change.mode };
        if (committed) {
          // Until the app re-renders, the next open starts from this edit.
          field.dataset.value = change.value;
          field.dataset.mode = change.mode;
          value.value = change.value;
          mode.value = change.mode;
          onChange?.(payload);
        } else onInput?.(payload);
      };
    const stopPicker = wireColorPickers(handle.el, {
      onInput: report(false),
      onChange: report(true),
    });
    const close = () => handle.close();
    open.set(field, close);
    void handle.result.then(() => {
      stopPicker();
      open.delete(field);
      trigger.setAttribute('aria-expanded', 'false');
    });
  };

  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
    for (const close of open.values()) close();
  };
}

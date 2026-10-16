# ColorField

`@kerfjs/ui/color-field` puts a color in a form or inspector without keeping a
full picker open. It is a label above a trigger that shows the color as a
swatch (over a checkerboard, so opacity reads) and its hex value. Pressing the
trigger opens a [`ColorPicker`](./color-picker.md) in an `AnchoredSurface`
below it.

```tsx
import { ColorField } from "@kerfjs/ui/color-field";
import { wireColorFields } from "@kerfjs/ui/wire-color-fields";

<ColorField id="fill" label="Fill" value={fill.value} mode={mode.value} name="fill" />;

const stop = wireColorFields(root, {
  onChange: ({ value, mode: next }) => {
    fill.value = value;
    mode.value = next;
  },
  pickers: { fill: { presets } },
});
```

## Props

- `id` (required): the trigger's id; it prefixes the label, value, hint, and
  error ids.
- `label`, or `ariaLabel` for a field without a visible label.
- `value` (required): CSS color text; invalid text shows black.
- `mode`: the picker's model when it opens — `rgb` (default), `hsl`, `hsb`,
  or `gray`.
- `alpha` (default true): offer opacity. Without it the value is opaque.
- `name`, `form`: a hidden input submits the hex value.
- `hint`, `error` (an error marks the field invalid), `required`, `disabled`.
- `size`: `default` or `compact`, matching TextField's sizes.
- `className`, `rootAttributes`, `slot`.

## Wiring and values

`wireColorFields(root, { onInput?, onChange?, pickers? })` wires every
ColorField under `root`:

- Pressing a trigger opens a ColorPicker with the field's value, model, and
  opacity, plus any `pickers[id]` options (`presets`, `samples`,
  `addSampleAction`, `eyedropper`).
- Edits preview at once on the trigger's swatch, hex, and hidden input.
  Live edits go to `onInput`; committed edits go to `onChange` with
  `{ id, value, mode }`. Re-render the field with the reported value and mode.
- Escape or a press outside closes the picker, and focus returns to the
  trigger. The surface stays on screen, flipping above the field or
  scrolling the picker when space is short.
- The disposer removes the wiring and closes an open picker.

The value is `#rrggbb`, or `#rrggbbaa` below full opacity.

## Accessibility and geometry

The trigger is a button named by the label and the current hex value, with
`aria-haspopup="dialog"` and `aria-expanded`; the hint and error describe it.
The picker opens in a non-modal surface named by the label. The trigger
matches TextField's box, label, hint, and error geometry.

Use an inline `ColorPicker` when choosing the color is the view's main task,
and `ColorSwatches` for a small fixed palette. `ColorField` replaces
`wa-color-picker`, which is Discouraged.

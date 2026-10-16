# Slider

`@kerfjs/ui/slider` picks a value on a range. It is a native
`<input type="range">` drawn as a track, a brand fill up to the value, and a
round thumb, identically in Chromium, Firefox, and WebKit.

```tsx
import { Slider } from "@kerfjs/ui/slider";
import { wireSliders } from "@kerfjs/ui/wire-sliders";

<Slider
  id="volume"
  label="Volume"
  value={volume.value}
  showValue
  unit="%"
  hint="Applies to every output device."
  action="set-volume"
/>;

const stop = wireSliders(root);
```

## Props

- `id` (required) identifies the input and derives the readout, hint, and
  tick ids.
- `min` (default 0), `max` (default 100), `step` (default 1), and `value`
  (default the midpoint, snapped to `step`; clamped to the range).
- `label` names it in a row above the track; `ariaLabel` names one without a
  visible label.
- `showValue` adds the current value at the end of the label row, followed by
  `unit` (such as `%`). With a `unit`, the spoken value includes it too.
- `ticks` labels stops under the track (`{ value, label? }`). The labels are
  visual; the input still reports its value.
- `hint` is supporting text below it and its accessible description.
- `size="compact"` is a 3px track, a 16px thumb, and 14px text; `disabled`
  dims it.
- `orientation="vertical"` stands it up, minimum at the bottom, `length`
  tall (default 160px), with the label row above and the fill running upward.
  A vertical Slider takes no `ticks`. Arrow keys still step it.
- `action` puts a `data-action` on the input. Listen for `input` (live) or
  `change` (committed) and store the value the app re-renders with.

## Live readout

The fill and the readout come from the rendered value. Call
`wireSliders(root)` once above your Sliders: one delegated `input` listener
keeps the fill, the readout, and the spoken value text in step with a drag
before the app re-renders. `syncSlider(input)` recomputes one by hand.

## Geometry and accessibility

A horizontal Slider fills the available width (a vertical one is as wide as
its label row) with the shared block-content inset (a
transparent 1px border and 8px padding), so its label sits on the same text
column as `Text`. Keyboard and screen-reader behavior are the platform's:
arrow keys, Page Up and Down, Home, and End step it. The readout is hidden
from assistive technology because the input already reports its value.
Forced colors draw a `Highlight` fill on a `GrayText` track.

Use a numeric `TextField` when the exact number matters, a `Switch` for on or
off, and a `SegmentedControl` for a few named options. Use this instead of
`wa-slider`, which is Discouraged.

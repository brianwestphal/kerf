# Gauge

`Gauge` (`@kerfjs/ui/gauge`) is a speedometer-style dial for a reading on a
scale that is not progress toward done: a live rate, a level, a load. It draws
a 240-degree track arc with the gap at the bottom, a fill from zero to the
value, and a needle, scaled to a caller-supplied `max`.

```tsx
import { Gauge } from "@kerfjs/ui/gauge";

<Gauge label="Tokens per Minute" value={420} max={1000} unit="tok/min" />;
<Gauge label="Agent Tokens per Minute" value={420} max={1000} unit="tok/min" variant="bare" />;
```

## Requirements

- **Scale.** `value` is zero or more and `max` is a positive number; anything
  else throws a `RangeError`. The dial runs from zero to `max`.
- **Pinning.** A value above `max` pins the needle and fill at the end of the
  scale and sets `data-pinned`, while the readout still shows the real value
  (1170 on a 1000 scale reads "1170").
- **Readout.** `valueText` is the value as shown and spoken, such as "1.2k";
  it defaults to the value rounded to one decimal place. `unit` sits under
  the value.
- **Variants.**
  - `full` (the default) draws eleven ticks (longer at zero, half, and full
    scale) and the value and unit inside the dial.
  - `bare` draws only the arc, fill, needle, and hub, cropped below the arc,
    for chip height. Its value lives in the accessible name and a hover
    `title` of the label and value.
- **Size.** `size` is the width as a typed `CssLength` (default 88px for
  `full`, the size of a stats tile; 40px for `bare`). The height follows the
  dial, and the whole drawing, readout included, scales with the width, so
  one gauge serves a tile and a large standby display.
- **Color.** `tone` colors the fill from the semantic ramps: `brand` (the
  default), `success`, `warning`, or `danger`. `colors` takes a consumer
  palette, such as dark red on black for a night display, as typed
  `CssColor` values for the `track`, `fill`, `needle`, and `text` (the value,
  unit, and ticks); an omitted color keeps the default. A consumer palette
  never needs CSS that targets the gauge's classes.
- **Motion.** The needle and fill transition (300ms) when the value changes
  and nowhere else: a first render draws them in place. They hold still
  under `prefers-reduced-motion` or the static-effects switch.
- **Accessibility.** The root is `role="meter"` named by `label`, with
  `aria-valuemin` 0, `aria-valuemax` `max`, `aria-valuenow` clamped to `max`,
  and `aria-valuetext` of the value text and unit. The SVG is decorative.
  Forced colors draw a `GrayText` track, a `Highlight` fill, and a
  `CanvasText` needle, ticks, and readout.
- **Geometry.** No margin, border, or padding; the box is the dial.

## Choosing

- Progress toward done: `ProgressBar` or `ProgressRing`, not a gauge.
- A live rate or level read at a glance on a tile, chip, or display: `Gauge`.
- A precise number that matters more than the glance: show it in `Text`.

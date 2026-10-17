# ColorPicker

`@kerfjs/ui/color-picker` is a full inline color picker panel:

- a saturation and brightness area;
- a slider for each channel of the color model — red, green, and blue (RGB);
  hue, saturation, and lightness (HSL); hue, saturation, and brightness
  (HSB); or one gray level (Grayscale) — each track painting the colors that
  channel produces while the others hold, and, optionally, an opacity slider
  on a checkerboard;
- a color-model menu (RGB, HSL, HSB, Grayscale) that switches the channel
  sliders and fields together;
- a hex field (8 digits below full opacity) and an opacity field;
- a screen sampler where the browser offers the EyeDropper API;
- optional preset and sample swatches.

```tsx
import { ColorPicker } from "@kerfjs/ui/color-picker";
import { wireColorPickers } from "@kerfjs/ui/wire-color-pickers";

<ColorPicker id="fill" label="Fill Color" value={fill.value} mode={mode.value} />;

const stop = wireColorPickers(root, {
  onChange: ({ id, value, mode: next }) => {
    fill.value = value;
    mode.value = next;
  },
});
```

## Props

- `id` and `label` (required): identity and the picker's accessible name.
- `value` (required): CSS color text (`#rrggbb[aa]`, `rgb()`, `hsl()`);
  invalid text shows black.
- `mode`: `rgb` (default), `hsl`, `hsb`, or `gray` — which channel sliders
  and fields show.
- `alpha` (default true): the opacity slider and field. Without it the value
  is always opaque.
- `name`, `form`: a hidden input submits the hex value.
- `eyedropper` (default true): the screen sampler, shown only where the
  browser has the EyeDropper API.
- `presets`: a row of `ColorSwatches` under the controls. `samples`: titled
  groups (`{ title, swatches }`), such as "Document Colors".
  `addSampleAction`: a `data-action` for an "Add to Samples" button; read
  the picker's value and add it to your samples.
- `disabled`, `className`, `rootAttributes`, `slot`.

## Wiring and values

`wireColorPickers(root, { onInput?, onChange? })` makes every picker under
`root` interactive. The interactive surface belongs to the wiring after the
first render, so a drag never fights a re-render. When the app re-renders a
picker with a new `value` (or `mode`), the picker adopts it.

- **The area** takes pointer drags and the arrow keys (Shift for 10% steps);
  Page Up and Down change brightness, Home and End saturation.
- **Channel and opacity sliders** are native range inputs (arrow keys, Page
  Up and Down, Home and End). Each changes only its own channel; a slider and
  the field of the same channel always agree.
- **Fields** commit on Enter or blur; Escape restores the shown value; invalid
  text restores it too.
- **Swatches** (presets and samples) apply their color.

Each change dispatches a bubbling `kui-color-input` (live) or
`kui-color-change` (committed) event with `{ value, mode }` and calls
`onInput` or `onChange`. The value is `#rrggbb`, or `#rrggbbaa` below full
opacity. The picker keeps hue, saturation, and brightness as its own state,
so a hue survives while the color is gray, and conversions round-trip without
drift: switching models never changes the color, and a channel edit keeps
every other channel's exact value (an HSL saturation survives lightness
reaching black or white). The 2D area stays in every model as the primary
picking surface; the sliders are the precise, per-channel controls.

## Accessibility and geometry

The picker is a named group. The area is a slider named "Saturation and
Brightness" whose spoken value gives both. Each channel slider is named for
its channel (Red, Hue, Lightness, Gray Level) and speaks its unit (`210°`,
`40%`, or a plain 0–255 byte); the opacity slider speaks a percentage. Every
field is named the same way (Red, Hue, Hex Color, Opacity). The panel takes
the shared block-content inset, fills its container up to 320px, and spaces
its rows 12px apart; the sliders form one group 8px apart.

Every slider track draws a 1px inner edge halfway between the text color and
the track, so a track as dark as a dark surface (a hue at low brightness, a
faint opacity) or as light as a light one keeps a boundary of at least 3:1
against the surface around it. Increased contrast draws the edge in the full
text color and forced colors in `CanvasText`.

Every track runs in the writing direction, as the native range does: in
right-to-left text the gradient starts at the right, so the thumb at a
channel's minimum (or at no opacity) sits over the color it sets.

Use `ColorSwatches` for a small fixed palette.

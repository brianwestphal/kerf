# ColorSwatches

`@kerfjs/ui/color-swatches` chooses one color from a small fixed palette: a
row of round swatches with no visible text. It is a native radio group, so
the chosen value submits under `name` and the platform owns the keyboard.

```tsx
import { ColorSwatches } from "@kerfjs/ui/color-swatches";
import { fillColor } from "@kerfjs/ui/css-values";

<ColorSwatches
  name="command-color"
  label="Command Color"
  value={color.value}
  action="pick-color"
  swatches={[
    { value: "none", label: "No Color", color: "transparent" },
    { value: "#ff3b30", label: "Red", color: fillColor("#ff3b30") },
    { value: "#0a84ff", label: "Blue", color: fillColor("#0a84ff") },
  ]}
/>;
```

## Props

- `name` (required): the radio group the chosen value submits under.
- `swatches` (required): `{ value, label, color }`. `label` names the swatch
  for assistive technology and shows as its hover hint. `color` is a
  `CssColor` (`uiColor()`, `colorVar()`, or `fillColor()`) or `'transparent'`
  for the no-color swatch, drawn outlined and struck through.
- `value`: the chosen swatch.
- `label` (a visible legend) or `ariaLabel` names the group.
- `size` `default` (24px swatches) or `compact` (20px), `disabled`, `form`,
  and `action` (a `data-action` on each radio; listen for `change`).

## Behavior and geometry

Tab reaches the group once; the arrow keys move the choice; Space chooses the
focused swatch. The chosen swatch wears a 2px ring in the text color, set off
from the dot by a 2px gap, so the choice never depends on the swatch's hue;
forced colors draw it in `Highlight`. The group takes the shared
block-content inset (a transparent 1px border and 8px padding), and the
swatches wrap with the 8px control gap.

Use `ChoiceChips` with swatches when each color also needs a visible name,
and the ColorPicker when any color is allowed.

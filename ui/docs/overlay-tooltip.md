# Tooltips

`kerfjs/overlay`'s `tooltip(anchor, content, options?)` shows a hover and
keyboard-focus tooltip beside any element and positions it there. The core
ships no CSS. Import `@kerfjs/ui/overlay-tooltip.css` once and every tooltip
takes the help tag's look:

```ts
import "@kerfjs/ui/overlay-tooltip.css";
import { tooltip } from "kerfjs/overlay";

const stop = tooltip(
  deployButton,
  "Builds the current branch and deploys it to staging.",
  { exitClass: "kui-tooltip-exit", exitDuration: 100 },
);
// Later: stop() removes the listeners and any shown tooltip.
```

## What the stylesheet does

- **Look.** The `.kerf-tooltip` wrapper takes the loud neutral fill with
  on-loud text at 14px and a 3px radius: the same look as the help tags that
  icon-only Kerf controls show.
- **Width.** It sizes to its text and wraps at 40 characters, staying 8px
  inside a narrow viewport.
- **Pointer.** It never takes the pointer, so it cannot block the control
  beneath it.
- **Motion.** It fades in on its own (no `enterClass` needed). Pass
  `exitClass: 'kui-tooltip-exit'` with `exitDuration: 100` and it fades out as
  it hides. Under `prefers-reduced-motion` or
  `:root[data-kui-effects="static"]` it appears and leaves at once.
- **Forced colors.** It draws `CanvasText` on `Canvas`.
- **Stacking.** Set `--kui-overlay-tooltip-z-index` (default 1200) to change
  its stacking order. With `native: true` it is in the top layer instead.

Structured content from a render function inherits the tooltip's colors, so
use plain inline markup (`<strong>`, a line break) rather than components that
set their own text color.

## When to use it

- A control or value needs a short explanation on hover and focus: a longer
  description of an action, a chart point, or a truncated label.
- Not for icon-only Kerf controls: `@kerfjs/ui/help-tags-register` already
  shows their help tag.
- Not for interactive content or the only copy of important information. Use an
  `AnchoredSurface` the person opens, or visible text.

Keep the anchor's accessible name complete without the tooltip; the wrapper is
`role="tooltip"` and appears on keyboard focus as well as hover.

Use this instead of `wa-tooltip`, which is Discouraged.

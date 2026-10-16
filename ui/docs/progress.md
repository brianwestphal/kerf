# Progress

Two components show progress: `ProgressBar` (`@kerfjs/ui/progress-bar`), a
linear bar on the native `<progress>` element, and `ProgressRing`
(`@kerfjs/ui/progress-ring`), a compact circle for a line of text, a row, or a
toolbar. Both are determinate (`value` of `max`, default `max` 1) or, without a
`value`, indeterminate.

```tsx
import { ProgressBar } from "@kerfjs/ui/progress-bar";
import { ProgressRing } from "@kerfjs/ui/progress-ring";

<ProgressBar
  id="upload"
  label="Uploading Files"
  value={3}
  max={12}
  valueText="3 of 12 files"
  showValue
/>;
<ProgressRing label="Claim Time Remaining" value={0.75} valueText="45 minutes left" />;
```

## ProgressBar

- **Name.** `label` is a visible line above the bar that also names it (with
  an `id`, through `aria-labelledby`); `ariaLabel` names a bar without one.
- **Readout.** `showValue` puts the percentage, or `valueText`, at the end of
  the label row. `valueText` also replaces the spoken percentage.
- **Indeterminate.** Omit `value` and a band sweeps across the track. It holds
  still under `prefers-reduced-motion` or the static-effects switch.
- **Tone and size.** `tone` is `brand` (default), `success`, `warning`, or
  `danger`; `size="compact"` is a 4px track for a row or table cell (default
  6px).

The bar takes the full available width and the shared block-content inset (a
transparent 1px border and 8px padding), so its label sits on the same text
column as `Text`.

## ProgressRing

- **Name.** `label` is required: the ring is `role="progressbar"` with
  `aria-valuenow` as a percentage, or `valueText`.
- **Size.** `small` (16px) for a line of text, `medium` (24px, the default)
  beside an icon in a row or toolbar, `large` (40px) on its own. Its box is
  exactly its diameter, so it aligns with icons of the same size.
- **Indeterminate.** Omit `value` and it spins a quarter arc, which holds still
  under reduced motion.
- **Tone.** The same tones as the bar.

## Choosing

- A measurable task with room for a label row: `ProgressBar`.
- Compact progress beside an item: `ProgressRing`.
- A brief busy glyph inside a control: `LoadingSpinner`.
- App-wide progress with no home beside the work: `CornerStatus` or
  `EdgeActivityIndicator`.
- A reading on a scale that is not progress (a rating, a level): a native
  `<meter>`.

Forced colors draw the fills in `Highlight`. Use these instead of
`wa-progress-bar` and `wa-progress-ring`, which are Discouraged.

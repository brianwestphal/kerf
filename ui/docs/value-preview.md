# ValuePreview

`ValuePreview` displays a literal, read-only multiline string inside a bounded, keyboard-scrollable region. Use it for an existing value that may contain line breaks or long unbroken tokens, such as two versions in a conflict review. It owns compact text, pre-wrapping, anywhere wrapping, and a 48–96px default height window. It does not paint a background, border, or outer inset; compose it inside `SunkenPanel` when the value needs a lowered frame.

```tsx
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import { ValuePreview } from '@kerfjs/ui/value-preview';

<SunkenPanel>
  <ValuePreview label="Their Latest Version" value={remoteText} />
</SunkenPanel>;
```

`label` gives the focusable output an accessible name. The string in `value` is rendered as text, not HTML; newlines remain visible and long tokens wrap instead of widening the pane. An empty string stays empty, so the application chooses any placeholder wording. `minHeight` and `maxHeight` take typed CSS lengths from `@kerfjs/ui/css-values` when a different scroll window is needed. The component itself scrolls long content; the containing `SunkenPanel` remains the sole owner of its surface.

Use `TextField multiline` when the person can edit the value. Use `ValueTable` for labelled short facts. `ValuePreview` is for one potentially long, read-only value.

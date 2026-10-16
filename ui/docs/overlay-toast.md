# Toasts

`kerfjs/overlay`'s `toast()` shows a brief, auto-dismissing notification in
one body-level live region. The core ships no CSS. Import
`@kerfjs/ui/overlay-toast.css` once and every toast takes Kerf's look:

```ts
import "@kerfjs/ui/overlay-toast.css";
import { toast } from "kerfjs/overlay";

const exit = { exitClass: "kui-toast-exit", exitDuration: 200 };

toast("Draft saved.", exit);
toast("Project published.", { ...exit, variant: "success" });
```

## What the stylesheet does

- **Placement.** The region (`.kerf-toasts`) sits above the bottom edge,
  centered, 16px from the viewport edge plus the bottom safe area, at most
  480px wide. It never blocks the page; only the toasts take presses.
- **Stacking.** Toasts stack newest last with an 8px gap.
- **Surface.** Each toast (`.kerf-toast`) is the raised surface with a neutral
  border, the rounded radius, and the large shadow.
- **Tones.** `variant: 'info' | 'success' | 'warning'` lays the brand,
  success, or warning quiet fill over the opaque surface, with the matching
  border and text.
- **StateBanner content.** A toast whose only content is a `StateBanner` takes
  the banner's tone, border, and inset, and keeps its own elevation:

  ```tsx
  toast(
    () => <StateBanner title="Export Finished" detail="report.csv is ready." tone="success" />,
    { ...exit, duration: 6000 },
  );
  ```

- **Motion.** A new toast rises and fades in on its own (no `enterClass`
  needed). Pass `exitClass: 'kui-toast-exit'` with `exitDuration: 200` and it
  sinks and fades out before removal. Under `prefers-reduced-motion` or
  `:root[data-kui-effects="static"]` it only fades, or not at all.
- **Forced colors.** Toasts draw a `CanvasText` border on `Canvas`.

## Choices the app owns

- What to say and when: a toast confirms a completed action (saved, copied,
  published) or reports a status. An error the person must act on, or a
  decision, belongs in a `StateBanner` in the affected surface or a
  `DialogSurface`, not a toast that disappears.
- `duration` (default 4000ms; `0` keeps it until you call `dismiss()`), and
  `mode: 'replace'` to collapse a rapid sequence to the latest message.
- Top-edge stacking: pass your own region as `container` with
  `data-placement="top"` (and the `kerf-toasts` class); it stacks from the top
  safe area down.
- Stacking order above other layers: set `--kui-overlay-toast-z-index`
  (default 1100).

The region is `aria-live="polite"` and each toast is `role="status"`, so a
screen reader announces it without moving focus. Never make a toast the only
path to an action.

Use this instead of `wa-toast` and `wa-toast-item`, which are Discouraged.

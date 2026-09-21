# Workbench

`@kerfjs/ui/workbench` is the Xcode-like multi-panel workspace: a collapsible
left rail, right rail, and bottom drawer around a central work area (any absent).
It generalizes the instant-width / sliding-content collapse used by the catalog
sidebar. One of the opt-in app layouts (see
[`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)); best on
desktop-class devices.

```ts
import { Workbench } from "@kerfjs/ui/workbench";
import "@kerfjs/ui/workbench.css";
```

## State lives in the app

`Workbench` is declarative and the collapse is **pure CSS** — no wire. The app
owns each panel's `collapsed` flag (usually a signal) and toggles it; the panel
animates itself.

```tsx
const navCollapsed = signal(false);

<Workbench
  id="studio"
  label="Studio"
  main={<Editor />}
  leftRail={{
    content: <Navigator />,
    label: "Navigator",
    collapsed: navCollapsed.value,
    size: 280,
  }}
  rightRail={{
    content: <Inspector />,
    label: "Inspector",
    collapsed: inspectorCollapsed.value,
  }}
  bottomDrawer={{
    content: <Console />,
    label: "Console",
    collapsed: consoleCollapsed.value,
  }}
/>;
```

Each `WorkbenchPanel` takes `content`, an optional `collapsed`, an optional
`size` (rail width or drawer height in px, overriding the CSS default —
`--kui-workbench-rail-width` 280px, `--kui-workbench-drawer-height` 220px), and
an optional `label`.

## How the collapse animates

Collapsing snaps the panel's flex track to zero in a single reflow (so the work
area relayouts once, not per frame) while the panel's fixed-size content slides
out via a composited `transform` — a rail slides horizontally, the drawer
vertically — clipped by the shell's overflow. It honors `prefers-reduced-motion`
(the slide collapses to instant). On smaller device classes, present the rails'
contents through a `NavStack` or overlay drawers rather than shrinking the
three-panel shell.

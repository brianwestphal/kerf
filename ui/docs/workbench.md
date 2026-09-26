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

A top-level `Workbench` needs a definite containing height. Import the opt-in
`@kerfjs/ui/document.css` baseline and add `.kui-app-root` to the direct mount
container, or provide an equivalent definite height in application-owned
layout. The component intentionally uses `height: 100%` rather than `100dvh` so
it can also be embedded. See [Document baseline](document-baseline.md).

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
an optional `label`. Common shell behavior is configured rather than restyled:

- `separator: "auto" | "hidden"` controls the owned dock-edge separator;
- `collapseMotion: "slide" | "fade-slide" | "none"` keeps the track change
  instant while choosing composited content motion;
- `contentOverflow: "clip" | "auto" | "visible"` lets a drawer temporarily
  expose an open popup without a descendant override;
- `presentation: "inline" | "overlay" | "hidden"` supports compact overlays
  or a responsive replacement. Overlay panels clamp both their track and fixed-size
  animated content to the configured viewport-relative maximum;
- `restoreControl` places an application-owned restore affordance in a
  safe-area-aware viewport corner (`restorePosition` chooses the corner).

The same policy props are available on `ResizableRegion` and
`CollapsiblePanel`, so a resizable application shell does not need to reach
into `.kui-resizable-region__content`.

## Resizable application-shell migration

An application such as Hot Sheet can replace its shell descendant overrides
with state-derived props:

```tsx
<ResizableRegion
  id="terminal-drawer"
  label="Terminal drawer"
  axis="vertical"
  edge="start"
  size={drawerSize.value}
  min={180}
  max={520}
  collapsed={!drawerVisible.value}
  separator={magnified.value ? "hidden" : "auto"}
  collapseMotion="fade-slide"
  contentOverflow={createMenuOpen.value ? "visible" : "clip"}
  presentation={mobile.value ? "overlay" : "inline"}
  restoreControl={<button data-action="show-drawer">Show terminals</button>}
>
  <TerminalDrawer />
</ResizableRegion>
```

`wireResizableRegions` marks the active region with `data-resizing` and the
package CSS suppresses content motion during pointer resize. A collapsed,
overlay, or hidden region is not resizeable. Together these policies replace
app CSS for separator suppression, instant-track/composited-content collapse,
popup overflow, mobile overlay/hidden replacement, resize-transition guards,
and safe-area restore placement. The app still owns the signals and decides
when each policy applies.

## Public styling boundary

Import `@kerfjs/ui/workbench.css` after the component subpath. Applications may
set `--kui-workbench-rail-width` and `--kui-workbench-drawer-height` on a
Workbench instance. The supported composition classes are `.kui-workbench`,
`.kui-workbench__rail`, `.kui-workbench__rail--left`,
`.kui-workbench__rail--right`, `.kui-workbench__center`,
`.kui-workbench__main`, `.kui-workbench__drawer`, and
`.kui-workbench__panel-content`, and `.kui-workbench__restore`; these exact hooks are cataloged for tools that
must classify public application selectors. Prefer the component props and two
size tokens before selecting internal anatomy, and do not target its data
attributes or descendant tags as styling contracts.

## Safe areas

Each rail and the drawer grows by the unsafe inset of the screen edge it docks
to, so its surface and separator paint through while its content keeps the
configured size and is padded for the edges it touches. The main area pads for
the edges it reaches, inside its scroller: an expanded inline rail or drawer
takes that edge away, and collapsing it (or presenting it as an overlay) hands
the edge back. A region whose only child is a `Pane` or layout lets that child
own the insets. See [Choosing an app layout › Safe areas](app-layouts.md#safe-areas).

## How the collapse animates

Collapsing snaps the panel's flex track to zero in a single reflow (so the work
area relayouts once, not per frame) while the panel's fixed-size content slides
out via a composited `transform` — a rail slides horizontally, the drawer
vertically — clipped by the shell's overflow. The drawer content is positioned
against the shell's stable bottom edge, so opening and closing move monotonically
through the transform rather than inheriting a changing normal-flow origin. It
honors `prefers-reduced-motion` (the slide collapses to instant). On smaller
device classes, present the rails' contents through a `NavStack` or overlay
drawers rather than shrinking the three-panel shell.

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
animates itself. Panels are fixed-size by default; a panel can opt in to drag
and keyboard resizing (see [Resizable panels](#resizable-panels)).

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
  or a responsive replacement. An overlay rail spans the Workbench height at
  its side and an overlay drawer spans the work-area column at the bottom, each at its
  configured size; the drawer's fixed-size animated content is clamped to the
  viewport-relative maximum height;
- `responsiveOverlayAt: "narrow" | "compact"` presents a rail or the bottom
  drawer as an overlay below a Workbench container breakpoint — 704px or less
  for `narrow`, 448px or less for `compact`, the breakpoints of
  `ResizableRegion`'s `responsiveFillAt` — and inline above it. The CSS
  decides, so the app needs no `deviceClass` check for presentation; a
  collapsed overlay drops its surface and shadow so nothing covers the work
  area, and the work area keeps the safe-area inset of the edge the overlay
  covers;
- `restoreControl` places an application-owned restore affordance in a
  safe-area-aware viewport corner (`restorePosition` chooses the corner).
  Compose it from the package controls — a `single` `ToolbarControlGroup`
  around one icon button carrying `collapsiblePanelToggleIcon(side, true)` —
  rather than a bare button.

- `resizable: true | { min, max }` opts the panel in to drag and keyboard
  resizing, driven by `wireWorkbench` (off by default).

The same policy props are available on `ResizableRegion` and
`CollapsiblePanel`, so a resizable application shell does not need to reach
into `.kui-resizable-region__content`.

## Resizable panels

Resizing is **opt-in per panel**. Give a panel `resizable` — `true` for the
default limits (rails 180–480px, drawer 120–480px) or `{ min, max }` — and
render its `size` from an app-owned signal. The panel then owns a separator on
its inner edge (the left rail's end, the right rail's start, the drawer's top)
with the same focusable `role="separator"` contract as a `ResizableRegion`
handle. `wireWorkbench` drives it:

```tsx
import { wireWorkbench } from "@kerfjs/ui/wire-workbench";

const navSize = signal(280);
const consoleSize = signal(200);

<Workbench
  id="studio"
  label="Studio"
  main={<Editor />}
  mainMinSize={320} // the default: the editor never drops below 320px
  leftRail={{
    content: <Navigator />,
    label: "Navigator",
    collapsed: navCollapsed.value,
    size: navSize.value,
    resizable: { min: 200, max: 420 },
    responsiveOverlayAt: "narrow", // an overlay when the Workbench is 704px or narrower
  }}
  bottomDrawer={{
    content: <Console />,
    label: "Console",
    size: consoleSize.value,
    resizable: true,
  }}
/>;

// once, after mount:
const stop = wireWorkbench(root, {
  id: "studio",
  panels: {
    leftRail: { size: navSize, storageKey: "studio.nav-width" },
    bottomDrawer: { size: consoleSize, storageKey: "studio.console-height" },
  },
});
```

- **Pointer:** dragging the separator resizes the panel live (the wire marks
  it `data-resizing` and suppresses content motion) and commits the final
  size to the signal on release.
- **Keyboard:** focus the separator; arrow keys resize by `step` (16px),
  Shift+arrow by `largeStep` (64px), Home/End jump to `min`/`max`. The
  separator's `aria-valuenow`/`aria-valuemin`/`aria-valuemax` report the size
  and limits.
- **Limits:** every size — dragged, typed, restored from storage, or passed
  by the app — is clamped to `min`/`max` when rendered.
- **Work-area minimum:** beside a resizable rail the work area keeps at least
  `mainMinSize` px (a `Workbench` prop, default 320; `0` turns it off). A
  dragged or keyed rail stops growing where the work area would drop below it,
  so two wide rails cannot crowd out the editor; `aria-valuemax` reports that
  reachable maximum. When the Workbench itself narrows, resizable rails shrink
  in proportion to their sizes (their content follows the shown width) while
  the work area holds its minimum; a squeezed rail can still be made smaller,
  never larger, and never below its own `min`. The drawer is unaffected.
- **Collapse:** `collapsed` never changes a size. A collapsed panel keeps its
  size (its content slides out at that width), its separator leaves the tab
  order, and expanding it returns it at the size it had.
- **Persistence:** with a `storageKey`, the size is loaded from `storage`
  (default `localStorage`) at wire-up and saved on every change, like
  `wireSidebar`'s collapsed state.
- **Overlays never resize:** an overlay or hidden panel — including a rail
  whose `responsiveOverlayAt` breakpoint currently applies — hides its
  separator and is never resizable, and it leaves the work-area minimum to the
  rails still in flow. With `responsiveOverlayAt` no device check is needed;
  otherwise pass `deviceClass` and resizing is suspended while `compact` is
  true, where rails present as overlay drawers or are replaced.
- `wireWorkbench` drives only the panels it is given, matched by the
  Workbench `id`, so it never double-drives a `ResizableRegion` (or another
  Workbench) under the same root. `onResize({ panel, size, source })` reports
  each committed resize.

Where the browser supports `overflow-clip-margin`, the 20px hit target
straddles the panel's separator line like a `ResizableRegion` handle;
elsewhere it sits just inside the panel's inner edge, because the panel clips
its sliding content.

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
  restoreControl={
    <ToolbarControlGroup label="Terminals" single>
      <button data-action="show-drawer" aria-label="Show terminals">
        <LucideIcon {...collapsiblePanelToggleIcon("bottom", true)} />
      </button>
    </ToolbarControlGroup>
  }
>
  <TerminalDrawer />
</ResizableRegion>
```

`wireResizableRegions` marks the active region with `data-resizing` and the
package CSS suppresses content motion during pointer resize. It applies the
live size to both the track and the slide-motion content, so content fills the
region throughout a drag, including any safe-area edge extent, and a later
collapse slides it out at the resized width. A collapsed,
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
`.kui-workbench__main`, `.kui-workbench__drawer`,
`.kui-workbench__panel-content`, `.kui-workbench__handle`,
`.kui-workbench__handle-icon`, and `.kui-workbench__restore`; these exact hooks are cataloged for tools that
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

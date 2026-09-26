# CollapsiblePanel + wireSidebar — reusable sidebar / drawer support

`@kerfjs/ui/collapsible-panel` and `@kerfjs/ui/wire-sidebar` are the standalone,
reusable pieces for an app's own **side rails** and **bottom drawers** — the same
collapse semantics the `Workbench` shell and the catalog sidebar use, but outside
a full shell so you can dock one panel wherever your layout needs it. They are
subpath-only, tree-shakeable modules that add nothing to the main barrel.

```bash
npm install @kerfjs/ui # kerfjs is a peer
```

Import the panel CSS (`@kerfjs/ui/collapsible-panel.css`) alongside `foundation.css`.

## The pieces

- **`CollapsiblePanel({ id, side, collapsed?, size?, label?, children })`** — the
  docked panel: a `'left'` / `'right'` rail or a `'bottom'` drawer. It owns only
  presentation. Collapsing snaps the panel's own size to zero in one reflow while
  the fixed-size content slides out via `transform` (composited, clipped) — never
  a per-frame width/height animation. A bottom drawer anchors that fixed-size
  content to its stable bottom edge, so opening and closing move monotonically
  through the transform alone instead of transitioning from a changing layout
  origin and snapping at the end. The app owns the `collapsed` signal; `size`
  overrides the CSS default width/height.
  Reusable shell policies are typed props: `separator`, `collapseMotion`,
  `contentOverflow`, and `presentation`. A collapsed panel may also receive a
  `restoreControl`, which Kerf places at the safe-area-aware `restorePosition`.
  Overlay presentation also clamps fixed-size animated content to the configured
  responsive overlay maximum, so a remembered desktop size cannot escape a narrow
  viewport.
- **`CollapsiblePanelToggle({ side, collapsed, action, panelId?, label? })`** and
  **`collapsiblePanelToggleIcon(side, collapsed)`** — the standard toggle
  affordance and its icon convention, so every sidebar reads the same: `PanelLeft*`
  for a left rail, `PanelRight*` for a right rail, `PanelBottom*` for a bottom
  drawer — the `Close` glyph while open, the `Open` glyph while collapsed. Placement
  is the app's: put a collapse toggle in the panel's own header and an expand toggle
  somewhere always-visible (a toolbar) so it is reachable while collapsed.
- **`wireSidebar(root, { panels, deviceClass?, storage? })`** — the interaction
  semantics. Each `panels` entry is
  `{ id, collapsed, toggleAction, storageKey?, inlineCollapsed? }`. It:
  - **toggles** the panel's `collapsed` signal when any `[data-action=toggleAction]`
    button is clicked, and remembers the trigger;
  - **manages focus** — moves focus into the panel when it opens, and restores it
    to the trigger when it closes;
  - **presents a compact overlay** when `deviceClass.compact` is true (pass a
    `deviceClass()` signal): the open panel floats over the content with a
    dismissable backdrop, Escape and backdrop-click collapse it, and Tab is trapped
    within the panel (the ARIA dialog pattern). The overlay and its backdrop are
    fixed to the screen; an ancestor that establishes a containing block for
    fixed descendants (such as the catalog's `height: "app"` frame) docks them to
    its edges instead;
  - accepts `compactPresentation: "hidden"` when a compact application replaces
    the panel with different navigation instead of overlaying it;
  - **starts every compact overlay closed** (see
    [Compact initial state](#compact-initial-state));
  - keeps compact overlays exclusive by default, collapsing another open panel
    when a new one opens (`exclusiveCompact: false` opts out);
  - **persists** the inline collapsed state to `storage` (default
    `localStorage`) under `storageKey`, seeding the signal on wire-up. An
    overlay's open/closed state is never persisted;
  - **owns the root's `data-collapsible-responsive` / `data-collapsible-overlay`
    attributes and the injected backdrop.** Your app may re-render (and morph)
    the wired root for reasons that never touch a panel signal — a nav
    selection, say — and the morph drops attributes and nodes its template
    doesn't emit. The wire observes the root and re-applies them before the
    next paint, so don't render these attributes yourself.

  Returns a disposer. Retain it and call it on teardown.

## Compact initial state

A compact overlay is transient chrome the user summons, like a slide-over
sidebar on a phone: it covers the content, traps focus, and must be dismissed.
It therefore opens **only on a user action** (a toggle, or the app setting the
signal in response to one), never by itself:

- **Wire-up on a compact device.** Every panel starts collapsed, whatever its
  signal, `inlineCollapsed`, or stored choice says. No backdrop, focus trap, or
  Escape handling is active until the user opens a panel.
- **Wide → compact crossing.** Open panels collapse; nothing covers the page.
- **Compact → wide crossing.** Each panel returns to its remembered inline state
  (open or collapsed), whatever the user did with the overlay meanwhile.
- **Disposal** hands the inline state back to the signals.
- **Persistence** records only the inline choice. A stored "open" rail restores
  inline on a wide screen and is remembered, not opened, on a compact one.

These presentation changes never move focus, except to rescue focus that a
collapse would strand inside the hidden panel (it returns to the panel's last
trigger). `compactPresentation: "hidden"` leaves the signals alone.

`wireSidebar` runs after the first render, so an app that seeds an open inline
default would render the rail open for that first frame on a compact device.
Seed the signal from the device class instead, and declare the inline default
with `inlineCollapsed` so a later wide crossing still opens it:

```ts
const device = deviceClass();
const navCollapsed = signal(device.value.compact);
// …
wireSidebar(app, {
  panels: [
    {
      id: "nav",
      collapsed: navCollapsed,
      toggleAction: "toggle-nav",
      inlineCollapsed: false,
    },
  ],
  deviceClass: device,
});
```

A stored inline choice takes precedence over `inlineCollapsed`.

## Example

```tsx
import { signal, mount } from "kerfjs";
import { deviceClass } from "@kerfjs/ui/device-class";
import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from "@kerfjs/ui/collapsible-panel";
import { wireSidebar } from "@kerfjs/ui/wire-sidebar";
import "@kerfjs/ui/collapsible-panel.css";

const device = deviceClass();
// Start collapsed on a compact device; `inlineCollapsed` keeps the open inline
// default for wide screens.
const navCollapsed = signal(device.value.compact);

const app = document.querySelector("#app")!;
mount(app, () => (
  <div class="layout">
    <CollapsiblePanel
      id="nav"
      side="left"
      collapsed={navCollapsed.value}
      label="Navigator"
    >
      <header>
        <CollapsiblePanelToggle
          side="left"
          collapsed={navCollapsed.value}
          action="toggle-nav"
          panelId="nav"
        />
      </header>
      {/* nav items */}
    </CollapsiblePanel>
    <main>
      {navCollapsed.value && (
        <CollapsiblePanelToggle
          side="left"
          collapsed
          action="toggle-nav"
          label="Show navigator"
        />
      )}
      {/* content */}
    </main>
  </div>
));

const stop = wireSidebar(app, {
  panels: [
    {
      id: "nav",
      collapsed: navCollapsed,
      toggleAction: "toggle-nav",
      storageKey: "app.nav-collapsed",
      inlineCollapsed: false,
    },
  ],
  deviceClass: device,
});
```

## Safe areas

A panel grows by the unsafe inset of the edge it docks to and pads its content
for every edge it touches except its interior edge. While expanded inline, it
also clears that edge for its direct flex siblings, so a neighboring pane gains
the inset when the panel collapses. When you wrap the panel in your own grid
cell, set `--kui-edge-inset-*: 0px` on the sibling regions yourself (or pass
`safeAreaEdges` to a sibling `Pane`). See [Choosing an app layout › Safe areas](app-layouts.md#safe-areas).

## When to use which

- One or two independent rails / a drawer you place yourself → **`CollapsiblePanel` +
  `wireSidebar`**.
- A whole Xcode-like workspace (left rail + right rail + bottom drawer + work area
  in one shell) → **[`Workbench`](workbench.md)**, which owns the layout and the same
  collapse animation.
- Drag-to-resize a panel → compose **[`ResizableRegion`](../src/resizable-region.tsx)**
  / `wireResizableRegions`; the app owns the size signal.

The app still owns everything domain-specific — which panels exist, their order,
sizes, content, and any per-project persistence — exactly as with the other layouts.

## Recipe and coverage

The catalog ships a runnable **Collapsible sidebar** recipe — a left rail and a
bottom drawer with the standard toggles, the compact overlay, and per-panel
persistence: [open it](../ux-demo/?component=recipe-collapsible-sidebar) or read
[`recipes.md`](recipes.md#collapsible-sidebar) · [TSX source](../ux-demo/recipes/collapsible-sidebar.tsx).
It is covered end-to-end across Chromium, Firefox, and WebKit by
`tests/browser/collapsible-sidebar-recipe.spec.ts` (collapse/expand, focus
move/restore, the compact overlay + Escape/backdrop dismiss, the Tab trap, and
the compact initial state across first load and wide/compact crossings),
alongside the component/wire unit tests.

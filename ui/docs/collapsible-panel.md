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
  a per-frame width/height animation. The app owns the `collapsed` signal; `size`
  overrides the CSS default width/height.
- **`CollapsiblePanelToggle({ side, collapsed, action, panelId?, label? })`** and
  **`collapsiblePanelToggleIcon(side, collapsed)`** — the standard toggle
  affordance and its icon convention, so every sidebar reads the same: `PanelLeft*`
  for a left rail, `PanelRight*` for a right rail, `PanelBottom*` for a bottom
  drawer — the `Close` glyph while open, the `Open` glyph while collapsed. Placement
  is the app's: put a collapse toggle in the panel's own header and an expand toggle
  somewhere always-visible (a toolbar) so it is reachable while collapsed.
- **`wireSidebar(root, { panels, deviceClass?, storage? })`** — the interaction
  semantics. Each `panels` entry is `{ id, collapsed, toggleAction, storageKey? }`.
  It:
  - **toggles** the panel's `collapsed` signal when any `[data-action=toggleAction]`
    button is clicked, and remembers the trigger;
  - **manages focus** — moves focus into the panel when it opens, and restores it
    to the trigger when it closes;
  - **presents a compact overlay** when `deviceClass.compact` is true (pass a
    `deviceClass()` signal): the open panel floats over the content with a
    dismissable backdrop, Escape and backdrop-click collapse it, and Tab is trapped
    within the panel (the ARIA dialog pattern);
  - **persists** the collapsed state to `storage` (default `localStorage`) under
    `storageKey`, seeding the signal on wire-up.

  Returns a disposer. Retain it and call it on teardown.

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

const navCollapsed = signal(false);
const device = deviceClass();

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
    },
  ],
  deviceClass: device,
});
```

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
move/restore, the compact overlay + Escape/backdrop dismiss, and the Tab trap),
alongside the component/wire unit tests.

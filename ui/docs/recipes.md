# Production composition recipes

These ten reference compositions sit between individual primitives and product
code. Open each stable UX-catalog route to run it, then copy the linked TSX. The
examples import public package subpaths, compose components through their
props and tokens, and keep state in a per-instance application adapter. They
ship no stylesheet of their own and are not new monolithic components.

Copy the recipe source together with the catalog-independent
[`mount-recipe.ts`](../ux-demo/recipes/mount-recipe.ts) adapter. It mounts the
controller at one stable application root, uses `delegateActions()` for recipe
commands, forwards form and dialog lifecycle events, wires resize commits with
the public `onCommit` callback, retains every disposer, and returns one
idempotent disposer:

```ts
import { createRecipe } from "./navigation-sidebar.js";
import { mountRecipe } from "./mount-recipe.js";

const root = document.querySelector<HTMLElement>("#navigation")!;
const stopRecipe = mountRecipe(root, createRecipe(announce));
window.addEventListener("pagehide", stopRecipe, { once: true });
```

The adapter is delivered as reference source, not a new package runtime export.
`delegate()` remains a valid alternative when an application needs selector-
specific dispatch; either way, wire once at a stable root and retain disposal.

## Desktop application shell

[Open the recipe](../ux-demo/?component=recipe-app-shell) · [TSX source](../ux-demo/recipes/app-shell.tsx)

A filling `List` (`fill`, with the recipe's `data-*` markers through
`rootAttributes`) stacks the app-bar `Toolbar` above a `Row` that places
controlled `ResizableRegion` navigation and inspector panes around a content
`Pane` that a one-column `Grid` grows to fill. Each region's lone `Pane` fills
the region's full height, so it reaches the bottom edge the separator does.
Only those three real panes own a
`.kui-pane__content` scroll owner; no frame `Pane` wraps the layout in a scroll
owner that never scrolls. Each pane lists the screen edges it reaches in
`safeAreaEdges` (the bottom plus its outer side, or both sides when it is the
only pane shown), and the app-bar `Toolbar` claims the top edge and both sides
with its own `safeAreaEdges`, so it clears the status area. Below desktop sizes the app reads `deviceClass()` and shows one
pane at a time, switched by a pressed-state `ToolbarControlGroup`. The recipe
owns the shell topology; the app owns routing, responsive pane visibility,
sizes, persistence, and data.
Keep each visible pane's collapse action in its own toolbar. Once hidden, put
its restore action in the adjacent main toolbar on the same logical edge:
leading for an inline-start sidebar and trailing for an inline-end inspector.
Collapse the pane completely rather than preserving an empty icon rail.
Adapt only public `--kui-layout-*` and component variables.

## Navigation sidebar

[Open the recipe](../ux-demo/?component=recipe-navigation-sidebar) · [TSX source](../ux-demo/recipes/navigation-sidebar.tsx)

One unpadded `.kui-pane` owns toolbar/content/footer structure. Its
`.kui-content` uses 24px major gaps; `ListHeader`, `ListItem`, and other
`.kui-content-item` children own their 8px margin, 1px border, and 8px padding.
Rows and footer toolbar groups remain 44px tall. The app owns routes,
permissions, labels, selection, valid section counts and their localized
`countLabel` phrases, non-count badge content, disclosure state, and revealed
content. A toggled `ListHeader` supplies the production `DisclosureArrow` when
no custom `actionIcon` is needed; ordinary navigation rows stay chevron-free.

## Workspace header

[Open the recipe](../ux-demo/?component=recipe-workspace-header) · [TSX source](../ux-demo/recipes/workspace-header.tsx)

The page heading is a direct `Toolbar`/`ToolbarText` composition while one control cluster holds secondary,
overflow, and primary actions. The app owns authorization and command policy;
controls relocate without changing focus order.

## List-detail dialog

[Open the recipe](../ux-demo/?component=recipe-list-detail-dialog) · [TSX source](../ux-demo/recipes/list-detail-dialog.tsx)

The production Web Awesome dialog owns modal focus, Escape, its labeled header,
and its close control; the thin recipe adapter restores the invoking control
after the hide event. `DialogSurface` chooses the large modal with no body
inset, because `SplitView` and its rows own list geometry, and a comfortable
footer inset for the record actions. On roomy devices `SplitView` shows the
project list beside its detail; each pane opens with a `ListHeader` on one
shared line, and the dialog title, both headers, and the list text share the
17px text edge while the `ValueTable` keeps the 8px outer margin. On compact
devices the dialog becomes a full-screen sheet and `SplitView` becomes a
`NavStack` drill-down whose back control the application pops. The
application owns open state, selection, the pushed detail, dismissal policy,
and record actions. Do not rebuild the dialog or reach into private shadow
parts.

## Composer form

[Open the recipe](../ux-demo/?component=recipe-composer-form) · [TSX source](../ux-demo/recipes/composer-form.tsx)

A direct `ToolbarText` supplies the task title, with app-owned supporting copy
below; their ids are referenced by the form. `ListInsetText` gives that bare
supporting copy the same content-item text inset as the fields. The title and
supporting line share a nested heading `List` with `gap="none"`, so the heading
unit stays together instead of taking the form's 24px section gap. Production
fields own labels, help, and native focus. One `List` owns the 24px major
rhythm; the field `List` and the action `Row` use `controlInsets` to sit on the
shared 8px inline gutter with 8px gaps between related controls, rather than
acquiring a second content-item padding inset. The app owns
validation, drafts, permissions, and transport. Persistent error or success
feedback is the only nested semantic surface and uses `StateBanner`, not a toast.
Because upgraded Web Awesome fields retain live value properties, controlled
resets synchronize both those properties and the rendered value attributes;
the Reset action also announces `Draft reset` through the catalog live region.

## List workspace states

[Open the recipe](../ux-demo/?component=recipe-list-workspace-states) · [TSX source](../ux-demo/recipes/list-workspace-states.tsx)

The same content region moves deterministically through loading, empty,
populated, stale/background refresh, and error/retry states. The recipe owns
feedback placement; the app owns fetching, cache age, retry policy, and domain
rows.

## Compact toolbar choices and actions

[Open the recipe](../ux-demo/?component=recipe-compact-toolbar) · [TSX source](../ux-demo/recipes/compact-toolbar.tsx)

Use `ToolbarControlGroup` for related commands, `SegmentedControl` for a few
visible exclusive choices, `Select` for a longer value list, and an ordinary
button for an independent command. Even that independent button sits in a
single-control `ToolbarControlGroup`, which keeps its height, pill shape, focus,
and hover treatment aligned with the adjacent toolbar controls. At compact
widths the toolbar stacks its zones and wraps whole trailing groups onto another
row, so the last action is never clipped. The app owns values, actions,
persistence, and responsive priority.

## Navigation stack

[Open the recipe](../ux-demo/?component=recipe-navigation-stack) · [TSX source](../ux-demo/recipes/navigation-stack.tsx)

Drill from a library list into a detail and back with `NavStack`
(`@kerfjs/ui/nav-stack`): the app owns the stack as a signal of views and
pushes/pops it, `NavStack` renders it, and `wireNavStack` slides the content and
settles the chrome (reduced motion collapses the slide to instant). See the
layout guide
[`app-layouts.md`](app-layouts.md) for choosing among `NavStack`, `SplitView`,
`Workbench`, and `TabScaffold`.

## Loading inspector

[Open the recipe](../ux-demo/?component=recipe-loading-inspector) · [TSX source](../ux-demo/recipes/loading-inspector.tsx)

A record inspector whose per-record values load asynchronously. Every
value-bearing component (`ToolbarText`, `ValueTable`/`ValueTableRow`, `Select`,
`SegmentedControl`, `ListItem`, `StateBanner`) takes its `placeholder` from one
loading flag, so the same real chrome renders a faithful loading state and then
the populated record — no separate skeleton markup. The composition is the point;
`Skeleton` is the primitive it builds on. Its heading `Toolbar` uses
`responsive="wrap"`, so on a narrow inspector the toggle moves below a whole
record title instead of truncating it. The app owns the loading lifecycle and
which values are still unknown.

## Collapsible sidebar

[Open the recipe](../ux-demo/?component=recipe-collapsible-sidebar) · [TSX source](../ux-demo/recipes/collapsible-sidebar.tsx)

A mini app frame whose left navigation rail and bottom activity drawer are
standalone `CollapsiblePanel`s (`@kerfjs/ui/collapsible-panel`) driven by
`wireSidebar` (`@kerfjs/ui/wire-sidebar`). `CollapsiblePanelToggle` supplies the
standard per-side glyph: a collapse toggle lives inside each panel and an expand
toggle lives in the always-visible main header, so a collapsed panel is still
reachable. `wireSidebar` owns the toggle delegation, moves focus into a panel on
open and restores it to the trigger on close, and — when a `deviceClass()` reports
`compact` — presents the panels as a dismissable **overlay** (backdrop, Escape
and backdrop-click collapse, and a trapped Tab ring, the ARIA dialog pattern).
The overlay starts closed and opens only from a toggle; the rail's signal is
seeded from the device class with `inlineCollapsed: false`, so the first compact
render has no overlay and a wide crossing restores the open inline rail. It
also persists each panel's inline collapsed state through a supplied storage hook. A
filling `Row` (`fill` plus `rootAttributes`) is the root: it takes the frame's
definite height and places the rail beside a `List` column, and a one-column
`Grid` grows the main pane above the drawer. Because the panels sit at the real
frame edges, each grows through its edge's safe area and hands that edge back to
its siblings when it collapses; the drawer's activity log is a `ValueTable`. The app owns each
`collapsed` signal, the panel sizes, and the content; the wire owns the
ephemeral interaction. For a full three-pane shell use `Workbench` instead — see
[`app-layouts.md`](app-layouts.md). This recipe is covered end-to-end across
Chromium, Firefox, and WebKit by `tests/browser/collapsible-sidebar-recipe.spec.ts`.

## Rules shared by every recipe

- Import `@kerfjs/ui/layout.css`; keep every pane unpadded and use exactly one
  `.kui-pane__content` scroll owner for each real boundary.
- For direct `wa-*` JSX, import types from `@kerfjs/ui/webawesome`. Import only
  individual Web Awesome registration modules and theme them with
  `@kerfjs/ui/webawesome.css`.
- Compose, don't style. A recipe ships no stylesheet, sets no inline style, and
  names no class outside the published layout vocabulary (`.kui-content`,
  `.kui-content-item`, …) and themed Web Awesome classes; it configures
  components through props, `rootAttributes`, and tokens. When a recipe needs a
  capability no component offers, record it as a component gap rather than
  papering over it with CSS. `npm run check:recipes` enforces these rules on
  every file in `ux-demo/recipes/`.
- Each recipe also exports a catalog-only `presentation`: the `CatalogExample`
  viewport that frames it in the UX catalog and its ownership note. An
  application that copies the recipe ignores that export and mounts the
  controller into its own container.
- Start from the copyable mount adapter, or reproduce its complete boundary:
  wire stable `data-action` hooks once and retain every disposer.

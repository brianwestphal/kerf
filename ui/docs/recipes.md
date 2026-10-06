# Production composition recipes

These ten reference compositions sit between individual primitives and product
code. Open each stable UX-catalog route to run it, then copy the linked TSX. The
examples import public package subpaths, compose components through their
props and tokens, and keep state in a per-instance application adapter. They
ship no stylesheet of their own and are not new monolithic components.

Copy the recipe source together with the catalog-independent
[`mount-recipe.ts`](../ux-demo/recipes/mount-recipe.ts) adapter. It mounts the
controller at one stable application root, uses `delegateActions()` for recipe
commands, forwards form and dialog lifecycle events, runs the recipe's own
`wire()` (for example `wireWorkbench` or `wireSidebar`), retains every
disposer, and returns one idempotent disposer:

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
`rootAttributes`) stacks the app-bar `Toolbar` above a `Workbench`
(`@kerfjs/ui/workbench`): resizable navigation and inspector rails around the
task list. Each rail composes its own panel toolbar — a default-size title and
the standard hide toggle — and the work area's `mainToolbar` carries the xl
view title. While a rail is hidden, `Workbench` relocates its show toggle into
the work-area toolbar on the same logical edge (leading for the navigation
rail, trailing for the inspector), and `wireWorkbench` hands focus between the
two positions. Collapse a rail completely rather than preserving an empty icon
rail. Only the three real panes own a `.kui-pane__content` scroll owner; no
frame `Pane` wraps the layout in a scroll owner that never scrolls, and the
app-bar `Toolbar` claims the top edge and both sides with its own
`safeAreaEdges`.

On a narrow container the rails overlay the task list one at a time instead of
squeezing it, leaving a 44px strip on the far side that dismisses the overlay
(`responsiveOverlayAt`, on by default; `compactOverlay: 'full'` covers the
whole width). The app owns each rail's collapsed and size signals — which
`wireWorkbench` keeps in sync with resizing and overlay dismissal — plus
routing, persistence, and data. Adapt only public `--kui-layout-*` and
component variables.

## Navigation sidebar

[Open the recipe](../ux-demo/?component=recipe-navigation-sidebar) · [TSX source](../ux-demo/recipes/navigation-sidebar.tsx)

One unpadded `.kui-pane` owns toolbar/content/footer structure. Its
`.kui-content` uses 24px major gaps; `ListHeader`, `ListItem`, and
`ContentItem` children own their 8px margin, 1px border, and 8px padding.
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

A list-detail dialog is laid out like a `Workbench` with a left sidebar: on
roomy devices the list is a full-height sidebar and the detail is a full-height
main column, each a `Pane` with its own top `Toolbar`. The sidebar's toolbar
carries its quiet default-size title (and it may add a bottom toolbar for
sidebar-only actions); the main column's toolbar carries the dialog's primary
extra-large title and the close control, and its footer carries the record
actions. The Web Awesome dialog therefore renders `without-header` there —
its label still names the modal — and the close button uses
`data-dialog="close"`. Web Awesome keeps modal focus and Escape, and the thin
recipe adapter restores the invoking control after the hide event.
`DialogSurface` chooses the large modal with no body inset, because the panes
own their geometry. Its explicit 16px `viewportGutter` and `maxHeight="viewport"`
bound the roomy modal to the dynamic viewport; the compact fullscreen
presentation retains its existing geometry. Application render state chooses
the presentation and can likewise choose gutter/cap values for a compact modal.
On compact devices the dialog becomes a full-screen sheet
with its own labeled header and footer actions, and `SplitView` becomes a
`NavStack` drill-down whose back control the application pops. The
application owns open state, selection, the pushed detail, dismissal policy,
and record actions. Do not put the primary title in a header spanning both
columns, rebuild the dialog, or reach into private shadow parts.

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
`Workbench`, and `TabNavigator`.

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
`wireSidebar` (`@kerfjs/ui/wire-sidebar`). Each panel takes a `toolbar` — a
title plus the standard per-side toggle — so the hide control lives in the
panel's own header, and `CollapsiblePanelRelocated` renders the matching show
control only while the panel is collapsed, so exactly one control owns each
action and a collapsed panel is still reachable. The rail's relocated toggle
leads the always-visible main header; the drawer's sits in a
`FloatingToolbar` passed as the drawer's own `restoreControl`, which the panel
floats in its column's safe-area-aware bottom-end corner, next to where the
drawer opens — do not hand-roll a conditional floating control beside the
panel. `wireSidebar` owns the toggle delegation, moves focus into a
panel on open, restores it on close (to the trigger, or to the panel's expand toggle when
the trigger sits inside the collapsed panel), and — when a `deviceClass()` reports
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
  `.kui-control-cluster`, …) and themed Web Awesome classes — a content item is
  a `ContentItem`, not a hand-written `.kui-content-item`; it configures
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

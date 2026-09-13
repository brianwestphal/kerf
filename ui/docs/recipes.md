# Production composition recipes

These eight reference compositions sit between individual primitives and product
code. Open each stable UX-catalog route to run it, then copy the linked TSX and
CSS. The examples import public package subpaths, use semantic layout owners,
and keep state in a per-instance application adapter. They are not new
monolithic components.

Copy the recipe source together with the catalog-independent
[`mount-recipe.ts`](../ux-demo/recipes/mount-recipe.ts) adapter. It mounts the
controller at one stable application root, uses `delegateActions()` for recipe
commands, forwards form, keyboard, and dialog lifecycle events, wires resize commits with
the public `onCommit` callback, retains every disposer, and returns one
idempotent disposer:

```ts
import { createRecipe } from './navigation-sidebar.js';
import { mountRecipe } from './mount-recipe.js';

const root = document.querySelector<HTMLElement>('#navigation')!;
const stopRecipe = mountRecipe(root, createRecipe(announce));
window.addEventListener('pagehide', stopRecipe, { once: true });
```

The adapter is delivered as reference source, not a new package runtime export.
`delegate()` remains a valid alternative when an application needs selector-
specific dispatch; either way, wire once at a stable root and retain disposal.

## Desktop application shell

[Open the recipe](../ux-demo/?component=recipe-app-shell) · [TSX source](../ux-demo/recipes/app-shell.tsx) · [shared CSS](../ux-demo/recipes/recipes.css)

Use `Toolbar`, the sidebar composition, controlled `ResizableRegion` panes, and
one `.kui-scroll-owner` per pane. The recipe owns the shell topology; the app
owns routing, responsive pane visibility, sizes, persistence, and data. Adapt
only public `--kui-layout-*`, `--kui-sidebar-*`, and component variables.

## Navigation sidebar

[Open the recipe](../ux-demo/?component=recipe-navigation-sidebar) · [TSX source](../ux-demo/recipes/navigation-sidebar.tsx)

One `.kui-sidebar` owns the gutter and icon/label columns across headers,
icon-bearing rows, iconless rows, the surface block, and footer actions. The app
owns routes, permissions, labels, selection, and disclosure state.

## Workspace header

[Open the recipe](../ux-demo/?component=recipe-workspace-header) · [TSX source](../ux-demo/recipes/workspace-header.tsx)

`PageHeader` owns the page heading while one control cluster holds secondary,
overflow, and primary actions. The app owns authorization and command policy;
controls relocate without changing focus order.

## Master-detail dialog

[Open the recipe](../ux-demo/?component=recipe-master-detail-dialog) · [TSX source](../ux-demo/recipes/master-detail-dialog.tsx)

The production Web Awesome dialog owns modal focus and Escape; the thin recipe
adapter restores the invoking control consistently after the hide event.
`DialogHeader`, `MenuHeader`, `MenuItem`, and `ValueTable` own their included
anatomy. The application owns open state, selection, dismissal policy, and
record actions. Do not rebuild the dialog or reach into private shadow parts.

## Composer form

[Open the recipe](../ux-demo/?component=recipe-composer-form) · [TSX source](../ux-demo/recipes/composer-form.tsx)

Production fields own labels, help, and native focus; semantic layout classes
own field, message, and action rhythm. The app owns validation, drafts,
permissions, and transport. Persistent errors use `StateBanner`, not a toast.

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
button for an independent command. The app owns values, actions, persistence,
and responsive priority.

## Command palette

[Open the recipe](../ux-demo/?component=recipe-command-palette) · [TSX source](../ux-demo/recipes/command-palette.tsx)

Use the copyable composition for a modal search field, grouped results,
active-result semantics, Arrow/Home/End/Enter behavior, an empty state, and
focus restoration. The application owns command registration, matching and
ranking, permissions, persisted recent history, dispatch, and product copy.
This is a production recipe, not an `@kerfjs/ui` command-palette export.

## Rules shared by every recipe

- Import `@kerfjs/ui/layout.css`; use exactly one inset and scroll owner for each
  real boundary.
- For direct `wa-*` JSX, import types from `@kerfjs/ui/webawesome`. Import only
  individual Web Awesome registration modules and theme them with
  `@kerfjs/ui/webawesome.css`.
- Customize public variables/classes at the composition boundary. Do not copy
  included component markup or style private descendants.
- Start from the copyable mount adapter, or reproduce its complete boundary:
  wire stable `data-action` hooks once and retain every disposer.

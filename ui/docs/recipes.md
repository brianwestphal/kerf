# Production composition recipes

These seven reference compositions sit between individual primitives and product
code. Open each stable UX-catalog route to run it, then copy the linked TSX and
CSS. The examples import public package subpaths, use semantic layout owners,
and keep state in a per-instance application adapter. They are not new
monolithic components.

Copy the recipe source together with the catalog-independent
[`mount-recipe.ts`](../ux-demo/recipes/mount-recipe.ts) adapter. It mounts the
controller at one stable application root, uses `delegateActions()` for recipe
commands, forwards form and dialog lifecycle events, wires resize commits with
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

Use `Toolbar`, controlled `ResizableRegion` panes, and one
`.kui-pane__content` scroll owner per pane. The recipe owns the shell topology;
the app owns routing, responsive pane visibility, sizes, persistence, and data.
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

`PanelHeader` owns the page heading while one control cluster holds secondary,
overflow, and primary actions. The app owns authorization and command policy;
controls relocate without changing focus order.

## List-detail dialog

[Open the recipe](../ux-demo/?component=recipe-list-detail-dialog) · [TSX source](../ux-demo/recipes/list-detail-dialog.tsx)

The production Web Awesome dialog owns modal focus and Escape; the thin recipe
adapter restores the invoking control consistently after the hide event.
`PanelHeader`, `ListHeader`, `ListItem`, and `ValueTable` own their included
anatomy. The application owns open state, selection, dismissal policy, and
record actions. `PanelHeader` places the trailing controls the app passes
directly into its top toolbar's trailing zone.
The header sits on the dialog edge while retaining its internal control inset;
the selected title receives the full content gutter, the metadata table fills
the available detail width between the usual outer margins, and the action
cluster uses one outer gutter without a second content-item inset.
Do not rebuild the dialog or reach into private shadow parts.

## Composer form

[Open the recipe](../ux-demo/?component=recipe-composer-form) · [TSX source](../ux-demo/recipes/composer-form.tsx)

`PanelHeader` supplies the task title and summary, with their ids referenced
by the form. Production fields own labels, help, and native focus. The field
and footer control edges sit directly on the shared 8px inline gutter rather
than acquiring a second content-item padding inset; major children remain 24px
apart and related controls use 8px gaps. The app owns
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
button for an independent command. The app owns values, actions, persistence,
and responsive priority.

## Navigation stack

[Open the recipe](../ux-demo/?component=recipe-navigation-stack) · [TSX source](../ux-demo/recipes/navigation-stack.tsx)

Drill from a library list into a detail and back with `NavStack`
(`@kerfjs/ui/nav-stack`): the app owns the stack as a signal of views and
pushes/pops it, `NavStack` renders it, and `wireNavStack` slides the content and
settles the chrome (reduced motion collapses the slide to instant). A live
`deviceClass()` badge shows the current size/orientation. See the layout guide
[`app-layouts.md`](app-layouts.md) for choosing among `NavStack`, `SplitView`,
`Workbench`, and `TabScaffold`.

## Loading inspector

[Open the recipe](../ux-demo/?component=recipe-loading-inspector) · [TSX source](../ux-demo/recipes/loading-inspector.tsx)

A record inspector whose per-record values load asynchronously. Every
value-bearing component (`PanelHeader`, `ValueTable`/`ValueTableRow`, `Select`,
`SegmentedControl`, `ListItem`, `StateBanner`) takes its `placeholder` from one
loading flag, so the same real chrome renders a faithful loading state and then
the populated record — no separate skeleton markup. The composition is the point;
`Skeleton` is the primitive it builds on. The app owns the loading lifecycle and
which values are still unknown.

## Rules shared by every recipe

- Import `@kerfjs/ui/layout.css`; keep every pane unpadded and use exactly one
  `.kui-pane__content` scroll owner for each real boundary.
- For direct `wa-*` JSX, import types from `@kerfjs/ui/webawesome`. Import only
  individual Web Awesome registration modules and theme them with
  `@kerfjs/ui/webawesome.css`.
- Prefer public props and variables at the composition boundary. When a recipe
  needs responsive topology, join only classes listed in the catalog's
  `publicClasses`; do not copy component markup or select descendants by tag,
  id, attribute alone, or an unlisted implementation class.
- Start from the copyable mount adapter, or reproduce its complete boundary:
  wire stable `data-action` hooks once and retain every disposer.

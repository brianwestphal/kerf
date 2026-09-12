---
title: '@kerfjs/ui'
description: 'Accessible, composable first-party UI primitives for kerf apps.'
---

`@kerfjs/ui` is kerf's optional first-party component layer. It provides
production-backed structure, navigation, form, and feedback primitives without
adding a component runtime: every component is still a plain function returning
Kerf `SafeHtml`.

```bash
npm install kerfjs @kerfjs/ui
```

```tsx
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

const header = <Toolbar leading={<ToolbarText text="Library" />} />;
```

Prefer explicit component subpaths such as `@kerfjs/ui/toolbar`. CSS-aware
browser bundlers resolve those imports to styled wrappers and collect only the
foundation, component CSS, and styles of UI subcomponents reachable from the
component. The package derives that graph, so the app shell maintains no
stylesheet list and unused component CSS stays out of the bundle.

The root barrel remains CSS-free for portable JavaScript tree shaking. Pair a
root-barrel import with `@kerfjs/ui/styles.css` when the complete layer is
intentional. Node/SSR uses pure modules automatically, and
`@kerfjs/ui/unstyled` offers an explicit CSS-free root for custom browser
pipelines. All CSS paths remain public for manual delivery. Load app overrides
afterward or scope `--kui-*` properties on a component instance.

## Web Awesome theme

Use the package's optional theme entry when the app renders free Web Awesome
components alongside Kerf primitives:

```ts
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
```

The one CSS import includes Web Awesome's base styles and applies the same
Hot Sheet 2-aligned semantic palette, focus treatment, form geometry, panels,
tooltips, radii, and shadows used by the Kerf layer. It registers no components;
continue importing only the individual Web Awesome component modules the app
uses. Override public `--wa-*` values after the theme import, globally or on a
subtree, and use `.wa-light`, `.wa-dark`, or `.wa-invert` for explicit
appearance boundaries.

## Included primitives

- `LucideIcon`; `Toolbar`, `ToolbarControlGroup`, `ToolbarText`
- `MenuItem`, `MenuHeader`; `AppTab`, controlled `TabBar`, `wireTabBars`, `reorderTabs`
- `PageHeader`, `DialogHeader`, `ValueTable`
- `ResizableRegion` with `wireResizableRegions`
- `SegmentedControl`, `Select`; `StateBanner`, `EmptyState`, `LoadingSpinner`

The components expose slots and stable `kui-` classes rather than domain data or
commands. Applications retain state, routing, menu policy, and tab-list policy.

`SegmentedControl` provides controlled exclusive choices in a toolbar, rounded
rectangle, or pill. It renders native pressed buttons, keeps every enabled
choice in sequential Tab order, and leaves value updates to the application.

The default `--kui-color-*` ramps match Hot Sheet 2's Web Awesome-compatible
neutral, brand/info, success, warning, and danger palette. Override the global
semantic tokens, a tone variable, or a component property such as
`--kui-state-banner-background` without replacing component selectors.

For a navigation rail, import `@kerfjs/ui/sidebar.css` and use
`.kui-sidebar`, `.kui-sidebar-section`, and `.kui-sidebar-surface`. The
composition gives headers plus icon-bearing and iconless rows one shared label
column. Bordered surfaces stay flush to the sidebar gutter while their contents
align with that column. Avoid nested wrapper padding, moving a decorative
border onto the text column, or repairing either with negative margins; change
the shared `--kui-sidebar-*` tokens at the composition boundary instead.

## Web Awesome Select

`Select` renders Web Awesome markup without registering custom elements. Opt in
once in an application entry that uses it:

```ts
import '@kerfjs/ui/webawesome.css';
import '@kerfjs/ui/select/register';
```

Web Awesome is an optional peer, so it stays out of applications and bundles
that use neither the Select registration entry nor the shared theme. Icon-bearing
choices keep their slotted icons across Kerf rerenders, and custom selected
content follows the controlled value without application-side morph workarounds.

## Accessibility

The styles preserve visible focus, forced colors, reduced motion, and practical
target sizes. Icons are decorative unless labeled. Banners distinguish polite
status from assertive alerts. The resizable separator supports pointer input,
arrow keys, Shift acceleration, Home, and End. `AppTab` supplies tab semantics;
`TabBar` plus `wireTabBars` add horizontal overflow, navigation, closing,
pointer/keyboard reorder, proximity-based horizontal edge autoscroll, and focus
restoration while the application owns and persists the controlled state.
Segmented controls expose a labeled group, native button activation, explicit
pressed state, and semantic `--kui-segmented-*` palette overrides.

The package's design philosophy, component contract, accessibility checklist,
Apple HIG interpretation, and runnable UX catalog live under [`ui/docs/`](https://github.com/brianwestphal/kerf/tree/main/ui/docs).

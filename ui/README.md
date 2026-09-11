# @kerfjs/ui

Accessible, composable UI primitives for [kerf](https://github.com/brianwestphal/kerf). The package ships production components, component-reachable CSS, accessibility and keyboard contracts, an AI-readable guide, and a production-backed UX catalog.

```bash
npm install kerfjs @kerfjs/ui
```

```tsx
import { MenuItem } from '@kerfjs/ui/menu-item';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

mount(root, () => <>
  <Toolbar label="Document" leading={<ToolbarText text="Notes" />} />
  <MenuItem action="open-notes" label="Notes" selected />
</>);
```

Components return Kerf `SafeHtml`. They do not own application state or attach transient listeners. Actions are stable `data-action` hooks; the application wires them once with `delegate()` or `delegateActions()` and retains the disposer.

## Component subpaths

| Component | Browser import (includes reachable CSS) | Manual CSS export |
| --- | --- | --- |
| `LucideIcon` | `@kerfjs/ui/lucide-icon` | `@kerfjs/ui/lucide-icon.css` |
| `Toolbar` | `@kerfjs/ui/toolbar` | `@kerfjs/ui/toolbar.css` |
| `ToolbarControlGroup` | `@kerfjs/ui/toolbar-control-group` | `@kerfjs/ui/toolbar-control-group.css` |
| `ToolbarText` | `@kerfjs/ui/toolbar-text` | `@kerfjs/ui/toolbar-text.css` |
| `MenuItem` | `@kerfjs/ui/menu-item` | `@kerfjs/ui/menu-item.css` |
| `MenuHeader` | `@kerfjs/ui/menu-header` | `@kerfjs/ui/menu-header.css` |
| `ResizableRegion` | `@kerfjs/ui/resizable-region` | `@kerfjs/ui/resizable-region.css` |
| `wireResizableRegions` | `@kerfjs/ui/wire-resizable-regions` | — |
| `AppTab` | `@kerfjs/ui/app-tab` | `@kerfjs/ui/app-tab.css` |
| `TabBar` | `@kerfjs/ui/tab-bar` | `@kerfjs/ui/tab-bar.css` |
| `wireTabBars`, `reorderTabs` | `@kerfjs/ui/wire-tab-bars` | — |
| `PageHeader` | `@kerfjs/ui/page-header` | `@kerfjs/ui/page-header.css` |
| `LoadingSpinner` | `@kerfjs/ui/loading-spinner` | `@kerfjs/ui/loading-spinner.css` |
| `Select` | `@kerfjs/ui/select` | `@kerfjs/ui/select.css` |
| `SegmentedControl` | `@kerfjs/ui/segmented-control` | `@kerfjs/ui/segmented-control.css` |
| `StateBanner` | `@kerfjs/ui/state-banner` | `@kerfjs/ui/state-banner.css` |
| `EmptyState` | `@kerfjs/ui/empty-state` | `@kerfjs/ui/empty-state.css` |
| `DialogHeader` | `@kerfjs/ui/dialog-header` | `@kerfjs/ui/dialog-header.css` |
| `ValueTable` | `@kerfjs/ui/value-table` | `@kerfjs/ui/value-table.css` |

Import components from their explicit JavaScript subpaths. CSS-aware browser
bundlers such as Vite, webpack, and esbuild follow each subpath's `browser`
condition, collect its foundation and component CSS, and retain styles for any
UI subcomponents it uses. Unrelated component CSS is never reached. Application
roots therefore do not need a transitive stylesheet list, and removing the last
component import also removes its reachable CSS. This is component-level CSS
tree shaking; variants within an imported component remain together.

The root `@kerfjs/ui` barrel stays JavaScript-only because making a side-effectful
CSS barrel tree-shakable is not portable across bundlers. If an application uses
that convenience import, also import `@kerfjs/ui/styles.css`, which deliberately
contains the complete layer. Non-browser/SSR tools resolve the pure `import`
condition automatically; `@kerfjs/ui/unstyled` is the explicit CSS-free root
entry for a browser build with a custom styling pipeline. The exported
`foundation.css` and component CSS paths remain available for fully manual
delivery. Load application overrides after package styles, or scope `--kui-*`
variables directly on a component instance.

## Web Awesome theme

Apps using Web Awesome's free components can opt into the same visual universe
with one CSS import:

```ts
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
```

`webawesome.css` includes Web Awesome's native/base theme and then applies the
Hot Sheet 2 palette, surfaces, status colors, focus treatment, form geometry,
radii, tooltips, and shadows through Web Awesome's public `--wa-*` contract.
Those tokens flow into all free component families. Every free Web Awesome 3.12
component has an individual UX-catalog route under the collapsible ecosystem
section, but the theme entry does not import or register component JavaScript,
so each component module remains independently tree-shakeable in consuming apps.
Tooltip and Popover surfaces omit pointer arrows by default. Override
`--wa-tooltip-arrow-size` and `--kui-wa-popover-arrow-size`, or a single
popover's public `--arrow-size`, when an arrow communicates useful context.

Load application CSS afterward to override semantic values globally, or scope
them to a subtree. Use Web Awesome's `.wa-light`, `.wa-dark`, and `.wa-invert`
classes for explicit appearance boundaries:

```css
:root {
  --wa-color-brand-fill-loud: #7540a8;
  --wa-form-control-border-radius: .5rem;
}
```

`foundation.css` follows Hot Sheet 2's Web Awesome-compatible semantic palette.
Brand, neutral, success, warning, and danger each expose fill, border, and
foreground roles through `--kui-color-*`; stateful components also expose
component variables such as `--kui-state-banner-background`. Override the
foundation for an application theme, a tone variable for one semantic state, or
a component variable on one instance without replacing component selectors.

`StateBanner` has opinionated `neutral`, `info`, `success`, `warning`, and
`danger` palettes. Override an individual banner with
`--kui-state-banner-background`, `--kui-state-banner-border`,
`--kui-state-banner-foreground`, `--kui-state-banner-detail`,
`--kui-state-banner-action-background`, and
`--kui-state-banner-action-hover-background`. To retheme one tone everywhere,
override `--kui-state-banner-{tone}-{background|border|foreground}`. Other
stateful components follow the same public-variable pattern, including
`--kui-toolbar-control-*`, `--kui-segmented-*`, `--kui-app-tab-*`, and
`--kui-tab-bar-*`.

`SegmentedControl` is a controlled exclusive-choice component. Use
`appearance="toolbar"` when it sits inside a `ToolbarControlGroup`, or choose a
standalone `filled`/`outlined` appearance with `shape="rounded"` or
`shape="pill"`. The app owns `value` and handles the supplied action:

```tsx
<SegmentedControl
  id="view-mode"
  label="View mode"
  value={viewMode.value}
  action="select-view-mode"
  appearance="toolbar"
  shape="pill"
  choices={[
    { value: 'list', label: 'List' },
    { value: 'columns', label: 'Columns' },
  ]}
/>
```

Each choice remains a native button in sequential Tab order and exposes its
value through `data-segment-value`. Override an instance through
`--kui-segmented-{background|border|foreground|hover-background}` and
`--kui-segmented-selected-{background|foreground|border|shadow}`.

`TabBar` is controlled: pass ordered `AppTab` children, then wire its keyboard
and same-bar drag behavior with `wireTabBars(root, { onReorder })`. During a
drag, the scroll strip automatically moves toward either edge with speed based
on pointer proximity, exposing earlier or later drop targets. Apply the reported
change with `reorderTabs()` or application-specific state logic. The application
still owns selection, closing, routing, and persistence.

`Select` uses Web Awesome but does not register anything by itself. Install the optional peer, import the shared theme if desired, and explicitly import the registration entry in the application:

```ts
import '@kerfjs/ui/webawesome.css';
import '@kerfjs/ui/select/register';
```

That boundary keeps Web Awesome and its custom-element side effects out of bundles that use unrelated components. Automated consumer-bundle tests enforce it.

For application choices and panes, prefer Kerf's purpose-built primitives:
`Select` over direct Web Awesome selection/dropdown composition,
`SegmentedControl` over Button Group, `TabBar` or `SegmentedControl` over Web
Awesome Tabs, `LucideIcon` over Web Awesome Icon, and `ResizableRegion` over
Split Panel. `ResizableRegion` includes Hot Sheet 2's 1px separator and
hover/focus grip. Consider Web Awesome Popup when its anchored-positioning
engine removes custom placement code; treat Tree, Animated Image, Comparison,
Zoomable Frame, and the displaced alternatives above as exceptional rather
than default patterns. The detailed rationale lives in the theme contract.

## Design and tool guidance

- [Design philosophy](./docs/design-philosophy.md)
- [Apple HIG translation](./docs/apple-hig.md)
- [Accessibility and keyboard contracts](./docs/accessibility.md)
- [Component and integration contract](./docs/component-contract.md)
- [Web Awesome theme contract](./docs/webawesome-theme.md)
- [UX catalog contract](./docs/ux-demo.md)
- [AI guide](./ai/skill.md)

Run `npm run dev` from this directory for the category-grouped master/detail catalog. Every public visual component has a focused route; all 70 free Web Awesome 3.12 components have focused routes under the collapsible ecosystem section. One grouped `Related components` selector contains derived `Uses` / `Used by` navigation across both sets. Run `npm run check` for static/unit/bundle gates and `npm run test:e2e` for the real-browser suite.

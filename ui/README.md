# @kerfjs/ui

Accessible, composable UI primitives for [kerf](https://github.com/brianwestphal/kerf). The package ships production components, explicit CSS entry points, accessibility and keyboard contracts, an AI-readable guide, and a production-backed UX catalog.

```bash
npm install kerfjs @kerfjs/ui
```

```tsx
import { MenuItem, Toolbar, ToolbarText } from '@kerfjs/ui';
import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/menu-item.css';

mount(root, () => <>
  <Toolbar label="Document" leading={<ToolbarText text="Notes" />} />
  <MenuItem action="open-notes" label="Notes" selected />
</>);
```

Components return Kerf `SafeHtml`. They do not own application state or attach transient listeners. Actions are stable `data-action` hooks; the application wires them once with `delegate()` or `delegateActions()` and retains the disposer.

## Component subpaths

| Component | JS import | CSS import |
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
| `StateBanner` | `@kerfjs/ui/state-banner` | `@kerfjs/ui/state-banner.css` |
| `EmptyState` | `@kerfjs/ui/empty-state` | `@kerfjs/ui/empty-state.css` |
| `DialogHeader` | `@kerfjs/ui/dialog-header` | `@kerfjs/ui/dialog-header.css` |
| `ValueTable` | `@kerfjs/ui/value-table` | `@kerfjs/ui/value-table.css` |

Import `@kerfjs/ui/styles.css` for the complete stylesheet or combine `foundation.css` with only the component CSS you use.

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
`--kui-toolbar-control-*`, `--kui-app-tab-*`, and `--kui-tab-bar-*`.

`TabBar` is controlled: pass ordered `AppTab` children, then wire its keyboard
and same-bar drag behavior with `wireTabBars(root, { onReorder })`. Apply the
reported change with `reorderTabs()` or application-specific state logic. The
application still owns selection, closing, routing, and persistence.

`Select` uses Web Awesome but does not register anything by itself. Install the optional peer and explicitly import the registration entry in the application:

```ts
import '@kerfjs/ui/select/register';
```

That boundary keeps Web Awesome and its custom-element side effects out of bundles that use unrelated components. Automated consumer-bundle tests enforce it.

## Design and tool guidance

- [Design philosophy](./docs/design-philosophy.md)
- [Apple HIG translation](./docs/apple-hig.md)
- [Accessibility and keyboard contracts](./docs/accessibility.md)
- [Component and integration contract](./docs/component-contract.md)
- [UX catalog contract](./docs/ux-demo.md)
- [AI guide](./ai/skill.md)

Run `npm run dev` from this directory for the category-grouped master/detail catalog. Every public visual component has a focused route and one grouped `Related components` selector containing its derived `Uses` / `Used by` navigation. Run `npm run check` for static/unit/bundle gates and `npm run test:e2e` for the real-browser suite.

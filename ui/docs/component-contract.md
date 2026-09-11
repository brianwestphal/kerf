# Component and integration contract

`@kerfjs/ui` components are plain functions that return Kerf `SafeHtml`. They have no component instance or lifecycle.

## Ownership boundaries

- Components own semantic markup, stable anatomy, documented variants, ARIA projection, and package CSS hooks.
- Applications own signals/stores, product copy, domain-state mapping, persistence, routing, permissions, and transport.
- Actions are `data-action` strings. Wire them at a stable root with `delegate()` or `delegateActions()` and retain the disposer.
- A reusable component never owns per-instance mutable module state.
- Consumers style through `--kui-*` semantic tokens and public component classes. Foundation tokens provide opinionated neutral, brand/info, success, warning, and danger fill/border/foreground roles. Stateful components expose local override variables; do not target private descendants when a documented variant or token exists.

`StateBanner` exposes instance-level `--kui-state-banner-background`,
`--kui-state-banner-border`, `--kui-state-banner-foreground`,
`--kui-state-banner-detail`, and action background variables. Its five built-in
tones can be rethemed globally with
`--kui-state-banner-{tone}-{background|border|foreground}`. Toolbar control,
segmented-control, app-tab, and tab-bar colors likewise use their public
`--kui-*-*` variables. `SegmentedControl` exposes surface, border, foreground,
hover, and selected-state variables, so rounded, pill, and toolbar presentations
remain opinionated but locally overridable.

`ResizableRegion` owns the Hot Sheet 2 split treatment: a persistent 1px
separator with a compact grip that appears on hover or keyboard focus. Override
`--kui-resizable-region-separator-color`,
`--kui-resizable-region-handle-color`, or
`--kui-resizable-region-handle-active-color` on a region when its containing
surface needs a different contrast level.

## Imports and side effects

Every component has an explicit JS and CSS subpath. In CSS-aware browser builds,
the JS component subpath resolves to a generated wrapper that imports the
foundation, the component stylesheet, and styles for its reachable UI
subcomponents. The source graph derives those transitive styles at build time;
an application root never maintains that list. Unused component subpaths and
their CSS remain unreachable. The root barrel and `@kerfjs/ui/unstyled` stay
CSS-free for Node, SSR, and custom styling pipelines; pair a root-barrel import
with `styles.css` when the complete component layer is intended. Application
overrides load later in the cascade or set scoped `--kui-*` variables. JavaScript
modules are pure except the browser style wrappers and `@kerfjs/ui/select/register`,
which registers exactly the Web Awesome elements used by `Select`. Eventful
helpers such as `wireResizableRegions` and `wireTabBars` attach listeners only
when called and return disposers. CSS, the generated wrappers that make it
reachable, and the registration module are the package's only declared side
effects.

`@kerfjs/ui/webawesome.css` is a separate, optional CSS boundary. It imports
Web Awesome's public base stylesheet and overrides its semantic theme layer to
match the Kerf/Hot Sheet 2 system. It never imports component JavaScript.
Consumers register only the individual Web Awesome modules they render and can
override `--wa-*` values after the theme import. The shared `--wa-*` values feed
both Web Awesome controls and Kerf's `--kui-*` foundation aliases, preventing a
second application palette.

`kerfjs` is a peer dependency and remains external in every build. Importing a toolbar must not bundle a second Kerf runtime, another UI component, Web Awesome registration, the UX catalog, or development tooling.

## Extracted versus application-specific

The package set is intentionally domain-neutral: icon rendering, toolbar primitives, controlled segmented choices, menu rows/headers, resizable regions and wiring, controlled reorderable tab bars, headers, loading, select, banners, empty states, dialog headers, and value tables.

Keep product adapters outside the package: connection-state maps, ticket empty-state copy, project/terminal/chat tab actions, saved pane sizes, provider or repository models, and application-specific palettes. An adapter may compose these primitives, map product state into their props, and override semantic CSS variables.

## Testing contract

Each behavior has focused unit coverage and a real-browser flow through the production-backed catalog. Consumer bundle tests enforce subpath CSS reachability, transitive component styles, root/SSR isolation, optional registration boundaries, and the CSS-only Web Awesome theme boundary. Visual evidence supplements—never replaces—keyboard, focus, state, and event assertions.

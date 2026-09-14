# Component and integration contract

`@kerfjs/ui` components are plain functions that return Kerf `SafeHtml`. They have no component instance or lifecycle.

## Selection boundary

Begin with the [need-first component matrix](./component-selection.md). Reuse a
primitive only when purpose, anatomy, state, and interaction match. Compose
public primitives for recurring layout; add a thin application adapter for
product state and policy; use custom markup when the semantic contract differs.
Recurring cross-product custom patterns belong in an upstream component or
recipe request, not in duplicated markup or private-descendant CSS.

The shipped [`component-catalog.json`](../ai/component-catalog.json) is the
canonical machine-readable inventory. Its facts are projected into the UX
catalog deterministically; package checks compare them with runtime exports,
package delivery paths, Web Awesome's installed manifest, AI guidance, and
documentation links. Nuanced prose in this contract and the selection guide
remains authored rather than generated.

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

`@kerfjs/ui/layout.css` defines one structural model for sidebars, main areas,
inspectors, and dialogs. `.kui-pane` is unpadded and contains an optional
toolbar, one scrolling `.kui-pane__content`, and an optional footer.
`.kui-content` gives major children 24px vertical separation.
`.kui-content-item` gives one child 8px inline margin, a real 1px border,
8px padding, and 12px corners; border and background may be transparent without
changing geometry. `.kui-content-item--pill` selects the 22px radius.

`ToolbarControlGroup` is the unit of toolbar organization, even for dormant
text. Each group reserves `calc(2px + remify(42px))`, or 44px, with 8px between
groups and inside items. `MenuHeader` similarly separates its dormant title and
optional badge from its optional 44px action. Do not add padding to pane shells,
double child-owned geometry with wrapper insets, or create competing scroll
owners. The [layout contract](./layout.md) lists the public roles and tokens.

`ValueTable` composes typed `ValueTableRow` entries. A row owns its `dt`/`dd`
semantics and may receive a leading `SafeHtml` icon. Separators follow the
content they introduce: 8px from either edge for an iconless row, or 40px from
the left edge (8px padding + 24px icon + 8px gap) and 8px from the right edge
for an icon-bearing row. Applications own the values, formatting, and whether
an icon is decorative or meaningfully labeled.

## Imports and side effects

Every component has an explicit JS and CSS subpath. In CSS-aware browser builds,
the JS component subpath resolves to a generated wrapper that imports the
foundation, the compiled component stylesheet from `dist/styles`, and styles for its reachable UI
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

Package source styles express root-scaled geometry with `remify(<px>)`; the
build converts it against the 16px authoring baseline and exposes only ordinary
`rem` CSS. Literal pixels remain for intentional hairlines, and `em` remains
explicit when a value is relative to its component's current font size. The UX
catalog applies the same transform to source CSS under Vite so `npm run dev`
retains hot module replacement.

`@kerfjs/ui/webawesome.css` is a separate, optional CSS boundary. It imports
Web Awesome's public base stylesheet and overrides its semantic theme layer to
match the Kerf/Hot Sheet 2 system. It never imports component JavaScript.
`import type {} from '@kerfjs/ui/webawesome'` is the matching side-effect-free
Kerf JSX declaration boundary for every catalog-supported `wa-*` tag.
Consumers register only the individual Web Awesome modules they render and can
override `--wa-*` values after the theme import. The shared `--wa-*` values feed
both Web Awesome controls and Kerf's `--kui-*` foundation aliases, preventing a
second application palette.

`Select` owns its custom-element reconciliation seam. It gives each slotted
option icon a stable key and leaves the upgraded Web Awesome-owned slot subtree
untouched on later Kerf renders. Its custom selected slot is keyed by the
controlled value so changed selections replace that content. Applications
should pass ordinary `choices` and `renderSelected` output rather than adding
their own morph-control attributes.

`kerfjs` is a peer dependency and remains external in every build. Importing a toolbar must not bundle a second Kerf runtime, another UI component, Web Awesome registration, the UX catalog, or development tooling.

## Extracted versus application-specific

The package set is intentionally domain-neutral: icon rendering, toolbar primitives, controlled segmented choices, a controlled token-chip search field with DOM read/caret helpers, menu rows/headers, resizable regions and wiring, controlled reorderable tab bars, headers, loading, select, banners, empty states, dialog headers, and typed value-table rows.

Keep product adapters outside the package: connection-state maps, ticket empty-state copy, project/terminal/chat tab actions, saved pane sizes, provider or repository models, and application-specific palettes. An adapter may compose these primitives, map product state into their props, and override semantic CSS variables.

## Testing contract

Each behavior has focused unit coverage and a real-browser flow through the production-backed catalog. Consumer bundle tests enforce subpath CSS reachability, transitive component styles, root/SSR isolation, optional registration boundaries, and the CSS-only Web Awesome theme boundary. Visual evidence supplements—never replaces—keyboard, focus, state, and event assertions.

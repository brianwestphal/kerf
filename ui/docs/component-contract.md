# Component and integration contract

`@kerfjs/ui` components are plain functions that return Kerf `SafeHtml`. They have no component instance or lifecycle.

## Selection boundary

Begin with the [need-first component matrix](./component-selection.md). Reuse a
primitive only when purpose, anatomy, state, and interaction match. Compose
public primitives for recurring layout; add a thin application adapter for
product state and policy; use custom markup when the semantic contract differs.
Recurring cross-product custom patterns belong in an upstream component or
recipe request, not in duplicated markup or selectors for undocumented anatomy.

The shipped [`component-catalog.json`](../ai/component-catalog.json) is the
canonical machine-readable inventory. Its facts are projected into the UX
catalog deterministically; package checks compare them with runtime exports,
package delivery paths, Web Awesome's installed manifest, AI guidance, and
documentation links. Nuanced prose in this contract and the selection guide
remains authored rather than generated.

### Composition catalog v2

[`component-catalog-v2.json`](../ai/component-catalog-v2.json) adds a formal,
machine-evaluable composition layer without changing the v1 selection and
delivery contract. Every v1 entry projects once, in order, under the stable
qualified key `package:id`. Each v2 entry explicitly covers parents/contexts,
named zones and cardinality, optional explicit JSX prop bindings, child concepts, state ownership, required wiring,
responsive ownership, layout and geometry, accessibility obligations, public
CSS boundaries, diagnostics, and provenance.

An entry's optional `cssValueProps` makes CSS-adjacent prop grammar equally
machine-evaluable. Each path records the property grammar, finite shorthands,
canonical versus exceptional spacing choices, standalone and expression-only
helpers, raw/unsafe policy, and serialization examples. Nested paths use the
bounded `items[].property` form. Consumer catalogs can publish the same facts;
ESLint, `kerf-ui-analyze`, and `kerf-ui-doctor` then issue the same stable
`KUI-L013`–`KUI-L017` feedback for application and third-party components.

The generator starts with permissive defaults. An `any` mode records that the
catalog has no defensible prohibition; it does not claim every composition is
recommended. Objective rules live in
`component-catalog-v2-overrides.json` and may carry stable `KUI-C###`
diagnostics. A tool reports a diagnostic only after proving its exact `when`
condition. Subjective choice, product policy, and visual taste remain prose.

Kerf UI calls component content positions **named `SafeHtml` prop slots**.
Use `children` for one homogeneous primary region; use explicit named
`SafeHtml` props for semantic positions or replacement content such as
`header`, `footer`, `leading`, `trailing`, `icon`, and `action`. These are typed
function-component props, not native web-component `<slot>` elements and not a
generic `slots={{...}}` object. A v2 zone declares `jsx.prop` only when tooling
can soundly bind that zone to one public JSX prop; `children` is spelled
explicitly. Zones without that binding remain guidance and are never guessed
from their ids. Static tools inspect only visible JSX structure and leave
dynamic `SafeHtml` expressions to runtime and accessibility evaluation.

### Native named-slot assignment

Every public visual component with one stable conceptual root accepts an
explicit `slot?: string` prop and forwards it to that root on every render
branch. Use it when a Kerf component is a light-DOM child of a custom element,
for example `StateBanner({ title: 'Ready', slot: 'status' })`. Omitting the prop
omits the attribute.

This contract does not open a generic native-attribute bag: components still
accept only their documented props and narrow extension-attribute objects.
`ResizableRegion` and `CollapsiblePanel` are deliberately excluded because each
can return a region plus a sibling restore control, leaving no single root that
can truthfully own native slot assignment. Their single-root controls and all
alternate-root branches of supported components retain the contract.

V1 consumers continue unchanged. V2 consumers read v1 for selection/delivery
and v2 for composition. `npm run catalog:sync` projects every new component,
recipe, and supported Web Awesome entry, and the completeness gate prevents
silent omissions. Downstream catalogs use the v2 extension schema and types,
retain their own package identity, and qualify cross-catalog references. See
the checked
[`component-catalog-extension-v2.json`](./examples/component-catalog-extension-v2.json)
application-owned example.

### Compile-time contract boundary

The versioned
[`compile-time-contracts-v1.json`](../ai/compile-time-contracts-v1.json)
artifact maps stable `KUI-T###` ids to public imports, emitted symbols, and
catalog identities. Its positive/negative fixture compiles against both source
and a freshly packed package, so source declarations and shipped declarations
cannot silently diverge. See [Compile-time contracts](./type-contracts.md) for
the full audit, migration guidance, and the relationships deliberately left to
runtime/catalog checks because TypeScript cannot prove them.

### Application UI profile

The component catalogs describe what packages provide; an application profile
describes which supported choices a project has approved. A workspace may
check in `.kerf-ui-profile.json` conforming to
[`application-ui-profile.schema.json`](../ai/application-ui-profile.schema.json).
Keep package-qualified catalog locations and recurring-concept preferences,
allowed color schemes and density, public semantic-token overrides,
layout/responsive conventions, and narrow rule exceptions there. Product
records, copy, permissions, user preferences, and transport state do not belong
in this policy file.

Every catalog location names a v2 composition artifact. `selection` is optional
for consumer packages whose generated metadata declares v1 selection guidance
not applicable; `@kerfjs/ui` retains its required v1 selection artifact. This
lets a generated `component-catalog-v2.json` participate directly without a
fabricated compatibility file.

Discovery and precedence are deterministic:

1. Load `application-ui-profile.defaults.json` from `@kerfjs/ui`.
2. Load `.kerf-ui-profile.json` at the workspace root when present.
3. Walk from the workspace root toward the target directory and load each
   directory-local profile in parent-to-child order.

Later scalar and object-map values win. Catalogs merge by package; preferences
and token overrides merge by key; exceptions merge by stable id. Lists such as
allowed themes/densities replace the earlier list rather than accumulating.
Every resolved field retains its source file. The shipped
`application-ui-profile.mjs` API implements discovery, merge, loading, and
validation and reports actionable originating file + JSON-path diagnostics for stale
catalogs, unknown component/rule/token references, preference conflicts, and
broad exceptions. Each raw layer is validated against the catalogs effective at
that exact precedence point before merge, so a broken parent catalog, stale
parent reference, invalid value, or unknown field cannot disappear merely
because a child profile replaces it. The shipped
`application-ui-profile-sync.cjs` projects the same merge and validation contract
for synchronous hosts such as ESLint rules; it deliberately performs no async
I/O.
See the
[`application-ui-profile.json`](./examples/application-ui-profile.json) example.

Catalog detail footers use one standard resource vocabulary and order. Build
them with `catalogResources()` from `@kerfjs/ui/catalog-resources`: `Demo source`
first, optional `Component source` and `Design template`, then `Guidance`.
Third-party entries use the typed `integrationGuidance` kind, which renders
`Integration guidance`, and omit `Component source` when the implementation is
not owned by the catalog's project. Prefer these semantic kinds over local labels
such as “View source” or “Read UI guidance”; the helper makes that convention a
compile-time choice while still returning ordinary `CatalogResource[]` values.

## Ownership boundaries

### Geometry ownership metadata

The canonical [`component-catalog.json`](../ai/component-catalog.json) records
the margin, border, and padding owner for every component and composition under
`geometry`. Read it before adding a wrapper or local spacing rule:

- `self` means the entry's public visual contract supplies that geometry.
- `parent` means the embedding layout must supply it.
- `child` means composed descendants supply it; the entry's outer shell does not.
- `none` means that dimension is intentionally absent from the standard contract.
- `conditional` means a variant, part, or configuration changes ownership; the
  accompanying `notes` explain the boundary.

The values describe public ownership, including themed shadow parts, rather
than merely asking whether a CSS declaration appears on the host element.
Recipes are exempt because they arrange entries whose individual ownership is
already cataloged.

Downstream packages and applications should publish the same contract for their
reusable visual components. Use
[`component-catalog-extension.schema.json`](../ai/component-catalog-extension.schema.json)
and copy the structure of the checked
[`component-catalog-extension.json`](./examples/component-catalog-extension.json)
example. Keep app and Kerf entries as package-qualified inputs, then let people
or AI tools search their combined entries and compare `geometry` before adding
wrappers or insets. Do not add app-owned entries to Kerf's canonical catalog or
claim Kerf delivery paths for them.

- Components own semantic markup, stable anatomy, documented variants, ARIA projection, and package CSS hooks.
- Applications own signals/stores, product copy, domain-state mapping, persistence, routing, permissions, and transport.
- Actions are `data-action` strings. Wire them at a stable root with `delegate()` or `delegateActions()` and retain the disposer.
- A reusable component never owns per-instance mutable module state.
- Consumers configure presentation through component props and documented `--kui-*` semantic tokens. Foundation tokens provide opinionated neutral, brand/info, non-status pop, success, warning, and danger fill/border/foreground roles. Application stylesheets must not select package component classes or descendants. If genuinely new structure needs CSS, encapsulate that structure and its stylesheet in an application-owned component; configure any nested Kerf components through their public APIs.

`ListItem.rootAttributes`, `ListActionRow.rootAttributes`,
`ListHeader.rootAttributes`, `AppTab.rootAttributes`,
`CatalogExample.rootAttributes`, and `CatalogExampleStack.rootAttributes` accept
application-owned `data-*` metadata without
adding product fields to the shared API. A `ListActionRow` trailing action uses
`trailingActionAttributes`, and a `ListHeader` action/disclosure uses
`triggerAttributes`, for `data-*`, native popover target/action attributes, and
the corresponding `aria-controls`/`aria-haspopup` relationship. These slots do
not accept roles or component-owned action, selection, disclosure, accessible
name, disabled, or icon fields. Extension objects are filtered at runtime,
including case-insensitive rejection of protected `data-*` names, and the
component or helper writes its protected attributes after the accepted metadata. Typed,
structurally widened, and JavaScript callers therefore cannot replace its
contract.

`AppTab.closeIcon` and `ResizableRegion.handleIcon` replace dormant decorative
glyph content only. They must not contain controls or interactive roles. The
component continues to own the named close button or focusable separator, and
`wireTabBars()` / `wireResizableRegions()` continue to own transient behavior
and disposal.

`ListItem.trailing`, `ListActionRow.label`, `ListActionRow.icon`, and
`ListActionRow.trailingActionIcon` are dormant SafeHtml slots. They must not
contain controls. When a row needs an independently interactive trailing
region, `ListActionRow` owns the noninteractive root and the two sibling native
buttons; the application owns their delegated behavior and controlled state.
Both row components align a leading icon with the first label line when
`multiline` allows the label to wrap; additional lines extend below that fixed
visual anchor.

### Public CSS anatomy

The `publicClasses` array on each entry in
[`component-catalog.json`](../ai/component-catalog.json) identifies stable
anatomy for diagnostics, tooling, browser assertions, and package-owned
composition. It is not an application customization API. Applications choose
documented props and tokens; package components may compose other components
only through those public contracts, never by styling a child's classes from a
parent stylesheet.

The v2 composition catalog additionally requires `boundaries.rootClass` to be
either one exact member of `publicClasses` or `null` when the entry has no
rendered class root. Runtime geometry tooling uses this explicit field; array
order never implies root ownership.

Do not select a component root or descendant by class, element name, id, or
attribute. Selectors such as `.workspace .kui-toolbar`,
`.kui-state-banner span`, and `.kui-list-item [data-state]` cross the ownership
boundary. If no prop or token expresses a recurring need, add the configuration
to the owning component instead of inferring it from rendered markup.

`Badge` owns the complete visual treatment for compact status, count, category,
and metadata labels. Configure its semantic `tone`, `appearance`, `shape`, and
`size`; do not recreate or override badge anatomy in an application or consuming
component. Use `label` when visible content is abbreviated and `ariaHidden` only
when a surrounding component already includes the same value in its accessible name.

`ListItem` renders its leading icon and nested SVG at a root-scaled 18px by
default while retaining the row's 44px minimum interactive target. Multiline
rows align that 18px visual with the first inherited text line. The row clips
descendant painting to its rounded root so labels, status, and dormant trailing
content cannot escape its visible boundary. Rows with descriptions grow enough
to keep their owned two-line label stack readable; use `multiline` when the
primary label should wrap rather than truncate.

`DisclosureArrow` uses an 18px root-scaled visual by default. Override
`--kui-disclosure-arrow-size` on the component or its containing scope when a
consumer needs another size. Kerf `Select` uses a separate Web Awesome expand
glyph contract, `--kui-disclosure-icon-scale: .5`; changing one contract does
not implicitly change the other. Direction changes take the shortest rotation
path; a 180-degree closed-to-open tie uses counterclockwise rotation.

In `ListHeader` toggle mode, omitting `actionIcon` composes the production
`DisclosureArrow` and derives its visual direction from `expanded`. The app
must update that controlled state and reveal or hide real content. Passing a
custom `actionIcon` replaces the default rather than layering or rotating both.
The root fills the available inline width after its standard margins by
default. Set `inline` when it must shrink-wrap beside surrounding content; that
presentation removes the root margin, border, and padding while retaining the
title and optional action's own control geometry. A separate action stays at
the logical end while the visible glyph defaults to 18px through
`--kui-list-header-action-icon-size`.

`StateBanner` exposes instance-level `--kui-state-banner-background`,
`--kui-state-banner-border`, `--kui-state-banner-foreground`,
`--kui-state-banner-detail` and action background variables. Its optional
badge composes `Badge` beside the title and follows the banner tone by default. Its five built-in
tones can be rethemed globally with
`--kui-state-banner-{tone}-{background|border|foreground}`. Toolbar control,
segmented-control, app-tab, and tab-bar colors likewise use their public
`--kui-*-*` variables. `SegmentedControl` exposes surface, border, foreground,
hover, and selected-state variables, so rounded, pill, and toolbar presentations
remain opinionated but locally overridable.

Inset hover and selection surfaces follow the outer control shape instead of
choosing an independent radius. `--kui-layout-highlight-inset` is the full
distance between those edges; the inner radius is the outer radius minus that
inset. `ToolbarControlGroup` publishes its derived radius to nested toolbar
`SegmentedControl` choices, keeping both direct buttons and exclusive-choice
highlights concentric when the group switches between pill and rounded shapes.

`ResizableRegion` owns the Hot Sheet 2 split treatment: a persistent 1px
separator with a compact grip that appears on hover or keyboard focus. Override
`--kui-resizable-region-separator-color`,
`--kui-resizable-region-handle-color`, or
`--kui-resizable-region-handle-active-color` on a region when its containing
surface needs a different contrast level.

`Pane` defines one structural model for sidebars, main areas, inspectors, and
dialogs. Its `.kui-pane` root is unpadded and contains an optional vertical
header, one scrolling vertical `.kui-pane__content`, and an optional footer.
Logical-edge separator lines are independently opt-in and default off.
`@kerfjs/ui/layout.css` retains the pane roles and supplies the related content
geometry classes.
`List` is the corresponding layout-only vertical stack: its children stretch by
default, while `gap`, `flex`, and `scrollable` opt into typed spacing,
flex growth, and vertical scroll ownership. `Row.flex` uses the same typed flex
participation contract on the horizontal counterpart. `dividerSides` accepts canonical
physical top/right/bottom/left combinations such as `tr` and `trbl`; the stack
adds no list semantics, margin, or padding of its own. Use a direct finite
spacing shorthand such as `gap="2xs"`, or pass a `CssLength` created by the
CSS-free `@kerfjs/ui/css-values` helpers: `space('m')`, `rem(0.25)`,
`lengthVar('--app-gap')`, or `calc(plus(rem(0.25), pct(10)))`. `plus` returns a
non-standalone `CssLengthExpression`; only `calc` turns it into a complete
length. Raw CSS strings and source-only `remify(4px)` are not valid runtime
props. The `CssLength` name intentionally includes percentages for UI dimension
props. Its opaque string brand improves authoring correctness; it is not a CSS
sanitizer or security boundary.
`Row.flex` and `List.flex` likewise accept their boolean default, finite keywords, or `CssFlex`
from `flex(grow, shrink, basis)`. `Skeleton` width/height use `CssSize`, radius
uses `CssLength`, and `SelectChoice.color` uses `CssColor` from `uiColor()` or
`colorVar()`. Never exchange these property grammars. List rows expose
`className`, public tokens, and semantic props instead of unrestricted `style`
declarations.
`.kui-content` gives major children 24px vertical separation.
`.kui-content-item` gives one child 8px inline margin, a real 1px border,
8px padding, and 12px corners; border and background may be transparent without
changing geometry. `.kui-content-item--pill` selects the 22px radius.

`ToolbarControlGroup` is the unit of toolbar organization, even for dormant
text. Each group reserves `calc(2px + remify(42px))`, or 44px, with 8px between
groups and inside items. For an ordinary icon/action control inside a group, use
a plain `<button>` — the group styles `> button` fully, and it keeps the group
free of a Web Awesome dependency and shadow DOM. Use `ToolbarActionLink` when
the action must retain native anchor navigation; the group owns its geometry,
hover, and focus treatment. Set `overflow="scroll"` when a row of controls must
stay inside the available toolbar width. Set `visibility="compact-only"` for a
group that replaces wider toolbar controls below the Toolbar's compact container
breakpoint; do not hide the group with an application class. Reach for
`wa-button` only when you need
a Web Awesome feature, chiefly the `slot="trigger"` button of a `wa-dropdown`
popup menu. For a compact mixed-content group, set `nestedDropdown`; a
text-and-caret trigger grows to its intrinsic width while an icon-only trigger
can remain square. Set `menuInset` to configure the dropdown menu surface
without application `::part(menu)` CSS. Compact mixed controls retain the standard
item padding, omit an internal separator, and let the raised selected item paint
over the outer border instead of shrinking to an inset highlight. The Web
Awesome trigger's shadow base owns max-content sizing, so icons, localized text,
and the shadow caret determine the width without a fixed host measurement.
The enclosing `Toolbar` owns zone alignment and responsive topology: use
`centerAlign="stretch"` when the center group should consume its track, and
choose `responsive="stack"` with `responsiveAt="compact" | "narrow"` or
`responsive="center-priority"` instead of selecting its zone classes from a
parent stylesheet.
`ListHeader` similarly separates its dormant title and
optional count or badge from its optional 44px action. Use the mutually
exclusive `count`/`countLabel` pair for non-negative safe-integer section
quantities; reserve `badge` for non-count `SafeHtml`. Do not concatenate counts
into the section label. Set `width="content"` to shrink-wrap while retaining
normal header geometry; `inline` is the separate zero-outer-geometry mode. Do
not add padding to pane shells,
double child-owned geometry with wrapper insets, or create competing scroll
owners. The [layout contract](./layout.md) lists the public roles and tokens.

Panel, dialog, and page headings are direct `Toolbar` compositions. The leading
zone holds an optional icon `ToolbarControlGroup` and a direct extra-large
`ToolbarText`; app actions belong in a trailing `ToolbarControlGroup`. Omit the
icon group when it has no content. Supporting copy is app-owned content below
the toolbar so it cannot pull the icon or actions out of alignment.

`ValueTable` composes typed `ValueTableRow` entries. A row owns its `dt`/`dd`
semantics and may receive a leading `SafeHtml` icon. Every row keeps 8px of
root-scaled padding above and below its content; the shared item-padding token
continues to own its inline inset. Separators follow the content they introduce:
8px from either edge for an iconless row, or 40px from the left edge (8px
padding + 24px icon + 8px gap) and 8px from the right edge for an icon-bearing
row. Applications own the values, formatting, and whether an icon is decorative
or meaningfully labeled.

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
when called and return disposers. `wireTokenSearchFields` goes one step further:
by default it also owns the collapsible field's transient expand/collapse/focus
(activate to reveal and focus, Escape or empty blur to collapse), holding that
state in a signal it exposes on the returned handle. An app reads that signal in
render, hands in its own via `collapsible.signals`, drives it through
`handle.open`/`handle.close`, or disables any individual behavior — so transient
UI is consistent by default without every app reinventing it.

A public subpath that exposes several visual components is a folder-backed
surface. Put each component in its own source file and give each visual
component exactly one owned stylesheet alongside it. Keep the public
compatibility entrypoints implementation-free: the JavaScript/TypeScript
entrypoint only re-exports the folder modules, and the CSS entrypoint only
imports their owner stylesheets. A shared public name is not permission to put
several component implementations or visual contracts back into one file.

`wireTokenSearchFields` is a deliberate exception, not the rule for `wire…`
helpers. Its collapse behavior was _rich and error-prone_ — reveal, focus
transfer, Escape, empty-blur collapse, focus return — the kind of transient chrome
apps kept reimplementing inconsistently, so the helper owns it. Everywhere else the
app's state is **domain or persisted, not transient chrome, and stays app-owned**: a
`NavStack`'s view stack is navigation history, a `TabBar`/`TabScaffold`'s selection
and tab order are data, a `ResizableRegion`'s committed size and a
`Workbench`/`SplitView` rail's `collapsed` flag are persisted layout preferences.
Each helper already owns only the _ephemeral mechanics_ around that state —
`wireNavStack` the push/pop animation, `wireTabBars` the overflow autoscroll and
drag preview, `wireResizableRegions` the live drag preview — and reports committed
changes through callbacks. A `ListHeader` `toggle` disclosure's `expanded` is
likewise app-owned: it is a one-line boolean the app already tracks and must read to
render the section body, so a managed helper would remove no real complexity. Reach
for a managed default only when the transient behavior is substantial enough that
hand-rolling it produces genuine, inconsistent variation.

TabBar itself owns the inline geometry around those mechanics. Its tab list is
the only shrinking, horizontally scrolling region; `leading`, `trailing`, and
`end` action regions remain fixed. Set `trailingPlacement="adjacent"` when the
trailing action belongs immediately after the final tab and use `end` for a
separate action pinned to the far edge. Applications own the action content,
but must not restyle TabBar descendants to recreate that allocation.

CSS, the generated wrappers that make it
reachable, and the registration module are the package's only declared side
effects.

A value-bearing component's `placeholder` prop is a first-class loading mode: the
component renders its own real chrome (labels, icon and action affordances,
container geometry) while replacing each **value** slot with a subtle, deliberately
unanimated `Skeleton` block and disabling its own interactive controls
(`aria-busy`, dropped `data-action`, disabled buttons). Sizes and shapes stay
identical to the populated component, so a parent composes a faithful loading view —
an inspector, a detail pane — from placeholder children without hand-rebuilding
markup. The application still owns the loading lifecycle (when to pass `placeholder`)
and which slots are unknown; the standalone `Skeleton` covers custom slots. It is a
placeholder, not progress: use `LoadingSpinner` for known busy activity, and never
animate the skeleton.

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

Each behavior has focused unit coverage and a real-browser flow through the production-backed catalog. Consumer bundle tests enforce subpath CSS reachability, transitive component styles, root/SSR isolation, optional registration boundaries, and the CSS-only Web Awesome theme boundary. `npm run check:css-ownership` rejects application selectors into Kerf or Web Awesome components, a non-minimal catalog compatibility stylesheet, or a return of the shared recipe stylesheet. Visual evidence supplements—never replaces—keyboard, focus, state, and event assertions.

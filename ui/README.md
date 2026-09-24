# @kerfjs/ui

Accessible, composable UI primitives for [kerf](https://github.com/brianwestphal/kerf). The package ships production components, component-reachable CSS, accessibility and keyboard contracts, an AI-readable guide, and a production-backed UX catalog.

Start interface work with the [need-first component selection matrix](./docs/component-selection.md). It distinguishes direct reuse, composition, thin application adapters, and genuinely custom semantics, with imports, required wiring, application ownership, alternatives, and recipes for every public primitive.

When adding a first-party public component, follow the
[component integration workflow](./docs/component-integration.md). The catalog
entry drives one validator across package, build, barrel, CSS, demo, route, and
AI signature projections, with a non-mutating dry-run report.

Browser verification always builds current source: both `npm run test:e2e`
and direct focused Playwright commands run the catalog/conformance preflights
and production build before preview. See the [UX catalog contract](./docs/ux-demo.md).

When authoring a component gallery, follow the single
[Catalog demo authoring contract](./docs/catalog.md#catalog-demo-authoring-contract)
for focused-versus-composition modes, helper nesting, specimen selection,
geometry inspection, and metadata ownership. AI tools can discover that
contract and its public imports through the shipped
[`catalog-authoring.json`](./ai/catalog-authoring.json) artifact.

For connective application patterns, use the seven [production composition
recipes](./docs/recipes.md). Each has a stable catalog route, runnable state,
public-subpath source, semantic layout ownership, and explicit application
customization boundaries. The composer recipe demonstrates one coherent form
surface with a `Toolbar`/`ToolbarText` heading and field/action controls aligned to the
shared 8px gutter; only persistent feedback adds a nested semantic
`StateBanner` surface.

When no primitive matches, keep policy application-owned while reusing the
layout vocabulary. The typed
[`command-palette-adapter.tsx`](./docs/examples/command-palette-adapter.tsx)
shows that application boundary explicitly; it is reference source, not a package
runtime export.

```bash
npm install kerfjs @kerfjs/ui
```

```tsx
import { ListItem } from "@kerfjs/ui/list-item";
import { ListHeader } from "@kerfjs/ui/list-header";
import { ListActionRow } from "@kerfjs/ui/list-action-row";
import { Toolbar } from "@kerfjs/ui/toolbar";
import { ToolbarControlGroup } from "@kerfjs/ui/toolbar-control-group";
import { ToolbarText } from "@kerfjs/ui/toolbar-text";

mount(root, () => (
  <>
    <Toolbar
      label="Document"
      leading={<ToolbarText text="Notes" />}
    />
    <section>
      <ListHeader
        label="Workspace"
        action="show-workspace-actions"
        actionLabel="Workspace actions"
        rootAttributes={{ "data-section-id": "workspace" }}
        triggerAttributes={{
          popoverTarget: "workspace-actions",
          popoverTargetAction: "toggle",
          "aria-controls": "workspace-actions",
          "aria-haspopup": "dialog",
        }}
      />
      <ListItem
        action="open-notes"
        label="Notes"
        selected
        rootAttributes={{
          "data-command-color": "blue",
          "data-drop-status": "ready",
        }}
      />
      <ListActionRow
        action="open-file"
        itemId="src/main.ts"
        label="src/main.ts"
        trailingAction="open-file-actions"
        trailingActionLabel="Actions for src/main.ts"
        trailingActionIcon={moreIcon}
      />
      <div id="workspace-actions" popover="auto">
        Application-owned actions
      </div>
    </section>
  </>
));
```

Components return Kerf `SafeHtml`. They do not own application state or attach transient listeners. Actions are stable `data-action` hooks; the application wires them once with `delegate()` or `delegateActions()` and retains the disposer.

Component content positions use one convention: `children` is the homogeneous
primary region, while semantic positions and replacement content use explicit
named `SafeHtml` props such as `header`, `footer`, `leading`, `trailing`,
`icon`, and `action`. These named `SafeHtml` prop slots are ordinary typed
function-component props—not native `<slot>` elements, wrapper slot
components, or a generic `slots` object. The v2 composition catalog publishes
sound prop bindings as `zone.jsx.prop`, allowing ESLint to validate statically
visible content and cardinality without guessing from zone names.

`ListItem.rootAttributes`, `ListHeader.rootAttributes`,
`ListActionRow.rootAttributes`, `AppTab.rootAttributes`,
`CatalogExample.rootAttributes`, and `CatalogExampleStack.rootAttributes` carry typed
application `data-*` metadata without
teaching the package domain fields. `ListHeader.triggerAttributes` and
`ListActionRow.trailingActionAttributes` additionally support native popover
target and relationship attributes. Roles and component-owned action, selection,
disclosure, naming, disabled, icon, and catalog-structure semantics remain protected props; an
isolated `role="menuitem"` is not an extension shortcut.
The slots are also filtered at runtime, so structurally widened objects and
JavaScript callers cannot bypass those protections with case-variant names.
`ListItem.trailing` is dormant metadata. Use `ListActionRow` when a row needs
sibling primary and trailing native-button actions with independent names,
disabled states, focus, and click ownership. Its `label`, `icon`, and
`trailingActionIcon` slots are dormant content and must not contain controls.
In either component's multiline mode, the leading icon remains aligned with
the first text line as the label wraps below it.
For section quantities, pass a non-negative safe-integer `count` together with
the localized full spoken phrase in `countLabel`, for example
`count={3} countLabel="3 notes"`. This renders the standard neutral count pill
and includes the count in the heading or disclosure button's accessible name.
Do not concatenate a count into `label` or pass a numeric `badge`; the mutually
exclusive legacy `badge` slot remains available for non-count `SafeHtml` such
as a `New` marker.

`Row.gap` and `List.gap` accept a direct spacing name such as
`gap="xs"` or `gap="m"`, or a branded `CssLength`. Import `space`, `rem`, `em`,
`px`, `pct`, `lengthVar`, `plus`, and `calc` from the CSS-free
`@kerfjs/ui/css-values` subpath when a named step is not enough. `plus` returns
an incomplete expression, so wrap it with `calc` before passing it to a prop.
Raw CSS strings are deliberately rejected; the opaque brands catch authoring
mistakes but are not sanitizers.

Use `Row` for horizontal flex composition and `List` for vertical composition.
Both accept `hAlign` (`left`, `center`, `right`, `full`) and `vAlign` (`top`,
`middle`, `bottom`, `full`), plus their documented short/CSS aliases. `Row`
defaults to left/full alignment, the `xs` gap, and `wrap={false}`; List keeps
its existing full/top alignment and zero-gap defaults.

The same property-specific boundary applies beyond spacing: use `flex()` (or a
finite keyword) for `Row.flex` and `List.flex`; length builders and intrinsic-size keywords for
`Skeleton.width`/`height`; length builders for `Skeleton.radius`; and
`uiColor()` or `colorVar()` for `SelectChoice.color`. These grammars are not
interchangeable. `ListItem` and `ListActionRow` deliberately expose no raw
`style` declarations; use `className`, public tokens, and component props.

## Component subpaths

| Component                                                           | Browser import (includes reachable CSS) | Manual CSS export                      |
| ------------------------------------------------------------------- | --------------------------------------- | -------------------------------------- |
| `LucideIcon`                                                        | `@kerfjs/ui/lucide-icon`                | `@kerfjs/ui/lucide-icon.css`           |
| `DisclosureArrow`                                                   | `@kerfjs/ui/disclosure-arrow`           | `@kerfjs/ui/disclosure-arrow.css`      |
| `Toolbar`                                                           | `@kerfjs/ui/toolbar`                    | `@kerfjs/ui/toolbar.css`               |
| `ToolbarControlGroup`                                               | `@kerfjs/ui/toolbar-control-group`      | `@kerfjs/ui/toolbar-control-group.css` |
| `DialogSurface`, `PopupSurface`                                     | `@kerfjs/ui/surface-scaffold`           | `@kerfjs/ui/surface-scaffold.css`      |
| `FloatingToolbar`                                                   | `@kerfjs/ui/floating-toolbar`           | `@kerfjs/ui/floating-toolbar.css`      |
| `ToolbarText`                                                       | `@kerfjs/ui/toolbar-text`               | `@kerfjs/ui/toolbar-text.css`          |
| `List`                                                              | `@kerfjs/ui/list`                       | `@kerfjs/ui/list.css`                  |
| `Row`                                                               | `@kerfjs/ui/row`                        | `@kerfjs/ui/row.css`                   |
| Typed CSS dimension builders                                        | `@kerfjs/ui/css-values`                 | —                                      |
| `ListActionRow`                                                     | `@kerfjs/ui/list-action-row`            | `@kerfjs/ui/list-action-row.css`       |
| `ListItem`                                                          | `@kerfjs/ui/list-item`                  | `@kerfjs/ui/list-item.css`             |
| `ListHeader`                                                        | `@kerfjs/ui/list-header`                | `@kerfjs/ui/list-header.css`           |
| `ListInsetControl`                                                  | `@kerfjs/ui/list-inset-control`         | `@kerfjs/ui/list-inset-control.css`    |
| `ListInsetText`                                                     | `@kerfjs/ui/list-inset-text`            | `@kerfjs/ui/list-inset-text.css`       |
| `Pane`                                                              | `@kerfjs/ui/pane`                       | `@kerfjs/ui/pane.css`                  |
| `NavStack`                                                          | `@kerfjs/ui/nav-stack`                  | `@kerfjs/ui/nav-stack.css`             |
| `wireNavStack`                                                      | `@kerfjs/ui/wire-nav-stack`             | —                                      |
| `SplitView`                                                         | `@kerfjs/ui/split-view`                 | `@kerfjs/ui/split-view.css`            |
| `TabScaffold`                                                       | `@kerfjs/ui/tab-scaffold`               | `@kerfjs/ui/tab-scaffold.css`          |
| `wireTabScaffold`                                                   | `@kerfjs/ui/wire-tab-scaffold`          | —                                      |
| `Workbench`                                                         | `@kerfjs/ui/workbench`                  | `@kerfjs/ui/workbench.css`             |
| `CollapsiblePanel`, `CollapsiblePanelToggle`                        | `@kerfjs/ui/collapsible-panel`          | `@kerfjs/ui/collapsible-panel.css`     |
| `wireSidebar`                                                       | `@kerfjs/ui/wire-sidebar`               | —                                      |
| Content and navigation composition                                  | —                                       | `@kerfjs/ui/layout.css`                |
| `ResizableRegion`                                                   | `@kerfjs/ui/resizable-region`           | `@kerfjs/ui/resizable-region.css`      |
| `wireResizableRegions`                                              | `@kerfjs/ui/wire-resizable-regions`     | —                                      |
| `AppTab`                                                            | `@kerfjs/ui/app-tab`                    | `@kerfjs/ui/app-tab.css`               |
| `TabBar`                                                            | `@kerfjs/ui/tab-bar`                    | `@kerfjs/ui/tab-bar.css`               |
| `wireTabBars`, `reorderTabs`                                        | `@kerfjs/ui/wire-tab-bars`              | —                                      |
| `LoadingSpinner`                                                    | `@kerfjs/ui/loading-spinner`            | `@kerfjs/ui/loading-spinner.css`       |
| `Skeleton`                                                          | `@kerfjs/ui/skeleton`                   | `@kerfjs/ui/skeleton.css`              |
| `SunkenPanel`                                                       | `@kerfjs/ui/sunken-panel`               | `@kerfjs/ui/sunken-panel.css`          |
| `Select`                                                            | `@kerfjs/ui/select`                     | `@kerfjs/ui/select.css`                |
| `SegmentedControl`                                                  | `@kerfjs/ui/segmented-control`          | `@kerfjs/ui/segmented-control.css`     |
| `TokenSearchField`, `readTokenSearchField`, `placeTokenSearchCaret` | `@kerfjs/ui/token-search-field`         | `@kerfjs/ui/token-search-field.css`    |
| `wireTokenSearchFields`                                             | `@kerfjs/ui/wire-token-search-fields`   | —                                      |
| `StateBanner`                                                       | `@kerfjs/ui/state-banner`               | `@kerfjs/ui/state-banner.css`          |
| `EmptyState`                                                        | `@kerfjs/ui/empty-state`                | `@kerfjs/ui/empty-state.css`           |
| `ValueTable`, `ValueTableRow`                                       | `@kerfjs/ui/value-table`                | `@kerfjs/ui/value-table.css`           |

Opt-in application layouts keep JavaScript and CSS explicit. Import each
layout from its component subpath, load the matching manual CSS export, and
add its wire subpath when the layout has interactive behavior. The catalog
entries for `nav-stack`, `split-view`, `tab-scaffold`, `workbench`, and
`collapsible-panel` document their selection rules, ownership boundaries,
public classes, tokens, and focused demos. See
[`docs/app-layouts.md`](./docs/app-layouts.md) for the layout decision matrix.

Compose panel, dialog, and page headings directly with `Toolbar`: put an optional
icon in a `ToolbarControlGroup`, use a direct extra-large `ToolbarText` for the
title, and put actions in the trailing zone inside their own control group. Set
`headingLevel` for page or section headings. Supporting copy is app-owned content
below the toolbar and should be connected to its host with `aria-describedby`
when it adds useful context.

`DisclosureArrow` defaults to an 18px root-scaled decorative visual. Override
`--kui-disclosure-arrow-size` at the narrowest useful scope when a consumer
needs another size; the owning control still supplies interaction, naming, and
expanded state. Kerf `Select` retains its independent Web Awesome expand-glyph
scale of `.5` through `--kui-disclosure-icon-scale`. Author replacement
`DisclosureArrow` icon content facing right before its configured direction
transform is applied. Direction changes take the shortest rotation path; a
180-degree closed-to-open tie uses counterclockwise rotation.

`ListHeader` supplies that production `DisclosureArrow` automatically when
`toggle` is true and `actionIcon` is omitted. Keep `expanded` synchronized with
real controlled content and preserve the button's stable label; ordinary
navigation must not display a disclosure arrow. A custom `actionIcon` remains
an escape hatch and replaces the default arrow entirely. The header fills its
available inline width by default; set `inline` to shrink-wrap it beside other
content and remove its root margin, border, and padding. It keeps a separate
action at the logical end. Its visible action glyph defaults to 18px through
`--kui-list-header-action-icon-size`.

## Machine-readable catalog

AI tools can retrieve the shipped [`ai/component-catalog.json`](./ai/component-catalog.json)
for the exhaustive component and composition inventory. It is the canonical
source for ids, public exports, purpose and selection guidance, relationships,
delivery and side effects, companion wiring, application-owned policy,
variants, accessibility obligations, public CSS hooks, routes, and current
documentation/recipe links. The adjacent
[`component-catalog.schema.json`](./ai/component-catalog.schema.json) describes
the versioned format. Every visual entry also declares who owns its margin,
border, and padding, so a generator can fit it into Kerf's alignment model
without guessing from a screenshot or private CSS.

Catalog demo authoring is deliberately separate from the entry inventory. Load
[`catalog-authoring.json`](./ai/catalog-authoring.json) to discover the
authoritative [Catalog demo authoring contract](./docs/catalog.md#catalog-demo-authoring-contract),
the exact API-signature context, public imports/helpers, and sanctioned metadata
slot. Keeping this as a companion artifact prevents per-entry selection facts
from duplicating presentation rules.

Tools that evaluate composition may additionally load
[`component-catalog-v2.json`](./ai/component-catalog-v2.json). It is a
deterministic, package-qualified projection of every v1 entry with formal
parent/context, zone/cardinality, child, state ownership, wiring, responsive,
layout, accessibility, public-boundary, and stable-diagnostic fields. V1
remains the selection and delivery compatibility surface. V2 defaults are
deliberately permissive; only documented objective rules receive an
authoritative override and enforceable diagnostic. The adjacent schema and
[`component-catalog-v2.d.ts`](./ai/component-catalog-v2.d.ts) types describe
the same contract.

Applications and downstream design systems should publish the same facts for
their own components. Start from the reusable
[`component-catalog-extension.schema.json`](./ai/component-catalog-extension.schema.json)
and the checked
[`component-catalog-extension.json`](./docs/examples/component-catalog-extension.json)
example. Give each app-owned component or composition a stable id, selection
guidance, public hooks, and explicit geometry ownership; then concatenate its
`entries` with Kerf's shipped `entries` in the AI context. Keep package/source
identity alongside each input when ids could collide. This makes a combined
tool reason about both sides of a composition using one vocabulary without
pretending app-local components are `@kerfjs/ui` exports.

Composition-aware consumers use
[`component-catalog-extension-v2.schema.json`](./ai/component-catalog-extension-v2.schema.json),
its shipped TypeScript types, and the checked
[`component-catalog-extension-v2.json`](./docs/examples/component-catalog-extension-v2.json)
example. Preserve each catalog's package and qualify every identity and
cross-catalog reference as `package:id`; never merge entries by bare id.

[`compile-time-contracts-v1.json`](./ai/compile-time-contracts-v1.json) is the
matching declaration contract: stable `KUI-T###` ids identify the invalid prop,
state, identity, accessibility, and protected-attribute combinations TypeScript
rejects. The package gate compiles one positive/negative consumer fixture against
both source and declarations extracted from the real packed tarball. The
[compile-time contract guide](./docs/type-contracts.md) documents migrations and
the dynamic DOM/children relationships that remain runtime or catalog checks.
Packages scaffolded by `create-kerf-component` maintain this v2 input from
`kerf.components.json`: `npm run catalog:generate` emits the catalog and
`npm run catalog:check` verifies source files, named public exports, explicit
author decisions, and byte-for-byte drift. Tools index the generated consumer
entries and this catalog by full key, reject duplicate full keys, search the
consumer package first, and retain package identity across every reference.
They must not infer missing semantics or geometry from rendered appearance.

### Application UI profile

Applications can check in `.kerf-ui-profile.json` so tools do not have to infer
project-wide UI policy. Start from the shipped
[`application-ui-profile.defaults.json`](./ai/application-ui-profile.defaults.json)
and the checked
[`application-ui-profile.json`](./docs/examples/application-ui-profile.json)
workspace example. The versioned
[`application-ui-profile.schema.json`](./ai/application-ui-profile.schema.json)
and [`application-ui-profile.d.ts`](./ai/application-ui-profile.d.ts) cover
catalog locations, concept preferences, allowed theme/density choices, semantic
token overrides, layout/responsive conventions, and narrow rule exceptions.
Profiles contain policy only—never product records, user data, or broad styling
waivers.

Catalog declarations always provide a v2 `composition` location. Consumer
packages generated with composition-only metadata omit `selection`;
`@kerfjs/ui` continues to require its v1 selection catalog.

Node-based AI and static-analysis tools may import the shipped discovery API
from `@kerfjs/ui/ai/application-ui-profile.mjs`. It discovers package defaults,
then the workspace profile, then directory profiles from parent to child;
`mergeApplicationUiProfiles()` applies later scalar/map values, replaces a
catalog by package and an exception by id, and preserves source provenance.
`loadApplicationUiProfile()` resolves catalogs and returns diagnostics with the
originating file plus JSON path. Unknown/stale components, tokens, rules, and
catalog locations are errors. Every layer is checked against its then-effective
catalogs, including parent references and catalog paths later overridden by a
child profile. Synchronous integrations can require the shipped
`application-ui-profile-sync.cjs` projection and call
`loadApplicationUiProfileSync()` with already-discovered layers. Consumers that define additional stable
diagnostics pass their ids through the additive `knownRules` option; those ids
are merged with catalog diagnostics before exception validation.

### Static CSS and layout ownership analysis

Run `kerf-ui-analyze --root . src` (or import
`@kerfjs/ui/analyzer`) to evaluate cross-file integration facts against the
composition catalogs and application profile. It catches provable private
selector reach-through, unknown tokens, competing geometry owners, nested
scroll owners, and cataloged CSS-value violations in JavaScript/TypeScript
component calls and JSX. It reports forced dimensions, repeated insets,
exceptional spacing shorthands, and dynamic classes separately as review
findings. Text, versioned JSON,
and SARIF outputs carry stable `KUI-L###` ids, repository-relative locations,
evidence, and ownership chains. See the [analyzer guide](./docs/ui-analyzer.md).

### Browser-backed integration evaluation

Run `kerf-ui-evaluate --url <running-app>` (or import
`@kerfjs/ui/evaluator`) after the static analyzer. Its Playwright-backed
wide/intermediate/narrow/200%-zoom, light/dark, and reduced-motion matrix checks
rendered overflow, clipping, reachability, focus/keyboard behavior, accessible
names, contrast, hit targets, scrolling, alignment, and cataloged runtime
geometry. The versioned report carries stable `KUI-B###` diagnostics, focused
DOM/computed-style evidence, hashed screenshot artifacts, explicit timeout and
retention policy, and a separate unscored human-visual rubric. See the
[browser evaluator guide](./docs/ui-evaluator.md).

### Unified repair-loop doctor

Use `kerf-ui-doctor` for the supported application repair loop across profile/catalog validation, TypeScript, the Kerf UI ESLint preset, static layout analysis, and an optional explicitly authorized browser evaluation. Its isolated Kerf lint pass preserves each file's applicable core-rule and suppression settings without executing consumer plugin rules. It emits one portable versioned JSON report with deterministic exit codes, exact suppressions, monorepo package selection, changed/full modes, caching, and local-path redaction. See the [UI doctor guide](./docs/ui-doctor.md).

For code generation, pair catalog selection guidance with the checked-in
[`public-api-signatures-v1.md`](./ai/public-api-signatures-v1.md) declaration
snapshot. It is generated from the emitted `@kerfjs/ui` declarations and the
installed `kerfjs/actions` declaration, so callback names, props, return values,
and accepted import paths do not have to be inferred from examples. Direct
Web Awesome JSX has its own generated
[`webawesome-jsx-signatures-v1.md`](./ai/webawesome-jsx-signatures-v1.md)
context so adding the declaration boundary does not mutate a frozen measured
regression suite.

`npm run catalog:sync` deterministically projects the fields used by the UX
catalog into `ux-demo/catalog.generated.ts`, including the existing guidance
path and the first-party source path for each main, recipe, or Web Awesome
specimen. First-party component entries also derive their implementation path
from the canonical browser import. Do not edit that generated file.
`npm run check:catalog` rejects stale generated output, exports and package
paths, Web Awesome manifest/declaration drift, invalid relationships, broken
links, or a missing AI-guidance entry. Prose remains authored where design
nuance matters.

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
`@kerfjs/ui/foundation.css` and component CSS paths remain available for fully
manual delivery. Its complete supported `--kui-*` token surface is cataloged
under the `foundation` entry. Load application overrides after package styles,
or scope variables directly on a component instance.

## Pane and content geometry

Import `@kerfjs/ui/layout.css` and use the same structural vocabulary for a
sidebar, main area, inspector, or dialog. `.kui-pane` is unpadded and contains
an optional toolbar, one scrolling `.kui-pane__content`, and an optional footer.
Add `.kui-content` to make its major children a vertical stack with 24px gaps.

```tsx
<aside class="kui-pane">
  <div class="kui-pane__toolbar"><Toolbar label="Workspace" ... /></div>
  <nav class="kui-pane__content kui-content">
    <section>
      <ListHeader label="Workspace" count={3} countLabel="3 workspaces" />
      <ListItem action="open" label="Inbox" icon={inboxIcon} />
      <ListItem action="open" label="Drafts" />
    </section>
    <div class="kui-content-item">Workspace details</div>
  </nav>
</aside>
```

Ordinary children use `.kui-content-item`: 8px inline margin, a real 1px border
(transparent by default), 8px padding, and 12px rounded corners. The pill
modifier uses a 22px radius. A component can expose a transparent border or
background without changing layout. `ListHeader` follows the same rule while
keeping its dormant title and count-or-badge cluster separate from its optional
44px action.

## Spacing and application layout

Use 24px only for major vertical separation; use 8px inside content items and
between toolbar groups. Toolbar groups are 44px outside (`2px + 42px`) and keep
that geometry when their border/background are transparent. Wrap text and other
dormant toolbar content in a `ToolbarControlGroup` too. Do not pad the pane
itself, add competing wrapper insets, or give it more than one scroll owner.
Reading width and responsive pane placement remain application decisions. See
the complete [layout contract](./docs/layout.md).

## Web Awesome theme

Apps using Web Awesome's free components can opt into the same visual universe
with one CSS import:

```ts
import type {} from "@kerfjs/ui/webawesome";
import "@kerfjs/ui/webawesome.css";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/input/input.js";
```

The type-only `@kerfjs/ui/webawesome` import adds Kerf JSX intrinsic-element
declarations for the same 70 elements tracked by the catalog. It emits no
runtime code and registers nothing; keep importing only the individual Web
Awesome modules the application renders.

`webawesome.css` includes Web Awesome's native/base theme and then applies the
Hot Sheet 2 palette, surfaces, status colors, focus treatment, form geometry,
radii, tooltips, and shadows through Web Awesome's public `--wa-*` contract.
On `wa-dialog`, the optional `hide-actions` class hides the exported
`header-actions` shadow part for compositions that provide another dismissal
affordance.
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
  --wa-form-control-border-radius: 0.5rem;
}
```

`foundation.css` follows Hot Sheet 2's Web Awesome-compatible semantic palette.
Brand, pop, neutral, success, warning, and danger each expose fill, border, and
foreground roles through `--kui-color-*`. Pop is attractive, non-status emphasis
for featured, novel, or celebratory content; it never substitutes for success,
warning, or danger. Stateful components also expose
component variables such as `--kui-state-banner-background`. Override the
foundation for an application theme, a tone variable for one semantic state, or
a component variable on one instance without replacing component selectors.
Prefer an equivalent prop or token. When composition-specific layout still
needs a selector, the component catalog's `publicClasses` arrays define the
exact stable anatomy: public-class-to-public-class selectors are supported;
descendant tag, id, attribute-only, and unlisted-class selectors are not.

`StateBanner` has opinionated `neutral`, `info`, `pop`, `success`, `warning`,
and `danger` palettes. Override an individual banner with
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
    { value: "list", label: "List" },
    { value: "columns", label: "Columns" },
  ]}
/>
```

Each choice remains a native button in sequential Tab order and exposes its
value through `data-segment-value`. Override an instance through
`--kui-segmented-{background|border|foreground|hover-background}` and
`--kui-segmented-selected-{background|foreground|border|shadow}`.

`TokenSearchField` is a token-controlled contenteditable searchbox that keeps
free text and ordered filter chips in one field. Its editable text stays
DOM-owned between token changes so typing does not replace the caret. Tokens
expose stable edit/remove actions and remain atomic during editing; the app owns
parsing, suggestions, query execution, and state. Use `readTokenSearchField()`
after browser input to recover text plus token offsets, and
`placeTokenSearchCaret()` when restoring focus after a controlled update.
Call `wireTokenSearchFields()` once at a stable root to make Enter submit through
`onSubmit` without inserting a contenteditable line break and to preserve focus
plus the text-relative caret when keyboard deletion of a chip causes controlled
rendering to replace the editor. A select-all deletion is normalized to a truly
empty editor even when the browser leaves an atomic chip or line break behind;
replacement typing consumes that intent so a later Backspace/Delete remains an
ordinary character edit.
Managed deletion keeps a collapsible replacement editor open and focused before
the next keystroke; applications must persist both query and tokens from the DOM
read. Genuine outside focus and Escape still collapse an empty field.
Text still wraps visually when it reaches the field edge.
Clear actions should empty the editor's `textContent` before clearing app state.
The leading icon, first text line, clear action, and trailing slot share one
fixed alignment row; when text wraps, those controls stay pinned to that first
row instead of recentering against the taller editor.
Set `collapsible` for the first-class compact presentation: an empty closed
field renders as one iconic search action, `expanded` reveals the complete
field, and text or tokens keep it expanded. Width changes animate by default
and respect reduced-motion preferences. The field works standalone or inside a
`ToolbarControlGroup`; the application owns the transient focused/open signal,
focus transfer, and focusout policy. The catalog's Toolbar route demonstrates
that composition at wide and narrow sizes.
Override its surface through `--kui-token-search-{background|border}` and its
chips through `--kui-token-search-token-{background|foreground}`. Override
`--kui-token-search-line-size` only when the complete first-line geometry must
change together.

`TabBar` is controlled: pass ordered `AppTab` children, then wire its keyboard
and same-bar drag behavior with `wireTabBars(root, { onReorder })`. During a
drag, the scroll strip automatically moves toward either edge with speed based
on pointer proximity, exposing earlier or later drop targets. Apply the reported
change with `reorderTabs()` or application-specific state logic. The application
still owns selection, closing, routing, and persistence.
Use `AppTab.rootAttributes` for domain `data-*` metadata and `closeIcon` for a
decorative replacement glyph. The runtime rejects roles and case variants of
the component- or wiring-owned action, tab identity, selection, drag, drop, and
component markers. Keep the icon free of interactive descendants; the named
close button retains all close interaction.

`Select` uses Web Awesome but does not register anything by itself. Install the optional peer, import the shared theme if desired, and explicitly import the registration entry in the application:

```ts
import "@kerfjs/ui/webawesome.css";
import "@kerfjs/ui/select/register";
```

That boundary keeps Web Awesome and its custom-element side effects out of bundles that use unrelated components. Automated consumer-bundle tests enforce it.
Use `label` for a visible label or `ariaLabel` for a visually hidden name. A
nonempty visible label takes precedence when both are supplied. Kerf names the
actual shadow combobox without adding visible label spacing; this also works
with `renderSelected`, and needs no application shadow-DOM patch. Use `hint`
for persistent supporting text below the control and `placeholderText` for the
empty value inside the closed control. Loading placeholders preserve the hint.

`Select` also owns the Kerf/Web Awesome reconciliation boundary: option icons
keep stable slotted elements across rerenders, and `renderSelected` content is
replaced when the controlled value changes. Consumers do not need to add
`data-key` or `data-morph-skip` workarounds around choice icons. Icon-bearing
options retain the standard icon-to-label gap. When a compact Select is wrapped
in a `ToolbarControlGroup`, use `focusRingOwner="group"`; the group paints the
focus ring with its configured pill or rounded geometry.

For application choices and panes, prefer Kerf's purpose-built primitives:
`Select` over direct Web Awesome selection/dropdown composition,
`SegmentedControl` over Button Group, `TabBar` or `SegmentedControl` over Web
Awesome Tabs, `LucideIcon` over Web Awesome Icon, and `ResizableRegion` over
Split Panel. `ResizableRegion` includes Hot Sheet 2's 1px separator and
hover/focus grip. Its optional `handleIcon` replaces only the decorative glyph;
the component and `wireResizableRegions()` retain separator semantics and
pointer/keyboard behavior. Typed policies cover separator visibility,
instant-track/composited-content collapse, popup-safe overflow,
inline/overlay/hidden responsive presentation, and safe-area restore controls;
the same policies are available on `Workbench` and `CollapsiblePanel`. Consider
Web Awesome Popup when its anchored-positioning
engine removes custom placement code; treat Tree, Animated Image, Comparison,
Zoomable Frame, and the displaced alternatives above as exceptional rather
than default patterns. The detailed rationale lives in the theme contract.

## Design and tool guidance

- [Component selection and composition](./docs/component-selection.md)
- [Design philosophy](./docs/design-philosophy.md)
- [Apple HIG translation](./docs/apple-hig.md)
- [Accessibility and keyboard contracts](./docs/accessibility.md)
- [Component and integration contract](./docs/component-contract.md)
- [Spacing and application layout](./docs/layout.md)
- [Web Awesome theme contract](./docs/webawesome-theme.md)
- [UX catalog contract](./docs/ux-demo.md)
- [AI guide](./ai/skill.md)

Run `npm run dev` from this directory for the category-grouped master/detail catalog. Every public visual component has a focused route; all 70 free Web Awesome 3.12 components have focused routes under the collapsible ecosystem section. Every detail visibly links its first-party demo source and existing guidance while showing the repository-relative paths; first-party components also link their implementation source, and Web Awesome entries label local guidance as Kerf integration guidance. One grouped `Related components` selector contains derived `Uses` / `Used by` navigation across both sets. Run `npm run check` for static/unit/bundle gates and `npm run test:e2e` for the real-browser suite.

Run `npm run format` after editing source or structured content. The narrower
`npm run format:css` command remains available for style-only work. The normal
`npm run lint` and `npm run check` gates use Prettier to reject formatting drift.

For dimensions that should scale with the root font size, author pixels with
`remify()`: `gap: remify(17px)` builds to `gap: 1.0625rem` using a fixed 16px
baseline. Keep intentional 1px borders in pixels and contextual `em` values
explicit. `npm run build` emits standard CSS to `dist/styles`; `npm run dev`
applies the same transform directly to source styles and hot-reloads edits.

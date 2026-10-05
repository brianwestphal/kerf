# Component selection and composition

Start with the interface need, not an export name or a screenshot resemblance.
Use the shipped [`component-catalog.json`](../ai/component-catalog.json) when a
tool needs exhaustive structured facts; this page remains the concise human
decision procedure.

1. Search the [Kerf UX catalog](./ux-demo.md) and the supported Web Awesome set. Prefer a Kerf UI component over a Web Awesome component over a raw HTML tag, using each naturally for what it is good at.
2. Reuse a primitive when its purpose, anatomy, state, and interaction match.
3. Compose primitives for recurring layout through public props and tokens. Do not select one component from another component's stylesheet.
4. Add a thin application adapter for product copy, domain mapping, actions, routing, persistence, permissions, and transport.
5. Use custom markup only when the semantic contract differs. If the pattern recurs across products, open an upstream component or recipe request.

The application adapter is usually a plain function that maps domain state to
component props plus stable `data-action` values. It is not a fork of package
markup or CSS.

**Don't fight the components.** The package is built to look right without an
application customization layer. Before adding `padding`, `margin`, `width`,
`height`, `border`, `background`, a wrapper card, or a decoration, check whether
the component, the pane, or the content-item already owns it — it almost always
does. Express presentation through props and tokens. Encapsulate genuinely new
structure in a self-styled application component, and never reach into a nested
Kerf or Web Awesome component from that stylesheet. See
[`design-philosophy.md`](./design-philosophy.md) "Reach for the primitive, not for
CSS".

### Shared semantic tones

`SemanticTone` is the shared color-role type for `Badge`, `Chip`, `StateBanner`,
and semantic `ContentItem` appearances: `neutral`, `info`, `pop`, `success`,
`warning`, and `danger`. Import it as a type from `@kerfjs/ui`,
`@kerfjs/ui/badge`, `@kerfjs/ui/state-banner`, or `@kerfjs/ui/content-item`.
Use `info` for the role backed by the existing `--kui-color-brand-*` tokens.
Migrate Badge/Chip `tone="brand"` to `tone="info"`; `BadgeTone` and
`StateBannerTone` remain deprecated aliases of `SemanticTone`.

## Foundation tokens

Import the opt-in `@kerfjs/ui/document.css` baseline when the application wants
Kerf UI to own global box sizing, body typography/colors, plain-link color, and
the definite full-height chain. It also lets native table cells and form controls
inherit the surrounding font metrics without removing table-header emphasis.
Put `.kui-app-root` on the one direct mount
container only for a full-height shell; ordinary flowing pages can omit it. See
[Document baseline](document-baseline.md).

Import `@kerfjs/ui/foundation.css` when application-owned composition CSS needs
the same semantic typography, spacing, device breakpoints, geometry, radii,
colors, focus ring, or shadows as Kerf components. Its complete supported
`--kui-*` surface is cataloged by the `foundation` entry; tools may treat that
entry as the public allowlist rather than inferring stability from CSS text.
Override these tokens globally for an application theme or on the narrowest
useful subtree. Prefer a component prop or component-specific token when the
change belongs to one component or instance, and preserve the documented
foreground/background contrast relationships and visible focus ring.

### Typed runtime dimensions

Use `Row`, `Grid`, or `List` spacing shorthands for repeated sibling spacing: `gap="xs"`,
`gap="m"`, and the other `UiSpaceName` values resolve to their matching
`--kui-space-*` token. Use `Spacer` for one deliberate empty width or height, or
pass `flex` to consume the remaining space along a flex parent's main axis.
The canonical rhythm is `none`, `2xs`, `xs`, `m`, and `l`; use `s` and `xl`
only as deliberate exceptions.

When a value cannot be expressed by one spacing step, import the CSS-free
`@kerfjs/ui/css-values` subpath. `px`, `rem`, `em`, and `pct` create typed
`CssLength` values; `space` and `lengthVar` reference spacing or
application-owned length tokens. `plus` creates a non-standalone
`CssLengthExpression`, so wrap it with `calc` before passing it to a gap prop:

```tsx
import { calc, pct, plus, rem, space } from "@kerfjs/ui/css-values";
import { Grid } from "@kerfjs/ui/grid";
import { List } from "@kerfjs/ui/list";
import { Row } from "@kerfjs/ui/row";

<List gap="xs">...</List>;
<Grid columns={3} gap="m">...</Grid>;
<Row hAlign="full" vAlign="middle" gap="m">...</Row>;
<List gap={space("m")}>...</List>;
<List gap={calc(plus(rem(0.25), pct(10)))}>...</List>;
```

`CssValue` is the common branded base, not an arbitrary-string constructor.
For a responsive equal-width form, pass `Grid minColumnWidth={px(376)}` instead
of `columns`; the Grid's container width decides when the tracks collapse.
Raw strings such as `"0.25rem"` do not satisfy `Row.gap`, `Grid.gap`, or `List.gap`; this
contract lands before the 5.0 stable release so misspelled tokens and incomplete
expressions fail during typechecking rather than in the browser.

Other CSS-valued props use distinct contracts: `Spacer.width` and
`Spacer.height` take `UiSpaceName | CssLength`; `flex()` creates `CssFlex` for
`Row.flex`, `Grid.flex`, and `List.flex`; `Skeleton` dimensions take typed lengths (plus finite intrinsic
keywords for width/height); and `SelectChoice.color` takes a
`CssForegroundColor` from `uiColor()` with a foreground token (`*-on-*`, a text
role, or a `*-text` alias), from `foregroundColorVar()`, or from `foregroundColor()` via the `foregroundColor` helper for an application-chosen CSS color. `LucideIcon.color` accepts the same foreground type and otherwise inherits surrounding text color. The bare `success`,
`warning`, `danger`, `pop`, and `accent` tokens are quiet fills, not
foregrounds, and are rejected there; `colorVar()` returns a plain `CssColor`.
`LucideIcon` is block-level by default; set `inline` to let it flow inside
`Text` or other prose without changing its size or accessibility semantics.
Do not substitute one brand for another. Row components
have no declaration-string `style` prop; use `className`, documented public
tokens, and semantic component props. Catalog media queries remain strings and
semantic pixel measurements remain numbers because those are different APIs.
The corresponding public builders are `flex`, `uiColor`, `colorVar`, and
`foregroundColorVar`.

## Production recipes

Use the [complete recipe guide](./recipes.md) when several primitives form one
application boundary:

| Task                                | Stable catalog route                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| Desktop application shell           | [Catalog](../ux-demo/) · `?component=recipe-app-shell`             |
| Navigation sidebar                  | [Catalog](../ux-demo/) · `?component=recipe-navigation-sidebar`    |
| Workspace header                    | [Catalog](../ux-demo/) · `?component=recipe-workspace-header`      |
| List-detail dialog                  | [Catalog](../ux-demo/) · `?component=recipe-list-detail-dialog`    |
| Composer form                       | [Catalog](../ux-demo/) · `?component=recipe-composer-form`         |
| List workspace states               | [Catalog](../ux-demo/) · `?component=recipe-list-workspace-states` |
| Compact toolbar choices and actions | [Catalog](../ux-demo/) · `?component=recipe-compact-toolbar`       |
| Navigation stack                    | [Catalog](../ux-demo/) · `?component=recipe-navigation-stack`      |
| Loading inspector                   | [Catalog](../ux-demo/) · `?component=recipe-loading-inspector`     |
| Collapsible sidebar                 | [Catalog](../ux-demo/) · `?component=recipe-collapsible-sidebar`   |

Recipes use public production exports and show ownership boundaries; they are
copyable reference compositions, not new monolithic components.

When presenting a component or recipe in a Catalog, use the authoritative
[Catalog demo authoring contract](./catalog.md#catalog-demo-authoring-contract)
rather than deriving preview structure or geometry-overlay behavior from these
selection entries.

## Missing recurring concepts

Kerf UI does not export a command-palette component. Do not invent a package
command-palette import.
The typed [application adapter example](./examples/command-palette-adapter.tsx)
imports `@kerfjs/ui/layout.css`, assigns one `.kui-layout` root and one surface
inset, and groups its related footer commands with `.kui-control-cluster` while
the application owns ranking, history, shortcut policy, focus policy,
availability, actions, and copy. If that concept recurs across products, open
an upstream component or recipe request.

## Problem-to-component matrix

For a read-only or click-to-edit field preview, use `FieldLabel` from
`@kerfjs/ui/text` above the preview instead of a `ListHeader`. It matches the
themed Web Awesome form-control label. Put it in `ListInsetControl sides="trl"`
beside a `ContentItem` value, and connect its id to the preview group's
`aria-labelledby`; see [Field labels](./layout.md#text).

| Interface need                                                                                                          | Use when                                                                                                                                                                                                                                                                                                                                                 | Do not use when; nearest alternative                                                                                                                                                                                                                                                                                                       | Required wiring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Application owns                                                                                                                                         | Import                                                                                    | Recipe                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Icon — `LucideIcon`                                                                                                     | A decorative or explicitly labeled Lucide-compatible icon belongs in app UI.                                                                                                                                                                                                                                                                             | Do not use an icon as the only name of an unfamiliar action; add visible or accessible text. Prefer it over Web Awesome `wa-icon`.                                                                                                                                                                                                         | None.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Icon choice and meaningful label.                                                                                                                        | `@kerfjs/ui/lucide-icon`                                                                  | [Accessibility](./accessibility.md#shared-rules)                                    |
| Compact metadata — `Badge`                                                                                              | A short status, count, category, or metadata label needs self-owned visual treatment configured by semantic props.                                                                                                                                                                                                                                       | Do not use it as a button, link, or removable chip. Do not restyle consuming-component descendants to create a badge.                                                                                                                                                                                                                      | Choose `tone`, `appearance`, `shape`, and `size`; supply `label` for abbreviated content or `ariaHidden` when a surrounding component already owns the same accessible text. For new content without a count use the text-free `size="dot"`, which requires `label` or `ariaHidden`.                                                                                                                                                                                                                                                                                                                                                                                                                                   | Metadata text, semantic tone mapping, and abbreviated-content labeling.                                                                                  | `@kerfjs/ui/badge`                                                                        | [Component ownership](./component-contract.md#ownership-boundaries)                 |
| Disclosure indicator — `DisclosureArrow`                                                                                | A control needs one animated 18px root-scaled visual for open and closed state, including configurable directions or a replacement icon.                                                                                                                                                                                                                 | Do not use it as the interactive control or accessible name; place it inside the button or control that exposes expanded state.                                                                                                                                                                                                            | Pass the controlled `open` state, render it inside the owning control, author replacement icon content facing right before transforms, and override `--kui-disclosure-arrow-size` only when another visual size is required. Direction changes use the shortest rotation path, with counterclockwise chosen for a 180-degree closed-to-open tie.                                                                                                                                                                                                                                                                                                                                                                       | Open state, interaction, accessible name, size override, replacement glyph, direction choices, and shortest-path rotation.                               | `@kerfjs/ui/disclosure-arrow`                                                             | [Component ownership](./component-contract.md#ownership-boundaries)                 |
| Application toolbar or heading — `Toolbar`                                                                              | Leading identity, optional centered content, and trailing controls form one horizontal app bar or a page/panel/dialog heading.                                                                                                                                                                                                                           | Do not add bespoke heading geometry or a private wrapper; use the same zone contract everywhere.                                                                                                                                                                                                                                           | Put identity/title text directly in a zone as `ToolbarText`; group controls and icon tiles in `ToolbarControlGroup`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Actions, command availability, responsive relocation, state, and supporting copy below a heading.                                                        | `@kerfjs/ui/toolbar`                                                                      | [Toolbar composition](../README.md#component-subpaths)                              |
| Toolbar control cluster — `ToolbarControlGroup`, `ToolbarActionLink`                                                    | Related toolbar buttons, semantic links, compact/tight controls, avatar actions, or a dropdown trigger/menu surface need one configured chrome contract.                                                                                                                                                                                                 | Do not use it merely to align unrelated controls. Do not restyle anchors or dropdown parts in application CSS; use `ToolbarActionLink`, `overflow`, and `menuInset`. Web Awesome `wa-button-group` is only for an exceptional grouped-action contract.                                                                                     | Delegate child actions; use `ToolbarActionLink` for native navigation, `overflow="scroll"` for bounded action rows, and `menuInset` for dropdown surface padding. Use `avatarImage` instead of inserting an `img`; use `SegmentedControl` for an exclusive choice.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Actions, destinations, pressed/expanded state, content, and policy.                                                                                      | `@kerfjs/ui/toolbar-control-group`                                                        | [Component ownership](./component-contract.md#ownership-boundaries)                 |
| Floating controls over content — `FloatingToolbar`                                                                      | A small cluster of controls (e.g. a drawer restore) must float over scrolling content — distinct and forced-dark — inside a positioned container.                                                                                                                                                                                                        | Do not use it for a primary page or panel toolbar (use `Toolbar`), or for anything that must sit above dialogs/overlays — it is not top-layer.                                                                                                                                                                                             | Compose `ToolbarControlGroup`s and delegate their actions; the app owns visibility and position.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Controls, visibility, and position.                                                                                                                      | `@kerfjs/ui/floating-toolbar`                                                             | [Component subpaths](../README.md#component-subpaths)                               |
| Toolbar identity text — `ToolbarText`                                                                                   | A toolbar needs extra-large (page/panel title), large, default, or compact textual identity.                                                                                                                                                                                                                                                             | Plain text is not a heading by default; when a title needs heading semantics pass `headingLevel`. Sizes below `xlarge` are intentionally quiet identity text in default tone — do not use them as a normal-color subsection title; use `Text` with an `h2`–`h6` variant, or `ListHeader` for a list section.                               | Optional `headingLevel` for `role="heading"` + `aria-level`. Defaults to one line, ellipsized when it does not fit; `wrap` flows onto multiple lines, `ellipsis` toggles the trailing …, and `maxLines` caps a wrap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Text, heading level, overflow behavior, and responsive priority.                                                                                         | `@kerfjs/ui/toolbar-text`                                                                 | [Toolbar composition](../README.md#component-subpaths)                              |
| Semantic block or inline text — `Text`                                                                                  | Ordinary application copy needs native `h1`–`h6` or `p` semantics plus standard geometry, or inline secondary copy needs a native `span` without box geometry.                                                                                                                                                                                           | Do not choose heading levels for appearance alone or recreate muted, error, small, or code utility classes. Use `ToolbarText` for toolbar identity/title content and `ListInsetText` when list-aligned prose needs full margin/border/padding geometry.                                                                                    | Omit `variant` for the default `p`, choose `h1`–`h6` from the document outline, or choose `span` inside a row, label, or table cell. Independently compose `tone="quiet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | danger"`, `size="compact"`, and `font="monospace"`; ordinary native global, `data-_`, and `aria-_` attributes pass through.                              | Copy, localization, semantic variant, presentation roles, and document heading hierarchy. | `@kerfjs/ui/text`                                                                   | [Text](./layout.md#text) |
| Vertical stack — `List`                                                                                                 | Rows, sections, or arbitrary components need a consistent vertical stretch layout, optional standard/custom gap, flex growth, one vertical scroll owner, or edge dividers.                                                                                                                                                                               | It is layout-only and does not provide `ul`/`ol` semantics. Do not nest scroll owners or use it when a horizontal layout is required.                                                                                                                                                                                                      | Choose `gap`, `flex`, `scrollable`, and canonical `dividerSides` (`t`, `r`, `b`, `l` combinations in that order); bound the block size when scrolling.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Child semantics/content, containing height, and which optional layout behaviors apply.                                                                   | `@kerfjs/ui/list`                                                                         | [Pane geometry](../README.md#pane-and-content-geometry)                             |
| Equal-width columns — `Grid`                                                                                            | Equal-width sibling columns need a fixed count or should collapse as their container narrows, while preserving equal tracks despite intrinsic child widths.                                                                                                                                                                                              | Do not use it for intrinsic, asymmetric, spanning, or masonry tracks; use application-owned CSS grid. Do not use it for a user-operable separator; use `ResizableRegion`.                                                                                                                                                                  | Choose fixed `columns` or typed `minColumnWidth`, plus typed `gap`, optional `flex`, and physical-side `textInsets` / `controlInsets` when the track group needs a standard text or control inset; text wins on overlap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Child semantics/content, outer width, fixed count or minimum width, and typed gap/flex/inset choices.                                                    | `@kerfjs/ui/grid`                                                                         | [Grid](./layout.md#grid)                                                            |
| Navigation row — `ListItem`                                                                                             | A pane or navigation area needs a selectable, disabled, dormant-trailing, or multiline action row.                                                                                                                                                                                                                                                       | Do not put a control in `trailing`; use `ListActionRow` when the trailing region must be independently interactive. Use an `<a>` for navigation that must retain link behavior, a native `<button>` for an ordinary action, or implement the complete ARIA menu widget.                                                                    | Delegate its `data-action`; compose inside a `.kui-content` section. Put domain event/drop metadata in `rootAttributes` rather than adding wrapper markup. The rounded root clips overflowing descendants; set `multiline` when the primary label should wrap.                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Routing, selection, permissions, copy, action handling, and domain `data-*` values.                                                                      | `@kerfjs/ui/list-item`                                                                    | [Pane geometry](../README.md#pane-and-content-geometry)                             |
| Navigation row with trailing action — `ListActionRow`                                                                   | A full-width row needs a selectable primary action and an independently focusable trailing action.                                                                                                                                                                                                                                                       | Use `ListItem` when trailing content is dormant metadata. Do not put controls inside the row's `label`, `icon`, or `trailingActionIcon` SafeHtml slots. Do not use `AppTab` outside tablist semantics or `ToolbarControlGroup` outside a toolbar.                                                                                          | Delegate both action strings; update controlled selection and any popover/context-menu state in the app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Routing, selection, both action policies, domain metadata, and popover/context-menu behavior.                                                            | `@kerfjs/ui/list-action-row`                                                              | [Accessibility](./accessibility.md#listactionrow)                                   |
| Navigation section heading — `ListHeader`                                                                               | A menu section needs a full-width label, semantic count, non-count badge, logical-end action, or real disclosure state.                                                                                                                                                                                                                                  | Do not concatenate counts into `label` or put numeric content in `badge`; use `count` with the localized full phrase in `countLabel`. Do not add a disclosure arrow to navigation that reveals nothing. Keep its 44px hit target; do not resize its 36px square. Do not use it as a page, panel, or dialog title; use a heading `Toolbar`. | Delegate its optional action; the app controls expanded state and revealed content. Toggle mode supplies `DisclosureArrow` unless `actionIcon` replaces it. Use `triggerAttributes` only for domain `data-*` or a native popover relationship.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Section organization, valid count and localized count label, disclosure state and content, non-count badge content, popover target behavior, and policy. | `@kerfjs/ui/list-header`                                                                  | [Pane geometry](../README.md#pane-and-content-geometry)                             |
| Inset self-bordered control — `ListInsetControl`                                                                        | A control that owns its own border and padding but no outer margin (a search input, a `SegmentedControl`) must line up inside a `.kui-content` list with the standard 8px inline margins and stretch to fill the row.                                                                                                                                    | Do not wrap a `.kui-content-item` or a `ListItem`/`ListHeader` that already owns its inline margin — that double-insets it. Do not add ad-hoc `margin`/`padding` around a bare control to align it; use this instead.                                                                                                                      | Place the self-bordered control(s) as children; they stretch to fill. It applies only the inline margin, flex stretch, and 8px gap — the child owns its own border and padding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | The control(s), their state, and action wiring.                                                                                                          | `@kerfjs/ui/list-inset-control`                                                           | [Pane geometry](../README.md#component-subpaths)                                    |
| Inset bare text — `ListInsetText`                                                                                       | A plain string or inline content with no margin, border, or padding of its own must sit in a `.kui-content` list with its text edge aligned to the bordered items around it.                                                                                                                                                                             | Do not use it to wrap a component that already owns content-item geometry (`ListItem`, `StateBanner`, a `.kui-content-item`) — that double-insets it. Do not hand-roll the 8px margin / 1px border / 8px padding.                                                                                                                          | Pass the text or inline `SafeHtml` as children; it supplies the 8px inline margin, 1px transparent border, and 8px padding so the text edge lands at the standard 17px inset. Pass `sides="rl"` to keep that horizontal inset but drop the vertical margin, border, and padding for tight text layout.                                                                                                                                                                                                                                                                                                                                                                                                                 | The text, copy, and localization.                                                                                                                        | `@kerfjs/ui/list-inset-text`                                                              | [Pane geometry](../README.md#component-subpaths)                                    |
| Self-contained content child — `ContentItem`                                                                            | An ordinary surface-like child of a `Pane` or `.kui-content` stack needs the shared 8px margin / 1px border / 8px padding geometry; pass `frame="framed"` only when it marks a real distinction, `appearance="surface"` or a semantic appearance for coordinated surface colors, and `shape="pill"` for the 22px radius.                                 | Do not wrap a component that already owns content-item geometry (`ListItem`, `ListHeader`, `StateBanner`, `Toolbar`, `ValueTable`) or pad around it — that double-insets. Do not frame an item only to make it look contained. Use `SunkenPanel` for a lowered inset stack and `ListInsetText` for bare text that only needs to align.     | Pass the item content as children; choose `appearance` (`transparent` default, `surface`, or a semantic status), `frame`, and `shape` instead of writing CSS. Put safe `data-*` metadata in `rootAttributes`; `ariaLabel` names a distinct region and `focusTarget` makes it a programmatic focus target.                                                                                                                                                                                                                                                                                                                                                                                                              | The content, surface or status appearance, and whether it marks a distinction worth a visible frame.                                                     | `@kerfjs/ui/content-item`                                                                 | [Content items](./layout.md#content-items)                                          |
| Application column — `Pane`                                                                                             | A sidebar, main area, inspector, or dialog needs shared vertical header/content/footer organization, one scroll owner, and optional edge separators.                                                                                                                                                                                                     | Do not pad the pane shell, wrap child-owned geometry in competing insets, invent unrelated centered measures, or leave an icon-only rail for a hidden pane.                                                                                                                                                                                | Import `Pane`, use `children` for its homogeneous primary content and the named `SafeHtml` prop slots `header`/`footer` for optional fixed chrome, then opt into only the needed logical-edge separators; add `ContentItem` children as needed. A visible pane owns collapse in its toolbar; move a hidden inline-start pane's restore control to the main toolbar leading edge and an inline-end pane's restore control to its trailing edge.                                                                                                                                                                                                                                                                         | Layout hierarchy, reading width, responsive relocation, pane visibility state, slot semantics, labels, and separator placement.                          | `@kerfjs/ui/pane`                                                                         | [Pane anatomy](./layout.md#anatomy)                                                 |
| Scroll dividers — `wireScrollDividers`                                                                                  | Pinned chrome (a `Pane` header or footer, a `NavStack` top chrome or bottom toolbar, a `TabScaffold` bar, the sides of a `TabBar` strip, or app-owned chrome around a scroller) needs a divider only while content is scrolled away beneath it.                                                                                                          | Do not keep a static toolbar divider to fake it or write a border onto another component; each component draws its own line from the wiring's state.                                                                                                                                                                                       | Call `wireScrollDividers` once at the app root and retain the disposer; it covers every `Pane`, `NavStack`, `TabScaffold`, and `TabBar` below it. Name app-owned arrangements in `targets` by id; a `Toolbar` or `List` named as chrome draws its facing side. Configure a pane with `chromeDividers` (`scroll` default, `always`, `none`).                                                                                                                                                                                                                                                                                                                                                                            | Which panes follow the scroll, app-owned targets, and the disposer.                                                                                      | `@kerfjs/ui/wire-scroll-dividers`                                                         | [Scroll dividers](./layout.md#scroll-dividers)                                      |
| One-pane navigation — `NavStack`                                                                                        | A compact flow pushes into details while keeping earlier views mounted, or a single-pane screen needs the same stable layout contract.                                                                                                                                                                                                                   | Do not use it when list and detail should remain visible together; use `SplitView`. Do not use it alone for co-equal top-level destinations; use one stack per `TabScaffold` tab.                                                                                                                                                          | Keep the ordered view array controlled, put view-specific bottom chrome on each view (or use the component fallback), import its CSS explicitly, and call `wireNavStack` for back delegation, content-slide/chrome-cross-fade transitions, and focus move/restore. Mark a preferred initial target with `data-nav-focus` when DOM order is insufficient.                                                                                                                                                                                                                                                                                                                                                               | View keys/content/titles, push and pop actions, preferred initial focus targets, and per-view or persistent bottom toolbar content.                      | `@kerfjs/ui/nav-stack`                                                                    | [App-layout decision matrix](./app-layouts.md#decision-matrix)                      |
| Responsive list-detail — `SplitView`                                                                                    | A primary list and related detail belong together on roomy devices but become a one-pane drill-down on compact devices.                                                                                                                                                                                                                                  | Do not use it for a single linear flow or a multi-panel editor shell.                                                                                                                                                                                                                                                                      | Provide controlled selection/detail state and device class; opt into resize wiring only when the separator is user adjustable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Selection, detail content, compact back action, device policy, and optional persisted width.                                                             | `@kerfjs/ui/split-view`                                                                   | [App-layout decision matrix](./app-layouts.md#decision-matrix)                      |
| Compact top-level destinations — `TabScaffold`                                                                          | A handset or portrait-tablet app has two to five co-equal destinations whose scenes and nested navigation must remain mounted across switches.                                                                                                                                                                                                           | Do not use it for document tabs, reorderable work items, or a desktop navigation rail.                                                                                                                                                                                                                                                     | Keep the active id controlled, import its CSS explicitly, and call `wireTabScaffold`; commonly place one `NavStack` in each tab scene.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Destination definitions, active id, routing, persistence, and roomy-device replacement.                                                                  | `@kerfjs/ui/tab-scaffold`                                                                 | [App-layout decision matrix](./app-layouts.md#decision-matrix)                      |
| Desktop multi-panel workspace — `Workbench`                                                                             | A desktop-class tool needs a central work area plus independently collapsible navigator, inspector, or console regions.                                                                                                                                                                                                                                  | Do not shrink the full shell onto compact devices or use it for one standalone panel.                                                                                                                                                                                                                                                      | Render only the required rails/drawer, keep collapse state controlled, and replace peripheral regions with stacks or overlays below desktop sizes. Opt a panel into drag/keyboard resizing with `resizable` and call `wireWorkbench` with its size signal.                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Panel presence/content, collapsed states, sizes, persistence, responsive replacement, and controls.                                                      | `@kerfjs/ui/workbench`                                                                    | [Workbench](./workbench.md)                                                         |
| Standalone rail or drawer — `CollapsiblePanel`                                                                          | One left/right rail or bottom drawer needs controlled collapse without adopting the complete `Workbench` shell.                                                                                                                                                                                                                                          | Do not use it for several coordinated workspace panels or retain an empty icon-only rail while collapsed.                                                                                                                                                                                                                                  | Pair it with `CollapsiblePanelToggle`; call `wireSidebar` for focus transfer, Escape/backdrop dismissal, compact overlay trapping, and persistence integration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Panel content/size, collapsed state, toggle placement, persistence, and compact policy.                                                                  | `@kerfjs/ui/collapsible-panel`                                                            | [App-layout decision matrix](./app-layouts.md#decision-matrix)                      |
| Lowered content surface — `SunkenPanel`                                                                                 | A main work area or nested content group needs one visually lowered surface with a compact inset and vertical stack.                                                                                                                                                                                                                                     | Do not use it merely to add padding, as a replacement for `Pane` anatomy, or around children that already own the same outer surface.                                                                                                                                                                                                      | Compose the application-owned content as children, choose the default `rounded` shape or `square` for a flush edge-to-edge area, and pass `ariaLabel` only when the surface is a distinct named region.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Region semantics, accessible name, shape, scroll ownership, child ordering, and content.                                                                 | `@kerfjs/ui/sunken-panel`                                                                 | [SunkenPanel](./sunken-panel.md)                                                    |
| Menu composition                                                                                                        | Navigation sections need full-size rows and the same content-item geometry as every other pane.                                                                                                                                                                                                                                                          | Do not add sidebar-specific wrapper padding, shrink targets to icon size, nest an interactive trailing control in `ListItem`, or use a chevron on a row that does not disclose content. Use ordinary links for a different navigation contract.                                                                                            | Compose `ListHeader`, `ListItem`, and `ListActionRow` in `.kui-content`; use `ListHeader` toggle mode with real controlled content, and use `ContentItem` for other surfaces plus a pane footer for toolbar actions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Information architecture, disclosure content and state, responsive drawer/shell behavior, and token overrides.                                           | `@kerfjs/ui/layout.css`                                                                   | [Pane geometry](../README.md#pane-and-content-geometry)                             |
| Resizable application pane — `ResizableRegion`, `clampRegionSize`, `resizeRegionFromPointer`                            | A controlled split pane needs the Kerf separator, collapse state, pointer plus keyboard resizing, or a product-specific decorative grip.                                                                                                                                                                                                                 | Do not use it for static equal columns; use `Grid`. Use application CSS grid for static asymmetric or intrinsic tracks. Prefer it over Web Awesome `wa-split-panel` unless that component's distinct API is required. Keep `handleIcon` noninteractive.                                                                                    | Call `wireResizableRegions` from `@kerfjs/ui/wire-resizable-regions` once and retain its disposer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Size signal, min/max policy, collapse policy, persistence, and optional decorative handle icon.                                                          | `@kerfjs/ui/resizable-region`                                                             | [ResizableRegion contract](./accessibility.md#resizableregion)                      |
| One application tab — `AppTab`                                                                                          | A controlled app tab needs selection, close, drag, leading/trailing anatomy, compact/segmented/icon-only presentation, label truncation, safe domain metadata, or a product-specific close glyph.                                                                                                                                                        | Do not render it alone or use it for a small settings choice; compose in `TabBar`, or use `SegmentedControl`. Keep `closeIcon` noninteractive.                                                                                                                                                                                             | Compose in `TabBar`; let `wireTabBars` manage interaction. Put only domain `data-*` values in `rootAttributes`; use typed appearance props instead of descendant CSS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Tab identity, order, selection, close policy, content, domain metadata values, and outer placement.                                                      | `@kerfjs/ui/app-tab`                                                                      | [Tabs contract](./accessibility.md#tabs)                                            |
| Application tab strip — `TabBar`, `wireTabBars`, `reorderTabs`                                                          | Tabs switch page regions and may overflow, close, reorder, fill a segmented inspector strip, sit beside a trailing action, or keep that adjacent action distinct from a far-edge end action.                                                                                                                                                             | Do not use it for a compact local view toggle; use `SegmentedControl`. Do not use it for a long choice list; use `Select`. Prefer it over Web Awesome `wa-tab-group`, `wa-tab`, and `wa-tab-panel` for Kerf app tabs.                                                                                                                      | Call `wireTabBars` once, retain the disposer, and apply `onReorder` synchronously; `reorderTabs` is the default array helper. Combine `trailingPlacement="adjacent"` with `end` for split actions; TabBar owns the shrinking/scrolling tab geometry and keeps both actions visible. Choose typed presentation/allocation props while the parent owns outer placement.                                                                                                                                                                                                                                                                                                                                                  | Ordered tabs, selection, panels, routing, closing, persistence, action content, and outer placement.                                                     | `@kerfjs/ui/tab-bar` plus `@kerfjs/ui/wire-tab-bars`                                      | [Tabs contract](./accessibility.md#tabs)                                            |
| Panel, dialog, or page heading — `Toolbar` + `ToolbarText`                                                              | A panel, dialog, or page needs an extra-large title, optional icon, grouped trailing actions, and optional supporting copy.                                                                                                                                                                                                                              | Do not add a private heading wrapper or bespoke layout. The toolbar supplies structure, not modal behavior; use an application overlay or Web Awesome `wa-dialog` for that behavior. In a narrow peripheral rail or drawer, where xlarge would truncate at the panel's minimum size, use the default `ToolbarText` size as pane identity.  | Connect title/supporting-copy ids to the host, group controls, and delegate actions. **For a page or view title set `headingLevel` (usually `1`)** on `ToolbarText`; omit it for a dialog title referenced by `aria-labelledby`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Open state, focus lifecycle, dismissal, controls, ids, copy, and heading level.                                                                          | `@kerfjs/ui/toolbar` + `@kerfjs/ui/toolbar-text`                                          | [Toolbar headings](./accessibility.md#toolbar-headings)                             |
| Dialog or popup geometry — `DialogSurface`, `PopupSurface`                                                              | Recurring Web Awesome dialogs need standard sizes/presentations/body/footer insets, or dropdown menus need list-compatible inset ownership.                                                                                                                                                                                                              | Do not use these wrappers as generic layout or to replace native dialog/dropdown behavior. Avoid consumer `::part()` overrides and do not stack a dialog body inset around list-owned child geometry.                                                                                                                                      | Wrap one `wa-dialog` or `wa-dropdown`; choose the typed geometry while retaining native labeling, open state, focus, dismissal, and menu semantics. Compose a dialog body as a `List` by default, use `bodyInset="none"` when its children own list geometry, and wrap bare prose in `ListInsetText`.                                                                                                                                                                                                                                                                                                                                                                                                                  | State, focus lifecycle, dismissal, labels, content, and outer placement.                                                                                 | `@kerfjs/ui/surface-scaffold`                                                             | [Surface scaffolds](./surface-scaffold.md)                                          |
| Key/value facts — `ValueTable`, `ValueTableRow`                                                                         | Read-only labels and values form a semantic definition list, optionally with a leading icon.                                                                                                                                                                                                                                                             | Do not use it for editable form fields or a row/column data grid; use native form or table semantics.                                                                                                                                                                                                                                      | Compose typed `ValueTableRow` entries; pass `icon` when a 24px leading icon adds useful context.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Values, formatting, icon meaning, and empty/loading policy.                                                                                              | `@kerfjs/ui/value-table`                                                                  | [Component ownership](./component-contract.md#ownership-boundaries)                 |
| Indeterminate activity — `LoadingSpinner`                                                                               | A Kerf surface needs compact, labeled or decorative indeterminate progress.                                                                                                                                                                                                                                                                              | Do not use it for known progress; use Web Awesome `wa-progress-bar` or `wa-progress-ring`. Direct Web Awesome UI may use `wa-spinner`; do not mix spinner systems within one surface.                                                                                                                                                      | Pass a label when the spinner conveys status; use size for a named icon step or positive pixel size.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Loading lifecycle and adjacent status copy.                                                                                                              | `@kerfjs/ui/loading-spinner`                                                              | [Accessibility](./accessibility.md#shared-rules)                                    |
| Loading placeholder — `Skeleton` + a component's `placeholder` prop                                                     | A value or a whole component is still loading and should hold its space as a subtle, unanimated block, keeping the layout stable — an inspector or detail view rendering its real chrome with per-record values absent.                                                                                                                                  | Do not use it for known progress (use `LoadingSpinner`), do not animate it, and do not hand-rebuild a component's empty state — set `placeholder` on the component instead. Prefer it over `wa-skeleton`, which the pure-Kerf primitives avoid to stay Web-Awesome-free.                                                                   | Set `placeholder` on a value-bearing component (`Select`, `ListHeader`, `ListItem`, `ValueTableRow`, `SegmentedControl`, `StateBanner`, `AppTab`, `ToolbarText`, `ListActionRow`) to render skeletons in its value slots with interactivity disabled; use the standalone `Skeleton` for a custom slot.                                                                                                                                                                                                                                                                                                                                                                                                                 | Loading lifecycle, which slots are unknown, and announcing the loading region.                                                                           | `@kerfjs/ui/skeleton`                                                                     | [Accessibility](./accessibility.md#shared-rules)                                    |
| Command menu — `PopupMenu`                                                                                              | A short list of commands sits behind one trigger, such as a toolbar sort or More menu, optionally grouped under headings and dividers with item icons.                                                                                                                                                                                                   | Do not use it to choose a persistent value; use `Select`. Do not hand-write `wa-dropdown`/`wa-dropdown-item` markup for an action menu.                                                                                                                                                                                                    | Import `@kerfjs/ui/popup-menu/register` once. Place it in a `single` `ToolbarControlGroup` with `nestedDropdown` and a `menuInset`, or wrap it in `PopupSurface` outside a toolbar. Handle item `action`s by delegation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Commands, enabled state, and reactions to opening or closing.                                                                                            | `@kerfjs/ui/popup-menu`                                                                   | [Toolbar composition](#toolbar-composition)                                         |
| Value selection — `Select`                                                                                              | A controlled form, toolbar, or compact navigation value comes from a moderate or long choice list, possibly grouped, icon-bearing, icon-only when closed, or truncating. Set `multiple` with an array `value` when the person may choose any number of them; add `selectedPresentation="icon-only"` and a fixed `triggerIcon` for a toolbar filter menu. | Do not use it for commands; use `PopupMenu`. Do not use it for a small visible choice set; use `SegmentedControl`. Prefer it over direct `wa-select`, `wa-option`, or value-like `wa-dropdown`/`wa-dropdown-item` composition.                                                                                                             | Import `@kerfjs/ui/select/register` once for registration and current-request animation ownership; listen for standard input/change events. Do not add consumer popup timing or positioning repairs. Use typed presentation props rather than consumer `::part()` overrides; let the parent own placement.                                                                                                                                                                                                                                                                                                                                                                                                             | Controlled value, validation, choices, domain mapping, and outer placement.                                                                              | `@kerfjs/ui/select`                                                                       | [Web Awesome integration](../README.md#web-awesome-theme)                           |
| Small exclusive choice — `SegmentedControl`                                                                             | A few visible choices switch a compact view or setting, with toolbar, rounded, or pill presentation.                                                                                                                                                                                                                                                     | Do not use it for tabpanel semantics; use `TabBar`. Do not use it for many choices; use `Select`. Prefer it over `wa-button-group` when the controls select one value.                                                                                                                                                                     | Delegate its action, read `data-segment-value`, update `value`, and rerender.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Controlled value, labels, action, and persistence.                                                                                                       | `@kerfjs/ui/segmented-control`                                                            | [SegmentedControl contract](./accessibility.md#segmentedcontrol)                    |
| Structured search editor — `TokenSearchField`, `readTokenSearchField`, `placeTokenSearchCaret`, `wireTokenSearchFields` | Free text and ordered, editable, removable filter tokens share one searchbox; enable `collapsible` when an empty, unfocused field should reduce to one iconic action, standalone or in a toolbar group.                                                                                                                                                  | Do not use it for ordinary text entry; use a native input or Web Awesome `wa-input`. Do not use it when filters belong in separate form controls.                                                                                                                                                                                          | Read DOM-owned text on input, empty `textContent` on clear, and use `placeTokenSearchCaret` after explicit controlled focus changes. Call `wireTokenSearchFields` from `@kerfjs/ui/wire-token-search-fields` once so Enter submits without adding a line break and keyboard chip deletion restores focus plus the text-relative caret after controlled replacement. In `collapsible` mode it also manages the transient expand/collapse/focus by default (activate to reveal + focus, Escape or empty blur to collapse); bind the field's `expanded` to the signal on the returned handle (`handle.expanded(id)`) or adopt your own via `collapsible.signals`, and opt out per behavior only when the app must own it. | Parsing, suggestions, tokens, query execution, results, announcements, and — only if overriding the default — the collapsible `expanded` signal.         | `@kerfjs/ui/token-search-field`                                                           | [TokenSearchField contract](./accessibility.md#tokensearchfield)                    |
| Persistent inline status — `StateBanner`                                                                                | A neutral, info, pop, success, warning, or danger message belongs next to the affected work; pop highlights featured or novel content without implying status.                                                                                                                                                                                           | Do not use pop as a success, warning, or danger substitute. Do not use StateBanner for a no-content screen; use `EmptyState`. Do not use it for transient confirmation; use a toast. Web Awesome `wa-callout` is the ecosystem alternative for Web Awesome-owned content.                                                                  | Delegate an optional action; choose alert urgency only for attention-requiring failure. Use the optional tone-tinted `badge` for a terse count or status beside the title, not as the only expression of meaning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | State mapping, message lifetime, retry/action behavior, badge content, and copy.                                                                         | `@kerfjs/ui/state-banner`                                                                 | [Feedback accessibility](./accessibility.md#shared-rules)                           |
| Empty or busy content area — `EmptyState`                                                                               | A content region has no items, cannot proceed, or is loading and needs explanation plus an optional action.                                                                                                                                                                                                                                              | Do not use it for an inline status update; use `StateBanner`. Do not use it for transient success; use `wa-toast`/`wa-toast-item` or the application's toast system.                                                                                                                                                                       | Delegate its optional action; it composes `LoadingSpinner` when busy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Empty/busy policy, recovery action, illustration, and copy.                                                                                              | `@kerfjs/ui/empty-state`                                                                  | [Feedback ownership](./component-contract.md#extracted-versus-application-specific) |

## Ambiguous choices

For a lowered background behind an entire scrolling work area, choose
`Pane appearance="sunken"` or the appearance option on the layout that owns
the scroll viewport. Use `SunkenPanel` for a padded content group that does
not introduce scrolling. See [Lowered work surfaces](./layout.md#lowered-work-surfaces).

Set `ResizableRegion`'s `--kui-resizable-region-background` for an inline
surface. An open descendant `PopupMenu` or Web Awesome dropdown automatically
releases clipping and raises the region on its public popup layer. Set
`contentOverflow="visible"` for other anchored content that must escape the
region. A collapsed region can place `restoreControl` in a top or bottom corner with
`restorePosition`, set its typed `restoreInset`, or use
`restorePlacement="inline"` for a control in normal flow.

Use `FloatingToolbar placement="inline"` when a restore owner supplies the
position. Floating placement supports per-edge `--kui-floating-toolbar-inset-*`
tokens; `safeAreaInsets` adds the layout-routed or device safe-area inset to
the positioned edges.

For a larger option row, use `ListItem density="spacious"`; `compact` and
`standard` remain available. `multiline` wraps its label and aligns its icon
to the first line; `multilineIconAlign="center"` centers the icon against the
whole label. `divider` owns a before or after separator. Set
`state="drag-target"` for the component's drop outline and background. Public
`--kui-list-item-*` tokens control its row, icon, label, and trailing geometry
and color. `ListHeader` exposes `--kui-list-header-min-height`, title padding,
title minimum height, and border-width tokens for section density.
Set `--kui-list-group-divider-color` on a containing `List` to give
`ListHeader`, `ListItem`, and `ListActionRow` the same before/after divider
color; each row otherwise uses the quiet neutral border tone.
For a filled command list, set `--kui-list-item-background` and
`--kui-list-item-border` on the list or row. Scope `--kui-list-item-color`,
`--kui-list-item-hover-background`, `--kui-list-item-selected-color`, and
`--kui-list-item-selected-background` at the same boundary for text and state
fills. The matching `--kui-list-item-hover-border` and
`--kui-list-item-selected-border` tokens set state outlines without replacing
ListItem CSS or neutralizing global semantic border colors.

Use `ListItemLink` from `@kerfjs/ui/list-item` for a navigation row with a
real `href`. It shares `ListItem` content slots, density, selection, and row
geometry while rendering a native anchor. `external` opens a new tab with
`noopener noreferrer` and announces that behavior in the default accessible
name. Disabled and loading links omit `href` and leave the tab order. Use
`ListItem` for an application action dispatched through `action`.

Use `Toolbar responsive="trailing-priority"` for a collapsible search in the
trailing zone that should take a full second row when expanded. `responsiveAt`
chooses the compact or narrow container breakpoint. The leading identity stays
in the first row. Set `centerAlign="balanced"` when the center zone must sit on
the toolbar's midpoint despite unequal or empty side content; it gives the
leading and trailing zones equal tracks. `--kui-toolbar-leading-min-width`,
`--kui-toolbar-trailing-gap`, `--kui-toolbar-trailing-justify`, and the
`--kui-toolbar-*-padding-inline` zone tokens adjust local geometry without
selecting toolbar anatomy from application CSS.
Set `--kui-toolbar-inset: 0px` on an embedded Toolbar that should have no outer
padding while keeping its `--kui-toolbar-gap` between control zones. The token
also reduces its minimum height by the removed inset; safe-area compensation
still adds to the chosen inset on claimed edges.

For compact dialog copy, use `Text flush lineHeight="tight"`; block Text still
resets native margins. `ValueTable density="compact"` reduces row padding and
gap. Its `--kui-value-table-row-columns`, `--kui-value-table-row-padding-block`,
and `--kui-value-table-row-gap` tokens support a specific metadata layout.
Use `ToolbarText size="xsmall"` for a dense rail heading. Use
`size="xlarge-fixed"` for a toolbar heading at the fixed 20px step; `xlarge`
retains the responsive page-title clamp. Pass `headingLevel` when the text is
a section landmark. A `TokenSearchField` editor can shrink to zero minimum width inside a narrow
group; set `--kui-token-search-editor-min-width` only when a wider editor is
required.

- `Toolbar` serves persistent app chrome and headings; the zone contents and accessible naming distinguish the purpose.
- `TabBar` changes tabpanels and supports overflow/reorder; `SegmentedControl` chooses among a few compact views; `Select` handles a longer value list.

Use `AppTab presentation="icon-only"` with its `name` kept as the accessible
tab name. For segmented tabs that should show names in a wide reader and icons
in a narrower container, set `TabBar iconOnlyAt="wide"` (832px), `"narrow"`
(704px), or `"compact"` (448px), and give each segmented `AppTab` a leading
icon. The tablist's own width controls the switch; the visually hidden name
remains its accessible name. Use `labelMaxWidth` for an ellipsized visible name. Set `attention`
to color a tab's name with `--kui-app-tab-attention-color`. Set `dropTarget`
while an app drag is over a tab's content; the tab keeps its selection semantics
and uses the `--kui-app-tab-drop-target-*` tokens for its highlight. Set
`nameOverflow="visible"` when an inline loading treatment needs the full name
instead of the default ellipsis. A `TabBar` owns its
scrolling strip; its public `--kui-tab-bar-strip-*` tokens configure strip
height, spacing, border, radius, background, and scroll inset without styling
its internal classes. `--kui-tab-bar-trailing-flex` controls the trailing zone.
For a distinct application action, use `end` to pin it at the far edge; use
`trailingPlacement="adjacent"` to keep a tab-local `trailing` action beside the
strip. Each zone accepts one `ToolbarControlGroup` or one standalone
`wa-button` for a primary action with its own chrome. Avoid wrappers and
application flex overrides.
Set `pinned` on the first `AppTab` when that tab must remain visible as peers
scroll. It stays inside the tablist and keyboard order. Set the `TabBar`
`snapTabs` prop when scrolling peers should settle at whole-tab starts
beside that pinned tab. `wireTabBars` measures the pinned inset and provides
enough end scroll room for the last peer to align there; a partial peer can
still appear at the trailing edge as an overflow cue. This mode also aligns a
newly selected tab at the pinned edge in LTR and RTL. Set the prop on the bar,
without styling its strip or tab internals.
Set the public
`--kui-app-tab-pinned-background` token if the surrounding surface differs from
the default; the pinned tab must cover peers as they scroll beneath it. Its
background also covers the strip's inline padding and border so scrolled labels
cannot paint beside the pinned edge, including in right-to-left strips. The
backing follows the tab's pill radius, keeping a selected pinned tab's corners
and shadow whole beside the overflow divider. Call
`wireTabBars` for keyboard selection and reorder behavior and its WebKit RTL
scroll correction.

- `StateBanner` persists beside affected work; `EmptyState` replaces absent content; `wa-callout` is contextual ecosystem content; `wa-toast` and `wa-toast-item` are transient and must not carry the only copy of important state.

For a banner with multi-line supporting copy, use `copyLayout="stacked"` to put
the detail below the title and badge. Use `actionPlacement="below"` when its
action needs a separate trailing row. The default values keep both inline;
`--kui-state-banner-copy-gap` and `--kui-state-banner-copy-row-gap` adjust the
stacked copy's spacing at an instance boundary.

For a compact `Select`, set `triggerWidth` to `"fit-content"`, `"max-content"`,
or `"fill"` and cap it with `--kui-select-trigger-max-width` when needed.
For a round icon-only toolbar trigger, set `selectedPresentation="icon-only"`
and `caret={false}`. The control keeps its accessible name, current choice help
tag, and keyboard-operated listbox; the selected icon stays centered even when
`renderSelected` supplies it. The default keeps the visible caret.
Custom `renderSelected` text inherits the control color by default; the
`--kui-select-selected-color`, `--kui-select-selected-font-size`, and
`--kui-select-selected-font-weight` tokens configure its typography. Plain
selected text stays on one ellipsized line when the trigger narrows.

For an unavailable entry, set `SelectChoice.disabled` and optionally
`disabledReason`; the option stays visible but cannot be chosen. A multiple
`Select` can opt in to `selectAllLabel` and `clearLabel` footer buttons.
Select all includes only enabled choices, Clear removes the selection, and
both report changes through the normal `input` and `change` events. The app
still owns the controlled `value` and localized action labels.

- `ResizableRegion` is an interactive controlled pane. `Grid` is the right answer for static equal-width columns; application CSS grid remains the answer for asymmetric or intrinsic tracks.
- A `ResizableRegion`'s content spans the whole region, like its separator. Give
  it one child — normally a `Pane` — and that child fills the region, so the
  pane reaches the region's far edge and owns scrolling for long content.
  Several children stack at their natural height. Do not size the child with
  application `height` rules. While expanded, slide-motion content follows the
  region's actual track, so a region its parent clamps (a `max-width`, a narrow
  container) never shows content past its separator; the fixed expanded size
  applies only while the collapsed content slides out.
- A `ResizableRegion` overlay automatically clamps both its track and fixed-size
  animated content to the responsive overlay maximum. Set the policy and maximum
  on the component instead of adding application descendant width/height fixes.
  It paints `--kui-color-surface` itself (an inline region stays transparent),
  so do not add a background to make an overlay opaque.
- Give `Workbench` panels a `toolbar` (title, `leading` / `center` / `trailing`
  groups, and a standard `toggle`) and the work area a `mainToolbar` /
  `mainBottomToolbar`: the Workbench moves a closed panel's groups marked
  `relocateOnCollapse`
  and toggle into the work area's toolbar, so never hand-place or duplicate
  panel toggles. See [Workbench panel toolbars](workbench.md#panel-toolbars).
- Configure application panels through the shared `separator`, `collapseMotion`,
  `contentOverflow`, `presentation`, `restoreControl`, and `restorePosition`
  props on `ResizableRegion`, `Workbench` panels, and `CollapsiblePanel`. These
  cover separator suppression, one-reflow collapse with composited motion,
  bottom-drawer popups, compact overlays or replacements, and safe-area restore
  placement without descendant `.kui-*` overrides. A `Workbench` rail's
  or bottom drawer's `responsiveOverlayAt` (like `ResizableRegion`'s
  `responsiveFillAt`) switches it to an overlay below a container breakpoint
  without a device-class check.
  `wireSidebar` also accepts a
  hidden compact replacement and keeps compact overlays exclusive by default.
- `TokenSearchField` is a structured editor. A native input or `wa-input` is the right answer for ordinary text.

For common structured search, use `createTokenSearchModel` from `@kerfjs/ui/token-search-model`, pass the model to `TokenSearchField`, and register it under the field id in `wireTokenSearchFields(root, { models })`. Rules parse `name:value` expressions and provide suggestions; the model owns chips, selection, removal, clear, and an optional evaluation result. Omit `model` and `models` for full manual control.

In a form, use `TokenSearchField presentation="form-field"` with its `label`,
optional `hint`, and `required` state. It renders a full-width control beside
`wa-input` without a Toolbar or extra inline inset. The app validates required
search content before saving.
The form-field corners and required marker use the same Web Awesome
form-control radius, marker color, and offset tokens as a neighboring
`wa-input`.
The four public color tokens (`--kui-token-search-background`,
`--kui-token-search-border`, `--kui-token-search-token-background`, and
`--kui-token-search-token-foreground`) inherit from an app ancestor or the
field's root. `className` marks that root, including the outer wrapper in
`form-field` presentation, so one app class can configure either form.
`TokenSearchRule.suggest(input, state)` receives the unfinished value and current committed tokens, so a rule can omit values already selected. Existing one-argument suggestion callbacks continue to work.
For a sibling date picker or other app helper, call `model.commit(value)` while a `name:` prefix is active. It parses and commits that value for the active rule even when it is absent from suggestions, replacing the unfinished prefix text. Invalid values and calls without an active prefix leave the query unchanged; `choose(value)` remains restricted to suggested tokens.
To apply a saved search or restore a query programmatically, call `model.replace({ query, tokens })`. It publishes parsed state and rebuilds the DOM-owned editor text even when no chip changed. For a field without a model, change the field's `revision` prop when setting `query` yourself.
When one root contains both kinds of field, a registered model enables chip keyboard behavior only for its own field. Other fields keep native editing unless the root opts into `keyboard` with an application removal callback.
For an icon action at the end of the field, pass `trailingAction` with `icon`,
accessible `label`, and delegated `action` (plus optional `id`). The component
renders a button that fills the trailing hit target. Reserve `trailing` for
passive content such as a shortcut hint.
Set `fill` on a collapsible `TokenSearchField` in a stretched Toolbar center to
use the available width when expanded; the field and its search group retain
their compact widths when collapsed.
When the expanded toolbar field has focus, its inset surface uses
`--kui-token-search-background` or the default surface color if that token is
unset.

`ToolbarControlGroup.tileTone` selects `neutral`, `brand`, `success`, `warning`, or `danger` quiet fill, matching quiet border, and on-quiet foreground for a non-interactive icon tile. Compose a contained `single` group whose only child is a direct decorative LucideIcon (`aria-hidden="true"`). Omission preserves the normal group palette. The prop does not recolor interactive, mixed, multi-control, or borderless groups; keep real actions in controls with their existing focus/hover/pressed treatments.

## Toolbar composition

Use `ToolbarText tone="dark"` on a loud or photo-backed toolbar surface to
match dark control groups. It applies to read-only headings and actionable
titles at every size; default tone retains existing identity and heading colors.

A `FloatingToolbar` accepts `ToolbarControlGroup` directly as its children in
both floating and inline placement. Name the toolbar with `label`; group its
controls as you would in a `Toolbar` zone.

A `Toolbar` has three zones — `leading`, `center`, and `trailing`. The direct
zone children are `ToolbarText` (identity/title text) and `ToolbarControlGroup`
(a control or cluster of controls). The `trailing` zone also accepts one
standalone `wa-button` for the application's primary action. It keeps its own
Web Awesome brand, danger, size, and hover chrome, while Toolbar aligns it in
the control band and wraps it with other trailing items when space is tight.
For a title that opens an editor, set `action` on a direct `ToolbarText`: it
renders a native button that keeps its content width when possible and
ellipsizes before an adjacent status chip when the leading zone narrows. The
application handles the delegated action and replaces it with its own input
while editing. Use a separate heading landmark if the view needs one.
Do not drop other bare buttons, inputs, links, or arbitrary markup straight
into a zone; wrap controls in a `ToolbarControlGroup` so they get the shared
toolbar geometry, hover/pressed treatment, and grouping. `SegmentedControl`,
`Select`, a collapsible `TokenSearchField`, and other Web Awesome controls live
**inside** a `ToolbarControlGroup`. For a page, panel, or
dialog heading, put an extra-large `ToolbarText` directly in the leading zone,
optionally preceded by a grouped icon, and group trailing actions. Keep supporting
copy below as app-owned content. Size the title to its track: a narrow
peripheral rail or drawer (a navigator, inspector, or console beside a work
area that carries the extra-large title, often with its own close control in
the header) labels itself with the default size, because extra-large truncates
there — "Inspector" becomes "Ins…" in a 160px rail. By default, nothing wraps
inside a `ToolbarControlGroup`: an icon sits beside its label on one row and the
group sizes to its content, so a row that does not fit relocates whole groups
through the toolbar's `responsive` policy. For independent action links that
must all remain visible, set `overflow="wrap"`: whole links move to another
row inside the group without breaking an icon from its label. Use
`overflow="scroll"` when a single-row action strip is intentional. A
toolbar draws no divider by default: pinned over or under scrolling content,
it gets one from the scroll state instead — the `Pane` it heads draws the line
only while content is scrolled beneath it, once `wireScrollDividers` is wired
(see [Scroll dividers](./layout.md#scroll-dividers)). Set `dividerSides` to the
canonical physical-edge combinations (`t`, `r`, `b`, `l`, in that order—for
example `b`, `tr`, or `trbl`) only when the toolbar owns a permanent separator
edge. Dividers earn their place: never fake one with a border or pad below one
to make it look right.

`Toolbar` renders a semantic `header` by default. Set `position="footer"`
for a toolbar at the bottom of a pane or page; Workbench's
`mainBottomToolbar` and the catalog resource bar apply this automatically.
The position changes the HTML element without changing zones or geometry.

Common toolbar patterns:

For a long-running icon action, set `busy` on its single-control
`ToolbarControlGroup` and supply a descriptive `busyLabel`. The group preserves
the control's dimensions, shows `LoadingSpinner` in its icon slot, sets
`aria-busy`, and makes the control inert until the app clears `busy`.

| Want                           | Put in the zone                                                                        | Notes                                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Identity or title text         | `<ToolbarText text="…" size="large" />` (or `xlarge` for a page/panel title that fits) | Wrap in a `single` borderless group only when it must align with adjacent control pills                           |
| One or more icon/text buttons  | `<ToolbarControlGroup>{buttons}</ToolbarControlGroup>`                                 | Use `buttonAppearance="push"` for toggle buttons with `aria-pressed`; `single` for a lone control                 |
| One primary application action | `trailing={<wa-button variant="brand">New ticket…</wa-button>}`                        | The standalone button keeps its Web Awesome chrome; use `variant="danger"` when the action is destructive         |
| An exclusive view switch       | `<ToolbarControlGroup><SegmentedControl … /></ToolbarControlGroup>`                    | Not `TabBar`, which switches tabpanels                                                                            |
| A value list                   | `<ToolbarControlGroup><Select … /></ToolbarControlGroup>`                              | Register `@kerfjs/ui/select/register` once; use `focusRingOwner="group"` so focus follows the group's geometry    |
| A command menu                 | `<ToolbarControlGroup single nestedDropdown><PopupMenu … /></ToolbarControlGroup>`     | Register `@kerfjs/ui/popup-menu/register` once; set `menuInset` on the group                                      |
| A collapsible search box       | `<ToolbarControlGroup single><TokenSearchField collapsible … /></ToolbarControlGroup>` | The group animates the iconic ↔ expanded states; `wireTokenSearchFields` manages expand/collapse/focus by default |

### Popup menu migration

A **popup menu in a toolbar** is a `PopupMenu` (`@kerfjs/ui/popup-menu`) in a
`single` `ToolbarControlGroup` with `nestedDropdown`; the group sizes the trigger
as a toolbar button and `menuInset` sets the menu's inset. `PopupMenu` renders the
Web Awesome dropdown, its trigger, and its typed items (commands, headings, and
dividers), and keeps Web Awesome's managed children out of the morph. Register
`@kerfjs/ui/popup-menu/register` once. Do not hand-write `wa-dropdown` markup for a
menu.

```tsx
<ToolbarControlGroup single nestedDropdown menuInset="compact">
  <PopupMenu
    label="Sort"
    icon={<LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />}
    items={[
      { label: "Recently updated", action: "sort-recent" },
      { label: "Priority", action: "sort-priority" },
    ]}
  />
</ToolbarControlGroup>
```

Nested decisions use an item with `submenu`. Children keep their own actions,
`attributes` metadata, icons, `checked` state, disabled state and
`disabledReason` tooltip. Nested `heading` and `divider` entries group those
commands without entering keyboard navigation. `tone: 'danger'` maps to the Web Awesome destructive
variant. A parent can sit among ordinary commands and dividers, so the same
items shape covers single-line and batch actions; compute each batch child's
`disabled` state from the current selection.

```tsx
<PopupMenu
  label="Line actions"
  items={[
    { label: 'Copy reference', action: 'copy-reference', attributes: { 'data-item-id': lineId } },
    { label: 'Decide', submenu: [
      { kind: 'heading', label: 'Review' },
      { label: 'Approve', action: 'decide', checked: current === 'approve', attributes: { 'data-item-id': lineId, 'data-decision': 'approve' } },
      { label: 'Reject', action: 'decide', tone: 'danger', disabled: needsPrice, disabledReason: needsPrice ? 'Add a price first' : undefined, attributes: { 'data-item-id': lineId, 'data-decision': 'reject' } },
      { kind: 'divider' },
      { label: 'Other…', action: 'choose-other' },
    ] },
    { kind: 'divider' },
    { label: 'Remove', action: 'remove', tone: 'danger' },
  ]}
/>
```

For a flat command menu with persistent sort choices, group commands under
`heading` entries and set `checked` explicitly on each choice. Checked rows
show a checkmark; the background marks the current keyboard row, as in `Select`.
Only items with `checked: true` or `checked: false` reserve checkmark space.
Omit `checked` for a plain command, including one beside checkbox items.
Commands still dispatch their own `data-action` once on pointer and keyboard
selection.

For a row opened by right-click, render `PopupMenu` with `context`, `label`,
and a stable root `data-*` marker. Its trigger is an invisible anchor removed
from the accessibility tree; a separate visible button may stay disabled. In
the app's `contextmenu` handler, find that root, call `openPopupMenuAt` with
the menu and `event.clientX` / `event.clientY`, and prevent the browser
menu. Call `closePopupMenu` for programmatic dismissal. The pointer anchor
retains Web Awesome's collision placement, focus management, submenu keyboard
navigation, and outside/Escape dismissal.

## Configuring recurring list rows

Configure the List family instead of selecting its descendant classes. Use
`density="compact"` for result-heavy panes, `description` for the secondary
label line, `status` for dormant state text, and `busy` for known progress that
keeps current content visible. `divider` marks group boundaries without an
app-owned separator rule. `ListHeader.indicatorTone` gives count, badge, or
status content neutral, accent, pop, or danger attention. Pop marks featured or
novel content without claiming a status transition.

When a row needs a context action, use `ListActionRow`; its two native buttons
remain siblings. `trailingActionVisibility="interaction"` keeps the action
available on hover and keyboard focus and automatically leaves it visible on
non-hover devices. These props own presentation only—the application still
owns labels, status meaning, action policy, selection, and domain metadata.

## Correct composition and duplicated-markup trap

Correct: let the pane stay unpadded while its children own the shared 8/1/8
geometry and 44px targets.

```tsx
<Pane element="aside" contentElement="nav" label="Workspace" contentLabel="Workspace pages">
    <section>
      <ListHeader label="Workspace" />
      <ListItem action="open" label="Inbox" icon={inboxIcon} />
      <ListActionRow
        action="open-file"
        label="main.ts"
        trailingAction="file-actions"
        trailingActionLabel="Actions for main.ts"
        trailingActionIcon={moreIcon}
      />
    </section>
    <ContentItem>Workspace details</ContentItem>
</Pane>
```

When that child is a selectable card, configure `ContentItem` with
`interactive`, `action`, `itemId`, and a `selectionMode`; wire
`wireContentItems` once for Enter and Space. The component owns selection,
hover, focus, and disabled paint in its reserved 1px frame (see
[Content items](./layout.md#content-items)).
For a multi-select card containing its own controls, place
`selectionMode="multiple"` ContentItems inside a labeled
`List selectionMode="multiple"`; the app supplies each card's `selected`
state and handles range gestures.
For wrapped document tiles, use `Grid minColumnWidth={px(160)}` with
`selectionMode="multiple"` and `ariaLabel`. The same ContentItem row/gridcell
contract applies, while `wireContentItems` follows the rendered tile layout
with all four arrow keys.

Incorrect: duplicating component-like rows and compensating for nested padding
forks the package anatomy and spacing contract.

```tsx
<aside class="sidebar padded">
  <h2 class="list-header-copy">Workspace</h2>
  <button class="menu-row-copy padded">Inbox</button>
  <div class="panel indented-with-negative-margin">Workspace details</div>
</aside>
```

## Removable tags

Use `Chip` when a short tag has a remove action. `removeAction` becomes the
native button's `data-action`; `removeLabel` must name the specific tag for
assistive technology. Use `itemId` for the application's delegated handler.
The application updates its tag list after the action. `size="compact"` uses a
20px chip with a 16px remove button, and `disabled` disables removal. Tone,
appearance, and shape use the same semantic choices as `Badge`; use `Badge`
when no removal is needed and the content is status or count metadata.
Pass an unsized, decorative `LucideIcon` through `icon` for a leading glyph;
Chip sizes it to its own type scale and aligns it beside the label. For a long
plain-text label, set `truncate`: the chip can shrink within a `Row`, its label
gets a one-line ellipsis, and the full string is the label's native `title`.
Keep a price or other unbreakable sibling in `Text wrap="nowrap"`. `truncate`
requires a string label so the title cannot lose text hidden inside markup.

```tsx
<Chip
  size="compact"
  tone="info"
  itemId={tag.id}
  removeAction="remove-tag"
  removeLabel={`Remove ${tag.name} tag`}
>
  {tag.name}
</Chip>
```

## Web Awesome overlap policy

Web Awesome catalog coverage means supported and themed, not preferred. Import
`@kerfjs/ui/webawesome` for Kerf JSX types, individual component modules for
registration, and the CSS-only `@kerfjs/ui/webawesome.css` theme. The UX catalog
marks the superseded or exceptional choices below with a visible `Discouraged`
tag; Popup remains untagged because low-level anchored positioning can be the
right primitive. Never render a `Discouraged` element directly in application,
demo, or recipe markup: reach it only through the Kerf component that wraps or
replaces it (`PopupMenu` renders `wa-dropdown`; `Select` renders `wa-select` /
`wa-option`), and file a component gap rather than dropping to the raw tag.

| Web Awesome choice                                                 | Kerf decision                                                                                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wa-button`, `wa-dropdown`, `wa-dropdown-item`                     | Use buttons for actions and `PopupMenu` for a command menu, never raw dropdown markup. Use `ListItem` for a navigation row and `Select` for a value.  |
| `wa-button-group`                                                  | Use only for exceptional grouped actions; use `SegmentedControl` for one-of-many selection.                                                           |
| `wa-input`, `wa-tag`                                               | Use `Chip` for removable or disabled tags; use `TokenSearchField` only when text and ordered filter tokens form one editor.                           |
| `wa-select`, `wa-option`                                           | Use `Select`, which owns Kerf spacing, controlled rendering, icon stability, and explicit registration.                                               |
| `wa-tab-group`, `wa-tab`, `wa-tab-panel`                           | Use `TabBar`/`AppTab` for application tabs or `SegmentedControl` for compact local views.                                                             |
| `wa-icon`                                                          | Use `LucideIcon` in application UI.                                                                                                                   |
| `wa-split-panel`                                                   | Use `ResizableRegion` for Kerf application panes; retain Split Panel only when its distinct API is required.                                          |
| `wa-spinner`, `wa-progress-bar`, `wa-progress-ring`, `wa-skeleton` | Use `LoadingSpinner` for compact Kerf indeterminate activity; choose the ecosystem component when its distinct progress or placeholder semantics fit. |
| `wa-callout`, `wa-toast`, `wa-toast-item`                          | Use `StateBanner` for persistent inline app status, `EmptyState` for absent content, and toasts only for transient feedback.                          |
| `wa-popup`, `wa-tooltip`, `wa-popover`                             | Prefer the high-level interaction whose semantics fit. Use Popup only when its low-level anchored positioning removes custom placement code.          |
| `wa-tree`, `wa-tree-item`, `wa-animated-image`, `wa-comparison`    | Use only for the specialized behavior named by the component.                                                                                         |
| `wa-zoomable-frame`                                                | Avoid for application UI; keep embedded-media behavior application-owned.                                                                             |

All other entries in the [Web Awesome theme contract](./webawesome-theme.md#coverage)
remain supported when their native semantic contract matches the product need.

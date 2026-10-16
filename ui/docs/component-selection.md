# Component selection and composition

Start with the interface need, not an export name or a screenshot resemblance.
Use the shipped [`component-catalog.json`](../ai/component-catalog.json) when a
tool needs exhaustive structured facts; this page remains the concise human
decision procedure.

1. Search the [Kerf UX catalog](./ux-demo.md). Prefer a Kerf UI component, then a native HTML element, using each naturally for what it is good at. When neither fits and the need recurs, file a component gap. Web Awesome is an optional integration: an application that has adopted it (see [Web Awesome integration](#web-awesome-integration)) may also use its remaining supported elements, but never one a Kerf component replaces.
2. Reuse a primitive when its purpose, anatomy, state, and interaction match.
3. Compose primitives for recurring layout through public props and tokens. Do not select one component from another component's stylesheet.
4. Add a thin application adapter for product copy, domain mapping, actions, routing, persistence, permissions, and transport.
5. Use custom markup only when the semantic contract differs. If the pattern recurs across products, open an upstream component or recipe request.

The application adapter is usually a plain function that maps domain state to
component props plus stable `data-action` values. It is not a fork of package
markup or CSS.

## Decision pass before JSX or CSS

Make these choices in order for each region, including a region copied from a
mockup or another application:

1. **Name the job.** What does the person read, choose, edit, or navigate? What
   state and keyboard behavior must survive? Search the Kerf catalog, then the
   consuming application's catalog. Choose by that contract, not by a similar
   silhouette. For example, use `ContentItem` for an owned content surface,
   `List` for vertical rhythm, `Grid` for equal responsive tracks,
   `Toolbar`/`ToolbarText` for a heading with actions, and `PopupMenu` for a
   command menu. `SearchField` is for text plus filter chips; an ordinary
   search input does not gain tokens just to use that component.
2. **Reuse, compose, then extend.** If a component already owns the job,
   configure it. If several primitives form the job, compose them and keep
   product data/actions in a thin adapter. Create an application component when
   it owns a repeatable domain contract or genuinely new structure. If the
   missing contract would benefit other applications, file a Kerf component or
   recipe gap. Do not clone a component's markup to make a local variant.
3. **Give every element and class a reason.** An element should supply semantic
   meaning, an interaction target, an accessibility relationship, or layout
   that no selected component already owns. Put accepted content directly in
   the component's props/slots; delete wrapper `div`/`span` elements and
   fragments used only for spacing, styling, or satisfying a child type. Add a
   CSS class only for an application-owned selector, not to restyle a Kerf
   root; use stable `data-action` hooks for behavior. Native links, tables,
   and form controls still belong where their native semantics are the right
   contract.
4. **Assign geometry once.** Decide which component owns the surface, inset,
   scrollport, and each gap before adding styles. Align neighboring text edges
   and control edges; group related items tightly and separate distinct
   sections with a larger step from the shared scale. Leave useful empty space
   around a short form or sparse state instead of filling it with decorative
   cards, labels, or dividers. Use a public edge-to-edge or inset option where
   available; a negative margin or compensating wrapper is a sign to revisit
   ownership. Check narrow and intermediate widths before choosing fixed
   columns or dimensions.
5. **Compare the finished composition.** Inspect it beside adjacent screens
   and the catalog specimen, then in a real browser at wide and narrow widths.
   Check reading order, content edges, wrapping, clipping, whitespace, scroll
   ownership, focus, and active/empty/loading states. Revise the component
   choice or composition when the result needs repeated CSS corrections.

The package's defaults are the starting design, not an empty canvas. A custom
component or rule should explain which missing behavior or structure it owns.

Write the copy by the package rule as you choose components: a component's
naming props (button and menu-item labels, segment and `Select` choices,
`ToolbarText` titles, `ListHeader` labels, field labels) take title style, and
its describing props (`description`, `detail`, hints, placeholders, tooltips,
option text, status) take sentence style. See
[Writing interface copy](./writing.md#capitalization).

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
Pass `gap={{ column: 'none', row: 'm' }}` when the axes need different values;
each axis accepts the same token or complete typed length as the scalar form.
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
<Grid columns={3} gap={{ column: 'none', row: 'm' }}>...</Grid>;
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
| Media detail page                   | [Catalog](../ux-demo/) · `?component=recipe-media-detail`          |

Recipes use public production exports and show ownership boundaries; they are
copyable reference compositions, not new monolithic components.

When presenting a component or recipe in a Catalog, use the authoritative
[Catalog demo authoring contract](./catalog.md#catalog-demo-authoring-contract)
rather than deriving preview structure from these
selection entries.

## Missing recurring concepts

For arbitrary interactive help or popup content beside a control, use
[`openAnchoredSurface`](anchored-surface.md) with an accessible label; use
`openAnchoredSurfaceAt` for pointer coordinates. It owns the Kerf UI surface,
placement (an 8px viewport gutter, and a height fitted to the room beside the
anchor with scrolling content), focus, dismissal, and modal-dialog hosting while
the app owns its content and action policy. Never add media queries or
`max-height` overrides to make a surface fit a phone. For a popup anchored to
dark media chrome (a `ToolbarControlGroup tone="dark"` over a preview), pass
`tone: 'dark'` rather than building an app-owned dark panel: the surface takes
the group's inverse tone and its content inherits the matching colors. Use
`PopupMenu` for a typed command list.

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

| Interface need                                                                                                                | Use when                                                                                                                                                                                                                                                                                                                                                                                                  | Do not use when; nearest alternative                                                                                                                                                                                                                                                                                                       | Required wiring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Application owns                                                                                                                                         | Import                                                                                    | Recipe                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Icon — `LucideIcon`                                                                                                           | A decorative or explicitly labeled Lucide-compatible icon belongs in app UI.                                                                                                                                                                                                                                                                                                                              | Do not use an icon as the only name of an unfamiliar action; add visible or accessible text. Prefer it over Web Awesome `wa-icon`.                                                                                                                                                                                                         | None.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Icon choice and meaningful label.                                                                                                                        | `@kerfjs/ui/lucide-icon`                                                                  | [Accessibility](./accessibility.md#shared-rules)                                               |
| Compact metadata — `Badge`                                                                                                    | A short status, count, category, or metadata label needs self-owned visual treatment configured by semantic props.                                                                                                                                                                                                                                                                                        | Do not use it as a button, link, or removable chip. Do not restyle consuming-component descendants to create a badge.                                                                                                                                                                                                                      | Choose `tone`, `appearance`, `shape`, and `size`; supply `label` for abbreviated content or `ariaHidden` when a surrounding component already owns the same accessible text. For new content without a count use the text-free `size="dot"`, which requires `label` or `ariaHidden`. Set `maxWidth` to truncate long app-supplied text with an ellipsis and a hover `title`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Metadata text, semantic tone mapping, and abbreviated-content labeling.                                                                                  | `@kerfjs/ui/badge`                                                                        | [Component ownership](./component-contract.md#ownership-boundaries)                            |
| Disclosure indicator — `DisclosureArrow`                                                                                      | A control needs one animated 18px root-scaled visual for open and closed state, including configurable directions or a replacement icon.                                                                                                                                                                                                                                                                  | Do not use it as the interactive control or accessible name; place it inside the button or control that exposes expanded state.                                                                                                                                                                                                            | Pass the controlled `open` state, render it inside the owning control, author replacement icon content facing right before transforms, and override `--kui-disclosure-arrow-size` only when another visual size is required. Direction changes use the shortest rotation path, with counterclockwise chosen for a 180-degree closed-to-open tie.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Open state, interaction, accessible name, size override, replacement glyph, direction choices, and shortest-path rotation.                               | `@kerfjs/ui/disclosure-arrow`                                                             | [Component ownership](./component-contract.md#ownership-boundaries)                            |
| Application toolbar or heading — `Toolbar`                                                                                    | Leading identity, optional centered content, and trailing controls form one horizontal app bar or a page/panel/dialog heading.                                                                                                                                                                                                                                                                            | Do not add bespoke heading geometry or a private wrapper; use the same zone contract everywhere.                                                                                                                                                                                                                                           | Put identity/title text directly in a zone as `ToolbarText`; group controls and icon tiles in `ToolbarControlGroup`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Actions, command availability, responsive relocation, state, and supporting copy below a heading.                                                        | `@kerfjs/ui/toolbar`                                                                      | [Toolbar composition](../README.md#component-subpaths)                                         |
| Toolbar control cluster — `ToolbarControlGroup`, `ToolbarActionLink`                                                          | Related toolbar buttons, semantic links, compact/tight controls, avatar actions, or a dropdown trigger/menu surface need one configured chrome contract.                                                                                                                                                                                                                                                  | Do not use it merely to align unrelated controls. Do not restyle anchors or dropdown parts in application CSS; use `ToolbarActionLink`, `overflow`, and `menuInset`. Web Awesome `wa-button-group` is only for an exceptional grouped-action contract.                                                                                     | Delegate child actions; use `ToolbarActionLink` for native navigation, `overflow="scroll"` for bounded action rows, and `menuInset` for dropdown surface padding. Use `avatarImage` instead of inserting an `img`; use `SegmentedControl` for an exclusive choice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Actions, destinations, pressed/expanded state, content, and policy.                                                                                      | `@kerfjs/ui/toolbar-control-group`                                                        | [Component ownership](./component-contract.md#ownership-boundaries)                            |
| Floating controls over content — `FloatingToolbar`                                                                            | A small cluster of controls (e.g. a drawer restore) must float over scrolling content — distinct and forced-dark — inside a positioned container.                                                                                                                                                                                                                                                         | Do not use it for a primary page or panel toolbar (use `Toolbar`), or for anything that must sit above dialogs/overlays — it is not top-layer.                                                                                                                                                                                             | Compose `ToolbarControlGroup`s and delegate their actions; the app owns visibility and position.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Controls, visibility, and position.                                                                                                                      | `@kerfjs/ui/floating-toolbar`                                                             | [Component subpaths](../README.md#component-subpaths)                                          |
| Toolbar identity text — `ToolbarText`                                                                                         | A toolbar needs extra-large (page/panel title), large, default, or compact textual identity.                                                                                                                                                                                                                                                                                                              | Plain text is not a heading by default; when a title needs heading semantics pass `headingLevel`. Sizes below `xlarge` are intentionally quiet identity text in default tone — do not use them as a normal-color subsection title; use `Text` with an `h2`–`h6` variant, or `ListHeader` for a list section.                               | Optional `headingLevel` for `role="heading"` + `aria-level`. Defaults to one line, ellipsized when it does not fit; `wrap` flows onto multiple lines, `ellipsis` toggles the trailing …, and `maxLines` caps a wrap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Text, heading level, overflow behavior, and responsive priority.                                                                                         | `@kerfjs/ui/toolbar-text`                                                                 | [Toolbar composition](../README.md#component-subpaths)                                         |
| Semantic block or inline text — `Text`                                                                                        | Ordinary application copy needs native `h1`–`h6` or `p` semantics plus standard geometry, or inline secondary copy needs a native `span` without box geometry.                                                                                                                                                                                                                                            | Do not choose heading levels for appearance alone or recreate muted, error, small, or code utility classes. Use `ToolbarText` for toolbar identity/title content and `ListInsetText` when list-aligned prose needs full margin/border/padding geometry.                                                                                    | Omit `variant` for the default `p`, choose `h1`–`h6` from the document outline, or choose `span` inside a row, label, or table cell. Independently compose `tone="quiet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | danger"`, `size="compact"`, and `font="monospace"`; ordinary native global, `data-_`, and `aria-_` attributes pass through.                              | Copy, localization, semantic variant, presentation roles, and document heading hierarchy. | `@kerfjs/ui/text`                                                                              | [Text](./layout.md#text) |
| Vertical stack — `List`                                                                                                       | Rows, sections, or arbitrary components need a consistent vertical stretch layout, optional standard/custom gap, flex growth, one vertical scroll owner, or edge dividers.                                                                                                                                                                                                                                | It is layout-only and does not provide `ul`/`ol` semantics. Do not nest scroll owners or use it when a horizontal layout is required.                                                                                                                                                                                                      | Choose `gap`, `flex`, `scrollable`, and canonical `dividerSides` (`t`, `r`, `b`, `l` combinations in that order); bound the block size when scrolling.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Child semantics/content, containing height, and which optional layout behaviors apply.                                                                   | `@kerfjs/ui/list`                                                                         | [Pane geometry](../README.md#pane-and-content-geometry)                                        |
| Equal-width columns — `Grid`                                                                                                  | Equal-width sibling columns need a fixed count or should collapse as their container narrows, while preserving equal tracks despite intrinsic child widths.                                                                                                                                                                                                                                               | Do not use it for intrinsic, asymmetric, spanning, or masonry tracks; use application-owned CSS grid. Do not use it for a user-operable separator; use `ResizableRegion`.                                                                                                                                                                  | Choose fixed `columns` or typed `minColumnWidth`, plus typed `gap`, optional `flex`, and physical-side `textInsets` / `controlInsets` when the track group needs a standard text or control inset; text wins on overlap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Child semantics/content, outer width, fixed count or minimum width, and typed gap/flex/inset choices.                                                    | `@kerfjs/ui/grid`                                                                         | [Grid](./layout.md#grid)                                                                       |
| Board of columns — `ColumnTrack`                                                                                              | A board shows parallel columns (kanban lanes) that must keep a readable width and scroll sideways, or page one at a time on a phone.                                                                                                                                                                                                                                                                      | Do not use it for a wrapping responsive grid; use `Grid`. Do not use it for two resizable panes; use `SplitView`. Do not re-track a `Grid` from app CSS.                                                                                                                                                                                   | Pass columns as children (each owns its inset and vertical scroll); set `minColumnWidth` (default 250px) or `layout="paged"` with an optional `peek` for phones. Name it with `rootAttributes`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Columns, their content, the layout choice per device, and drag and drop.                                                                                 | `@kerfjs/ui/column-track`                                                                 | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Two contents swapped in place — `ContentSwap`                                                                                 | A region swaps between two contents in place, such as a dialog's two steps or a footer's changing actions, and the change should read as motion.                                                                                                                                                                                                                                                          | Do not use it for full views with toolbars; use `NavStack`. Do not hand-roll stacked cells, inert handling, or push keyframes.                                                                                                                                                                                                             | Set `active` to `a` or `b`, `transition` (`push`, `crossfade`, `none`) and the push `direction`; pass `label` to name it and `slot`/`fill` for a dialog label or footer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | The active side, the direction, both contents, and the region name.                                                                                      | `@kerfjs/ui/content-swap`                                                                 | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Navigation row — `ListItem`                                                                                                   | A pane or navigation area needs a selectable, disabled, dormant-trailing, or multiline action row.                                                                                                                                                                                                                                                                                                        | Do not put a control in `trailing`; use `ListActionRow` when the trailing region must be independently interactive. Use an `<a>` for navigation that must retain link behavior, a native `<button>` for an ordinary action, or implement the complete ARIA menu widget.                                                                    | Delegate its `data-action`; compose inside a `.kui-content` section. Put domain event/drop metadata in `rootAttributes` rather than adding wrapper markup. The rounded root clips overflowing descendants; set `multiline` when the primary label should wrap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Routing, selection, permissions, copy, action handling, and domain `data-*` values.                                                                      | `@kerfjs/ui/list-item`                                                                    | [Pane geometry](../README.md#pane-and-content-geometry)                                        |
| Navigation row with trailing action — `ListActionRow`                                                                         | A full-width row needs a selectable primary action and an independently focusable trailing action.                                                                                                                                                                                                                                                                                                        | Use `ListItem` when trailing content is dormant metadata. Do not put controls inside the row's `label`, `icon`, or `trailingActionIcon` SafeHtml slots. Do not use `TabBarItem` outside tablist semantics or `ToolbarControlGroup` outside a toolbar.                                                                                      | Delegate both action strings; update controlled selection and any popover/context-menu state in the app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Routing, selection, both action policies, domain metadata, and popover/context-menu behavior.                                                            | `@kerfjs/ui/list-action-row`                                                              | [Accessibility](./accessibility.md#listactionrow)                                              |
| Navigation section heading — `ListHeader`                                                                                     | A menu section needs a full-width label, semantic count, non-count badge, logical-end action, or real disclosure state.                                                                                                                                                                                                                                                                                   | Do not concatenate counts into `label` or put numeric content in `badge`; use `count` with the localized full phrase in `countLabel`. Do not add a disclosure arrow to navigation that reveals nothing. Keep its 44px hit target; do not resize its 36px square. Do not use it as a page, panel, or dialog title; use a heading `Toolbar`. | Delegate its optional action; the app controls expanded state and revealed content. Toggle mode supplies `DisclosureArrow` unless `actionIcon` replaces it. Use `triggerAttributes` only for domain `data-*` or a native popover relationship.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Section organization, valid count and localized count label, disclosure state and content, non-count badge content, popover target behavior, and policy. | `@kerfjs/ui/list-header`                                                                  | [Pane geometry](../README.md#pane-and-content-geometry)                                        |
| Inset self-bordered control — `ListInsetControl`                                                                              | A control that owns its own border and padding but no outer margin (a search input, a `SegmentedControl`) must line up inside a `.kui-content` list with the standard 8px inline margins and stretch to fill the row.                                                                                                                                                                                     | Do not wrap a `.kui-content-item` or a `ListItem`/`ListHeader` that already owns its inline margin — that double-insets it. Do not add ad-hoc `margin`/`padding` around a bare control to align it; use this instead.                                                                                                                      | Place the self-bordered control(s) as children; they stretch to fill. It applies only the inline margin, flex stretch, and 8px gap — the child owns its own border and padding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | The control(s), their state, and action wiring.                                                                                                          | `@kerfjs/ui/list-inset-control`                                                           | [Pane geometry](../README.md#component-subpaths)                                               |
| Inset bare text — `ListInsetText`                                                                                             | A plain string or inline content with no margin, border, or padding of its own must sit in a `.kui-content` list with its text edge aligned to the bordered items around it.                                                                                                                                                                                                                              | Do not use it to wrap a component that already owns content-item geometry (`ListItem`, `StateBanner`, a `.kui-content-item`) — that double-insets it. Do not hand-roll the 8px margin / 1px border / 8px padding.                                                                                                                          | Pass the text or inline `SafeHtml` as children; it supplies the 8px inline margin, 1px transparent border, and 8px padding so the text edge lands at the standard 17px inset. Pass `sides="rl"` to keep that horizontal inset but drop the vertical margin, border, and padding for tight text layout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | The text, copy, and localization.                                                                                                                        | `@kerfjs/ui/list-inset-text`                                                              | [Pane geometry](../README.md#component-subpaths)                                               |
| Self-contained content child — `ContentItem`                                                                                  | An ordinary surface-like child of a `Pane` or `.kui-content` stack needs the shared 8px margin / 1px border / 8px padding geometry; pass `frame="framed"` only when it marks a real distinction, `appearance="surface"` or a semantic appearance for coordinated surface colors, and `shape="pill"` for the 22px radius.                                                                                  | Do not wrap a component that already owns content-item geometry (`ListItem`, `ListHeader`, `StateBanner`, `Toolbar`, `ValueTable`) or pad around it — that double-insets. Do not frame an item only to make it look contained. Use `SunkenPanel` for a lowered inset stack and `ListInsetText` for bare text that only needs to align.     | Pass the item content as children; choose `appearance` (`transparent` default, `surface`, or a semantic status), `frame`, and `shape` instead of writing CSS. Put safe `data-*` metadata in `rootAttributes`; `ariaLabel` names a distinct region and `focusTarget` makes it a programmatic focus target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The content, surface or status appearance, and whether it marks a distinction worth a visible frame.                                                     | `@kerfjs/ui/content-item`                                                                 | [Content items](./layout.md#content-items)                                                     |
| Application column — `Pane`                                                                                                   | A sidebar, main area, inspector, or dialog needs shared vertical header/content/footer organization, one scroll owner, and optional edge separators.                                                                                                                                                                                                                                                      | Do not pad the pane shell, wrap child-owned geometry in competing insets, invent unrelated centered measures, or leave an icon-only rail for a hidden pane.                                                                                                                                                                                | Import `Pane`, use `children` for its homogeneous primary content and the named `SafeHtml` prop slots `header`/`footer` for optional fixed chrome, then opt into only the needed logical-edge separators; add `ContentItem` children as needed. On compact devices set `compactChrome` (`scroll` or `overlay`) through the container's `pane` configuration, and call `wirePaneChrome(root, { header, footer })` from `@kerfjs/ui/wire-pane-chrome` so open overlay chrome closes on Escape or an outside press. A visible pane owns collapse in its toolbar; move a hidden inline-start pane's restore control to the main toolbar leading edge and an inline-end pane's restore control to its trailing edge.                                                                                                                                                | Layout hierarchy, reading width, responsive relocation, pane visibility state, slot semantics, labels, and separator placement.                          | `@kerfjs/ui/pane`                                                                         | [Pane anatomy](./layout.md#anatomy)                                                            |
| Scroll dividers — `wireScrollDividers`                                                                                        | Pinned chrome (a `Pane` header or footer, a `NavStack` top chrome or bottom toolbar, a `TabNavigator` bar, the sides of a `TabBar` strip, or app-owned chrome around a scroller) needs a divider only while content is scrolled away beneath it.                                                                                                                                                          | Do not keep a static toolbar divider to fake it or write a border onto another component; each component draws its own line from the wiring's state.                                                                                                                                                                                       | Call `wireScrollDividers` once at the app root and retain the disposer; it covers every `Pane`, `NavStack`, `TabNavigator`, and `TabBar` below it. Name app-owned arrangements in `targets` by id; a `Toolbar` or `List` named as chrome draws its facing side. Configure a pane with `chromeDividers` (`scroll` default, `always`, `none`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Which panes follow the scroll, app-owned targets, and the disposer.                                                                                      | `@kerfjs/ui/wire-scroll-dividers`                                                         | [Scroll dividers](./layout.md#scroll-dividers)                                                 |
| Keyboard focus scroll in scrollable Lists — `wireListFocusScroll`                                                             | Rows of a `scrollable` List are reached by keyboard (Tab, or the app's own arrow-key focus moves) and must come fully into view, focus ring included, in Firefox and Safari too: their `focus()` leaves a partly hidden row clipped.                                                                                                                                                                      | Do not call `scrollIntoView` from app focus handlers or style the List; do not wire it for pointer-only lists.                                                                                                                                                                                                                             | Call `wireListFocusScroll(root)` once at the app root and retain the disposer. On keyboard (`:focus-visible`) focus inside a `scrollable` List it scrolls the focused element into view only when its ring crosses the clip; pointer focus is left alone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The disposer.                                                                                                                                            | `@kerfjs/ui/wire-list-focus-scroll`                                                       | [Framed result pickers](./layout.md#framed-result-pickers)                                     |
| One-pane navigation — `NavStack`                                                                                              | A compact flow pushes into details while keeping earlier views mounted, or a single-pane screen needs the same stable layout contract.                                                                                                                                                                                                                                                                    | Do not use it when list and detail should remain visible together; use `SplitView`. Do not use it alone for co-equal top-level destinations; use one stack per `TabNavigator` tab.                                                                                                                                                         | Keep the ordered view array controlled, put view-specific bottom chrome on each view (or use the component fallback), import its CSS explicitly, and call `wireNavStack` for back delegation, content-slide/chrome-cross-fade transitions, and focus move/restore. Mark a preferred initial target with `data-nav-focus` when DOM order is insufficient.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | View keys/content/titles, push and pop actions, preferred initial focus targets, and per-view or persistent bottom toolbar content.                      | `@kerfjs/ui/nav-stack`                                                                    | [App-layout decision matrix](./app-layouts.md#decision-matrix)                                 |
| Responsive list-detail — `SplitView`                                                                                          | A primary list and related detail belong together on roomy devices but become a one-pane drill-down on compact devices.                                                                                                                                                                                                                                                                                   | Do not use it for a single linear flow or a multi-panel editor shell.                                                                                                                                                                                                                                                                      | Provide controlled selection/detail state and device class; opt into resize wiring only when the separator is user adjustable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Selection, detail content, compact back action, device policy, and optional persisted width.                                                             | `@kerfjs/ui/split-view`                                                                   | [App-layout decision matrix](./app-layouts.md#decision-matrix)                                 |
| Compact top-level destinations — `TabNavigator`                                                                               | A handset or portrait-tablet app has two to five co-equal destinations whose scenes and nested navigation must remain mounted across switches.                                                                                                                                                                                                                                                            | Do not use it for document tabs, reorderable work items, or a desktop navigation rail.                                                                                                                                                                                                                                                     | Keep the active id controlled, import its CSS explicitly, and call `wireTabNavigator`; commonly place one `NavStack` in each tab scene.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Destination definitions, active id, routing, persistence, and roomy-device replacement.                                                                  | `@kerfjs/ui/tab-navigator`                                                                | [App-layout decision matrix](./app-layouts.md#decision-matrix)                                 |
| Desktop multi-panel workspace — `Workbench`                                                                                   | A desktop-class tool needs a central work area plus independently collapsible navigator, inspector, or console regions.                                                                                                                                                                                                                                                                                   | Do not shrink the full shell onto compact devices or use it for one standalone panel.                                                                                                                                                                                                                                                      | Render only the required rails/drawer, keep collapse state controlled, and replace peripheral regions with stacks or overlays below desktop sizes. Opt a panel into drag/keyboard resizing with `resizable` and call `wireWorkbench` with its size signal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Panel presence/content, collapsed states, sizes, persistence, responsive replacement, and controls.                                                      | `@kerfjs/ui/workbench`                                                                    | [Workbench](./workbench.md)                                                                    |
| Standalone rail or drawer — `CollapsiblePanel`                                                                                | One left/right rail or bottom drawer needs controlled collapse without adopting the complete `Workbench` shell.                                                                                                                                                                                                                                                                                           | Do not use it for several coordinated workspace panels or retain an empty icon-only rail while collapsed.                                                                                                                                                                                                                                  | Pair it with `CollapsiblePanelToggle`; call `wireSidebar` for focus transfer, Escape/backdrop dismissal, compact overlay trapping, and persistence integration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Panel content/size, collapsed state, toggle placement, persistence, and compact policy.                                                                  | `@kerfjs/ui/collapsible-panel`                                                            | [App-layout decision matrix](./app-layouts.md#decision-matrix)                                 |
| Lowered content surface — `SunkenPanel`                                                                                       | A main work area or nested content group needs one visually lowered surface with a compact inset and vertical stack.                                                                                                                                                                                                                                                                                      | Do not use it merely to add padding, as a replacement for `Pane` anatomy, or around children that already own the same outer surface.                                                                                                                                                                                                      | Compose the application-owned content as children, choose the default `rounded` shape or `square` for a flush edge-to-edge area, and pass `ariaLabel` only when the surface is a distinct named region. Every sunken surface carries a fine grain texture, generated once per page by the first one that renders; call `ensureSunkenTexture` only when the page paints Web Awesome `appearance="sunken"` without any Kerf sunken component, and set `--kui-sunken-texture: none` at `:root` for a flat surface.                                                                                                                                                                                                                                                                                                                                                | Region semantics, accessible name, shape, scroll ownership, child ordering, and content.                                                                 | `@kerfjs/ui/sunken-panel`                                                                 | [SunkenPanel](./sunken-panel.md)                                                               |
| Scrolling view's hero image — `BackdropImage`                                                                                 | A scrolling `Pane` or `NavStack` view opens with a mood or identity image (an artist, album, or place page) that should lag the scroll, dissolve into a color, and read as one surface with the content below.                                                                                                                                                                                            | Do not use it for inline content images, thumbnails, or avatars. Do not hand-roll scroll listeners, `background-attachment: fixed`, or mask gradients. Do not use it outside a vertical scroller; parallax needs one.                                                                                                                      | Place it first in the scrolling content. Pass `src`, `alt` (`""` for decoration), optional `srcset`/`sizes`, `fit`/`position` or a tiled `repeat`, a typed `height`, `parallax` (`none`, `subtle`, or a 0 to 1 factor), `blur` (`radius`, `blurredSrc`, `dim`) for a progressive blur, a typed `fadeTo` color that also paints below, a `scrim` for overlay text, `overlay` content over its block end, and `children` below. Kerf owns the scroll-driven, compositor-only parallax and its static fallbacks.                                                                                                                                                                                                                                                                                                                                                  | The image and alt text, the fade color, overlay content and its contrast, and the content below.                                                         | `@kerfjs/ui/backdrop-image`                                                               | [BackdropImage](./backdrop-image.md)                                                           |
| Menu composition                                                                                                              | Navigation sections need full-size rows and the same content-item geometry as every other pane.                                                                                                                                                                                                                                                                                                           | Do not add sidebar-specific wrapper padding, shrink targets to icon size, nest an interactive trailing control in `ListItem`, or use a chevron on a row that does not disclose content. Use ordinary links for a different navigation contract.                                                                                            | Compose `ListHeader`, `ListItem`, and `ListActionRow` in `.kui-content`; use `ListHeader` toggle mode with real controlled content, and use `ContentItem` for other surfaces plus a pane footer for toolbar actions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Information architecture, disclosure content and state, responsive drawer/shell behavior, and token overrides.                                           | `@kerfjs/ui/layout.css`                                                                   | [Pane geometry](../README.md#pane-and-content-geometry)                                        |
| Resizable application pane — `ResizableRegion`, `clampRegionSize`, `resizeRegionFromPointer`                                  | A controlled split pane needs the Kerf separator, collapse state, pointer plus keyboard resizing, or a product-specific decorative grip.                                                                                                                                                                                                                                                                  | Do not use it for static equal columns; use `Grid`. Use application CSS grid for static asymmetric or intrinsic tracks. Prefer it over Web Awesome `wa-split-panel` unless that component's distinct API is required. Keep `handleIcon` noninteractive.                                                                                    | Call `wireResizableRegions` from `@kerfjs/ui/wire-resizable-regions` once and retain its disposer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Size signal, min/max policy, collapse policy, persistence, and optional decorative handle icon.                                                          | `@kerfjs/ui/resizable-region`                                                             | [ResizableRegion contract](./accessibility.md#resizableregion)                                 |
| One application tab — `TabBarItem`                                                                                            | A controlled app tab needs selection, close, drag, leading/trailing anatomy, compact/segmented/icon-only presentation, label truncation, safe domain metadata, or a product-specific close glyph.                                                                                                                                                                                                         | Do not render it alone or use it for a small settings choice; compose in `TabBar`, or use `SegmentedControl`. Keep `closeIcon` noninteractive.                                                                                                                                                                                             | Compose in `TabBar`; let `wireTabBars` manage interaction. Put only domain `data-*` values in `rootAttributes`; use typed appearance props instead of descendant CSS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Tab identity, order, selection, close policy, content, domain metadata values, and outer placement.                                                      | `@kerfjs/ui/tab-bar-item`                                                                 | [Tabs contract](./accessibility.md#tabs)                                                       |
| Application tab strip — `TabBar`, `wireTabBars`, `reorderTabs`                                                                | Tabs switch page regions and may overflow, close, reorder, fill a segmented inspector strip, sit beside a trailing action, or keep that adjacent action distinct from a far-edge end action.                                                                                                                                                                                                              | Do not use it for a compact local view toggle; use `SegmentedControl`. Do not use it for a long choice list; use `Select`. Prefer it over Web Awesome `wa-tab-group`, `wa-tab`, and `wa-tab-panel` for Kerf app tabs.                                                                                                                      | Call `wireTabBars` once, retain the disposer, and apply `onReorder` synchronously; `reorderTabs` is the default array helper. Combine `trailingPlacement="adjacent"` with `end` for split actions; TabBar owns the shrinking/scrolling tab geometry and keeps both actions visible. Choose typed presentation/allocation props while the parent owns outer placement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Ordered tabs, selection, panels, routing, closing, persistence, action content, and outer placement.                                                     | `@kerfjs/ui/tab-bar` plus `@kerfjs/ui/wire-tab-bars`                                      | [Tabs contract](./accessibility.md#tabs)                                                       |
| Panel, dialog, or page heading — `Toolbar` + `ToolbarText`                                                                    | A panel, dialog, or page needs an extra-large title, optional icon, grouped trailing actions, and optional supporting copy.                                                                                                                                                                                                                                                                               | Do not add a private heading wrapper or bespoke layout. The toolbar supplies structure, not modal behavior; use `DialogSurface` or a `kerfjs/overlay` dialog for that behavior. In a narrow peripheral rail or drawer, where xlarge would truncate at the panel's minimum size, use the default `ToolbarText` size as pane identity.       | Connect title/supporting-copy ids to the host, group controls, and delegate actions. **For a page or view title set `headingLevel` (usually `1`)** on `ToolbarText`; omit it for a dialog title referenced by `aria-labelledby`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Open state, focus lifecycle, dismissal, controls, ids, copy, and heading level.                                                                          | `@kerfjs/ui/toolbar` + `@kerfjs/ui/toolbar-text`                                          | [Toolbar headings](./accessibility.md#toolbar-headings)                                        |
| Modal dialog, dialog or popup geometry — `DialogSurface`, `openDialog`, `closeDialog`, `PopoverDialogSurface`, `PopupSurface` | A task must block the page in a modal dialog with standard sizes/presentations/body/footer insets, typed modal viewport bounds, a definite height, or a body one child fills; a dialog must stay non-modal and light-dismiss; or a raw dropdown menu needs list-compatible inset ownership.                                                                                                               | Do not use these surfaces as generic layout. Do not toggle a `DialogSurface`'s `open` attribute (that opens it non-modally), avoid consumer `::part()` or descendant overrides, and do not stack a dialog body inset around list-owned child geometry.                                                                                     | Render `DialogSurface` with a `label` (or `labelledBy` plus a `heading`), the body as children, and its buttons as `footer`; open it with `openDialog()` and close it with `closeDialog()`, its close button, or a `data-dialog-close` element, and cancel `kui-request-close` to keep it open. Compose a dialog body as a `List` by default, use `bodyInset="none"` when its children own list geometry, and wrap bare prose in `ListInsetText`. Set `height` with `bodyLayout="fill"` when one `SplitView` or `Pane` should fill the body. For a non-modal, light-dismiss dialog render `PopoverDialogSurface` (native `popover="auto"`, opened by a `popoverTarget` control or `showPopover()`), never a hand-built popover with app chrome CSS; `presentation="embedded"` shows it in flow. Wrap a raw `wa-dropdown` in `PopupSurface` for its menu inset. | Open state, whether a close may proceed, dismissal policy, names, content, and outer placement.                                                          | `@kerfjs/ui/surface-scaffold`                                                             | [Surface scaffolds](./surface-scaffold.md)                                                     |
| Modal list-detail — `ListDetailDialog`                                                                                        | A modal task picks one record from a list and shows its detail beside it, with the dialog's title, actions, and close control belonging to the detail.                                                                                                                                                                                                                                                    | Do not use it for a single-pane dialog; use `DialogSurface`. Do not wrap a `SplitView` in a `DialogSurface` by hand for this layout: the surface header spans both columns and stops the divider below it.                                                                                                                                 | Pass `list` (`title`, `toolbar`, `content`, `footer`, `width`) and `detail` (`title`, `description`, `actions`, `content`, `footer`); open it with `openDialog()`; pass `compact` from `deviceClass()` and `detailActive` for the compact drill-down, and pop on `nav-back`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Open state, selection, the pushed detail, device policy, content, and record actions.                                                                    | `@kerfjs/ui/list-detail-dialog`                                                           | [ListDetailDialog](./list-detail-dialog.md)                                                    |
| Modal workbench — `WorkbenchDialog`                                                                                           | A modal editing task needs a work area with side panels (layers, an inspector) whose rails overlay the work area on compact devices.                                                                                                                                                                                                                                                                      |
| Show and hide content — `Disclosure`                                                                                          | Optional or advanced content should stay one press away under a summary (advanced settings, a build log), or several sections should open one at a time.                                                                                                                                                                                                                                                  | Do not use it to switch peer views (use `SegmentedControl` or `TabBar`) or for a collapsible rail (use `CollapsiblePanel`). Do not hand-build a details element with its own marker CSS.                                                                                                                                                   | Render `Disclosure` with a `title`, an optional `detail`, and content that draws no inset of its own; give Disclosures the same `name` for an accordion; pick `appearance` `plain`, `framed`, or `sunken`. The open state is native: close it from code with `element.open = false`, and listen for the captured `toggle` event through `toggleAction`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Title, content, initial open state, group name, and toggle handling.                                                                                     | `@kerfjs/ui/disclosure`                                                                   | [Disclosure](./disclosure.md)                                                                  |
| Core overlay bottom sheet — `@kerfjs/ui/overlay-sheet.css`, `wireOverlaySheets`                                               | A `kerfjs/overlay` `overlay()`, `confirm()`, `prompt()`, `form()`, or `choice()` opened with `presentation: 'bottom-sheet'` should look like a `DialogSurface` sheet, and optionally be resizable by the person.                                                                                                                                                                                          | Do not hand-style `.kerf-overlay` or build a grabber; prefer a `DialogSurface` `presentation="bottom-sheet"` when the dialog is a Kerf `DialogSurface` rather than a core overlay.                                                                                                                                                         | Import `@kerfjs/ui/overlay-sheet.css` once. Pass `exitClass: 'kui-overlay-sheet-exit'` for the slide out. For a resizable sheet, add the `kui-overlay-sheet-resizable` class (`className: 'kerf-overlay kui-overlay-sheet-resizable'`) and call `wireOverlaySheets()` once per container sheets open in (`document.body` by default).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Opening, results, content, and which sheets are resizable.                                                                                               | `@kerfjs/ui/overlay-sheet.css`, `@kerfjs/ui/wire-overlay-sheets`                          | [Core overlay bottom sheets](./surface-scaffold.md#core-dialogs-as-bottom-sheets)              |
| Key/value facts — `ValueTable`, `ValueTableRow`                                                                               | Read-only labels and values form a semantic definition list, optionally with a leading icon.                                                                                                                                                                                                                                                                                                              | Do not use it for editable form fields or a row/column data grid; use native form or table semantics.                                                                                                                                                                                                                                      | Compose typed `ValueTableRow` entries; pass `icon` when a 24px leading icon adds useful context. Set `labelWidth` for a minimum label column, `presentation="stacked"` to put each value under its label, or `stackBelow` (`compact` 512px, `narrow` 576px) to stack only while the table is that narrow; never override `--kui-value-table-row-columns` for these.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Values, formatting, icon meaning, and empty/loading policy.                                                                                              | `@kerfjs/ui/value-table`                                                                  | [Component ownership](./component-contract.md#ownership-boundaries)                            |
| Framed rows of arbitrary content — `FramedList`, `FramedListRow`                                                              | Settings rows, account or source cards, or a shortcut list group several rows of copy and controls in one rounded frame with dividers between them.                                                                                                                                                                                                                                                       | Do not use it for read-only label/value facts; use `ValueTable`. Do not use it for selectable navigation rows or a bounded result picker; use `List` with `ListItem` (a picker adds `frame`, `scrollable`, and `maxHeight`). Do not pad or border rows from application CSS.                                                               | Compose any row content (a `Row` of copy, a keycap, icon-only `Button`s) in each `FramedListRow`; mark the row being edited `highlighted`. Name the list with `label` when no heading does.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Row content, controls, which row is highlighted, and the list's name.                                                                                    | `@kerfjs/ui/framed-list`                                                                  | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Selectable item summaries — `SummaryRow`                                                                                      | A list or board shows many items as dense, selectable summaries: an identifier and title, a timestamp, and a metadata line (tickets, tasks).                                                                                                                                                                                                                                                              | Do not use it for navigation rows; use `ListItem`. Do not use it for free-form selectable tiles; use `ContentItem`. Do not hand-roll row chrome.                                                                                                                                                                                           | Pass `title`, optional `leading`, `trailingMeta`, and `metadata`; choose `presentation` (`row` or `card`), `rail`, `selected`, `dimmed`, `listEdge`, and `titleLines`. Put rows in a labeled `role="listbox"` and own selection and arrow-key focus in the app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | The listbox, selection, keyboard movement, content, rail tone, and dimming.                                                                              | `@kerfjs/ui/summary-row`                                                                  | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Color from a fixed palette — `ColorSwatches`                                                                                  | A setting takes one color from a small curated palette (a label, calendar, or command color), or no color.                                                                                                                                                                                                                                                                                                | Do not use it when any color is allowed, or for choices that are not colors (use `ChoiceChips` or `RadioGroup`).                                                                                                                                                                                                                           | Render `ColorSwatches` with `name`, a `label`, `swatches` (`{ value, label, color }`, `'transparent'` for no color), and `value`; read the choice on `change` through `action`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | The palette and color names, and the chosen value.                                                                                                       | `@kerfjs/ui/color-swatches`                                                               | [ColorSwatches](./color-swatches.md)                                                           |
| Any color — `ColorPicker`, `wireColorPickers`                                                                                 | Any color is allowed and the person may need precision (a fill, stroke, or brand color), optionally with presets or saved samples.                                                                                                                                                                                                                                                                        | Do not use it for a small curated palette (use `ColorSwatches`).                                                                                                                                                                                                                                                                           | Render `ColorPicker` with `id`, `label`, `value`, and `mode`; call `wireColorPickers(root, { onChange })` once and re-render with the reported `value` and `mode`; add `presets`, `samples`, and `addSampleAction` as needed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The value and model, presets and samples.                                                                                                                | `@kerfjs/ui/color-picker`, `@kerfjs/ui/wire-color-pickers`                                | [ColorPicker](./color-picker.md)                                                               |
| A color in a form — `ColorField`, `wireColorFields`                                                                           | A form or inspector row sets one color (a fill, border, or theme color) and opens a picker only while it is being changed.                                                                                                                                                                                                                                                                                |
| List of short values — `TagField`, `wireTagFields`                                                                            | A form collects several short values of one kind (labels, recipients, keywords), each submitted as its own value.                                                                                                                                                                                                                                                                                         | Do not use it for search filters (use `SearchField`) or to pick from a short known set (use `ChoiceChips`).                                                                                                                                                                                                                                | Render `TagField` with `id`, `label`, `tags`, and `name`; call `wireTagFields(root, { onChange })` once and re-render with the reported list; add `max` and a `normalize` for validation, and show `onReject`'s reason as `error`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | The tag list, validation, and error text.                                                                                                                | `@kerfjs/ui/tag-field`, `@kerfjs/ui/wire-tag-fields`                                      | [TagField](./tag-field.md)                                                                     |
| Value on a range — `Slider`, `wireSliders`                                                                                    | A setting is a value in a known range where position matters more than the exact number (volume, zoom, opacity), optionally with named stops.                                                                                                                                                                                                                                                             | Do not use it when the exact number matters (use a numeric `TextField`), for on or off (use `Switch`), or for a few named options (use `SegmentedControl`).                                                                                                                                                                                | Render `Slider` with `id`, `min`/`max`/`step`, `value`, and a `label`; add `showValue` and `unit` for a readout and `ticks` for stops; listen for `input`/`change` through `action`, and call `wireSliders(root)` once so the fill and readout follow a drag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The value, range, labels, and re-rendering with the value.                                                                                               | `@kerfjs/ui/slider`, `@kerfjs/ui/wire-sliders`                                            | [Slider](./slider.md)                                                                          |
| Measurable progress — `ProgressBar`, `ProgressRing`                                                                           | A task reports how far it has gone (an upload, a migration, a quota), or work of unknown size is under way.                                                                                                                                                                                                                                                                                               | Do not use them for a brief busy glyph inside a control (use `LoadingSpinner`) or for a scale reading that is not progress (use a native `<meter>`).                                                                                                                                                                                       | `ProgressBar` with `value`/`max`, a `label` (or `ariaLabel`), and `showValue` or `valueText`; omit `value` for the indeterminate sweep. `ProgressRing` (`small`, `medium`, `large`) where a bar does not fit, named by `label`. Pick a `tone` for a status.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Value, max, labels, tone, and size.                                                                                                                      | `@kerfjs/ui/progress-bar`, `@kerfjs/ui/progress-ring`                                     | [Progress](./progress.md)                                                                      |
| Indeterminate activity — `LoadingSpinner`                                                                                     | A Kerf surface needs compact, labeled or decorative indeterminate progress.                                                                                                                                                                                                                                                                                                                               | Do not use it for known progress; use a native `<progress>` element, or `wa-progress-bar` / `wa-progress-ring` in an application using the Web Awesome integration. Do not mix spinner systems within one surface.                                                                                                                         | Pass a label when the spinner conveys status; use size for a named icon step or positive pixel size.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Loading lifecycle and adjacent status copy.                                                                                                              | `@kerfjs/ui/loading-spinner`                                                              | [Accessibility](./accessibility.md#shared-rules)                                               |
| Loading placeholder — `Skeleton` + a component's `placeholder` prop                                                           | A value or a whole component is still loading and should hold its space as a subtle, unanimated block, keeping the layout stable — an inspector or detail view rendering its real chrome with per-record values absent.                                                                                                                                                                                   | Do not use it for known progress (use `LoadingSpinner`), do not animate it, and do not hand-rebuild a component's empty state — set `placeholder` on the component instead. Prefer it over `wa-skeleton`.                                                                                                                                  | Set `placeholder` on a value-bearing component (`Select`, `ListHeader`, `ListItem`, `ValueTableRow`, `SegmentedControl`, `StateBanner`, `TabBarItem`, `ToolbarText`, `ListActionRow`) to render skeletons in its value slots with interactivity disabled; use the standalone `Skeleton` for a custom slot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Loading lifecycle, which slots are unknown, and announcing the loading region.                                                                           | `@kerfjs/ui/skeleton`                                                                     | [Accessibility](./accessibility.md#shared-rules)                                               |
| Command menu — `PopupMenu`                                                                                                    | A short list of commands sits behind one trigger, such as a toolbar sort or More menu, optionally grouped under headings and dividers with item icons.                                                                                                                                                                                                                                                    | Do not use it to choose a persistent value; use `Select`. Do not hand-write `wa-dropdown`/`wa-dropdown-item` markup for an action menu.                                                                                                                                                                                                    | Import `@kerfjs/ui/popup-menu/register` once. Place it in a `single` `ToolbarControlGroup` with `nestedDropdown` and a `menuInset`, or wrap it in `PopupSurface` outside a toolbar. Handle item `action`s by delegation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Commands, enabled state, and reactions to opening or closing.                                                                                            | `@kerfjs/ui/popup-menu`                                                                   | [Toolbar composition](#toolbar-composition)                                                    |
| Standalone action — `Button`                                                                                                  | A dialog footer, a form, or content needs an action button with visible text: `tone="brand"` for the main action, `tone="danger"` for a destructive one, and `emphasis="secondary"` or `"plain"` for the quieter actions beside it. A link that looks like a button takes `href`.                                                                                                                         | Do not use it inside a `ToolbarControlGroup`; give the group plain `<button>`s. For an icon-only action give it an `icon` and `ariaLabel` and no label, and for an on/off toggle set `pressed`; a menu trigger is a `PopupMenu`.                                                                                                           | Pass the label as children and delegate its `action`; a form button sets `type="submit"` or `"reset"` (the default `button` never submits) with `name`, `value`, and `form`. `loading` shows a spinner and `aria-busy`; the app decides what a press does meanwhile. `size="compact"` is 33px. In a `Toolbar` trailing zone or a `TabBar` action zone it keeps the control band.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | The label, delegated action, and form ownership.                                                                                                         | `@kerfjs/ui/button`                                                                       | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Icon-only action — `Button` with `icon` and `ariaLabel`                                                                       | One action is clear from its icon alone and stands by itself or beside a form field, such as Browse next to a path input: give `Button` an `icon` and an `ariaLabel` and no label.                                                                                                                                                                                                                        |
| Standalone toggle — `Button` with `pressed`                                                                                   | An on/off control (show a panel or a conversation), icon-only or labeled, sits in content or a pane footer outside any Toolbar: `pressed` reports `aria-pressed` and draws the pressed look on top of the tone and emphasis; `shape="pill"` rounds it.                                                                                                                                                    |
| Primary action with options — `SplitButton`                                                                                   | A prominent primary action has a closely related set of options chosen from an attached trigger, such as Drive with a provider menu.                                                                                                                                                                                                                                                                      | Do not use it for a plain action; use `Button`. Do not use it for a toolbar command menu; use `PopupMenu`. Do not assemble one from `wa-button-group`, whose hosts do not forward names or `aria-expanded`.                                                                                                                                | Pass the primary `label` and `action`, the options trigger's `optionsLabel`, `optionsAction`, and `optionsExpanded`; pick a loud `tone`, `fill` for full width, `busy` while work runs, and `disabled`/`optionsDisabled`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Both actions, the options menu and its open state, the running state and tone switch, and copy.                                                          | `@kerfjs/ui/split-button`                                                                 | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Choosing or dropping files — `FilePickerTrigger`, `FileDropZone`, `wireFilePickers`                                           | People attach or import files by browsing or by dropping them onto a target.                                                                                                                                                                                                                                                                                                                              | Do not style a native file input or its label from app CSS. Do not make the drop zone the only way in; it also opens the chooser.                                                                                                                                                                                                          | Use `FilePickerTrigger` for a compact Add control and `FileDropZone` for a dashed target; set `accept`, `multiple`, `name`, and `pickerId`. Call `wireFilePickers(root, { onFiles })` once: it reports browsed and dropped files (drops filtered by `accept`, the same check `fileMatchesAccept` exposes) and marks the zone while dragging.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | What happens to the files, the chosen-file list, copy, and accepted types.                                                                               | `@kerfjs/ui/file-picker`, `@kerfjs/ui/wire-file-pickers`                                  | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Value selection — `Select`                                                                                                    | A controlled form, toolbar, or compact navigation value comes from a moderate or long choice list, possibly grouped, icon-bearing, icon-only when closed, or truncating. Set `multiple` with an array `value` when the person may choose any number of them; add `selectedPresentation="icon-only"` and a fixed `triggerIcon` for a toolbar filter menu.                                                  | Do not use it for commands; use `PopupMenu`. Do not use it for a small visible choice set; use `SegmentedControl`. Prefer it over direct `wa-select`, `wa-option`, or value-like `wa-dropdown`/`wa-dropdown-item` composition.                                                                                                             | Import `@kerfjs/ui/select/register` once for registration and current-request animation ownership; listen for standard input/change events. Do not add consumer popup timing or positioning repairs. Use typed presentation props rather than consumer `::part()` overrides; let the parent own placement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Controlled value, validation, choices, domain mapping, and outer placement.                                                                              | `@kerfjs/ui/select`                                                                       | [Web Awesome integration](../README.md#web-awesome-theme)                                      |
| Free text — `TextField`, `wireTextFields`                                                                                     | A form or dialog collects a line of free text (a name, an address, a title) or a longer note: `label` names it (or `ariaLabel` when nearby content already does), `hint` explains it, and `error` reports a validation problem. `multiline` with `rows` (and `maxRows` to grow) takes a longer note; `maxLength` with `showCount` shows the remaining budget; `icon` and `clearable` suit a filter field. | Do not use it when only existing values are allowed; use `Select`. Do not use it to pick among suggestions or create tags; use `Combobox`. Do not use it for search text with removable filter tokens (`SearchField`) or a message with a send action (`MessageComposer`). Prefer it over `wa-input` and `wa-textarea`.                    | Call `wireTextFields(root)` once when a field is `clearable` or `showCount`. Read the value from the native `input` or `change` event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Value, validation and error copy, hint copy, and what a cleared field means.                                                                             | `@kerfjs/ui/text-field`                                                                   | [TextField contract](./accessibility.md#textfield)                                             |
| On/off option — `Checkbox`, `wireCheckboxes`, `Switch`                                                                        | A form or settings list has an independent yes/no option: `Checkbox` when a form submits it (with `indeterminate` for a parent of partly checked children), `Switch` when the setting applies the moment it changes.                                                                                                                                                                                      | Do not use a `Switch` for an option a form submits later, or a `Checkbox` for an immediate setting. Do not use either for one choice among several (`RadioGroup`). Prefer them over `wa-checkbox` and `wa-switch`.                                                                                                                         | Call `wireCheckboxes(root)` once when a `Checkbox` is `indeterminate`. Read `checked` from the native `change` event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Checked and mixed state, validation copy, and what a change does.                                                                                        | `@kerfjs/ui/checkbox`, `@kerfjs/ui/switch`                                                | [Checkbox, RadioGroup, and Switch contract](./accessibility.md#checkbox-radiogroup-and-switch) |
| One of a few labeled options — `RadioGroup`                                                                                   | A form asks for one of two to about six options that people should compare at a glance, each with a readable label and an optional hint.                                                                                                                                                                                                                                                                  | Do not use it for a long list (`Select`), a view switch (`SegmentedControl`), or pill or color choices (`ChoiceChips`). Prefer it over `wa-radio-group`.                                                                                                                                                                                   | Read the value from the native `change` event and render `value`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Value, choices and their copy, and validation.                                                                                                           | `@kerfjs/ui/radio-group`                                                                  | [Checkbox, RadioGroup, and Switch contract](./accessibility.md#checkbox-radiogroup-and-switch) |
| Pick or create a value by typing — `Combobox`, `wireComboboxes`                                                               | People type to find an existing value among many or create a new one (tags, labels, recipients).                                                                                                                                                                                                                                                                                                          | Do not use it when only existing values are allowed; use `Select`. Do not use it for search text with removable filter tokens; use `SearchField`. Do not style a native input with a datalist.                                                                                                                                             | Pass `id`, `label`, and `suggestions` (strings or `{ value, label }`), plus `placeholder`, `hint`, and `createLabel` (or `false` for suggestions only). Call `wireComboboxes(root, { onCommit })` once; it filters, moves the active option with the arrows, and reports `{ id, value, created, input }` on Enter, a comma, or a click.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Suggestions, committed values, normalization, and clearing the field.                                                                                    | `@kerfjs/ui/combobox`, `@kerfjs/ui/wire-comboboxes`                                       | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Small exclusive choice — `SegmentedControl`                                                                                   | A few visible choices switch a compact view or setting, with toolbar, rounded, or pill presentation.                                                                                                                                                                                                                                                                                                      | Do not use it for tabpanel semantics; use `TabBar`. Do not use it for many choices; use `ChoiceChips` when they stay visible and wrap, or `Select` for a long list. Prefer it over `wa-button-group` when the controls select one value.                                                                                                   | Delegate its action, read `data-segment-value`, update `value`, and rerender.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Controlled value, labels, action, and persistence.                                                                                                       | `@kerfjs/ui/segmented-control`                                                            | [SegmentedControl contract](./accessibility.md#segmentedcontrol)                               |
| Wrapping visible choice — `ChoiceChips`                                                                                       | Several visible options, too many for one segmented track, must wrap onto more rows — a labeled color palette with swatches, a tag color, a category. Set `multiple` with an array `value` when any number may be on, such as label filters or annotation intents.                                                                                                                                        | Do not use it for a few compact choices on one track; use `SegmentedControl`. Do not use it for a long list or tight space; use `Select`. Do not use it for removable tags (`Chip`). Prefer it over `wa-radio-group` with `appearance="button"` radios, which wrap as a ragged joined group.                                               | Pass a form `name`, a `label` or `labelledBy`, and the controlled `value`; delegate the `action` on `change`, read the radio `value` (or, with `multiple`, the checked boxes under `name`), and rerender. Place it in a dark appearance scope for inverse chrome rather than restyling it. Lead choices with a `swatch` (`CssColor` or `'transparent'`) or an `icon`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Controlled value, choices, swatch colors, change handling, and form submission.                                                                          | `@kerfjs/ui/choice-chips`                                                                 | [ChoiceChips contract](./accessibility.md#choicechips)                                         |
| Chat or prompt composer — `MessageComposer`, `wireMessageComposers`                                                           | A chat message, assistant prompt, or reply is written in a raised frame and sent with a trailing action, often in a `DialogSurface` floating footer over a transcript.                                                                                                                                                                                                                                    | Do not use it for an ordinary form field submitted with the rest of a form; use a `multiline` `TextField`. Do not wrap it in another framed `ContentItem` or card; it owns its frame, padding, and shadow. Prefer it over a textarea and a button in app-styled chrome.                                                                    | Pass a `name`, a title-style `label`, an `id` when it has a `hint`, and the trailing `actions` (a brand Send `Button`). Bound the growing field with `minRows` and `maxRows`. Read and clear the textarea from the send action. For Enter-to-send, set `submitOnEnter` and call `wireMessageComposers(root)` once; Enter clicks the first trailing action, Shift+Enter is a newline, and IME commits never send.                                                                                                                                                                                                                                                                                                                                                                                                                                               | Value, sending, shortcuts beyond the opt-in Enter-to-send, and the disabled or busy state of its actions.                                                | `@kerfjs/ui/message-composer`, `@kerfjs/ui/wire-message-composers`                        | [MessageComposer](./message-composer.md)                                                       |
| Structured search editor — `SearchField`, `readSearchField`, `placeSearchFieldCaret`, `wireSearchFields`                      | Free text and ordered, editable, removable filter tokens share one searchbox; enable `collapsible` when an empty, unfocused field should reduce to one iconic action, standalone or in a toolbar group.                                                                                                                                                                                                   | Do not use it for ordinary text entry; use `TextField`. Do not use it when filters belong in separate form controls.                                                                                                                                                                                                                       | Read DOM-owned text on input, empty `textContent` on clear, and use `placeSearchFieldCaret` after explicit controlled focus changes. Call `wireSearchFields` from `@kerfjs/ui/wire-search-fields` once so Enter submits without adding a line break and keyboard chip deletion restores focus plus the text-relative caret after controlled replacement. In `collapsible` mode it also manages the transient expand/collapse/focus by default (activate to reveal + focus, Escape or empty blur to collapse); bind the field's `expanded` to the signal on the returned handle (`handle.expanded(id)`) or adopt your own via `collapsible.signals`, and opt out per behavior only when the app must own it.                                                                                                                                                    | Parsing, suggestions, tokens, query execution, results, announcements, and — only if overriding the default — the collapsible `expanded` signal.         | `@kerfjs/ui/search-field`                                                                 | [SearchField contract](./accessibility.md#searchfield)                                         |
| Persistent inline status — `StateBanner`                                                                                      | A neutral, info, pop, success, warning, or danger message belongs next to the affected work; pop highlights featured or novel content without implying status.                                                                                                                                                                                                                                            | Do not use pop as a success, warning, or danger substitute. Do not use StateBanner for a no-content screen; use `EmptyState`. Do not use it for transient confirmation; use a toast. In an application using the Web Awesome integration, `wa-callout` is the alternative for Web Awesome-owned content.                                   | Delegate an optional action; choose alert urgency only for attention-requiring failure. Use the optional tone-tinted `badge` for a terse count or status beside the title, not as the only expression of meaning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | State mapping, message lifetime, retry/action behavior, badge content, and copy.                                                                         | `@kerfjs/ui/state-banner`                                                                 | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| App-level progress in a corner — `CornerStatus`, `wireCornerStatus`                                                           | Ongoing app-wide work, such as "Loading…" or "Updating Tickets… 3 of 12", needs a non-dismissible status that has no better home beside the affected work.                                                                                                                                                                                                                                                | Do not use it for transient, dismissible confirmation; use a toast. Do not use it for status that belongs beside the affected work; place a `StateBanner` there. Do not position a `StateBanner` with fixed-position application CSS.                                                                                                      | Compose one or more `StateBanner`s with `urgency="status"`; they stack. Call `wireCornerStatus` once so each overlay host opens in the top layer as renders insert it. It never takes focus and has no close button, light dismiss, or Escape.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Status lifetime (render while the work runs, remove when it ends), banner copy and progress, and corner placement.                                       | `@kerfjs/ui/corner-status`, `@kerfjs/ui/wire-corner-status`                               | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Ambient edge activity — `EdgeActivityIndicator`                                                                               | App-wide background activity (server work, sync) should be visible along the top edge without a modal, a banner, or a layout shift.                                                                                                                                                                                                                                                                       | Do not use it for progress the user waits on or must read; use `CornerStatus`. Do not use it for known progress; use a progress bar. Do not make it the only record of important state.                                                                                                                                                    | Drive `busy`; pass an optional `message` for a polite status pill and a `tone`. It sits below the top safe area (or flush with `inset="none"`), takes no pointer, and only fades under reduced motion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | The busy state, message, and tone.                                                                                                                       | `@kerfjs/ui/edge-activity-indicator`                                                      | [Feedback accessibility](./accessibility.md#shared-rules)                                      |
| Empty or busy content area — `EmptyState`                                                                                     | A content region has no items, cannot proceed, or is loading and needs explanation plus an optional action.                                                                                                                                                                                                                                                                                               | Do not use it for an inline status update; use `StateBanner`. Do not use it for transient success; use `toast()` from `kerfjs/overlay` or the application's toast system.                                                                                                                                                                  | Delegate its optional action; it composes `LoadingSpinner` when busy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Empty/busy policy, recovery action, illustration, and copy.                                                                                              | `@kerfjs/ui/empty-state`                                                                  | [Feedback ownership](./component-contract.md#extracted-versus-application-specific)            |

## Ambiguous choices

For a lowered background behind an entire scrolling work area, choose
`Pane appearance="sunken"` or the appearance option on the layout that owns
the scroll viewport. Use `SunkenPanel` for a padded content group that does
not introduce scrolling. See [Lowered work surfaces](./layout.md#lowered-work-surfaces).

Set `ResizableRegion`'s `--kui-resizable-region-background` for an inline
surface. A `PopupMenu` opens in the browser top layer, so the region keeps
clipping its own content while the menu shows in full; an open raw Web Awesome
dropdown inside it automatically releases clipping and raises the region on
its public popup layer instead. Set
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
`state="drag-target"` for the component's drop outline and background (a row
that accepts dropped content). For a list the person reorders, set
`draggable` on each `ListItem`, `ListItemLink`, or `ListActionRow` (each with
an `itemId`) and call `wireListReorder` from `@kerfjs/ui/wire-list-reorder`
once, retaining its disposer: it dims the dragged rows, draws the 2px brand
insertion line on the hovered row's `before` or `after` edge, moves rows with
Alt+Shift+ArrowUp/ArrowDown, and reports
`{ listId, sourceIds, target: { id, position }, source }`. Dragging a selected
or pressed row moves every selected row of its `List` (set `data-list-id` on
the `List` to tell several lists apart). Apply the change synchronously with
`reorderListItems`; order stays application state. Without the wiring, the
`dragging` and `dropPosition` props render the same states from app-owned
drag state. Public
`--kui-list-item-*` tokens control its row, icon, label, and trailing geometry
and color. `ListHeader` exposes `--kui-list-header-min-height`, title padding,
title minimum height, and border-width tokens for section density.
Set `--kui-list-group-divider-color` on a containing `List` to give
`ListHeader`, `ListItem`, and `ListActionRow` the same before/after divider
color; each row otherwise uses the quiet neutral border tone.
Set `--kui-list-row-padding-inline` on a containing `List` to give `ListItem`
and `ListActionRow` rows one leading inline inset: both start their leading
icons on the same edge at any value, and the token defaults to
`--kui-layout-item-padding`. `--kui-list-item-padding-inline` still overrides
it for `ListItem` rows alone, so use the shared token whenever the two row kinds
share a list.
Both row kinds also draw their untiled leading icon at one shared size,
`--kui-list-row-icon-size` (default 18px), so a list that mixes them starts
their labels on one edge too. Set it on the containing `List` to resize both
row kinds together; `--kui-list-item-icon-size` still overrides it for
`ListItem` rows alone. An `iconTile` keeps its 32px tile and 18px glyph at any
value.
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
leading and trailing zones equal tracks. A lone `ToolbarText` in a balanced
center is a navigation-bar title: the side zones keep their content width and
the title truncates first, centered while the sides leave room (NavStack uses
this once it shows a back control). `--kui-toolbar-leading-min-width`,
`--kui-toolbar-trailing-gap`, `--kui-toolbar-trailing-justify`, and the
`--kui-toolbar-*-padding-inline` zone tokens adjust local geometry without
selecting toolbar anatomy from application CSS.
For a shorter header embedded in a panel or card, pass `Toolbar
density="compact"`: a 40px toolbar with a 34px control band and 3px block
insets (inline insets and the zone gap stay 8px). Give its groups
`size="compact"` so they fit the band. Composite toolbars take the same
`density` through their `ToolbarConfig` (Workbench panel, main, and bottom
toolbars, CollapsiblePanel, NavStack, and SplitView) and size the groups they
compose — panel toggles, relocated toggles, the back button — to match. Pass
`density` to `CollapsiblePanelRelocated` when its destination toolbar is
compact.

Set `--kui-toolbar-inset: 0px` on an embedded Toolbar that should have no outer
padding while keeping its `--kui-toolbar-gap` between control zones. The token
also reduces its minimum height by the removed inset; safe-area compensation
still adds to the chosen inset on claimed edges.

For compact dialog copy, use `Text flush lineHeight="tight"`; block Text still
resets native margins. Center short status copy with `Text align="center"`
(`end` aligns a trailing value) instead of setting `text-align` on `.kui-text`. `ValueTable density="compact"` reduces row padding and
gap. Its `--kui-value-table-row-columns`, `--kui-value-table-row-padding-block`,
and `--kui-value-table-row-gap` tokens support a specific metadata layout.
Use `ToolbarText size="xsmall"` for a dense rail heading. Use
`size="xlarge-fixed"` for a toolbar heading at the fixed 20px step; `xlarge`
retains the responsive page-title clamp. Pass `headingLevel` when the text is
a section landmark. A `SearchField` editor can shrink to zero minimum width inside a narrow
group; set `--kui-search-field-editor-min-width` only when a wider editor is
required.

- `Toolbar` serves persistent app chrome and headings; the zone contents and accessible naming distinguish the purpose.
- `TabBar` changes tabpanels and supports overflow/reorder; `SegmentedControl` chooses among a few compact views; `ChoiceChips` keeps a larger exclusive set (or, with `multiple`, an any-number set) visible as wrapping pills; `Select` handles a longer value list.

Use `TabBarItem presentation="icon-only"` with its `name` kept as the accessible
tab name. For segmented tabs that should show names in a wide reader and icons
in a narrower container, set `TabBar iconOnlyAt="wide"` (832px), `"narrow"`
(704px), or `"compact"` (448px), and give each segmented `TabBarItem` a leading
icon. The tablist's own width controls the switch; the visually hidden name
remains its accessible name. Use `labelMaxWidth` for an ellipsized visible name. Set `attention`
to color a tab's name with `--kui-tab-bar-item-attention-color`. Set `dropTarget`
while an app drag is over a tab's content; the tab keeps its selection semantics
and uses the `--kui-tab-bar-item-drop-target-*` tokens for its highlight. Set
`nameOverflow="visible"` when an inline loading treatment needs the full name
instead of the default ellipsis. A `TabBar` owns its
scrolling strip; its public `--kui-tab-bar-strip-*` tokens configure strip
height, spacing, border, radius, background, and scroll inset without styling
its internal classes. `--kui-tab-bar-trailing-flex` controls the trailing zone.
For a distinct application action, use `end` to pin it at the far edge; use
`trailingPlacement="adjacent"` to keep a tab-local `trailing` action beside the
strip. Each zone accepts one `ToolbarControlGroup` or one standalone
`Button` for a primary action with its own chrome. Avoid wrappers and
application flex overrides.
Set `pinned` on the first `TabBarItem` when that tab must remain visible as peers
scroll. It stays inside the tablist and keyboard order. Set the `TabBar`
`snapTabs` prop when scrolling peers should settle at whole-tab starts
beside that pinned tab. `wireTabBars` measures the pinned inset and provides
enough end scroll room for the last peer to align there; a partial peer can
still appear at the trailing edge as an overflow cue. This mode also aligns a
newly selected tab at the pinned edge in LTR and RTL. Set the prop on the bar,
without styling its strip or tab internals. With `snapTabs`, keep the trailing
zone non-shrinking (the default `--kui-tab-bar-trailing-flex`): the reserved
end room counts toward the strip's share when both zones shrink.
Set the public
`--kui-tab-bar-item-pinned-background` token if the surrounding surface differs from
the default; the pinned tab must cover peers as they scroll beneath it. Its
background also covers the strip's inline padding and border so scrolled labels
cannot paint beside the pinned edge, including in right-to-left strips. The
backing follows the tab's pill radius, keeping a selected pinned tab's corners
and shadow whole beside the overflow divider. Call
`wireTabBars` for keyboard selection and reorder behavior and its WebKit RTL
scroll correction.

- `StateBanner` persists beside affected work; `EmptyState` replaces absent content; a `kerfjs/overlay` `toast()` is transient and must not carry the only copy of important state. With the Web Awesome integration, `wa-callout` is contextual ecosystem content and `wa-toast` is the transient equivalent.

For a banner with multi-line supporting copy, use `copyLayout="stacked"` to put
the detail below the title and badge. The default `actionPlacement="trailing"`
keeps the action beside the copy while the copy has room and moves it to its
own end-aligned trailing row when the banner is narrow (a phone, a sidebar),
so a group of buttons never squeezes or covers the title; no breakpoint or
`actionPlacement` switch is needed for narrow layouts. Use
`actionPlacement="below"` when the action should always take a separate
trailing row. The default copy layout keeps the detail inline;
`--kui-state-banner-copy-gap` and `--kui-state-banner-copy-row-gap` adjust the
stacked copy's spacing at an instance boundary.

For a full-width status band at a layout edge — above a workspace, below an
app bar — use `presentation="strip"` instead of restyling the card: it is flush
(no inline margin), square, puts its copy on the shared content-text column,
and draws only tone-colored `dividerSides` edges (bottom by default; `''` for
none). Keep the default `card` presentation for a banner beside the affected
work inside a pane.

For ongoing app-level progress that has no home beside the affected work, host
the banner in `CornerStatus` rather than positioning it with fixed CSS: a
manual popover in the top layer, at a safe-area-aware viewport corner, with no
close button, light dismiss, or Escape. Call `wireCornerStatus` once; it opens
each host as renders insert it, and the application removes the host when the
work ends.

A modal dialog opened while the status shows stacks above it, as it does over a
toast. Raising the status back above the modal would only paint it there: a
modal makes everything outside its own subtree inert, so the status could not
be reached or announced either way. When the dialog's task depends on that
progress, show it inside the dialog.

For a compact `Select`, set `triggerWidth` to `"fit-content"`, `"max-content"`,
or `"fill"`, and bound it with `maxTriggerWidth` / `minTriggerWidth` (under any
presentation; the value or `renderSelected` content ellipsizes before the caret).
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
- `SearchField` is a structured editor. A `TextField` is the right answer for ordinary text.

For common structured search, use `createSearchFieldModel` from `@kerfjs/ui/search-field-model`, pass the model to `SearchField`, and register it under the field id in `wireSearchFields(root, { models })`. Rules parse `name:value` expressions and provide suggestions; the model owns chips, selection, removal, clear, and an optional evaluation result. The field subscribes only to `model.structure`, so typing plain text does not re-run the host render; read `model.state.peek()` in the host's render and bind `model.result` as a signal hole instead of reading `model.state.value`. Omit `model` and `models` for full manual control.

In a form, use `SearchField presentation="form-field"` with its `label`,
optional `hint`, and `required` state. It renders a full-width control beside
`TextField` without a Toolbar or extra inline inset. The app validates required
search content before saving.
The form-field corners follow the same `--kui-layout-rounded-radius` as a
neighboring `TextField`.
The four public color tokens (`--kui-search-field-background`,
`--kui-search-field-border`, `--kui-search-field-token-background`, and
`--kui-search-field-token-foreground`) inherit from an app ancestor or the
field's root. `className` marks that root, including the outer wrapper in
`form-field` presentation, so one app class can configure either form.
`SearchFieldRule.suggest(input, state)` receives the unfinished value and current committed tokens, so a rule can omit values already selected. Existing one-argument suggestion callbacks continue to work.
For a sibling date picker or other app helper, call `model.commit(value)` while a `name:` prefix is active. It parses and commits that value for the active rule even when it is absent from suggestions, replacing the unfinished prefix text. Invalid values and calls without an active prefix leave the query unchanged; `choose(value)` remains restricted to suggested tokens.
To apply a saved search or restore a query programmatically, call `model.replace({ query, tokens })`. It publishes parsed state and rebuilds the DOM-owned editor text even when no chip changed. For a field without a model, change the field's `revision` prop when setting `query` yourself.
When one root contains both kinds of field, a registered model enables chip keyboard behavior only for its own field. Other fields keep native editing unless the root opts into `keyboard` with an application removal callback.
For an icon action at the end of the field, pass `trailingAction` with `icon`,
accessible `label`, and delegated `action` (plus optional `id`). The component
renders a compact button beside the clear button, with the same size, hover,
focus ring, and cursor, in every presentation. For a help toggle that opens a
surface, set `expanded` (and `haspopup`, plus `controls` while it is open); for
an on/off toggle, set `pressed`. The open or pressed state keeps the hover fill.
Put domain `data-*` metadata in `attributes`. Never style your own button into
the `trailing` slot; reserve `trailing` for passive content such as a shortcut
hint.
Set `fill` on a collapsible `SearchField` in a stretched Toolbar center to
use the available width when expanded; the field and its search group retain
their compact widths when collapsed.
When the expanded toolbar field has focus, its inset surface uses
`--kui-search-field-background` or the default surface color if that token is
unset.

`ToolbarControlGroup.tileTone` selects `neutral`, `brand`, `success`, `warning`, or `danger` quiet fill, matching quiet border, and on-quiet foreground for a non-interactive icon tile. Compose a contained `single` group whose only child is a direct decorative LucideIcon (`aria-hidden="true"`). Omission preserves the normal group palette. The prop does not recolor interactive, mixed, multi-control, or borderless groups; keep real actions in controls with their existing focus/hover/pressed treatments.

`ToolbarControlGroup` `material="glass"` paints a group that floats over imagery or a clear (transparent) toolbar on the translucent chrome material (`--kui-chrome-material` with the blur/saturate `--kui-chrome-material-filter`), with a specular edge in place of the gray border and a soft shadow. Its controls take `--kui-color-text`, so they stay at AA over any content; a raised or outline selection paints an opaque surface pill. The fill turns opaque under reduced transparency, increased contrast, static effects (`update: slow` or `:root[data-kui-effects="static"]`), or without backdrop-filter support, and paints Canvas/CanvasText in forced colors. A `tone="dark"` glass group keeps its loud fill and gains the blur and edge; a borderless group has no surface and ignores the material. Keep the solid default on an opaque toolbar, and never add your own `backdrop-filter` or translucent background to a group.

`ListItem`, `ListItemLink`, and `ListActionRow` take `iconTile` to present their leading `icon` in a filled 32px rounded tile holding an 18px glyph, for settings or command rows that identify each entry by color. Pass a tone (`neutral`, `brand`, `success`, `warning`, or `danger`) for the same quiet fill, matching quiet border, and on-quiet foreground as `ToolbarControlGroup.tileTone`, or `{ color, foreground? }` for an application color: `color` is a `CssColor` (`uiColor()`, `colorVar()`, or `fillColor('#e5484d')`) and `foreground` a `CssForegroundColor`; without one, the glyph is black or white, whichever contrasts with the fill. The tile sits 6px clear of a standard 44px row (a compact row is at least 42px tall), moves the label to the tile's edge, and keeps its colors when the row is hovered or selected. Never wrap the icon in your own tile or resize the row's icon slot.

## Toolbar composition

Use `ToolbarText tone="dark"` on a loud-filled toolbar surface (one painted
with `--kui-color-neutral-fill-loud`, the inverse of the page) to match dark
control groups; like them it inverts with the color scheme. Text over a dark
photo or scrim needs a foreground that is light in both schemes instead: a
`BackdropImage` `scrim` gives its overlay the dark scheme, so keep the
default tone there. It applies to read-only headings and actionable
titles at every size; default tone retains existing identity and heading colors.

A `FloatingToolbar` accepts `ToolbarControlGroup` directly as its children in
both floating and inline placement. Name the toolbar with `label`; group its
controls as you would in a `Toolbar` zone.

A `Toolbar` has three zones — `leading`, `center`, and `trailing`. Each accepts
`KerfUiContent` directly, including a status `Chip`, a native control, or
application markup. `ToolbarText` is the standard identity/title; use
`ToolbarControlGroup` when related controls should share its chrome, sizing,
hover treatment, or overflow behavior. A standalone primary `Button` keeps
its own chrome and fits naturally in the trailing zone. Bare
controls retain their own styling and accessibility responsibilities; the
toolbar only positions them within the zone. A toolbar with a single zone (only
`leading`, only `trailing`, or only `center`) gives that zone the whole content
box: an absent zone leaves no empty track or gap, so content set to fill the row
reaches the opposite inset.
For a title that opens an editor, set `action` on a direct `ToolbarText`: it
renders a native button that keeps its content width when possible and
ellipsizes before an adjacent status chip when the leading zone narrows. The
application handles the delegated action and replaces it with its own input
while editing. Use a separate heading landmark if the view needs one.
For a search or cluster that needs shared toolbar geometry, place
`SegmentedControl`, `Select`, or `SearchField` inside a
`ToolbarControlGroup`. The ToolbarText catalog's actionable-title example
places its status `Chip` directly beside the title while the search uses a
group. `TabBar` also accepts a `ToolbarControlGroup` in its `leading`,
`trailing`, or `end` zone, including an application wrapper that renders one.
For a page, panel, or
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

For a long-running action, set `busy` on its single-control
`ToolbarControlGroup` and supply a descriptive `busyLabel`. The group preserves
the control's dimensions, shows `LoadingSpinner` in its place, sets
`aria-busy`, and makes the control inert until the app clears `busy`. An icon
group hides only the glyph; a `content="text"` or `"mixed"` group hides the
whole control, label included, so the spinner never draws over text.

| Want                           | Put in the zone                                                                        | Notes                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Identity or title text         | `<ToolbarText text="…" size="large" />` (or `xlarge` for a page/panel title that fits) | Wrap in a `single` borderless group only when it must align with adjacent control pills                        |
| One or more icon/text buttons  | `<ToolbarControlGroup>{buttons}</ToolbarControlGroup>`                                 | Use `buttonAppearance="push"` for toggle buttons with `aria-pressed`; `single` for a lone control              |
| One primary application action | `trailing={<Button tone="brand">New Ticket…</Button>}`                                 | The standalone button keeps its own chrome; use `tone="danger"` when the action is destructive                 |
| An exclusive view switch       | `<ToolbarControlGroup><SegmentedControl … /></ToolbarControlGroup>`                    | Not `TabBar`, which switches tabpanels                                                                         |
| A value list                   | `<ToolbarControlGroup><Select … /></ToolbarControlGroup>`                              | Register `@kerfjs/ui/select/register` once; use `focusRingOwner="group"` so focus follows the group's geometry |
| A command menu                 | `<ToolbarControlGroup single nestedDropdown><PopupMenu … /></ToolbarControlGroup>`     | Register `@kerfjs/ui/popup-menu/register` once; set `menuInset` on the group                                   |
| A collapsible search box       | `<ToolbarControlGroup single><SearchField collapsible … /></ToolbarControlGroup>`      | The group animates the iconic ↔ expanded states; `wireSearchFields` manages expand/collapse/focus by default   |

### Room for an expanded search

A collapsible search group grows into the room beside its sibling groups. When
that room is too small, the siblings wrap onto a new row partway through the
opening, and the toolbar grows a row taller. Kerf does not hide or move your
other controls; plan for it instead:

- Size the expanded search to what fits: `--kui-search-field-expanded-width`
  for a plain search group, or `sizing="grow"` with a `growBasis` that fits
  beside the siblings.
- If a useful search cannot fit beside the other controls, set those controls
  aside while it is open. Mark them `visibility="yield-to-expanded-sibling"`
  (they leave a 480px-or-narrower toolbar while a sibling is expanded), or
  gather them behind a "…" `PopupMenu` overflow group. The application decides
  which controls yield.

### Application surfaces below search

Pass `expandedOverflow="visible"` to `ToolbarControlGroup content="search"`
when an application-owned suggestion list, date picker, or help surface extends
below it. The group is the positioning containing block, retains auto height,
and permits overflow only while `expanded` is true. Omission or `"clip"` keeps
existing behavior, including Kerf's built-in suggestions. Other content modes
and collapsed searches keep their existing overflow rules.

```tsx
<ToolbarControlGroup content="search" expanded={open} expandedOverflow="visible">
  <SearchField id="ticket-search" label="Search tickets" presentation="toolbar-group" collapsible expanded={open} />
  {open ? <AppDatePicker data-search-field-keep-open /> : null}
</ToolbarControlGroup>
```

The application owns placement (for example absolute positioning below the
group), stacking, dismissal, and hiding/removing its surface on collapse. Mark
focusable floating content `data-search-field-keep-open`, or configure
`collapsible.keepOpenOn`, to keep an empty field open when focus enters it.
This prop does not escape clipping imposed by an ancestor or create a top-layer
popover. Do not override the group's position, height, or overflow in app CSS.

### Popup menu migration

A **popup menu in a toolbar** is a `PopupMenu` (`@kerfjs/ui/popup-menu`) in a
`single` `ToolbarControlGroup` with `nestedDropdown`; the group sizes the trigger
as a toolbar button and `menuInset` sets the menu's inset. `PopupMenu` renders
its own native trigger button and a `role="menu"` panel of typed items
(commands, headings, and dividers) that opens in the browser top layer, and
keeps the open menu's state out of the morph. Register
`@kerfjs/ui/popup-menu/register` once; it wires opening, keyboard navigation,
submenus, and dismissal for every PopupMenu in the document. Do not hand-write
`wa-dropdown` or menu markup for a menu.

```tsx
<ToolbarControlGroup single nestedDropdown menuInset="compact">
  <PopupMenu
    label="Sort"
    icon={<LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />}
    items={[
      { label: "Recently Updated", action: "sort-recent" },
      { label: "Priority", action: "sort-priority" },
    ]}
  />
</ToolbarControlGroup>
```

Nested decisions use an item with `submenu`. Children keep their own actions,
`attributes` metadata, icons, `checked` state, disabled state and
`disabledReason` tooltip. Nested `heading` and `divider` entries group those
commands without entering keyboard navigation. `tone: 'danger'` draws a
destructive command. A parent can sit among ordinary commands and dividers, so the same
items shape covers single-line and batch actions; compute each batch child's
`disabled` state from the current selection.

```tsx
<PopupMenu
  label="Line actions"
  items={[
    { label: 'Copy Reference', action: 'copy-reference', attributes: { 'data-item-id': lineId } },
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
Items with `checked: true` or `checked: false` reserve checkmark space, and so
does every plain command in a menu level (the top menu or one submenu) that
holds such an item, so icons and labels line up across the level; a level
without a choice keeps the compact start. Omit `checked` for a plain command,
including one beside checkbox items. The application owns each choice's state:
choosing one reports the state it asks for (`detail.checked`) in the root's
bubbling, cancelable `kui-menu-select` event, alongside `detail.item` and its
`detail.value`, and the menu shows the new checkmark once the application
renders it. Commands still dispatch their own `data-action` once on pointer and
keyboard selection; canceling `kui-menu-select` keeps the menu open.

For a row opened by right-click, render `PopupMenu` with `context`, `label`,
`anchor`, and a stable root `data-*` marker. Its trigger is an invisible anchor
removed from the accessibility tree; a separate visible button may stay
disabled. The menu owns its anchor host: it renders out of flow with no layout
footprint (no line box, no gap slot), so render it anywhere in the surface it
belongs to — never inside an app wrapper with `position: fixed`, a 1px size,
or a `z-index` (the open menu is in the browser top layer). In the app's
`contextmenu` handler, prevent the browser menu, store
`{ x: event.clientX, y: event.clientY }` in the signal the menu renders as
`anchor`, and call `openPopupMenu` with the menu. Because the point is part of the
menu's own template, it survives re-renders and a rebuilt menu, so the app
never re-applies it. `openPopupMenuAt` still opens a menu rendered without `anchor` at a given
point. Call `closePopupMenu` for programmatic dismissal. A pointer-anchored menu
keeps the same collision placement, focus management, submenu keyboard
navigation, and outside/Escape dismissal as a trigger-anchored one.

The menu opens in the browser top layer, flips and shifts at viewport edges,
and limits its height to the available space, scrolling past it. The app
supplies pointer coordinates and command policy; it does not need to calculate
menu offsets. For other anchored content, use `AnchoredSurface` for help or
popup content, a native `title` for a plain-text hint, or `kerfjs/overlay`'s
`positionAnchored()` when only placement is needed. An application using the
Web Awesome integration may use `wa-tooltip` for a rich hover tooltip until
Kerf ships a styled one; `wa-popover` and `wa-popup` are `Discouraged`. These
are distinct interaction contracts: a command menu still uses `PopupMenu`.

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
`density="compact"` makes a single-line row 36px tall (42px with `iconTile`),
the same height as a compact `ListItem`, so the two row kinds stay level in a
dense mixed list; a standard row is 44px.

When the trailing control is an overflow menu ("…" with Edit, Delete, …),
pass `trailingMenu: { label, icon, items, placement?, disabled? }` instead of
the `trailingAction*` props. The row renders a real `PopupMenu` (icon-only, no
caret, opening `bottom-end` by default) as its sibling trailing control, and
`trailingActionVisibility="interaction"` reveals it the same way, keeping it
visible while the menu is open. Register `@kerfjs/ui/popup-menu/register` once.
Items dispatch their own `data-action`s; find the row from a chosen item with
`closest('[data-component="list-action-row"]')`. To open the same menu on a
right-click, delegate `contextmenu` on the row's primary button, prevent the
browser menu, and call `openPopupMenuAt` with the row's
`[data-component="popup-menu"]` child and the pointer's `clientX` /
`clientY`: a button-triggered menu opens `bottom-start` at the pointer for that
opening and returns to its trigger once it closes.

```tsx
<ListActionRow
  action="select-command"
  itemId={command.id}
  label={command.name}
  trailingActionVisibility="interaction"
  trailingMenu={{
    label: `Actions for ${command.name}`,
    icon: moreIcon,
    items: [
      { label: 'Edit', action: 'edit-command' },
      { kind: 'divider' },
      { label: 'Delete', action: 'delete-command', tone: 'danger' },
    ],
  }}
/>;

delegate(list, 'contextmenu', '[data-action="select-command"]', (event, primary) => {
  const menu = primary.parentElement?.querySelector<PopupMenuElement>(
    ':scope > [data-component="popup-menu"]',
  );
  if (!menu) return;
  event.preventDefault();
  openPopupMenuAt(menu, (event as MouseEvent).clientX, (event as MouseEvent).clientY);
});
```

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
state. Resolve each card activation with `applySelection` and
`selectionGesture` from `@kerfjs/ui/selection`, which implement the same
platform-normalized replace, Cmd/Ctrl-toggle, and Shift-range model as
`ChoiceChips` `multiple` (`isApplePlatform` decides between Cmd and Ctrl); `wireContentItems` forwards those modifiers from
Enter and Space, and keeps the grid one Tab stop. Put content that is not
selectable between those rows (an activity group, a "messages skipped"
divider) in a `ContentItem gridRow`, never a hand-written `role="row"`
wrapper.
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

## File and link chips

Give `Chip` an `href` when a short chip should open or download something,
such as the files a chat message references. The chip becomes a native `<a>`
with the same geometry, icon slot, truncation, and focus ring, plus hover
feedback. `download` is `true` or the suggested file name; `external` opens a
new tab with `rel="noopener noreferrer"` and announces it, like
`ListItemLink`. A link chip cannot also carry a remove button. Use
`ListItemLink` for a navigation row and `ToolbarActionLink` in a toolbar.

Inside a `brand-loud` or `neutral` `ContentItem` bubble, set
`tone="inherit"`: the chip follows the bubble's foreground and draws its shape
with a currentColor border (soft for `quiet`, full strength for `outline` and
`solid`) instead of a fill, so its label keeps the bubble's text contrast.
Its hover strengthens the border and underlines the label, and its focus ring
follows the foreground. Semantic tones keep their fills and add a currentColor
wash on hover. File names are data: keep their spelling.

```tsx
<Row gap="xs" wrap>
  {files.map((file) => (
    <Chip
      tone="inherit"
      href={file.url}
      download={file.name}
      icon={<LucideIcon icon={FileText} name="file-text" />}
      truncate
    >
      {file.name}
    </Chip>
  ))}
</Row>
```

## Action chips

Give `Chip` an `action` when activating the chip should do something with its
value once, such as inserting a filter token from a search syntax help popover
into the query. The whole chip becomes a native
`<button type="button" data-action data-item-id>` with the same geometry, plus
hover, press, focus-ring, and `disabled` states; Enter and Space activate it,
and a delegated handler reads `itemId`. Set `actionLabel` when the visible
label alone is unclear, and keep the label inside it ("Insert filter is:mine")
so speech input still matches. An action chip cannot also take `href` or
`removeAction`, because nested interactive content is invalid. Use `Badge` for
metadata nobody activates, and `ChoiceChips` when the chips hold a persistent
radio or checkbox value.

A compact, rounded action chip is exactly as tall as the compact `Badge` it
replaces, so a wrapping `Row` of them in a compact `ValueTable` cell keeps the
table's row height.

```tsx
<ValueTable label="Search Filters" density="compact">
  <ValueTableRow
    label="Ownership"
    value={
      <Row gap="2xs" wrap>
        {['is:mine', 'is:shared'].map((token) => (
          <Chip
            action="search-help-insert"
            actionLabel={`Insert filter ${token}`}
            itemId={token}
            size="compact"
            shape="rounded"
          >
            {token}
          </Chip>
        ))}
      </Row>
    }
  />
</ValueTable>
```

## Wrapping exclusive choices

Use `ChoiceChips` when one value is chosen from a visible set that does not
fit one segmented track: a nine-color palette in a 560px dialog, say, which
must wrap onto several rows and still read well at phone width. Each choice is
a separate pill backed by a native radio, so the group is one Tab stop, arrow
keys move the selection, and the checked radio is the form value under `name`.
The pills wrap with the standard 8px control gap; never wrap a
`SegmentedControl` or a joined button group instead — their joined
borders turn ragged across rows.

Lead a choice with `swatch` for a color (a `CssColor` from `uiColor()`,
`colorVar()`, or the `fillColor` helper — `fillColor('#3b82f6')` — for an
application-chosen CSS color; never `foregroundColor()` for a fill), `swatch: 'transparent'` for the
no-color option (an outlined dot struck through diagonally), or a decorative
`icon`. Keep every label visible: the swatch and the selected tint are
supplementary. Name the group with `label`, or with `labelledBy` pointing at a
visible `FieldLabel`.

```tsx
<FieldLabel id="command-color-label">Color</FieldLabel>
<ChoiceChips
  name="color"
  labelledBy="command-color-label"
  value={command.color}
  action="select-command-color"
  choices={[
    { value: 'transparent', label: 'Transparent', swatch: 'transparent' },
    { value: 'blue', label: 'Blue', swatch: fillColor('#3b82f6') },
    { value: 'green', label: 'Green', swatch: fillColor('#22c55e') },
  ]}
/>
```

### Wrapping multiple choices

When the person may turn any number of the visible options on, `value`
becomes a `readonly Value[]` (the type rejects a single value, and a single
group rejects an array) and `multiple` picks the model:

- `multiple: 'toggle'` — each pill toggles alone, as label filters or the
  intents an annotation carries do. The pills are native checkboxes in a
  `role="group"`: each pill is a Tab stop, a click or Space toggles it, and
  every checked value submits under `name`. Delegate the `action` on `change`
  and read the checked boxes by `name`, which lists them in choice order.
- `multiple: true` — the desktop multi-select, for picking a working set
  where a plain click should mean "just this one". The group is an
  `aria-multiselectable` listbox: a click selects one chip, Cmd (Apple
  platforms) or Ctrl (elsewhere) toggles one, and Shift extends a range from
  the last plain or toggled chip. It is one Tab stop; arrows, Home, and End
  move the selection, Shift with them extends it, Cmd/Ctrl with them moves
  focus alone, Space toggles, and Cmd/Ctrl+A selects all. Wire it once with
  `wireChoiceChips` from `@kerfjs/ui/wire-choice-chips`; it fires
  `change` on the group (which carries the `action`), and `readChoiceChips`
  returns the new set. Hidden inputs submit each selected value under `name`.

A multiple group takes no `required`. Prefer a multiple `Select` when the
option list is long or space is tight.

On dark inverse chrome, such as a media viewer, put the chips inside a dark
appearance scope (`.wa-dark`, or any `color-scheme: dark` ancestor) rather
than restyling them: every chip color is a theme token that follows the scope.

```tsx
<ChoiceChips
  name="intents"
  label="Annotation Intents"
  multiple="toggle"
  value={annotation.intents}
  action="toggle-annotation-intent"
  choices={[
    { value: 'comment', label: 'Comment' },
    { value: 'bug', label: 'Bug' },
    { value: 'question', label: 'Question' },
  ]}
/>
```

```ts
delegateActions(root, 'change', {
  'toggle-annotation-intent': () => {
    annotation.intents = [
      ...root.querySelectorAll<HTMLInputElement>(
        'input[name="intents"]:checked',
      ),
    ].map((box) => box.value);
  },
});
```

## Web Awesome integration

Kerf UI does not need Web Awesome. Every Kerf component renders native
elements, reads only `--kui-*` tokens, and ships no Web Awesome code, so a
Kerf-only application installs nothing else. Web Awesome is an optional
integration for applications that already use it or need one of its
specialized elements: import the CSS-only `@kerfjs/ui/webawesome.css` theme
bridge, `@kerfjs/ui/webawesome` for Kerf JSX types, and each element's
registration module. See the [Web Awesome theme contract](./webawesome-theme.md)
and the [migration guide](./webawesome-migration.md).

Integration coverage means supported and themed, not preferred. The UX catalog
lists those elements in its collapsed Web Awesome Integration section and tags
every element a Kerf component replaces `Discouraged`. Never render a
`Discouraged` element in application, demo, or recipe markup; use the Kerf
component below, and file a component gap rather than dropping to the raw tag.

| Web Awesome element                                             | Kerf choice                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wa-button`, `wa-dropdown`, `wa-dropdown-item`                  | Use `Button` (icon-only with `icon` and `ariaLabel`, or a toggle with `pressed`) for actions and `PopupMenu` for a command menu. Use `ListItem` for a navigation row and `Select` for a value.                                                                      |
| `wa-button-group`                                               | Use `ToolbarControlGroup` or `SplitButton` for grouped actions and `SegmentedControl` for one-of-many selection.                                                                                                                                                    |
| `wa-input`, `wa-textarea`, `wa-tag`                             | Use `TextField` for free text (`multiline` for a textarea) and `Chip` for removable or disabled tags; use `SearchField` only when text and ordered filter tokens form one editor.                                                                                   |
| `wa-checkbox`, `wa-checkbox-group`, `wa-switch`                 | Use `Checkbox` for a submitted option (a group of them in a `List`, or `ChoiceChips` `multiple: 'toggle'` for wrapping pills) and `Switch` for a setting that applies immediately.                                                                                  |
| `wa-radio-group`, `wa-radio`                                    | Use `RadioGroup` for a few labeled options, `ChoiceChips` for wrapping pills, and `SegmentedControl` for a view switch.                                                                                                                                             |
| `wa-select`, `wa-option`                                        | Use `Select`, which owns Kerf spacing, controlled rendering, and form participation.                                                                                                                                                                                |
| `wa-dialog`, `wa-drawer`                                        | Use `DialogSurface` with `openDialog` / `closeDialog` (`presentation="side-sheet"` or `"bottom-sheet"` for a drawer), or a `kerfjs/overlay` dialog. Use `CollapsiblePanel` for a rail that overlays content on compact devices.                                     |
| `wa-tab-group`, `wa-tab`, `wa-tab-panel`                        | Use `TabBar`/`TabBarItem` for application tabs or `SegmentedControl` for compact local views.                                                                                                                                                                       |
| `wa-icon`                                                       | Use `LucideIcon`.                                                                                                                                                                                                                                                   |
| `wa-badge`, `wa-spinner`, `wa-skeleton`                         | Use `Badge`, `LoadingSpinner`, and `Skeleton`.                                                                                                                                                                                                                      |
| `wa-split-panel`                                                | Use `ResizableRegion` for application panes.                                                                                                                                                                                                                        |
| `wa-progress-bar`, `wa-progress-ring`                           | Use `ProgressBar` (`@kerfjs/ui/progress-bar`, a native progress element) or, where a bar does not fit, `ProgressRing` (`@kerfjs/ui/progress-ring`).                                                                                                                 |
| `wa-callout`                                                    | Use `StateBanner` for persistent inline status, alerts, and emphasized messages, and `EmptyState` for absent content.                                                                                                                                               |
| `wa-popover`, `wa-popup`                                        | Use `AnchoredSurface` (`openAnchoredSurface` / `openAnchoredSurfaceAt`) for anchored help or popup content; place any other element with `positionAnchored()` or `autoReposition()` from `kerfjs/overlay`.                                                          |
| `wa-card`                                                       | Use `ContentItem` (`appearance="surface"` with `frame="framed"` for a raised card) to contain related content, or `SunkenPanel` for a lowered region.                                                                                                               |
| `wa-page`                                                       | Compose the shell from `Workbench`, `SplitView`, `NavStack`, or `TabNavigator`.                                                                                                                                                                                     |
| `wa-tooltip`                                                    | Call `tooltip()` from `kerfjs/overlay` with `@kerfjs/ui/overlay-tooltip.css` imported (pass `exitClass: 'kui-tooltip-exit'`, `exitDuration: 100`). Icon-only toolbar and popup controls already get help tags; a native `title` remains fine for a plain-text hint. |
| `wa-toast`, `wa-toast-item`                                     | Call `toast()` from `kerfjs/overlay` with `@kerfjs/ui/overlay-toast.css` imported (pass `exitClass: 'kui-toast-exit'`, `exitDuration: 200`); use a `StateBanner` in place for a persistent status.                                                                  |
| `wa-details`, `wa-accordion`, `wa-accordion-item`               | Use `Disclosure` (`@kerfjs/ui/disclosure`), a native details element; Disclosures sharing a `name` form an accordion.                                                                                                                                               |
| `wa-slider`                                                     | Use `Slider` (`@kerfjs/ui/slider`), a native range input, with `wireSliders` for its live readout.                                                                                                                                                                  |
| `wa-tag-input`                                                  | Use `TagField` (`@kerfjs/ui/tag-field`) with `wireTagFields` for tags submitted as form values, or `SearchField` for search filters.                                                                                                                                |
| `wa-color-picker`                                               | Use `ColorField` (`@kerfjs/ui/color-field`) with `wireColorFields` for a color in a form, an inline `ColorPicker` when the color is the main task, or `ColorSwatches` for a fixed palette.                                                                          |
| `wa-include`                                                    | Fetch remote content with `resource()` from `kerfjs/async` and render it as Kerf content; never inject fetched markup, which bypasses kerf's `SafeHtml` escaping.                                                                                                   |
| `wa-scroller`                                                   | Let a `Pane` own vertical scrolling with its scroll edges (`wireScrollDividers`), or use `ColumnTrack` for a horizontal track.                                                                                                                                      |
| `wa-tree`, `wa-tree-item`, `wa-animated-image`, `wa-comparison` | Use only in an integration application, for the specialized behavior named by the component.                                                                                                                                                                        |
| `wa-zoomable-frame`                                             | Avoid for application UI; keep embedded-media behavior application-owned.                                                                                                                                                                                           |

All other entries in the [Web Awesome theme contract](./webawesome-theme.md#coverage)
remain supported in an integration application when their native semantic
contract matches the product need.

### Toolbar width visibility

`ToolbarText` and `ToolbarControlGroup` accept typed `hideBelow` and
`showBelow` CSS lengths. Call `wireToolbarVisibility` with the application root from
`@kerfjs/ui/wire-toolbar-visibility` after mounting, and call its disposer when
the application unmounts. The nearest Toolbar's **content-box width**, excluding
padding, borders, and safe-area insets, determines visibility. `hideBelow={px(416)}`
hides strictly below 416px; `showBelow={px(416)}` shows strictly below 416px. At
416px the first is visible and the second hidden. Together they define the visible
interval `[hideBelow, showBelow)`. Width rules intersect existing visibility and
expanded-state rules; they never force a CSS-hidden group visible.

Use `px`, `rem`, `em`, `pct`, `space`, `lengthVar`, or `calc`/`plus` to construct
lengths. Percentages resolve against that content box, `em` uses the child item's
font size, and custom properties use its inherited and own token context. The
helper follows resizes, theme/token/font changes, inserted items, nested toolbars,
and relocated groups. Invalid, unresolved, negative, or contradictory thresholds
leave the item visible under this width policy. Server-rendered content is visible
until wiring runs; without browser observers, initial wiring and window resize
still update it. Dispose to remove measurement probes and restore prior markers.

Hidden controls leave layout and keyboard navigation. A hidden busy group also
hides only its own adjacent busy status. Keep primary actions always available;
show a complementary overflow group for secondary actions at narrow widths.

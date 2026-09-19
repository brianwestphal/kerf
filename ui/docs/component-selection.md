# Component selection and composition

Start with the interface need, not an export name or a screenshot resemblance.
Use the shipped [`component-catalog.json`](../ai/component-catalog.json) when a
tool needs exhaustive structured facts; this page remains the concise human
decision procedure.

1. Search the [Kerf UX catalog](./ux-demo.md) and the supported Web Awesome set.
2. Reuse a primitive when its purpose, anatomy, state, and interaction match.
3. Compose primitives for recurring layout. Prefer public props and tokens; when a composition needs a selector, target only classes listed in the catalog's `publicClasses` contract.
4. Add a thin application adapter for product copy, domain mapping, actions, routing, persistence, permissions, and transport.
5. Use custom markup only when the semantic contract differs. If the pattern recurs across products, open an upstream component or recipe request.

The application adapter is usually a plain function that maps domain state to
component props plus stable `data-action` values. It is not a fork of package
markup or CSS.

**Don't fight the components.** The package is built to look right unstyled, so
custom CSS is the exception. Before adding `padding`, `margin`, `width`, `height`,
`border`, `background`, a wrapper card, or a decoration, check whether the
component, the pane, or the content-item already owns it — it almost always does,
and adding more usually double-insets or fights it. Trust component defaults and
fix the surrounding layout instead of overriding a control. See
[`design-philosophy.md`](./design-philosophy.md) "Reach for the primitive, not for
CSS".

## Production recipes

Use the [complete recipe guide](./recipes.md) when several primitives form one
application boundary:

| Task | Stable catalog route |
| --- | --- |
| Desktop application shell | [Catalog](../ux-demo/) · `?component=recipe-app-shell` |
| Navigation sidebar | [Catalog](../ux-demo/) · `?component=recipe-navigation-sidebar` |
| Workspace header | [Catalog](../ux-demo/) · `?component=recipe-workspace-header` |
| List-detail dialog | [Catalog](../ux-demo/) · `?component=recipe-list-detail-dialog` |
| Composer form | [Catalog](../ux-demo/) · `?component=recipe-composer-form` |
| List workspace states | [Catalog](../ux-demo/) · `?component=recipe-list-workspace-states` |
| Compact toolbar choices and actions | [Catalog](../ux-demo/) · `?component=recipe-compact-toolbar` |
| Navigation stack | [Catalog](../ux-demo/) · `?component=recipe-navigation-stack` |
| Loading inspector | [Catalog](../ux-demo/) · `?component=recipe-loading-inspector` |
| Collapsible sidebar | [Catalog](../ux-demo/) · `?component=recipe-collapsible-sidebar` |

Recipes use public production exports and show ownership boundaries; they are
copyable reference compositions, not new monolithic components.

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

| Interface need | Use when | Do not use when; nearest alternative | Required wiring | Application owns | Import | Recipe |
| --- | --- | --- | --- | --- | --- | --- |
| Icon — `LucideIcon` | A decorative or explicitly labeled Lucide-compatible icon belongs in app UI. | Do not use an icon as the only name of an unfamiliar action; add visible or accessible text. Prefer it over Web Awesome `wa-icon`. | None. | Icon choice and meaningful label. | `@kerfjs/ui/lucide-icon` | [Accessibility](./accessibility.md#shared-rules) |
| Disclosure indicator — `DisclosureArrow` | A control needs one animated 18px root-scaled visual for open and closed state, including configurable directions or a replacement icon. | Do not use it as the interactive control or accessible name; place it inside the button or control that exposes expanded state. | Pass the controlled `open` state, render it inside the owning control, author replacement icon content facing right before transforms, and override `--kui-disclosure-arrow-size` only when another visual size is required. Direction changes use the shortest rotation path, with counterclockwise chosen for a 180-degree closed-to-open tie. | Open state, interaction, accessible name, size override, replacement glyph, direction choices, and shortest-path rotation. | `@kerfjs/ui/disclosure-arrow` | [Component ownership](./component-contract.md#ownership-boundaries) |
| Application toolbar — `Toolbar` | Leading identity, optional centered content, and trailing controls form one horizontal app bar. | Do not use it for a page, panel, or dialog heading; use `PanelHeader`. | Compose `ToolbarText` and `ToolbarControlGroup` where their contracts fit. | Actions, command availability, responsive relocation, and state. | `@kerfjs/ui/toolbar` | [Toolbar composition](../README.md#component-subpaths) |
| Toolbar control cluster — `ToolbarControlGroup` | Related toolbar controls need contained, borderless, pressed, or single-control treatment. | Do not use it merely to align unrelated buttons; use toolbar slots or ordinary layout. Web Awesome `wa-button-group` is only for an exceptional grouped-action contract. | Delegate child actions; use `SegmentedControl` for an exclusive choice. | Actions, pressed/expanded state, and policy. | `@kerfjs/ui/toolbar-control-group` | [Component ownership](./component-contract.md#ownership-boundaries) |
| Floating controls over content — `FloatingToolbar` | A small cluster of controls (e.g. a drawer restore) must float over scrolling content — distinct and forced-dark — inside a positioned container. | Do not use it for a primary page or panel toolbar (use `Toolbar`), or for anything that must sit above dialogs/overlays — it is not top-layer. | Compose `ToolbarControlGroup`s and delegate their actions; the app owns visibility and position. | Controls, visibility, and position. | `@kerfjs/ui/floating-toolbar` | [Component subpaths](../README.md#component-subpaths) |
| Toolbar identity text — `ToolbarText` | A toolbar needs extra-large (page/panel title), large, default, or compact textual identity. | Plain text is not a heading by default; when a title needs heading semantics pass `headingLevel` (or prefer `PanelHeader`, which forwards it). | Optional `headingLevel` for `role="heading"` + `aria-level`. | Text, heading level, and responsive priority. | `@kerfjs/ui/toolbar-text` | [Toolbar composition](../README.md#component-subpaths) |
| Navigation row — `ListItem` | A pane or navigation area needs a selectable, disabled, dormant-trailing, or multiline action row. | Do not put a control in `trailing`; use `ListActionRow` when the trailing region must be independently interactive. Use an `<a>` for navigation that must retain link behavior, a native `<button>` for an ordinary action, or implement the complete ARIA menu widget. | Delegate its `data-action`; compose inside a `.kui-content` section. Put domain event/drop metadata in `rootAttributes` rather than adding wrapper markup. | Routing, selection, permissions, copy, action handling, and domain `data-*` values. | `@kerfjs/ui/list-item` | [Pane geometry](../README.md#pane-and-content-geometry) |
| Navigation row with trailing action — `ListActionRow` | A full-width row needs a selectable primary action and an independently focusable trailing action. | Use `ListItem` when trailing content is dormant metadata. Do not put controls inside the row's `label`, `icon`, or `trailingActionIcon` SafeHtml slots. Do not use `AppTab` outside tablist semantics or `ToolbarControlGroup` outside a toolbar. | Delegate both action strings; update controlled selection and any popover/context-menu state in the app. | Routing, selection, both action policies, domain metadata, and popover/context-menu behavior. | `@kerfjs/ui/list-action-row` | [Accessibility](./accessibility.md#listactionrow) |
| Navigation section heading — `ListHeader` | A menu section needs a full-width label, semantic count, non-count badge, logical-end action, or real disclosure state. | Do not concatenate counts into `label` or put numeric content in `badge`; use `count` with the localized full phrase in `countLabel`. Do not add a disclosure arrow to navigation that reveals nothing. Do not shrink its 44px action target to the 18px visual. Do not use it as a page, panel, or dialog title; use `PanelHeader`. | Delegate its optional action; the app controls expanded state and revealed content. Toggle mode supplies `DisclosureArrow` unless `actionIcon` replaces it. Use `triggerAttributes` only for domain `data-*` or a native popover relationship. | Section organization, valid count and localized count label, disclosure state and content, non-count badge content, popover target behavior, and policy. | `@kerfjs/ui/list-header` | [Pane geometry](../README.md#pane-and-content-geometry) |
| Inset self-bordered control — `ListInsetControl` | A control that owns its own border and padding but no outer margin (a search input, a `SegmentedControl`) must line up inside a `.kui-content` list with the standard 8px inline margins and stretch to fill the row. | Do not wrap a `.kui-content-item` or a `ListItem`/`ListHeader` that already owns its inline margin — that double-insets it. Do not add ad-hoc `margin`/`padding` around a bare control to align it; use this instead. | Place the self-bordered control(s) as children; they stretch to fill. It applies only the inline margin, flex stretch, and 8px gap — the child owns its own border and padding. | The control(s), their state, and action wiring. | `@kerfjs/ui/list-inset-control` | [Pane geometry](../README.md#component-subpaths) |
| Inset bare text — `ListInsetText` | A plain string or inline content with no margin, border, or padding of its own must sit in a `.kui-content` list with its text edge aligned to the bordered items around it. | Do not use it to wrap a component that already owns content-item geometry (`ListItem`, `StateBanner`, a `.kui-content-item`) — that double-insets it. Do not hand-roll the 8px margin / 1px border / 8px padding. | Pass the text or inline `SafeHtml` as children; it supplies the 8px inline margin, 1px transparent border, and 8px padding so the text edge lands at the standard 17px inset. Pass `horizontalOnly` to keep that horizontal inset but drop the vertical margin, border, and padding for tight text layout. | The text, copy, and localization. | `@kerfjs/ui/list-inset-text` | [Pane geometry](../README.md#component-subpaths) |
| Application layout composition | A sidebar, main area, inspector, or dialog needs shared toolbar/content/footer and child geometry. | Do not pad the pane shell, wrap child-owned geometry in competing insets, invent unrelated centered measures, or leave an icon-only rail for a hidden pane. | Use `.kui-pane` and one `.kui-pane__content`; add `.kui-content` and `.kui-content-item` as needed. A visible pane owns collapse in its toolbar; move a hidden inline-start pane's restore control to the main toolbar leading edge and an inline-end pane's restore control to its trailing edge. | Layout hierarchy, reading width, scroll ownership, responsive relocation, and pane visibility state. | `@kerfjs/ui/layout.css` | [Pane anatomy](./layout.md#anatomy) |
| Menu composition | Navigation sections need full-size rows and the same content-item geometry as every other pane. | Do not add sidebar-specific wrapper padding, shrink targets to icon size, nest an interactive trailing control in `ListItem`, or use a chevron on a row that does not disclose content. Use ordinary links for a different navigation contract. | Compose `ListHeader`, `ListItem`, and `ListActionRow` in `.kui-content`; use `ListHeader` toggle mode with real controlled content, and use `.kui-content-item` for other surfaces plus a pane footer for toolbar actions. | Information architecture, disclosure content and state, responsive drawer/shell behavior, and token overrides. | `@kerfjs/ui/layout.css` | [Pane geometry](../README.md#pane-and-content-geometry) |
| Resizable application pane — `ResizableRegion`, `clampRegionSize`, `resizeRegionFromPointer` | A controlled split pane needs the Kerf separator, collapse state, pointer plus keyboard resizing, or a product-specific decorative grip. | Do not use it for a static two-column layout; use CSS grid. Prefer it over Web Awesome `wa-split-panel` unless that component's distinct API is required. Keep `handleIcon` noninteractive. | Call `wireResizableRegions` from `@kerfjs/ui/wire-resizable-regions` once and retain its disposer. | Size signal, min/max policy, collapse policy, persistence, and optional decorative handle icon. | `@kerfjs/ui/resizable-region` | [ResizableRegion contract](./accessibility.md#resizableregion) |
| One application tab — `AppTab` | A controlled app tab needs selection, close, drag, leading/trailing anatomy, safe domain metadata, or a product-specific close glyph. | Do not render it alone or use it for a small settings choice; compose in `TabBar`, or use `SegmentedControl`. Keep `closeIcon` noninteractive. | Compose in `TabBar`; let `wireTabBars` manage interaction. Put only domain `data-*` values in `rootAttributes`. | Tab identity, order, selection, close policy, content, and domain metadata values. | `@kerfjs/ui/app-tab` | [Tabs contract](./accessibility.md#tabs) |
| Application tab strip — `TabBar`, `wireTabBars`, `reorderTabs` | Tabs switch page regions and may overflow, close, or reorder. | Do not use it for a compact local view toggle; use `SegmentedControl`. Do not use it for a long choice list; use `Select`. Prefer it over Web Awesome `wa-tab-group`, `wa-tab`, and `wa-tab-panel` for Kerf app tabs. | Call `wireTabBars` once, retain the disposer, and apply `onReorder` synchronously; `reorderTabs` is the default array helper. | Ordered tabs, selection, panels, routing, closing, and persistence. | `@kerfjs/ui/tab-bar` plus `@kerfjs/ui/wire-tab-bars` | [Tabs contract](./accessibility.md#tabs) |
| Panel, dialog, or page heading — `PanelHeader` | A panel, dialog, or page needs a heading with an extra-large title, an optional icon and subtitle, and trailing actions. | Do not use it as persistent app chrome; use `Toolbar`. It supplies header structure, not modal behavior; use an application overlay or Web Awesome `wa-dialog` for that behavior. | Connect the title id and any provided summary id to the dialog or panel host, pass the trailing controls (typically a `ToolbarControlGroup`), and delegate their actions. **For a page or view title set `headingLevel` (usually `1`)** so the title is a real heading landmark (`role="heading"` + `aria-level`) for screen-reader heading navigation; omit it for a dialog title, which is referenced via `aria-labelledby` to `titleId` and needs no heading. | Open state, focus lifecycle, dismissal, the trailing controls, labels, copy, and the heading level for page use. | `@kerfjs/ui/panel-header` | [Header ownership](./component-contract.md#extracted-versus-application-specific) |
| Key/value facts — `ValueTable`, `ValueTableRow` | Read-only labels and values form a semantic definition list, optionally with a leading icon. | Do not use it for editable form fields or a row/column data grid; use native form or table semantics. | Compose typed `ValueTableRow` entries; pass `icon` when a 24px leading icon adds useful context. | Values, formatting, icon meaning, and empty/loading policy. | `@kerfjs/ui/value-table` | [Component ownership](./component-contract.md#ownership-boundaries) |
| Indeterminate activity — `LoadingSpinner` | A Kerf surface needs compact, labeled or decorative indeterminate progress. | Do not use it for known progress; use Web Awesome `wa-progress-bar` or `wa-progress-ring`. Direct Web Awesome UI may use `wa-spinner`; do not mix spinner systems within one surface. | None; pass a label when the spinner conveys status. | Loading lifecycle and adjacent status copy. | `@kerfjs/ui/loading-spinner` | [Accessibility](./accessibility.md#shared-rules) |
| Loading placeholder — `Skeleton` + a component's `placeholder` prop | A value or a whole component is still loading and should hold its space as a subtle, unanimated block, keeping the layout stable — an inspector or detail view rendering its real chrome with per-record values absent. | Do not use it for known progress (use `LoadingSpinner`), do not animate it, and do not hand-rebuild a component's empty state — set `placeholder` on the component instead. Prefer it over `wa-skeleton`, which the pure-Kerf primitives avoid to stay Web-Awesome-free. | Set `placeholder` on a value-bearing component (`Select`, `ListHeader`, `ListItem`, `ValueTableRow`, `PanelHeader`, `SegmentedControl`, `StateBanner`, `AppTab`, `ToolbarText`, `ListActionRow`) to render skeletons in its value slots with interactivity disabled; use the standalone `Skeleton` for a custom slot. | Loading lifecycle, which slots are unknown, and announcing the loading region. | `@kerfjs/ui/skeleton` | [Accessibility](./accessibility.md#shared-rules) |
| Value selection — `Select` | A controlled form value comes from a moderate or long choice list, possibly grouped or icon-bearing. | Do not use it for commands; use a real action menu. Do not use it for a small visible choice set; use `SegmentedControl`. Prefer it over direct `wa-select`, `wa-option`, or value-like `wa-dropdown`/`wa-dropdown-item` composition. | Import `@kerfjs/ui/select/register` once; listen for standard input/change events. | Controlled value, validation, choices, and domain mapping. | `@kerfjs/ui/select` | [Web Awesome integration](../README.md#web-awesome-theme) |
| Small exclusive choice — `SegmentedControl` | A few visible choices switch a compact view or setting, with toolbar, rounded, or pill presentation. | Do not use it for tabpanel semantics; use `TabBar`. Do not use it for many choices; use `Select`. Prefer it over `wa-button-group` when the controls select one value. | Delegate its action, read `data-segment-value`, update `value`, and rerender. | Controlled value, labels, action, and persistence. | `@kerfjs/ui/segmented-control` | [SegmentedControl contract](./accessibility.md#segmentedcontrol) |
| Structured search editor — `TokenSearchField`, `readTokenSearchField`, `placeTokenSearchCaret`, `wireTokenSearchFields` | Free text and ordered, editable, removable filter tokens share one searchbox; enable `collapsible` when an empty, unfocused field should reduce to one iconic action, standalone or in a toolbar group. | Do not use it for ordinary text entry; use a native input or Web Awesome `wa-input`. Do not use it when filters belong in separate form controls. | Read DOM-owned text on input, empty `textContent` on clear, and use `placeTokenSearchCaret` after explicit controlled focus changes. Call `wireTokenSearchFields` from `@kerfjs/ui/wire-token-search-fields` once so Enter submits without adding a line break and keyboard chip deletion restores focus plus the text-relative caret after controlled replacement. In `collapsible` mode it also manages the transient expand/collapse/focus by default (activate to reveal + focus, Escape or empty blur to collapse); bind the field's `expanded` to the signal on the returned handle (`handle.expanded(id)`) or adopt your own via `collapsible.signals`, and opt out per behavior only when the app must own it. | Parsing, suggestions, tokens, query execution, results, announcements, and — only if overriding the default — the collapsible `expanded` signal. | `@kerfjs/ui/token-search-field` | [TokenSearchField contract](./accessibility.md#tokensearchfield) |
| Persistent inline status — `StateBanner` | A neutral, info, success, warning, or danger message belongs next to the affected work. | Do not use it for a no-content screen; use `EmptyState`. Do not use it for transient confirmation; use a toast. Web Awesome `wa-callout` is the ecosystem alternative for Web Awesome-owned content. | Delegate an optional action; choose alert urgency only for attention-requiring failure. | State mapping, message lifetime, retry/action behavior, and copy. | `@kerfjs/ui/state-banner` | [Feedback accessibility](./accessibility.md#shared-rules) |
| Empty or busy content area — `EmptyState` | A content region has no items, cannot proceed, or is loading and needs explanation plus an optional action. | Do not use it for an inline status update; use `StateBanner`. Do not use it for transient success; use `wa-toast`/`wa-toast-item` or the application's toast system. | Delegate its optional action; it composes `LoadingSpinner` when busy. | Empty/busy policy, recovery action, illustration, and copy. | `@kerfjs/ui/empty-state` | [Feedback ownership](./component-contract.md#extracted-versus-application-specific) |

## Ambiguous choices

- `Toolbar` is persistent app chrome; `PanelHeader` heads a panel, dialog, or page.
- `TabBar` changes tabpanels and supports overflow/reorder; `SegmentedControl` chooses among a few compact views; `Select` handles a longer value list.
- `StateBanner` persists beside affected work; `EmptyState` replaces absent content; `wa-callout` is contextual ecosystem content; `wa-toast` and `wa-toast-item` are transient and must not carry the only copy of important state.
- `ResizableRegion` is an interactive controlled pane. CSS grid is the right answer when columns do not need a user-operable separator.
- `TokenSearchField` is a structured editor. A native input or `wa-input` is the right answer for ordinary text.

## Toolbar composition

A `Toolbar` has three zones — `leading`, `center`, and `trailing`. In almost
every case the only things that go **directly** in a zone are `ToolbarText`
(identity/title text) and `ToolbarControlGroup` (any control or cluster of
controls). Do not drop bare buttons, inputs, links, or arbitrary markup straight
into a zone; wrap controls in a `ToolbarControlGroup` so they get the shared
toolbar geometry, hover/pressed treatment, and grouping. `SegmentedControl`,
`Select`, a collapsible `TokenSearchField`, and Web Awesome controls all live
**inside** a `ToolbarControlGroup`, not loose in the zone. `PanelHeader` is the
one wrapper that composes these for you as a panel/dialog/page heading.

Common toolbar patterns:

| Want | Put in the zone | Notes |
| --- | --- | --- |
| Identity or title text | `<ToolbarText text="…" size="large" />` (or `xlarge` for a page/panel title) | Wrap in a `single` borderless group only when it must align with adjacent control pills |
| One or more icon/text buttons | `<ToolbarControlGroup>{buttons}</ToolbarControlGroup>` | Use `buttonAppearance="push"` for toggle buttons with `aria-pressed`; `single` for a lone control |
| An exclusive view switch | `<ToolbarControlGroup><SegmentedControl … /></ToolbarControlGroup>` | Not `TabBar`, which switches tabpanels |
| A value list | `<ToolbarControlGroup><Select … /></ToolbarControlGroup>` | Register `@kerfjs/ui/select/register` once |
| A collapsible search box | `<ToolbarControlGroup single><TokenSearchField collapsible … /></ToolbarControlGroup>` | The group animates the iconic ↔ expanded states; `wireTokenSearchFields` manages expand/collapse/focus by default |

A **popup menu in a toolbar** is a `single` `ToolbarControlGroup` wrapping a Web
Awesome `wa-dropdown`: its `slot="trigger"` `wa-button` is the toolbar button and
the `wa-dropdown-item`s are the menu. Keep the dropdown's managed light-DOM
children under `data-morph-skip-children` so kerf does not reconcile Web Awesome's
own DOM.

```tsx
<ToolbarControlGroup single>
  <wa-dropdown placement="bottom-start" data-morph-skip-children>
    <wa-button slot="trigger" appearance="plain" with-caret aria-label="Sort">
      <LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />
    </wa-button>
    <wa-dropdown-item data-action="sort-recent">Recently updated</wa-dropdown-item>
    <wa-dropdown-item data-action="sort-priority">Priority</wa-dropdown-item>
  </wa-dropdown>
</ToolbarControlGroup>
```

## Correct composition and duplicated-markup trap

Correct: let the pane stay unpadded while its children own the shared 8/1/8
geometry and 44px targets.

```tsx
<aside class="kui-pane">
  <nav class="kui-pane__content kui-content">
    <section>
    <ListHeader label="Workspace" />
    <ListItem action="open" label="Inbox" icon={inboxIcon} />
    <ListActionRow action="open-file" label="main.ts" trailingAction="file-actions" trailingActionLabel="Actions for main.ts" trailingActionIcon={moreIcon} />
    </section>
    <div class="kui-content-item">Workspace details</div>
  </nav>
</aside>
```

Incorrect: duplicating component-like rows and compensating for nested padding
forks the package anatomy and spacing contract.

```tsx
<aside class="sidebar padded">
  <h2 class="list-header-copy">Workspace</h2>
  <button class="menu-row-copy padded">Inbox</button>
  <div class="panel indented-with-negative-margin">Workspace details</div>
</aside>
```

## Web Awesome overlap policy

Web Awesome catalog coverage means supported and themed, not preferred. Import
`@kerfjs/ui/webawesome` for Kerf JSX types, individual component modules for
registration, and the CSS-only `@kerfjs/ui/webawesome.css` theme.

| Web Awesome choice | Kerf decision |
| --- | --- |
| `wa-button`, `wa-dropdown`, `wa-dropdown-item` | Use buttons and command menus for actions. Use `ListItem` for a navigation row and `Select` when the user chooses a value. |
| `wa-button-group` | Use only for exceptional grouped actions; use `SegmentedControl` for one-of-many selection. |
| `wa-input`, `wa-tag` | Use for ordinary text and tags; use `TokenSearchField` only when text and ordered filter tokens form one editor. |
| `wa-select`, `wa-option` | Use `Select`, which owns Kerf spacing, controlled rendering, icon stability, and explicit registration. |
| `wa-tab-group`, `wa-tab`, `wa-tab-panel` | Use `TabBar`/`AppTab` for application tabs or `SegmentedControl` for compact local views. |
| `wa-icon` | Use `LucideIcon` in application UI. |
| `wa-split-panel` | Use `ResizableRegion` for Kerf application panes; retain Split Panel only when its distinct API is required. |
| `wa-spinner`, `wa-progress-bar`, `wa-progress-ring`, `wa-skeleton` | Use `LoadingSpinner` for compact Kerf indeterminate activity; choose the ecosystem component when its distinct progress or placeholder semantics fit. |
| `wa-callout`, `wa-toast`, `wa-toast-item` | Use `StateBanner` for persistent inline app status, `EmptyState` for absent content, and toasts only for transient feedback. |
| `wa-popup`, `wa-tooltip`, `wa-popover` | Prefer the high-level interaction whose semantics fit. Use Popup only when its low-level anchored positioning removes custom placement code. |
| `wa-tree`, `wa-tree-item`, `wa-animated-image`, `wa-comparison` | Use only for the specialized behavior named by the component. |
| `wa-zoomable-frame` | Avoid for application UI; keep embedded-media behavior application-owned. |

All other entries in the [Web Awesome theme contract](./webawesome-theme.md#coverage)
remain supported when their native semantic contract matches the product need.

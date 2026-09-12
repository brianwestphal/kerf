# Component selection and composition

Start with the interface need, not an export name or a screenshot resemblance.
Use the shipped [`component-catalog.json`](../ai/component-catalog.json) when a
tool needs exhaustive structured facts; this page remains the concise human
decision procedure.

1. Search the [Kerf UX catalog](./ux-demo.md) and the supported Web Awesome set.
2. Reuse a primitive when its purpose, anatomy, state, and interaction match.
3. Compose primitives for recurring layout, using public props, classes, and tokens rather than restyling private descendants.
4. Add a thin application adapter for product copy, domain mapping, actions, routing, persistence, permissions, and transport.
5. Use custom markup only when the semantic contract differs. If the pattern recurs across products, open an upstream component or recipe request.

The application adapter is usually a plain function that maps domain state to
component props plus stable `data-action` values. It is not a fork of package
markup or CSS.

## Production recipes

Use the [complete recipe guide](./recipes.md) when several primitives form one
application boundary:

| Task | Stable catalog route |
| --- | --- |
| Desktop application shell | [Catalog](../ux-demo/) · `?component=recipe-app-shell` |
| Navigation sidebar | [Catalog](../ux-demo/) · `?component=recipe-navigation-sidebar` |
| Workspace header | [Catalog](../ux-demo/) · `?component=recipe-workspace-header` |
| Master-detail dialog | [Catalog](../ux-demo/) · `?component=recipe-master-detail-dialog` |
| Composer form | [Catalog](../ux-demo/) · `?component=recipe-composer-form` |
| List workspace states | [Catalog](../ux-demo/) · `?component=recipe-list-workspace-states` |
| Compact toolbar choices and actions | [Catalog](../ux-demo/) · `?component=recipe-compact-toolbar` |

Recipes use public production exports and show ownership boundaries; they are
copyable reference compositions, not new monolithic components.

## Problem-to-component matrix

| Interface need | Use when | Do not use when; nearest alternative | Required wiring | Application owns | Import | Recipe |
| --- | --- | --- | --- | --- | --- | --- |
| Icon — `LucideIcon` | A decorative or explicitly labeled Lucide-compatible icon belongs in app UI. | Do not use an icon as the only name of an unfamiliar action; add visible or accessible text. Prefer it over Web Awesome `wa-icon`. | None. | Icon choice and meaningful label. | `@kerfjs/ui/lucide-icon` | [Accessibility](./accessibility.md#shared-rules) |
| Application toolbar — `Toolbar` | Leading identity, optional centered content, and trailing controls form one horizontal app bar. | Do not use it for a page title and one page action; use `PageHeader`. Do not use it as a dialog heading; use `DialogHeader`. | Compose `ToolbarText` and `ToolbarControlGroup` where their contracts fit. | Actions, command availability, responsive relocation, and state. | `@kerfjs/ui/toolbar` | [Toolbar composition](../README.md#component-subpaths) |
| Toolbar control cluster — `ToolbarControlGroup` | Related toolbar controls need contained, borderless, pressed, or single-control treatment. | Do not use it merely to align unrelated buttons; use toolbar slots or ordinary layout. Web Awesome `wa-button-group` is only for an exceptional grouped-action contract. | Delegate child actions; use `SegmentedControl` for an exclusive choice. | Actions, pressed/expanded state, and policy. | `@kerfjs/ui/toolbar-control-group` | [Component ownership](./component-contract.md#ownership-boundaries) |
| Toolbar identity text — `ToolbarText` | A toolbar needs large, default, or compact textual identity. | Do not substitute it for document heading semantics; use `PageHeader` or native headings. | None. | Text and responsive priority. | `@kerfjs/ui/toolbar-text` | [Toolbar composition](../README.md#component-subpaths) |
| Navigation row — `MenuItem` | A sidebar or navigation rail needs a selectable, disabled, trailing, or multiline action row. | Do not use it for an ordinary inline link, form submit button, or isolated ARIA menu item. Use an `<a>` for navigation that must retain link behavior, a native `<button>` for an ordinary action, or implement the complete ARIA menu widget. | Delegate its `data-action`; compose inside the sidebar grid when applicable. | Routing, selection, permissions, copy, and action handling. | `@kerfjs/ui/menu-item` | [Sidebar alignment](../README.md#sidebar-alignment) |
| Navigation section heading — `MenuHeader` | A menu section needs a label, optional action, or disclosure state. | Do not use it as a page or dialog title; use `PageHeader` or `DialogHeader`. | Delegate its optional action; the app controls expanded state. | Section organization, disclosure state, and policy. | `@kerfjs/ui/menu-header` | [Sidebar alignment](../README.md#sidebar-alignment) |
| Application layout composition | Page, pane, surface, section, control, metadata, dialog, and scroll boundaries need shared semantic spacing roles. | Do not stack inset roles, wrap component-owned chrome in competing padding, or invent unrelated centered measures. | Apply `.kui-layout` at the root and exactly one role at each real boundary. | Layout hierarchy, reading width, scroll ownership, and responsive relocation. | `@kerfjs/ui/layout.css` | [Layout decision table](./layout.md#decision-table) |
| Sidebar/menu composition | Headers, icon-bearing rows, iconless rows, and inset surfaces must share one label column. | Do not stack wrapper padding, align text to a decorative border, or repair spacing with negative margins. Use ordinary layout for a different navigation hierarchy or reading width. | Compose `MenuHeader` and `MenuItem`; apply `.kui-sidebar`, `.kui-sidebar-section`, and `.kui-sidebar-surface`. | Information architecture, responsive drawer/shell behavior, and token overrides. | `@kerfjs/ui/sidebar.css` | [Sidebar alignment](../README.md#sidebar-alignment) |
| Resizable application pane — `ResizableRegion`, `clampRegionSize`, `resizeRegionFromPointer` | A controlled split pane needs the Kerf separator, collapse state, and pointer plus keyboard resizing. | Do not use it for a static two-column layout; use CSS grid. Prefer it over Web Awesome `wa-split-panel` unless that component's distinct API is required. | Call `wireResizableRegions` from `@kerfjs/ui/wire-resizable-regions` once and retain its disposer. | Size signal, min/max policy, collapse policy, and persistence. | `@kerfjs/ui/resizable-region` | [ResizableRegion contract](./accessibility.md#resizableregion) |
| One application tab — `AppTab` | A controlled app tab needs selection, close, drag, leading, or trailing anatomy. | Do not render it alone or use it for a small settings choice; compose in `TabBar`, or use `SegmentedControl`. | Compose in `TabBar`; let `wireTabBars` manage interaction. | Tab identity, order, selection, close policy, and content. | `@kerfjs/ui/app-tab` | [Tabs contract](./accessibility.md#tabs) |
| Application tab strip — `TabBar`, `wireTabBars`, `reorderTabs` | Tabs switch page regions and may overflow, close, or reorder. | Do not use it for a compact local view toggle; use `SegmentedControl`. Do not use it for a long choice list; use `Select`. Prefer it over Web Awesome `wa-tab-group`, `wa-tab`, and `wa-tab-panel` for Kerf app tabs. | Call `wireTabBars` once, retain the disposer, and apply `onReorder` synchronously; `reorderTabs` is the default array helper. | Ordered tabs, selection, panels, routing, closing, and persistence. | `@kerfjs/ui/tab-bar` plus `@kerfjs/ui/wire-tab-bars` | [Tabs contract](./accessibility.md#tabs) |
| Page title and action — `PageHeader` | A page needs its primary heading and an optional trailing action. | Do not use it as persistent app chrome; use `Toolbar`. Do not use it inside a modal task; use `DialogHeader`. | Delegate an optional action normally. | Page title, action, and responsive placement. | `@kerfjs/ui/page-header` | [Header ownership](./component-contract.md#extracted-versus-application-specific) |
| Dialog title and summary — `DialogHeader` | A dialog needs title/summary ids, optional icon, and actions wired to the dialog's ARIA references. | Do not use it as the page's `h1`; use `PageHeader`. It supplies a header, not modal behavior; use an application overlay or Web Awesome `wa-dialog` for that behavior. | Connect title/summary ids to the dialog host and delegate actions. | Open state, focus lifecycle, dismissal, actions, and copy. | `@kerfjs/ui/dialog-header` | [Header ownership](./component-contract.md#extracted-versus-application-specific) |
| Key/value facts — `ValueTable` | Read-only labels and values form a semantic definition list. | Do not use it for editable form fields or a row/column data grid; use native form or table semantics. | Supply `dt`/`dd` children. | Values, formatting, and empty/loading policy. | `@kerfjs/ui/value-table` | [Component ownership](./component-contract.md#ownership-boundaries) |
| Indeterminate activity — `LoadingSpinner` | A Kerf surface needs compact, labeled or decorative indeterminate progress. | Do not use it for known progress; use Web Awesome `wa-progress-bar` or `wa-progress-ring`. Direct Web Awesome UI may use `wa-spinner`; do not mix spinner systems within one surface. | None; pass a label when the spinner conveys status. | Loading lifecycle and adjacent status copy. | `@kerfjs/ui/loading-spinner` | [Accessibility](./accessibility.md#shared-rules) |
| Value selection — `Select` | A controlled form value comes from a moderate or long choice list, possibly grouped or icon-bearing. | Do not use it for commands; use a real action menu. Do not use it for a small visible choice set; use `SegmentedControl`. Prefer it over direct `wa-select`, `wa-option`, or value-like `wa-dropdown`/`wa-dropdown-item` composition. | Import `@kerfjs/ui/select/register` once; listen for standard input/change events. | Controlled value, validation, choices, and domain mapping. | `@kerfjs/ui/select` | [Web Awesome integration](../README.md#web-awesome-theme) |
| Small exclusive choice — `SegmentedControl` | A few visible choices switch a compact view or setting, with toolbar, rounded, or pill presentation. | Do not use it for tabpanel semantics; use `TabBar`. Do not use it for many choices; use `Select`. Prefer it over `wa-button-group` when the controls select one value. | Delegate its action, read `data-segment-value`, update `value`, and rerender. | Controlled value, labels, action, and persistence. | `@kerfjs/ui/segmented-control` | [SegmentedControl contract](./accessibility.md#segmentedcontrol) |
| Structured search editor — `TokenSearchField`, `readTokenSearchField`, `placeTokenSearchCaret` | Free text and ordered, editable, removable filter tokens share one searchbox. | Do not use it for ordinary text entry; use a native input or Web Awesome `wa-input`. Do not use it when filters belong in separate form controls. | Read DOM-owned text on input, empty `textContent` on clear, and restore the caret after controlled replacement. | Parsing, suggestions, tokens, query execution, results, and announcements. | `@kerfjs/ui/token-search-field` | [TokenSearchField contract](./accessibility.md#tokensearchfield) |
| Persistent inline status — `StateBanner` | A neutral, info, success, warning, or danger message belongs next to the affected work. | Do not use it for a no-content screen; use `EmptyState`. Do not use it for transient confirmation; use a toast. Web Awesome `wa-callout` is the ecosystem alternative for Web Awesome-owned content. | Delegate an optional action; choose alert urgency only for attention-requiring failure. | State mapping, message lifetime, retry/action behavior, and copy. | `@kerfjs/ui/state-banner` | [Feedback accessibility](./accessibility.md#shared-rules) |
| Empty or busy content area — `EmptyState` | A content region has no items, cannot proceed, or is loading and needs explanation plus an optional action. | Do not use it for an inline status update; use `StateBanner`. Do not use it for transient success; use `wa-toast`/`wa-toast-item` or the application's toast system. | Delegate its optional action; it composes `LoadingSpinner` when busy. | Empty/busy policy, recovery action, illustration, and copy. | `@kerfjs/ui/empty-state` | [Feedback ownership](./component-contract.md#extracted-versus-application-specific) |

## Ambiguous choices

- `Toolbar` is persistent app chrome; `PageHeader` identifies a page; `DialogHeader` labels a focused modal task.
- `TabBar` changes tabpanels and supports overflow/reorder; `SegmentedControl` chooses among a few compact views; `Select` handles a longer value list.
- `StateBanner` persists beside affected work; `EmptyState` replaces absent content; `wa-callout` is contextual ecosystem content; `wa-toast` and `wa-toast-item` are transient and must not carry the only copy of important state.
- `ResizableRegion` is an interactive controlled pane. CSS grid is the right answer when columns do not need a user-operable separator.
- `TokenSearchField` is a structured editor. A native input or `wa-input` is the right answer for ordinary text.

## Correct composition and duplicated-markup trap

Correct: let one sidebar composition own the gutter and label column.

```tsx
<aside class="kui-sidebar">
  <section class="kui-sidebar-section">
    <MenuHeader label="Workspace" />
    <MenuItem action="open" label="Inbox" icon={inboxIcon} />
    <div class="kui-sidebar-surface">Workspace details</div>
  </section>
</aside>
```

Incorrect: duplicating component-like rows and compensating for nested padding
forks the package anatomy and spacing contract.

```tsx
<aside class="sidebar padded">
  <h2 class="menu-header-copy">Workspace</h2>
  <button class="menu-row-copy padded">Inbox</button>
  <div class="panel indented-with-negative-margin">Workspace details</div>
</aside>
```

## Web Awesome overlap policy

Web Awesome catalog coverage means supported and themed, not preferred. Import
individual component modules and the CSS-only `@kerfjs/ui/webawesome.css` theme.

| Web Awesome choice | Kerf decision |
| --- | --- |
| `wa-button`, `wa-dropdown`, `wa-dropdown-item` | Use buttons and command menus for actions. Use `MenuItem` for a navigation row and `Select` when the user chooses a value. |
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

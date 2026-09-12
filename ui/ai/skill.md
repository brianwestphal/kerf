---
name: kerf-ui
description: Build interfaces with kerfjs and the @kerfjs/ui production component package. Use whenever code imports @kerfjs/ui or a task asks for Kerf UI components.
kerf-ui-skill-version: 1.11.0
---

# Building with @kerfjs/ui

Read `../docs/component-selection.md` first, then `../docs/recipes.md`, `../README.md`, `../docs/component-contract.md`, and `../docs/accessibility.md` before changing a consuming interface. Read `../docs/webawesome-theme.md` when using Web Awesome components or changing shared theme tokens.

Choose from the need, not from visual resemblance:

1. Search the Kerf catalog and preferred Web Awesome subset.
2. Reuse a primitive when purpose, anatomy, state, and interaction match.
3. Compose primitives for recurring layout without restyling private descendants.
4. Add a thin application adapter for copy, domain mapping, actions, routing, persistence, permissions, and transport.
5. Build custom markup only when the semantic contract differs; if it recurs across products, open an upstream component or recipe request.

Quick routing:

| Need | Choose | Nearest alternatives / boundary |
| --- | --- | --- |
| Navigation row | `MenuItem` | Use an ordinary link or button when sidebar/menu anatomy and state do not apply. |
| Page chrome or heading | `Toolbar`, `PageHeader`, or `DialogHeader` | Toolbar is persistent chrome; page and dialog headers identify different scopes. |
| Exclusive choice | `TabBar`, `SegmentedControl`, or `Select` | Tabs switch tabpanels; segments expose a few choices; Select handles a longer value list. |
| Status or absent content | `StateBanner` or `EmptyState` | Web Awesome callouts suit ecosystem content; toasts are transient and never the only record of important state. |
| Adjustable or static columns | `ResizableRegion` or CSS grid | Use the component only for a user-operable controlled separator. |
| Structured or ordinary search | `TokenSearchField` or an input | Use token search only when text and ordered filter chips form one editor. |

For a complete shell, sidebar, workspace header, master-detail dialog, composer
form, list-state lifecycle, or mixed-control toolbar, start from the runnable
reference in [`docs/recipes.md`](../docs/recipes.md). Preserve its production
primitives and semantic ownership; replace application state, policy, and copy.

The concise human decision matrix is in [`component-selection.md`](../docs/component-selection.md). For exhaustive tool retrieval, load [`component-catalog.json`](./component-catalog.json), the canonical metadata for every public component/helper, composition, and supported Web Awesome entry. Use its linked current recipes instead of inferring behavior from CSS.

Hard rules:

1. Import visual components from explicit JavaScript subpaths. In CSS-aware browser builds each subpath brings in its own reachable CSS, including UI subcomponents, while unrelated CSS remains out. The root barrel and `@kerfjs/ui/unstyled` are CSS-free; pair the root barrel with `styles.css` only when the complete layer is intentional. Manual CSS subpaths remain available for custom pipelines.
2. Components return Kerf `SafeHtml`. Never pass DOM nodes as children or use inline JSX event handlers.
3. Keep state, product copy, persistence, and domain mappings in the application. Do not add product-specific actions or fields to a generic component.
4. Wire `data-action` hooks from one stable root with `delegate()` or `delegateActions()` and retain disposers.
5. Use the opinionated `--kui-color-*` semantic ramps and component-level override properties. Override tokens at the narrowest useful scope; do not hard-code appearance-specific colors or replace private descendant rules.
6. `Select` is pure until the app explicitly imports `@kerfjs/ui/select/register`; do not import Web Awesome's full registration bundle. When an app uses Web Awesome components, import the CSS-only `@kerfjs/ui/webawesome.css` theme once and keep importing individual Web Awesome component modules so their JavaScript remains tree-shakeable. Pass icon-bearing `choices` and `renderSelected` content normally: `Select` preserves its slotted option icons across Kerf rerenders and keys selected content by the controlled value, so app wrappers must not add competing morph-control attributes.
7. Decorative icons are hidden; controls are named; focus is visible; state never relies on color alone; reduced motion and increased contrast remain usable.
8. `ResizableRegion` uses `wireResizableRegions()` for Arrow, Shift+Arrow, Home/End, and pointer behavior. The app owns size persistence.
9. Use controlled `SegmentedControl` for a small exclusive choice set. Select `appearance="toolbar"` when nesting it inside `ToolbarControlGroup`; use rounded or pill shapes for standalone contexts. Handle its action, update `value`, keep meaningful choice labels, and preserve every enabled native button in sequential Tab order.
10. Compose `AppTab` inside controlled `TabBar`; call `wireTabBars()` once and retain its disposer. It owns same-bar drag mechanics, including proximity-based horizontal edge autoscroll, while the app applies `onReorder` and owns order, selection, panels, close policy, routing, and persistence.
11. Use token-controlled `TokenSearchField` when free text and removable structured filters share one editor. Editable text stays DOM-owned between token changes. The app owns parsing and suggestions; call `readTokenSearchField()` on input, empty `textContent` on clear, and use `placeTokenSearchCaret()` after controlled DOM replacement.
12. Demo work uses public production component subpaths and their browser-selected CSS. Give every public visual component its own category-grouped catalog route; list themed third-party components under a clearly labeled collapsible ecosystem section, with a focused route for each. Declare direct `uses` relationships so `Used by` stays derivable, and theme shell chrome through the same semantic tokens as the stage instead of drawing a substitute.
13. The Web Awesome theme makes Tooltip and Popover arrowless by default. Keep that default unless a pointer materially clarifies the anchor; opt back in with `--wa-tooltip-arrow-size`, `--kui-wa-popover-arrow-size`, or a popover's public `--arrow-size`, and use `without-arrow` when local no-arrow intent should survive theme changes.
14. Treat the complete Web Awesome catalog as support coverage, not a recommendation list. Consider Popup when it replaces custom anchored positioning. Prefer Kerf `Select` over direct Dropdown/Dropdown Item/Select/Option composition, `SegmentedControl` over Button Group, `TabBar` or `SegmentedControl` over Web Awesome Tabs, `LucideIcon` over Web Awesome Icon, and `ResizableRegion` over Split Panel. Use Tree/Tree Item, Animated Image, and Comparison only for a specific required behavior; avoid Zoomable Frame.
15. Build navigation sidebars with one `.kui-sidebar` content gutter and the shared icon/label columns. Headers and rows align on content, including iconless rows. Put bordered or filled blocks in `.kui-sidebar-surface`: the border stays flush to the gutter and its contents align to the label column. Do not stack wrapper padding, align text to a decorative border, or compensate with negative margins. Import `@kerfjs/ui/sidebar.css` when using component subpaths; override `--kui-sidebar-*` tokens only at the shared composition boundary.
16. Build application spacing from `@kerfjs/ui/layout.css`. Put `.kui-layout` on the composition root and assign exactly one semantic owner to each page gutter, pane or surface body, section stack, control cluster, metadata row, dialog body, and scroll region. Keep toolbar/header chrome outside body insets. Let controls wrap or relocate at narrow widths instead of shrinking hit targets. Do not invent one-off offsets, unrelated centered max-widths, doubled padding, or competing scroll containers; adapt `--kui-layout-*` at the composition boundary.

Common mistakes:

| Mistake | Fix |
| --- | --- |
| Hard-coded project/transport action in a component | Pass a semantic `data-action` string from an application adapter |
| Per-instance signal at module scope | Create state in the application or a factory and pass it in |
| `role="menuitem"` on one button | Use the native button, or implement the complete ARIA menu widget |
| Test only a custom-element attribute | Assert live property, emitted event, focus, and rendered output |
| Import all Web Awesome components | Import only `@kerfjs/ui/select/register` for `Select`, or individual Web Awesome modules for other controls; `webawesome.css` registers no JavaScript |
| Maintain a root list of component styles | Import each visual component from its JS subpath; its reachable CSS follows automatically |
| Add demo-only markup for a production state | Add the state to the production component, then render that export in the catalog |
| Choose a listed ecosystem component by default | Apply the component-selection guidance above; catalog coverage means supported and themed, not preferred |
| Indent a sidebar panel until its border matches header text | Keep the surface flush to `.kui-sidebar` and use `.kui-sidebar-surface` to align its contents |
| Pad a page, pane, and nested card independently | Import `layout.css` and choose the single semantic inset owner for each real boundary |
| Let the document, pane, and list all scroll | Keep fixed chrome outside one `.kui-scroll-owner` per pane |

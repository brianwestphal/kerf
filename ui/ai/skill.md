---
name: kerf-ui
description: Build interfaces with kerfjs and the @kerfjs/ui production component package. Use whenever code imports @kerfjs/ui or a task asks for Kerf UI components.
kerf-ui-skill-version: 1.23.0
---

# Building with @kerfjs/ui

Read `../docs/component-selection.md` first, then `./component-catalog.json`,
`./public-api-signatures-v1.md`, `./webawesome-jsx-signatures-v1.md`,
`../docs/recipes.md`, `../README.md`,
`../docs/component-contract.md`, and `../docs/accessibility.md` before changing
a consuming interface. Use the signature snapshot for exact props, callbacks,
return values, and supported import paths; do not infer them from examples.
Read `../docs/webawesome-theme.md` when using Web Awesome components or changing
shared theme tokens.

Choose from the need, not from visual resemblance:

1. Search the Kerf catalog and preferred Web Awesome subset.
2. Reuse a primitive when purpose, anatomy, state, and interaction match.
3. Compose primitives for recurring layout. Prefer public props and tokens; use only cataloged `publicClasses` when composition-specific CSS needs a selector.
4. Add a thin application adapter for copy, domain mapping, actions, routing, persistence, permissions, and transport.
5. Build custom markup only when the semantic contract differs; if it recurs across products, open an upstream component or recipe request.

Quick routing:

| Need | Choose | Nearest alternatives / boundary |
| --- | --- | --- |
| Navigation row | `MenuItem` | Use an ordinary link or button when sidebar/menu anatomy and state do not apply. |
| Navigation row with a trailing action | `MenuActionRow` | Use `MenuItem` when the trailing region is dormant; never put controls inside either component's SafeHtml slots. |
| Page chrome or heading | `Toolbar`, `PageHeader`, or `DialogHeader` | Toolbar is persistent chrome; page and dialog headers identify different scopes. |
| Exclusive choice | `TabBar`, `SegmentedControl`, or `Select` | Tabs switch tabpanels; segments expose a few choices; Select handles a longer value list. |
| Status or absent content | `StateBanner` or `EmptyState` | Web Awesome callouts suit ecosystem content; toasts are transient and never the only record of important state. |
| Adjustable or static columns | `ResizableRegion` or CSS grid | Use the component only for a user-operable controlled separator. |
| Structured or ordinary search | `TokenSearchField` or an input | Use token search only when text and ordered filter chips form one editor. |
| Key/value facts | `ValueTable` with `ValueTableRow` | Use rows with `icon` only when the optional 24px leading visual adds context. |
| Command search | Command-palette production recipe | No runtime component is exported; the app owns ranking, permissions, history, and dispatch. |

For a complete shell, sidebar, workspace header, master-detail dialog, composer
form, list-state lifecycle, mixed-control toolbar, or command palette, start from the runnable
reference in [`docs/recipes.md`](../docs/recipes.md). Preserve its production
primitives and semantic ownership; replace application state, policy, and copy.

The concise human decision matrix is in [`component-selection.md`](../docs/component-selection.md). For exhaustive tool retrieval, load [`component-catalog.json`](./component-catalog.json), the canonical metadata for every public component/helper, composition, and supported Web Awesome entry. Use its linked current recipes instead of inferring behavior from CSS.

Hard rules:

1. Import visual components from explicit JavaScript subpaths. In CSS-aware browser builds each subpath brings in its own reachable CSS, including UI subcomponents, while unrelated CSS remains out. The root barrel and `@kerfjs/ui/unstyled` are CSS-free; pair the root barrel with `styles.css` only when the complete layer is intentional. Manual CSS subpaths remain available for custom pipelines.
2. Components return Kerf `SafeHtml`. Never pass DOM nodes as children or use inline JSX event handlers.
3. Keep state, product copy, persistence, and domain mappings in the application. Do not add product-specific actions or fields to a generic component. Put MenuItem/MenuActionRow/MenuHeader/AppTab domain `data-*` metadata in `rootAttributes`; use MenuActionRow `trailingActionAttributes` and MenuHeader `triggerAttributes` only for domain `data-*` or native popover target/action and `aria-controls`/`aria-haspopup`. These slots do not replace component-owned action, item/tab identity, selection, disclosure, naming, disabled, icon, or role semantics.
4. Wire `data-action` hooks from one stable root with `delegate()` or `delegateActions()` and retain disposers.
5. Use the opinionated `--kui-color-*` semantic ramps and component-level override properties. Override tokens at the narrowest useful scope and prefer equivalent props/tokens. Public-class-to-public-class selectors are supported when every Kerf class appears in the catalog entry's `publicClasses`; never target descendant tags, ids, attribute-only anatomy, or unlisted implementation classes.
6. `Select` is pure until the app explicitly imports `@kerfjs/ui/select/register`; do not import Web Awesome's full registration bundle. When an app writes direct `wa-*` JSX, add `import type {} from '@kerfjs/ui/webawesome'` for the catalog-supported intrinsic-element declarations, import the CSS-only `@kerfjs/ui/webawesome.css` theme once, and keep importing individual Web Awesome component modules so their JavaScript remains tree-shakeable. The type boundary emits no code and registers nothing. Pass icon-bearing `choices` and `renderSelected` content normally: `Select` preserves its slotted option icons across Kerf rerenders and keys selected content by the controlled value, so app wrappers must not add competing morph-control attributes.
7. Decorative icons are hidden; controls are named; focus is visible; state never relies on color alone; reduced motion and increased contrast remain usable. `DisclosureArrow` defaults to an 18px root-scaled visual and exposes `--kui-disclosure-arrow-size` for consumer sizing; it never becomes the interaction or accessible-name owner. Kerf `Select` separately keeps its intrinsic Web Awesome expand glyph at `--kui-disclosure-icon-scale: .5`.
8. `ResizableRegion` uses `wireResizableRegions()` for Arrow, Shift+Arrow, Home/End, and pointer behavior. The app owns size persistence. `handleIcon` replaces decorative dormant glyph content only.
9. Use controlled `SegmentedControl` for a small exclusive choice set. Select `appearance="toolbar"` when nesting it inside `ToolbarControlGroup`; use rounded or pill shapes for standalone contexts. Handle its action, update `value`, keep meaningful choice labels, and preserve every enabled native button in sequential Tab order.
10. Compose `AppTab` inside controlled `TabBar`; call `wireTabBars()` once and retain its disposer. It owns same-bar drag mechanics, including proximity-based horizontal edge autoscroll, while the app applies `onReorder` and owns order, selection, panels, close policy, routing, and persistence. Use runtime-filtered `rootAttributes` for domain metadata and keep an optional `closeIcon` decorative and noninteractive.
11. Use token-controlled `TokenSearchField` when free text and removable structured filters share one editor. Editable text stays DOM-owned between token changes. The leading icon, first text line, clear action, and trailing slot share one fixed row when content wraps. The app owns parsing and suggestions; call `readTokenSearchField()` on input, empty `textContent` on clear, use `placeTokenSearchCaret()` after explicit controlled focus changes, and call `wireTokenSearchFields()` once so Enter submits without inserting a line break and keyboard chip deletion restores focus plus the text-relative caret after controlled replacement. Enable `collapsible` for an animated iconic closed state, standalone or inside `ToolbarControlGroup`; the field keeps text or tokens expanded while the app controls transient `expanded` state, focus transfer, and focusout timing.
12. Demo work uses public production component subpaths and their browser-selected CSS. Give every public visual component its own category-grouped catalog route; list themed third-party components under a clearly labeled collapsible ecosystem section, with a focused route for each. Project its deterministic repository-relative demo source and existing documentation path so the detail can expose `View demo source` and `Read guidance` links without a runtime export; also derive first-party component implementation paths from their canonical browser imports, and label Web Awesome documentation as Kerf integration guidance. Declare direct `uses` relationships so `Used by` stays derivable, and theme shell chrome through the same semantic tokens as the stage instead of drawing a substitute.
13. The Web Awesome theme makes Tooltip and Popover arrowless by default. Keep that default unless a pointer materially clarifies the anchor; opt back in with `--wa-tooltip-arrow-size`, `--kui-wa-popover-arrow-size`, or a popover's public `--arrow-size`, and use `without-arrow` when local no-arrow intent should survive theme changes.
14. Treat the complete Web Awesome catalog as support coverage, not a recommendation list. Consider Popup when it replaces custom anchored positioning. Prefer Kerf `Select` over direct Dropdown/Dropdown Item/Select/Option composition, `SegmentedControl` over Button Group, `TabBar` or `SegmentedControl` over Web Awesome Tabs, `LucideIcon` over Web Awesome Icon, and `ResizableRegion` over Split Panel. Use Tree/Tree Item, Animated Image, and Comparison only for a specific required behavior; avoid Zoomable Frame.
15. Build sidebars, main areas, inspectors, and dialogs from `@kerfjs/ui/layout.css`: an unpadded `.kui-pane`, optional `.kui-pane__toolbar`, one scrolling `.kui-pane__content`, and optional `.kui-pane__footer`. Add `.kui-content` for 24px major vertical separation and `.kui-content-item` for a child-owned 8px inline margin, 1px transparent-or-visible border, 8px padding, and 12px radius. Use the pill modifier for 22px. Do not pad pane shells or duplicate item geometry in wrappers.
16. Wrap every toolbar item, including dormant text, in `ToolbarControlGroup`. A group remains 44px outside (`calc(2px + remify(42px))`) when its border/background are transparent; use 8px between groups and inside items. Split dormant and interactive regions: `MenuHeader` keeps its label and optional `badge` together, with an independent 44px action unless disclosure mode makes the title cluster the button. `MenuItem.trailing` is dormant; use `MenuActionRow` when primary and trailing actions need sibling 44px native buttons. Its `label`, `icon`, and `trailingActionIcon` slots are also dormant and cannot contain controls. Let panes relocate at narrow widths instead of shrinking targets.
17. When a recurring concept has no matching export, look for a production recipe before building custom markup. The command-palette recipe owns modal/search/result semantics, keyboard selection, empty state, and focus restoration without claiming a runtime export. Its application adapter owns ranking, history, permissions, availability, actions, and copy; use the smaller `../docs/examples/command-palette-adapter.tsx` only when the complete modal composition is unnecessary.
18. Compose `ValueTable` from typed `ValueTableRow` entries instead of handwritten `dt`/`dd` wrappers. Pass `icon` for the optional 24px leading visual; the row owns the 8px iconless or 40px icon-bearing separator start and the common 8px right inset.

Common mistakes:

| Mistake | Fix |
| --- | --- |
| Hard-coded project/transport action in a component | Pass a semantic `data-action` string from an application adapter |
| Per-instance signal at module scope | Create state in the application or a factory and pass it in |
| `role="menuitem"` on one button | Use the native button, or implement the complete ARIA menu widget |
| Put a button/link/interactive role in `MenuItem.trailing` or a `MenuActionRow` SafeHtml slot | Use `MenuActionRow` for the sibling controls and keep its label/icon slots dormant |
| Copy MenuItem/MenuHeader markup to add product data or a popover target | Use the typed `rootAttributes`/`triggerAttributes` slots and retain the component's protected semantics |
| Test only a custom-element attribute | Assert live property, emitted event, focus, and rendered output |
| Import all Web Awesome components | Import only `@kerfjs/ui/select/register` for `Select`, or individual Web Awesome modules for other controls; `webawesome.css` registers no JavaScript |
| Write `wa-*` JSX without activating its types | Add `import type {} from '@kerfjs/ui/webawesome'`; registration and theme imports remain separate |
| Maintain a root list of component styles | Import each visual component from its JS subpath; its reachable CSS follows automatically |
| Add demo-only markup for a production state | Add the state to the production component, then render that export in the catalog |
| Choose a listed ecosystem component by default | Apply the component-selection guidance above; catalog coverage means supported and themed, not preferred |
| Add sidebar-specific wrapper padding | Use the unpadded `.kui-pane`; let `MenuHeader`, `MenuItem`, and `.kui-content-item` own their 8/1/8 geometry |
| Put bare text or controls directly in a toolbar slot | Wrap every item in `ToolbarControlGroup`, using `appearance="borderless"` for transparent chrome |
| Let the document, pane, and list all scroll | Keep fixed chrome outside one `.kui-pane__content` scroll owner per pane |
| Invent an `@kerfjs/ui` command-palette export | Copy the production recipe and keep ranking, history, permissions, and dispatch application-owned |
| Handwrite `ValueTable` row wrappers or compensate their separators | Compose `ValueTableRow`; its optional icon hook and separator geometry are public contract |

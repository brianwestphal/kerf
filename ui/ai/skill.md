---
name: kerf-ui
description: Build interfaces with kerfjs and the @kerfjs/ui production component package. Use whenever code imports @kerfjs/ui or a task asks for Kerf UI components.
kerf-ui-skill-version: 1.3.0
---

# Building with @kerfjs/ui

Read `../README.md`, `../docs/component-contract.md`, and `../docs/accessibility.md` before changing a consuming interface. Read `../docs/webawesome-theme.md` when using Web Awesome components or changing shared theme tokens.

Hard rules:

1. Import visual components from explicit JavaScript subpaths. In CSS-aware browser builds each subpath brings in its own reachable CSS, including UI subcomponents, while unrelated CSS remains out. The root barrel and `@kerfjs/ui/unstyled` are CSS-free; pair the root barrel with `styles.css` only when the complete layer is intentional. Manual CSS subpaths remain available for custom pipelines.
2. Components return Kerf `SafeHtml`. Never pass DOM nodes as children or use inline JSX event handlers.
3. Keep state, product copy, persistence, and domain mappings in the application. Do not add product-specific actions or fields to a generic component.
4. Wire `data-action` hooks from one stable root with `delegate()` or `delegateActions()` and retain disposers.
5. Use the opinionated `--kui-color-*` semantic ramps and component-level override properties. Override tokens at the narrowest useful scope; do not hard-code appearance-specific colors or replace private descendant rules.
6. `Select` is pure until the app explicitly imports `@kerfjs/ui/select/register`; do not import Web Awesome's full registration bundle. When an app uses Web Awesome components, import the CSS-only `@kerfjs/ui/webawesome.css` theme once and keep importing individual Web Awesome component modules so their JavaScript remains tree-shakeable.
7. Decorative icons are hidden; controls are named; focus is visible; state never relies on color alone; reduced motion and increased contrast remain usable.
8. `ResizableRegion` uses `wireResizableRegions()` for Arrow, Shift+Arrow, Home/End, and pointer behavior. The app owns size persistence.
9. Compose `AppTab` inside controlled `TabBar`; call `wireTabBars()` once and retain its disposer. It owns same-bar drag mechanics, including proximity-based horizontal edge autoscroll, while the app applies `onReorder` and owns order, selection, panels, close policy, routing, and persistence.
10. Demo work uses public production component subpaths and their browser-selected CSS. Give every public visual component its own category-grouped catalog route; list themed third-party components under a clearly labeled collapsible ecosystem section, with a focused route for each. Declare direct `uses` relationships so `Used by` stays derivable, and theme shell chrome through the same semantic tokens as the stage instead of drawing a substitute.

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

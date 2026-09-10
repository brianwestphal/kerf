---
name: kerf-ui
description: Build interfaces with kerfjs and the @kerfjs/ui production component package. Use whenever code imports @kerfjs/ui or a task asks for Kerf UI components.
kerf-ui-skill-version: 1.0.0
---

# Building with @kerfjs/ui

Read `../README.md`, `../docs/component-contract.md`, and `../docs/accessibility.md` before changing a consuming interface.

Hard rules:

1. Import `@kerfjs/ui/styles.css` once by default so the app root never tracks transitive component styles. Use explicit JavaScript subpaths for bundle isolation; use `foundation.css` plus leaf-local component CSS only after measuring a worthwhile CSS-size benefit.
2. Components return Kerf `SafeHtml`. Never pass DOM nodes as children or use inline JSX event handlers.
3. Keep state, product copy, persistence, and domain mappings in the application. Do not add product-specific actions or fields to a generic component.
4. Wire `data-action` hooks from one stable root with `delegate()` or `delegateActions()` and retain disposers.
5. Use the opinionated `--kui-color-*` semantic ramps and component-level override properties. Override tokens at the narrowest useful scope; do not hard-code appearance-specific colors or replace private descendant rules.
6. `Select` is pure until the app explicitly imports `@kerfjs/ui/select/register`; do not import Web Awesome's full registration bundle.
7. Decorative icons are hidden; controls are named; focus is visible; state never relies on color alone; reduced motion and increased contrast remain usable.
8. `ResizableRegion` uses `wireResizableRegions()` for Arrow, Shift+Arrow, Home/End, and pointer behavior. The app owns size persistence.
9. Compose `AppTab` inside controlled `TabBar`; call `wireTabBars()` once and retain its disposer. It owns same-bar drag mechanics, including proximity-based horizontal edge autoscroll, while the app applies `onReorder` and owns order, selection, panels, close policy, routing, and persistence.
10. Demo work uses the public production component and CSS. Give every public visual component its own category-grouped catalog route, declare direct `uses` relationships so `Used by` stays derivable, and theme shell chrome through the same semantic tokens as the stage instead of drawing a substitute.

Common mistakes:

| Mistake | Fix |
| --- | --- |
| Hard-coded project/transport action in a component | Pass a semantic `data-action` string from an application adapter |
| Per-instance signal at module scope | Create state in the application or a factory and pass it in |
| `role="menuitem"` on one button | Use the native button, or implement the complete ARIA menu widget |
| Test only a custom-element attribute | Assert live property, emitted event, focus, and rendered output |
| Import all Web Awesome components | Import only `@kerfjs/ui/select/register` when `Select` is used |
| Add demo-only markup for a production state | Add the state to the production component, then render that export in the catalog |

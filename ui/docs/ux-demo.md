# UX catalog contract

Run `npm run dev` from `ui/`. The catalog is a development and review surface, not a second implementation.

- It imports public component subpaths, exercising their browser-selected reachable CSS rather than a catalog-only style path.
- Every public visual component has its own stable `?component=<id>` URL and focused demo. Composite header, menu, and feedback scenarios remain addressable alongside their subcomponents; the root opens the first component.
- Catalog metadata has a unique id, category, kind (`component` or `composition`), name, description, and direct `uses` dependencies.
- The master/detail shell groups routes by category with production `MenuHeader` and `MenuItem` components, then gives the selected family one centered inspection stage.
- A detail with relationships renders one grouped selector: `Uses` links to direct dependencies and `Used by` links to reverse dependents. Choosing either navigates to that component's demo. The footer is absent when both groups are empty; no duplicate relationship summary is rendered.
- Demo-only CSS supplies only the catalog shell and stages; component appearance stays in package CSS. Decorative chrome and Web Awesome controls share the same semantic system palette instead of carrying a separate demo identity.
- Scenarios use deterministic data and cover real variants, long content, disabled state, selection, progress, feedback, and stateful interactions. The Web Awesome theme route samples actions, forms, structure/navigation, feedback, media, and formatting components against the public CSS-only theme; ToolbarControlGroup exposes all eight Hot Sheet 2 variants; StateBanner exposes every built-in tone plus a scoped override; TabBar demonstrates overflow, edge autoscroll, and controlled pointer/keyboard reordering.
- Settings exercise light/dark, increased contrast, and reduced motion without changing component code, and expose each preference through `aria-pressed`.
- The action log is an `aria-live` region, making interactions visible to both people and browser tests.
- Browser coverage walks every component and composition route, both relationship directions, tab selection/reordering/overflow, semantic palettes and scoped overrides, representative Web Awesome registration and light/dark rendering, toolbar popup behavior, menu alignment, banner urgency, keyboard resizing, live custom-element values, and representative wide/narrow captures.

Before handoff, inspect the actual captures for readability, context, alignment, clipping, spacing, responsiveness, focus, and obvious defects. Fix and recapture rather than treating the screenshot as proof by itself.

# UX catalog contract

Run `npm run dev` from `ui/`. The catalog is a development and review surface, not a second implementation.

- It imports public `@kerfjs/ui` exports and public CSS paths.
- Every public visual component has its own stable `?component=<id>` URL and focused demo. Composite header, menu, and feedback scenarios remain addressable alongside their subcomponents; the root opens the first component.
- Catalog metadata has a unique id, category, kind (`component` or `composition`), name, description, and direct `uses` dependencies.
- The master/detail shell groups routes by category with production `MenuHeader` and `MenuItem` components, then gives the selected family one centered inspection stage.
- Every detail view derives a related-components control from the graph: `Uses` links to direct dependencies and `Used by` links to reverse dependents. Choosing either navigates to that component's demo.
- Demo-only CSS supplies only the catalog shell and stages; component appearance stays in package CSS. Decorative chrome and Web Awesome controls share the same semantic system palette instead of carrying a separate demo identity.
- Scenarios use deterministic data and cover real variants, long content, disabled state, selection, progress, feedback, and stateful interactions.
- Settings exercise light/dark, increased contrast, and reduced motion without changing component code, and expose each preference through `aria-pressed`.
- The action log is an `aria-live` region, making interactions visible to both people and browser tests.
- Browser coverage walks every component and composition route, both relationship directions, tab selection, banner urgency, keyboard resizing, live custom-element values, and representative wide/narrow captures.

Before handoff, inspect the actual captures for readability, context, alignment, clipping, spacing, responsiveness, focus, and obvious defects. Fix and recapture rather than treating the screenshot as proof by itself.

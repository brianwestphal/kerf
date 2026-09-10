# UX catalog contract

Run `npm run dev` from `ui/`. The catalog is a development and review surface, not a second implementation.

- It imports public `@kerfjs/ui` exports and public CSS paths.
- Every component family has a stable `?component=<id>` URL plus the overview.
- Catalog metadata has a unique id, category, name, description, and optional dependencies.
- Demo-only CSS supplies only the catalog shell and stages; component appearance stays in package CSS.
- Scenarios use deterministic data and cover real variants, long content, disabled state, selection, progress, feedback, and stateful interactions.
- Settings exercise light/dark, increased contrast, and reduced motion without changing component code.
- The action log is an `aria-live` region, making interactions visible to both people and browser tests.
- Browser coverage walks component routes, tab selection, banner urgency, keyboard resizing, live custom-element values, and representative wide/narrow captures.

Before handoff, inspect the actual captures for readability, context, alignment, clipping, spacing, responsiveness, focus, and obvious defects. Fix and recapture rather than treating the screenshot as proof by itself.

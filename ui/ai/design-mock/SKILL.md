---
name: kerf-ui-design-mock
description: Plan and review real-screen Kerf UI design concepts with rendered mock captures. Use for design exploration before implementation, not for component coding or a generic mock generator.
---

# Kerf UI design mocks

Use this skill with the **installed** `@kerfjs/ui` version in the consuming project. Resolve paths from that package, including in workspaces; do not rely on a global or newer Kerf checkout. Read its `llms.txt`, `ai/skill.md`, `docs/interaction-conventions.md`, `docs/component-selection.md`, and the selected entries in `ai/components/README.md` before composing. The installed component pages, public signatures, and contracts own component facts; this skill does not duplicate them.

## Establish the design brief

1. Read the request and the consuming project's UI conventions and interaction requirements. State the user's task, the current behavior, proposed behavior, key states, and open decisions.
2. Capture the **real current screen** in its app at a representative viewport and theme before changing a mock. Record the route, state, viewport, theme, and whether fixtures or live data are shown. A design template alone is not the baseline.
3. Consult `docs/design/templates.md`, the relevant variants in `docs/design/templates/`, and `docs/design/sketch/README.md` / `docs/design/sketch/coverage.md` if Sketch is useful. Map each proposed region to a template variant, a public Kerf component, or an app-owned region. Templates show accurate component appearance and variants; they do not prescribe a whole-screen layout. Check the installed component catalog and signatures for actual props and wiring.

## Compose and capture

Build the concept in an isolated route, demo, or temporary app branch that renders the consuming app's actual shell. Use production Kerf components, public props and tokens, official icon sources documented by the installed package, and synthetic representative data. Keep mock-only data and behavior identifiable. Do not put a proposed feature into the shipped route solely to capture it. If a needed behavior has no public component or prop, record a capability gap instead of restyling component internals.
Mirror the consuming app's foundation CSS and theme setup in the isolated route; otherwise a mock can silently fall back to browser typography or colors even while component CSS loads.

Capture the **rendered composition**, not a Sketch export or image assembled from template fragments. Cover the states needed to decide the design, including relevant wide/narrow viewports and light/dark themes. Compare each capture with the baseline and inspect clipping, truncation, spacing, alignment, contrast, focus and interaction affordances, and component misuse. Fix visible mock defects and recapture before review.

Name files so a reviewer can identify concept, state, viewport, theme, and revision without relying on upload order, for example `groups-list-collapsed-390-dark-v2.png`. Preserve prior reviewed files when revising. For each revision write a brief decision record: capture inventory, changes and feedback answered, choices still open, Kerf capability gaps, and limits of the mock. Label baseline as current and concepts as proposed. A mock establishes a design decision; it does not verify production behavior.

After the reviewer records a design decision, hand implementation work off with the approved revision and relevant captures. Track app implementation and upstream Kerf gaps separately. If the review lives in Hot Sheet, use the project's Hot Sheet design-review adapter for attachment batches, annotation mapping, sign-off, and linked tickets; this skill owns only the Kerf composition and capture method.

See [worked example](references/hs2-example.md) for the small real-screen iteration that motivated this workflow.

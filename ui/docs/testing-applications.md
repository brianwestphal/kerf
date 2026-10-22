# Testing applications built with Kerf UI

Test the application as the user encounters it. A component's catalog example proves its own contract; it does not prove that a feature screen, dialog, or shell wires that component correctly.

## Unit tests: state, events, and lifetime

Use a DOM test environment such as happy-dom for fast composition tests. Reset global Kerf stores between cases with `clearStoreRegistry()` from `kerfjs/testing`, create a fresh mount root, and call every `mount()`, `delegate()`, and `wire*()` disposer during teardown. Assert that disposal stops subscriptions and listeners; remounting must not double-handle an action.

Drive the real control and assert the live state and emitted events. For form controls, read the live `value`, checked state, and focus, not just rendered attributes. Test both directions: a user change updates application state and dependent output; an application state change updates the control and its selected icon, badge, count, or other derived content. Then reset and edit again. For a selection or menu, exercise keyboard and pointer activation and assert which element has focus after dismissal.

Test loading, empty, error, and ready separately. A loading collection must not briefly announce an empty result. Assert that an unavailable action remains visible and disabled when that is the intended contract, and that a removed view's wiring can no longer act.

See [accessibility contracts](./accessibility.md) for each component's event, focus, and ARIA behavior, and the [composition recipes](./recipes.md) for disposer ownership.

## Browser tests: the shipped parent owns the proof

Use Playwright against each route or dialog that ships the control. Click and type through the actual parent composition, including its delegation root and wiring calls. Repeat a representative action after a rerender, navigation away and back, and a reset. An isolated demo is useful for component development but does not verify that the application parent installed or disposed its handlers.

Use real pointer events for dragging, resizing, and overlay dismissal. Assert meaningful geometry: the fitted panel reaches the declared minimum, drag start and end coordinates differ, a popup is reachable above clipping ancestors, and its hit target receives the click. Exercise keyboard focus and scrolling, especially while overlays open or rows move.

Capture and inspect wide, medium, and narrow layouts, then resize across a breakpoint while a view is live. Check title and control fit, clipping, scroll ownership, popup placement, focus visibility, and whether the user's draft survives the transition. Include WebKit for overflow, sticky content, and focus-ring behavior; a Chromium pass alone does not establish those browser-specific results. Check both color schemes where the surface supports them.

## What the evaluator proves

[`kerf-ui-evaluate`](./ui-evaluator.md) supplies objective browser diagnostics and retained screenshots. Its green exit does **not** judge hierarchy, rhythm, density, aesthetic fit, or the perceived clarity of alignment and scroll ownership. Review those screenshots in the actual application, record the states and viewports inspected, and fix visual defects before treating the work as complete.

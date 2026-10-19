# List View Transitions — design decision

> **Status: design only (KF-XN0WMQ).** The consumer recipe and browser coverage
> are tracked in KF-YMBR5M. No kerf API or runtime behavior changes here.

## Decision

The app opts in around the **state mutation** that causes a list update:

```ts
const reorder = (): void => {
  items.value = nextItems;
};

if (document.startViewTransition) {
  document.startViewTransition(reorder);
} else {
  reorder();
}
```

The callback can instead call an `arraySignal` mutator such as `move()`; either
source can drive `each()` or `bindList()`. The app chooses the triggering
action, names its rows with CSS, and owns any animation rules. Kerf continues
to ship no animation CSS. This is a proposed recipe, pending real-browser
verification in KF-YMBR5M, rather than a new `transition` option on `each()`,
`bindList()`, or `mount()`.

## Why the boundary belongs outside the reconciler

`mount()` and `bindList()` both reconcile synchronously from signal `effect()`
runs. `each()` returns a list segment during a `mount()` render; it does not
mutate the live list by itself. By contrast,
[`document.startViewTransition()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)
captures the old view **before** calling its update callback. Starting a
transition from the effect would come after the signal write had already
triggered reconciliation and would capture the new view as the old one. Moving
reconciliation into that later callback would change kerf's synchronous update
contract, effect ordering, error propagation, and patch-queue timing.

A per-list flag would also start competing document-scoped transitions when one
state change updates sibling or nested lists. One app-owned callback lets the
browser capture the whole state change once, including static surrounds. The
existing [`moveBefore()` path](18-state-preserving-moves.md) remains the
reconciler's move path inside that callback and keeps live row state where the
engine supports it. The browser animates snapshots; kerf does not add a second
move algorithm.

## Row identity and CSS ownership

- The app assigns a unique `view-transition-name` to each rendered row for
  paired reorders and one-sided enter/leave snapshots. Names must be unique
  **across the document in each captured state**, including other lists; a
  duplicate causes the transition to skip. A stable, app-safe key prefixed by
  list identity is suitable. Kerf must not derive names from `each()` call
  order, which can shift across renders (see [list identity](16-list-identity.md)).
- For reorders where the _same DOM element_ survives, CSS
  [`view-transition-name: match-element`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/view-transition-name)
  can provide per-element matching without generated names. Explicit names
  remain necessary when an app wants a logical key to pair replaced elements;
  `bindList()` content mode may rebuild a row when its item object changes.
- The app defines `::view-transition-group(...)`,
  `::view-transition-old(...)`, and `::view-transition-new(...)` rules for the
  desired motion. A row present on both sides can move and resize; one present
  on one side can enter or leave. Kerf emits no default keyframes or style
  attributes for this feature.
- Keep the `root` snapshot and surrounding controls in mind: a document
  transition can also crossfade unnamed page content. The recipe should show
  CSS that avoids a distracting whole-page flash while animating named rows.

## Timing, fallback, and scope

- The callback runs after the old snapshot, so the app's mutation is deferred
  compared with a direct signal write. Kerf's **own** signal-to-DOM timing
  remains synchronous once the callback runs. Callers that require an
  immediate state write should update directly without a transition.
- Feature-detect `document.startViewTransition`; the fallback runs the same
  update exactly once. Honor `prefers-reduced-motion` by updating directly or
  suppressing animation with app CSS. Do not use `skipTransition()` as a way to
  cancel an update: it skips motion but still invokes the callback.
- A document transition has a single document-wide snapshot boundary. A new
  action during an active transition must still reach the latest state; it
  must not wait for `finished` merely to keep kerf's list usable. The app
  decides whether to start another transition or update directly. An
  interrupted animation cannot be used as a data rollback mechanism.
- One callback may update nested or sibling lists. Their names must remain
  unique across the document. Do not start a transition per child list.
- Virtualized `bindList({ virtualize: { mode: 'window' } })` changes its DOM
  window during scrolling. Generic row snapshot motion there can animate
  scroll-window churn, so the first recipe excludes scroll-driven windowing.
  Source edits in a virtualized list need separate visual and anchoring tests.
  `content-visibility` mode keeps rows in the DOM but still needs browser
  validation of snapshots outside the viewport.

## Verification required before publishing the recipe

KF-YMBR5M should exercise real rendered lists in Chromium, Firefox, and
WebKit at wide and narrow viewports: plain-signal and `arraySignal` `each()`;
`bindList()` snapshot and patch paths; reorder, insert, remove, empty/refill,
rapid successive edits, sibling/nested lists, unsupported-API fallback, reduced
motion, and a focused input in a moving row. Assert update-callback order and
final DOM state, then inspect actual animation frames and accessibility/focus.
Check duplicate names and CSS used to avoid a root crossfade. The browser
findings decide whether the recipe needs a helper or a narrower supported
scope; no core flag is approved by this design alone.

Browser API references: [MDN process and callback timing](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using),
[MDN `skipTransition()` semantics](https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition/skipTransition),
and [Chrome's same-document transition guide](https://developer.chrome.com/docs/web-platform/view-transitions/same-document).

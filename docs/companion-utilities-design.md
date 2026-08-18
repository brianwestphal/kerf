# Companion utilities — design proposal

**Status:** Design only (proposal). Nothing here is shipped. This document is the deliverable of the KF-461 investigation ("Companion utilities: scope & packaging decision"), which was surfaced by a cross-project analysis of six real kerf apps — hotsheet, glassbox, cue-car, domotion, languages, kids-events.

The per-primitive build work is tracked by the follow-up feature tickets listed under [Sequencing](#7-sequencing--follow-up-tickets); this doc is the rationale + API sketches those tickets implement against.

---

## 1. The finding

Six independent apps converged on a tiny subset of kerf (JSX + `signal` + `delegate` + `morph`/`mount`) and then **hand-rolled the same handful of primitives** kerf doesn't provide — each app reinventing them, sometimes several times within one codebase. The count in parentheses is how many of the six built their own version:

1. **Overlay / modal + dismiss manager (6/6)** — `toElement → body.appendChild → mount → delegate → remove`, plus escape / backdrop / outside-click dismissal. glassbox consolidated `popup.ts` from five copies; hotsheet has `confirm.tsx` / `toast.tsx` / `transientOverlays.ts`; kids-events a `Sheet`; languages singleton portals. Recurring forcing function: `window.confirm` is a no-op in Tauri's WKWebView (glassbox, hotsheet), so a hand-built overlay is mandatory, not a nicety.
2. **`delegateActions` + the `attr()`-action-table idiom (5/6)** — one `attr('data-action', …)` table used as the single source of truth for both the JSX attribute and the `delegate` selector, plus a `switch (dataset.action)` dispatcher. cue-car, languages, glassbox, and hotsheet each invented the table independently. The most-reinvented good idea in the whole set.
3. **Dispose-scope registry (4/6)** — tie a set of disposers (`mount` / `effect` / `delegate` returns) to a DOM subtree's lifetime and run them when the subtree is removed. languages `cardLifecycle.ts` (`WeakMap<Element, disposers[]>`, swept on remove); hotsheet `reactive-bind` owned disposers; glassbox's repeated `disposeMount?.()` dance.
4. **Async-state container (4/6)** — the exact shape `{ status: 'idle' | 'running' | 'completed' | 'failed', error, data/progress }` recurs verbatim as everyone's loading/error/progress UI (glassbox `AnalysisModeState`, cue-car in-store status, languages `dialogState`), usually paired with a hand-rolled stale-response guard (generation counter).
5. **Keyed `bindList` + virtualization (higher effort, clearest single demand)** — hotsheet's `bindList<T>` is referenced ~200× and it additionally built `bindListVirtualized` (viewport windowing kerf offers nowhere). Notably built *because* the team rejected `each()` for external-state-driven rows.

The friction is real and repeated. The question this doc answers is **what to ship, how to package it, and in what order** — without turning kerf into something it has decided not to be.

## 2. The positioning constraint (non-negotiable)

**Design rule 2 stands: kerf is not a component framework and will not become one.** No hooks, no lifecycle, no per-instance state, no compiler. So every primitive here must obey the same contract kerf's own API already follows:

- **Plain functions in, a handle/disposer out.** State lives in the returned closure, exactly like `mount()` returns a disposer and domotion's `region-overlay` returns an `OverlayHandle`. No hidden framework-managed instance.
- **Content is `SafeHtml` or a render function**, never a component object.
- **Composes with the existing primitives** (`mount`, `delegate`, `effect`, `signal`, `morph`) rather than wrapping them in a new abstraction the user must adopt wholesale.
- **Zero new runtime dependencies.** `@preact/signals-core` remains the only one.
- **Pay-for-what-you-import.** Nothing lands in the main barrel; each utility is opt-in.

If a proposed primitive can't be expressed as "a function that returns a handle," it's the wrong primitive — it's a component model in disguise, and it's out of scope.

## 3. Packaging decision — recommend `kerfjs/*` subpaths

**Recommendation: ship each utility as a subpath export on the existing `kerfjs` package (`kerfjs/overlay`, `kerfjs/actions`, …), not as a separate `@kerfjs/kit` package and not as N micro-packages.**

This mirrors exactly how kerf already sheds optional weight: `kerfjs/array-signal`, `kerfjs/html`, and `kerfjs/dev` are subpaths that ship only when imported, backed by `tsup`'s `splitting: true` so shared code lands in one chunk. The machinery already exists; a new utility is one more entry in `tsup.config.ts` + one more `exports` key.

Rejected alternatives:

- **One monolithic `@kerfjs/kit`** — a second package to version, publish, and keep in lockstep with `kerfjs`'s major, for no benefit tree-shaking doesn't already give. A consumer importing only `overlay` from a barrel still relies on tree-shaking to drop the rest — which is precisely what subpaths do more reliably and more legibly.
- **Micro-packages (`@kerfjs/overlay`, `@kerfjs/actions`, …)** — buys nothing over tree-shaking on bundle size, and costs a version matrix, N publish pipelines, N peer-dep declarations on `kerfjs`, and N chances for a consumer to install a mismatched pair. A separate package only earns its keep when a util has its **own heavy dependency** or a **divergent release cadence** — none of these five do. Revisit only if a future primitive drags in something big (e.g. a virtualization lib), which would then justify isolating just that one.

**Consequence for the build/gates:** each subpath must be added to `tsup.config.ts`'s entry list, gets its own `dist/<name>.js` + `.d.ts`, a `package.json` `exports` entry, a `check:bundle-size` budget, and an `docs/8-api-reference.md` + `check:docs:api-coverage` row. This is the same checklist `array-signal` already satisfies — see it as the template.

## 4. What to ship first

Ship in two waves, ordered by demand × cost:

**Wave 1 (highest demand, lowest risk, no overlap with existing API):**
- `kerfjs/overlay` — the modal/overlay + dismiss manager (6/6 demand; the Tauri `confirm` gap makes it load-bearing).
- `kerfjs/actions` — `delegateActions` + an `action()` helper (5/6 demand; pure ergonomics over `delegate` + `attr`, trivial surface).

**Wave 2 (clear demand, but each needs a design decision first):**
- `kerfjs/scope` — the dispose-scope registry (interacts with how consumers already hold disposers).
- `kerfjs/async` — the async-state container (must decide how opinionated to be about fetching vs. just modeling state).
- `kerfjs/list` — keyed `bindList` + virtualization. **Highest effort and the one real design hazard**: it overlaps `each()` / `arraySignal`. It needs its own design doc answering "why does a kerf app reach for `bindList` instead of `each()`?" before any code. (The honest answer from the field: `each()` memoizes rows by object identity and won't re-run a row render when *external* state — sort, filter, selection — changes, so teams that drive rows from external signals rejected it. That's a docs/`each()` question as much as a new-primitive question — see KF-465.)

## 5. API sketches — Wave 1

These are sketches to anchor the follow-up tickets, not frozen signatures.

### 5.1 `kerfjs/overlay`

```ts
import { overlay, confirm } from 'kerfjs/overlay';

// content is SafeHtml (or a render fn); returns a handle, no per-instance state.
const dialog = overlay(<SettingsDialog />, {
  container: document.body,          // default: document.body
  className: 'modal-overlay',        // wrapper class the consumer styles
  dismiss: ['escape', 'backdrop'],   // 'escape' | 'backdrop' | 'outside' | false
  initialFocus: 'button[autofocus]', // selector | true (first focusable) | false
  onDismiss: () => {},               // called on any dismissal path
});

interface OverlayHandle {
  el: HTMLElement;                   // the mounted overlay root
  close(result?: unknown): void;     // disposes mount + removes node (idempotent)
  result: Promise<unknown>;          // resolves with the value passed to close()
}

// Convenience built on overlay() — the window.confirm replacement:
const ok: boolean = await confirm('Delete this file?', { danger: true });
```

Implementation is the field pattern, blessed once: `toElement → appendChild → mount(content) → wire dismissal via delegateCapture → return handle`. `close()` runs the mount disposer, removes the node, and resolves `result`. Dismissal wiring (escape key, backdrop click, outside click) is the part every app got subtly wrong (glassbox's `dismissOnOutsideClick` `alsoInside` allowlist; hotsheet's orphan-on-project-switch sweep) — centralizing it is most of the value. `overlay()` owns nothing global; a `toast()` sibling (single, replaceable, auto-dismiss) can live in the same subpath since it shares the mount+remove core.

### 5.2 `kerfjs/actions`

```ts
import { action, delegateActions } from 'kerfjs/actions';

// action(name) -> an AttrSpec on data-action (thin specialization of attr()).
const A = {
  selectFile:   action('select-file'),
  toggleFolder: action('toggle-folder'),
} as const;

// JSX: spread the attr, add row data as usual.
// <button {...A.selectFile.attrs} data-id={id}>…</button>

// Wire the whole table with one delegate; returns a disposer.
const dispose = delegateActions(root, 'click', {
  'select-file':   (e, el) => selectFile(el.dataset.id!),
  'toggle-folder': (e, el) => toggleFolder(el.dataset.id!),
}, {
  attr: 'data-action',   // default
  match: 'closest',      // default (closest()-style walk-up, like delegate)
});
```

This is a thin, honest layer over `delegate` + `attr` — it does not replace them, it removes the `switch (dataset.action)` boilerplate and keeps the attribute name and the handler keys in one object so they can't drift. Optionally the table's keys are typed from the `action()` values so a typo is a compile error. Because the elements and the handlers may live in different files (cue-car's SSR/island split), the table is a plain object the consumer can export and share — no co-location requirement.

## 6. API sketches — Wave 2 (lower fidelity)

```ts
// kerfjs/scope — tie disposers to a DOM subtree's lifetime.
import { disposeScope, disposeSubtree } from 'kerfjs/scope';
const scope = disposeScope(el);           // WeakMap-backed, keyed by element
scope.add(mount(el, render));
scope.add(delegate(el, 'click', sel, fn));
scope.dispose();                          // runs all, idempotent
disposeSubtree(root);                     // sweep el + descendants before removal

// kerfjs/async — model async state + guard stale responses.
import { resource } from 'kerfjs/async';
const r = resource<Data>();               // signal<{status,error,data}>
r.run(() => fetch(url).then(toData));     // idle->running->completed|failed, stale-guarded
// render off r.value.status; the generation guard is built in, not hand-rolled.

// kerfjs/list — keyed reconcile + optional virtualization (needs its own design first).
import { bindList } from 'kerfjs/list';
const dispose = bindList(parent, itemsSignal, {
  key: (item) => item.id,
  render: (item) => <Row item={item} />,          // returns SafeHtml
  virtualize: { rowHeight: 32, overscan: 8 },      // optional
});
```

## 7. Sequencing → follow-up tickets

Per the investigation contract, the primitives are filed as their own feature tickets rather than built here. Each references this design doc and KF-461:

- **Wave 1:** `kerfjs/overlay` (overlay/modal + dismiss + `confirm`/`toast`); `kerfjs/actions` (`delegateActions` + `action()`).
- **Wave 2:** `kerfjs/scope` (dispose-scope registry); `kerfjs/async` (`resource` async-state container); `kerfjs/list` (keyed `bindList` + virtualization) — the last gated on its own design doc resolving the `each()` overlap.

Each Wave-1 ticket carries the full subpath checklist (entry in `tsup.config.ts`, `dist` + `.d.ts`, `exports` key, `check:bundle-size` budget, `docs/8-api-reference.md` row, tests) as its definition of done.

## 8. Open questions for the maintainer

1. **Subpaths confirmed?** This doc recommends `kerfjs/*` subpaths over a separate package. If the intent is instead a clearly-separated `@kerfjs/kit` (e.g. for marketing/discoverability reasons), that changes the follow-up tickets' packaging steps.
2. **How opinionated should `kerfjs/async` be?** Pure state container (consumer calls fetch) vs. a `resource(fetcher)` that owns the call. The field evidence is all "state container + hand-rolled fetch," which argues for the minimal version.
3. **`kerfjs/list` vs. `each()`** — is a second list primitive acceptable, or should the effort go into making `each()` cover the external-state-driven case (and shipping virtualization as a companion to it)? This is the one genuine architecture fork and deserves its own investigation.

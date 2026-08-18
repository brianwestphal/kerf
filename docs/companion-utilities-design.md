# Companion utilities — design proposal

**Status:** **Shipped** (2026-08-18). All five primitives now ship as `kerfjs/*` subpaths — `kerfjs/actions`, `kerfjs/overlay`, `kerfjs/scope`, `kerfjs/async`, `kerfjs/list`. See `docs/8-api-reference.md` §§8.8–8.11 (and §8.4 for actions) for the shipped APIs; this document is the original rationale + design record. It was the deliverable of the KF-461 investigation ("Companion utilities: scope & packaging decision"), surfaced by a cross-project analysis of six real kerf apps — hotsheet, glassbox, cue-car, domotion, languages, kids-events.

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

**Wave 2 (clear demand; scope now decided — see §8):**
- `kerfjs/scope` — the dispose-scope registry (interacts with how consumers already hold disposers).
- `kerfjs/async` — the async-state container. **Decided:** `.run(fetcher)` owns status transitions + the stale-guard, the app writes the fetch, and the shape carries an optional progress channel (§8.2, §6).
- `kerfjs/list` — a **distinct** keyed `bindList` + virtualization. **Highest effort.** It deliberately does two things `each()` structurally cannot: surgical per-row patching (a per-row effect, no full re-render+morph) and viewport windowing. It does *not* replace `each()` — `each()` stays for item-owned-state lists, and its `cacheKey` still covers the common external-state case (docs: KF-465). (§8.3)

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
// DECIDED: .run(fetcher) owns the status transitions AND the stale-guard;
// YOU write the fetch (Node fetch for SSR, browser fetch client-side).
import { resource } from 'kerfjs/async';
const r = resource<Data>();               // signal<{status,error,data,progress?}>
r.run(() => fetch(url).then(toData));     // idle->running->completed|failed, stale-guarded
// render off r.value.status; the generation guard is built in, not hand-rolled.
// Optional progress channel for long work / uploads:
//   r.value.progress -> { completed, total } (undefined when not reported)
// Docs MUST show BOTH transports:
//   SSR:     r.run(() => fetch(apiUrl))              // Node 18+ global fetch
//   Browser: r.run(() => fetch('/api/...', { headers }))
// Error auto-clear (cue-car's setTimeout) stays the app's job, out of scope.

// kerfjs/list — DECIDED: a distinct primitive (not folded into each()).
// bindList runs a per-row EFFECT (fine-grained surgical patch, no full row
// re-render+morph) and adds viewport virtualization each() structurally can't do.
// each() stays the choice for item-owned-state lists; bindList is for
// externally-driven and/or very long lists. (KF-465 still teaches each()'s
// cacheKey for the COMMON external-state case, so bindList isn't over-reached for.)
import { bindList } from 'kerfjs/list';
const dispose = bindList(parent, itemsSignal, {
  key: (item) => item.id,
  render: (item) => <Row item={item} />,          // returns SafeHtml
  virtualize: { rowHeight: 32, overscan: 8 },      // optional
});
```

## 7. Sequencing → follow-up tickets

All shipped 2026-08-18. Each was built under its own feature ticket referencing this design doc and KF-461:

- **Wave 1 (shipped):** `kerfjs/overlay` (overlay/modal + dismiss + `confirm`/`toast`) — KF-468; `kerfjs/actions` (`delegateActions` + `action()`) — KF-469.
- **Wave 2 (shipped):** `kerfjs/scope` (dispose-scope registry) — KF-470; `kerfjs/async` (`resource` async-state container) — KF-471; `kerfjs/list` (distinct `bindList` + virtualization) — KF-472. One deferred optimization: KF-478 (apply arraySignal structural patches to `bindList` in O(patches) instead of a keyed diff).

Each ticket carries the full subpath checklist (entry in `tsup.config.ts`, `dist` + `.d.ts`, `exports` key, `check:bundle-size` budget, `docs/8-api-reference.md` row, tests) as its definition of done.

## 8. Resolved decisions (maintainer, 2026-08-18)

1. **Packaging: `kerfjs/*` subpaths** — confirmed. Not a separate `@kerfjs/kit`, not micro-packages. (The one revisit trigger stands: a util that drags in a heavy dependency — e.g. a virtualization lib for `kerfjs/list` — could justify isolating just that one.)
2. **`kerfjs/async` scope: `.run(fetcher)` owns status + stale-guard; the app writes the fetch.** Not a pure passive holder, and not an auto-refetch-on-deps resource. The state shape carries an **optional progress channel** (`{ completed, total }`) for long work / uploads; error auto-clear stays the app's concern. **Docs must include both transports** — Node global `fetch` (SSR) and browser `fetch` — since the same primitive serves both.
3. **`kerfjs/list`: ship a distinct `bindList`** (fine-grained per-row effects + viewport virtualization), positioned for externally-driven and/or very long lists; `each()` stays for item-owned-state lists. This is a deliberate second list API — justified because `bindList` does two things `each()` structurally cannot: surgical per-row patching without a full re-render, and viewport windowing. `each()`'s `cacheKey` still covers the *common* external-state case (documented by KF-465), so `bindList` is reserved for where fine-grained patching or virtualization actually pays.

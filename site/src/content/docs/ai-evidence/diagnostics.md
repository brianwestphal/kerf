---
title: 'AI evidence: diagnostic-error audit'
description: 'When an AI breaks one of kerf''s 12 hard rules, does the runtime tell it precisely what to fix? Each rule scored 0–3 for actionability, with the actual error captured from a live test.'
---

This page is the **diagnostic** layer of kerf's AI-first evidence. It answers: when an AI writes wrong code in kerf, does the runtime point at the mistake clearly enough for the model to self-correct on the next pass?

The four evidence layers (see [structural](/kerf/ai-evidence/structural/) for the first) are: structural / operational / **empirical / diagnostic**. This is the diagnostic layer.

## Method

For each of the 12 hard rules in [`docs/ai/usage-guide.md`](https://github.com/brianwestphal/kerf/blob/main/docs/ai/usage-guide.md#hard-rules-every-ai-gets-these-wrong-at-least-once), we wrote a fixture that deliberately violates the rule, ran it under happy-dom, and captured the runtime behavior. Each rule is scored 0–3 on actionability:

- **3 — Excellent.** Throws an error that names the rule, the location, and the fix. The model can self-correct without external help.
- **2 — Good.** Throws an error that names the symptom but not the canonical fix.
- **1 — Weak.** No error, but the misbehavior is visible (wrong output, dropped fast-path) and recoverable with a re-read of the docs.
- **0 — Silent.** No error and no visible misbehavior at the violation site — the bug surfaces later, far from the cause.

Every test in this audit is pinned in [`tests/unit/diagnostic-error-audit.test.tsx`](https://github.com/brianwestphal/kerf/blob/main/tests/unit/diagnostic-error-audit.test.tsx). The audit page and the test file share a summary check, so the two can't drift apart.

## Headline numbers

Of the 12 hard rules:

- **5 score Excellent** (Rules 1, 8, 9, 12) plus the `mount(null, …)` precondition and 2 bonus contracts on `each()` (primitive items, duplicate references) — **7 score-3 captures total.**
- **1 scores Weak** (Rule 10 — multiple `each()` callsites bound to the same `arraySignal`).
- **4 score Silent** (Rules 2, 4, 5, 7). These are the diagnostic gaps an AI feels most.
- **3 are N/A** (Rules 3, 6, 11) — positive-only instructions or compile-time type contracts, not runtime violations.

Honest read: kerf is best-in-class where it *does* throw (Rules 1, 8, 9, 12, the mount precondition, the row contract — all row/index-precise, fix-suggestive). Where the framework is silent — list keys, listener-on-mounted-node, nested mounts, signal read outside render — there's clear room to improve. Each score-0 row below has a follow-up improvement ticket linked.

## Per-rule audit

### Rule 1 — DOM node as JSX child · **Score 3**

> *"JSX renders to HTML strings, not DOM nodes. Don't pass DOM nodes as JSX children."*

Violating fixture:

```tsx
const node = toElement('<span>oops</span>');
<div>{node as unknown as string}</div>;
```

Runtime behavior: **throws.**

```
JSX: DOM elements cannot be passed as children (the JSX runtime renders to
HTML strings). Build the tree in one JSX expression and use querySelector
after toElement() to get element refs.
```

Why this scores 3: the error names what's wrong (DOM elements as children), why it's wrong (the runtime renders to strings), and the canonical fix (one JSX expression + `querySelector` after `toElement()`). A model that hits this error self-corrects on the next pass.

### Rule 2 — List rows without `data-key`/`id` · **Score 0** · follow-up filed: dev-time warn from `each()` when a row has no `id`/`data-key`

> *"Diff keys are `id` first, then `data-key`. Lists must set them."*

Violating fixture:

```tsx
const items = signal([{ id: 'b' }, { id: 'c' }]);
mount(host, () => (
  <ul>
    {each(items.value, (item) => <li>{item.id}</li>)}
  </ul>
));
```

Runtime behavior: **no error, no warning.** The reconciler falls back to positional matching, so an insert at the head visually shifts every row's state — a focused input loses focus to the wrong row, a mid-edit textarea swaps its content with its neighbor.

Why this scores 0: the violation produces a working-looking program. The bug only surfaces under specific user interactions (focused-input + insert-at-head) and looks like a state-management issue rather than a missing-attribute issue.

**Follow-up:** a dev-time `console.warn` when an `each()` row has neither `id` nor `data-key` would raise this to score 2 without any runtime cost in production.

### Rule 4 — `addEventListener` on a node inside a `mount()`-managed tree · **Score 0** · follow-up filed: dev-mode `MutationObserver` warning when a listener-bearing node gets rebuilt

> *"Never `addEventListener` on a node inside a `mount()`-managed tree unless that node lives under `data-morph-skip`."*

Violating fixture:

```tsx
mount(host, () => <span class={cls.value}>label</span>);
const span = host.querySelector('span')!;
span.addEventListener('click', () => { /* … */ });
// First click works. Subsequent re-render rebuilds the span → listener is
// lost. No warning fires.
```

Runtime behavior: **no error.** The listener works for the first interaction, then disappears the next time the morph rebuilds the node.

Why this scores 0: the model sees the first click work, concludes the code is correct, and moves on. The listener-loss surfaces minutes or hours later in unrelated user testing.

**Follow-up:** a `MutationObserver`-backed dev assertion in `mount()` could flag listener-bearing nodes that get replaced (the existing browser test for §5.4 already documents the rebuilt-nodes contract). Cost: dev-only, off by default in production.

### Rule 5 — One `mount()` per root · **Score 0** · follow-up filed: `mount()` throws when called on an already-mounted element or any ancestor of one

> *"One `mount()` per root. Don't nest `mount()` calls."*

Violating fixture:

```tsx
mount(host, () => <div>outer <div id="inner-host">slot</div></div>);
mount(host.querySelector('#inner-host')!, () => <span>{inner.value}</span>);
```

Runtime behavior: **no error.** The outer effect's next re-render reconciles `#inner-host` back to `"slot"`, overwriting whatever the inner mount wrote. No warning identifies the nesting.

The related precondition — `mount(null, …)` — scores 3:

```
mount: rootEl is null/undefined — pass the live element, e.g.
mount(document.getElementById("app")!, render). A common cause is a typo in
the id or selector that returns null at runtime even though the TypeScript
types say HTMLElement.
```

**Follow-up:** tag elements with a non-enumerable `__kerfMounted` marker on first mount; throw on a second `mount(el, …)` against an already-mounted element (or any ancestor of one).

### Rule 7 — Signal read outside the render fn · **Score 0** · follow-up filed: dev-mode warn on writes to signals with no live subscriber from the last `mount()` pass

> *"Signal reads must happen inside the render function to be tracked."*

Violating fixture:

```tsx
const count = signal(0);
const captured = count.value;       // wrong: read outside render
mount(host, () => <span>{String(captured)}</span>);
count.value = 5;                    // no re-render fires
```

Runtime behavior: **no error.** The render fn never subscribed; subsequent writes are ignored as far as the bound element is concerned.

This is the classic stale-closure tax in a smaller form. `@preact/signals-core` has no warn-on-untracked-write hook out of the box.

**Follow-up:** a dev-mode wrapper around `signal()` could mark each signal with a "last subscribed at" timestamp and warn when `.value` is written to a signal that has live `mount()`-bound consumers that didn't read it during the most recent render pass. Heuristic — would catch the common case without false positives on intentionally-untracked writes.

### Rule 8 — Store action mutates `get()` instead of calling `set()` · **Score 3**

> *"Store actions receive `(set, get)`, not `(state)`. `set(next)` replaces state; mutating `get()` does nothing."*

Originally captured at score 0 — the silent-and-divergent failure mode of all the rules: the mutation actually landed on the state object so direct `.value` reads saw the new value, but the signal's version was never incremented, so reactive consumers stayed stale. The bug looked like it worked from one read site and looked broken from another.

Violating fixture:

```tsx
const counter = defineStore({
  initial: () => ({ count: 0 }),
  actions: (_set, get) => ({
    wronglyMutate: () => { get().count = 42; },   // mutates the snapshot
  }),
});
counter.actions.wronglyMutate();
```

Runtime behavior in dev: **throws.**

```
TypeError: Cannot assign to read only property 'count' of object '#<Object>'
```

Why this scores 3: in dev, `defineStore`'s `get` parameter freezes the snapshot before returning it (`process.env.NODE_ENV !== 'production'` gate). The V8/JavaScriptCore/SpiderMonkey runtime's native `TypeError` already names the property and the object — a model that hits it self-corrects by switching to `set(next)`. Production keeps the bare reference for zero overhead; the silent-mutation path remains the documented production behavior.

Promoted from score 0 to score 3 by the dev-mode freeze in `src/store.ts` (KF-177).

### Rule 9 — Inline `onClick` (function-valued attribute) · **Score 3**

> *"Use `data-action` (or similar) attributes, not inline `onClick`. Inline handlers aren't supported by the JSX → string runtime; delegate from the root instead."*

Violating fixture:

```tsx
const handler = () => {};
<button onClick={handler as unknown as string}>x</button>;
```

Runtime behavior: **throws.**

```
JSX: inline event handlers like onClick={fn} are not supported by kerf's
JSX → HTML-string runtime. Use event delegation from the mount root instead:

  delegate(rootEl, 'click', '[data-action="..."]', (evt, target) => { ... });
  <button data-action="...">click</button>

See docs/5-event-delegation.md for the tier-1/tier-2/tier-3 model.
```

Why this scores 3: the error names what's wrong (inline event handlers like `onClick={fn}`), why it's wrong (the JSX → HTML-string runtime can't serialize functions), and the canonical fix (a `delegate()` snippet wired to a `data-action` attribute). A model that hits this error self-corrects without external help — the throw delivers the canonical pattern in-line.

Originally captured at score 2; promoted to score 3 by the dedicated `onX={fn}` error path in `src/jsx-runtime.ts` that fires before the generic "stringify it" message.

### Rule 10 — Multiple `each()` callsites bound to the same `arraySignal` · **Score 1**

> *"Only one `each()` callsite per render gets the granular benefit; subsequent callsites bound to the same arraySignal fall through to the snapshot path."*

Violating fixture:

```tsx
const items = arraySignal([{ id: 'a' }, { id: 'b' }]);
mount(host, () => (
  <div>
    <ul>{each(items.value, (item) => <li data-key={item.id}>top:{item.id}</li>)}</ul>
    <ul>{each(items.value, (item) => <li data-key={item.id}>bot:{item.id}</li>)}</ul>
  </div>
));
```

Runtime behavior: **no error.** Both lists render correctly. The "wrong" thing is invisible: the second callsite forfeits the granular-patch fast path and falls through to the snapshot path for every render.

Why this scores 1, not 0: the output is correct. There's no user-visible bug — just a perf-characteristic gap that a maintainer reading [`docs/4-render.md`](/kerf/docs/render/) would discover.

**Follow-up (optional):** a one-line dev `console.info` when a second `each()` callsite binds to the same `arraySignal` would surface the fast-path drop-out. Lower priority than the silent-misbehavior bugs above.

### Rule 12 — Multi-root `each()` row · **Score 3**

> *"Each `each()` row must produce exactly one top-level element."*

Violating fixture:

```tsx
const items = [{ id: 'a' }, { id: 'b' }];
mount(host, () => (
  <table>
    <tbody>
      {each(items, () => <>
        <td>cell 1</td>
        <td>cell 2</td>
      </>)}
    </tbody>
  </table>
));
```

Runtime behavior: **throws.**

```
each(): row render at index 0 produced 2 top-level elements; exactly one is
required. Each item's render must return exactly one element — wrap multiple
roots in a single parent (e.g. <li>...</li>). Got HTML: "<td>cell 1</td><td>cell 2</td>"
```

Why this scores 3: the error names the rule (the contract), the location (row index 0), and the fix (wrap in one parent). The truncated HTML shows the exact offending render. This is the **gold-standard error in kerf** — every other error site is graded against this template.

### Rules 3, 6, 11 — Non-violations (N/A)

- **Rule 3** (`data-morph-skip` is your escape hatch) is a positive-instruction rule: omitting it on a library-owned subtree is what produces breakage. There's no "wrong code that breaks the rule" because the rule says *do* something, not *don't*.
- **Rule 6** (components are plain functions; no hooks semantics) is a non-rule on kerf — there's no machinery that even attempts `<MyComponent />`-with-hooks semantics. A function returning JSX is the only component shape.
- **Rule 11** (custom-element types declaration-merge into `kerfjs/jsx-runtime`) is a compile-time TypeScript contract, not a runtime one. The jsx-typing dist test (`npm run test:dist:jsx-typing`) is the gate; this audit doesn't grade type errors.

## Score distribution

```
Score 3 (excellent):  ████████████  7 captures
Score 2 (good):       (none)
Score 1 (weak):       ██            1 capture
Score 0 (silent):     ██████        4 captures
N/A:                  ████          3 rules
```

## What this evidence does and doesn't show

What it shows:
- When kerf **does** throw, it throws well — row/index-precise, fix-suggestive, scored 3 on the rubric. The Rule 12 (`each()` row contract) error is the template.
- Where kerf is silent (Rules 2, 4, 5, 7), the gap is well-defined and individually fixable. Each row has a follow-up improvement ticket attached.

What it doesn't show:
- Whether the *quantity* of diagnostic guidance is enough for an AI in practice — see the empirical [AI codegen benchmark](#) (in progress) for the cross-framework comparison.
- Whether kerf's errors are *better* than React's / Vue's / Solid's at the same violation type — that's the cross-framework grade we'd run as a follow-up audit if the score-0 bugs land first.

For the full proof strategy, see the [AI-evidence index](#) (in progress).

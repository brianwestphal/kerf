# 18. State-preserving DOM moves (`moveBefore`)

> **Status: shipped.** Every keyed reorder in kerf routes connected-row moves
> through `Node.prototype.moveBefore()` where the engine supports it, and falls
> back to `insertBefore()` everywhere else. Transparent — no API change, and no
> behavior change on engines without `moveBefore()`.

## 18.1 The problem `insertBefore` can't solve

kerf reorders rows constantly: an `each()` list resorts, an `arraySignal`
emits a `move` patch, `bindList` re-windows, or `morph()` relocates a keyed
element the template moved. Every one of those has, until now, been an
`insertBefore()` call.

`insertBefore()` on a node that is *already in the document* is not a move — it
is a **remove followed by a re-insert**. The node is briefly disconnected, and
the browser resets everything that is tied to a node staying connected:

- **focus** (the active element blurs),
- **text selection / caret** inside an `<input>` / `<textarea>` / contenteditable,
- **`<iframe>` document state** (the framed document reloads),
- **playing media** (`<video>` / `<audio>` restart),
- **running CSS transitions and animations** (they snap back to the start),
- **open `popover` / `<dialog>` / fullscreen** state on the moved subtree.

kerf already carried a partial fix for the first two: `list-reconcile-focus.ts`
snapshots the active element + selection range before a move pass and re-applies
them after (see [`docs/4-render.md`](4-render.md) §4.4). That snapshot is a
best-effort *restoration* — it can only put back focus and a text-selection
range, and only for the elements it knows how to read. It cannot restore a
running animation, a media position, or an `<iframe>`'s scroll and form state.

## 18.2 `moveBefore()` — an atomic, state-preserving move

`Node.prototype.moveBefore(node, ref)` (shipped in Chromium 133+, spreading to
other engines) performs the move **atomically**: the node is never disconnected
from the document. It is the platform finally offering the operation kerf
always wanted — "put this live node over there, unchanged."

Where it runs, `moveBefore()` preserves *more* than the focus snapshot ever
could. The snapshot remains necessary for interoperable text selection,
however: Firefox can keep a contenteditable focused while retargeting its live
Selection (and a cloned Range) to the list parent during the move.

## 18.3 What kerf does

A single internal helper, `src/utils/moveNode.ts`, wraps the choice:

```ts
export function moveNode(parent: Node, node: Node, ref: Node | null): void {
  const move = (parent as Partial<MoveBeforeCapable>).moveBefore;
  if (move !== undefined && node.isConnected) {
    move.call(parent, node, ref);   // atomic, state-preserving
  } else {
    parent.insertBefore(node, ref); // fallback — kerf's prior behavior exactly
  }
}
```

Two guards, each load-bearing:

1. **`move !== undefined`** — feature detection. kerf never infers engine
   support from a version; it reads the method off the actual parent instance.
   Engines without `moveBefore()` take the `insertBefore()` path, byte-for-byte
   the prior behavior.
2. **`node.isConnected`** — `moveBefore()` is only valid for a node already
   connected in the same tree as `parent`; it throws for a **detached**
   (freshly-parsed) node. A brand-new row still lives in the parse fragment when
   the reconciler places it, so it is `isConnected === false` and correctly
   falls back to `insertBefore()` — there is no live state to preserve anyway.

The second guard is what lets a *mixed* call site — a reverse pass that both
inserts new rows and relocates surviving ones in one loop — route per node
without the caller branching. Pure-insert sites (a fresh row, a cloned node)
keep calling `insertBefore()` directly; routing them through `moveNode` would
only add a guard that is always false.

### The call sites

| File | Site | Node kind |
| --- | --- | --- |
| `list-reconcile-snapshot.ts` | `applyMoves` reverse pass | mixed (reused move / fresh insert) |
| `list-reconcile-granular.ts` | `move` patch | connected move |
| `list.ts` | `bindList` reverse pass | mixed |
| `list.ts` | `bindList` `move` patch | connected move |
| `morph.ts` | keyed match relocation | connected move |
| `morph.ts` | positional-lookahead relocation | connected move |
| `morph.ts` | list-marker run relocation | connected move |

The invariant kerf relies on: at every `moveNode` call site, a *connected*
node's current parent **is** `parent` (a live row being relocated within its own
list / container), so it is in the same document as `parent` and `moveBefore()`
cannot throw.

Insert-only sites are deliberately left on `insertBefore()`:
`applySingleInsert` / bulk insert (granular), the `bindList` `insert` and
content-mode rebuild paths, and `morph()`'s clone-and-insert for an unmatched
template node.

## 18.4 Relationship to the focus snapshot

`list-reconcile-focus.ts` runs around both `each()` and `bindList` move passes.
The two mechanisms compose:

- **Engine with `moveBefore()`**: the atomic move preserves connected-node state.
  Kerf still restores text-entry selection afterwards because an engine may
  keep `document.activeElement` while retargeting a contenteditable Selection.
- **Engine without `moveBefore()`** (older Safari, happy-dom): `insertBefore()`
  runs, the focus snapshot does its job as before.

For inputs and textareas the snapshot stores numeric selection offsets. For a
contenteditable it stores the raw anchor/focus node references plus their
offsets, then reconstructs the Selection after the move. Raw references are
intentional: Firefox retargets both the live Selection and a cloned Range, but
the original text nodes remain connected inside the moved row.

## 18.5 Testing

- **Unit** (`tests/unit/moveNode.internal.test.ts`): both branches — the
  `insertBefore` fallback (happy-dom has no `moveBefore`), the `moveBefore` path
  via a spec-faithful stub, and the detached-node guard keeping fresh inserts on
  `insertBefore` even when `moveBefore` exists.
- **Focus unit** (`tests/unit/list-reconcile-focus.internal.test.ts`): restores
  a clobbered input range even when focus did not change, restores exact
  contenteditable anchor/focus nodes and offsets, and ignores a removed focused
  node.
- **Reconciler suites**: every existing `each()` / `bindList` / `morph` reorder
  test runs the `insertBefore` fallback under happy-dom, so correctness of the
  reorder result is unchanged and fully covered there.
- **Browser** (Chromium / Firefox / WebKit): exact input, textarea, and
  contenteditable caret preservation through `each()` moves, plus an exact
  contenteditable caret through a `bindList` move, live in
  `tests/browser/input-preservation.spec.ts`. Chromium also proves a running CSS
  animation survives the real `moveBefore()` path in `move-before.spec.ts`.

/**
 * State-preserving node move with a transparent fallback.
 *
 * `Node.prototype.moveBefore(node, ref)` (Chromium 133+, spreading to other
 * engines) performs an ATOMIC move: the node is never disconnected from the
 * document, so focus, selection, `<iframe>` document state, playing media,
 * running CSS transitions/animations, and open `popover`/`dialog`/fullscreen
 * state all survive. `insertBefore` on an already-connected node detaches and
 * re-attaches it, tearing every one of those down.
 *
 * kerf's keyed-list reconcilers and `morph()` move already-connected rows on
 * every reorder, so routing those moves through `moveBefore` preserves live row
 * state that the focus snapshot in `list-reconcile-focus.ts` can only
 * approximate (and only for text inputs). That module stays for the fallback
 * path; where `moveBefore` runs it self-no-ops (focus never left, so
 * `restoreFocus`'s `document.activeElement === snap.el` guard returns early).
 *
 * ## Why the `isConnected` guard, not a bare `moveBefore` call
 *
 * `moveBefore` is only valid for a node already connected in the same tree as
 * `parent`; it throws for a detached (freshly-parsed) node. Several kerf move
 * sites are *mixed* — a reverse pass that inserts brand-new rows AND relocates
 * surviving ones in one loop. Rather than force each caller to branch, this
 * helper routes per node: a connected node takes the atomic `moveBefore` path,
 * a detached one falls back to `insertBefore` (its state is fresh anyway, so
 * there is nothing to preserve). Callers still keep `insertBefore` directly at
 * pure-insert sites, where routing through here would only add a dead guard.
 *
 * The connected-node invariant kerf relies on: at every `moveNode` call site
 * the node's current parent IS `parent` (a live row being relocated within its
 * own list/container), so it is connected in the same document as `parent` and
 * `moveBefore` cannot throw. Engines without `moveBefore` fall back to
 * `insertBefore` everywhere, matching kerf's prior behavior byte-for-byte.
 */

interface MoveBeforeCapable {
  moveBefore(node: Node, ref: Node | null): void;
}

/**
 * Move `node` to sit before `ref` inside `parent` (or to the end when `ref` is
 * `null`), preserving the node's live state via `moveBefore` where the engine
 * supports it and the node is already connected; otherwise `insertBefore`.
 */
export function moveNode(parent: Node, node: Node, ref: Node | null): void {
  const move = (parent as Partial<MoveBeforeCapable>).moveBefore;
  if (move !== undefined && node.isConnected) {
    move.call(parent, node, ref);
  } else {
    parent.insertBefore(node, ref);
  }
}

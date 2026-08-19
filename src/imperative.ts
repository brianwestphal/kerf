/**
 * `kerfjs/imperative` — bind a non-kerf widget's lifecycle to a single DOM node.
 *
 * `data-morph-skip` lets a library own a subtree so kerf won't touch it — but
 * nothing manages that widget's LIFECYCLE. You set it up imperatively after
 * render and must remember to tear it down when the node is replaced/removed
 * (dropping document-level listeners the widget added, etc.). `imperative` closes
 * that seam: it's a `useEffect`-with-cleanup bound to one node.
 *
 *   import { imperative } from 'kerfjs/imperative';
 *
 *   imperative(canvasEl, (el) => {
 *     const chart = D3.mount(el);
 *     return () => chart.destroy();   // runs when el leaves the DOM (or on dispose)
 *   });
 *
 * `setup(node)` runs immediately and may return a teardown function. The teardown
 * runs once — whichever comes first — when the node leaves the document (detected
 * by a `MutationObserver`, so a morph swap, a `remountOn` replacement, or any
 * removal triggers it) or when the returned disposer is called. Re-creation is
 * NOT handled here: a fresh node is a fresh `imperative()` call — pair it with
 * `kerfjs/remount`, which replaces the node and re-runs your render (and thus
 * this call) on the new one.
 */

/** The setup callback for {@link imperative}: run against `node`, optionally return a teardown. */
export type ImperativeSetup = (node: Element) => (() => void) | void;

/**
 * Run `setup(node)` now, and its returned teardown once — when `node` leaves the
 * document, or when the returned disposer is called, whichever is first. Returns
 * a disposer (idempotent) so a `mount()` / `Scope` can drive teardown explicitly.
 */
export function imperative(node: Element, setup: ImperativeSetup): () => void {
  const teardown = setup(node);
  let done = false;

  const finish = (): void => {
    if (done) return;
    done = true;
    observer.disconnect();
    if (typeof teardown === 'function') teardown();
  };

  // Observe the node's live tree (the document when connected) with subtree, so
  // an ANCESTOR removal — not just a direct one — is caught. Each mutation just
  // re-checks `node.isConnected`, which is true until the node (or an ancestor)
  // is removed, so a morph swap / remountOn replacement / manual removal all fire.
  const observer = new MutationObserver(() => {
    if (!node.isConnected) finish();
  });
  observer.observe(node.getRootNode(), { childList: true, subtree: true });

  return finish;
}

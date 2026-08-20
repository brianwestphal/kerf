/**
 * `kerfjs/attach` — bind a non-kerf widget's lifecycle to a single DOM node.
 *
 * `data-morph-skip` lets a library own a subtree so kerf won't touch it — but
 * nothing manages that widget's LIFECYCLE. You set it up imperatively after
 * render and must remember to tear it down when the node is replaced/removed
 * (dropping document-level listeners the widget added, etc.). `attach` closes
 * that seam: run a setup against one **existing** DOM node and auto-run its
 * teardown when that node leaves the document.
 *
 *   import { attach } from 'kerfjs/attach';
 *
 *   attach(canvasEl, (el) => {
 *     const chart = D3.mount(el);
 *     return () => chart.destroy();   // runs when el leaves the DOM (or on dispose)
 *   });
 *
 * `setup(node)` runs immediately — the node already exists, so there is nothing
 * to wait for (this is NOT React's `useEffect`: no dependency array, no re-run,
 * no render-phase or hook-order scoping; it is closer to a Web Component's
 * `connectedCallback`/`disconnectedCallback` pair, Svelte's
 * `onMount(() => () => cleanup)`, or Solid's `onCleanup`). The returned teardown
 * runs once — whichever comes first — when the node leaves the document (detected
 * by a `MutationObserver`, so a morph swap, a `remountOn` replacement, or any
 * removal triggers it) or when the returned disposer is called. Re-creation is
 * NOT handled here: a fresh node is a fresh `attach()` call — pair it with
 * `kerfjs/remount`, which replaces the node and re-runs your render (and thus
 * this call) on the new one.
 *
 * Related: `kerfjs/scope`'s `observeRemovals` also auto-disposes on removal via a
 * `MutationObserver`, but scoped to a whole subtree's registered disposers rather
 * than one node's setup/teardown pair — reach for that when you're collecting
 * many disposers under an element, and for `attach` when you're binding one
 * widget's lifecycle to one node.
 */

/** The setup callback for {@link attach}: run against `node`, optionally return a teardown. */
export type AttachSetup = (node: Element) => (() => void) | void;

/**
 * Run `setup(node)` now, and its returned teardown once — when `node` leaves the
 * document, or when the returned disposer is called, whichever is first. Returns
 * a disposer (idempotent) so a `mount()` / `Scope` can drive teardown explicitly.
 */
export function attach(node: Element, setup: AttachSetup): () => void {
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

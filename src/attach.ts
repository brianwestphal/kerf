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
 * `onMount(() => () => cleanup)`, or Solid's `onCleanup`). A node may start
 * disconnected: setup still runs now, and teardown waits until it has first
 * connected and subsequently leaves the document. The returned teardown runs
 * once — whichever comes first — on that removal (detected by a
 * `MutationObserver`, so a morph swap, a `remountOn` replacement, or any removal
 * triggers it) or when the returned disposer is called. Re-creation is NOT
 * handled here: a fresh node is a fresh `attach()` call — pair it with
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
 * Run `setup(node)` now, and its returned teardown once — after `node` has been
 * connected and then leaves the document, or when the returned disposer is
 * called, whichever is first. Returns an idempotent disposer so a `mount()` /
 * `Scope` can drive teardown explicitly.
 */
export function attach(node: Element, setup: AttachSetup): () => void {
  const teardown = setup(node);
  let done = false;
  let hasConnected = node.isConnected;
  let observedRoot: Node | undefined;
  let connectionFrame = 0;

  const finish = (): void => {
    if (done) return;
    done = true;
    globalThis.cancelAnimationFrame(connectionFrame);
    observer.disconnect();
    if (typeof teardown === 'function') teardown();
  };

  const addedWithin = (candidate: Node): boolean => {
    let current: Node | null = node;
    while (current !== null) {
      if (current === candidate) return true;
      const root = current.getRootNode();
      current =
        current.parentNode ?? (root instanceof ShadowRoot ? root.host : null);
    }
    return false;
  };

  const observer = new MutationObserver((records) => {
    if (done) return;

    if (!hasConnected) {
      // A node may be prepared before insertion. Its own detached root cannot
      // observe becoming someone else's child, so wait on ownerDocument until
      // it becomes connected; only a later disconnection is a teardown event.
      if (!node.isConnected) {
        const connectedAndRemovedInBatch = records.some((record) =>
          [...record.addedNodes].some(addedWithin),
        );
        if (!connectedAndRemovedInBatch) return;
        hasConnected = true;
        finish();
        return;
      }
      hasConnected = true;
      globalThis.cancelAnimationFrame(connectionFrame);
    } else if (!node.isConnected) {
      finish();
      return;
    }

    // A connected node can move between documents or shadow roots without
    // ending its lifecycle. Follow its live root so a later removal remains
    // observable after that move.
    const root = node.getRootNode();
    if (root !== observedRoot) observe(root);
  });

  const observe = (root: Node): void => {
    observer.disconnect();
    observedRoot = root;
    const options = { childList: true, subtree: true } as const;
    observer.observe(node.ownerDocument, options);
    // Document observation sees a shadow host leave the document, while shadow
    // observation sees the node (or one of its in-shadow ancestors) removed.
    // Both are required to cover the node's composed lifecycle.
    if (root !== node.ownerDocument) observer.observe(root, options);
  };

  const watchForConnection = (): void => {
    connectionFrame = globalThis.requestAnimationFrame(() => {
      if (done || hasConnected) return;
      if (node.isConnected) {
        hasConnected = true;
        observe(node.getRootNode());
        return;
      }
      watchForConnection();
    });
  };

  // Connected nodes are watched from their live document/shadow root. For a
  // disconnected node, watch ownerDocument plus animation frames: the document
  // catches ordinary insertion, while the frame check also catches direct
  // insertion across a shadow boundary that document observation cannot see.
  observe(hasConnected ? node.getRootNode() : node.ownerDocument);
  if (!hasConnected) watchForConnection();

  return finish;
}

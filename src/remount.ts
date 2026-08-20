/**
 * `kerfjs/remount` — force a subtree to be REPLACED, not morphed, when a key changes.
 *
 * kerf morphs by default, which is almost always right. The exception is a
 * library-owned subtree (a highlighted diff, a chart, an editor) that must be
 * torn down and rebuilt on fresh DOM when its identity changes — so the library
 * re-initializes instead of the morph patching stale internals underneath it.
 * The folk pattern is a monotonic counter spent as `data-key={`gen-${n}`}` on a
 * `data-morph-skip` div; `remountOn` names that pattern.
 *
 *   import { remountOn } from 'kerfjs/remount';
 *
 *   // Replace the diff pane whenever the file (or diff mode) changes:
 *   const stop = remountOn(paneEl, () => fileId.value, () => <DiffView id={fileId.value} />);
 *   // same key  -> the subtree is left entirely alone
 *   // key change -> old subtree + its mounts disposed, a fresh one mounted
 *
 * `remountOn` owns `parent`'s children (like `mount()` / `bindList`). It returns
 * a disposer that tears down the current subtree and stops watching the key.
 * Pairs with `kerfjs/attach`: put the widget's setup/teardown on the fresh
 * node, and `remountOn` drives its re-creation.
 */
import { mount, type MountResult } from './mount.js';
import { effect, type ReadonlySignal } from './reactive.js';

/** The key that drives a {@link remountOn}: a signal, or a thunk that reads signals. */
export type RemountKey<K> = ReadonlySignal<K> | (() => K);

/** Options for {@link remountOn}. */
export interface RemountOptions {
  /**
   * Called after each (re)mount with `parent` — the live, freshly-rendered
   * subtree. This is where you bind a widget to the new DOM (e.g.
   * `attach(parent.querySelector('.host'), setup)` from `kerfjs/attach`),
   * because `render` returns a string and has no live node yet. May return a
   * cleanup `() => void` that runs before the NEXT remount and on dispose — return
   * the disposer from `attach()` here for synchronous teardown.
   */
  onMount?: (root: HTMLElement) => (() => void) | void;
}

/** Distinguishes "no key seen yet" from any real key (including `undefined`). */
const UNSET = Symbol('kerf.remount.unset');

/**
 * Watch `key` and, whenever it changes (by `Object.is`), dispose the current
 * subtree + its mounts and render a fresh one into `parent` via `mount(render)`.
 * An unchanged key leaves the subtree untouched. `options.onMount(parent)` runs
 * after each (re)mount to bind widgets to the fresh DOM. Returns a disposer that
 * tears down the current subtree and stops watching.
 */
export function remountOn<K>(
  parent: HTMLElement,
  key: RemountKey<K>,
  render: () => MountResult,
  options: RemountOptions = {},
): () => void {
  const { onMount } = options;
  const readKey = typeof key === 'function' ? key : (): K => key.value;
  let currentKey: K | typeof UNSET = UNSET;
  let disposeMount: (() => void) | undefined;
  let onMountCleanup: (() => void) | undefined;

  function tearDown(): void {
    // Run the onMount cleanup BEFORE tearing down the DOM, so a synchronous
    // teardown (e.g. an attach() disposer returned from onMount) fires while
    // its node is still attached.
    if (onMountCleanup !== undefined) {
      onMountCleanup();
      onMountCleanup = undefined;
    }
    if (disposeMount !== undefined) {
      disposeMount();
      disposeMount = undefined;
    }
    // Owning parent's children: clear whatever the old mount left so widgets
    // under it see a real removal (their MutationObserver teardown fires).
    parent.replaceChildren();
  }

  // The outer effect tracks ONLY the key. `mount()` starts its own independent
  // effect for `render`, so render's signal reads attach there, not here — the
  // key is the sole dependency that triggers a remount.
  const stopWatch = effect(() => {
    const next = readKey();
    if (!Object.is(next, currentKey)) {
      currentKey = next;
      tearDown();
      disposeMount = mount(parent, render);
      onMountCleanup = onMount?.(parent) ?? undefined;
    }
  });

  return () => {
    stopWatch();
    tearDown();
  };
}

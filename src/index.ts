/**
 * kerf — public entry point.
 *
 * Re-exports everything users need from a single import path. The JSX
 * runtime lives at `kerfjs/jsx-runtime` (subpath export); users configure it
 * via tsconfig.json's `"jsxImportSource": "kerfjs"`.
 */

// arraySignal moved to its own subpath in KF-95 — `import { arraySignal } from 'kerfjs/array-signal'`.
// Apps that don't use granular collection signals shed ~1 KB from the main barrel as a result.
export { delegate, delegateCapture } from './delegate.js';
export { each } from './each.js';
export { Fragment, isSafeHtml, raw, SafeHtml } from './jsx-runtime.js';
export { mount, type MountResult } from './mount.js';
export {
  batch,
  computed,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
} from './reactive.js';
export {
  defineStore,
  resetAllStores,
  type Store,
} from './store.js';
export { toElement } from './toElement.js';

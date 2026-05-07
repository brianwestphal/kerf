/**
 * Re-exports of `@preact/signals-core`. Lets the rest of the codebase depend
 * on `'./reactive.js'` without naming the underlying lib, so swapping it out
 * later (or fronting it with a hand-rolled implementation) is a one-file
 * change.
 */

export {
  batch,
  computed,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
} from '@preact/signals-core';

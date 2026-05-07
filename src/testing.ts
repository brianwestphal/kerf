/**
 * kerfjs/testing — helpers intended for unit tests only.
 *
 * Lives behind a separate subpath (`import { … } from 'kerfjs/testing'`) so the
 * primary `kerfjs` entry stays free of test-only API. Production code should
 * never import from here.
 */

export { clearStoreRegistry } from './store.js';

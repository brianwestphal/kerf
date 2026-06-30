// Public barrel. Re-export everything consumers import from the package root.
// (The `./counter` subpath export in package.json lets consumers also import the
// component directly: `import { Counter } from '__PKG_NAME__/counter'`.)
export {
  Counter,
  createCounter,
  wireCounter,
  type CounterProps,
  type CounterState,
  type CounterStore,
} from './counter.js';

// KF-J1Z4VA: measure the demo bundle on whichever Node runs this file, and
// print that Node's version with the measurement as one JSON line.
// `measureOnPinnedNode` runs it under the pinned Node major.
import process from 'node:process';

import { measureDemoBundle } from './demo-bundle-budget.mjs';

const measurement = await measureDemoBundle(process.argv[2]);
console.log(JSON.stringify({ node: process.version, measurement }));

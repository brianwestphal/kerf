// Repeat the linked Variant Set update check against the shipped Library.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { runVariantSetSyncGate } from './variant-sync-gate.mjs';

const root = resolve(import.meta.dirname, '../../../docs/design/sketch');
const manifest = JSON.parse(
  await readFile(join(root, 'unified/symbol-manifest.json'), 'utf8'),
);
const reportPath = join(root, 'unified/variant-link-report.json');
const report = await runVariantSetSyncGate({
  libraryPath: join(root, 'Kerf-UI.sketch'),
  manifest,
  reportPath,
});
console.log(
  `Verified ${report.names.length} linked Variant Sets: ${reportPath}`,
);

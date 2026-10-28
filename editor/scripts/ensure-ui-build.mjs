// The editor resolves @kerfjs/ui from the sibling ui/ build (its dist output
// and declarations). Build it once when it is missing; a ui change rebuilds it
// through the ui gate, which the root check runs before this one.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ui = fileURLToPath(new URL('../../ui/', import.meta.url));
if (!existsSync(`${ui}dist/index.js`) || !existsSync(`${ui}dist/index.d.ts`)) {
  console.log('[editor] ui/dist is missing; building @kerfjs/ui once.');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: ui,
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

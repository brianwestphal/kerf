import { mkdir, readFile, writeFile } from 'node:fs/promises';

import {
  browserEntrySubpaths,
  browserWrapperSource,
} from './lib/browser-entry-styles.mjs';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const browserDirectory = new URL('../dist/browser/', import.meta.url);

await mkdir(browserDirectory, { recursive: true });

for (const component of browserEntrySubpaths(packageJson)) {
  await writeFile(
    new URL(`${component}.js`, browserDirectory),
    await browserWrapperSource(component),
  );
}

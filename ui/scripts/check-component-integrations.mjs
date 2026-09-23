import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  deriveComponentIntegrations,
  parseBarrelExports,
  parseDemoIds,
  parseSignatureSpecifiers,
  parseStyleImports,
  parseTsupEntries,
  validateComponentIntegrations,
} from './lib/component-integrations.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const read = (path) => readFile(resolve(root, path), 'utf8');
const exists = async (path) => {
  try {
    await access(resolve(root, path));
    return true;
  } catch {
    return false;
  }
};

const [catalog, packageJson, tsup, barrel, styles, registry, signatures] =
  await Promise.all([
    read('ai/component-catalog.json').then(JSON.parse),
    read('package.json').then(JSON.parse),
    read('tsup.config.ts'),
    read('src/index.ts'),
    read('src/styles.css'),
    read('ux-demo/demos/registry.ts'),
    read('ai/public-api-signatures-v1.md'),
  ]);
const integrations = deriveComponentIntegrations(catalog);
const modules = new Set(integrations.map(({ module }) => module));
const ids = new Set(integrations.map(({ id }) => id));
const [sourceModules, styleModules, demoModules] = await Promise.all([
  Promise.all(
    [...modules].map(async (module) => [
      module,
      (await exists(`src/${module}.tsx`)) || (await exists(`src/${module}.ts`)),
    ]),
  ).then(
    (entries) =>
      new Set(entries.filter(([, found]) => found).map(([id]) => id)),
  ),
  Promise.all(
    [...modules].map(async (module) => [
      module,
      await exists(`src/${module}.css`),
    ]),
  ).then(
    (entries) =>
      new Set(entries.filter(([, found]) => found).map(([id]) => id)),
  ),
  Promise.all(
    [...ids].map(async (id) => [id, await exists(`ux-demo/demos/${id}.tsx`)]),
  ).then(
    (entries) =>
      new Set(entries.filter(([, found]) => found).map(([id]) => id)),
  ),
]);

const failures = validateComponentIntegrations(integrations, {
  packageExports: packageJson.exports,
  tsupEntries: parseTsupEntries(tsup),
  sourceModules,
  styleModules,
  barrelExports: parseBarrelExports(barrel),
  styleImports: parseStyleImports(styles),
  demoIds: parseDemoIds(registry),
  demoModules,
  signatureSpecifiers: parseSignatureSpecifiers(signatures),
});

if (failures.length === 0) {
  console.log(
    `[component-integrations] OK — ${integrations.length} catalog components cover package, build, barrel, CSS, demo, route, and AI signature surfaces.`,
  );
} else {
  console.error(
    `[component-integrations] ${failures.length} integration projection${failures.length === 1 ? '' : 's'} drifted${dryRun ? ' (dry run)' : ''}:`,
  );
  for (const failure of failures) {
    console.error(`\n--- ${failure.surface}`);
    console.error(`+++ expected ${JSON.stringify(failure.expected)}`);
    console.error(`    actual   ${JSON.stringify(failure.actual)}`);
  }
  console.error(
    '\nAuthor the component implementation, catalog entry, demo, and tests, then resolve every projection above in one change.',
  );
  if (!dryRun) process.exitCode = 1;
}

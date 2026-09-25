import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeCatalogDemoSource,
  analyzeCatalogShellSource,
  applyCatalogDemoExceptions,
  validateCatalogDemoExceptionManifest,
} from './lib/catalog-demo-conformance.mjs';

const uiRoot = fileURLToPath(new URL('..', import.meta.url));
const [catalog, packageJson, exceptionManifest, shellSource] =
  await Promise.all([
    readFile(resolve(uiRoot, 'ai/component-catalog.json'), 'utf8').then(
      JSON.parse,
    ),
    readFile(resolve(uiRoot, 'package.json'), 'utf8').then(JSON.parse),
    readFile(
      resolve(uiRoot, 'ux-demo/catalog-conformance-exceptions.json'),
      'utf8',
    ).then(JSON.parse),
    readFile(resolve(uiRoot, 'ux-demo/main.tsx'), 'utf8'),
  ]);
const packageExports = new Set(Object.keys(packageJson.exports));
const demos = catalog.entries.filter((entry) => entry.kind !== 'recipe');
const diagnostics = (
  await Promise.all(
    demos.map(async (entry) => {
      const filePath =
        entry.source === 'webawesome'
          ? 'ux-demo/webawesome-demos.tsx'
          : `ux-demo/demos/${entry.id}.tsx`;
      const absoluteFilePath = resolve(uiRoot, filePath);
      let source;
      try {
        source = await readFile(absoluteFilePath, 'utf8');
      } catch {
        return [
          {
            rule: 'catalog-demo/missing-source',
            route: entry.id,
            file: filePath,
            line: 1,
            column: 1,
            message: `Catalog route ${entry.id} has no demo source.`,
          },
        ];
      }
      return analyzeCatalogDemoSource({
        route: entry.id,
        kind: entry.kind,
        filePath,
        absoluteFilePath,
        source,
        uiRoot,
        packageExports,
      });
    }),
  )
).flat();
diagnostics.push(
  ...analyzeCatalogShellSource({
    filePath: 'ux-demo/main.tsx',
    source: shellSource,
  }),
);
const localDemoStyles = (await readdir(resolve(uiRoot, 'ux-demo/demos')))
  .filter((name) => name.endsWith('.css'))
  .map((name) => `ux-demo/demos/${name}`);
try {
  await readFile(resolve(uiRoot, 'ux-demo/webawesome-demos.css'), 'utf8');
  localDemoStyles.push('ux-demo/webawesome-demos.css');
} catch {
  // The no-local-stylesheet contract expects this file to be absent.
}
for (const file of localDemoStyles)
  diagnostics.push({
    rule: 'catalog-demo/local-stylesheet',
    route: '*',
    file,
    line: 1,
    column: 1,
    message:
      'Focused demo stylesheets are forbidden; configure Kerf UI, Web Awesome, or catalog-owned specimen geometry instead.',
  });
const failures = [
  ...validateCatalogDemoExceptionManifest(exceptionManifest),
  ...applyCatalogDemoExceptions(diagnostics, exceptionManifest.exceptions),
].sort(
  (left, right) =>
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.column - right.column ||
    left.rule.localeCompare(right.rule),
);

if (failures.length) {
  console.error('[check-catalog-demo-conformance] Catalog demos drifted:\n');
  for (const failure of failures)
    console.error(
      `- ${failure.file}:${failure.line}:${failure.column} [${failure.rule}] ${failure.message}`,
    );
  process.exitCode = 1;
} else
  console.log(
    `[check-catalog-demo-conformance] OK — ${demos.length} routes use public imports, sanctioned helpers or reviewed exceptions, and kind-driven overlays.`,
  );

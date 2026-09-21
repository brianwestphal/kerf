import console from 'node:console';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

import {
  APPLICATION_UI_PROFILE_FILENAME,
  mergeApplicationUiProfiles,
  readApplicationUiProfile,
  validateApplicationUiProfile,
  validateApplicationUiProfileLayers,
} from '../ai/application-ui-profile.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const paths = {
  defaults: resolve(root, 'ai/application-ui-profile.defaults.json'),
  schema: resolve(root, 'ai/application-ui-profile.schema.json'),
  types: resolve(root, 'ai/application-ui-profile.d.ts'),
  example: resolve(root, 'docs/examples/application-ui-profile.json'),
  catalog: resolve(root, 'ai/component-catalog-v2.json'),
  diagnostics: resolve(root, 'ai/application-ui-diagnostic-ids-v1.json'),
  syncContract: resolve(root, 'ai/application-ui-profile-sync.cjs'),
  readme: resolve(root, 'README.md'),
  llms: resolve(root, 'llms.txt'),
  contract: resolve(root, 'docs/component-contract.md'),
};
const [
  defaultLayer,
  exampleLayer,
  schema,
  types,
  catalog,
  diagnosticRegistry,
  syncContract,
  readme,
  llms,
  contract,
] = await Promise.all([
  readApplicationUiProfile(paths.defaults),
  readApplicationUiProfile(paths.example),
  readFile(paths.schema, 'utf8').then(JSON.parse),
  readFile(paths.types, 'utf8'),
  readFile(paths.catalog, 'utf8').then(JSON.parse),
  readFile(paths.diagnostics, 'utf8').then(JSON.parse),
  readFile(paths.syncContract, 'utf8'),
  readFile(paths.readme, 'utf8'),
  readFile(paths.llms, 'utf8'),
  readFile(paths.contract, 'utf8'),
]);
const failures = [];
const fail = (message) => failures.push(message);
const knownComponents = new Set(catalog.entries.map((entry) => entry.key));
const knownTokens = new Set(
  catalog.entries.flatMap((entry) => entry.boundaries.publicTokens),
);
const knownRules = new Set(diagnosticRegistry.ids ?? []);
for (const entry of catalog.entries)
  for (const diagnostic of entry.diagnostics) knownRules.add(diagnostic.id);

if (schema.properties?.schemaVersion?.const !== 1)
  fail('profile schema must require schemaVersion 1');
const catalogSchema = schema.$defs?.catalog;
if (
  !catalogSchema?.required?.includes('composition') ||
  catalogSchema.required.includes('selection')
)
  fail('profile schema must require composition and allow optional selection');
if (
  !catalogSchema?.allOf?.some((rule) =>
    rule.then?.required?.includes('selection'),
  )
)
  fail('profile schema must retain the conditional Kerf selection requirement');
if (!types.includes('export interface ApplicationUiProfile'))
  fail('profile TypeScript contract is missing ApplicationUiProfile');
if (diagnosticRegistry.schemaVersion !== 1)
  fail('application UI diagnostic registry must use schemaVersion 1');
if (
  !Array.isArray(diagnosticRegistry.ids) ||
  new Set(diagnosticRegistry.ids).size !== diagnosticRegistry.ids.length ||
  diagnosticRegistry.ids.some((id) => !/^KUI-[A-Z][0-9]{3}$/.test(id))
)
  fail('application UI diagnostic registry ids must be unique stable KUI ids');
for (const required of [
  'KUI-B010',
  'KUI-D020',
  'KUI-L002',
  'KUI-L090',
  'KUI-P030',
  'KUI-T001',
])
  if (!knownRules.has(required))
    fail(`application UI diagnostic registry is missing ${required}`);
if (!syncContract.includes('loadApplicationUiProfileSync'))
  fail('synchronous application UI profile contract is missing its loader');
if (APPLICATION_UI_PROFILE_FILENAME !== '.kerf-ui-profile.json')
  fail('profile discovery filename drifted');

for (const diagnostic of validateApplicationUiProfile(defaultLayer.profile, {
  source: defaultLayer.source,
  knownComponents,
  knownTokens,
  knownRules,
}))
  fail(`${diagnostic.source} ${diagnostic.path}: ${diagnostic.message}`);

const merged = mergeApplicationUiProfiles([defaultLayer, exampleLayer]);
for (const diagnostic of validateApplicationUiProfileLayers([
  defaultLayer,
  exampleLayer,
]))
  fail(`${diagnostic.source} ${diagnostic.path}: ${diagnostic.message}`);
const consumerCatalogs = [];
for (const [index, location] of (merged.profile.catalogs ?? []).entries()) {
  const source = merged.provenance[`$catalogs.${location.package}`];
  for (const kind of ['selection', 'composition']) {
    if (!location[kind]) continue;
    const path = resolve(dirname(source), location[kind].path);
    try {
      await access(path);
      const artifact = JSON.parse(await readFile(path, 'utf8'));
      if (
        artifact.package !== location.package ||
        artifact.schemaVersion !== location[kind].schemaVersion
      )
        fail(
          `example $.catalogs[${index}].${kind} points to incompatible ${path}`,
        );
      if (kind === 'composition') consumerCatalogs.push(artifact);
    } catch (error) {
      fail(
        `example $.catalogs[${index}].${kind}.path cannot load ${path}: ${error.message}`,
      );
    }
  }
}
for (const consumer of consumerCatalogs)
  for (const entry of consumer.entries) {
    knownComponents.add(entry.key);
    for (const token of entry.boundaries.publicTokens) knownTokens.add(token);
    for (const diagnostic of entry.diagnostics) knownRules.add(diagnostic.id);
  }
for (const diagnostic of validateApplicationUiProfile(merged.profile, {
  source: exampleLayer.source,
  knownComponents,
  knownTokens,
  knownRules,
}))
  fail(`${diagnostic.source} ${diagnostic.path}: ${diagnostic.message}`);

for (const [name, text] of [
  ['README', readme],
  ['llms.txt', llms],
  ['component contract', contract],
])
  if (!text.includes('application-ui-profile'))
    fail(`${name} must discover the application UI profile contract`);

if (failures.length) {
  console.error('[check-application-ui-profile] Profile contract drifted:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `[check-application-ui-profile] OK — package defaults and workspace example resolve ${merged.profile.catalogs.length} catalogs, ${Object.keys(merged.profile.preferences).length} preferences, and ${Object.keys(merged.profile.tokens).length} token override.`,
  );
}

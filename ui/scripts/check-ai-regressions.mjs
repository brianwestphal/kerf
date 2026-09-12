import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAiRegressionContext } from './lib/ai-regression-context.mjs';
import { scoreAiRegression } from './lib/ai-regression-score.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [corpus, schema, conditions, conditionsSchema, responseSchema, runSchema, expected, catalog, packageJson] = await Promise.all([
  readJson('ai-regressions/corpus.json'),
  readJson('ai-regressions/corpus.schema.json'),
  readJson('ai-regressions/conditions.json'),
  readJson('ai-regressions/conditions.schema.json'),
  readJson('ai-regressions/response.schema.json'),
  readJson('ai-regressions/run.schema.json'),
  readJson('ai-regressions/fixtures/expected-scores.json'),
  readJson('ai/component-catalog.json'),
  readJson('package.json'),
]);
const failures = [];
const fail = (message) => failures.push(message);
const expectedCases = ['application-shell', 'compact-exclusive-choice', 'navigation-sections', 'workspace-states', 'master-detail-dialog', 'tokenized-search', 'missing-recurring-concept'];
const expectedConditions = ['none', 'current-guidance', 'revised-recipes-catalog'];

if (schema.properties?.schemaVersion?.const !== 1 || schema.additionalProperties !== false) fail('corpus schema must pin version 1 and reject unknown root fields');
if (responseSchema.additionalProperties !== false || responseSchema.properties?.run) fail('model responses must reject unknown fields and keep run metadata separate');
if (runSchema.properties?.evidence?.const !== 'measured' || runSchema.additionalProperties !== false) fail('run schema must identify measured evidence and reject unknown root fields');
if (corpus.schemaVersion !== 1 || !Array.isArray(corpus.cases)) fail('corpus must declare schemaVersion 1 and cases');
if (JSON.stringify(corpus.cases.map(({ id }) => id)) !== JSON.stringify(expectedCases)) fail('corpus must contain the seven task fixtures in stable order');
if (new Set(corpus.cases.map(({ id }) => id)).size !== corpus.cases.length) fail('case ids must be unique');
if (JSON.stringify(conditions.conditions?.map(({ id }) => id)) !== JSON.stringify(expectedConditions)) fail('conditions must be none, current-guidance, and revised-recipes-catalog');
if (!packageJson.scripts?.['ai:regressions:record']?.includes('record-ai-regression-run.mjs')) fail('package scripts must expose the opt-in run recorder');

const catalogIds = new Set(catalog.entries.map(({ id }) => id));
for (const testCase of corpus.cases) {
  const prompt = await readFile(resolve(root, 'ai-regressions', testCase.prompt), 'utf8');
  if (/@kerfjs|\bkui-|\b(?:Toolbar|MenuItem|MenuHeader|SegmentedControl|TokenSearchField|ResizableRegion|StateBanner|EmptyState)\b/.test(prompt)) {
    fail(`${testCase.id} prompt leaks an implementation hint`);
  }
  if (/\b(?:password|api[_ -]?key|secret|token)\s*[:=]/i.test(prompt)) fail(`${testCase.id} prompt appears to contain a secret`);
  for (const id of [...testCase.requiredComponentIds, ...testCase.forbiddenComponentIds]) {
    if (!catalogIds.has(id)) fail(`${testCase.id} references unknown catalog id ${id}`);
  }
  for (const specifier of testCase.requiredImports) {
    const subpath = specifier.replace('@kerfjs/ui', '.') || '.';
    if (!(subpath in packageJson.exports)) fail(`${testCase.id} references stale package import ${specifier}`);
  }
}

const current = conditions.conditions.find(({ id }) => id === 'current-guidance');
if (conditionsSchema.properties?.conditions?.items?.properties?.sourceRevision?.pattern !== '^[a-f0-9]{40}$') fail('conditions schema must type full source revisions');
if (current.sourceRevision !== '4ed4515fb372cf4dc45325452fa4347bdaa080b0' || current.expectedSha256 !== '976b0e9c41cf251804107bbe2d7024d8734da7d58dfe9efed1dbd6ce24b64d28' || current.sourcePaths.length !== 1 || !current.sourcePaths[0].includes('current-guidance-4ed4515')) {
  fail('current-guidance must remain a checked-in pre-recipe snapshot at 4ed4515');
}
const revised = conditions.conditions.find(({ id }) => id === 'revised-recipes-catalog');
for (const required of ['ai/component-catalog.json', 'docs/recipes.md', 'ux-demo/recipes/app-shell.tsx', 'ux-demo/recipes/recipes.css']) {
  if (!revised.sourcePaths.includes(required)) fail(`revised context is missing ${required}`);
}
for (const condition of conditions.conditions) {
  const first = await buildAiRegressionContext(root, condition);
  const second = await buildAiRegressionContext(root, condition);
  if (first.sha256 !== second.sha256 || first.text !== second.text) fail(`${condition.id} context assembly is nondeterministic`);
  if (condition.expectedSha256 && first.sources[0]?.sha256 !== condition.expectedSha256) fail(`${condition.id} frozen source content changed without a new condition`);
}

for (const fixture of expected.fixtures) {
  const response = await readJson(`ai-regressions/fixtures/${fixture.file}`);
  const testCase = corpus.cases.find(({ id }) => id === response.caseId);
  if (!testCase) { fail(`${fixture.file} references unknown case ${response.caseId}`); continue; }
  const result = scoreAiRegression(testCase, response, catalog);
  if (result.pass !== fixture.pass) fail(`${fixture.file} expected pass=${fixture.pass}, received ${result.pass}`);
  const failedCodes = new Set(result.checks.filter(({ pass }) => !pass).map(({ code }) => code));
  for (const code of fixture.mustFail) if (!failedCodes.has(code)) fail(`${fixture.file} no longer proves failure ${code}`);
}

if (failures.length) {
  console.error('[check-ai-regressions] Deterministic AI regression foundation drifted:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`[check-ai-regressions] OK — ${corpus.cases.length} neutral tasks, ${conditions.conditions.length} contexts, and ${expected.fixtures.length} scorer fixtures are synchronized.`);
}

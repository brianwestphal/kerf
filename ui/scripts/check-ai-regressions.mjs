import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AI_REGRESSION_V1_CONTEXT_SNAPSHOTS,
  AI_REGRESSION_V2_CONTEXT_SNAPSHOTS,
  buildAiRegressionContext,
} from './lib/ai-regression-context.mjs';
import { scoreAiRegression } from './lib/ai-regression-score.mjs';
import { scoreAiRegressionV2 } from './lib/ai-regression-score-v2.mjs';
import {
  validateAiRegressionEvidenceV3,
  validateAiRegressionResponseV3,
} from './lib/ai-regression-contract-v3.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = async (path) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [
  corpus,
  schema,
  conditions,
  conditionsSchema,
  conditionsV2,
  conditionsV2Schema,
  responseSchema,
  runSchema,
  runV2Schema,
  suiteV2,
  compileSchema,
  overrides,
  expected,
  catalog,
  packageJson,
  suiteV3,
  contractV3,
  contractV3Schema,
  corpusV3,
  corpusV3Schema,
  responseV3Schema,
  evidenceV3Schema,
  runV3Schema,
  baselineV3,
] = await Promise.all([
  readJson('ai-regressions/corpus.json'),
  readJson('ai-regressions/corpus.schema.json'),
  readJson('ai-regressions/conditions.json'),
  readJson('ai-regressions/conditions.schema.json'),
  readJson('ai-regressions/conditions-v2.json'),
  readJson('ai-regressions/conditions-v2.schema.json'),
  readJson('ai-regressions/response.schema.json'),
  readJson('ai-regressions/run.schema.json'),
  readJson('ai-regressions/run-v2.schema.json'),
  readJson('ai-regressions/suite-v2.json'),
  readJson('ai-regressions/compile-evidence.schema.json'),
  readJson('ai-regressions/corpus-v2-overrides.json'),
  readJson('ai-regressions/fixtures/expected-scores.json'),
  readJson('ai/component-catalog.json'),
  readJson('package.json'),
  readJson('ai-regressions/suite-v3.json'),
  readJson('ai-regressions/quality-contract-v3.json'),
  readJson('ai-regressions/quality-contract-v3.schema.json'),
  readJson('ai-regressions/corpus-v3.json'),
  readJson('ai-regressions/corpus-v3.schema.json'),
  readJson('ai-regressions/response-v3.schema.json'),
  readJson('ai-regressions/evidence-v3.schema.json'),
  readJson('ai-regressions/run-v3.schema.json'),
  readJson('ai-regressions/baseline-v3.json'),
]);
const failures = [];
const fail = (message) => failures.push(message);
const expectedCases = [
  'application-shell',
  'compact-exclusive-choice',
  'navigation-sections',
  'workspace-states',
  'master-detail-dialog',
  'tokenized-search',
  'missing-recurring-concept',
];
const expectedConditions = [
  'none',
  'current-guidance',
  'revised-recipes-catalog',
];
const expectedV1RevisedContextSha256 =
  'f3cd2e13c1fb516a1f69f108825b487ac9ad65e64ac67ef31200c3278e783816';
const expectedV2RevisedContextSha256 =
  'b3c7e4cf215ac83afc9f014df81f0547cc629b504657da9bc19eeed34061eb98';

if (
  schema.properties?.schemaVersion?.const !== 1 ||
  schema.additionalProperties !== false
)
  fail('corpus schema must pin version 1 and reject unknown root fields');
if (
  responseSchema.additionalProperties !== false ||
  responseSchema.properties?.run
)
  fail(
    'model responses must reject unknown fields and keep run metadata separate',
  );
if (
  runSchema.properties?.evidence?.const !== 'measured' ||
  runSchema.additionalProperties !== false
)
  fail(
    'run schema must identify measured evidence and reject unknown root fields',
  );
if (
  runV2Schema.properties?.schemaVersion?.const !== 2 ||
  runV2Schema.additionalProperties !== false
)
  fail('suite-v2 run schema must pin version 2 and reject unknown root fields');
if (
  compileSchema.properties?.schemaVersion?.const !== 1 ||
  compileSchema.additionalProperties !== false
)
  fail(
    'compile evidence schema must pin version 1 and reject unknown root fields',
  );
if (
  contractV3.schemaVersion !== 3 ||
  contractV3Schema.properties?.schemaVersion?.const !== 3 ||
  corpusV3.schemaVersion !== 3 ||
  corpusV3Schema.properties?.schemaVersion?.const !== 3 ||
  runV3Schema.properties?.schemaVersion?.const !== 3 ||
  evidenceV3Schema.properties?.schemaVersion?.const !== 3
)
  fail('suite-v3 contracts and schemas must pin version 3');
if (
  responseV3Schema.additionalProperties !== false ||
  responseV3Schema.properties?.run
)
  fail('suite-v3 responses must stay separate from run evidence');
if (
  !runV3Schema.properties?.executor?.$ref ||
  !runV3Schema.$defs?.executor?.required?.includes('conditionSessions') ||
  runV3Schema.$defs?.executor?.properties?.conditionSession
)
  fail('suite-v3 runs must preserve one isolated session per condition');
for (const field of ['sessionId', 'requestPath', 'requestSha256']) {
  if (!runV3Schema.$defs?.result?.required?.includes(field))
    fail(`suite-v3 results must preserve ${field}`);
}
for (const field of [
  'contractSchemaSha256',
  'corpusSchemaSha256',
  'conditionsSchemaSha256',
  'catalogSchemaSha256',
  'publicApiSignaturesSha256',
  'typescriptVersion',
  'packageVersions',
]) {
  if (!runV3Schema.$defs?.harness?.required?.includes(field))
    fail(`suite-v3 harness must preserve ${field}`);
}
if (corpus.schemaVersion !== 1 || !Array.isArray(corpus.cases))
  fail('corpus must declare schemaVersion 1 and cases');
if (
  JSON.stringify(corpus.cases.map(({ id }) => id)) !==
  JSON.stringify(expectedCases)
)
  fail('corpus must contain the seven task fixtures in stable order');
if (new Set(corpus.cases.map(({ id }) => id)).size !== corpus.cases.length)
  fail('case ids must be unique');
if (
  JSON.stringify(conditions.conditions?.map(({ id }) => id)) !==
  JSON.stringify(expectedConditions)
)
  fail(
    'conditions must be none, current-guidance, and revised-recipes-catalog',
  );
if (
  JSON.stringify(conditionsV2.conditions?.map(({ id }) => id)) !==
  JSON.stringify(expectedConditions)
)
  fail('suite-v2 conditions must preserve the three stable condition ids');
if (
  !packageJson.scripts?.['ai:regressions:record']?.includes(
    'record-ai-regression-run.mjs',
  )
)
  fail('package scripts must expose the opt-in run recorder');
if (
  !packageJson.scripts?.['ai:regressions:compile']?.includes(
    'compile-ai-regression-response.mjs',
  )
)
  fail('package scripts must expose the opt-in compile probe');

if (suiteV3.id !== 'kerf-ui-authoring-v3')
  fail('suite-v3 descriptor must pin its id');
for (const [key, expectedPath] of Object.entries({
  contract: 'ai-regressions/quality-contract-v3.json',
  contractSchema: 'ai-regressions/quality-contract-v3.schema.json',
  corpus: 'ai-regressions/corpus-v3.json',
  corpusSchema: 'ai-regressions/corpus-v3.schema.json',
  conditions: 'ai-regressions/conditions-v2.json',
  conditionsSchema: 'ai-regressions/conditions-v2.schema.json',
  catalog: 'ai/component-catalog.json',
  publicApiSignatures: 'ai/public-api-signatures-v1.md',
  responseSchema: 'ai-regressions/response-v3.schema.json',
  evidenceSchema: 'ai-regressions/evidence-v3.schema.json',
  runSchema: 'ai-regressions/run-v3.schema.json',
  baseline: 'ai-regressions/baseline-v3.json',
})) {
  if (suiteV3[key] !== expectedPath)
    fail(`suite-v3 descriptor has stale ${key}`);
}
const expectedStages = ['static', 'compile', 'browser', 'human-visual'];
if (
  JSON.stringify(contractV3.evidenceStages.map(({ id }) => id)) !==
  JSON.stringify(expectedStages)
)
  fail(
    'suite-v3 must keep static, compile, browser, and human-visual evidence separate',
  );
if (
  JSON.stringify(contractV3.browserMatrix.map(({ id }) => id)) !==
  JSON.stringify(['wide', 'intermediate', 'narrow', 'zoom-200'])
)
  fail(
    'suite-v3 browser matrix must pin wide, intermediate, narrow, and 200% zoom',
  );
const diagnosticCodes = contractV3.diagnostics.map(({ code }) => code);
if (new Set(diagnosticCodes).size !== diagnosticCodes.length)
  fail('suite-v3 diagnostic codes must be unique');
for (const requiredCode of [
  'static.component-selection',
  'static.consumer-reuse',
  'static.public-api',
  'static.wiring-cleanup',
  'static.composition',
  'static.geometry-ownership',
  'static.accessibility',
  'compile.types',
  'browser.interaction',
  'browser.keyboard',
  'browser.responsive',
  'visual.hierarchy',
  'visual.rhythm',
  'visual.density',
  'visual.alignment',
  'visual.scroll-ownership',
]) {
  if (!diagnosticCodes.includes(requiredCode))
    fail(`suite-v3 is missing stable diagnostic ${requiredCode}`);
}
if (
  contractV3.thresholds.minimumRunsPerCondition < 3 ||
  contractV3.thresholds.minimumModelIdentities < 2
)
  fail(
    'suite-v3 measured conclusions require 3 runs per condition and 2 model identities',
  );
if (
  baselineV3.status !== 'unmeasured' ||
  baselineV3.requiredFollowUp !== 'KF-PX9NKZ'
)
  fail('suite-v3 baseline must disclose its unmeasured follow-up boundary');

const v3CaseIds = new Set();
for (const testCase of corpusV3.cases) {
  if (v3CaseIds.has(testCase.id))
    fail(`duplicate suite-v3 case ${testCase.id}`);
  v3CaseIds.add(testCase.id);
  const prompt = await readFile(
    resolve(root, 'ai-regressions', testCase.prompt),
    'utf8',
  );
  if (/\b(?:password|api[_ -]?key|secret|token)\s*[:=]/i.test(prompt))
    fail(`${testCase.id} suite-v3 prompt appears to contain a secret`);
  if (
    !testCase.editableFiles.every((path) =>
      testCase.contextFiles.includes(path),
    )
  )
    fail(`${testCase.id} editable files must be present in its context`);
  for (const path of testCase.contextFiles)
    await readFile(resolve(root, path), 'utf8');
  for (const code of testCase.requiredDiagnostics)
    if (!diagnosticCodes.includes(code))
      fail(`${testCase.id} references unknown diagnostic ${code}`);
}

const evidenceProbe = {
  schemaVersion: 3,
  suiteId: 'kerf-ui-authoring-v3',
  stage: 'static',
  records: [
    { code: 'static.component-selection', outcome: 'pass', detail: 'fixture' },
  ],
};
if (validateAiRegressionEvidenceV3(contractV3, evidenceProbe).length)
  fail('suite-v3 evidence validator rejects its deterministic probe');
const firstV3Case = corpusV3.cases[0];
if (
  validateAiRegressionResponseV3(firstV3Case, {
    caseId: firstV3Case.id,
    files: { [firstV3Case.editableFiles[0]]: 'fixture' },
  }).length
)
  fail('suite-v3 response validator rejects an in-context edit');

const catalogIds = new Set(catalog.entries.map(({ id }) => id));
for (const testCase of corpus.cases) {
  const prompt = await readFile(
    resolve(root, 'ai-regressions', testCase.prompt),
    'utf8',
  );
  if (
    /@kerfjs|\bkui-|\b(?:Toolbar|ListItem|ListHeader|ListActionRow|SegmentedControl|TokenSearchField|ResizableRegion|StateBanner|EmptyState)\b/.test(
      prompt,
    )
  ) {
    fail(`${testCase.id} prompt leaks an implementation hint`);
  }
  if (/\b(?:password|api[_ -]?key|secret|token)\s*[:=]/i.test(prompt))
    fail(`${testCase.id} prompt appears to contain a secret`);
  for (const id of [
    ...testCase.requiredComponentIds,
    ...testCase.forbiddenComponentIds,
  ]) {
    if (!catalogIds.has(id))
      fail(`${testCase.id} references unknown catalog id ${id}`);
  }
  for (const specifier of testCase.requiredImports) {
    const subpath = specifier.replace('@kerfjs/ui', '.') || '.';
    if (!(subpath in packageJson.exports))
      fail(`${testCase.id} references stale package import ${specifier}`);
  }
}

const current = conditions.conditions.find(
  ({ id }) => id === 'current-guidance',
);
if (
  conditionsSchema.properties?.conditions?.items?.properties?.sourceRevision
    ?.pattern !== '^[a-f0-9]{40}$'
)
  fail('conditions schema must type full source revisions');
if (
  current.sourceRevision !== '4ed4515fb372cf4dc45325452fa4347bdaa080b0' ||
  current.expectedSha256 !==
    '976b0e9c41cf251804107bbe2d7024d8734da7d58dfe9efed1dbd6ce24b64d28' ||
  current.sourcePaths.length !== 1 ||
  !current.sourcePaths[0].includes('current-guidance-4ed4515')
) {
  fail(
    'current-guidance must remain a checked-in pre-recipe snapshot at 4ed4515',
  );
}
const revised = conditions.conditions.find(
  ({ id }) => id === 'revised-recipes-catalog',
);
for (const required of [
  'ai/component-catalog.json',
  'docs/recipes.md',
  'ux-demo/recipes/app-shell.tsx',
  'ux-demo/recipes/recipes.css',
]) {
  if (!revised.sourcePaths.includes(required))
    fail(`revised context is missing ${required}`);
}
const revisedSnapshot = AI_REGRESSION_V1_CONTEXT_SNAPSHOTS.get(
  'revised-recipes-catalog',
);
if (
  revisedSnapshot !==
  'ai-regressions/contexts/revised-recipes-catalog-v1.snapshot.json'
)
  fail('v1 revised context must resolve through its checked-in snapshot');
for (const condition of conditions.conditions) {
  const snapshotPath = AI_REGRESSION_V1_CONTEXT_SNAPSHOTS.get(condition.id);
  const first = await buildAiRegressionContext(root, condition, {
    snapshotPath,
  });
  const second = await buildAiRegressionContext(root, condition, {
    snapshotPath,
  });
  if (first.sha256 !== second.sha256 || first.text !== second.text)
    fail(`${condition.id} context assembly is nondeterministic`);
  if (
    condition.id === 'revised-recipes-catalog' &&
    first.sha256 !== expectedV1RevisedContextSha256
  )
    fail('suite-v1 revised context snapshot changed');
  if (
    condition.expectedSha256 &&
    first.sources[0]?.sha256 !== condition.expectedSha256
  )
    fail(
      `${condition.id} frozen source content changed without a new condition`,
    );
}

if (
  conditionsV2.schemaVersion !== 2 ||
  conditionsV2Schema.properties?.schemaVersion?.const !== 2
)
  fail('suite-v2 conditions and schema must pin version 2');
if (suiteV2.schemaVersion !== 2 || suiteV2.id !== 'kerf-ui-authoring-v2')
  fail('suite-v2 descriptor must pin its version and id');
for (const [key, expectedPath] of Object.entries({
  corpus: 'ai-regressions/corpus.json',
  conditions: 'ai-regressions/conditions-v2.json',
  conditionsSchema: 'ai-regressions/conditions-v2.schema.json',
  revisedContextSnapshot:
    'ai-regressions/contexts/revised-recipes-catalog-v2.snapshot.json',
  catalog: 'ai/component-catalog.json',
  publicApiSignatures: 'ai/public-api-signatures-v1.md',
  scorer: 'scripts/lib/ai-regression-score-v2.mjs',
  baseScorer: 'scripts/lib/ai-regression-score.mjs',
  overrides: 'ai-regressions/corpus-v2-overrides.json',
  responseSchema: 'ai-regressions/response.schema.json',
  runSchema: 'ai-regressions/run-v2.schema.json',
})) {
  if (suiteV2[key] !== expectedPath)
    fail(`suite-v2 descriptor has stale ${key}`);
}
const revisedV2 = conditionsV2.conditions.find(
  ({ id }) => id === 'revised-recipes-catalog',
);
for (const required of [
  'ai/public-api-signatures-v1.md',
  'docs/examples/command-palette-adapter.tsx',
  'ux-demo/recipes/mount-recipe.ts',
]) {
  if (!revisedV2.sourcePaths.includes(required))
    fail(`suite-v2 revised context is missing ${required}`);
}
if (
  AI_REGRESSION_V2_CONTEXT_SNAPSHOTS.get('revised-recipes-catalog') !==
  'ai-regressions/contexts/revised-recipes-catalog-v2.snapshot.json'
)
  fail('v2 revised context must resolve through its checked-in snapshot');
for (const condition of conditionsV2.conditions) {
  const snapshotPath = AI_REGRESSION_V2_CONTEXT_SNAPSHOTS.get(condition.id);
  const first = await buildAiRegressionContext(root, condition, {
    snapshotPath,
  });
  const second = await buildAiRegressionContext(root, condition, {
    snapshotPath,
  });
  if (first.sha256 !== second.sha256 || first.text !== second.text)
    fail(`suite-v2 ${condition.id} context assembly is nondeterministic`);
  if (
    condition.id === 'revised-recipes-catalog' &&
    first.sha256 !== expectedV2RevisedContextSha256
  )
    fail('suite-v2 revised context snapshot changed');
  if (
    condition.expectedSha256 &&
    first.sources[0]?.sha256 !== condition.expectedSha256
  )
    fail(`suite-v2 ${condition.id} frozen source content changed`);
}

if (
  overrides.schemaVersion !== 2 ||
  !overrides.cases ||
  Array.isArray(overrides.cases)
)
  fail('v2 corpus overrides must declare schemaVersion 2 and keyed cases');
for (const [caseId, override] of Object.entries(overrides.cases ?? {})) {
  const testCase = corpus.cases.find(({ id }) => id === caseId);
  if (!testCase) {
    fail(`v2 overrides reference unknown case ${caseId}`);
    continue;
  }
  for (const requirement of override.requiredWiringAny ?? []) {
    if (
      !requirement.id ||
      !Array.isArray(requirement.options) ||
      requirement.options.length < 2
    )
      fail(`${caseId} v2 wiring alternative must name at least two options`);
    for (const option of requirement.options ?? []) {
      if (!option.name || !option.specifier || option.captured !== true)
        fail(`${caseId} v2 wiring options must name a captured public call`);
      if (option.specifier.startsWith('@kerfjs/ui')) {
        const subpath = option.specifier.replace('@kerfjs/ui', '.') || '.';
        if (!(subpath in packageJson.exports))
          fail(
            `${caseId} v2 wiring references stale UI import ${option.specifier}`,
          );
      }
    }
  }
}

for (const [file, code] of [
  ['v2-resize-dedicated-import.json', 'wiring:wireResizableRegions'],
  ['v2-delegate-root-import.json', 'wiring:delegated-actions'],
]) {
  const response = await readJson(`ai-regressions/fixtures/responses/${file}`);
  const base = corpus.cases.find(({ id }) => id === response.caseId);
  const result = scoreAiRegressionV2(
    { ...base, ...overrides.cases[response.caseId] },
    response,
    catalog,
  );
  if (!result.checks.find((check) => check.code === code)?.pass)
    fail(`${file} must pass ${code} in the v2 equivalent-import scorer`);
}

for (const fixture of expected.fixtures) {
  const response = await readJson(`ai-regressions/fixtures/${fixture.file}`);
  const testCase = corpus.cases.find(({ id }) => id === response.caseId);
  if (!testCase) {
    fail(`${fixture.file} references unknown case ${response.caseId}`);
    continue;
  }
  const result = scoreAiRegression(testCase, response, catalog);
  if (result.pass !== fixture.pass)
    fail(
      `${fixture.file} expected pass=${fixture.pass}, received ${result.pass}`,
    );
  const failedCodes = new Set(
    result.checks.filter(({ pass }) => !pass).map(({ code }) => code),
  );
  for (const code of fixture.mustFail)
    if (!failedCodes.has(code))
      fail(`${fixture.file} no longer proves failure ${code}`);
}

if (failures.length) {
  console.error(
    '[check-ai-regressions] Deterministic AI regression foundation drifted:\n',
  );
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `[check-ai-regressions] OK — ${corpus.cases.length} neutral tasks, ${conditions.conditions.length} contexts, and ${expected.fixtures.length} scorer fixtures are synchronized.`,
  );
}

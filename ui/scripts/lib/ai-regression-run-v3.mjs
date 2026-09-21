import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, normalize, resolve, sep } from 'node:path';
import process from 'node:process';

import {
  summarizeAiRegressionCaseV3,
  validateAiRegressionEvidenceV3,
  validateAiRegressionResponseV3,
} from './ai-regression-contract-v3.mjs';
import { validateJsonSchemaSubset } from './json-schema-subset.mjs';

const CONDITIONS = {
  'guidance-only': [],
  'guidance-static': ['static', 'compile'],
  'guidance-static-browser': ['static', 'compile', 'browser'],
};

export function canonicalizeAiRegressionValue(value) {
  if (Array.isArray(value)) return value.map(canonicalizeAiRegressionValue);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeAiRegressionValue(value[key])]),
    );
  return value;
}

export function canonicalAiRegressionJson(value) {
  return `${JSON.stringify(canonicalizeAiRegressionValue(value), null, 2)}\n`;
}

export function sha256AiRegression(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeAiRegressionReport(value) {
  if (Array.isArray(value)) return value.map(normalizeAiRegressionReport);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === 'recordedAt' || key === 'startedAt'
        ? '<normalized-timestamp>'
        : normalizeAiRegressionReport(child),
    ]),
  );
}

export function isSafeAiRegressionArtifactPath(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) return false;
  const normalized = normalize(path);
  return (
    normalized !== '..' &&
    !normalized.startsWith(`..${sep}`) &&
    !normalized.split(sep).includes('..')
  );
}

export async function readAiRegressionArtifact(root, path) {
  if (!isSafeAiRegressionArtifactPath(path))
    throw new Error(`Unsafe AI regression artifact path: ${path}`);
  const rootReal = await realpath(root);
  const target = resolve(rootReal, path);
  const targetReal = await realpath(target);
  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${sep}`))
    throw new Error(`AI regression artifact escapes its root: ${path}`);
  if ((await lstat(target)).isSymbolicLink())
    throw new Error(`AI regression artifact cannot be a symlink: ${path}`);
  return readFile(target, 'utf8');
}

export function createAiRegressionToolOptionsV3({
  compatibility,
  url,
  signal,
  recordedAt,
}) {
  if (!url) throw new Error('Suite-v3 browser evaluation requires a URL.');
  return {
    doctor: {
      mode: 'full',
      cache: false,
      signal,
      config: {
        schemaVersion: 1,
        cache: false,
        stages: { browser: false },
      },
    },
    evaluator: {
      url,
      contexts: compatibility.browserContexts.map((context) => ({
        ...context,
      })),
      recordedAt,
      signal,
    },
  };
}

function summarizeEvidence(contract, caseDefinition, evidence) {
  const summary = summarizeAiRegressionCaseV3(
    contract,
    caseDefinition,
    evidence,
  );
  const hardRecords = evidence
    .filter(({ stage }) => stage !== 'human-visual')
    .flatMap(({ records }) => records)
    .filter(({ outcome }) => outcome !== 'not-applicable');
  const assertions = evidence.flatMap(
    ({ browserAssertions = [] }) => browserAssertions,
  );
  const residualDiagnostics = hardRecords
    .filter(({ outcome }) => outcome !== 'pass')
    .map(({ code }) => code)
    .concat(
      assertions
        .filter(({ outcome }) => outcome !== 'pass')
        .map(({ id }) => `browser.assertion:${id}`),
    );
  const adjudicated = hardRecords.filter(({ adjudication }) =>
    ['true-positive', 'false-positive', 'disputed'].includes(adjudication),
  );
  return {
    errors: summary.errors,
    clean: summary.errors.length === 0 && summary.hardPass,
    residualDiagnostics: [...new Set(residualDiagnostics)].sort(),
    falsePositives: adjudicated.filter(
      ({ adjudication }) => adjudication === 'false-positive',
    ).length,
    adjudicatedFindings: adjudicated.length,
    runtimeMs: evidence.reduce(
      (total, item) => total + (item.durationMs ?? 0),
      0,
    ),
  };
}

export async function loadAiRegressionV3Context(root) {
  const paths = {
    suite: 'ai-regressions/suite-v3.json',
    compatibility: 'ai-regressions/compatibility-v3.json',
    diagnosticRegistry: 'ai/application-ui-diagnostic-ids-v1.json',
    conditions: 'ai-regressions/conditions-v3.json',
    contract: 'ai-regressions/quality-contract-v3.json',
    corpus: 'ai-regressions/corpus-v3.json',
    requestSchema: 'ai-regressions/request-v3.schema.json',
    responseSchema: 'ai-regressions/response-v3.schema.json',
    evidenceSchema: 'ai-regressions/evidence-v3.schema.json',
    runSchema: 'ai-regressions/run-v3.schema.json',
  };
  const entries = await Promise.all(
    Object.entries(paths).map(async ([id, path]) => {
      const text = await readFile(resolve(root, path), 'utf8');
      return [id, { text, value: JSON.parse(text) }];
    }),
  );
  const loaded = Object.fromEntries(entries);
  return {
    conditions: loaded.conditions.value,
    compatibility: loaded.compatibility.value,
    contract: loaded.contract.value,
    corpus: loaded.corpus.value,
    schemas: {
      request: loaded.requestSchema.value,
      response: loaded.responseSchema.value,
      evidence: loaded.evidenceSchema.value,
      run: loaded.runSchema.value,
    },
    expectedDigests: {
      suiteSha256: sha256AiRegression(loaded.suite.text),
      compatibilitySha256: sha256AiRegression(loaded.compatibility.text),
      diagnosticRegistrySha256: sha256AiRegression(
        loaded.diagnosticRegistry.text,
      ),
    },
  };
}

export async function detectAiRegressionEnvironment(root, overrides = {}) {
  const readPackageVersion = async (path) =>
    JSON.parse(await readFile(resolve(root, path), 'utf8')).version;
  const [typescript, playwright, lockfile, browserRegistry] = await Promise.all(
    [
      readPackageVersion('node_modules/typescript/package.json'),
      readPackageVersion('node_modules/playwright/package.json'),
      readFile(resolve(root, '../package-lock.json')),
      readFile(
        resolve(root, 'node_modules/playwright-core/browsers.json'),
        'utf8',
      )
        .then(JSON.parse)
        .catch(() => ({ browsers: [] })),
    ],
  );
  const detectedBrowsers = Object.fromEntries(
    browserRegistry.browsers
      .filter(({ name }) => ['chromium', 'firefox', 'webkit'].includes(name))
      .map(({ name, browserVersion, revision }) => [
        name,
        browserVersion ?? `revision-${revision}`,
      ]),
  );
  return {
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    typescript,
    playwright,
    browsers: overrides.browsers ?? detectedBrowsers,
    lockfileSha256: sha256AiRegression(lockfile),
    ...overrides,
  };
}

export function calculateAiRegressionRunV3Metrics(results) {
  const residualDiagnostics = {};
  for (const { metrics } of results)
    for (const code of metrics.residualDiagnostics)
      residualDiagnostics[code] = (residualDiagnostics[code] ?? 0) + 1;
  const tokenValues = results.map(({ metrics }) => metrics.totalTokens);
  const runtimeByStageMs = {
    provider: 0,
    static: 0,
    compile: 0,
    browser: 0,
    humanVisual: 0,
  };
  for (const { metrics } of results)
    for (const stage of Object.keys(runtimeByStageMs))
      runtimeByStageMs[stage] += metrics.runtimeByStageMs[stage];
  return {
    totalCells: results.length,
    firstPassSuccesses: results.filter(({ metrics }) => metrics.firstPass)
      .length,
    cleanCells: results.filter(({ metrics }) => metrics.clean).length,
    repairIterations: results.map(({ metrics }) => metrics.repairIterations),
    residualDiagnostics,
    falsePositives: results.reduce(
      (total, { metrics }) => total + metrics.falsePositives,
      0,
    ),
    adjudicatedFindings: results.reduce(
      (total, { metrics }) => total + metrics.adjudicatedFindings,
      0,
    ),
    runtimeMs: results.reduce(
      (total, { metrics }) => total + metrics.runtimeMs,
      0,
    ),
    runtimeByStageMs,
    totalTokens: tokenValues.some((value) => value === null)
      ? null
      : tokenValues.reduce((total, value) => total + value, 0),
    contextBytes: results.reduce(
      (total, { metrics }) => total + metrics.contextBytes,
      0,
    ),
  };
}

export function validateAiRegressionMeasuredCohortV3(runs, corpus, conditions) {
  const errors = [];
  if (!runs.length) return errors;
  const cellsByIdentity = new Map();
  for (const run of runs) {
    const identity = [
      run.executor.provider,
      run.executor.model,
      run.executor.modelVersion,
    ].join('/');
    const cells = cellsByIdentity.get(identity) ?? new Map();
    for (const result of run.results) {
      const key = `${result.caseId}/${result.condition}`;
      const replicates = cells.get(key) ?? new Set();
      if (replicates.has(result.replicate))
        errors.push(`${identity}/${key}/r${result.replicate} is duplicated`);
      replicates.add(result.replicate);
      cells.set(key, replicates);
    }
    cellsByIdentity.set(identity, cells);
  }
  if (cellsByIdentity.size < 2)
    errors.push('measured cohort requires two model/version identities');
  const expectedCells = corpus.cases.flatMap(({ id }) =>
    conditions.conditions.map(({ id: condition }) => `${id}/${condition}`),
  );
  for (const [identity, cells] of cellsByIdentity) {
    for (const cell of expectedCells) {
      const replicates = [...(cells.get(cell) ?? [])].sort();
      if (JSON.stringify(replicates) !== JSON.stringify([1, 2, 3]))
        errors.push(
          `${identity}/${cell} requires balanced replicates 1,2,3; received ${replicates.join(',') || 'none'}`,
        );
    }
    for (const cell of cells.keys())
      if (!expectedCells.includes(cell))
        errors.push(`${identity}/${cell} is outside the frozen corpus matrix`);
  }
  return errors;
}

export function validateAiRegressionRunV3(run, conditions, compatibility) {
  const errors = [];
  if (run?.schemaVersion !== 3) errors.push('run.schemaVersion must be 3');
  const policyById = new Map(
    conditions.conditions.map((condition) => [condition.id, condition]),
  );
  const sessions = new Set();
  const initialHashes = new Map();
  for (const result of run.results ?? []) {
    const label = `${result.caseId}/${result.condition}/r${result.replicate}`;
    const policy = policyById.get(result.condition);
    if (!policy) {
      errors.push(`${label} has an unknown condition`);
      continue;
    }
    if (sessions.has(result.sessionId))
      errors.push(`${label} reuses session ${result.sessionId}`);
    sessions.add(result.sessionId);
    const comparisonKey = `${result.caseId}/r${result.replicate}`;
    const existingHash = initialHashes.get(comparisonKey);
    if (existingHash && existingHash !== result.initialModelInputSha256)
      errors.push(
        `${comparisonKey} attempt-1 model inputs differ by condition`,
      );
    initialHashes.set(comparisonKey, result.initialModelInputSha256);
    if (result.attempts.length > conditions.maxAttempts)
      errors.push(`${label} exceeds maxAttempts`);
    if (result.condition === 'guidance-only' && result.attempts.length !== 1)
      errors.push(`${label} cannot have repair attempts`);
    result.attempts.forEach((attempt, index) => {
      if (attempt.ordinal !== index + 1)
        errors.push(`${label} has non-contiguous attempt ordinals`);
      if (attempt.sessionId !== result.sessionId)
        errors.push(`${label} changes session within its repair loop`);
      const allowed = new Set(policy.feedbackStages);
      if (attempt.ordinal === 1 && attempt.feedbackExposed.length)
        errors.push(`${label} exposes feedback on attempt 1`);
      if (
        attempt.feedbackExposed.some((stage) => !allowed.has(stage)) ||
        (attempt.ordinal > 1 && !attempt.feedbackExposed.length)
      )
        errors.push(`${label} exposes feedback outside its policy`);
      if (attempt.tooling.doctorCache !== false)
        errors.push(`${label} must disable the doctor cache`);
      if (attempt.tooling.doctorBrowser !== false)
        errors.push(
          `${label} must keep browser evaluation on the explicit evaluator path`,
        );
      if (attempt.tooling.browser.owner !== '@kerfjs/ui/evaluator')
        errors.push(`${label} must identify the browser evidence owner`);
      if (!attempt.tooling.browser.url)
        errors.push(`${label} must record an explicit browser URL`);
      if (!attempt.tooling.browser.signalForwarded)
        errors.push(`${label} must forward AbortSignal to browser evaluation`);
      const expectedContexts = compatibility.browserContexts.map(
        ({ id }) => id,
      );
      if (
        JSON.stringify(attempt.tooling.browser.contexts) !==
        JSON.stringify(expectedContexts)
      )
        errors.push(`${label} must use the pinned browser contexts`);
      for (const reference of [
        attempt.request,
        attempt.rawResponse,
        attempt.response,
        ...attempt.evidence,
      ])
        if (!isSafeAiRegressionArtifactPath(reference.path))
          errors.push(
            `${label} contains unsafe artifact path ${reference.path}`,
          );
    });
  }
  if (
    run.summary &&
    canonicalAiRegressionJson(run.summary) !==
      canonicalAiRegressionJson(calculateAiRegressionRunV3Metrics(run.results))
  )
    errors.push('run.summary does not match result metrics');
  for (const [id, expected] of Object.entries(CONDITIONS)) {
    const actual = policyById.get(id)?.feedbackStages;
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      errors.push(`${id} feedback stages do not match the v3 protocol`);
  }
  return errors;
}

function environmentMatches(recorded, current) {
  const engines = ['chromium', 'firefox', 'webkit'];
  return (
    current &&
    [
      'node',
      'platform',
      'arch',
      'typescript',
      'playwright',
      'lockfileSha256',
    ].every((key) => recorded[key] === current[key]) &&
    engines.every(
      (engine) => recorded.browsers?.[engine] && current.browsers?.[engine],
    ) &&
    JSON.stringify(recorded.browsers) === JSON.stringify(current.browsers)
  );
}

export async function replayAiRegressionRunV3(
  run,
  { context, readArtifact, environment },
) {
  const {
    conditions,
    compatibility,
    contract,
    corpus,
    schemas,
    expectedDigests,
  } = context;
  const errors = validateAiRegressionRunV3(run, conditions, compatibility);
  errors.push(
    ...validateJsonSchemaSubset(schemas.run, run).map(
      (error) => `run schema: ${error}`,
    ),
  );
  for (const [field, expected] of Object.entries(expectedDigests))
    if (run.harness[field] !== expected)
      errors.push(`run harness ${field} does not match the current contract`);
  const cases = new Map(corpus.cases.map((item) => [item.id, item]));
  const compatible = environmentMatches(run.harness.environment, environment);
  const loadReference = async (reference, kind) => {
    if (!reference || !isSafeAiRegressionArtifactPath(reference.path))
      return null;
    try {
      const bytes = await readArtifact(reference.path);
      if (sha256AiRegression(bytes) !== reference.sha256) {
        errors.push(`${reference.path} ${kind} hash mismatch`);
        return null;
      }
      return bytes;
    } catch (error) {
      errors.push(
        `${reference.path} ${kind} could not be read: ${error.message}`,
      );
      return null;
    }
  };
  const evidenceByResult = [];
  for (const result of run.results ?? []) {
    const attempts = [];
    for (const attempt of result.attempts) {
      let request;
      let response;
      const evidence = [];
      for (const [kind, reference] of [
        ['request', attempt.request],
        ['raw response', attempt.rawResponse],
        ['response', attempt.response],
        ...attempt.evidence.map((item) => ['evidence', item]),
      ]) {
        const bytes = await loadReference(reference, kind);
        if (bytes === null) continue;
        if (kind === 'request' || kind === 'response' || kind === 'evidence') {
          try {
            const parsed = JSON.parse(bytes);
            if (kind === 'request') request = parsed;
            else if (kind === 'response') response = parsed;
            else evidence.push(parsed);
          } catch {
            errors.push(`${reference.path} is not valid JSON`);
          }
        }
      }
      const label = `${result.caseId}/${result.condition}/a${attempt.ordinal}`;
      const caseDefinition = cases.get(result.caseId);
      if (!caseDefinition)
        errors.push(`${label} references an unknown corpus case`);
      if (request)
        errors.push(
          ...validateJsonSchemaSubset(schemas.request, request).map(
            (error) => `${label} request schema: ${error}`,
          ),
        );
      if (response) {
        errors.push(
          ...validateJsonSchemaSubset(schemas.response, response).map(
            (error) => `${label} response schema: ${error}`,
          ),
        );
        if (caseDefinition)
          errors.push(
            ...validateAiRegressionResponseV3(caseDefinition, response).map(
              (error) => `${label} response: ${error}`,
            ),
          );
      }
      if (
        request?.caseId !== result.caseId ||
        request?.condition !== result.condition ||
        request?.attempt !== attempt.ordinal
      )
        errors.push(`${label} request identity does not match its result cell`);
      const requestFeedback = new Set(
        request?.modelInput?.repair?.feedback?.map(({ stage }) => stage) ?? [],
      );
      if (
        JSON.stringify([...requestFeedback].sort()) !==
        JSON.stringify([...attempt.feedbackExposed].sort())
      )
        errors.push(
          `${label} request feedback does not match its exposure record`,
        );
      if (
        attempt.ordinal === 1 &&
        request?.modelInputSha256 !== result.initialModelInputSha256
      )
        errors.push(
          `${result.caseId}/${result.condition} request hash identity mismatch`,
        );
      if (
        request?.modelInput &&
        sha256AiRegression(canonicalAiRegressionJson(request.modelInput)) !==
          request.modelInputSha256
      )
        errors.push(
          `${result.caseId}/${result.condition} model input digest mismatch`,
        );
      const stages = new Set();
      for (const item of evidence) {
        errors.push(
          ...validateJsonSchemaSubset(schemas.evidence, item).map(
            (error) => `${label} evidence schema: ${error}`,
          ),
          ...validateAiRegressionEvidenceV3(contract, item).map(
            (error) => `${label} evidence: ${error}`,
          ),
        );
        if (
          item.caseId !== result.caseId ||
          item.condition !== result.condition ||
          item.attempt !== attempt.ordinal ||
          item.requestSha256 !== attempt.request.sha256 ||
          item.responseSha256 !== attempt.response.sha256
        )
          errors.push(`${label} evidence identity does not match its attempt`);
        if (stages.has(item.stage))
          errors.push(`${label} contains duplicate ${item.stage} evidence`);
        stages.add(item.stage);
        const rawReport = await loadReference(item.rawReport, 'raw report');
        const normalizedReport = await loadReference(
          item.normalizedReport,
          'normalized report',
        );
        if (rawReport !== null && normalizedReport !== null) {
          try {
            const expected = canonicalAiRegressionJson(
              normalizeAiRegressionReport(JSON.parse(rawReport)),
            );
            const actual = canonicalAiRegressionJson(
              normalizeAiRegressionReport(JSON.parse(normalizedReport)),
            );
            if (actual !== expected)
              errors.push(`${label} normalized report does not replay`);
          } catch {
            errors.push(`${label} source reports must be JSON`);
          }
        }
        if (item.stage !== 'browser' || compatible)
          for (const artifact of item.artifacts ?? [])
            await loadReference(artifact, `${item.stage} artifact`);
      }
      for (const requiredStage of ['static', 'compile', 'browser'])
        if (!stages.has(requiredStage))
          errors.push(`${label} is missing ${requiredStage} evidence`);
      if (
        run.evidence === 'measured' &&
        attempt === result.attempts.at(-1) &&
        !stages.has('human-visual')
      )
        errors.push(
          `${label} measured terminal attempt lacks human visual evidence`,
        );
      if (caseDefinition) {
        const caseSummary = summarizeAiRegressionCaseV3(
          contract,
          caseDefinition,
          evidence,
        );
        errors.push(
          ...caseSummary.errors.map((error) => `${label} coverage: ${error}`),
        );
      }
      attempts.push(evidence);
    }
    evidenceByResult.push(attempts);
  }
  const rebuiltResults = run.results.map((result, resultIndex) => {
    const attemptEvidence = evidenceByResult[resultIndex];
    const caseDefinition = cases.get(result.caseId) ?? {
      id: result.caseId,
      requiredDiagnostics: [],
    };
    const first = summarizeEvidence(
      contract,
      caseDefinition,
      attemptEvidence[0],
    );
    const terminal = summarizeEvidence(
      contract,
      caseDefinition,
      attemptEvidence.at(-1),
    );
    const usage = result.attempts.map(({ usage }) => usage.totalTokens);
    return {
      ...result,
      metrics: {
        firstPass: first.clean,
        clean: terminal.clean,
        repairIterations: result.attempts.length - 1,
        residualDiagnostics: terminal.residualDiagnostics,
        falsePositives: terminal.falsePositives,
        adjudicatedFindings: terminal.adjudicatedFindings,
        runtimeMs:
          result.attempts.reduce(
            (total, attempt) => total + attempt.providerDurationMs,
            0,
          ) +
          attemptEvidence
            .flat()
            .reduce((total, item) => total + item.durationMs, 0),
        runtimeByStageMs: {
          provider: result.attempts.reduce(
            (total, attempt) => total + attempt.providerDurationMs,
            0,
          ),
          static: attemptEvidence
            .flat()
            .filter(({ stage }) => stage === 'static')
            .reduce((total, item) => total + item.durationMs, 0),
          compile: attemptEvidence
            .flat()
            .filter(({ stage }) => stage === 'compile')
            .reduce((total, item) => total + item.durationMs, 0),
          browser: attemptEvidence
            .flat()
            .filter(({ stage }) => stage === 'browser')
            .reduce((total, item) => total + item.durationMs, 0),
          humanVisual: attemptEvidence
            .flat()
            .filter(({ stage }) => stage === 'human-visual')
            .reduce((total, item) => total + item.durationMs, 0),
        },
        totalTokens: usage.some((value) => value === null)
          ? null
          : usage.reduce((total, value) => total + value, 0),
        contextBytes: result.attempts.reduce(
          (total, attempt) => total + attempt.contextBytes,
          0,
        ),
      },
    };
  });
  const rebuilt = {
    ...run,
    results: rebuiltResults,
    summary: calculateAiRegressionRunV3Metrics(rebuiltResults),
  };
  if (
    canonicalAiRegressionJson(rebuilt.summary) !==
    canonicalAiRegressionJson(run.summary)
  )
    errors.push('saved metrics do not replay from evidence');
  return {
    status: errors.length
      ? 'invalid'
      : compatible
        ? 'replayed'
        : 'incompatible-environment',
    errors,
    browserArtifactsCompared: compatible,
    run: rebuilt,
  };
}

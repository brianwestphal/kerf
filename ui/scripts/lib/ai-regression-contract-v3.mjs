const stagePrefix = {
  static: 'static.',
  compile: 'compile.',
  browser: 'browser.',
  'human-visual': 'visual.',
};

export function validateAiRegressionResponseV3(caseDefinition, response) {
  const errors = [];
  if (response?.caseId !== caseDefinition.id)
    errors.push(`response.caseId must be ${caseDefinition.id}`);
  if (
    !response?.files ||
    typeof response.files !== 'object' ||
    Array.isArray(response.files) ||
    Object.keys(response.files).length === 0
  ) {
    errors.push('response.files must not be empty');
    return errors;
  }
  for (const [path, content] of Object.entries(response.files)) {
    if (!caseDefinition.editableFiles.includes(path))
      errors.push(`${path} is not editable in ${caseDefinition.id}`);
    if (typeof content !== 'string' || content.length === 0)
      errors.push(`${path} must contain the complete changed file`);
  }
  return errors;
}

export function validateAiRegressionEvidenceV3(contract, evidence) {
  const errors = [];
  const diagnostics = new Map(
    contract.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic]),
  );
  if (evidence.schemaVersion !== 3)
    errors.push('evidence.schemaVersion must be 3');
  if (evidence.suiteId !== 'kerf-ui-authoring-v3')
    errors.push('evidence.suiteId must be kerf-ui-authoring-v3');
  if (!stagePrefix[evidence.stage]) errors.push('evidence.stage is unknown');
  if (!Array.isArray(evidence.records) || evidence.records.length === 0)
    errors.push('evidence.records must not be empty');
  if (!Number.isInteger(evidence.attempt) || evidence.attempt < 1)
    errors.push('evidence.attempt must be a positive integer');
  if (!evidence.sourceTool?.name)
    errors.push('evidence.sourceTool must identify its producer');
  const seen = new Set();
  for (const record of evidence.records ?? []) {
    if (seen.has(record.code))
      errors.push(`duplicate diagnostic ${record.code}`);
    seen.add(record.code);
    const diagnostic = diagnostics.get(record.code);
    if (!diagnostic) {
      errors.push(`unknown diagnostic ${record.code}`);
      continue;
    }
    if (!Array.isArray(record.diagnosticIds))
      errors.push(`${record.code} must record source diagnostic ids`);
    if (
      ['true-positive', 'false-positive', 'disputed'].includes(
        record.adjudication,
      ) &&
      (!record.adjudicator || !record.rationale)
    )
      errors.push(
        `${record.code} adjudication requires reviewer and rationale`,
      );
    if (diagnostic.stage !== evidence.stage)
      errors.push(
        `${record.code} belongs to ${diagnostic.stage}, not ${evidence.stage}`,
      );
    if (!record.code.startsWith(stagePrefix[evidence.stage] ?? '!'))
      errors.push(`${record.code} has the wrong stage prefix`);
    if (evidence.stage === 'human-visual') {
      if (record.outcome === 'pass' || record.outcome === 'fail') {
        if (
          typeof record.rating !== 'number' ||
          record.rating < 0 ||
          record.rating > 2
        )
          errors.push(`${record.code} must record a 0–2 rating`);
      } else if ('rating' in record) {
        errors.push(
          `${record.code} cannot rate an unrecorded or inapplicable check`,
        );
      }
    } else if ('rating' in record) {
      errors.push(`${record.code} cannot carry a visual rating`);
    }
  }
  if (evidence.stage === 'human-visual') {
    if (!evidence.reviewer?.trim())
      errors.push('human-visual evidence requires reviewer');
    if (
      !evidence.artifacts ||
      evidence.artifacts.length < contract.browserMatrix.length
    )
      errors.push(
        `human-visual evidence requires ${contract.browserMatrix.length} viewport screenshots`,
      );
    const expectedContexts = contract.browserMatrix.map(({ id }) => id).sort();
    const actualContexts = (evidence.artifacts ?? [])
      .map(({ context }) => context)
      .sort();
    if (JSON.stringify(actualContexts) !== JSON.stringify(expectedContexts))
      errors.push(
        'human-visual screenshots must map exactly once to wide, intermediate, narrow, and zoom-200',
      );
    if (
      new Set((evidence.artifacts ?? []).map(({ path }) => path)).size !==
        (evidence.artifacts ?? []).length ||
      new Set((evidence.artifacts ?? []).map(({ sha256 }) => sha256)).size !==
        (evidence.artifacts ?? []).length
    )
      errors.push('human-visual screenshots must have unique paths and hashes');
    const visualDiagnostics = contract.diagnostics.filter(
      ({ stage }) => stage === 'human-visual',
    );
    for (const { code } of visualDiagnostics) {
      const records = (evidence.records ?? []).filter(
        (record) => record.code === code,
      );
      if (records.length !== 1)
        errors.push(
          `human-visual evidence requires exactly one ${code} rating`,
        );
      const record = records[0];
      if (
        record &&
        (typeof record.rating !== 'number' || !record.rationale?.trim())
      )
        errors.push(`${code} requires a rating and written rationale`);
    }
    if (
      !(evidence.artifacts ?? []).every(({ path }) =>
        /\.(?:png|jpe?g|webp)$/i.test(path),
      )
    )
      errors.push('human-visual artifacts must be screenshots');
  } else if (evidence.reviewer) {
    errors.push(`${evidence.stage} evidence cannot name a human reviewer`);
  }
  if (
    evidence.stage === 'browser' &&
    (!Array.isArray(evidence.browserAssertions) ||
      evidence.browserAssertions.length === 0)
  )
    errors.push('browser evidence requires case-specific assertions');
  return errors;
}

export function summarizeAiRegressionEvidenceV3(contract, evidenceRecords) {
  const diagnostics = new Map(
    contract.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic]),
  );
  const hard = [];
  const ratings = new Map();
  for (const evidence of evidenceRecords) {
    for (const record of evidence.records) {
      const diagnostic = diagnostics.get(record.code);
      if (!diagnostic || record.outcome === 'not-applicable') continue;
      if (diagnostic.kind === 'hard') hard.push(record.outcome === 'pass');
      if (diagnostic.kind === 'quality' && typeof record.rating === 'number') {
        const values = ratings.get(diagnostic.dimension) ?? [];
        values.push(record.rating);
        ratings.set(diagnostic.dimension, values);
      }
    }
  }
  const visualDimensions = Object.fromEntries(
    [...ratings].map(([dimension, values]) => [
      dimension,
      values.reduce((sum, value) => sum + value, 0) / values.length,
    ]),
  );
  const visualValues = Object.values(visualDimensions);
  const visualMean = visualValues.length
    ? visualValues.reduce((sum, value) => sum + value, 0) / visualValues.length
    : null;
  return {
    hardPass: hard.length > 0 && hard.every(Boolean),
    hardChecks: hard.length,
    visualMean,
    visualDimensions,
    visualPass:
      visualMean !== null &&
      visualMean >= contract.thresholds.visualMeanMinimum &&
      visualValues.every(
        (value) => value >= contract.thresholds.visualDimensionMinimum,
      ),
  };
}

export function summarizeAiRegressionCaseV3(
  contract,
  caseDefinition,
  evidenceRecords,
) {
  const errors = evidenceRecords.flatMap((evidence) =>
    validateAiRegressionEvidenceV3(contract, evidence),
  );
  const records = evidenceRecords.flatMap(({ records }) => records);
  for (const code of caseDefinition.requiredDiagnostics) {
    const matches = records.filter((record) => record.code === code);
    if (matches.length !== 1)
      errors.push(`${caseDefinition.id} requires exactly one ${code} record`);
  }
  for (const record of records)
    if (!caseDefinition.requiredDiagnostics.includes(record.code))
      errors.push(`${caseDefinition.id} does not require ${record.code}`);
  return {
    errors,
    ...summarizeAiRegressionEvidenceV3(contract, evidenceRecords),
  };
}

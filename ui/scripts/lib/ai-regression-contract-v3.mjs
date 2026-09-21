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
    if (!evidence.reviewer)
      errors.push('human-visual evidence requires reviewer');
    if (!evidence.artifacts?.length)
      errors.push('human-visual evidence requires screenshot artifacts');
  } else if (evidence.reviewer) {
    errors.push(`${evidence.stage} evidence cannot name a human reviewer`);
  }
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

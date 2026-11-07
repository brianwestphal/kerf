// The JSON-schema subset kerf's catalog schemas use, validated without a
// third-party dependency: `$ref` (local `#/` pointers), `allOf`, `anyOf`,
// `const`, `enum`, `type`, string `minLength`/`pattern`, number `minimum`,
// array `minItems`/`uniqueItems`/`items`, and object `required`/`properties`/
// `additionalProperties: false`. Each failure is reported at its exact JSON
// path.

function schemaReference(rootSchema, reference) {
  if (!reference.startsWith('#/'))
    throw new Error(`unsupported schema reference ${reference}`);
  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => value?.[part], rootSchema);
}

function schemaTypeMatches(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object')
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}

// `anyOf` passes when one alternative passes. A union of bare types (a prop
// condition's `equals`) names the types in its failure.
function validateAnyOf(value, alternatives, path, rootSchema, diagnostics) {
  const failures = alternatives.map((candidate) => {
    const candidateFailures = [];
    validateSchemaValue(value, candidate, path, rootSchema, candidateFailures);
    return candidateFailures;
  });
  if (!failures.every((candidateFailures) => candidateFailures.length)) return;
  const types = alternatives.every(
    (candidate) =>
      Object.keys(candidate).length === 1 && typeof candidate.type === 'string',
  )
    ? alternatives.map((candidate) => candidate.type)
    : null;
  diagnostics.push(
    types
      ? `${path}: expected ${types.join(' or ')}`
      : `${path}: does not match any allowed schema variant`,
  );
}

function validateString(value, rule, path, diagnostics) {
  if (rule.minLength !== undefined && value.length < rule.minLength)
    diagnostics.push(
      `${path}: expected at least ${rule.minLength} character(s)`,
    );
  if (rule.pattern && !new RegExp(rule.pattern).test(value))
    diagnostics.push(`${path}: must match ${rule.pattern}`);
}

function validateArray(value, rule, path, rootSchema, diagnostics) {
  if (rule.minItems !== undefined && value.length < rule.minItems)
    diagnostics.push(`${path}: expected at least ${rule.minItems} item(s)`);
  if (rule.uniqueItems) {
    const serialized = value.map((item) => JSON.stringify(item));
    if (new Set(serialized).size !== serialized.length)
      diagnostics.push(`${path}: expected unique items`);
  }
  if (rule.items)
    value.forEach((item, index) =>
      validateSchemaValue(
        item,
        rule.items,
        `${path}[${index}]`,
        rootSchema,
        diagnostics,
      ),
    );
}

function validateObject(value, rule, path, rootSchema, diagnostics) {
  for (const key of rule.required ?? [])
    if (!(key in value)) diagnostics.push(`${path}.${key}: is required`);
  const properties = rule.properties ?? {};
  for (const [key, item] of Object.entries(value)) {
    if (key in properties)
      validateSchemaValue(
        item,
        properties[key],
        `${path}.${key}`,
        rootSchema,
        diagnostics,
      );
    else if (rule.additionalProperties === false)
      diagnostics.push(`${path}.${key}: additional property is not allowed`);
  }
}

function validateSchemaValue(value, rule, path, rootSchema, diagnostics) {
  if (rule.$ref) {
    const referenced = schemaReference(rootSchema, rule.$ref);
    if (!referenced) {
      diagnostics.push(`${path}: schema reference ${rule.$ref} does not exist`);
      return;
    }
    validateSchemaValue(value, referenced, path, rootSchema, diagnostics);
    return;
  }
  if (rule.allOf)
    for (const candidate of rule.allOf)
      validateSchemaValue(value, candidate, path, rootSchema, diagnostics);
  if (rule.anyOf) {
    validateAnyOf(value, rule.anyOf, path, rootSchema, diagnostics);
    return;
  }
  if (rule.const !== undefined && value !== rule.const)
    diagnostics.push(`${path}: expected ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value))
    diagnostics.push(
      `${path}: expected one of ${rule.enum.map((item) => JSON.stringify(item)).join(', ')}`,
    );
  if (rule.type && !schemaTypeMatches(value, rule.type)) {
    diagnostics.push(`${path}: expected ${rule.type}`);
    return;
  }
  if (typeof value === 'string') validateString(value, rule, path, diagnostics);
  if (
    typeof value === 'number' &&
    rule.minimum !== undefined &&
    value < rule.minimum
  )
    diagnostics.push(`${path}: expected a value >= ${rule.minimum}`);
  if (Array.isArray(value))
    validateArray(value, rule, path, rootSchema, diagnostics);
  else if (value !== null && typeof value === 'object')
    validateObject(value, rule, path, rootSchema, diagnostics);
}

/** Validate `value` against `schema`; returns the diagnostics, each at `path`. */
export function validateDocumentAgainstSchema(value, schema, path) {
  const diagnostics = [];
  validateSchemaValue(value, schema, path, schema, diagnostics);
  return diagnostics;
}

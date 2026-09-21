function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function matchesType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object')
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number')
    return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

export function validateJsonSchemaSubset(schema, value) {
  const errors = [];
  const visit = (definition, current, path) => {
    if (definition.$ref) {
      if (!definition.$ref.startsWith('#/')) {
        errors.push(`${path}: unsupported external schema reference`);
        return;
      }
      const target = definition.$ref
        .slice(2)
        .split('/')
        .reduce(
          (node, part) =>
            node?.[part.replaceAll('~1', '/').replaceAll('~0', '~')],
          schema,
        );
      if (!target)
        errors.push(`${path}: unresolved schema reference ${definition.$ref}`);
      else visit(target, current, path);
      return;
    }
    const types = Array.isArray(definition.type)
      ? definition.type
      : definition.type
        ? [definition.type]
        : [];
    if (types.length && !types.some((type) => matchesType(current, type))) {
      errors.push(`${path}: expected ${types.join(' or ')}`);
      return;
    }
    if ('const' in definition && !equal(current, definition.const))
      errors.push(`${path}: must equal the schema constant`);
    if (
      definition.enum &&
      !definition.enum.some((item) => equal(item, current))
    )
      errors.push(`${path}: is not an allowed value`);
    if (typeof current === 'string') {
      if (
        definition.minLength !== undefined &&
        current.length < definition.minLength
      )
        errors.push(`${path}: is shorter than minLength`);
      if (definition.pattern && !new RegExp(definition.pattern).test(current))
        errors.push(`${path}: does not match the required pattern`);
      if (
        definition.format === 'date-time' &&
        Number.isNaN(Date.parse(current))
      )
        errors.push(`${path}: is not a date-time`);
    }
    if (typeof current === 'number') {
      if (definition.minimum !== undefined && current < definition.minimum)
        errors.push(`${path}: is below minimum`);
      if (definition.maximum !== undefined && current > definition.maximum)
        errors.push(`${path}: is above maximum`);
    }
    if (Array.isArray(current)) {
      if (
        definition.minItems !== undefined &&
        current.length < definition.minItems
      )
        errors.push(`${path}: has fewer than minItems`);
      if (
        definition.maxItems !== undefined &&
        current.length > definition.maxItems
      )
        errors.push(`${path}: has more than maxItems`);
      if (
        definition.uniqueItems &&
        new Set(current.map(JSON.stringify)).size !== current.length
      )
        errors.push(`${path}: items must be unique`);
      if (definition.items)
        current.forEach((item, index) =>
          visit(definition.items, item, `${path}[${index}]`),
        );
    }
    if (
      current !== null &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      for (const key of definition.required ?? [])
        if (!(key in current)) errors.push(`${path}.${key}: is required`);
      const properties = definition.properties ?? {};
      for (const [key, child] of Object.entries(current)) {
        if (properties[key]) visit(properties[key], child, `${path}.${key}`);
        else if (definition.additionalProperties === false)
          errors.push(`${path}.${key}: additional property is not allowed`);
        else if (
          definition.additionalProperties &&
          typeof definition.additionalProperties === 'object'
        )
          visit(definition.additionalProperties, child, `${path}.${key}`);
      }
      if (
        definition.minProperties !== undefined &&
        Object.keys(current).length < definition.minProperties
      )
        errors.push(`${path}: has fewer than minProperties`);
    }
    for (const child of definition.allOf ?? []) visit(child, current, path);
    if (definition.if) {
      const before = errors.length;
      visit(definition.if, current, path);
      const matched = errors.length === before;
      if (!matched) errors.splice(before);
      if (matched && definition.then) visit(definition.then, current, path);
      if (!matched && definition.else) visit(definition.else, current, path);
    }
    if (definition.not) {
      const before = errors.length;
      visit(definition.not, current, path);
      const matched = errors.length === before;
      errors.splice(before);
      if (matched) errors.push(`${path}: matches a forbidden schema`);
    }
  };
  visit(schema, value, '$');
  return errors;
}

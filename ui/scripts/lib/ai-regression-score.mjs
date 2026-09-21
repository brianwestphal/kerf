import ts from 'typescript';

const INSET_OWNERS = new Set([
  'kui-page-gutter',
  'kui-pane-body',
  'kui-surface-body',
  'kui-dialog-body',
]);

function addCheck(checks, code, pass, detail) {
  checks.push({ code, pass, detail });
}

function staticClasses(attribute) {
  if (!attribute.initializer) return [];
  if (ts.isStringLiteral(attribute.initializer))
    return attribute.initializer.text.split(/\s+/).filter(Boolean);
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    (ts.isStringLiteral(attribute.initializer.expression) ||
      ts.isNoSubstitutionTemplateLiteral(attribute.initializer.expression))
  ) {
    return attribute.initializer.expression.text.split(/\s+/).filter(Boolean);
  }
  return [];
}

function staticAttribute(node, name, file) {
  const attribute = node.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText(file) === name,
  );
  if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer)
    return null;
  if (ts.isStringLiteral(attribute.initializer))
    return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    (ts.isStringLiteral(attribute.initializer.expression) ||
      ts.isNoSubstitutionTemplateLiteral(attribute.initializer.expression))
  )
    return attribute.initializer.expression.text;
  return null;
}

function staticJsxText(node) {
  if (
    ts.isJsxText(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node)
  )
    return node.text;
  if (ts.isJsxExpression(node))
    return node.expression ? staticJsxText(node.expression) : '';
  if (ts.isJsxElement(node)) return node.children.map(staticJsxText).join('');
  if (ts.isParenthesizedExpression(node)) return staticJsxText(node.expression);
  return '';
}

function unwrapExpression(node) {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current))
  )
    current = current.expression;
  return current;
}

function objectPropertyName(property, file) {
  if (!property.name) return null;
  if (
    ts.isIdentifier(property.name) ||
    ts.isStringLiteral(property.name) ||
    ts.isNumericLiteral(property.name)
  )
    return property.name.text;
  return property.name.getText(file);
}

function objectProperty(node, name, file) {
  const expression = unwrapExpression(node);
  if (!expression || !ts.isObjectLiteralExpression(expression)) return null;
  return (
    expression.properties.find(
      (property) => objectPropertyName(property, file) === name,
    ) ?? null
  );
}

function propertyValue(property) {
  if (!property) return null;
  if (ts.isJsxAttribute(property)) return property.initializer;
  if (ts.isPropertyAssignment(property)) return property.initializer;
  return null;
}

function staticStringValue(property) {
  let value = propertyValue(property);
  if (value && ts.isJsxExpression(value)) value = value.expression;
  value = unwrapExpression(value);
  return value &&
    (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
    ? value.text
    : null;
}

function staticNumberValue(property) {
  let value = propertyValue(property);
  if (value && ts.isJsxExpression(value)) value = value.expression;
  value = unwrapExpression(value);
  let sign = 1;
  if (
    value &&
    ts.isPrefixUnaryExpression(value) &&
    (value.operator === ts.SyntaxKind.PlusToken ||
      value.operator === ts.SyntaxKind.MinusToken)
  ) {
    sign = value.operator === ts.SyntaxKind.MinusToken ? -1 : 1;
    value = unwrapExpression(value.operand);
  }
  if (!value || !ts.isNumericLiteral(value)) return null;
  return sign * Number(value.text);
}

function jsxAttribute(node, name, file) {
  return node.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText(file) === name,
  );
}

function hasJsxAncestor(node, tagName, file) {
  let current = node.parent;
  while (current) {
    if (
      ts.isJsxElement(current) &&
      current.openingElement.tagName.getText(file) === tagName
    )
      return true;
    current = current.parent;
  }
  return false;
}

function analyzeTypeScript(files) {
  const imports = new Set();
  const invoked = new Set();
  const tags = new Set();
  const classSets = [];
  const calls = new Map();
  const unnamedButtons = [];
  const syntaxErrors = [];
  let nativeButtons = 0;
  let nativeButtonsInNav = 0;
  let nativeSearchEditors = 0;
  const listHeaderCountViolations = {
    competingBadge: [],
    concatenatedLabel: [],
    invalidCount: [],
    missingCountLabel: [],
    numericBadge: [],
  };

  for (const [name, source] of Object.entries(files)) {
    if (!/\.[cm]?[jt]sx?$/.test(name)) continue;
    const file = ts.createSourceFile(
      name,
      source,
      ts.ScriptTarget.Latest,
      true,
      name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const bindings = new Map();
    syntaxErrors.push(
      ...file.parseDiagnostics.map(
        (diagnostic) =>
          `${name}:${file.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1}`,
      ),
    );
    for (const statement of file.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue;
      const specifier = statement.moduleSpecifier.text;
      imports.add(specifier);
      const clause = statement.importClause;
      if (clause?.name)
        bindings.set(clause.name.text, { imported: 'default', specifier });
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          bindings.set(element.name.text, {
            imported: element.propertyName?.text ?? element.name.text,
            specifier,
          });
        }
      }
    }

    function inspectListHeader(properties, location) {
      const count = properties('count');
      const countLabel = properties('countLabel');
      const badge = properties('badge');
      const label = staticStringValue(properties('label'));
      const literalCount = staticNumberValue(count);
      if (count && !countLabel)
        listHeaderCountViolations.missingCountLabel.push(location);
      if (count && badge)
        listHeaderCountViolations.competingBadge.push(location);
      if (
        literalCount !== null &&
        (!Number.isSafeInteger(literalCount) || literalCount < 0)
      ) {
        listHeaderCountViolations.invalidCount.push(location);
      }
      if (badge) {
        const badgeText = staticJsxText(propertyValue(badge)).trim();
        if (/^\d+(?:[.,]\d+)?$/.test(badgeText))
          listHeaderCountViolations.numericBadge.push(location);
      }
      if (label && /\(\s*\d+\s*\)\s*$/.test(label))
        listHeaderCountViolations.concatenatedLabel.push(location);
    }

    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const binding = bindings.get(node.expression.text);
        if (!binding) {
          ts.forEachChild(node, visit);
          return;
        }
        invoked.add(binding.imported);
        const captured =
          ts.isVariableDeclaration(node.parent) ||
          (ts.isBinaryExpression(node.parent) && node.parent.right === node);
        const key = `${binding.specifier}:${binding.imported}`;
        calls.set(key, (calls.get(key) ?? false) || captured);
        if (
          binding.imported === 'ListHeader' &&
          binding.specifier.startsWith('@kerfjs/ui') &&
          node.arguments[0]
        ) {
          const location = `${name}:${file.getLineAndCharacterOfPosition(node.pos).line + 1}`;
          inspectListHeader(
            (property) => objectProperty(node.arguments[0], property, file),
            location,
          );
        }
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(file);
        tags.add(tag);
        const binding = bindings.get(tag);
        if (/^[A-Z]/.test(tag) && binding) invoked.add(binding.imported);
        if (
          binding?.imported === 'ListHeader' &&
          binding.specifier.startsWith('@kerfjs/ui')
        ) {
          const location = `${name}:${file.getLineAndCharacterOfPosition(node.pos).line + 1}`;
          inspectListHeader(
            (property) => jsxAttribute(node, property, file),
            location,
          );
        }
        const classes = node.attributes.properties
          .filter(ts.isJsxAttribute)
          .filter((attribute) =>
            ['class', 'className'].includes(attribute.name.getText(file)),
          )
          .flatMap(staticClasses);
        if (classes.length) classSets.push(classes);

        if (tag === 'button') {
          nativeButtons += 1;
          if (hasJsxAncestor(node, 'nav', file)) nativeButtonsInNav += 1;
          const hasLabel = node.attributes.properties.some(
            (attribute) =>
              ts.isJsxAttribute(attribute) &&
              ['aria-label', 'aria-labelledby', 'title'].includes(
                attribute.name.getText(file),
              ),
          );
          const parent = node.parent;
          const hasContent =
            ts.isJsxElement(parent) &&
            parent.children.some(
              (child) =>
                (ts.isJsxText(child) && child.text.trim()) ||
                (ts.isJsxExpression(child) && child.expression),
            );
          if (!hasLabel && !hasContent)
            unnamedButtons.push(
              `${name}:${file.getLineAndCharacterOfPosition(node.pos).line + 1}`,
            );
        }
        if (
          (tag === 'input' &&
            staticAttribute(node, 'type', file) === 'search') ||
          staticAttribute(node, 'role', file) === 'searchbox' ||
          staticAttribute(node, 'contenteditable', file) === 'true' ||
          staticAttribute(node, 'contentEditable', file) === 'true'
        )
          nativeSearchEditors += 1;
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  return {
    imports,
    invoked,
    tags,
    classSets,
    calls,
    unnamedButtons,
    syntaxErrors,
    nativeButtons,
    nativeButtonsInNav,
    nativeSearchEditors,
    listHeaderCountViolations,
  };
}

function selectorCompounds(selector) {
  const compounds = [];
  let current = '';
  let parentheses = 0;
  let brackets = 0;
  const flush = () => {
    if (current) compounds.push(current);
    current = '';
  };
  for (const character of selector.trim()) {
    if (character === '(') parentheses += 1;
    else if (character === ')') parentheses = Math.max(0, parentheses - 1);
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets = Math.max(0, brackets - 1);
    if (
      parentheses === 0 &&
      brackets === 0 &&
      (character === '>' || /\s/.test(character))
    )
      flush();
    else current += character;
  }
  flush();
  return compounds;
}

function splitSelectorList(selectorList) {
  const selectors = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < selectorList.length; index += 1) {
    const character = selectorList[index];
    if (character === '(' || character === '[') depth += 1;
    else if (character === ')' || character === ']')
      depth = Math.max(0, depth - 1);
    else if (character === ',' && depth === 0) {
      selectors.push(selectorList.slice(start, index));
      start = index + 1;
    }
  }
  selectors.push(selectorList.slice(start));
  return selectors;
}

function isPublicClassTarget(compound, publicClasses) {
  const kuiClasses = [...compound.matchAll(/\.(kui-[\w-]+)/gi)].map(
    (match) => match[1],
  );
  if (
    kuiClasses.length === 0 ||
    kuiClasses.some((className) => !publicClasses.has(className))
  )
    return false;
  const structuralRemainder = compound
    .replace(/\[[^\]]*\]/g, '')
    .replace(/::?[\w-]+(?:\([^)]*\))?/g, '')
    .replace(/\.[\w-]+/g, '')
    .replace(/#[\w-]+/g, '');
  return structuralRemainder.length === 0 && !compound.includes('#');
}

function splitSiblingSegments(selector) {
  const segments = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (character === '(') parentheses += 1;
    else if (character === ')') parentheses = Math.max(0, parentheses - 1);
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets = Math.max(0, brackets - 1);
    else if (
      parentheses === 0 &&
      brackets === 0 &&
      (character === '+' || character === '~')
    ) {
      segments.push(selector.slice(start, index));
      start = index + 1;
    }
  }
  segments.push(selector.slice(start));
  return segments;
}

function reachesPrivateDescendant(selector, publicClasses) {
  let insideKerfDescendants = false;
  return splitSiblingSegments(selector).some((siblingSegment) => {
    const compounds = selectorCompounds(siblingSegment);
    if (
      insideKerfDescendants &&
      compounds.some(
        (compound) => !isPublicClassTarget(compound, publicClasses),
      )
    )
      return true;
    const firstKerf = compounds.findIndex((compound) =>
      /\.kui-[\w-]+/i.test(compound),
    );
    if (firstKerf < 0) return false;
    if (
      [...compounds[firstKerf].matchAll(/\.(kui-[\w-]+)/gi)].some(
        (match) => !publicClasses.has(match[1]),
      )
    )
      return true;
    const descendants = compounds.slice(firstKerf + 1);
    if (
      descendants.some(
        (compound) => !isPublicClassTarget(compound, publicClasses),
      )
    )
      return true;
    insideKerfDescendants ||= descendants.length > 0;
    return false;
  });
}

function functionalPseudoArguments(selector, name) {
  const argumentsList = [];
  const marker = `:${name.toLowerCase()}(`;
  const normalized = selector.toLowerCase();
  let searchFrom = 0;
  while (searchFrom < selector.length) {
    const start = normalized.indexOf(marker, searchFrom);
    if (start < 0) break;
    let depth = 1;
    let index = start + marker.length;
    for (; index < selector.length && depth > 0; index += 1) {
      if (selector[index] === '(') depth += 1;
      else if (selector[index] === ')') depth -= 1;
    }
    if (depth !== 0) return [...argumentsList, ''];
    argumentsList.push(selector.slice(start + marker.length, index - 1));
    searchFrom = index;
  }
  return argumentsList;
}

function hasPrivateRelationalTarget(selector, publicClasses) {
  return functionalPseudoArguments(selector, 'has').some((argument) => {
    if (/:not\s*\(/i.test(argument)) return true;
    let expanded = argument;
    let previous;
    do {
      previous = expanded;
      expanded = expanded.replace(/:(?:is|where|not)\(([^()]*)\)/gi, '$1');
    } while (expanded !== previous);
    return splitSelectorList(expanded).some((relativeSelector) => {
      const compounds = selectorCompounds(relativeSelector);
      return (
        compounds.length === 0 ||
        compounds.some(
          (compound) => !isPublicClassTarget(compound, publicClasses),
        )
      );
    });
  });
}

function analyzeCss(files, catalog, options) {
  const css = Object.entries(files)
    .filter(([name]) => name.endsWith('.css'))
    .map(([, source]) => source)
    .join('\n');
  const publicClasses = new Set(
    catalog.entries.flatMap((entry) => entry.publicClasses ?? []),
  );
  const privateSelectors = [];
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    for (const selector of splitSelectorList(match[1])
      .map((part) => part.trim())
      .filter(Boolean)) {
      const namespacedClassesArePublic = [
        ...selector.matchAll(/\.(kui-[\w-]+)/gi),
      ].every((classMatch) => publicClasses.has(classMatch[1]));
      const violatesBoundary = options?.legacyPublicBoundary
        ? /\.kui-[\w-]+\s+(?:\.[\w-]+|#[\w-]+|\[[^\]]+\]|[a-z][\w-]*)/i.test(
            selector,
          )
        : !namespacedClassesArePublic ||
          reachesPrivateDescendant(selector, publicClasses) ||
          hasPrivateRelationalTarget(selector, publicClasses);
      if (violatesBoundary) privateSelectors.push(selector);
    }
  }
  const hardcodedSpacing = [
    ...css.matchAll(
      /(?:margin|padding|gap|inset(?:-inline|-block)?)[^:]*:\s*([^;}]*\b(?:\d*\.\d+|[1-9]\d*)(?:px|rem)\b[^;}]*)/gi,
    ),
  ].map((match) => match[0].trim());
  return { privateSelectors, hardcodedSpacing };
}

function componentIsUsed(entry, analysis) {
  if (entry.customElement && analysis.tags.has(entry.customElement))
    return true;
  const primaryExport = (entry.publicExports ?? []).includes(entry.name)
    ? entry.name
    : entry.publicExports?.[0];
  return Boolean(primaryExport && analysis.invoked.has(primaryExport));
}

export function scoreAiRegression(
  caseDefinition,
  response,
  catalog,
  options = {},
) {
  const files =
    response?.files && typeof response.files === 'object' ? response.files : {};
  const source = Object.values(files).join('\n');
  const analysis = analyzeTypeScript(files);
  const css = analyzeCss(files, catalog, options);
  const entries = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  const checks = [];

  addCheck(
    checks,
    'source:parse',
    analysis.syntaxErrors.length === 0,
    analysis.syntaxErrors.length
      ? `syntax errors: ${analysis.syntaxErrors.join(', ')}`
      : 'TypeScript and TSX parse without syntax errors',
  );

  for (const specifier of caseDefinition.requiredImports) {
    addCheck(
      checks,
      `import:${specifier}`,
      analysis.imports.has(specifier),
      `imports ${specifier}`,
    );
  }
  for (const id of caseDefinition.requiredComponentIds) {
    const entry = entries.get(id);
    const used =
      entry && ((entry.publicExports?.length ?? 0) > 0 || entry.customElement)
        ? componentIsUsed(entry, analysis)
        : true;
    addCheck(
      checks,
      `component:${id}`,
      Boolean(used),
      `uses ${id} through an imported invocation, not a copied class name`,
    );
  }
  for (const id of caseDefinition.forbiddenComponentIds) {
    const entry = entries.get(id);
    addCheck(
      checks,
      `avoid:${id}`,
      !entry || !componentIsUsed(entry, analysis),
      `does not substitute ${id}`,
    );
  }
  for (const className of caseDefinition.requiredClasses) {
    addCheck(
      checks,
      `class:${className}`,
      analysis.classSets.some((classes) => classes.includes(className)),
      `uses semantic class ${className}`,
    );
  }
  for (const requirement of caseDefinition.requiredWiring) {
    const key = `${requirement.specifier}:${requirement.name}`;
    const called = analysis.calls.has(key);
    const captured = analysis.calls.get(key) === true;
    addCheck(
      checks,
      `wiring:${requirement.name}`,
      called && (!requirement.captured || captured),
      requirement.captured
        ? `calls ${requirement.name} from ${requirement.specifier} and retains its disposer/result`
        : `calls ${requirement.name} from ${requirement.specifier}`,
    );
  }
  for (const pattern of caseDefinition.forbiddenPatterns) {
    addCheck(
      checks,
      `duplicate:${pattern}`,
      !source.includes(pattern),
      `does not introduce ${pattern}`,
    );
  }
  if (caseDefinition.id === 'compact-exclusive-choice') {
    addCheck(
      checks,
      'duplicate:competing-native-options',
      analysis.nativeButtons < 3,
      `declares ${analysis.nativeButtons} native buttons alongside the package choice contract`,
    );
  }
  if (caseDefinition.id === 'navigation-sections') {
    addCheck(
      checks,
      'duplicate:navigation-native-row',
      analysis.nativeButtonsInNav === 0,
      `declares ${analysis.nativeButtonsInNav} native navigation buttons instead of ${options.legacyPublicBoundary ? 'MenuItem' : 'ListItem'} rows`,
    );
  }
  if (caseDefinition.id === 'tokenized-search') {
    addCheck(
      checks,
      'duplicate:search-editor',
      analysis.nativeSearchEditors === 0,
      `declares ${analysis.nativeSearchEditors} competing native search editors`,
    );
  }
  if (!options.legacyPublicBoundary) {
    const countViolations = analysis.listHeaderCountViolations;
    addCheck(
      checks,
      'a11y:list-header-count-label',
      countViolations.missingCountLabel.length === 0,
      countViolations.missingCountLabel.length
        ? `ListHeader count is missing countLabel at ${countViolations.missingCountLabel.join(', ')}`
        : 'every ListHeader count supplies its localized countLabel',
    );
    addCheck(
      checks,
      'duplicate:list-header-count-badge',
      countViolations.competingBadge.length === 0,
      countViolations.competingBadge.length
        ? `ListHeader mixes count and badge at ${countViolations.competingBadge.join(', ')}`
        : 'ListHeader count and legacy badge slots remain mutually exclusive',
    );
    addCheck(
      checks,
      'a11y:list-header-count-value',
      countViolations.invalidCount.length === 0,
      countViolations.invalidCount.length
        ? `ListHeader uses a statically invalid count at ${countViolations.invalidCount.join(', ')}`
        : 'statically known ListHeader counts are non-negative safe integers',
    );
    addCheck(
      checks,
      'duplicate:list-header-numeric-badge',
      countViolations.numericBadge.length === 0,
      countViolations.numericBadge.length
        ? `ListHeader uses a numeric badge at ${countViolations.numericBadge.join(', ')}`
        : 'section quantities use ListHeader count rather than badge',
    );
    addCheck(
      checks,
      'duplicate:list-header-label-count',
      countViolations.concatenatedLabel.length === 0,
      countViolations.concatenatedLabel.length
        ? `ListHeader concatenates a count into label at ${countViolations.concatenatedLabel.join(', ')}`
        : 'ListHeader labels exclude parenthesized section counts',
    );
  }

  const scrollOwners = analysis.classSets.filter((classes) =>
    classes.includes('kui-scroll-owner'),
  ).length;
  addCheck(
    checks,
    'layout:scroll-owners',
    scrollOwners <= caseDefinition.maxScrollOwners,
    `declares ${scrollOwners}; maximum ${caseDefinition.maxScrollOwners}`,
  );
  const stackedOwners = analysis.classSets.filter(
    (classes) => classes.filter((name) => INSET_OWNERS.has(name)).length > 1,
  );
  addCheck(
    checks,
    'layout:single-inset-owner',
    stackedOwners.length === 0,
    'each element has at most one semantic inset owner',
  );
  addCheck(
    checks,
    'css:public-boundary',
    css.privateSelectors.length === 0,
    css.privateSelectors.length
      ? `private descendant selectors: ${css.privateSelectors.join(', ')}`
      : options.legacyPublicBoundary
        ? 'does not reach through a Kerf component root'
        : 'uses cataloged public classes and does not target private Kerf descendants',
  );
  addCheck(
    checks,
    'css:semantic-spacing',
    !caseDefinition.forbidHardcodedSpacing || css.hardcodedSpacing.length === 0,
    css.hardcodedSpacing.length
      ? `hard-coded spacing: ${css.hardcodedSpacing.join(', ')}`
      : 'uses semantic layout spacing rather than one-off lengths',
  );
  addCheck(
    checks,
    'a11y:named-buttons',
    analysis.unnamedButtons.length === 0,
    analysis.unnamedButtons.length
      ? `unnamed buttons: ${analysis.unnamedButtons.join(', ')}`
      : 'native buttons have text or an accessible name',
  );
  if (caseDefinition.requiresFollowUp) {
    addCheck(
      checks,
      'follow-up:missing-concept',
      Boolean(
        response.followUp?.suggested && response.followUp?.concept?.trim(),
      ),
      'recurring missing concepts are proposed upstream explicitly',
    );
  }

  const dimensions = {
    reuse: checks
      .filter((check) =>
        /^(?:import|component|avoid|duplicate):/.test(check.code),
      )
      .every((check) => check.pass),
    wiring: checks
      .filter((check) => check.code.startsWith('wiring:'))
      .every((check) => check.pass),
    layout: checks
      .filter((check) => /^(?:class|layout|css):/.test(check.code))
      .every((check) => check.pass),
    accessibility: checks
      .filter((check) => check.code.startsWith('a11y:'))
      .every((check) => check.pass),
    escalation: checks
      .filter((check) => check.code.startsWith('follow-up:'))
      .every((check) => check.pass),
  };
  return {
    caseId: caseDefinition.id,
    pass: checks.every((check) => check.pass),
    dimensions,
    checks,
  };
}

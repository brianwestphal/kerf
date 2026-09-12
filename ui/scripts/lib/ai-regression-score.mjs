import ts from 'typescript';

const INSET_OWNERS = new Set(['kui-page-gutter', 'kui-pane-body', 'kui-surface-body', 'kui-dialog-body']);

function addCheck(checks, code, pass, detail) {
  checks.push({ code, pass, detail });
}

function staticClasses(attribute) {
  if (!attribute.initializer) return [];
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text.split(/\s+/).filter(Boolean);
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression
      && (ts.isStringLiteral(attribute.initializer.expression) || ts.isNoSubstitutionTemplateLiteral(attribute.initializer.expression))) {
    return attribute.initializer.expression.text.split(/\s+/).filter(Boolean);
  }
  return [];
}

function staticAttribute(node, name, file) {
  const attribute = node.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.getText(file) === name);
  if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression
      && (ts.isStringLiteral(attribute.initializer.expression) || ts.isNoSubstitutionTemplateLiteral(attribute.initializer.expression))) return attribute.initializer.expression.text;
  return null;
}

function hasJsxAncestor(node, tagName, file) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) && current.openingElement.tagName.getText(file) === tagName) return true;
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

  for (const [name, source] of Object.entries(files)) {
    if (!/\.[cm]?[jt]sx?$/.test(name)) continue;
    const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const bindings = new Map();
    syntaxErrors.push(...file.parseDiagnostics.map((diagnostic) => `${name}:${file.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1}`));
    for (const statement of file.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      imports.add(specifier);
      const clause = statement.importClause;
      if (clause?.name) bindings.set(clause.name.text, { imported: 'default', specifier });
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          bindings.set(element.name.text, { imported: element.propertyName?.text ?? element.name.text, specifier });
        }
      }
    }

    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const binding = bindings.get(node.expression.text);
        if (!binding) { ts.forEachChild(node, visit); return; }
        invoked.add(binding.imported);
        const captured = ts.isVariableDeclaration(node.parent) || (ts.isBinaryExpression(node.parent) && node.parent.right === node);
        const key = `${binding.specifier}:${binding.imported}`;
        calls.set(key, (calls.get(key) ?? false) || captured);
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(file);
        tags.add(tag);
        const binding = bindings.get(tag);
        if (/^[A-Z]/.test(tag) && binding) invoked.add(binding.imported);
        const classes = node.attributes.properties
          .filter(ts.isJsxAttribute)
          .filter((attribute) => ['class', 'className'].includes(attribute.name.getText(file)))
          .flatMap(staticClasses);
        if (classes.length) classSets.push(classes);

        if (tag === 'button') {
          nativeButtons += 1;
          if (hasJsxAncestor(node, 'nav', file)) nativeButtonsInNav += 1;
          const hasLabel = node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute)
            && ['aria-label', 'aria-labelledby', 'title'].includes(attribute.name.getText(file)));
          const parent = node.parent;
          const hasContent = ts.isJsxElement(parent) && parent.children.some((child) =>
            (ts.isJsxText(child) && child.text.trim()) || (ts.isJsxExpression(child) && child.expression));
          if (!hasLabel && !hasContent) unnamedButtons.push(`${name}:${file.getLineAndCharacterOfPosition(node.pos).line + 1}`);
        }
        if ((tag === 'input' && staticAttribute(node, 'type', file) === 'search')
            || staticAttribute(node, 'role', file) === 'searchbox'
            || staticAttribute(node, 'contenteditable', file) === 'true'
            || staticAttribute(node, 'contentEditable', file) === 'true') nativeSearchEditors += 1;
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  return { imports, invoked, tags, classSets, calls, unnamedButtons, syntaxErrors, nativeButtons, nativeButtonsInNav, nativeSearchEditors };
}

function analyzeCss(files) {
  const css = Object.entries(files).filter(([name]) => name.endsWith('.css')).map(([, source]) => source).join('\n');
  const privateSelectors = [];
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (/\.kui-[\w-]+\s+(?:\.[\w-]+|#[\w-]+|\[[^\]]+\]|[a-z][\w-]*)/i.test(selector)) privateSelectors.push(selector);
  }
  const hardcodedSpacing = [...css.matchAll(/(?:margin|padding|gap|inset(?:-inline|-block)?)[^:]*:\s*([^;}]*\b(?:\d*\.\d+|[1-9]\d*)(?:px|rem)\b[^;}]*)/gi)].map((match) => match[0].trim());
  return { privateSelectors, hardcodedSpacing };
}

function componentIsUsed(entry, analysis) {
  if (entry.customElement && analysis.tags.has(entry.customElement)) return true;
  const primaryExport = (entry.publicExports ?? []).includes(entry.name) ? entry.name : entry.publicExports?.[0];
  return Boolean(primaryExport && analysis.invoked.has(primaryExport));
}

export function scoreAiRegression(caseDefinition, response, catalog) {
  const files = response?.files && typeof response.files === 'object' ? response.files : {};
  const source = Object.values(files).join('\n');
  const analysis = analyzeTypeScript(files);
  const css = analyzeCss(files);
  const entries = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  const checks = [];

  addCheck(checks, 'source:parse', analysis.syntaxErrors.length === 0, analysis.syntaxErrors.length
    ? `syntax errors: ${analysis.syntaxErrors.join(', ')}`
    : 'TypeScript and TSX parse without syntax errors');

  for (const specifier of caseDefinition.requiredImports) {
    addCheck(checks, `import:${specifier}`, analysis.imports.has(specifier), `imports ${specifier}`);
  }
  for (const id of caseDefinition.requiredComponentIds) {
    const entry = entries.get(id);
    const used = entry && ((entry.publicExports?.length ?? 0) > 0 || entry.customElement)
      ? componentIsUsed(entry, analysis)
      : true;
    addCheck(checks, `component:${id}`, Boolean(used), `uses ${id} through an imported invocation, not a copied class name`);
  }
  for (const id of caseDefinition.forbiddenComponentIds) {
    const entry = entries.get(id);
    addCheck(checks, `avoid:${id}`, !entry || !componentIsUsed(entry, analysis), `does not substitute ${id}`);
  }
  for (const className of caseDefinition.requiredClasses) {
    addCheck(checks, `class:${className}`, analysis.classSets.some((classes) => classes.includes(className)), `uses semantic class ${className}`);
  }
  for (const requirement of caseDefinition.requiredWiring) {
    const key = `${requirement.specifier}:${requirement.name}`;
    const called = analysis.calls.has(key);
    const captured = analysis.calls.get(key) === true;
    addCheck(checks, `wiring:${requirement.name}`, called && (!requirement.captured || captured), requirement.captured
      ? `calls ${requirement.name} from ${requirement.specifier} and retains its disposer/result`
      : `calls ${requirement.name} from ${requirement.specifier}`);
  }
  for (const pattern of caseDefinition.forbiddenPatterns) {
    addCheck(checks, `duplicate:${pattern}`, !source.includes(pattern), `does not introduce ${pattern}`);
  }
  if (caseDefinition.id === 'compact-exclusive-choice') {
    addCheck(checks, 'duplicate:competing-native-options', analysis.nativeButtons < 3, `declares ${analysis.nativeButtons} native buttons alongside the package choice contract`);
  }
  if (caseDefinition.id === 'navigation-sections') {
    addCheck(checks, 'duplicate:navigation-native-row', analysis.nativeButtonsInNav === 0, `declares ${analysis.nativeButtonsInNav} native navigation buttons instead of MenuItem rows`);
  }
  if (caseDefinition.id === 'tokenized-search') {
    addCheck(checks, 'duplicate:search-editor', analysis.nativeSearchEditors === 0, `declares ${analysis.nativeSearchEditors} competing native search editors`);
  }

  const scrollOwners = analysis.classSets.filter((classes) => classes.includes('kui-scroll-owner')).length;
  addCheck(checks, 'layout:scroll-owners', scrollOwners <= caseDefinition.maxScrollOwners, `declares ${scrollOwners}; maximum ${caseDefinition.maxScrollOwners}`);
  const stackedOwners = analysis.classSets.filter((classes) => classes.filter((name) => INSET_OWNERS.has(name)).length > 1);
  addCheck(checks, 'layout:single-inset-owner', stackedOwners.length === 0, 'each element has at most one semantic inset owner');
  addCheck(checks, 'css:public-boundary', css.privateSelectors.length === 0, css.privateSelectors.length
    ? `private descendant selectors: ${css.privateSelectors.join(', ')}`
    : 'does not reach through a Kerf component root');
  addCheck(checks, 'css:semantic-spacing', !caseDefinition.forbidHardcodedSpacing || css.hardcodedSpacing.length === 0, css.hardcodedSpacing.length
    ? `hard-coded spacing: ${css.hardcodedSpacing.join(', ')}`
    : 'uses semantic layout spacing rather than one-off lengths');
  addCheck(checks, 'a11y:named-buttons', analysis.unnamedButtons.length === 0, analysis.unnamedButtons.length
    ? `unnamed buttons: ${analysis.unnamedButtons.join(', ')}`
    : 'native buttons have text or an accessible name');
  if (caseDefinition.requiresFollowUp) {
    addCheck(checks, 'follow-up:missing-concept', Boolean(response.followUp?.suggested && response.followUp?.concept?.trim()), 'recurring missing concepts are proposed upstream explicitly');
  }

  const dimensions = {
    reuse: checks.filter((check) => /^(?:import|component|avoid|duplicate):/.test(check.code)).every((check) => check.pass),
    wiring: checks.filter((check) => check.code.startsWith('wiring:')).every((check) => check.pass),
    layout: checks.filter((check) => /^(?:class|layout|css):/.test(check.code)).every((check) => check.pass),
    accessibility: checks.filter((check) => check.code.startsWith('a11y:')).every((check) => check.pass),
    escalation: checks.filter((check) => check.code.startsWith('follow-up:')).every((check) => check.pass),
  };
  return { caseId: caseDefinition.id, pass: checks.every((check) => check.pass), dimensions, checks };
}

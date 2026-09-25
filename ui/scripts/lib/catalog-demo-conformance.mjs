import { dirname, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

export const catalogDemoConformanceRules = Object.freeze({
  parseError: 'catalog-demo/parse-error',
  publicImports: 'catalog-demo/public-imports',
  localStylesheet: 'catalog-demo/local-stylesheet',
  inlineStyle: 'catalog-demo/inline-style',
  textFragmentProp: 'catalog-demo/text-fragment-prop',
  customStyleClass: 'catalog-demo/custom-style-class',
  focusedHelpers: 'catalog-demo/focused-public-helpers',
  focusedMetadata: 'catalog-demo/focused-root-metadata',
  rootAttributes: 'catalog-demo/root-attributes',
  privateMarkup: 'catalog-demo/private-catalog-markup',
  emptyExample: 'catalog-demo/empty-example',
  compositionSkip: 'catalog-demo/composition-overlay-skip',
  shellOverlay: 'catalog-demo/component-only-overlay',
  shellMode: 'catalog-demo/documented-demo-mode',
  exceptionInvalid: 'catalog-demo/invalid-exception',
  exceptionStale: 'catalog-demo/stale-exception',
});

const waivableRules = new Set([
  catalogDemoConformanceRules.focusedHelpers,
  catalogDemoConformanceRules.focusedMetadata,
  catalogDemoConformanceRules.rootAttributes,
]);

function sourceFile(filePath, source) {
  return ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

function location(file, node) {
  const point = file.getLineAndCharacterOfPosition(node.getStart(file));
  return { line: point.line + 1, column: point.character + 1 };
}

function diagnostic(rule, route, filePath, message, file, node = file) {
  return { rule, route, file: filePath, message, ...location(file, node) };
}

function jsxTagName(node, file) {
  return node.tagName.getText(file);
}

function openingElement(node) {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return undefined;
}

function jsxAttribute(opening, name) {
  return opening.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

function propertyName(node) {
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node)
  )
    return node.text;
  return undefined;
}

function staticText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  return undefined;
}

function rootAttributeValue(opening, metadataName) {
  const attribute = jsxAttribute(opening, 'rootAttributes');
  if (
    !attribute?.initializer ||
    !ts.isJsxExpression(attribute.initializer) ||
    !attribute.initializer.expression ||
    !ts.isObjectLiteralExpression(attribute.initializer.expression)
  )
    return undefined;
  for (const property of attribute.initializer.expression.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      propertyName(property.name) === metadataName
    )
      return staticText(property.initializer);
  }
  return undefined;
}

function hasDynamicEntryId(opening, metadataName) {
  const attribute = jsxAttribute(opening, 'rootAttributes');
  if (
    !attribute?.initializer ||
    !ts.isJsxExpression(attribute.initializer) ||
    !attribute.initializer.expression ||
    !ts.isObjectLiteralExpression(attribute.initializer.expression)
  )
    return false;
  return attribute.initializer.expression.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      propertyName(property.name) === metadataName &&
      ts.isPropertyAccessExpression(property.initializer) &&
      property.initializer.name.text === 'id',
  );
}

function collectStaticStrings(node) {
  const values = [];
  const visit = (child) => {
    const value = staticText(child);
    if (value !== undefined) values.push(value);
    ts.forEachChild(child, visit);
  };
  visit(node);
  return values;
}

function packageExported(specifier, exports) {
  const subpath =
    specifier === '@kerfjs/ui'
      ? '.'
      : `.${specifier.slice('@kerfjs/ui'.length)}`;
  return [...exports].some(
    (candidate) =>
      candidate === subpath ||
      (candidate.endsWith('*') && subpath.startsWith(candidate.slice(0, -1))),
  );
}

function isInside(path, directory) {
  const pathFromDirectory = relative(directory, path);
  return (
    pathFromDirectory !== '..' &&
    !pathFromDirectory.startsWith(`..${sep}`) &&
    !pathFromDirectory.startsWith(sep)
  );
}

function isMeaningfulExampleChild(child) {
  if (ts.isJsxText(child)) return child.text.trim().length > 0;
  if (ts.isJsxExpression(child)) return child.expression !== undefined;
  return true;
}

export function analyzeCatalogDemoSource({
  route,
  kind,
  filePath,
  absoluteFilePath = filePath,
  source,
  uiRoot,
  packageExports = new Set(),
}) {
  const file = sourceFile(filePath, source);
  const diagnostics = file.parseDiagnostics.map((problem) =>
    diagnostic(
      catalogDemoConformanceRules.parseError,
      route,
      filePath,
      ts.flattenDiagnosticMessageText(problem.messageText, ' '),
      file,
      problem.start === undefined
        ? file
        : ts.getTokenAtPosition(file, problem.start),
    ),
  );
  const catalogImports = new Map();
  const helperElements = { stacks: [], examples: [] };
  const directMetadata = [];
  let hasSkipMetadata = false;

  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith('@kerfjs/ui')) {
      if (
        specifier.includes('/src/') ||
        !packageExported(specifier, packageExports)
      )
        diagnostics.push(
          diagnostic(
            catalogDemoConformanceRules.publicImports,
            route,
            filePath,
            `Import ${specifier} is not a public @kerfjs/ui package export.`,
            file,
            statement.moduleSpecifier,
          ),
        );
    } else if (specifier.startsWith('.')) {
      if (/\.css(?:\?|$)/i.test(specifier))
        diagnostics.push(
          diagnostic(
            catalogDemoConformanceRules.localStylesheet,
            route,
            filePath,
            `Focused demos must use component configuration instead of local stylesheet ${specifier}.`,
            file,
            statement.moduleSpecifier,
          ),
        );
      const target = resolve(dirname(absoluteFilePath), specifier);
      if (isInside(target, resolve(uiRoot, 'src')))
        diagnostics.push(
          diagnostic(
            catalogDemoConformanceRules.publicImports,
            route,
            filePath,
            `Import ${specifier} reaches into ui/src instead of a public production API.`,
            file,
            statement.moduleSpecifier,
          ),
        );
    }
    if (
      specifier === '@kerfjs/ui/catalog' &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    )
      for (const element of statement.importClause.namedBindings.elements)
        catalogImports.set(
          element.name.text,
          element.propertyName?.text ?? element.name.text,
        );
  }

  const visit = (node) => {
    const opening = openingElement(node);
    if (opening) {
      const name = jsxTagName(opening, file);
      const imported = catalogImports.get(name);
      if (imported === 'CatalogExampleStack') helperElements.stacks.push(node);
      if (imported === 'CatalogExample') helperElements.examples.push(node);
      for (const property of opening.attributes.properties) {
        if (!ts.isJsxAttribute(property)) continue;
        const attributeName = property.name.getText(file);
        if (attributeName === 'style')
          diagnostics.push(
            diagnostic(
              catalogDemoConformanceRules.inlineStyle,
              route,
              filePath,
              'Focused demos must use component configuration instead of inline styles.',
              file,
              property,
            ),
          );
        // `note={<>Plain text.</>}` renders exactly like `note="Plain text."`;
        // the fragment only adds noise, so plain-text props stay strings.
        const fragment =
          property.initializer !== undefined &&
          ts.isJsxExpression(property.initializer)
            ? property.initializer.expression
            : undefined;
        if (
          fragment !== undefined &&
          ts.isJsxFragment(fragment) &&
          fragment.children.every((child) => ts.isJsxText(child))
        )
          diagnostics.push(
            diagnostic(
              catalogDemoConformanceRules.textFragmentProp,
              route,
              filePath,
              `Pass plain text to ${attributeName} as a string literal, not a JSX fragment.`,
              file,
              property,
            ),
          );
        if (
          ['data-demo', 'data-catalog-geometry-overlay-skip'].includes(
            attributeName,
          )
        )
          directMetadata.push(property);
        if (attributeName === 'data-catalog-geometry-overlay-skip')
          hasSkipMetadata = true;
        if (!['class', 'className'].includes(attributeName)) continue;
        const customStyleClass = collectStaticStrings(property).find((value) =>
          /\b(?:demo|wa-demo|token-search)-[a-z0-9_-]+\b/i.test(value),
        );
        if (customStyleClass)
          diagnostics.push(
            diagnostic(
              catalogDemoConformanceRules.customStyleClass,
              route,
              filePath,
              `Focused demos must use semantic metadata or component configuration instead of custom styling classes (${customStyleClass}).`,
              file,
              property,
            ),
          );
        const privateName = collectStaticStrings(property).find((value) =>
          /\bkui-catalog(?:-|__|--)[a-z0-9_-]+\b/i.test(value),
        );
        if (privateName)
          diagnostics.push(
            diagnostic(
              catalogDemoConformanceRules.privateMarkup,
              route,
              filePath,
              `Do not hand-author private Catalog structural class markup (${privateName}).`,
              file,
              property,
            ),
          );
      }
      if (
        imported === 'CatalogExample' &&
        ((ts.isJsxSelfClosingElement(node) && true) ||
          (ts.isJsxElement(node) &&
            !node.children.some(isMeaningfulExampleChild)))
      )
        diagnostics.push(
          diagnostic(
            catalogDemoConformanceRules.emptyExample,
            route,
            filePath,
            'CatalogExample must contain a specimen or an intentionally coupled specimen cluster.',
            file,
            node,
          ),
        );
      if (
        rootAttributeValue(opening, 'data-catalog-geometry-overlay-skip') !==
        undefined
      )
        hasSkipMetadata = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  if (kind === 'component' || kind === 'composition') {
    if (!helperElements.stacks.length || !helperElements.examples.length)
      diagnostics.push(
        diagnostic(
          catalogDemoConformanceRules.focusedHelpers,
          route,
          filePath,
          'Catalog component and composition routes must use CatalogExampleStack and CatalogExample from @kerfjs/ui/catalog.',
          file,
        ),
      );
    if (
      helperElements.stacks.length &&
      !helperElements.stacks.some(
        (node) =>
          rootAttributeValue(openingElement(node), 'data-demo') === route ||
          (route.startsWith('wa-') &&
            hasDynamicEntryId(openingElement(node), 'data-demo')),
      )
    )
      diagnostics.push(
        diagnostic(
          catalogDemoConformanceRules.focusedMetadata,
          route,
          filePath,
          `A CatalogExampleStack must publish data-demo=${route} through rootAttributes.`,
          file,
          helperElements.stacks[0],
        ),
      );
    if (directMetadata.length)
      diagnostics.push(
        diagnostic(
          catalogDemoConformanceRules.rootAttributes,
          route,
          filePath,
          'Catalog demo metadata must use CatalogExample or CatalogExampleStack rootAttributes.',
          file,
          directMetadata[0],
        ),
      );
  }
  if (kind === 'composition' && hasSkipMetadata)
    diagnostics.push(
      diagnostic(
        catalogDemoConformanceRules.compositionSkip,
        route,
        filePath,
        'Composition routes already disable the global geometry overlay and must not add specimen skip markers.',
        file,
      ),
    );

  return diagnostics;
}

function expressionContainsComparison(expression, property, value) {
  let found = false;
  const visit = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    ) {
      const pairs = [
        [node.left, node.right],
        [node.right, node.left],
      ];
      found ||= pairs.some(
        ([candidateProperty, candidateValue]) =>
          ts.isPropertyAccessExpression(candidateProperty) &&
          candidateProperty.name.text === property &&
          ts.isStringLiteral(candidateValue) &&
          candidateValue.text === value,
      );
    }
    if (!found) ts.forEachChild(node, visit);
  };
  visit(expression);
  return found;
}

export function analyzeCatalogShellSource({ filePath, source }) {
  const file = sourceFile(filePath, source);
  const diagnostics = [];
  let validOverlay = false;
  let validMode = false;
  const visit = (node) => {
    if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer)
    ) {
      const expression = node.initializer.expression;
      const name = node.name.getText(file);
      if (expression && name === 'geometryOverlay')
        validOverlay ||= expressionContainsComparison(
          expression,
          'kind',
          'component',
        );
      if (expression && name === 'data-demo-mode')
        validMode ||=
          expressionContainsComparison(expression, 'kind', 'component') &&
          collectStaticStrings(expression).includes('component') &&
          collectStaticStrings(expression).includes('composition');
    }
    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node.name) === 'data-demo-mode'
    ) {
      validMode ||=
        expressionContainsComparison(node.initializer, 'kind', 'component') &&
        collectStaticStrings(node.initializer).includes('component') &&
        collectStaticStrings(node.initializer).includes('composition');
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!validOverlay)
    diagnostics.push(
      diagnostic(
        catalogDemoConformanceRules.shellOverlay,
        '@catalog-shell',
        filePath,
        'Catalog geometryOverlay must be derived from component versus composition kind.',
        file,
      ),
    );
  if (!validMode)
    diagnostics.push(
      diagnostic(
        catalogDemoConformanceRules.shellMode,
        '@catalog-shell',
        filePath,
        'The demo stage must expose component versus composition mode from entry kind.',
        file,
      ),
    );
  return diagnostics;
}

function exceptionDiagnostic(rule, message) {
  return {
    rule,
    route: '@exceptions',
    file: 'ux-demo/catalog-conformance-exceptions.json',
    line: 1,
    column: 1,
    message,
  };
}

export function validateCatalogDemoExceptionManifest(manifest) {
  const keys =
    manifest && typeof manifest === 'object' ? Object.keys(manifest) : [];
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    manifest.schemaVersion !== 1 ||
    !Array.isArray(manifest.exceptions) ||
    keys.some(
      (key) => !['$schema', 'schemaVersion', 'exceptions'].includes(key),
    )
  )
    return [
      exceptionDiagnostic(
        catalogDemoConformanceRules.exceptionInvalid,
        'Exception manifest must have schemaVersion 1, an exceptions array, and no unknown root fields.',
      ),
    ];
  return [];
}

export function applyCatalogDemoExceptions(diagnostics, exceptions) {
  const remaining = [...diagnostics];
  const exceptionDiagnostics = [];
  const seen = new Set();
  for (const exception of Array.isArray(exceptions) ? exceptions : []) {
    if (!exception || typeof exception !== 'object') {
      exceptionDiagnostics.push(
        exceptionDiagnostic(
          catalogDemoConformanceRules.exceptionInvalid,
          'Every exception must be an object with route, file, rules, reason, and reviewedIn fields.',
        ),
      );
      continue;
    }
    const keys = Object.keys(exception);
    const rules = Array.isArray(exception.rules) ? exception.rules : [];
    const identity = `${exception.route}\0${exception.file}`;
    if (seen.has(identity)) {
      exceptionDiagnostics.push(
        exceptionDiagnostic(
          catalogDemoConformanceRules.exceptionInvalid,
          `Duplicate exception entry for ${exception.route} (${exception.file}).`,
        ),
      );
      continue;
    }
    seen.add(identity);
    if (
      typeof exception.route !== 'string' ||
      !exception.route ||
      typeof exception.file !== 'string' ||
      !/^ux-demo\/demos\/.+\.tsx$/.test(exception.file) ||
      typeof exception.reason !== 'string' ||
      exception.reason.trim().length < 20 ||
      typeof exception.reviewedIn !== 'string' ||
      !/^KF-[A-Z0-9]+$/.test(exception.reviewedIn) ||
      !rules.length ||
      new Set(rules).size !== rules.length ||
      keys.some(
        (key) =>
          !['route', 'file', 'rules', 'reason', 'reviewedIn'].includes(key),
      ) ||
      rules.some((rule) => !waivableRules.has(rule))
    ) {
      exceptionDiagnostics.push(
        exceptionDiagnostic(
          catalogDemoConformanceRules.exceptionInvalid,
          `Exception for ${exception.route || '<unknown>'} must name a file, a substantive reason, a KF-* review ticket, and only waivable rule ids.`,
        ),
      );
      continue;
    }
    for (const rule of rules) {
      const index = remaining.findIndex(
        (problem) =>
          problem.route === exception.route &&
          problem.file === exception.file &&
          problem.rule === rule,
      );
      if (index === -1)
        exceptionDiagnostics.push(
          exceptionDiagnostic(
            catalogDemoConformanceRules.exceptionStale,
            `Exception ${exception.route} / ${rule} no longer suppresses a diagnostic; remove or update it.`,
          ),
        );
      else remaining.splice(index, 1);
    }
  }
  return [...remaining, ...exceptionDiagnostics];
}

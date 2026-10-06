import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve } from 'node:path';

import postcss from 'postcss';
import ts from 'typescript';

import { loadApplicationUiProfile } from '../ai/application-ui-profile.mjs';
import { isUiTraversalExcluded } from '../traversal-exclusions.mjs';

const scriptExtensions = new Set(['.tsx', '.jsx']);
const kebab = (name) =>
  name
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
const componentName = (name) => /^[A-Z][A-Za-z0-9]*$/.test(name);
const classNames = (value) =>
  [...value.matchAll(/(?:^|\s)([a-z][a-z0-9_-]*)(?=\s|$)/g)].map(
    (match) => match[1],
  );
const block = (name) => name.split(/__|--/)[0];
const unknown = '\u0000';

function combinations(left, right) {
  if (left.length * right.length > 32) return [unknown];
  return left.flatMap((a) => right.map((b) => a + b));
}

function staticPatterns(node, bindings = new Map(), seen = new Set()) {
  if (!node) return [unknown];
  if (ts.isIdentifier(node) && bindings.has(node.text) && !seen.has(node.text))
    return staticPatterns(
      bindings.get(node.text),
      bindings,
      new Set([...seen, node.text]),
    );
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'join'
  ) {
    const target = node.expression.expression;
    const array = ts.isIdentifier(target) ? bindings.get(target.text) : target;
    if (array && ts.isArrayLiteralExpression(array)) {
      const separator =
        node.arguments[0] && ts.isStringLiteral(node.arguments[0])
          ? node.arguments[0].text
          : ',';
      let patterns = [''];
      for (const [index, element] of array.elements.entries())
        patterns = combinations(
          patterns,
          staticPatterns(element, bindings, seen).map(
            (part) => `${index ? separator : ''}${part}`,
          ),
        );
      return patterns;
    }
  }
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node)
  )
    return staticPatterns(node.expression, bindings, seen);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return [node.text];
  if (ts.isConditionalExpression(node))
    return [
      ...new Set([
        ...staticPatterns(node.whenTrue, bindings, seen),
        ...staticPatterns(node.whenFalse, bindings, seen),
      ]),
    ];
  if (ts.isTemplateExpression(node)) {
    let patterns = [node.head.text];
    for (const span of node.templateSpans)
      patterns = combinations(
        combinations(patterns, staticPatterns(span.expression, bindings, seen)),
        [span.literal.text],
      );
    return patterns;
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  )
    return combinations(
      staticPatterns(node.left, bindings, seen),
      staticPatterns(node.right, bindings, seen),
    );
  return [unknown];
}

function guaranteedClasses(node, bindings) {
  if (!node) return new Set();
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node)
  )
    return guaranteedClasses(node.expression, bindings);
  const patterns = staticPatterns(node, bindings);
  const classes = new Set(classNames(patterns[0]));
  for (const pattern of patterns.slice(1)) {
    const other = new Set(classNames(pattern));
    for (const name of classes) if (!other.has(name)) classes.delete(name);
  }
  return classes;
}

function returnedIntrinsic(node) {
  while (node && ts.isParenthesizedExpression(node)) node = node.expression;
  if (node && ts.isConditionalExpression(node))
    return (
      returnedIntrinsic(node.whenTrue) && returnedIntrinsic(node.whenFalse)
    );
  const tag =
    node && ts.isJsxElement(node)
      ? node.openingElement.tagName
      : node && ts.isJsxSelfClosingElement(node)
        ? node.tagName
        : undefined;
  return Boolean(tag && ts.isIdentifier(tag) && /^[a-z]/.test(tag.text));
}

function belongsToComponentReturn(node, owner) {
  let scope = node.parent;
  while (scope && !ts.isFunctionLike(scope)) scope = scope.parent;
  if (!scope) return false;
  if (ts.isFunctionDeclaration(scope)) return scope.name?.text === owner;
  return (
    ts.isArrowFunction(scope) &&
    ts.isVariableDeclaration(scope.parent) &&
    ts.isIdentifier(scope.parent.name) &&
    scope.parent.name.text === owner
  );
}

async function catalogAliases(workspaceRoot, packageRoot) {
  const aliases = new Map();
  const profile = await loadApplicationUiProfile({
    workspaceRoot,
    startDirectory: packageRoot,
    knownRules: [],
    packageProfile: resolve(
      import.meta.dirname,
      '../ai/application-ui-profile.defaults.json',
    ),
  });
  for (const catalog of profile.profile?.catalogs ?? []) {
    const owner = profile.provenance?.[`$catalogs.${catalog.package}`];
    if (!owner || !catalog.selection?.path) continue;
    try {
      const selection = JSON.parse(
        await readFile(resolve(dirname(owner), catalog.selection.path), 'utf8'),
      );
      const composition = catalog.composition?.path
        ? JSON.parse(
            await readFile(
              resolve(dirname(owner), catalog.composition.path),
              'utf8',
            ),
          )
        : { entries: [] };
      const composed = new Map(
        (composition.entries ?? []).map((entry) => [entry.key, entry]),
      );
      for (const entry of selection.entries ?? []) {
        if (!entry.source || !entry.name) continue;
        const source = resolve(dirname(owner), entry.source);
        const relativeSource = relative(packageRoot, source);
        if (relativeSource === '..' || relativeSource.startsWith('../'))
          continue;
        const detail = composed.get(
          `${selection.package ?? catalog.package}:${entry.id}`,
        );
        const classes = [
          detail?.boundaries?.rootClass,
          ...(detail?.boundaries?.publicClasses ?? []),
          ...(entry.publicClasses ?? []),
        ].filter(Boolean);
        const styleSources = [
          ...(detail?.styleSources ?? []),
          ...(entry.styleSources ?? []),
        ].map((style) => resolve(dirname(owner), style));
        aliases.set(`${source}:${entry.name}`, {
          classes: new Set(classes),
          styles: new Set(styleSources),
        });
      }
    } catch {
      // The catalog stage reports invalid or missing artifacts.
    }
  }
  return aliases;
}

function componentFacts(file, source) {
  const syntax = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX;
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    syntax,
  );
  const components = new Map();
  const visit = (node, owner) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      componentName(node.name.text)
    )
      owner = node.name.text;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      componentName(node.name.text)
    )
      owner = node.name.text;
    else if (
      owner &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    )
      components.get(owner)?.bindings.set(node.name.text, node.initializer);
    if (
      owner &&
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
    ) {
      if (ts.isIdentifier(node.tagName) && /^[a-z]/.test(node.tagName.text)) {
        for (const attribute of node.attributes.properties) {
          if (
            !ts.isJsxAttribute(attribute) ||
            !['class', 'className'].includes(attribute.name.text)
          )
            continue;
          const value = attribute.initializer;
          const classes =
            value && ts.isStringLiteral(value)
              ? classNames(value.text)
              : value && ts.isJsxExpression(value)
                ? guaranteedClasses(
                    value.expression,
                    components.get(owner)?.bindings,
                  )
                : [];
          if (
            value &&
            ts.isJsxExpression(value) &&
            staticPatterns(
              value.expression,
              components.get(owner)?.bindings,
            ).every((pattern) => pattern === unknown)
          )
            components.get(owner).uncertain = true;
          for (const name of classes) components.get(owner)?.add(name);
        }
      }
    }
    if (
      owner &&
      ts.isReturnStatement(node) &&
      belongsToComponentReturn(node, owner) &&
      returnedIntrinsic(node.expression)
    )
      components.get(owner).intrinsic = true;
    if (
      owner &&
      ts.isArrowFunction(node) &&
      ts.isVariableDeclaration(node.parent) &&
      ts.isIdentifier(node.parent.name) &&
      node.parent.name.text === owner &&
      returnedIntrinsic(node.body)
    )
      components.get(owner).intrinsic = true;
    ts.forEachChild(node, (child) => visit(child, owner));
  };
  const declarations = (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      componentName(node.name.text)
    )
      components.set(
        node.name.text,
        Object.assign(new Set(), { bindings: new Map() }),
      );
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      componentName(node.name.text)
    )
      components.set(
        node.name.text,
        Object.assign(new Set(), { bindings: new Map() }),
      );
    ts.forEachChild(node, declarations);
  };
  declarations(ast);
  visit(ast);
  return components;
}

function diagnostic(id, file, line, message, action) {
  return {
    id,
    severity: 'error',
    stage: 'analyzer',
    message,
    location: { file, line, column: 1 },
    action,
    documentation: '@kerfjs/ui/docs/ui-doctor.md#component-style-naming',
    meaning: {
      'KUI-D030': 'Component root class does not match its name',
      'KUI-D031': 'Component stylesheet does not match its name',
      'KUI-D032': 'Stylesheet selects another component class',
    }[id],
  };
}

export async function checkComponentStyles(
  packageRoot,
  inputs,
  ownershipGroups = [],
  selectedPaths,
  workspaceRoot = packageRoot,
) {
  const aliases = await catalogAliases(workspaceRoot, packageRoot);
  const scripts = new Map();
  const styles = new Map();
  const importedBy = new Map();
  for (const file of inputs) {
    if (isUiTraversalExcluded(packageRoot, file)) continue;
    const extension = extname(file);
    if (scriptExtensions.has(extension)) {
      const source = await readFile(file, 'utf8');
      scripts.set(file, componentFacts(file, source));
      for (const match of source.matchAll(
        /\bimport\s*(?:['"]|[^;]*?\bfrom\s*['"])(\.[^'"]+\.css)['"]/g,
      )) {
        const style = resolve(dirname(file), match[1]);
        const importers = importedBy.get(style) ?? [];
        importers.push(file);
        importedBy.set(style, importers);
      }
    } else if (extension === '.css')
      styles.set(file, await readFile(file, 'utf8'));
  }
  const owners = new Map();
  for (const [file, components] of scripts)
    for (const [name, classes] of components)
      if (classes.has(kebab(name)))
        owners.set(kebab(name), { file, name, classes });
  const diagnostics = [];
  for (const [file, source] of styles) {
    if (
      ownershipGroups.some((group) =>
        group.styleSources?.some(
          (style) => resolve(packageRoot, style) === file,
        ),
      )
    )
      continue;
    const stem = basename(file, '.css');
    const pair =
      [...scriptExtensions]
        .map((extension) => resolve(dirname(file), `${stem}${extension}`))
        .find((candidate) => scripts.has(candidate)) ??
      (importedBy.get(file)?.length === 1
        ? importedBy.get(file)[0]
        : undefined);
    if (!pair) continue;
    const path = relative(packageRoot, file).replaceAll('\\', '/');
    if (
      selectedPaths?.length &&
      !selectedPaths.includes(path) &&
      !selectedPaths.includes(relative(packageRoot, pair).replaceAll('\\', '/'))
    )
      continue;
    const components = scripts.get(pair);
    const matching =
      [...components].find(([name]) => kebab(name) === stem) ??
      [...components].find(([name]) =>
        aliases.get(`${pair}:${name}`)?.styles.has(file),
      );
    if (!matching) {
      const names = [...components.keys()];
      if (names.length === 1)
        diagnostics.push(
          diagnostic(
            'KUI-D031',
            path,
            1,
            `${basename(file)} is paired with ${basename(pair)}, but its component ${names[0]} calls for ${kebab(names[0])}.css.`,
            `Rename the stylesheet and its import to ${kebab(names[0])}.css, or rename the component and source pair.`,
          ),
        );
      continue;
    }
    const [name, renderedClasses] = matching;
    const declaredClasses =
      aliases.get(`${pair}:${name}`)?.classes ?? new Set();
    if (
      renderedClasses.intrinsic &&
      !renderedClasses.uncertain &&
      !renderedClasses.has(stem) &&
      ![...declaredClasses].some((className) => renderedClasses.has(className))
    )
      diagnostics.push(
        diagnostic(
          'KUI-D030',
          relative(packageRoot, pair).replaceAll('\\', '/'),
          1,
          `${name} must render its own .${stem} root class.`,
          `Add class="${stem}" to an element rendered by ${name}, then select that class in ${basename(file)}.`,
        ),
      );
    let sheet;
    try {
      sheet = postcss.parse(source, { from: file });
    } catch {
      continue;
    }
    sheet.walkRules((rule) => {
      if (
        rule.parent?.type === 'atrule' &&
        /keyframes$/i.test(rule.parent.name)
      )
        return;
      const selected = [
        ...new Set(
          [...rule.selector.matchAll(/\.([a-z][a-z0-9_-]*)/gi)].map(
            (match) => match[1],
          ),
        ),
      ];
      for (const className of selected) {
        const foreign = owners.get(block(className));
        if (!foreign || foreign.name === name || foreign.file === pair)
          continue;
        diagnostics.push(
          diagnostic(
            'KUI-D032',
            path,
            rule.source?.start?.line ?? 1,
            `${basename(file)} selects .${className}, which belongs to ${foreign.name} in ${relative(packageRoot, foreign.file).replaceAll('\\', '/')}.`,
            `Move this rule to ${kebab(foreign.name)}.css or configure ${foreign.name} through its public API.`,
          ),
        );
      }
    });
  }
  return diagnostics;
}

import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve } from 'node:path';

import postcss from 'postcss';
import ts from 'typescript';

import { isUiTraversalExcluded } from '../traversal-exclusions.mjs';

const scriptExtensions = new Set(['.tsx', '.jsx']);
const kebab = (name) =>
  name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const componentName = (name) => /^[A-Z][A-Za-z0-9]*$/.test(name);
const classNames = (value) =>
  [...value.matchAll(/(?:^|\s)([a-z][a-z0-9_-]*)(?=\s|$)/g)].map(
    (match) => match[1],
  );
const block = (name) => name.split(/__|--/)[0];

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
    if (
      owner &&
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
    ) {
      if (ts.isIdentifier(node.tagName) && /^[a-z]/.test(node.tagName.text)) {
        if (components.has(owner)) components.get(owner).intrinsic = true;
        for (const attribute of node.attributes.properties) {
          if (
            !ts.isJsxAttribute(attribute) ||
            !['class', 'className'].includes(attribute.name.text)
          )
            continue;
          const value = attribute.initializer;
          const literal =
            value && ts.isStringLiteral(value)
              ? value.text
              : value &&
                  ts.isJsxExpression(value) &&
                  value.expression &&
                  (ts.isStringLiteral(value.expression) ||
                    ts.isNoSubstitutionTemplateLiteral(value.expression))
                ? value.expression.text
                : undefined;
          if (literal)
            for (const name of classNames(literal))
              components.get(owner)?.add(name);
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, owner));
  };
  const declarations = (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      componentName(node.name.text)
    )
      components.set(node.name.text, new Set());
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      componentName(node.name.text)
    )
      components.set(node.name.text, new Set());
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
  };
}

export async function checkComponentStyles(
  packageRoot,
  inputs,
  ownershipGroups = [],
  selectedPaths,
) {
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
    const matching = [...components].find(([name]) => kebab(name) === stem);
    if (!matching) {
      const names = [...components.keys()];
      if (names.length)
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
    if (renderedClasses.intrinsic && !renderedClasses.has(stem))
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
        if (!foreign || foreign.name === name) continue;
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

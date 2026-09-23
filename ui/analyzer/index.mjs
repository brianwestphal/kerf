import { readFile, readdir, stat } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from 'node:path';
import process from 'node:process';

import postcss from 'postcss';
import ts from 'typescript';

import { loadApplicationUiProfile } from '../ai/application-ui-profile.mjs';
import { isUiTraversalExcluded } from '../traversal-exclusions.mjs';

export const UI_ANALYSIS_SCHEMA_VERSION = 1;

export const UI_ANALYSIS_RULES = Object.freeze({
  'KUI-L001': { severity: 'error', title: 'Private or unknown Kerf selector' },
  'KUI-L002': { severity: 'error', title: 'Unknown Kerf token' },
  'KUI-L003': { severity: 'error', title: 'Competing geometry owners' },
  'KUI-L004': { severity: 'review', title: 'Repeated content inset' },
  'KUI-L005': { severity: 'review', title: 'Forced component dimension' },
  'KUI-L006': {
    severity: 'review',
    title: 'Hard-coded spacing outside the approved scale',
  },
  'KUI-L007': { severity: 'error', title: 'Nested scroll owners' },
  'KUI-L008': { severity: 'review', title: 'Dynamic class requires review' },
  'KUI-L009': { severity: 'error', title: 'Stylesheet could not be parsed' },
  'KUI-L010': {
    severity: 'error',
    title: 'Private Kerf descendant override',
  },
  'KUI-L011': { severity: 'error', title: 'Uncataloged shadow part override' },
  'KUI-L012': { severity: 'error', title: 'Private Kerf token assignment' },
  'KUI-L013': { severity: 'error', title: 'Uncataloged CSS value literal' },
  'KUI-L014': { severity: 'error', title: 'Wrong CSS value helper dimension' },
  'KUI-L015': { severity: 'error', title: 'Non-standalone CSS expression' },
  'KUI-L016': { severity: 'error', title: 'Forbidden declaration-list escape' },
  'KUI-L017': { severity: 'review', title: 'Exceptional spacing shorthand' },
});

const adoptionRules = new Set([
  'KUI-L001',
  'KUI-L002',
  'KUI-L010',
  'KUI-L011',
  'KUI-L012',
]);

const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const spacingProperties = /^(?:margin|padding|gap|inset)(?:-|$)/;
const dimensionProperties =
  /^(?:width|height|min-width|max-width|min-height|max-height)$/;
const approvedSpacing = new Set([0, 4, 8, 16, 24]);
async function collectFiles(root, paths) {
  const files = [];
  const visit = async (path) => {
    if (isUiTraversalExcluded(root, path)) return;
    const details = await stat(path);
    if (details.isFile()) {
      if (sourceExtensions.has(extname(path)) || path.endsWith('.css'))
        files.push(path);
      return;
    }
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (
        sourceExtensions.has(extname(entry.name)) ||
        entry.name.endsWith('.css')
      )
        files.push(child);
    }
  };
  for (const path of paths?.length ? paths : [root])
    await visit(resolve(root, path));
  return files.sort();
}

function location(file, node, source) {
  if (!source) {
    const point = node.source?.start;
    return {
      file,
      line: point?.line ?? 1,
      column: point?.column ?? point?.offset ?? 1,
    };
  }
  const point = source.getLineAndCharacterOfPosition(node.getStart(source));
  return {
    file,
    line: point.line + 1,
    column: point.character + 1,
  };
}

function diagnostic(ruleId, at, message, evidence, chain, adoption = false) {
  const rule = UI_ANALYSIS_RULES[ruleId];
  return {
    ruleId,
    severity: adoption && adoptionRules.has(ruleId) ? 'review' : rule.severity,
    message,
    location: at,
    evidence,
    chain,
  };
}

function isSuppressed(item, profile, root) {
  const target = relative(root, item.location.file).replaceAll('\\', '/');
  return (profile?.exceptions ?? []).some(
    (exception) =>
      exception.rules?.includes(item.ruleId) && exception.target === target,
  );
}

function relativeStyleImports(file, source) {
  const imports = [];
  if (file.endsWith('.css')) {
    let stylesheet;
    try {
      stylesheet = postcss.parse(source, { from: file });
    } catch {
      return imports;
    }
    stylesheet.walkAtRules('import', (rule) => {
      const match = rule.params.match(
        /^\s*(?:["']([^"']+)["']|url\(\s*(?:["']([^"']+)["']|([^\s)]+))\s*\))/,
      );
      const specifier = match?.[1] ?? match?.[2] ?? match?.[3];
      if (specifier?.startsWith('.'))
        imports.push(resolve(dirname(file), specifier));
    });
    return imports;
  }
  const syntax = file.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : file.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : file.endsWith('.ts')
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;
  const module = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    syntax,
  );
  for (const statement of module.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith('.') && specifier.endsWith('.css'))
      imports.push(resolve(dirname(file), specifier));
  }
  return imports;
}

function reachableStyleFacts(file, imports, styleFacts) {
  const result = new Map();
  for (const style of reachableStyleFiles(file, imports, styleFacts)) {
    for (const [className, facts] of styleFacts.get(style)) {
      const current = result.get(className) ?? { scroll: false, inset: false };
      current.scroll ||= facts.scroll;
      current.inset ||= facts.inset;
      result.set(className, current);
    }
  }
  return result;
}

function reachableStyleFiles(file, imports, styleFacts) {
  const visited = new Set();
  const visit = (style) => {
    if (visited.has(style) || !styleFacts.has(style)) return;
    visited.add(style);
    for (const dependency of imports.get(style) ?? []) visit(dependency);
  };
  for (const style of imports.get(file) ?? []) visit(style);
  return visited;
}

async function loadCatalogs(profileResult) {
  const entries = [];
  for (const catalog of profileResult.profile?.catalogs ?? []) {
    const owner = profileResult.provenance[`$catalogs.${catalog.package}`];
    if (!owner) continue;
    try {
      const artifact = JSON.parse(
        await readFile(
          resolve(dirname(owner), catalog.composition.path),
          'utf8',
        ),
      );
      entries.push(...(artifact.entries ?? []));
    } catch {
      // Profile validation reports the precise catalog load failure.
    }
  }
  return entries;
}

function catalogFacts(entries) {
  const publicClasses = new Set();
  const publicTokens = new Set();
  const publicParts = new Map();
  const classEntries = new Map();
  const exportEntries = new Map();
  for (const entry of entries) {
    exportEntries.set(entry.name, entry);
    for (const item of entry.publicExports ?? [])
      exportEntries.set(typeof item === 'string' ? item : item.name, entry);
    for (const className of entry.boundaries?.publicClasses ?? []) {
      publicClasses.add(className);
      const owners = classEntries.get(className) ?? [];
      owners.push(entry);
      classEntries.set(className, owners);
    }
    for (const token of entry.boundaries?.publicTokens ?? [])
      publicTokens.add(token);
    for (const part of entry.boundaries?.publicParts ?? []) {
      const roots = publicParts.get(part) ?? new Set();
      if (entry.boundaries?.rootClass) roots.add(entry.boundaries.rootClass);
      publicParts.set(part, roots);
    }
  }
  return {
    publicClasses,
    publicTokens,
    publicParts,
    classEntries,
    exportEntries,
  };
}

function spacingValues(value) {
  const results = [];
  for (const match of value.matchAll(/(-?\d*\.?\d+)(px|rem)\b/g)) {
    const numeric = Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
    results.push({ text: match[0], pixels: numeric });
  }
  return results;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function inspectCss(
  file,
  source,
  facts,
  diagnostics,
  cssFacts,
  adoption = false,
) {
  let root;
  try {
    root = postcss.parse(source, { from: file });
  } catch (error) {
    diagnostics.push(
      diagnostic(
        'KUI-L009',
        { file, line: error.line ?? 1, column: error.column ?? 1 },
        error.reason ?? error.message,
      ),
    );
    return;
  }
  root.walkRules((rule) => {
    const classes = [
      ...rule.selector.matchAll(/\.([_a-zA-Z]+[_a-zA-Z0-9-]*)/g),
    ].map((match) => match[1]);
    const publicRootPattern = [...facts.publicClasses]
      .map(
        (className) => `\\.${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      )
      .join('|');
    const privateDescendants = new Set();
    if (publicRootPattern)
      for (const selector of rule.selectors ?? [rule.selector]) {
        const rootMatch = new RegExp(
          `(?:${publicRootPattern})(?:[.#:[\\w-]|\\s)*(?:>|\\s)`,
        ).exec(selector);
        if (!rootMatch) continue;
        const descendant = selector.slice(
          rootMatch.index + rootMatch[0].length,
        );
        for (const match of descendant.matchAll(/\.(kui-[\w-]+)/g))
          if (!facts.publicClasses.has(match[1]))
            privateDescendants.add(match[1]);
      }
    for (const className of classes) {
      if (privateDescendants.has(className))
        diagnostics.push(
          diagnostic(
            'KUI-L010',
            location(file, rule),
            `.${className} is a private Kerf descendant; prefer the owning component's prop or variant, or catalog a deliberate public extension point.`,
            { selector: rule.selector, className },
            undefined,
            adoption,
          ),
        );
      else if (
        className.startsWith('kui-') &&
        !facts.publicClasses.has(className)
      )
        diagnostics.push(
          diagnostic(
            'KUI-L001',
            location(file, rule),
            `.${className} is not a cataloged public Kerf class; prefer a component prop or variant, or catalog the extension point.`,
            { selector: rule.selector, className },
            undefined,
            adoption,
          ),
        );
    }
    for (const match of rule.selector.matchAll(/::part\(\s*([\w-]+)\s*\)/g)) {
      const part = match[1];
      const roots = facts.publicParts.get(part) ?? new Set();
      const allowed = [...roots].some((className) =>
        new RegExp(`\\.${escapeRegExp(className)}(?:[^\\w-]|$)`).test(
          rule.selector.slice(0, match.index),
        ),
      );
      if (!allowed)
        diagnostics.push(
          diagnostic(
            'KUI-L011',
            location(file, rule),
            `::part(${part}) is not a cataloged extension point; prefer the component's prop or variant, or add ${part} to boundaries.publicParts.`,
            { selector: rule.selector, part },
            undefined,
            adoption,
          ),
        );
    }
    rule.walkDecls((decl) => {
      const at = location(file, decl);
      const tokens = [
        ...(decl.prop.match(/--kui-[a-z0-9-]+/g) ?? []),
        ...(decl.value.match(/--kui-[a-z0-9-]+/g) ?? []),
      ];
      for (const token of new Set(tokens))
        if (!facts.publicTokens.has(token)) {
          const assignment = decl.prop === token;
          diagnostics.push(
            diagnostic(
              assignment ? 'KUI-L012' : 'KUI-L002',
              at,
              assignment
                ? `${token} has no public configuration contract; prefer the component's prop or variant, or catalog the token explicitly.`
                : `${token} is not a cataloged public Kerf token; prefer a documented token or component configuration.`,
              { property: decl.prop, value: decl.value, token },
              undefined,
              adoption,
            ),
          );
        }
      if (
        spacingProperties.test(decl.prop) &&
        !/var\(|calc\(|remify\(/.test(decl.value)
      )
        for (const value of spacingValues(decl.value))
          if (!approvedSpacing.has(value.pixels))
            diagnostics.push(
              diagnostic(
                'KUI-L006',
                at,
                `${decl.prop}: ${value.text} is outside the approved Kerf spacing scale.`,
                {
                  property: decl.prop,
                  value: decl.value,
                  pixels: value.pixels,
                },
              ),
            );
      for (const className of classes) {
        const record = cssFacts.get(className) ?? {
          scroll: false,
          inset: false,
        };
        if (
          /^overflow(?:-|$)/.test(decl.prop) &&
          /\b(?:auto|scroll)\b/.test(decl.value)
        )
          record.scroll = true;
        if (/^padding(?:-|$)/.test(decl.prop) && decl.value !== '0')
          record.inset = true;
        cssFacts.set(className, record);
        if (
          facts.publicClasses.has(className) &&
          dimensionProperties.test(decl.prop)
        )
          diagnostics.push(
            diagnostic(
              'KUI-L005',
              at,
              `.${className} forces ${decl.prop}; prefer the component's public sizing contract.`,
              {
                selector: rule.selector,
                property: decl.prop,
                value: decl.value,
              },
            ),
          );
      }
    });
  });
}

function literalClasses(attribute) {
  if (!attribute?.initializer) return { values: [], dynamic: false };
  const value = attribute.initializer;
  if (ts.isStringLiteral(value))
    return { values: value.text.split(/\s+/).filter(Boolean), dynamic: false };
  if (
    ts.isJsxExpression(value) &&
    value.expression &&
    ts.isStringLiteralLike(value.expression)
  )
    return {
      values: value.expression.text.split(/\s+/).filter(Boolean),
      dynamic: false,
    };
  return { values: [], dynamic: true };
}

function cssPreferred(contract) {
  return (
    [
      ...(contract.canonicalShorthands ?? []).map((item) => `\`${item}\``),
      ...(contract.helpers ?? []).map((item) => `\`${item}()\``),
    ].join(' or ') || 'a cataloged component prop'
  );
}

function objectProperty(object, name) {
  return object?.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      property.name.getText().replaceAll(/["']/g, '') === name,
  );
}

function nestedCssValues(value, tail) {
  if (!tail) return value ? [value] : [];
  if (!value || !ts.isArrayLiteralExpression(value)) return [];
  return value.elements.flatMap((element) => {
    if (!ts.isObjectLiteralExpression(element)) return [];
    const property = objectProperty(element, tail);
    return property ? [property.initializer] : [];
  });
}

function jsxCssValues(opening, path) {
  const [head, tail] = path.split('[].');
  const attribute = opening.attributes.properties.find(
    (item) => ts.isJsxAttribute(item) && item.name.getText() === head,
  );
  if (!attribute?.initializer) return [];
  const value = ts.isJsxExpression(attribute.initializer)
    ? attribute.initializer.expression
    : attribute.initializer;
  return nestedCssValues(value, tail);
}

function callCssValues(call, path) {
  const options = call.arguments[0];
  if (!options || !ts.isObjectLiteralExpression(options)) return [];
  const [head, tail] = path.split('[].');
  const property = objectProperty(options, head);
  return property ? nestedCssValues(property.initializer, tail) : [];
}

function cssLiteral(value) {
  if (
    ts.isStringLiteralLike(value) ||
    ts.isNoSubstitutionTemplateLiteral(value)
  )
    return value.text;
  return undefined;
}

function importedName(expression, helperImports, namespaces, packageName) {
  let helper;
  if (ts.isIdentifier(expression)) helper = helperImports.get(expression.text);
  else if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    namespaces.has(expression.expression.text)
  )
    helper = {
      imported: expression.name.text,
      source: namespaces.get(expression.expression.text),
    };
  else helper = undefined;
  if (!helper) return undefined;
  return helper.source === packageName ||
    helper.source.startsWith(`${packageName}/`)
    ? helper.imported
    : undefined;
}

function inspectCssValues(
  file,
  source,
  entry,
  valuesFor,
  helperImports,
  namespaces,
  diagnostics,
) {
  for (const contract of entry.cssValueProps ?? []) {
    const preferred = cssPreferred(contract);
    for (const value of valuesFor(contract.path)) {
      const at = location(file, value, source);
      if (
        contract.grammar === 'declarations' &&
        contract.rawPolicy !== 'allow'
      ) {
        diagnostics.push(
          diagnostic(
            'KUI-L016',
            at,
            `\`${entry.name}.${contract.path}\` is a forbidden declaration-list escape; use \`className\`, public tokens, or cataloged props.`,
            { component: entry.key, path: contract.path },
          ),
        );
        continue;
      }
      const literal = cssLiteral(value);
      if (literal !== undefined) {
        if (contract.exceptionalShorthands?.includes(literal)) {
          diagnostics.push(
            diagnostic(
              'KUI-L017',
              at,
              `\`${literal}\` is exceptional for \`${entry.name}.${contract.path}\`; prefer ${preferred} unless the off-scale choice is deliberate.`,
              { component: entry.key, path: contract.path, value: literal },
            ),
          );
        } else if (
          !contract.shorthands?.includes(literal) &&
          contract.rawPolicy !== 'allow'
        ) {
          diagnostics.push(
            diagnostic(
              'KUI-L013',
              at,
              `\`${entry.name}.${contract.path}\` uses ${contract.grammar} grammar; replace raw \`${literal}\` with ${preferred}.`,
              { component: entry.key, path: contract.path, value: literal },
            ),
          );
        }
        continue;
      }
      if (!ts.isCallExpression(value)) continue;
      const helper = importedName(
        value.expression,
        helperImports,
        namespaces,
        entry.package,
      );
      if (!helper) continue;
      if (contract.nonStandaloneHelpers?.includes(helper))
        diagnostics.push(
          diagnostic(
            'KUI-L015',
            at,
            `\`${helper}()\` is not standalone for \`${entry.name}.${contract.path}\`; wrap it with an accepted composer such as \`calc()\`.`,
            { component: entry.key, path: contract.path, helper },
          ),
        );
      else if (
        !contract.helpers?.includes(helper) &&
        contract.unsafeHelper !== helper
      )
        diagnostics.push(
          diagnostic(
            'KUI-L014',
            at,
            `\`${helper}()\` has the wrong grammar for \`${entry.name}.${contract.path}\`; use ${preferred}.`,
            { component: entry.key, path: contract.path, helper },
          ),
        );
    }
  }
}

function inspectTsx(file, sourceText, facts, cssFacts, diagnostics) {
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const imports = new Map();
  const helperImports = new Map();
  const namespaces = new Map();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const module = statement.moduleSpecifier.text;
    const importClause = statement.importClause;
    if (importClause?.name)
      helperImports.set(importClause.name.text, {
        imported: 'default',
        source: module,
      });
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      namespaces.set(bindings.name.text, module);
      continue;
    }
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const item of bindings.elements) {
      const exported = item.propertyName?.text ?? item.name.text;
      helperImports.set(item.name.text, { imported: exported, source: module });
      const entry = facts.exportEntries.get(exported);
      if (
        entry &&
        (module === entry.package || module.startsWith(`${entry.package}/`))
      )
        imports.set(item.name.text, entry);
    }
  }
  const stack = [];
  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(source);
      const namespaceEntry =
        ts.isPropertyAccessExpression(opening.tagName) &&
        ts.isIdentifier(opening.tagName.expression)
          ? facts.exportEntries.get(opening.tagName.name.text)
          : undefined;
      const namespaceSource =
        ts.isPropertyAccessExpression(opening.tagName) &&
        ts.isIdentifier(opening.tagName.expression)
          ? namespaces.get(opening.tagName.expression.text)
          : undefined;
      const entry =
        imports.get(tag) ??
        (namespaceEntry &&
        (namespaceSource === namespaceEntry.package ||
          namespaceSource?.startsWith(`${namespaceEntry.package}/`))
          ? namespaceEntry
          : undefined);
      const classAttribute = opening.attributes.properties.find(
        (item) =>
          ts.isJsxAttribute(item) &&
          ['class', 'className'].includes(item.name.getText(source)),
      );
      const classes = literalClasses(classAttribute);
      const at = location(file, opening, source);
      if (entry)
        inspectCssValues(
          file,
          source,
          entry,
          (path) => jsxCssValues(opening, path),
          helperImports,
          namespaces,
          diagnostics,
        );
      if (classes.dynamic)
        diagnostics.push(
          diagnostic(
            'KUI-L008',
            at,
            'Dynamic class expression was left unclassified; review it against cataloged public classes.',
            { tag },
          ),
        );
      const owners = classes.values.flatMap(
        (className) => facts.classEntries.get(className) ?? [],
      );
      for (const property of ['margin', 'border', 'padding']) {
        const selfOwners = owners.filter(
          (owner) => owner.layout?.geometry?.[property] === 'self',
        );
        if (new Set(selfOwners.map((owner) => owner.key)).size > 1)
          diagnostics.push(
            diagnostic(
              'KUI-L003',
              at,
              `One element combines multiple ${property} owners: ${selfOwners.map((owner) => owner.key).join(', ')}.`,
              { property, classes: classes.values },
              selfOwners.map((owner) => owner.key),
            ),
          );
      }
      const scroll = classes.values.some(
        (className) => cssFacts.get(className)?.scroll,
      );
      const inset = classes.values.some(
        (className) => cssFacts.get(className)?.inset,
      );
      const parent = stack.at(-1);
      if (scroll && parent?.scroll)
        diagnostics.push(
          diagnostic(
            'KUI-L007',
            at,
            'A scroll-owning element is nested inside another declared scroll owner.',
            { classes: classes.values },
            [parent.label, entry?.key ?? tag],
          ),
        );
      if (inset && parent?.inset)
        diagnostics.push(
          diagnostic(
            'KUI-L004',
            at,
            'Nested elements both add content padding; confirm that the repeated inset is intentional.',
            { classes: classes.values },
            [parent.label, entry?.key ?? tag],
          ),
        );
      stack.push({
        scroll: scroll || parent?.scroll,
        inset: inset || parent?.inset,
        label: entry?.key ?? tag,
      });
      if (ts.isJsxElement(node))
        for (const child of node.children) visit(child);
      stack.pop();
      return;
    }
    if (ts.isCallExpression(node)) {
      const namespaceEntry = ts.isPropertyAccessExpression(node.expression)
        ? facts.exportEntries.get(node.expression.name.text)
        : undefined;
      const namespaceSource =
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
          ? namespaces.get(node.expression.expression.text)
          : undefined;
      const entry = ts.isIdentifier(node.expression)
        ? imports.get(node.expression.text)
        : namespaceEntry &&
            (namespaceSource === namespaceEntry.package ||
              namespaceSource?.startsWith(`${namespaceEntry.package}/`))
          ? namespaceEntry
          : undefined;
      if (entry)
        inspectCssValues(
          file,
          source,
          entry,
          (path) => callCssValues(node, path),
          helperImports,
          namespaces,
          diagnostics,
        );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

export async function analyzeUiProject({
  root: requestedRoot = process.cwd(),
  paths,
  knownRules = [],
  adoption = false,
  profile: packageProfile = resolve(
    import.meta.dirname,
    '../ai/application-ui-profile.defaults.json',
  ),
} = {}) {
  const root = resolve(requestedRoot);
  const files = await collectFiles(root, paths);
  const diagnosticDecisions = new Map();
  const contents = new Map(
    await Promise.all(
      files.map(async (file) => [file, await readFile(file, 'utf8')]),
    ),
  );
  const discoveredFiles = new Set(files);
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    for (const dependency of relativeStyleImports(file, contents.get(file))) {
      const projectPath = relative(root, dependency);
      if (
        discoveredFiles.has(dependency) ||
        projectPath === '..' ||
        projectPath.startsWith('../')
      )
        continue;
      try {
        const source = await readFile(dependency, 'utf8');
        discoveredFiles.add(dependency);
        files.push(dependency);
        contents.set(dependency, source);
      } catch {
        // TypeScript or the CSS toolchain reports missing imports; analysis stays read-only.
      }
    }
  }
  files.sort();
  const profileContexts = new Map();
  const loadContext = async (file) => {
    const startDirectory = file === root ? root : dirname(file);
    if (!profileContexts.has(startDirectory))
      profileContexts.set(
        startDirectory,
        (async () => {
          const profileResult = await loadApplicationUiProfile({
            workspaceRoot: root,
            startDirectory,
            packageProfile,
            knownRules: [...Object.keys(UI_ANALYSIS_RULES), ...knownRules],
          });
          const entries = await loadCatalogs(profileResult);
          return {
            profileResult,
            facts: catalogFacts(entries),
            startDirectory,
          };
        })(),
      );
    return profileContexts.get(startDirectory);
  };
  const contexts = new Map(
    await Promise.all(
      files.map(async (file) => [file, await loadContext(file)]),
    ),
  );
  if (!files.length) await loadContext(root);
  const imports = new Map(
    files.map((file) => [file, relativeStyleImports(file, contents.get(file))]),
  );
  const styleFacts = new Map();
  const recordDiagnostics = (items, context) => {
    for (const item of items) {
      const key = JSON.stringify([
        item.ruleId,
        item.location,
        item.message,
        item.evidence,
        item.chain,
      ]);
      const decision = diagnosticDecisions.get(key) ?? {
        item,
        active: false,
        suppressed: false,
        activeConsumers: new Set(),
        suppressedConsumers: new Set(),
      };
      const consumer =
        relative(root, context.startDirectory).replaceAll('\\', '/') || '.';
      if (isSuppressed(item, context.profileResult.profile, root)) {
        decision.suppressed = true;
        decision.suppressedConsumers.add(consumer);
      } else {
        decision.active = true;
        decision.activeConsumers.add(consumer);
      }
      diagnosticDecisions.set(key, decision);
    }
  };
  for (const file of files.filter((item) => item.endsWith('.css'))) {
    const context = contexts.get(file);
    const fileFacts = new Map();
    await inspectCss(
      file,
      contents.get(file),
      context.facts,
      [],
      fileFacts,
      adoption,
    );
    styleFacts.set(file, fileFacts);
  }
  const styleConsumers = new Map(
    [...styleFacts.keys()].map((file) => [file, new Set()]),
  );
  for (const file of files.filter((item) =>
    sourceExtensions.has(extname(item)),
  )) {
    const context = contexts.get(file);
    for (const style of reachableStyleFiles(file, imports, styleFacts))
      styleConsumers.get(style).add(context);
    const fileDiagnostics = [];
    inspectTsx(
      file,
      contents.get(file),
      context.facts,
      reachableStyleFacts(file, imports, styleFacts),
      fileDiagnostics,
    );
    recordDiagnostics(fileDiagnostics, context);
  }
  for (const [file, consumers] of styleConsumers) {
    const applicableContexts = consumers.size
      ? consumers
      : new Set([contexts.get(file)]);
    for (const context of applicableContexts) {
      const fileDiagnostics = [];
      await inspectCss(
        file,
        contents.get(file),
        context.facts,
        fileDiagnostics,
        new Map(),
        adoption,
      );
      recordDiagnostics(fileDiagnostics, context);
    }
  }

  const active = [...diagnosticDecisions.values()]
    .filter((decision) => decision.active)
    .map((decision) => {
      if (
        !decision.suppressedConsumers.size &&
        decision.activeConsumers.size <= 1
      )
        return decision.item;
      return {
        ...decision.item,
        evidence: {
          ...decision.item.evidence,
          consumers: {
            active: [...decision.activeConsumers].sort(),
            suppressed: [...decision.suppressedConsumers].sort(),
          },
        },
      };
    });
  const suppressed = [...diagnosticDecisions.values()].filter(
    (decision) => !decision.active && decision.suppressed,
  ).length;
  active.sort(
    (a, b) =>
      a.location.file.localeCompare(b.location.file) ||
      a.location.line - b.location.line ||
      a.ruleId.localeCompare(b.ruleId),
  );
  const portablePath = (file) => {
    if (!file || !isAbsolute(file)) return file;
    const path = relative(root, file).replaceAll('\\', '/');
    return path === '..' || path.startsWith('../')
      ? `<external>/${basename(file)}`
      : path;
  };
  const resolvedContexts = await Promise.all(profileContexts.values());
  const profileFiles = [
    ...new Set(
      resolvedContexts.flatMap(
        ({ profileResult }) => profileResult.files ?? [],
      ),
    ),
  ];
  const profilePackageRoot = dirname(profileFiles[0] ?? root);
  const portableMessage = (message) =>
    String(message)
      .replaceAll(root, '<repo-root>')
      .replaceAll(profilePackageRoot, '<package-root>');
  const profileDiagnostics = [
    ...new Map(
      resolvedContexts
        .flatMap(({ profileResult }) => profileResult.diagnostics ?? [])
        .map((item) => [
          JSON.stringify([item.code, item.source, item.path, item.message]),
          {
            ...item,
            source: portablePath(item.source),
            message: portableMessage(item.message),
          },
        ]),
    ).values(),
  ];
  return {
    schemaVersion: UI_ANALYSIS_SCHEMA_VERSION,
    tool: { name: '@kerfjs/ui analyzer', version: 1 },
    root: '.',
    files: files.map((file) => relative(root, file).replaceAll('\\', '/')),
    profile: {
      files: profileFiles.map(portablePath),
      diagnostics: profileDiagnostics,
    },
    diagnostics: active.map((item) => ({
      ...item,
      location: {
        ...item.location,
        file: portablePath(item.location.file),
      },
    })),
    summary: {
      errors:
        active.filter((item) => item.severity === 'error').length +
        profileDiagnostics.length,
      review: active.filter((item) => item.severity === 'review').length,
      suppressed,
    },
  };
}

export function formatUiAnalysisText(report) {
  const lines = report.profile.diagnostics.map(
    (item) =>
      `${item.source ?? '<profile>'}:1:1 error ${item.code} ${item.message}`,
  );
  lines.push(
    ...report.diagnostics.map(
      (item) =>
        `${item.location.file}:${item.location.line}:${item.location.column} ${item.severity} ${item.ruleId} ${item.message}`,
    ),
  );
  lines.push(
    `Kerf UI analysis: ${report.summary.errors} error(s), ${report.summary.review} review finding(s), ${report.summary.suppressed} suppressed.`,
  );
  return lines.join('\n');
}

export function formatUiAnalysisSarif(report) {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: report.tool.name,
            version: String(report.tool.version),
            rules: Object.entries(UI_ANALYSIS_RULES).map(([id, rule]) => ({
              id,
              shortDescription: { text: rule.title },
            })),
          },
        },
        results: [
          ...report.profile.diagnostics.map((item) => ({
            ruleId: item.code,
            level: 'error',
            message: { text: item.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: item.source ?? '<profile>' },
                  region: { startLine: 1, startColumn: 1 },
                },
              },
            ],
            properties: { path: item.path },
          })),
          ...report.diagnostics.map((item) => ({
            ruleId: item.ruleId,
            level: item.severity === 'error' ? 'error' : 'warning',
            message: { text: item.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: item.location.file },
                  region: {
                    startLine: item.location.line,
                    startColumn: item.location.column,
                  },
                },
              },
            ],
            properties: { evidence: item.evidence, chain: item.chain },
          })),
        ],
      },
    ],
  };
}

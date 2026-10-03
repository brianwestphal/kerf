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
import {
  componentLabel,
  componentName,
  componentOwnershipFacts,
  configurationFor,
  privateVariableOwner,
  reportGap,
  restyledComponents,
  typedPropForToken,
} from './component-ownership.mjs';
import { collectLoudDeclarations, inspectLoudPairs } from './loud-pairs.mjs';
import {
  classNames,
  complexSelectorParts,
  withoutRelationalArguments,
} from './selectors.mjs';

export const UI_ANALYSIS_SCHEMA_VERSION = 1;

export const UI_ANALYSIS_RULES = Object.freeze({
  'KUI-L001': { severity: 'error', title: 'Private or unknown Kerf selector' },
  'KUI-L002': { severity: 'error', title: 'Unknown Kerf token' },
  'KUI-L003': { severity: 'error', title: 'Competing geometry owners' },
  'KUI-L004': { severity: 'review', title: 'Repeated content inset' },
  // KUI-L005 ('Forced component dimension') is retired: KUI-L019 reports any
  // restyle of a cataloged component, dimensions included, and L005's only
  // other shape (a public class as an ancestor) sizes an application element.
  // The id stays in the diagnostic registry so existing exceptions still load.
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
  'KUI-L018': {
    severity: 'review',
    title: 'Loud fill override without its on-loud pair',
  },
  'KUI-L019': {
    severity: 'error',
    title: 'Application CSS restyles a cataloged component',
  },
  'KUI-L020': {
    severity: 'error',
    title: "Another component's private variable",
  },
  'KUI-L021': {
    severity: 'error',
    title: 'Component token overridden where a typed prop exists',
  },
  'KUI-L022': {
    severity: 'error',
    title: "Hook class restyles a cataloged component's root",
  },
});

const ownershipAction =
  "Configure the component through its typed props, variants, or public tokens; style only your own elements (in the component's context when needed). If no configuration covers the need, report the component gap to its package instead of overriding it.";

/** The doctor's per-rule repair action, where it is more specific than the default. */
export const UI_ANALYSIS_ACTIONS = Object.freeze({
  'KUI-L019': ownershipAction,
  'KUI-L020': ownershipAction,
  'KUI-L021':
    'Set the typed prop the diagnostic names on the component instead of overriding its token.',
  'KUI-L022': ownershipAction,
});

const adoptionRules = new Set([
  'KUI-L001',
  'KUI-L002',
  'KUI-L010',
  'KUI-L011',
  'KUI-L012',
  'KUI-L019',
  'KUI-L020',
  'KUI-L021',
  'KUI-L022',
]);

const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const spacingProperties = /^(?:margin|padding|gap|inset)(?:-|$)/;
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
      current.styled ??= facts.styled;
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

async function loadCatalogs(profileResult, ownership) {
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
      const selection = await loadSelectionFacts(owner, catalog);
      const joined = new Set();
      for (const entry of artifact.entries ?? []) {
        const selected = selection.get(entry.key);
        joined.add(entry.key);
        const componentSource =
          selected?.componentSource ??
          (/\.[cm]?[jt]sx?$/.test(entry.source) ? entry.source : undefined);
        entries.push(
          selected
            ? {
                ...entry,
                publicExports: entry.publicExports ?? selected.publicExports,
                moduleImports: selected.moduleImports,
                componentSource,
                styleSources: entry.styleSources ?? selected.styleSources,
                catalogDirectory: dirname(owner),
              }
            : { ...entry, componentSource, catalogDirectory: dirname(owner) },
        );
      }
      for (const [key, selected] of selection) {
        if (
          ownership !== 'component' ||
          joined.has(key) ||
          !selected.componentSource
        )
          continue;
        entries.push({
          key,
          package: catalog.package,
          id: selected.id,
          name: selected.name,
          kind: selected.kind,
          componentSource: selected.componentSource,
          styleSources: selected.styleSources,
          moduleImports: selected.moduleImports,
          publicExports: selected.publicExports,
          boundaries: {
            publicClasses: selected.publicClasses ?? [],
            rootElement: selected.rootElement,
          },
          catalogDirectory: dirname(owner),
        });
      }
    } catch {
      // Profile validation reports the precise catalog load failure.
    }
  }
  return entries;
}

// The composition (v2) catalog carries no import facts, and several of its
// entries share a display name (the Kerf `Select` and the Web Awesome
// `wa-select` are both "Select"). The selection (v1) catalog is where each
// entry's real public exports and import subpaths live, so join it by key.
async function loadSelectionFacts(owner, catalog) {
  const facts = new Map();
  if (!catalog.selection?.path) return facts;
  let artifact;
  try {
    artifact = JSON.parse(
      await readFile(resolve(dirname(owner), catalog.selection.path), 'utf8'),
    );
  } catch {
    return facts;
  }
  const packageName = artifact.package ?? catalog.package;
  for (const entry of artifact.entries ?? []) {
    const delivery = entry.delivery ?? {};
    facts.set(`${packageName}:${entry.id}`, {
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      publicExports: entry.publicExports,
      publicClasses: entry.publicClasses,
      rootElement: entry.rootElement,
      componentSource: entry.source,
      styleSources: entry.styleSources,
      moduleImports: [delivery.browserImport, delivery.moduleImport].filter(
        Boolean,
      ),
    });
  }
  return facts;
}

// A catalog entry's public exports mix the component render function with
// helpers its props consume (`Select` ships `uiColor`, `List` ships
// `px`/`rem`/`flex`). Only the render function stands for the entry, so only
// it may carry the entry's contracts. A component export is one whose name
// starts with an uppercase letter: JSX itself treats a lowercase tag as an
// intrinsic element, so a lowercase export can never be a component tag, and
// scripts/check-component-catalog.mjs enforces the converse for this package
// (every uppercase runtime export returns SafeHtml; no lowercase one does).
// eslint-plugin-kerfjs applies the same rule.
function isComponentExport(name) {
  return /^[A-Z]/.test(name);
}

// Pick the catalog entry an imported (or namespace-accessed) export name
// refers to. Names are not unique across a catalog, so candidates are ranked:
// an entry whose own import subpath is the module wins, then an entry that
// declares the name as a public export, then catalog order. A helper export
// never resolves to an entry.
function resolveExportEntry(
  candidates,
  name,
  module,
  file,
  packageDirectory,
  aliasSource,
) {
  if (!isComponentExport(name)) return undefined;
  const localSource =
    packageDirectory && (module?.startsWith('.') || aliasSource)
      ? relative(
          packageDirectory,
          aliasSource ?? resolve(dirname(file), module),
        )
          .replaceAll('\\', '/')
          .replace(/\.[cm]?[jt]sx?$/, '')
      : undefined;
  const eligible = (candidates ?? []).filter(
    (entry) =>
      module === entry.package ||
      module?.startsWith(`${entry.package}/`) ||
      (localSource &&
        entry.componentSource?.replace(/\.[cm]?[jt]sx?$/, '') === localSource),
  );
  const exported = (entry) =>
    (entry.publicExports ?? []).some(
      (item) => (typeof item === 'string' ? item : item.name) === name,
    );
  return (
    eligible.find((entry) => entry.moduleImports?.includes(module)) ??
    eligible.find(exported) ??
    eligible[0]
  );
}

// Use the nearest project tsconfig without walking into a parent repository.
// TypeScript expands `extends` and resolves exact and wildcard `paths` here.
function compilerOptionsFor(file, root, cache) {
  let directory = dirname(file);
  const visited = [];
  while (directory === root || !relative(root, directory).startsWith('..')) {
    if (cache.has(directory)) break;
    visited.push(directory);
    const configPath = resolve(directory, 'tsconfig.json');
    if (ts.sys.fileExists(configPath)) {
      const config = ts.readConfigFile(configPath, ts.sys.readFile);
      cache.set(
        directory,
        config.error
          ? undefined
          : ts.parseJsonConfigFileContent(
              config.config,
              ts.sys,
              directory,
              undefined,
              configPath,
            ).options,
      );
      break;
    }
    if (directory === root) break;
    directory = dirname(directory);
  }
  const options = cache.get(directory);
  for (const path of visited) cache.set(path, options);
  return options;
}

function catalogFacts(entries) {
  const publicClasses = new Set();
  const publicTokens = new Set();
  const publicParts = new Map();
  const classEntries = new Map();
  const exportEntries = new Map();
  const addExport = (name, entry) => {
    const candidates = exportEntries.get(name) ?? [];
    if (!candidates.includes(entry)) candidates.push(entry);
    exportEntries.set(name, candidates);
  };
  for (const entry of entries) {
    addExport(entry.name, entry);
    for (const item of entry.publicExports ?? []) {
      const name = typeof item === 'string' ? item : item.name;
      if (isComponentExport(name)) addExport(name, entry);
    }
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
    entries,
    publicClasses,
    publicTokens,
    publicParts,
    classEntries,
    exportEntries,
    ownership: componentOwnershipFacts(entries),
  };
}

const bemBlock = (name) => name.split(/__|--/, 1)[0];

function renderedLiteralClasses(file, source) {
  const names = new Set();
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
  );
  const visit = (node) => {
    if (
      ts.isJsxAttribute(node) &&
      ['class', 'className'].includes(node.name.text)
    ) {
      const value =
        node.initializer && ts.isStringLiteral(node.initializer)
          ? node.initializer.text
          : node.initializer &&
              ts.isJsxExpression(node.initializer) &&
              node.initializer.expression &&
              ts.isStringLiteral(node.initializer.expression)
            ? node.initializer.expression.text
            : undefined;
      for (const name of value?.split(/\s+/) ?? []) if (name) names.add(name);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return names;
}

function inferOwnedClasses(entries, contents, imports) {
  return entries.map((entry) => {
    if (!entry.componentSource || !entry.catalogDirectory) return entry;
    const sourceFile = resolve(entry.catalogDirectory, entry.componentSource);
    const source = contents.get(sourceFile);
    if (!source) return entry;
    const styleFiles = entry.styleSources?.length
      ? entry.styleSources.map((path) => resolve(entry.catalogDirectory, path))
      : [...(imports.get(sourceFile) ?? [])];
    const styleSources = styleFiles.map((file) =>
      relative(entry.catalogDirectory, file).replaceAll('\\', '/'),
    );
    const styledBlocks = new Set();
    for (const style of styleFiles) {
      const css = contents.get(style);
      if (!css) continue;
      try {
        postcss.parse(css, { from: style }).walkRules((rule) => {
          for (const name of subjectClasses(rule.selector))
            styledBlocks.add(bemBlock(name));
        });
      } catch {
        // The stylesheet parser reports malformed CSS in the normal pass.
      }
    }
    const inferred = [...renderedLiteralClasses(sourceFile, source)].filter(
      (name) => styledBlocks.has(bemBlock(name)),
    );
    if (!inferred.length) return { ...entry, styleSources };
    return {
      ...entry,
      styleSources,
      boundaries: {
        ...entry.boundaries,
        publicClasses: [
          ...new Set([...(entry.boundaries?.publicClasses ?? []), ...inferred]),
        ],
      },
    };
  });
}

async function implicitOwnershipEntries(files, imports, root) {
  const found = [];
  const packages = new Map();
  const packageAt = async (directory) => {
    if (packages.has(directory)) return packages.get(directory);
    let result;
    try {
      const manifest = JSON.parse(
        await readFile(resolve(directory, 'package.json'), 'utf8'),
      );
      if (typeof manifest.name === 'string')
        result = { name: manifest.name, directory };
    } catch {
      // Search the containing directory for a package manifest.
    }
    if (!result && directory !== root) {
      const parent = dirname(directory);
      if (!relative(root, parent).startsWith('..'))
        result = await packageAt(parent);
    }
    packages.set(directory, result);
    return result;
  };
  for (const file of files) {
    if (!sourceExtensions.has(extname(file))) continue;
    const styles = (imports.get(file) ?? []).filter((path) =>
      files.includes(path),
    );
    if (!styles.length) continue;
    const owner = await packageAt(dirname(file));
    if (!owner) continue;
    const source = relative(owner.directory, file).replaceAll('\\', '/');
    const id = `module:${source}`;
    found.push({
      key: `${owner.name}:${id}`,
      package: owner.name,
      id,
      name: basename(file).replace(/\.[^.]+$/, ''),
      componentSource: source,
      catalogDirectory: owner.directory,
      styleSources: styles.map((style) =>
        relative(owner.directory, style).replaceAll('\\', '/'),
      ),
    });
  }
  return found;
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

// A declaration that restyles, as opposed to one that only sets a custom
// property: setting a component's public token on its host is configuration,
// which the token rules (KUI-L002, KUI-L012, KUI-L020, KUI-L021) judge.
function restylingDeclarations(rule) {
  return (rule.nodes ?? []).filter(
    (node) => node.type === 'decl' && !node.prop.startsWith('--'),
  );
}

function inKeyframes(rule) {
  return rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name);
}

// The classes a rule makes its subject (the rightmost compound of each complex
// selector, outside :has()/:not()).
function subjectClasses(selector) {
  return complexSelectorParts(selector).flatMap((parts) => {
    const subject = parts.at(-1)?.compound;
    return subject ? classNames(withoutRelationalArguments(subject)) : [];
  });
}

function inspectComponentOwnership(
  file,
  rule,
  facts,
  diagnostics,
  adoption,
  isForeign,
  ownershipEvidence,
) {
  if (inKeyframes(rule)) return;
  const restyling = restylingDeclarations(rule);
  if (restyling.length === 0) return;
  const properties = [...new Set(restyling.map((decl) => decl.prop))];
  for (const { entry, via, name } of restyledComponents(
    rule.selector,
    facts.ownership,
    isForeign,
    ownershipEvidence,
  ))
    diagnostics.push(
      diagnostic(
        'KUI-L019',
        location(file, rule),
        via === 'descendant'
          ? `\`${name}\` reaches an unclassed descendant inside ${componentLabel(entry)} (${properties.join(', ')}); components own their styles. Configure it through ${configurationFor(entry)}. To place your own content in its context, style your own element. ${reportGap(entry)}`
          : `\`${name}\` makes ${componentLabel(entry)} the subject of an application rule (${properties.join(', ')}); components own their styles. Configure it through ${configurationFor(entry)}. To place your own content in its context, style your own element (\`${name} > .your-element\`). ${reportGap(entry)}`,
        {
          selector: rule.selector,
          component: entry.key,
          via,
          target: name,
          properties,
        },
        undefined,
        adoption,
      ),
    );
}

function inspectVariableOwnership(
  file,
  decl,
  facts,
  diagnostics,
  adoption,
  isForeign,
) {
  const at = location(file, decl);
  const privates = new Set([
    ...(decl.prop.match(/--_[a-z0-9_-]+/gi) ?? []),
    ...(decl.value.match(/--_[a-z0-9_-]+/gi) ?? []),
  ]);
  for (const variable of privates) {
    const owner = privateVariableOwner(variable, facts.ownership);
    if (owner === undefined || (owner && !isForeign(owner))) continue;
    const written = decl.prop === variable;
    diagnostics.push(
      diagnostic(
        'KUI-L020',
        at,
        `\`${variable}\` is ${owner ? `${componentName(owner)}'s` : "a Kerf component's"} private variable; ${written ? 'writing it overrides' : 'reading it couples to'} that component's implementation. Configure it through ${configurationFor(owner)}. ${reportGap(owner)}`,
        {
          property: decl.prop,
          value: decl.value,
          variable,
          ...(owner ? { component: owner.key } : {}),
          access: written ? 'write' : 'read',
        },
        undefined,
        adoption,
      ),
    );
  }
  if (!decl.prop.startsWith('--')) return;
  const typed = typedPropForToken(decl.prop, facts.ownership);
  if (!typed || !isForeign(typed.entry)) return;
  const contract = (typed.entry.cssValueProps ?? []).find(
    ({ path }) => path === typed.path,
  );
  const example = contract?.examples?.[0];
  diagnostics.push(
    diagnostic(
      'KUI-L021',
      at,
      `\`${decl.prop}\` is what ${typed.entry.name}'s typed \`${typed.path}\` prop sets; set the prop on ${typed.entry.name}${example ? ` (\`<${typed.entry.name} ${example} />\`)` : ''} instead of overriding the token. ${reportGap(typed.entry)}`,
      {
        property: decl.prop,
        value: decl.value,
        component: typed.entry.key,
        prop: typed.path,
      },
      undefined,
      adoption,
    ),
  );
}

async function inspectCss(
  file,
  source,
  facts,
  diagnostics,
  cssFacts,
  adoption = false,
  siblingOnLoud = [],
  isForeign = () => true,
  ownershipEvidence,
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
  inspectLoudPairs(
    file,
    root,
    (decl, message, evidence) =>
      diagnostics.push(
        diagnostic('KUI-L018', location(file, decl), message, evidence),
      ),
    siblingOnLoud,
  );
  root.walkRules((rule) => {
    const subjects = subjectClasses(rule.selector);
    inspectComponentOwnership(
      file,
      rule,
      facts,
      diagnostics,
      adoption,
      isForeign,
      ownershipEvidence,
    );
    if (!inKeyframes(rule) && restylingDeclarations(rule).length > 0)
      for (const className of subjects) {
        const record = cssFacts.get(className) ?? {
          scroll: false,
          inset: false,
        };
        record.styled ??= {
          stylesheet: file,
          line: rule.source?.start?.line ?? 1,
          selector: rule.selector,
        };
        cssFacts.set(className, record);
      }
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
      inspectVariableOwnership(
        file,
        decl,
        facts,
        diagnostics,
        adoption,
        isForeign,
      );
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
      for (const className of subjects) {
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

function jsxOwnershipEvidence(style, facts, contents, root, compilerCache) {
  const hooks = new Map();
  const composedChildren = new Map();
  const ambiguousHooks = new Set();
  const ambiguousChildren = new Set();
  const record = (map, ambiguous, key, entry) => {
    if (ambiguous.has(key)) return;
    if (map.has(key) && map.get(key).key !== entry.key) {
      map.delete(key);
      ambiguous.add(key);
    } else map.set(key, entry);
  };
  for (const owner of facts.entries) {
    if (!owner.componentSource || !owner.catalogDirectory) continue;
    const relativeStyle = relative(owner.catalogDirectory, style).replaceAll(
      '\\',
      '/',
    );
    if (!owner.styleSources?.includes(relativeStyle)) continue;
    const file = resolve(owner.catalogDirectory, owner.componentSource);
    const sourceText = contents.get(file);
    if (!sourceText) continue;
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const imports = new Map();
    const namespaces = new Map();
    const compilerOptions = compilerOptionsFor(file, root, compilerCache);
    const aliasSource = (module) =>
      module && !module.startsWith('.') && compilerOptions?.paths
        ? ts.resolveModuleName(module, file, compilerOptions, ts.sys)
            .resolvedModule?.resolvedFileName
        : undefined;
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue;
      const module = statement.moduleSpecifier.text;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        namespaces.set(bindings.name.text, module);
        continue;
      }
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const item of bindings.elements) {
        const exported = item.propertyName?.text ?? item.name.text;
        const entry = resolveExportEntry(
          facts.exportEntries.get(exported),
          exported,
          module,
          file,
          owner.catalogDirectory,
          aliasSource(module),
        );
        if (entry) imports.set(item.name.text, entry);
      }
    }
    const openingOf = (node) =>
      ts.isJsxElement(node) ? node.openingElement : node;
    const entryFor = (opening) => {
      const tag = opening.tagName.getText(source);
      if (imports.has(tag)) return imports.get(tag);
      if (
        ts.isPropertyAccessExpression(opening.tagName) &&
        ts.isIdentifier(opening.tagName.expression)
      ) {
        const module = namespaces.get(opening.tagName.expression.text);
        return resolveExportEntry(
          facts.exportEntries.get(opening.tagName.name.text),
          opening.tagName.name.text,
          module,
          file,
          owner.catalogDirectory,
          aliasSource(module),
        );
      }
      return undefined;
    };
    const classesOf = (opening) =>
      literalClasses(
        opening.attributes.properties.find(
          (item) =>
            ts.isJsxAttribute(item) &&
            ['class', 'className'].includes(item.name.getText(source)),
        ),
      ).values;
    const visit = (node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = openingOf(node);
        const entry = entryFor(opening);
        if (entry)
          for (const name of classesOf(opening))
            record(hooks, ambiguousHooks, name, entry);
        if (ts.isJsxElement(node)) {
          const parentClasses = classesOf(opening);
          const possible = new Map();
          let dynamic = false;
          for (const child of node.children) {
            if (ts.isJsxExpression(child) && child.expression) dynamic = true;
            if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child))
              continue;
            const childOpening = openingOf(child);
            const childEntry = entryFor(childOpening);
            const type =
              childEntry?.boundaries?.rootElement ??
              (childEntry
                ? undefined
                : childOpening.tagName.getText(source).toLowerCase());
            if (!type) continue;
            const candidates = possible.get(type) ?? [];
            candidates.push(childEntry);
            possible.set(type, candidates);
          }
          if (!dynamic)
            for (const [type, candidates] of possible)
              if (
                candidates.length > 0 &&
                candidates.every(
                  (candidate) => candidate?.key === candidates[0]?.key,
                ) &&
                candidates[0]
              )
                for (const name of parentClasses)
                  record(
                    composedChildren,
                    ambiguousChildren,
                    `${name}|${type}`,
                    candidates[0],
                  );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { componentMode: true, hooks, composedChildren };
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

function inspectTsx(
  file,
  sourceText,
  facts,
  cssFacts,
  diagnostics,
  adoption = false,
  isForeign = () => true,
  packageDirectory,
  compilerOptions,
) {
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
  const aliasSources = new Map();
  const aliasSource = (module) => {
    if (!module || module.startsWith('.') || !compilerOptions?.paths)
      return undefined;
    if (!aliasSources.has(module))
      aliasSources.set(
        module,
        ts.resolveModuleName(module, file, compilerOptions, ts.sys)
          .resolvedModule?.resolvedFileName,
      );
    return aliasSources.get(module);
  };
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
      const entry = resolveExportEntry(
        facts.exportEntries.get(exported),
        exported,
        module,
        file,
        packageDirectory,
        aliasSource(module),
      );
      if (entry) imports.set(item.name.text, entry);
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
          ? resolveExportEntry(
              facts.exportEntries.get(opening.tagName.name.text),
              opening.tagName.name.text,
              namespaces.get(opening.tagName.expression.text),
              file,
              packageDirectory,
              aliasSource(namespaces.get(opening.tagName.expression.text)),
            )
          : undefined;
      const entry = imports.get(tag) ?? namespaceEntry;
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
      if (entry && isForeign(entry))
        for (const className of classes.values) {
          if (facts.ownership.classOwners.has(className)) continue;
          const styled = cssFacts.get(className)?.styled;
          if (!styled) continue;
          diagnostics.push(
            diagnostic(
              'KUI-L022',
              at,
              `\`${className}\` is placed on ${entry.name}'s root and styled by ${basename(styled.stylesheet)}:${styled.line} (\`${styled.selector}\`), which restyles ${componentLabel(entry)}; components own their styles. Configure it through ${configurationFor(entry)}, or wrap it in your own element and style that. ${reportGap(entry)}`,
              {
                tag,
                component: entry.key,
                className,
                stylesheet: styled.stylesheet,
                line: styled.line,
                selector: styled.selector,
              },
              undefined,
              adoption,
            ),
          );
        }
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
      const entry = ts.isIdentifier(node.expression)
        ? imports.get(node.expression.text)
        : ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression)
          ? resolveExportEntry(
              facts.exportEntries.get(node.expression.name.text),
              node.expression.name.text,
              namespaces.get(node.expression.expression.text),
              file,
              packageDirectory,
              aliasSource(namespaces.get(node.expression.expression.text)),
            )
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
  ownership = 'package',
  implicitComponentOwnership = false,
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
  const imports = new Map(
    files.map((file) => [file, relativeStyleImports(file, contents.get(file))]),
  );
  const implicitEntries =
    ownership === 'component' && implicitComponentOwnership
      ? await implicitOwnershipEntries(files, imports, root)
      : [];
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
          const entries = await loadCatalogs(profileResult, ownership);
          const catalogedSources = new Set(
            entries
              .filter((entry) => entry.componentSource)
              .map((entry) =>
                resolve(entry.catalogDirectory, entry.componentSource),
              ),
          );
          const ownershipEntries = [
            ...entries,
            ...implicitEntries.filter(
              (entry) =>
                !catalogedSources.has(
                  resolve(entry.catalogDirectory, entry.componentSource),
                ),
            ),
          ];
          return {
            profileResult,
            facts: catalogFacts(
              ownership === 'component'
                ? inferOwnedClasses(ownershipEntries, contents, imports)
                : entries,
            ),
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
  // A stylesheet or source file belongs to the package whose manifest is
  // nearest it; entries of every other catalog package are foreign to it.
  const packages = new Map();
  const compilerOptions = new Map();
  const packageOf = async (directory) => {
    if (!packages.has(directory))
      packages.set(
        directory,
        (async () => {
          try {
            const manifest = JSON.parse(
              await readFile(resolve(directory, 'package.json'), 'utf8'),
            );
            if (typeof manifest.name === 'string')
              return { name: manifest.name, directory };
          } catch {
            // No readable manifest here; keep walking up.
          }
          const parent = dirname(directory);
          const inside = relative(root, parent);
          if (
            parent === directory ||
            inside === '..' ||
            inside.startsWith('../')
          )
            return undefined;
          return packageOf(parent);
        })(),
      );
    return packages.get(directory);
  };
  const foreignTo = async (file) => {
    const own = await packageOf(dirname(file));
    const source = own && relative(own.directory, file).replaceAll('\\', '/');
    return (entry) => {
      if (entry.package !== own?.name) return true;
      if (ownership !== 'component') return false;
      const ownedSources = file.endsWith('.css')
        ? entry.styleSources
        : [entry.componentSource];
      return !ownedSources?.includes(source);
    };
  };
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
  // KUI-L018 accepts an on-loud from another stylesheet the same entry loads:
  // every stylesheet reachable from one file (a source module's CSS imports,
  // or a stylesheet with its @imports) is loaded together.
  const onLoudByStyle = new Map();
  for (const style of styleFacts.keys()) {
    let parsed;
    try {
      parsed = postcss.parse(contents.get(style), { from: style });
    } catch {
      continue;
    }
    onLoudByStyle.set(
      style,
      collectLoudDeclarations(style, parsed).filter(
        ({ kind }) => kind === 'on-loud',
      ),
    );
  }
  const coLoadedStyles = new Map(
    [...styleFacts.keys()].map((style) => [style, new Set()]),
  );
  for (const file of files) {
    const loaded = new Set(reachableStyleFiles(file, imports, styleFacts));
    if (styleFacts.has(file)) loaded.add(file);
    for (const style of loaded)
      for (const sibling of loaded)
        if (sibling !== style) coLoadedStyles.get(style).add(sibling);
  }
  const siblingOnLoud = (style) =>
    [...coLoadedStyles.get(style)]
      .sort()
      .flatMap((sibling) => onLoudByStyle.get(sibling) ?? []);
  for (const file of files.filter((item) =>
    sourceExtensions.has(extname(item)),
  )) {
    const context = contexts.get(file);
    const own = await packageOf(dirname(file));
    for (const style of reachableStyleFiles(file, imports, styleFacts))
      styleConsumers.get(style).add(context);
    const fileDiagnostics = [];
    inspectTsx(
      file,
      contents.get(file),
      context.facts,
      reachableStyleFacts(file, imports, styleFacts),
      fileDiagnostics,
      adoption,
      await foreignTo(file),
      own?.directory,
      compilerOptionsFor(file, root, compilerOptions),
    );
    recordDiagnostics(fileDiagnostics, context);
  }
  for (const [file, consumers] of styleConsumers) {
    const applicableContexts = consumers.size
      ? consumers
      : new Set([contexts.get(file)]);
    for (const context of applicableContexts) {
      const fileDiagnostics = [];
      const own = await packageOf(dirname(file));
      await inspectCss(
        file,
        contents.get(file),
        context.facts,
        fileDiagnostics,
        new Map(),
        adoption,
        siblingOnLoud(file),
        await foreignTo(file),
        ownership === 'component'
          ? {
              ...jsxOwnershipEvidence(
                file,
                context.facts,
                contents,
                root,
                compilerOptions,
              ),
              ownPackage: own?.name,
            }
          : undefined,
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
      ...(item.evidence?.stylesheet
        ? {
            evidence: {
              ...item.evidence,
              stylesheet: portablePath(item.evidence.stylesheet),
            },
          }
        : {}),
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

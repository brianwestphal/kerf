import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import {
  helperCall,
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  relativeImportCandidates,
  UI_RULE_SCHEMA,
  UI_CONTRACT_LOAD_CODE,
} from '../ui-contract.js';

const MISSING_CODE = 'KUI-L401';
const CLEANUP_CODE = 'KUI-L402';

const retained = (call) => call.parent?.type !== 'ExpressionStatement';

const script = /\.(?:[cm]?[jt]sx?)$/;
const imports =
  /(?:^|[;\n])\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?['"]([^'"]+)['"]/g;
const dynamicImports = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const staticImports =
  /(?:^|[;\n])\s*import\s+(?:[^;'"`]*?\s+from\s*)?['"]([^'"]+)['"]/g;

function moduleImportSources(source) {
  const withoutComments = source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (comment) => comment.replace(/[^\n]/g, ' '),
  );
  return [...withoutComments.matchAll(staticImports)].map((match) => match[1]);
}

function entryModules(entryFile, currentFile, currentText) {
  const modules = new Map();
  const visit = (file) => {
    if (modules.has(file)) return;
    let source;
    try {
      source = file === currentFile ? currentText : readFileSync(file, 'utf8');
    } catch {
      return;
    }
    modules.set(file, source);
    for (const [, specifier] of [
      ...source.matchAll(imports),
      ...source.matchAll(dynamicImports),
    ]) {
      if (!specifier.startsWith('.')) continue;
      const dependency = relativeImportCandidates(file, specifier).find(
        (candidate) => script.test(candidate) && existsSync(candidate),
      );
      if (dependency) visit(dependency);
    }
  };
  visit(entryFile);
  return modules;
}

// Only the listbox mode needs wireChoiceChips. Static radio and toggle groups
// use native inputs; an expression whose value is unknown still needs wiring.
function choiceChipsNeedsWiring(attributes) {
  const multiple = attributes.find(
    (attribute) => attribute.name?.name === 'multiple',
  );
  if (!multiple) return false;
  if (!multiple.value) return true;
  if (multiple.value.type === 'Literal')
    return multiple.value.value !== 'toggle';
  const expression = multiple.value.expression;
  if (expression?.type === 'Literal')
    return expression.value !== 'toggle' && expression.value !== false;
  return true;
}

function sourceChoiceChipsNeedsWiring(source, name) {
  const opening = new RegExp(`<${name}(?=[\\s/>])`, 'g');
  for (const match of source.matchAll(opening)) {
    let braces = 0;
    let quote;
    let end = match.index + match[0].length;
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) {
        if (char === '\\') end++;
        else if (char === quote) quote = undefined;
      } else if (char === '"' || char === "'" || char === '`') quote = char;
      else if (char === '{') braces++;
      else if (char === '}') braces--;
      else if (char === '>' && braces === 0) break;
    }
    if (end === source.length) continue;
    const attributes = source.slice(match.index + match[0].length, end);
    const multiple = attributes.match(
      /(?:^|\s)multiple(?:\s*=\s*(?:\{\s*([^}]*)\s*\}|(["'])(.*?)\2))?(?=\s|\/|$)/,
    );
    if (!multiple) continue;
    if (
      multiple[3] === 'toggle' ||
      multiple[1]?.trim() === "'toggle'" ||
      multiple[1]?.trim() === '"toggle"' ||
      multiple[1]?.trim() === 'false'
    )
      continue;
    return true;
  }
  return false;
}

// The entry graph is read from disk because ESLint visits one source file at a
// time. Match only imported JSX names; an unrelated local tag cannot satisfy a
// catalog obligation. The current entry's in-memory text covers editor linting.
function moduleUses(source, file, contract) {
  const uses = new Set();
  const declarations = /\bimport\s+([^;'"`]*?)\s+from\s*['"]([^'"]+)['"]/g;
  for (const [, bindings, from] of source.matchAll(declarations)) {
    const direct = contract.imports.get(from);
    const keyFor = (name) =>
      direct ??
      (from === contract.package ? contract.exports.get(name) : undefined) ??
      contract.packageExports.get(`${from}\0${name}`) ??
      (from.startsWith('.')
        ? relativeImportCandidates(file, from)
            .map((candidate) =>
              contract.sourceExports.get(`${candidate}\0${name}`),
            )
            .find(Boolean)
        : undefined);
    const named = bindings.match(/\{([^}]*)\}/)?.[1];
    if (named)
      for (const part of named.split(',')) {
        const match = part.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        if (!match) continue;
        const [, imported, local = imported] = match;
        const key = keyFor(imported);
        if (
          key &&
          new RegExp(`<${local}(?=[\\s/>])`).test(source) &&
          (key !== '@kerfjs/ui:choice-chips' ||
            sourceChoiceChipsNeedsWiring(source, local))
        )
          uses.add(key);
      }
    const namespace = bindings.match(/\*\s+as\s+(\w+)/)?.[1];
    if (namespace) {
      const names = new Set([
        ...contract.exports.keys(),
        ...[...contract.packageExports.keys()].map((key) => key.split('\0')[1]),
      ]);
      for (const name of names) {
        const key = keyFor(name);
        if (
          key &&
          new RegExp(`<${namespace}\\.${name}(?=[\\s/>])`).test(source) &&
          (key !== '@kerfjs/ui:choice-chips' ||
            sourceChoiceChipsNeedsWiring(source, `${namespace}\\.${name}`))
        )
          uses.add(key);
      }
    }
    const defaultName = bindings.match(/^\s*(\w+)\s*(?:,|$)/)?.[1];
    if (
      direct &&
      defaultName &&
      new RegExp(`<${defaultName}(?=[\\s/>])`).test(source)
    )
      uses.add(direct);
  }
  return uses;
}

// ESLint supplies an AST only for the file currently being linted. For other
// files in an entry graph, recognize imported helper calls by their local
// binding (including aliases and namespace imports) and resolved source.
function moduleCalls(source, file, contract) {
  const calls = new Set();
  // Keep import declarations intact, but exclude comments and literals from
  // the call search so a documented example cannot satisfy an obligation.
  const callableText = source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|(['"`])(?:\\.|(?!\1)[^\\])*?\1/g,
    (match) => match.replace(/[^\n]/g, ' '),
  );
  const declarations = /\bimport\s+([^;'"`]*?)\s+from\s*['"]([^'"]+)['"]/g;
  for (const [, bindings, from] of source.matchAll(declarations)) {
    const named = bindings.match(/\{([^}]*)\}/)?.[1];
    if (named)
      for (const part of named.split(',')) {
        const match = part.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        if (!match) continue;
        const [, imported, local = imported] = match;
        if (new RegExp(`\\b${local}\\s*\\(`).test(callableText)) {
          const recognized = helperCall(
            { type: 'Identifier', name: local },
            { helpers: new Map([[local, { imported, source: from }]]) },
            contract,
            file,
          );
          if (recognized) calls.add(recognized.imported);
        }
      }
    const namespace = bindings.match(/\*\s+as\s+(\w+)/)?.[1];
    if (namespace)
      for (const [, helper] of callableText.matchAll(
        new RegExp(`\\b${namespace}\\.(\\w+)\\s*\\(`, 'g'),
      )) {
        const recognized = helperCall(
          {
            type: 'MemberExpression',
            computed: false,
            object: { type: 'Identifier', name: namespace },
            property: { type: 'Identifier', name: helper },
          },
          { namespaces: new Map([[namespace, from]]) },
          contract,
          file,
        );
        if (recognized) calls.add(recognized.imported);
      }
  }
  return calls;
}

// A module that can delegate: it imports delegate, delegateCapture, or
// delegateActions from kerfjs or kerfjs/actions.
const delegationImport =
  /\bimport\s*\{[^}]*\b(?:delegate|delegateCapture|delegateActions)\b[^}]*\}\s*from\s*['"]kerfjs(?:\/actions)?['"]/;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A required root-delegated action is handled when a module that imports a
// Kerf delegation API names it: as a quoted string (a delegateActions table
// key, an action() value, a selector such as `[data-action="name"]`) or as a
// bare table key. Cataloged component sources render their own data-action
// attributes, so they never count as the handler.
function handlesAction(modules, action, contract) {
  const quoted = new RegExp(
    `(['"\`])${escapeRegExp(action)}\\1|data-action=\\?["']${escapeRegExp(action)}\\?["']`,
  );
  const bareKey = /^[A-Za-z_$][\w$]*$/.test(action)
    ? new RegExp(`[{,]\\s*${action}\\s*:`)
    : undefined;
  for (const [file, source] of modules) {
    if (contract.componentSources?.has(file)) continue;
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (comment) =>
      comment.replace(/[^\n]/g, ' '),
    );
    if (!delegationImport.test(code)) continue;
    if (quoted.test(code) || bareKey?.test(code)) return true;
  }
  return false;
}

function applicationEntries(contract, filename, source) {
  const root = resolve(contract.cwd);
  const entries = [];
  for (const entry of contract.profile.wiring?.entries ?? []) {
    const client = typeof entry === 'string' ? [entry] : entry.client;
    const render = typeof entry === 'string' ? [] : entry.render;
    const roots = [...render, ...client].map((path) => resolve(root, path));
    if (roots.some((file) => relative(root, file).startsWith('..'))) continue;
    const modules = new Map();
    const wiringModules = new Map();
    for (const file of roots)
      for (const [module, text] of entryModules(file, filename, source)) {
        modules.set(module, text);
        if (client.some((path) => resolve(root, path) === file))
          wiringModules.set(module, text);
      }
    if (modules.size && wiringModules.size)
      entries.push({ file: resolve(root, client[0]), modules, wiringModules });
  }
  return entries;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require cataloged Kerf UI wiring and retained cleanup.',
      url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ui-wiring.md',
    },
    schema: UI_RULE_SCHEMA,
    messages: {
      config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
      missing:
        'KUI-L401: `{{component}}` requires `{{helper}}`; import and invoke the documented wiring contract.',
      action:
        'KUI-L401: `{{component}}` requires the application to handle `data-action="{{action}}"` with a root `delegate()` or `delegateActions()` listener.',
      cleanup:
        'KUI-L402: Retain or return the disposer from `{{helper}}`; use `void` only for an intentional page-lifetime binding.',
    },
  },
  create(context) {
    const contract = loadUiContract(context);
    const filename = context.filename ?? context.getFilename();
    let registry;
    const used = new Map();
    const calls = new Map();
    return {
      Program(node) {
        if (contract.error)
          context.report({
            node,
            messageId: 'config',
            data: { error: contract.error },
          });
        else registry = importRegistry(node, contract, filename);
      },
      JSXOpeningElement(node) {
        if (!registry) return;
        const key = jsxKey(node.name, registry, contract);
        if (
          key &&
          !used.has(key) &&
          (key !== '@kerfjs/ui:choice-chips' ||
            choiceChipsNeedsWiring(node.attributes))
        )
          used.set(key, node.name);
      },
      CallExpression(node) {
        if (!registry) return;
        const imported = helperCall(node.callee, registry, contract, filename);
        if (!imported) return;
        const list = calls.get(imported.imported) ?? [];
        list.push({
          node,
          returnsDisposer: imported.returnsDisposer !== false,
        });
        calls.set(imported.imported, list);
      },
      'Program:exit'(node) {
        if (!registry) return;
        const entries = applicationEntries(
          contract,
          filename,
          context.sourceCode.text,
        );
        const reachable = entries.filter(({ modules }) =>
          modules.has(filename),
        );
        const ownEntry = entries.find(({ file }) => file === filename);
        const reachableCalls = new Set(calls.keys());
        const reachableImports = new Set(registry.sources);
        if (ownEntry)
          for (const [file, source] of ownEntry.wiringModules)
            if (file !== filename) {
              for (const imported of moduleImportSources(source))
                reachableImports.add(imported);
              for (const helper of moduleCalls(source, file, contract))
                reachableCalls.add(helper);
            }
        const required = new Map(used);
        const requiredSources = new Map(
          [...used.keys()].map((key) => [key, new Set([filename])]),
        );
        if (ownEntry)
          for (const [file, source] of ownEntry.modules)
            for (const key of moduleUses(source, file, contract)) {
              if (!required.has(key)) required.set(key, node);
              const sources = requiredSources.get(key) ?? new Set();
              sources.add(file);
              requiredSources.set(key, sources);
            }
        for (const [key, usage] of required) {
          const entry = contract.entries.get(key);
          if (!entry?.wiring.required) continue;
          if (entry.wiring.scope === 'module' && !used.has(key)) continue;
          if (entry.wiring.scope !== 'module' && reachable.length && !ownEntry)
            continue;
          const missingIsExcepted =
            entry.wiring.scope === 'module'
              ? isExcepted(contract, MISSING_CODE, filename)
              : [...requiredSources.get(key)].every((file) =>
                  isExcepted(contract, MISSING_CODE, file),
                );
          const actionModules =
            entry.wiring.scope !== 'module' && ownEntry
              ? ownEntry.wiringModules
              : new Map([[filename, context.sourceCode.text]]);
          for (const action of entry.wiring.actions ?? [])
            if (
              !handlesAction(actionModules, action, contract) &&
              !missingIsExcepted
            )
              context.report({
                node: usage,
                messageId: 'action',
                data: { component: key, action },
              });
          for (const helper of entry.wiring.helpers) {
            if (helper.startsWith('@')) {
              if (
                !(
                  entry.wiring.scope === 'module'
                    ? registry.sources
                    : reachableImports
                ).has(helper) &&
                !missingIsExcepted
              )
                context.report({
                  node: usage,
                  messageId: 'missing',
                  data: { component: key, helper },
                });
              continue;
            }
            const providers = contract.helperProviders.get(helper) ?? new Set();
            const provided = [helper, ...providers].some((name) =>
              ownEntry ? reachableCalls.has(name) : calls.has(name),
            );
            if (!provided && !missingIsExcepted)
              context.report({
                node: usage,
                messageId: 'missing',
                data: { component: key, helper },
              });
          }
        }
        if (!isExcepted(contract, CLEANUP_CODE, filename)) {
          const disposerHelpers = new Set(
            [...contract.entries.values()]
              .filter((entry) => entry.wiring?.required)
              .flatMap((entry) => entry.wiring.helpers)
              .filter((helper) => !helper.startsWith('@')),
          );
          for (const [helper, helperCalls] of calls)
            if (disposerHelpers.has(helper))
              for (const { node: call, returnsDisposer } of helperCalls)
                if (returnsDisposer && !retained(call))
                  context.report({
                    node: call,
                    messageId: 'cleanup',
                    data: { helper },
                  });
        }
      },
    };
  },
};

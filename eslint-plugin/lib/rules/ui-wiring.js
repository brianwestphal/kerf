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
        if (key && new RegExp(`<${local}(?=[\\s/>])`).test(source))
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
          new RegExp(`<${namespace}\\.${name}(?=[\\s/>])`).test(source)
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

function applicationEntries(contract, filename, source) {
  const root = resolve(contract.cwd);
  const entries = [];
  for (const path of contract.profile.wiring?.entries ?? []) {
    const file = resolve(root, path);
    if (relative(root, file).startsWith('..')) continue;
    const modules = entryModules(file, filename, source);
    if (modules.size) entries.push({ file, modules });
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
        if (key && !used.has(key)) used.set(key, node.name);
      },
      CallExpression(node) {
        if (!registry) return;
        const imported = helperCall(node.callee, registry, contract, filename);
        if (!imported) return;
        const list = calls.get(imported.imported) ?? [];
        list.push({ node, source: imported.source });
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
        if (ownEntry)
          for (const [file, source] of ownEntry.modules)
            if (file !== filename)
              for (const helper of moduleCalls(source, file, contract))
                reachableCalls.add(helper);
        const required = new Map(used);
        if (ownEntry)
          for (const [file, source] of ownEntry.modules)
            for (const key of moduleUses(source, file, contract))
              if (!required.has(key)) required.set(key, node);
        for (const [key, usage] of required) {
          const entry = contract.entries.get(key);
          if (!entry?.wiring.required) continue;
          if (entry.wiring.scope === 'module' && !used.has(key)) continue;
          if (entry.wiring.scope !== 'module' && reachable.length && !ownEntry)
            continue;
          for (const helper of entry.wiring.helpers) {
            if (helper.startsWith('@')) {
              if (
                !registry.sources.has(helper) &&
                !isExcepted(contract, MISSING_CODE, filename)
              )
                context.report({
                  node: usage,
                  messageId: 'missing',
                  data: { component: key, helper },
                });
              continue;
            }
            const helperCalls = calls.get(helper) ?? [];
            if (
              !(ownEntry ? reachableCalls.has(helper) : helperCalls.length) &&
              !isExcepted(contract, MISSING_CODE, filename)
            )
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
              for (const { node: call } of helperCalls)
                if (!retained(call))
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

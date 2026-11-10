// Node-only TypeScript language service for parameter expressions. This module
// is loaded by the dev-server/CLI, never by the browser view runtime.
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

import { createPropsContext, describeType } from '../props/component-props.mjs';
import { generateView } from './generate.mjs';
import { propertyName, typeText } from './contract.mjs';
import { validateView } from './validate.mjs';
import {
  containedTypeExpression,
  hasTypeExpressions,
  typeExpressionText,
  typeSourcePath,
} from './type-expression.mjs';

const PREFIX = 'type __KerfParameter = ';
const SUFFIX = ';\nexport {};\n';
const message = (item) =>
  ts.flattenDiagnosticMessageText(item.messageText, '\n');
const posix = (path) => path.split(sep).join('/');
const sourceModule = (from, file) => {
  const path = posix(relative(dirname(from), file)).replace(
    /\.(?:d\.)?[cm]?tsx?$/,
    '.js',
  );
  return path.startsWith('.') ? path : `./${path}`;
};
const inside = (root, file) => {
  const path = relative(root, file);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
};

const printType = (node, source) => {
  const normalized = ts.transform(node, [
    (context) => {
      const visit = (item) => {
        if (
          ts.isImportTypeNode(item) &&
          ts.isLiteralTypeNode(item.argument) &&
          ts.isStringLiteral(item.argument.literal)
        ) {
          return ts.factory.updateImportTypeNode(
            item,
            ts.factory.createLiteralTypeNode(
              ts.factory.createStringLiteral(item.argument.literal.text),
            ),
            item.attributes,
            item.qualifier,
            item.typeArguments,
            item.isTypeOf,
          );
        }
        return ts.visitEachChild(item, visit, context);
      };
      return (item) => ts.visitNode(item, visit);
    },
  ]);
  const result = ts
    .createPrinter()
    .printNode(ts.EmitHint.Unspecified, normalized.transformed[0], source);
  normalized.dispose();
  return result;
};

/** The nearest config owns a file's project context for CLI checks. */
export function projectTypeRoot(path) {
  const config = ts.findConfigFile(
    dirname(resolve(path)),
    ts.sys.fileExists,
    'tsconfig.json',
  );
  return config ? dirname(config) : dirname(resolve(path));
}

function inlineShape(type, definitions, seen = new Set(), depth = 0) {
  if (type.kind === 'ref') {
    if (seen.has(type.ref) || depth > 8)
      return { kind: 'unknown', text: type.text };
    return inlineShape(
      definitions.get(type.ref) ?? { kind: 'unknown' },
      definitions,
      new Set([...seen, type.ref]),
      depth + 1,
    );
  }
  return Object.fromEntries(
    Object.entries(type).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.map((item) =>
            item?.kind
              ? inlineShape(item, definitions, seen, depth + 1)
              : item?.type
                ? {
                    ...item,
                    type: inlineShape(item.type, definitions, seen, depth + 1),
                  }
                : item,
          )
        : value?.kind
          ? inlineShape(value, definitions, seen, depth + 1)
          : value,
    ]),
  );
}

/** One reusable language service rooted at the project's own tsconfig and files. */
export function createProjectTypeService(root) {
  root = resolve(root);
  const readConfig = () => {
    const path = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
    return path && inside(root, path)
      ? ts.getParsedCommandLineOfConfigFile(
          path,
          {},
          { ...ts.sys, onUnRecoverableConfigFileDiagnostic() {} },
        )
      : undefined;
  };
  let config = readConfig();
  const compilerOptions = () => ({
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    ...config?.options,
    noUnusedLocals: false,
    noUnusedParameters: false,
    skipLibCheck: true,
    noEmit: true,
    ignoreDeprecations: '6.0',
  });
  let options = compilerOptions();
  let file = resolve(root, '.__kerf_parameter__.ts');
  let content = '';
  let version = 0;
  const host = {
    ...ts.sys,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getCurrentDirectory: () => root,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (value) => ts.getDefaultLibFilePath(value),
    getProjectVersion: () => String(version),
    getScriptFileNames: () => [...(config?.fileNames ?? []), file],
    getScriptVersion: (name) => {
      if (name === file) return String(version);
      try {
        return String(statSync(name).mtimeMs);
      } catch {
        return 'missing';
      }
    },
    getScriptSnapshot: (name) => {
      if (name === file) return ts.ScriptSnapshot.fromString(content);
      try {
        return ts.ScriptSnapshot.fromString(readFileSync(name, 'utf8'));
      } catch {
        return undefined;
      }
    },
    fileExists: (name) => name === file || ts.sys.fileExists(name),
    readFile: (name) => (name === file ? content : ts.sys.readFile(name)),
  };
  const service = ts.createLanguageService(host);
  const set = (source, text) => {
    if (!typeSourcePath(source) || !source.endsWith('.kui.json'))
      throw new Error('A type needs a project-relative .kui.json source.');
    file = resolve(root, dirname(source), '.__kerf_parameter__.ts');
    config = readConfig();
    options = compilerOptions();
    content = text;
    version += 1;
  };
  const diagnostics = () => [
    ...(config?.errors ?? []).filter(
      (item) => item.code !== 18002 && item.code !== 18003,
    ),
    ...service.getCompilerOptionsDiagnostics(),
    ...service.getSyntacticDiagnostics(file),
    ...service.getSemanticDiagnostics(file),
  ];
  const expression = () => {
    const source = service.getProgram().getSourceFile(file);
    const [alias, marker] = source.statements;
    if (
      source.parseDiagnostics.length ||
      source.statements.length !== 2 ||
      !ts.isTypeAliasDeclaration(alias) ||
      alias.name.text !== '__KerfParameter' ||
      !ts.isExportDeclaration(marker) ||
      marker.exportClause?.elements?.length !== 0
    )
      return undefined;
    return { source, alias };
  };
  const exportsByName = () => {
    const program = service.getProgram();
    const checker = program.getTypeChecker();
    const found = new Map();
    for (const source of program.getSourceFiles()) {
      if (
        source.fileName === file ||
        !inside(root, source.fileName) ||
        source.fileName.includes(`${sep}node_modules${sep}`)
      )
        continue;
      const symbol = checker.getSymbolAtLocation(source);
      if (!symbol) continue;
      for (const item of checker.getExportsOfModule(symbol)) {
        const actual =
          item.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(item)
            : item;
        if (
          !(
            actual.flags &
            (ts.SymbolFlags.Type |
              ts.SymbolFlags.Namespace |
              ts.SymbolFlags.Value)
          )
        )
          continue;
        const entries = found.get(item.name) ?? [];
        if (!entries.some((entry) => entry.symbol === actual))
          entries.push({ source: source.fileName, symbol: actual });
        found.set(item.name, entries);
      }
    }
    return found;
  };
  const referenceTokens = (node, source, start) => {
    const references = [];
    const walk = (child) => {
      if (
        ts.isImportTypeNode(child) &&
        ts.isLiteralTypeNode(child.argument) &&
        ts.isStringLiteral(child.argument.literal)
      ) {
        const literal = child.argument.literal;
        const module = literal.text;
        if (
          isAbsolute(module) ||
          (module.startsWith('.') &&
            !inside(root, resolve(dirname(file), module)))
        )
          throw new Error(
            'A parameter type import must stay inside the project.',
          );
        if (module.startsWith('.')) {
          const resolved = ts.resolveModuleName(
            module,
            file,
            options,
            host,
          ).resolvedModule;
          if (
            resolved &&
            !inside(realpathSync(root), realpathSync(resolved.resolvedFileName))
          )
            throw new Error(
              'A parameter type import must stay inside the project.',
            );
        }
        references.push({
          start: literal.getStart(source) - start,
          length: literal.end - literal.getStart(source),
          module,
        });
      }
      ts.forEachChild(child, walk);
    };
    walk(node);
    return references.sort((a, b) => a.start - b.start);
  };

  /** Parse, resolve and format an expression; unresolved names are never accepted. */
  const declaredExpression = (type, catalog, source) => {
    if (type.kind === 'content') return 'import("kerfjs").SafeHtml';
    if (type.kind === 'prop') {
      const owner = catalog?.components.get(type.component)?.component;
      if (!owner?.import || !owner.export)
        throw new Error('The parameter names an unavailable component prop.');
      let module = owner.import;
      if (isAbsolute(module)) {
        if (!inside(root, module))
          throw new Error('The component prop must belong to this project.');
        module = sourceModule(resolve(root, source), module);
      }
      return `Parameters<typeof import(${JSON.stringify(module)}).${owner.export}>[0][${JSON.stringify(type.prop)}]`;
    }
    if (type.kind === 'array')
      return `ReadonlyArray<${declaredExpression(type.items, catalog, source)}>`;
    if (type.kind === 'object')
      return `{ ${(type.props ?? []).map((prop) => `readonly ${propertyName(prop.name)}${prop.required ? '' : '?'}: ${declaredExpression(prop.type, catalog, source)};`).join(' ')} }`;
    return typeText(type);
  };
  function analyze({
    source,
    text,
    cursor = text.length,
    autoImport = true,
    declared,
    catalog,
  }) {
    if (typeof text !== 'string' || text.length > 16384)
      throw new Error('Type expressions are at most 16384 characters.');
    if (declared && !declared.typescript && text === typeText(declared))
      return analyze({
        source,
        text: declaredExpression(declared, catalog, source),
      });
    cursor = Number.isInteger(cursor)
      ? Math.max(0, Math.min(cursor, text.length))
      : text.length;
    set(source, PREFIX + text + SUFFIX);
    const syntax = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
    );
    if (ts.isTypeAliasDeclaration(syntax.statements[0]))
      referenceTokens(syntax.statements[0].type, syntax, PREFIX.length);
    const parsed = expression();
    const completions = service.getCompletionsAtPosition(
      file,
      PREFIX.length + Math.max(0, Math.min(cursor, text.length)),
      {
        includeCompletionsForModuleExports: true,
        includeCompletionsWithInsertText: true,
      },
    );
    const fragment = /[A-Za-z_$][\w$]*$/.exec(text.slice(0, cursor));
    const start = fragment ? cursor - fragment[0].length : cursor;
    const names = exportsByName();
    const suggestions = (completions?.entries ?? [])
      .filter(
        (entry) =>
          [
            'keyword',
            'type',
            'interface',
            'class',
            'enum',
            'type parameter',
            'module',
            'const',
            'function',
            'var',
            'alias',
          ].includes(entry.kind) &&
          (!fragment ||
            entry.name.toLowerCase().startsWith(fragment[0].toLowerCase())),
      )
      .slice(0, 30)
      .map((entry) => {
        let inserted = entry.name;
        let owner = entry.source;
        if (owner && isAbsolute(owner)) owner = sourceModule(file, owner);
        if (owner) inserted = `import(${JSON.stringify(owner)}).${entry.name}`;
        return {
          name: entry.name,
          source: owner,
          text: text.slice(0, start) + inserted + text.slice(cursor),
          cursor: start + inserted.length,
        };
      });
    if (!parsed || !containedTypeExpression(text))
      return {
        diagnostics: [
          { message: 'Enter one complete TypeScript type expression.' },
        ],
        suggestions,
      };
    // A unique project export can be referenced by its short name. Keep its
    // portable module identity explicit in the canonical expression we persist.
    if (autoImport && diagnostics().some((item) => item.code === 2304)) {
      const missing = new Set(
        diagnostics()
          .filter((item) => item.code === 2304)
          .map((item) => item.start),
      );
      let changed = false;
      const result = ts.transform(parsed.alias.type, [
        (context) => {
          const visit = (node) => {
            if (ts.isTypeReferenceNode(node) || ts.isTypeQueryNode(node)) {
              const name = ts.isTypeReferenceNode(node)
                ? node.typeName
                : node.exprName;
              let head = name;
              while (ts.isQualifiedName(head)) head = head.left;
              const matches = missing.has(head.getStart(parsed.source))
                ? (names.get(head.text) ?? []).filter(
                    (item) =>
                      item.symbol.flags &
                      (ts.isTypeQueryNode(node)
                        ? ts.SymbolFlags.Value | ts.SymbolFlags.Namespace
                        : ts.SymbolFlags.Type | ts.SymbolFlags.Namespace),
                  )
                : [];
              if (
                matches.length &&
                matches.every((item) => item.symbol === matches[0].symbol)
              ) {
                const owner = matches.sort(
                  (a, b) => a.source.length - b.source.length,
                )[0].source;
                changed = true;
                return ts.factory.createImportTypeNode(
                  ts.factory.createLiteralTypeNode(
                    ts.factory.createStringLiteral(sourceModule(file, owner)),
                  ),
                  undefined,
                  name,
                  node.typeArguments,
                  ts.isTypeQueryNode(node),
                );
              }
            }
            return ts.visitEachChild(node, visit, context);
          };
          return (node) => ts.visitNode(node, visit);
        },
      ]);
      const canonical = printType(result.transformed[0], parsed.source);
      result.dispose();
      if (changed) {
        const analyzed = analyze({
          source,
          text: canonical,
          cursor: canonical.length,
          autoImport: false,
        });
        return { ...analyzed, suggestions };
      }
    }
    const errors = diagnostics().filter(
      (item) => item.category === ts.DiagnosticCategory.Error,
    );
    if (errors.length)
      return {
        diagnostics: errors.map((item) => ({
          message: message(item),
          start: Math.max(0, (item.start ?? PREFIX.length) - PREFIX.length),
          length: item.length ?? 0,
        })),
        suggestions,
      };
    const printed = printType(parsed.alias.type, parsed.source);
    set(source, PREFIX + printed + SUFFIX);
    const formatted = expression();
    const program = service.getProgram();
    const checker = program.getTypeChecker();
    const context = createPropsContext(checker, root);
    const shape = inlineShape(
      describeType(context, checker.getTypeFromTypeNode(formatted.alias.type)),
      context.definitions,
    );
    const references = referenceTokens(
      formatted.alias.type,
      formatted.source,
      PREFIX.length,
    );
    return {
      diagnostics: [],
      suggestions,
      type: { ...shape, typescript: { text: printed, source, references } },
    };
  }

  /** Refresh cached projections and compile actual generated bindings in context. */
  function validateDocument(document, catalog, source, options = {}) {
    if (!hasTypeExpressions(document)) return { diagnostics: [], document };
    const params = { ...document.params };
    const errors = [];
    for (const [name, param] of Object.entries(params)) {
      if (!param.type.typescript) continue;
      let result;
      try {
        const metadata = param.type.typescript;
        set(metadata.source, PREFIX + metadata.text + SUFFIX);
        const syntax = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true,
        );
        const alias = syntax.statements[0];
        if (
          !containedTypeExpression(metadata.text) ||
          syntax.parseDiagnostics.length ||
          syntax.statements.length !== 2 ||
          !ts.isTypeAliasDeclaration(alias)
        )
          throw new Error('Enter one TypeScript type expression.');
        const text = printType(alias.type, syntax);
        set(metadata.source, PREFIX + text + SUFFIX);
        const printed = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true,
        );
        const carrier = {
          typescript: {
            ...metadata,
            text,
            references: referenceTokens(
              printed.statements[0].type,
              printed,
              PREFIX.length,
            ),
          },
        };
        result = analyze({ source, text: typeExpressionText(carrier, source) });
      } catch (error) {
        result = { diagnostics: [{ message: error.message }] };
      }
      errors.push(
        ...result.diagnostics.map((item) => ({
          code: 'KUI-V018',
          path: `$.params.${name}.type`,
          message: item.message,
        })),
      );
      if (result.type) params[name] = { ...param, type: result.type };
    }
    const next = { ...document, params };
    if (errors.length) return { diagnostics: errors, document: next };
    const resolveView =
      options.resolveView ??
      ((_src, path) => {
        const target = resolve(root, dirname(source), path);
        if (!inside(root, target) || !target.endsWith('.kui.json'))
          return undefined;
        try {
          return JSON.parse(readFileSync(target, 'utf8'));
        } catch {
          return undefined;
        }
      });
    const structural = validateView(next, catalog, { resolveView });
    if (!structural.valid)
      return { diagnostics: structural.diagnostics, document: next };
    const generated = generateView(next, catalog, {
      source,
      typeSource: source,
      importFrom: resolve(root, dirname(source)),
      resolveView,
    });
    const defaults = Object.entries(params)
      .flatMap(([name, param], index) =>
        param.type.typescript && Object.hasOwn(param, 'default')
          ? [
              `const __kerfDefault${index}: ${typeExpressionText(param.type, source)} = ${JSON.stringify(param.default)}; // ${name}`,
            ]
          : [],
      )
      .join('\n');
    set(source, generated.code + '\n' + defaults);
    return {
      document: next,
      diagnostics: diagnostics()
        .filter((item) => item.category === ts.DiagnosticCategory.Error)
        .map((item) => ({
          code: 'KUI-V018',
          path: '$.params',
          message: message(item),
        })),
    };
  }
  return { analyze, validateDocument, dispose: () => service.dispose() };
}

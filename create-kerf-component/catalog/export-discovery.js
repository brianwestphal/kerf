// Syntax-aware discovery of a source file's named exports, using the project's
// installed TypeScript parser so JSX text, nested scopes, comments, strings,
// templates, and regex literals cannot impersonate an export.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

let typescript;

function typescriptApi() {
  if (typescript) return typescript;
  try {
    typescript = createRequire(import.meta.url)('typescript');
    return typescript;
  } catch {
    throw new Error(
      'TypeScript is required for syntax-aware export verification; install it in this project (npm install --save-dev typescript) before catalog generation.',
    );
  }
}

function hasModifier(ts, node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function bindingNames(ts, name, names) {
  if (ts.isIdentifier(name)) names.add(name.text);
  else
    for (const element of name.elements ?? [])
      if (!ts.isOmittedExpression(element))
        bindingNames(ts, element.name, names);
}

function parseSource(ts, source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') || fileName.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length) {
    const diagnostic = sourceFile.parseDiagnostics[0];
    const point = sourceFile.getLineAndCharacterOfPosition(
      diagnostic.start ?? 0,
    );
    throw new Error(
      `${fileName}:${point.line + 1}:${point.character + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    );
  }
  return sourceFile;
}

// The names one top-level statement exports. Default exports have no name a
// catalog can refer to, and `export *` re-exports are not followed.
function statementExports(ts, statement, names) {
  if (ts.isExportDeclaration(statement)) {
    if (statement.exportClause && ts.isNamedExports(statement.exportClause))
      for (const element of statement.exportClause.elements)
        names.add(element.name.text);
    return;
  }
  if (
    !hasModifier(ts, statement, ts.SyntaxKind.ExportKeyword) ||
    hasModifier(ts, statement, ts.SyntaxKind.DefaultKeyword)
  )
    return;
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations)
      bindingNames(ts, declaration.name, names);
  } else if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)) &&
    statement.name
  )
    names.add(statement.name.text);
}

/** The named exports of TypeScript/TSX `source`; throws on a syntax error. */
export function exportedNamesFromSource(source, fileName = 'component.tsx') {
  const ts = typescriptApi();
  const sourceFile = parseSource(ts, source, fileName);
  const names = new Set();
  for (const statement of sourceFile.statements)
    statementExports(ts, statement, names);
  return names;
}

export function exportedNamesFromFile(path) {
  return exportedNamesFromSource(readFileSync(path, 'utf8'), path);
}

/** The `src/` file a `./dist/…` package export is built from, or null. */
export function sourceEntryForExport(packageRoot, definition) {
  const target =
    typeof definition === 'string'
      ? definition
      : (definition?.import ?? definition?.default);
  if (typeof target !== 'string' || !target.startsWith('./dist/')) return null;
  const stem = target.slice('./dist/'.length).replace(/\.(?:mjs|cjs|js)$/, '');
  for (const extension of ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs']) {
    const candidate = join(packageRoot, 'src', `${stem}${extension}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

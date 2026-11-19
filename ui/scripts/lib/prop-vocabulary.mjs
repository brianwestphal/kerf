import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import ts from 'typescript';

const membersOf = (type) => (type.isUnion() ? type.types : [type]);
const isNullish = (type) =>
  (type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) !== 0;

function compilerOptions(root) {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    resolve(root, 'tsconfig.json'),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
  );
  return { ...(parsed?.options ?? {}), noEmit: true, skipLibCheck: true };
}

function exportSymbol(checker, sourceFile, name) {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const found = moduleSymbol
    ? checker
        .getExportsOfModule(moduleSymbol)
        .find((symbol) => symbol.getName() === name)
    : undefined;
  if (!found) return undefined;
  return found.getFlags() & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(found)
    : found;
}

/** The values of a pure literal union (`'a' | 'b'`), or undefined otherwise. */
function literalValues(type) {
  const members = membersOf(type).filter((member) => !isNullish(member));
  if (
    members.length === 0 ||
    !members.every(
      (member) => member.isStringLiteral() || member.isNumberLiteral(),
    )
  )
    return undefined;
  return members.map((member) => member.value);
}

/**
 * Reads, from the component source files, the literal values of the named
 * props on every public Kerf component export in the catalog. A prop counts
 * only when its type is a pure string/number literal union; props of a
 * variant union merge across the variants that declare them. Returns
 * `{ components: [{ export, props: [{ name, values }] }], problems }`.
 */
export function readPropLiterals(root, catalog, propNames) {
  const problems = [];
  const specs = catalog.entries
    .filter(
      (entry) =>
        entry.source === 'kerf' &&
        entry.kind === 'component' &&
        entry.delivery?.browserImport,
    )
    .map((entry) => {
      const subpath = entry.delivery.browserImport.slice(
        catalog.package.length + 1,
      );
      const file = ['tsx', 'ts']
        .map((extension) => resolve(root, 'src', `${subpath}.${extension}`))
        .find((path) => existsSync(path));
      if (!file) problems.push(`${entry.id}: no source for ${subpath}`);
      return { entry, file };
    })
    .filter((spec) => spec.file);
  const program = ts.createProgram(
    specs.map((spec) => spec.file),
    compilerOptions(root),
  );
  const checker = program.getTypeChecker();
  const components = [];
  for (const { entry, file } of specs) {
    const sourceFile = program.getSourceFile(file);
    for (const name of entry.publicExports ?? []) {
      if (!/^[A-Z]/.test(name)) continue;
      const symbol = exportSymbol(checker, sourceFile, name);
      if (!symbol || !(symbol.getFlags() & ts.SymbolFlags.Function)) continue;
      const [signature] = checker.getTypeOfSymbol(symbol).getCallSignatures();
      const [parameter] = signature?.getParameters() ?? [];
      if (!parameter) continue;
      const variants = membersOf(checker.getTypeOfSymbol(parameter)).filter(
        (member) => !isNullish(member),
      );
      const props = [];
      for (const propName of propNames) {
        const declared = variants
          .map((variant) => checker.getPropertyOfType(variant, propName))
          .filter(Boolean);
        if (declared.length === 0) continue;
        const values = new Set();
        let literal = true;
        for (const prop of declared) {
          const found = literalValues(checker.getTypeOfSymbol(prop));
          if (!found) literal = false;
          else for (const value of found) values.add(value);
        }
        if (literal) props.push({ name: propName, values: [...values] });
      }
      components.push({ export: name, props });
    }
  }
  return { components, problems };
}

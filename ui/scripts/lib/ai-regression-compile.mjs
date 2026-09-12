import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, posix, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const codeExtension = /(?:\.d)?\.tsx?$/;
const acceptedExtension = /(?:\.d)?\.tsx?$|\.css$/;

function safeResponsePath(name) {
  if (!name || name.includes('\\') || posix.isAbsolute(name) || posix.normalize(name) !== name || name.startsWith('../') || !acceptedExtension.test(name)) {
    throw new Error(`Unsafe or unsupported response file path: ${name}`);
  }
  return name;
}

async function declarationSet(root) {
  const packages = [
    { name: '@kerfjs/ui', root, manifest: resolve(root, 'package.json') },
    { name: 'kerfjs', root: resolve(root, 'node_modules/kerfjs'), manifest: resolve(root, 'node_modules/kerfjs/package.json') },
  ];
  return Promise.all(packages.map(async (entry) => {
    const manifest = JSON.parse(await readFile(entry.manifest, 'utf8'));
    const dist = resolve(entry.root, 'dist');
    const files = (await readdir(dist, { recursive: true, withFileTypes: true }))
      .filter((file) => file.isFile() && file.name.endsWith('.d.ts'))
      .map((file) => resolve(file.parentPath ?? file.path, file.name))
      .sort();
    const hash = createHash('sha256');
    for (const file of files) {
      hash.update(relative(entry.root, file));
      hash.update('\0');
      hash.update(await readFile(file));
      hash.update('\0');
    }
    return { name: entry.name, version: manifest.version, declarationSetSha256: hash.digest('hex') };
  }));
}

function diagnosticRecord(root, virtualRoot, diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (!diagnostic.file || diagnostic.start === undefined) return { code: diagnostic.code, message };
  const location = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const fileName = diagnostic.file.fileName.startsWith(`${virtualRoot}${sep}`)
    ? `response/${relative(virtualRoot, diagnostic.file.fileName)}`
    : diagnostic.file.fileName.startsWith(`${root}${sep}`)
      ? relative(root, diagnostic.file.fileName)
      : basename(diagnostic.file.fileName);
  return { code: diagnostic.code, file: fileName, line: location.line + 1, column: location.character + 1, message };
}

const isWithin = (root, fileName) => fileName === root || fileName.startsWith(`${root}${sep}`);

export async function compileAiRegressionResponse(root, response, responseText = `${JSON.stringify(response, null, 2)}\n`) {
  root = resolve(root);
  if (!response?.files || typeof response.files !== 'object' || Array.isArray(response.files)) throw new Error('Response must contain a files object');
  const responseSha256 = sha256(responseText);
  const virtualRoot = resolve(root, '.ai-regression-compile', responseSha256.slice(0, 12));
  const virtualFiles = new Map();
  for (const [name, source] of Object.entries(response.files)) {
    safeResponsePath(name);
    if (typeof source !== 'string') throw new Error(`Response file is not a string: ${name}`);
    if (codeExtension.test(name)) virtualFiles.set(resolve(virtualRoot, name), source);
  }
  if (!virtualFiles.size) throw new Error('Response contains no .ts, .tsx, or .d.ts files to compile');
  const ambientPath = resolve(virtualRoot, 'response-assets.d.ts');
  virtualFiles.set(ambientPath, "declare module '*.css';\n");
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: 'kerfjs',
    baseUrl: root,
    ignoreDeprecations: '6.0',
    paths: {
      '@kerfjs/ui': ['dist/index.d.ts'],
      '@kerfjs/ui/*': ['dist/*.d.ts'],
      kerfjs: ['node_modules/kerfjs/dist/index.d.ts'],
      'kerfjs/*': ['node_modules/kerfjs/dist/*.d.ts'],
    },
    types: [],
  };
  const host = ts.createCompilerHost(compilerOptions, true);
  const readDefault = host.readFile.bind(host);
  const existsDefault = host.fileExists.bind(host);
  host.readFile = (fileName) => virtualFiles.get(fileName) ?? (isWithin(root, fileName) ? readDefault(fileName) : undefined);
  host.fileExists = (fileName) => virtualFiles.has(fileName) || (isWithin(root, fileName) && existsDefault(fileName));
  host.getSourceFile = (fileName, languageVersion) => {
    const source = host.readFile(fileName);
    return source === undefined ? undefined : ts.createSourceFile(fileName, source, languageVersion, true);
  };
  const program = ts.createProgram({ rootNames: [...virtualFiles.keys()], options: compilerOptions, host });
  const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => diagnosticRecord(root, virtualRoot, diagnostic));
  const serializedOptions = {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    strict: true, noEmit: true, skipLibCheck: true, jsx: 'react-jsx', jsxImportSource: 'kerfjs',
    baseUrl: '<ui-root>',
    paths: {
      '@kerfjs/ui': ['dist/index.d.ts'],
      '@kerfjs/ui/*': ['dist/*.d.ts'],
      kerfjs: ['node_modules/kerfjs/dist/index.d.ts'],
      'kerfjs/*': ['node_modules/kerfjs/dist/*.d.ts'],
    },
    ignoreDeprecations: '6.0', types: [],
  };
  return {
    schemaVersion: 1,
    caseId: response.caseId ?? null,
    responseSha256,
    compilerOptionsSha256: sha256(JSON.stringify(serializedOptions)),
    typescriptVersion: ts.version,
    packages: await declarationSet(root),
    compiledFiles: virtualFiles.size - 1,
    passed: diagnostics.length === 0,
    diagnostics,
  };
}

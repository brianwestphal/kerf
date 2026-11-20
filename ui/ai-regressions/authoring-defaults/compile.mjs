import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ts from 'typescript';
import { validateAiRegressionResponseV3 } from '../../scripts/lib/ai-regression-contract-v3.mjs';

export const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../..');
const benchmark = path.join(repository, 'bench/authoring-defaults');
const dependencies = path.join(benchmark, 'node_modules');
const requireBench = createRequire(path.join(benchmark, 'package.json'));
const esbuild = requireBench('esbuild');
const babel = requireBench('@babel/core');
const solidPreset = requireBench('babel-preset-solid');
const packages = {
  kerf: [
    'kerfjs',
    'kerfjs/list',
    'kerfjs/array-signal',
    'kerfjs/actions',
    '@kerfjs/ui/combobox',
    '@kerfjs/ui/wire-comboboxes',
  ],
  solid: [
    'solid-js',
    'solid-js/web',
    'solid-js/store',
    '@kobalte/core/combobox',
  ],
  react: ['react', 'react-dom', 'react-dom/client', 'react-aria-components'],
};
const kerfDist = path.join(repository, 'dist');
const uiDist = path.join(repository, 'ui/dist');
function paths(framework) {
  const alias = {};
  for (const name of packages[framework]) {
    if (name === 'kerfjs' || name.startsWith('kerfjs/'))
      alias[name] = [
        path.join(kerfDist, (name.split('/')[1] ?? 'index') + '.d.ts'),
      ];
    else if (name.startsWith('@kerfjs/ui/'))
      alias[name] = [path.join(uiDist, name.split('/')[2] + '.d.ts')];
  }
  if (framework === 'kerf')
    alias['kerfjs/jsx-runtime'] = [path.join(kerfDist, 'jsx-runtime.d.ts')];
  if (framework === 'solid')
    Object.assign(alias, {
      'solid-js': [dependencies + '/solid-js/types/index.d.ts'],
      'solid-js/web': [dependencies + '/solid-js/web/types/index.d.ts'],
      'solid-js/store': [dependencies + '/solid-js/store/types/index.d.ts'],
      'solid-js/jsx-runtime': [dependencies + '/solid-js/jsx-runtime.d.ts'],
      '@kobalte/core/combobox': [
        dependencies + '/@kobalte/core/dist/combobox/index.d.ts',
      ],
    });
  if (framework === 'react')
    Object.assign(alias, {
      react: [directory + '/node_modules/@types/react/index.d.ts'],
      'react/jsx-runtime': [
        directory + '/node_modules/@types/react/jsx-runtime.d.ts',
      ],
      'react-dom': [directory + '/node_modules/@types/react-dom/index.d.ts'],
      'react-dom/client': [
        directory + '/node_modules/@types/react-dom/client.d.ts',
      ],
      'react-aria-components': [
        dependencies + '/react-aria-components/dist/types.d.ts',
      ],
    });
  return alias;
}
export function inspectSource(id, framework, source) {
  const errors = validateAiRegressionResponseV3(
    { id, editableFiles: ['app.tsx'] },
    { caseId: id, files: { 'app.tsx': source } },
  );
  if (errors.length) throw Error(errors.join('; '));
  const file = ts.createSourceFile(
    'app.tsx',
    source,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
  if (
    file.referencedFiles.length ||
    file.typeReferenceDirectives.length ||
    file.libReferenceDirectives.length
  )
    throw Error('External references are outside the packet');
  const imports = [];
  function inspect(node) {
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(file) === 'require')
    )
      throw Error('Only static package imports are permitted');
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      const name = node.moduleSpecifier.text;
      if (!packages[framework].includes(name))
        throw Error('Unpermitted package ' + name);
      imports.push(name);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(file);
  return imports;
}
export async function typecheck(framework, source) {
  const scratch = await mkdtemp(path.join(tmpdir(), 'study-types-'));
  try {
    await writeFile(path.join(scratch, 'app.tsx'), source);
    // Cross-check the callable public interface in addition to the author's own types.
    await writeFile(
      path.join(scratch, 'interface.ts'),
      `import {mountStudy} from './app';type Mode='incoming'|'outgoing';type R={id:number,label:string};const mount:(r:HTMLElement,c:(s:string)=>void,m:(k:'row')=>void)=>{count:(s:Mode,n:number)=>void;mode:(s:Mode)=>void;select:(id:number)=>void;refetch:(rs:R[])=>void;swap:()=>void;open:()=>void;close:()=>void;dispose:()=>void}=mountStudy;void mount;`,
    );
    const config = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
        jsx: framework === 'solid' ? 'preserve' : 'react-jsx',
        jsxImportSource:
          framework === 'kerf'
            ? 'kerfjs'
            : framework === 'solid'
              ? 'solid-js'
              : 'react',
        paths: paths(framework),
      },
      files: ['app.tsx', 'interface.ts'],
    };
    await writeFile(
      path.join(scratch, 'tsconfig.json'),
      JSON.stringify(config),
    );
    try {
      await promisify(execFile)(
        process.execPath,
        [
          path.join(repository, 'node_modules/typescript7/bin/tsc'),
          '--pretty',
          'false',
          '-p',
          'tsconfig.json',
        ],
        { cwd: scratch },
      );
      return { pass: true, diagnostics: [] };
    } catch (error) {
      if (!error.stdout) throw error;
      return {
        pass: false,
        diagnostics: error.stdout
          .trim()
          .split('\n')
          .map((s) =>
            s.replaceAll(scratch + '/', '').replaceAll(repository + '/', ''),
          )
          .slice(0, 30),
      };
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
export async function bundle(framework, source) {
  let contents = source + '\nglobalThis.mountStudy = mountStudy;';
  let loader = 'tsx';
  if (framework === 'solid') {
    const js = await esbuild.transform(contents, {
      loader: 'tsx',
      jsx: 'preserve',
      tsconfigRaw: { compilerOptions: {} },
    });
    contents = (
      await babel.transformAsync(js.code, {
        filename: 'app.jsx',
        presets: [[solidPreset, { generate: 'dom' }]],
        configFile: false,
        babelrc: false,
      })
    ).code;
    loader = 'js';
  }
  const alias = Object.fromEntries(
    Object.entries(paths('kerf')).map(([name, [file]]) => [
      name,
      file.replace('.d.ts', '.js'),
    ]),
  );
  alias['@kerfjs/ui/combobox'] = path.join(uiDist, 'browser/combobox.js');
  const result = await esbuild.build({
    stdin: { contents, loader, resolveDir: benchmark, sourcefile: 'app.tsx' },
    absWorkingDir: benchmark,
    write: false,
    outfile: 'asset.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    minify: true,
    logLevel: 'silent',
    tsconfigRaw: { compilerOptions: {} },
    jsx: 'automatic',
    jsxImportSource: framework === 'kerf' ? 'kerfjs' : 'react',
    alias,
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  return Object.fromEntries(
    result.outputFiles.map((file) => [
      '/' + path.basename(file.path),
      file.text,
    ]),
  );
}

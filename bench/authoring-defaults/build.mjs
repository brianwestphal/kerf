import { transformAsync } from '@babel/core';
import preset from 'babel-preset-solid';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const directory = path.dirname(fileURLToPath(import.meta.url));
export const repository = path.resolve(directory, '../..');
export const variants = ['kerf', 'solid', 'react'].flatMap((framework) =>
  ['ordinary', 'tuned', 'picker'].map((form) => ({
    name: framework + '-' + form,
    framework,
    form,
  })),
);

export async function bundle(variant, instrumented) {
  const { framework, form } = variant;
  const picker = form === 'picker';
  const entry = framework + (picker ? '-picker' : '') + '.jsx';
  const output = await build({
    absWorkingDir: directory,
    entryPoints: ['fixtures/' + entry],
    bundle: true,
    minify: true,
    write: false,
    outfile: 'asset.js',
    format: 'esm',
    target: 'es2022',
    tsconfigRaw: { compilerOptions: {} },
    jsx: 'automatic',
    jsxImportSource: framework === 'kerf' ? 'kerfjs' : 'react',
    define: {
      'process.env.NODE_ENV': '"production"',
      COUNT_WORK: String(instrumented),
      TUNED: String(form === 'tuned'),
    },
    alias: {
      'kerfjs/jsx-runtime': path.join(repository, 'dist/jsx-runtime.js'),
      kerfjs: path.join(repository, 'dist/index.js'),
      '@kerfjs/ui/combobox': path.join(
        repository,
        'ui/dist/browser/combobox.js',
      ),
      '@kerfjs/ui/wire-comboboxes': path.join(
        repository,
        'ui/dist/wire-comboboxes.js',
      ),
    },
    plugins:
      framework !== 'solid'
        ? []
        : [
            {
              name: 'solid-dom',
              setup(builder) {
                builder.onLoad(
                  { filter: /fixtures\/solid(?:-picker)?\.jsx$/ },
                  async ({ path: filename }) => ({
                    contents: (
                      await transformAsync(await readFile(filename, 'utf8'), {
                        filename,
                        presets: [[preset, { generate: 'dom' }]],
                        configFile: false,
                        babelrc: false,
                      })
                    ).code,
                    loader: 'js',
                  }),
                );
              },
            },
          ],
  });
  return Object.fromEntries(
    output.outputFiles.map((file) => [
      '/' + path.basename(file.path),
      Buffer.from(file.contents),
    ]),
  );
}

import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { TextDecoder } from 'node:util';
import { gzipSync } from 'node:zlib';

import { build, version } from 'esbuild';

const ui = fileURLToPath(new URL('../../', import.meta.url));
const common = `
import { mount } from 'kerfjs';
import '@kerfjs/ui/combobox.css';
const props = { label: 'Tag', suggestions: ['blue'] };
`;
const manual =
  common +
  `
import { Combobox } from '@kerfjs/ui/combobox';
import { wireComboboxes } from '@kerfjs/ui/wire-comboboxes';
export function app(root, onCommit, initialValue) {
  const stop = mount(root, () => Combobox({ ...props, id: 'tag', value: initialValue }));
  const release = wireComboboxes(root, { onCommit });
  return () => { release(); stop(); };
}
`;
const recipe =
  common +
  `
import { createComboboxOwner } from './docs/examples/scoped-combobox.ts';
export function app(root, onCommit, initialValue) {
  const owner = createComboboxOwner();
  const tag = owner.field({ id: 'tag', initialValue, onCommit });
  const stop = mount(root, () => tag.render(props));
  owner.connect(root);
  return () => { owner.dispose(); stop(); };
}
`;
const button = `
import { mount } from 'kerfjs';
import { Button } from '@kerfjs/ui/button';
import '@kerfjs/ui/button.css';
export const app = (root) => mount(root, () => Button({ children: 'Save' }));
`;

async function bundle(contents) {
  const result = await build({
    stdin: { contents, resolveDir: ui },
    tsconfigRaw: {},
    bundle: true,
    minify: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    write: false,
    outdir: 'out',
    legalComments: 'none',
  });
  return result.outputFiles.map((file) => file.contents);
}

console.log(`Node ${process.versions.node}, esbuild ${version}, default gzip`);
for (const [name, code] of Object.entries({ manual, recipe, button })) {
  const [js, css] = await bundle(code);
  console.log(name, {
    js: js.length,
    jsGzip: gzipSync(js).length,
    css: css.length,
    cssGzip: gzipSync(css).length,
  });
  if (name === 'button') {
    const unusedOwner =
      "import { createComboboxOwner } from './docs/examples/scoped-combobox.ts';";
    const [trimmedJs, trimmedCss] = await bundle(unusedOwner + code);
    assert.doesNotMatch(
      new TextDecoder().decode(trimmedJs),
      /data-example-combobox-owner|kui-combobox__input/,
    );
    assert.doesNotMatch(new TextDecoder().decode(css), /\.kui-combobox\{/);
    console.log('button with unused owner import', {
      js: trimmedJs.length,
      jsGzip: gzipSync(trimmedJs).length,
      css: trimmedCss.length,
      cssGzip: gzipSync(trimmedCss).length,
    });
  }
}

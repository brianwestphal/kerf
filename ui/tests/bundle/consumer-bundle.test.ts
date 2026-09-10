// @vitest-environment node
import { readFile } from 'node:fs/promises';

import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

async function bundle(contents: string) {
  return build({
    stdin: { contents, resolveDir: new URL('../..', import.meta.url).pathname, sourcefile: 'consumer.ts' },
    bundle: true,
    format: 'esm',
    metafile: true,
    write: false,
    external: ['kerfjs'],
    tsconfigRaw: { compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'kerfjs' } },
  });
}

describe('consumer bundle boundaries', () => {
  it('keeps unrelated components and Web Awesome registration out of a root-barrel toolbar import', async () => {
    const result = await bundle("import { Toolbar } from '@kerfjs/ui'; console.log(String(Toolbar({}))); ");
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const output = result.outputFiles[0]!.text;
    expect(inputs).toContain('dist/index.js');
    expect(output).toContain('kui-toolbar');
    expect(output).not.toContain('kui-select');
    expect(output).not.toContain('kui-menu-item');
    expect(inputs).not.toContain('select-register');
    expect(inputs).not.toContain('@awesome.me/webawesome');
    expect(inputs).not.toContain('ux-demo');
  });

  it('keeps Select pure until its explicit registration subpath is imported', async () => {
    const pure = await bundle("import { Select } from '@kerfjs/ui/select'; console.log(String(Select({ name: 'x', value: 'a', choices: [{ value: 'a', label: 'A' }] }))); ");
    expect(Object.keys(pure.metafile!.inputs).join('\n')).not.toContain('@awesome.me/webawesome');
    const registered = await bundle("import '@kerfjs/ui/select/register';");
    expect(Object.keys(registered.metafile!.inputs).join('\n')).toContain('@awesome.me/webawesome');
  });

  it('publishes only CSS and custom-element registration as side effects', async () => {
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { sideEffects: string[]; exports: Record<string, unknown> };
    expect(pkg.sideEffects).toEqual(['**/*.css', './dist/select-register.js']);
    expect(pkg.exports['./select/register']).toBeDefined();
    expect(pkg.exports['./toolbar.css']).toBe('./src/toolbar.css');
  });
});

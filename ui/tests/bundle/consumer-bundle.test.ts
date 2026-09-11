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
    outdir: 'out',
    platform: 'browser',
    write: false,
    external: ['kerfjs'],
    tsconfigRaw: { compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'kerfjs' } },
  });
}

async function nodeBundle(contents: string) {
  return build({
    stdin: { contents, resolveDir: new URL('../..', import.meta.url).pathname, sourcefile: 'consumer.ts' },
    bundle: true,
    format: 'esm',
    metafile: true,
    outdir: 'out',
    platform: 'node',
    write: false,
    external: ['kerfjs'],
  });
}

function output(result: Awaited<ReturnType<typeof build>>, extension: string): string {
  return result.outputFiles?.find((file) => file.path.endsWith(extension))?.text ?? '';
}

describe('consumer bundle boundaries', () => {
  it('keeps the root barrel JavaScript-only and tree-shakes unrelated components', async () => {
    const result = await bundle("import { Toolbar } from '@kerfjs/ui'; console.log(String(Toolbar({}))); ");
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const javascript = output(result, '.js');
    expect(inputs).toContain('dist/index.js');
    expect(inputs).not.toContain('dist/browser');
    expect(javascript).toContain('kui-toolbar');
    expect(javascript).not.toContain('kui-select');
    expect(javascript).not.toContain('kui-menu-item');
    expect(output(result, '.css')).toBe('');
    expect(inputs).not.toContain('select-register');
    expect(inputs).not.toContain('@awesome.me/webawesome');
    expect(inputs).not.toContain('ux-demo');
  });

  it('loads only reachable CSS for a browser component subpath', async () => {
    const result = await bundle("import { Toolbar } from '@kerfjs/ui/toolbar'; console.log(String(Toolbar({}))); ");
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/toolbar.js');
    expect(css).toContain('.kui-toolbar');
    expect(css).toContain('--kui-color-text');
    expect(css).not.toContain('.kui-tab-bar');
    expect(css).not.toContain('.kui-state-banner');
    expect(css).not.toContain('.kui-menu-item');
  });

  it('keeps the TabBar component and opt-in wiring free of Web Awesome registration', async () => {
    const result = await bundle("import { TabBar } from '@kerfjs/ui/tab-bar'; import { reorderTabs, wireTabBars } from '@kerfjs/ui/wire-tab-bars'; console.log(TabBar, reorderTabs, wireTabBars); ");
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const javascript = output(result, '.js');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/tab-bar.js');
    expect(javascript).toContain('kui-tab-bar');
    expect(javascript).toContain('application/x-kerf-tab');
    expect(css).toContain('.kui-tab-bar');
    expect(css).not.toContain('.kui-app-tab');
    expect(css).not.toContain('.kui-toolbar');
    expect(inputs).not.toContain('select-register');
    expect(inputs).not.toContain('@awesome.me/webawesome');
  });

  it('follows transitive component styles without retaining unrelated CSS', async () => {
    const result = await bundle("import { EmptyState } from '@kerfjs/ui/empty-state'; console.log(EmptyState); ");
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/empty-state.js');
    expect(css).toContain('.kui-empty-state');
    expect(css).toContain('.kui-loading-spinner');
    expect(css).not.toContain('.kui-toolbar');
    expect(css).not.toContain('.kui-select');
  });

  it('keeps Node and explicit unstyled imports free of CSS-loader requirements', async () => {
    const server = await nodeBundle("import { Toolbar } from '@kerfjs/ui'; console.log(Toolbar); ");
    const unstyled = await bundle("import { Toolbar } from '@kerfjs/ui/unstyled'; console.log(Toolbar); ");
    expect(Object.keys(server.metafile!.inputs).join('\n')).not.toContain('dist/browser');
    expect(output(server, '.css')).toBe('');
    expect(Object.keys(unstyled.metafile!.inputs).join('\n')).not.toContain('dist/browser');
    expect(output(unstyled, '.css')).toBe('');
  });

  it('keeps Select pure until its explicit registration subpath is imported', async () => {
    const pure = await bundle("import { Select } from '@kerfjs/ui/select'; console.log(String(Select({ name: 'x', value: 'a', choices: [{ value: 'a', label: 'A' }] }))); ");
    expect(Object.keys(pure.metafile!.inputs).join('\n')).not.toContain('@awesome.me/webawesome');
    expect(output(pure, '.css')).toContain('.kui-select');
    expect(output(pure, '.css')).toContain('[data-lucide]');
    const registered = await bundle("import '@kerfjs/ui/select/register';");
    expect(Object.keys(registered.metafile!.inputs).join('\n')).toContain('@awesome.me/webawesome');
  });

  it('declares only style delivery and custom-element registration as side effects', async () => {
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { sideEffects: string[]; exports: Record<string, unknown> };
    expect(pkg.sideEffects).toEqual(['**/*.css', './dist/browser/*.js', './dist/select-register.js']);
    expect(pkg.exports['.']).toMatchObject({ import: './dist/index.js' });
    expect(pkg.exports['./toolbar']).toMatchObject({ browser: './dist/browser/toolbar.js', import: './dist/toolbar.js' });
    expect(pkg.exports['./unstyled']).toBeDefined();
    expect(pkg.exports['./select/register']).toBeDefined();
    expect(pkg.exports['./tab-bar']).toBeDefined();
    expect(pkg.exports['./wire-tab-bars']).toBeDefined();
    expect(pkg.exports['./toolbar.css']).toBe('./src/toolbar.css');
    expect(pkg.exports['./tab-bar.css']).toBe('./src/tab-bar.css');
  });
});

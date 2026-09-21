// @vitest-environment node
import { readdir, readFile } from 'node:fs/promises';

import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

async function bundle(contents: string) {
  return build({
    stdin: {
      contents,
      resolveDir: new URL('../..', import.meta.url).pathname,
      sourcefile: 'consumer.ts',
    },
    bundle: true,
    format: 'esm',
    metafile: true,
    outdir: 'out',
    platform: 'browser',
    write: false,
    external: ['kerfjs'],
    tsconfigRaw: {
      compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'kerfjs' },
    },
  });
}

async function nodeBundle(contents: string) {
  return build({
    stdin: {
      contents,
      resolveDir: new URL('../..', import.meta.url).pathname,
      sourcefile: 'consumer.ts',
    },
    bundle: true,
    format: 'esm',
    metafile: true,
    outdir: 'out',
    platform: 'node',
    write: false,
    external: ['kerfjs'],
  });
}

function output(
  result: Awaited<ReturnType<typeof build>>,
  extension: string,
): string {
  return (
    result.outputFiles?.find((file) => file.path.endsWith(extension))?.text ??
    ''
  );
}

describe('consumer bundle boundaries', () => {
  it('ships clean generated JavaScript shims', async () => {
    const dist = new URL('../../dist/', import.meta.url);
    const files = (await readdir(dist)).filter((file) => file.endsWith('.js'));

    for (const file of files) {
      const source = await readFile(new URL(file, dist), 'utf8');
      expect(
        source.match(/^import\s+['"]\.\/chunk-.*\.js['"];?$/gm),
        file,
      ).toBeNull();
      expect(source.match(/^\/\/# sourceMappingURL=.*$/gm), file).toHaveLength(
        1,
      );
    }
  });

  it('keeps the root barrel JavaScript-only and tree-shakes unrelated components', async () => {
    const result = await bundle(
      "import { Toolbar } from '@kerfjs/ui'; console.log(String(Toolbar({}))); ",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const javascript = output(result, '.js');
    expect(inputs).toContain('dist/index.js');
    expect(inputs).not.toContain('dist/browser');
    expect(javascript).toContain('kui-toolbar');
    expect(javascript).not.toContain('kui-select');
    expect(javascript).not.toContain('kui-list-item');
    expect(output(result, '.css')).toBe('');
    expect(inputs).not.toContain('select-register');
    expect(inputs).not.toContain('@awesome.me/webawesome');
    expect(inputs).not.toContain('ux-demo');
  });

  it('loads only reachable CSS for a browser component subpath', async () => {
    const result = await bundle(
      "import { Toolbar } from '@kerfjs/ui/toolbar'; console.log(String(Toolbar({}))); ",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/toolbar.js');
    expect(inputs).toContain('dist/styles/toolbar.css');
    expect(css).toContain('.kui-toolbar');
    expect(css).toContain('--kui-color-text');
    expect(css).not.toContain('.kui-tab-bar');
    expect(css).not.toContain('.kui-state-banner');
    expect(css).not.toContain('.kui-list-item');
    expect(css).not.toContain('remify(');
  });

  it('ships PanelHeader with its reachable toolbar and group styles', async () => {
    const result = await bundle(
      "import { PanelHeader } from '@kerfjs/ui/panel-header'; console.log(String(PanelHeader({ title: 'Details', titleId: 'details-title' }))); ",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/panel-header.js');
    expect(inputs).toContain('dist/styles/panel-header.css');
    expect(inputs).toContain('dist/styles/toolbar.css');
    expect(inputs).toContain('dist/styles/toolbar-control-group.css');
    expect(css).toContain('.kui-panel-header');
    expect(css).toContain('.kui-toolbar');
    expect(css).toContain('.kui-toolbar-control-group');
    expect(css).not.toContain('.kui-value-table');
    expect(css).not.toContain('.kui-list-item');
    expect(css).not.toContain('remify(');
  });

  it('keeps a re-exported component’s CSS reachable (ValueTableRow placeholder pulls skeleton.css)', async () => {
    // value-table.tsx re-exports ValueTableRow via `export { … } from './value-table-row.js'`;
    // the browser-entry scanner must follow that re-export to the row's Skeleton dependency so
    // its placeholder CSS ships. Guards against the silent CSS gap re-exports used to cause.
    const result = await bundle(
      "import { ValueTableRow } from '@kerfjs/ui/value-table'; console.log(String(ValueTableRow({ label: 'Owner', value: '', placeholder: true }))); ",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/value-table.js');
    expect(inputs).toContain('dist/styles/skeleton.css');
    expect(css).toContain('.kui-value-table');
    expect(css).toContain('.kui-skeleton');
  });

  it('keeps SegmentedControl CSS reachable without retaining unrelated controls', async () => {
    const result = await bundle(
      "import { SegmentedControl } from '@kerfjs/ui/segmented-control'; console.log(String(SegmentedControl({ id: 'view', label: 'View', value: 'list', choices: [{ value: 'list', label: 'List' }] }))); ",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/segmented-control.js');
    expect(css).toContain('.kui-segmented-control');
    expect(css).toContain('--kui-color-text');
    expect(css).not.toContain('.kui-toolbar-control-group');
    expect(css).not.toContain('.kui-select');
    expect(css).not.toContain('.kui-tab-bar');
    expect(inputs).not.toContain('@awesome.me/webawesome');
  });

  it('keeps TokenSearchField and its reachable icon CSS isolated', async () => {
    const result = await bundle(
      "import { TokenSearchField } from '@kerfjs/ui/token-search-field'; console.log(String(TokenSearchField({ id: 'search', label: 'Search' }))); ",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/token-search-field.js');
    expect(css).toContain('.kui-token-search');
    expect(css).toContain('.kui-toolbar-control-group:has');
    expect(css).toContain('[data-lucide]');
    expect(inputs).not.toContain('dist/styles/toolbar-control-group.css');
    expect(css).not.toContain('.kui-select');
    expect(inputs).not.toContain('@awesome.me/webawesome');
  });

  it('keeps ListActionRow CSS isolated from other row and tab components', async () => {
    const result = await bundle(
      "import { ListActionRow } from '@kerfjs/ui/list-action-row'; console.log(ListActionRow);",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/list-action-row.js');
    expect(inputs).toContain('dist/styles/list-action-row.css');
    expect(css).toContain('.kui-list-action-row');
    expect(css).toContain('--kui-color-text');
    expect(css).not.toContain('.kui-list-item');
    expect(css).not.toContain('.kui-app-tab');
    expect(css).not.toContain('remify(');
    expect(inputs).not.toContain('@awesome.me/webawesome');
  });

  it('ships the ListHeader count contract through its styled browser subpath', async () => {
    const result = await bundle(
      "import { ListHeader } from '@kerfjs/ui/list-header'; console.log(String(ListHeader({ label: 'Notes', count: 0, countLabel: '0 notes' }))); ",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/list-header.js');
    expect(inputs).toContain('dist/styles/list-header.css');
    expect(inputs).toContain('dist/styles/disclosure-arrow.css');
    expect(inputs).toContain('dist/styles/lucide-icon.css');
    expect(css).toContain('.kui-list-header__count');
    expect(css).toContain('.kui-disclosure-arrow');
    expect(css).toContain('--kui-color-neutral-fill-quiet');
    expect(css).not.toContain('.kui-list-item');
    expect(css).not.toContain('.kui-list-action-row');
    expect(css).not.toContain('remify(');
    expect(inputs).not.toContain('@awesome.me/webawesome');
  });

  it('keeps the TabBar component and opt-in wiring free of Web Awesome registration', async () => {
    const result = await bundle(
      "import { TabBar } from '@kerfjs/ui/tab-bar'; import { reorderTabs, wireTabBars } from '@kerfjs/ui/wire-tab-bars'; console.log(TabBar, reorderTabs, wireTabBars); ",
    );
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

  it('ships AppTab and ResizableRegion from isolated styled browser subpaths', async () => {
    const tabs = await bundle(
      "import { AppTab } from '@kerfjs/ui/app-tab'; console.log(AppTab);",
    );
    const tabInputs = Object.keys(tabs.metafile!.inputs).join('\n');
    const tabCss = output(tabs, '.css');
    expect(tabInputs).toContain('dist/browser/app-tab.js');
    expect(tabCss).toContain('.kui-app-tab');
    expect(tabCss).not.toContain('.kui-tab-bar');
    expect(tabCss).not.toContain('.kui-resizable-region');

    const resize = await bundle(
      "import { ResizableRegion } from '@kerfjs/ui/resizable-region'; console.log(ResizableRegion);",
    );
    const resizeInputs = Object.keys(resize.metafile!.inputs).join('\n');
    const resizeCss = output(resize, '.css');
    expect(resizeInputs).toContain('dist/browser/resizable-region.js');
    expect(resizeCss).toContain('.kui-resizable-region');
    expect(resizeCss).not.toContain('.kui-app-tab');
    expect(resizeCss).not.toContain('.kui-tab-bar');
  });

  it('follows transitive component styles without retaining unrelated CSS', async () => {
    const result = await bundle(
      "import { EmptyState } from '@kerfjs/ui/empty-state'; console.log(EmptyState); ",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/browser/empty-state.js');
    expect(css).toContain('.kui-empty-state');
    expect(css).toContain('.kui-loading-spinner');
    expect(css).not.toContain('.kui-toolbar');
    expect(css).not.toContain('.kui-select');
  });

  it('keeps Node and explicit unstyled imports free of CSS-loader requirements', async () => {
    const server = await nodeBundle(
      "import { Toolbar } from '@kerfjs/ui'; console.log(Toolbar); ",
    );
    const unstyled = await bundle(
      "import { Toolbar } from '@kerfjs/ui/unstyled'; console.log(Toolbar); ",
    );
    expect(Object.keys(server.metafile!.inputs).join('\n')).not.toContain(
      'dist/browser',
    );
    expect(output(server, '.css')).toBe('');
    expect(Object.keys(unstyled.metafile!.inputs).join('\n')).not.toContain(
      'dist/browser',
    );
    expect(output(unstyled, '.css')).toBe('');
  });

  it('keeps Select pure until its explicit registration subpath is imported', async () => {
    const pure = await bundle(
      "import { Select } from '@kerfjs/ui/select'; console.log(String(Select({ name: 'x', value: 'a', choices: [{ value: 'a', label: 'A' }] }))); ",
    );
    expect(Object.keys(pure.metafile!.inputs).join('\n')).not.toContain(
      '@awesome.me/webawesome',
    );
    expect(output(pure, '.css')).toContain('.kui-select');
    expect(output(pure, '.css')).toContain('[data-lucide]');
    const registered = await bundle("import '@kerfjs/ui/select/register';");
    expect(Object.keys(registered.metafile!.inputs).join('\n')).toContain(
      '@awesome.me/webawesome',
    );
  });

  it('ships the Web Awesome theme as one opt-in CSS-only boundary', async () => {
    const themed = await bundle("import '@kerfjs/ui/webawesome.css';");
    const inputs = Object.keys(themed.metafile!.inputs).join('\n');
    const css = output(themed, '.css');
    expect(inputs).toContain('dist/styles/webawesome.css');
    expect(inputs).toContain(
      '@awesome.me/webawesome/dist/styles/themes/default.css',
    );
    expect(css).toContain('@layer wa-theme-overrides');
    expect(css).toContain(
      '--wa-color-brand-fill-loud: light-dark(#0088ff, #64d2ff)',
    );
    expect(css).toContain(
      '--wa-form-control-border-color: var(--wa-color-neutral-border-normal)',
    );
    expect(css).toContain('--wa-tooltip-arrow-size: 0px');
    expect(css).toContain('--arrow-size: var(--kui-wa-popover-arrow-size)');
    expect(inputs).not.toContain('@awesome.me/webawesome/dist/components');
    expect(output(themed, '.js')).not.toContain('customElements.define');

    const withButton = await bundle(
      "import '@kerfjs/ui/webawesome.css'; import '@awesome.me/webawesome/dist/components/button/button.js';",
    );
    const buttonInputs = Object.keys(withButton.metafile!.inputs).join('\n');
    expect(buttonInputs).toContain(
      '@awesome.me/webawesome/dist/components/button/button.js',
    );
    expect(buttonInputs).not.toContain(
      '@awesome.me/webawesome/dist/components/input/input.js',
    );
    expect(buttonInputs).not.toContain(
      '@awesome.me/webawesome/dist/components/checkbox/checkbox.js',
    );
  });

  it('ships Web Awesome JSX declarations without registration side effects', async () => {
    const result = await bundle(
      "import '@kerfjs/ui/webawesome'; console.log('typed');",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    expect(inputs).toContain('dist/webawesome.js');
    expect(inputs).not.toContain('@awesome.me/webawesome');
    expect(output(result, '.js')).not.toContain('customElements.define');
  });

  it('ships the standard catalog resource vocabulary without the catalog shell', async () => {
    const result = await bundle(
      "import { catalogResources } from '@kerfjs/ui/catalog-resources'; console.log(catalogResources({ demoSource: { href: '/demo' }, guidance: { href: '/guide' } }));",
    );
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const js = output(result, '.js');
    expect(inputs).toContain('dist/catalog-resources.js');
    expect(inputs).not.toContain('dist/catalog.js');
    expect(js).toContain('Demo source');
    expect(js).toContain('Guidance');
  });

  it('keeps the manual layout CSS subpath self-sufficient', async () => {
    const result = await bundle("import '@kerfjs/ui/layout.css';");
    const inputs = Object.keys(result.metafile!.inputs).join('\n');
    const css = output(result, '.css');
    expect(inputs).toContain('dist/styles/layout.css');
    expect(inputs).not.toContain('dist/styles/foundation.css');
    expect(css).toContain('.kui-pane__content');
    expect(css).toContain('.kui-content-item--pill');
    expect(css).toContain('var(--kui-layout-content-gap, 1.5rem)');
    expect(css).toContain('var(--kui-layout-inline-margin, 0.5rem)');
  });

  it('declares only style delivery and custom-element registration as side effects', async () => {
    const pkg = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as {
      sideEffects: string[];
      exports: Record<string, unknown>;
      files: string[];
    };
    expect(pkg.sideEffects).toEqual([
      '**/*.css',
      './dist/browser/*.js',
      './dist/select-register.js',
    ]);
    expect(pkg.exports['.']).toMatchObject({ import: './dist/index.js' });
    expect(pkg.exports['./toolbar']).toMatchObject({
      browser: './dist/browser/toolbar.js',
      import: './dist/toolbar.js',
    });
    expect(pkg.exports['./list-action-row']).toMatchObject({
      browser: './dist/browser/list-action-row.js',
      import: './dist/list-action-row.js',
    });
    expect(pkg.exports['./unstyled']).toBeDefined();
    expect(pkg.exports['./webawesome.css']).toBe(
      './dist/styles/webawesome.css',
    );
    expect(pkg.exports['./webawesome']).toMatchObject({
      types: './dist/webawesome.d.ts',
      import: './dist/webawesome.js',
    });
    expect(pkg.exports['./select/register']).toBeDefined();
    expect(pkg.exports['./app-tab']).toMatchObject({
      browser: './dist/browser/app-tab.js',
      import: './dist/app-tab.js',
    });
    expect(pkg.exports['./resizable-region']).toMatchObject({
      browser: './dist/browser/resizable-region.js',
      import: './dist/resizable-region.js',
    });
    expect(pkg.exports['./tab-bar']).toBeDefined();
    expect(pkg.exports['./segmented-control']).toBeDefined();
    expect(pkg.exports['./token-search-field']).toBeDefined();
    expect(pkg.exports['./catalog-resources']).toMatchObject({
      types: './dist/catalog-resources.d.ts',
      import: './dist/catalog-resources.js',
    });
    expect(pkg.exports['./wire-tab-bars']).toBeDefined();
    // device-class is signals-only: no browser CSS entry, no stylesheet subpath.
    expect(pkg.exports['./device-class']).toMatchObject({
      types: './dist/device-class.d.ts',
      import: './dist/device-class.js',
    });
    expect(pkg.exports['./device-class']).not.toHaveProperty('browser');
    expect(pkg.exports['./device-class.css']).toBeUndefined();
    // nav-stack is an opt-in layout subpath: component + companion CSS (manual
    // import, like layout.css), a logic-only wire helper, and no browser entry.
    expect(pkg.exports['./nav-stack']).toMatchObject({
      types: './dist/nav-stack.d.ts',
      import: './dist/nav-stack.js',
    });
    expect(pkg.exports['./nav-stack']).not.toHaveProperty('browser');
    expect(pkg.exports['./nav-stack.css']).toBe('./dist/styles/nav-stack.css');
    expect(pkg.exports['./wire-nav-stack']).toMatchObject({
      import: './dist/wire-nav-stack.js',
    });
    expect(pkg.exports['./split-view']).toMatchObject({
      types: './dist/split-view.d.ts',
      import: './dist/split-view.js',
    });
    expect(pkg.exports['./split-view']).not.toHaveProperty('browser');
    expect(pkg.exports['./split-view.css']).toBe(
      './dist/styles/split-view.css',
    );
    expect(pkg.exports['./workbench']).toMatchObject({
      types: './dist/workbench.d.ts',
      import: './dist/workbench.js',
    });
    expect(pkg.exports['./workbench']).not.toHaveProperty('browser');
    expect(pkg.exports['./workbench.css']).toBe('./dist/styles/workbench.css');
    expect(pkg.exports['./tab-scaffold']).toMatchObject({
      types: './dist/tab-scaffold.d.ts',
      import: './dist/tab-scaffold.js',
    });
    expect(pkg.exports['./tab-scaffold']).not.toHaveProperty('browser');
    expect(pkg.exports['./tab-scaffold.css']).toBe(
      './dist/styles/tab-scaffold.css',
    );
    expect(pkg.exports['./wire-tab-scaffold']).toMatchObject({
      import: './dist/wire-tab-scaffold.js',
    });
    expect(pkg.exports['./toolbar.css']).toBe('./dist/styles/toolbar.css');
    expect(pkg.exports['./list-action-row.css']).toBe(
      './dist/styles/list-action-row.css',
    );
    expect(pkg.exports['./sidebar.css']).toBeUndefined();
    expect(pkg.exports['./layout.css']).toBe('./dist/styles/layout.css');
    expect(pkg.exports['./tab-bar.css']).toBe('./dist/styles/tab-bar.css');
    expect(pkg.exports['./segmented-control.css']).toBe(
      './dist/styles/segmented-control.css',
    );
    expect(pkg.exports['./token-search-field.css']).toBe(
      './dist/styles/token-search-field.css',
    );
    expect(pkg.files).not.toContain('src/*.css');
  });

  it('publishes compiled rem CSS without the authoring function', async () => {
    const source = await readFile(
      new URL('../../src/toolbar-control-group.css', import.meta.url),
      'utf8',
    );
    const built = await readFile(
      new URL('../../dist/styles/toolbar-control-group.css', import.meta.url),
      'utf8',
    );
    const disclosureSource = await readFile(
      new URL('../../src/disclosure-arrow.css', import.meta.url),
      'utf8',
    );
    const disclosureBuilt = await readFile(
      new URL('../../dist/styles/disclosure-arrow.css', import.meta.url),
      'utf8',
    );
    const menuHeaderSource = await readFile(
      new URL('../../src/list-header.css', import.meta.url),
      'utf8',
    );
    const menuHeaderBuilt = await readFile(
      new URL('../../dist/styles/list-header.css', import.meta.url),
      'utf8',
    );
    const selectBuilt = await readFile(
      new URL('../../dist/styles/select.css', import.meta.url),
      'utf8',
    );
    const valueTableSource = await readFile(
      new URL('../../src/value-table.css', import.meta.url),
      'utf8',
    );
    const valueTableBuilt = await readFile(
      new URL('../../dist/styles/value-table.css', import.meta.url),
      'utf8',
    );

    expect(source).toContain('remify(40px)');
    expect(built).toContain('2.5rem');
    expect(built).not.toContain('remify(');
    expect(disclosureSource).toContain(
      'var(--kui-disclosure-arrow-size, remify(18px))',
    );
    expect(disclosureBuilt).toContain(
      'var(--kui-disclosure-arrow-size, 1.125rem)',
    );
    expect(disclosureBuilt).not.toContain('remify(');
    expect(menuHeaderSource).toContain('min-width: remify(21.6px)');
    expect(menuHeaderBuilt).toContain('min-width: 1.35rem');
    expect(menuHeaderSource).toContain(
      'width: calc(100% - (2 * var(--kui-layout-inline-margin, remify(8px))))',
    );
    expect(menuHeaderBuilt).toContain(
      'width: calc(100% - (2 * var(--kui-layout-inline-margin, 0.5rem)))',
    );
    expect(menuHeaderSource).toContain('--kui-list-header-action-icon-size,');
    expect(menuHeaderSource).toContain('remify(18px)');
    expect(menuHeaderBuilt).toContain('--kui-list-header-action-icon-size,');
    expect(menuHeaderBuilt).toContain('1.125rem');
    expect(menuHeaderBuilt).toContain('.kui-list-header__count');
    expect(menuHeaderBuilt).toContain('var(--kui-color-neutral-fill-quiet)');
    expect(menuHeaderSource).toContain('.kui-list-header__action-layer > svg');
    expect(menuHeaderSource).not.toContain(
      '.kui-list-header__toggle[aria-expanded',
    );
    expect(menuHeaderBuilt).not.toContain(
      '.kui-list-header__toggle[aria-expanded',
    );
    expect(menuHeaderBuilt).not.toContain('remify(');
    expect(selectBuilt).toContain(
      'scale(var(--kui-disclosure-icon-scale, 0.5))',
    );
    expect(valueTableSource).toContain('padding-block: remify(8px)');
    expect(valueTableBuilt).toContain('padding-block: 0.5rem');
    expect(valueTableBuilt).not.toContain('remify(');
  });
});

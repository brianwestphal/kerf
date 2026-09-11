import { defineConfig } from 'tsup';

const entries = [
  'index',
  'lucide-icon',
  'toolbar',
  'toolbar-control-group',
  'toolbar-text',
  'menu-item',
  'menu-header',
  'resizable-region',
  'wire-resizable-regions',
  'app-tab',
  'tab-bar',
  'wire-tab-bars',
  'page-header',
  'loading-spinner',
  'select',
  'segmented-control',
  'select-register',
  'state-banner',
  'empty-state',
  'dialog-header',
  'value-table',
];

export default defineConfig({
  entry: entries.map((entry) => `src/${entry}.${entry === 'index' || entry === 'select-register' || entry.startsWith('wire-') ? 'ts' : 'tsx'}`),
  format: ['esm'],
  outDir: 'dist',
  target: 'es2022',
  platform: 'neutral',
  splitting: true,
  clean: true,
  sourcemap: true,
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  treeshake: true,
  external: ['kerfjs', 'kerfjs/jsx-runtime', '@awesome.me/webawesome'],
});

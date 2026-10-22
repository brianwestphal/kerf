/** Files used only when setup initializes an empty UI application. */
export function uiAppFiles() {
  return {
    '.prettierignore': `.claude/
dist/
node_modules/
component-composition.json
tsconfig.json
`,
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kerf app</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/app/main.tsx"></script>
  </body>
</html>
`,
    'ux-demo/index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UX demo</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/ux-demo/main.tsx"></script>
  </body>
</html>
`,
    'vite.config.mjs': `import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        'ux-demo': resolve(import.meta.dirname, 'ux-demo/index.html'),
      },
    },
  },
});
`,
    'src/app/main.tsx': `import '@kerfjs/ui/document.css';

import { Text } from '@kerfjs/ui/text';
import { mount } from 'kerfjs';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root.');

mount(root, () => (
  <main>
    <Text variant="h1">Your Kerf app</Text>
    <Text>Build your first feature in src/features.</Text>
    <a href="/ux-demo/">Open the UX demo</a>
  </main>
));
`,
    'src/ux-demo/main.tsx': `import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/catalog.css';
import './style.css';

import { Catalog, type CatalogSection } from '@kerfjs/ui/catalog';
import { wireCatalog } from '@kerfjs/ui/wire-catalog';
import { mount, signal } from 'kerfjs';

import { ButtonDemo } from './demos/button.js';

const sections: CatalogSection[] = [
  {
    category: 'Components',
    entries: [{ id: 'button', name: 'Button', description: 'A pressable action.' }],
  },
];
const active = signal('button');
const collapsed = signal(false);
const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root.');

mount(root, () => (
  <Catalog
    brand={{ title: 'Your app', subtitle: 'UX demo' }}
    sections={sections}
    active={active.value}
    content={<ButtonDemo />}
    collapsed={collapsed.value}
  />
));
wireCatalog(root, {
  onSelect: (id) => {
    active.value = id;
  },
  onToggleSidebar: () => {
    collapsed.value = !collapsed.value;
  },
  collapsed,
});
`,
    'src/ux-demo/style.css': `html,
body,
#app {
  height: 100%;
}
`,
    'src/ux-demo/demos/button.tsx': `import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

export function ButtonDemo() {
  return (
    <CatalogExampleStack label="Button" rootAttributes={{ 'data-demo': 'button' }}>
      <CatalogExample label="Default" align="inline-control">
        <Button href="/">Back to App</Button>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
`,
    'src/components/index.ts': 'export {};\n',
    'src/features/index.ts': 'export {};\n',
    'src/platform/index.ts': 'export {};\n',
    'src/shared/index.ts': 'export {};\n',
    'src/styles.d.ts': `declare module '*.css';\n`,
    'tests/structure.test.mjs': `import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('the application ownership directories exist', async () => {
  for (const name of ['app', 'components', 'features', 'platform', 'shared', 'ux-demo/demos']) {
    assert.equal((await stat(resolve('src', name))).isDirectory(), true, name);
  }
});
`,
  };
}

export const uiPrettierConfig = `export default { printWidth: 120, singleQuote: true };\n`;

export const uiDoctorConfig = {
  schemaVersion: 1,
  failOn: 'warning',
  suppressions: [],
};

export function uiEslintTemplate(format = 'module') {
  const body = `const noPrettierIgnore = {
  rules: {
    'no-prettier-ignore': {
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              if (/\\bprettier-ignore\\b/u.test(comment.value))
                context.report({ loc: comment.loc, message: 'Remove prettier-ignore; fix the formatting.' });
            }
          },
        };
      },
    },
  },
};

const config = tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'component-composition.json'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked, kerfjs.configs['recommended-ui']],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { '@stylistic': stylistic, 'simple-import-sort': simpleImportSort, local: noPrettierIgnore },
    rules: {
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@stylistic/jsx-self-closing-comp': ['error', { component: true, html: true }],
      'local/no-prettier-ignore': 'error',
    },
  },
);
`;
  if (format === 'commonjs')
    return `module.exports = (async () => {
  const [{ default: js }, { default: tseslint }, { default: kerfjs }, { default: stylistic }, { default: simpleImportSort }] = await Promise.all([
    import('@eslint/js'), import('typescript-eslint'), import('eslint-plugin-kerfjs'),
    import('@stylistic/eslint-plugin'), import('eslint-plugin-simple-import-sort'),
  ]);
${body.replace('import.meta.dirname', 'process.cwd()')}
  return config;
})();
`;
  return `import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import kerfjs from 'eslint-plugin-kerfjs';
import tseslint from 'typescript-eslint';

${body}
export default config;
`;
}

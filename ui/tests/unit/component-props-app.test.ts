// @vitest-environment node
// KF-7JP509: components that live in app source (no package exports) get a
// prop catalog from their source file, and generated views import them by a
// path relative to each document.
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run as props } from '../../props/cli.mjs';
import { run as view } from '../../view/cli.mjs';
import { moduleSpecifier } from '../../view/index.mjs';

const uiRoot = resolve(import.meta.dirname, '../..');
const repoRoot = resolve(uiRoot, '..');
const fixture = resolve(uiRoot, 'tests/fixtures/component-props-app');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
let app: string;

beforeEach(() => {
  app = mkdtempSync(join(tmpdir(), 'kerf-app-source-'));
  cpSync(fixture, app, { recursive: true });
  mkdirSync(join(app, '.git'));
  // Resolve kerf and Kerf UI from this repository's sources, wherever the copy lives.
  const config = readJson(join(app, 'tsconfig.json'));
  config.compilerOptions.paths = {
    kerfjs: [join(repoRoot, 'src/index.ts')],
    'kerfjs/*': [join(repoRoot, 'src/*')],
    '@kerfjs/ui/*': [join(uiRoot, 'src/*')],
  };
  writeFileSync(join(app, 'tsconfig.json'), JSON.stringify(config));
});
afterEach(() => rmSync(app, { recursive: true, force: true }));

describe(
  'app-source components in Kerf UI view tools',
  { timeout: 60_000 },
  () => {
    it('builds a prop catalog from the source file with a root-relative import', () => {
      expect(props(['--write', '--root', app])).toMatchObject({ code: 0 });
      const catalog = readJson(join(app, 'component-props.json'));
      const card = catalog.components[0];
      expect(card).toMatchObject({
        key: 'orders-app:order-card',
        import: './src/order-card.js',
        source: 'package',
        export: 'OrderCard',
        dataChannel: 'rootAttributes',
      });
      const status = card.props.find(
        (prop: { name: string }) => prop.name === 'status',
      );
      expect(status).toMatchObject({
        type: { kind: 'enum', values: ['open', 'shipped'] },
        default: 'open',
      });
    });

    it('generates a view that imports the component relative to the document and compiles', () => {
      props(['--write', '--root', app]);
      const document = join(app, 'views/dashboard.kui.json');
      const generated = view(['generate', document]);
      expect(generated).toMatchObject({ code: 0 });
      const modulePath = join(app, 'views/dashboard.view.ts');
      const code = readFileSync(modulePath, 'utf8');
      expect(code).toContain(
        "import { OrderCard } from '../src/order-card.js';",
      );
      expect(code).toContain('readonly firstOrder: HTMLElement;');

      const config = ts.getParsedCommandLineOfConfigFile(
        join(app, 'tsconfig.json'),
        {},
        {
          ...ts.sys,
          onUnRecoverableConfigFileDiagnostic: () => undefined,
        },
      )!;
      const program = ts.createProgram(
        [
          modulePath,
          join(app, 'src/order-card.tsx'),
          join(uiRoot, 'src/css.d.ts'),
        ],
        config.options,
      );
      const errors = ts
        .getPreEmitDiagnostics(program)
        .filter((diagnostic) => diagnostic.file?.fileName.startsWith(app))
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        );
      expect(errors).toEqual([]);
    });
  },
);

describe('moduleSpecifier', () => {
  it('keeps package specifiers and relativizes absolute paths', () => {
    expect(moduleSpecifier('@kerfjs/ui/pane', '/app/views')).toBe(
      '@kerfjs/ui/pane',
    );
    expect(moduleSpecifier('/app/src/order-card.js', '/app/views')).toBe(
      '../src/order-card.js',
    );
    expect(moduleSpecifier('/app/views/card.js', '/app/views')).toBe(
      './card.js',
    );
    expect(moduleSpecifier('/app/views/deep/card.js', '/app/views')).toBe(
      './deep/card.js',
    );
    expect(moduleSpecifier('/app/src/order-card.js', undefined)).toBe(
      '/app/src/order-card.js',
    );
  });
});

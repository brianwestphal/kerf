// Verifies the create-kerf-component initializer scaffolds a package that obeys
// every hard rule from docs/13-component-packages.md. Runs the real CLI (the
// published bin) into a temp dir and inspects the output.

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'index.js');
const PACKAGE_NODE_MODULES = join(dirname(CLI), 'node_modules');

// Strip `/* */` and `//` comments so we can JSON.parse JSONC (tsconfig) and so
// the no-inline-handler check inspects code, not the explanatory comments (which
// deliberately mention `onClick={...}` as the anti-pattern). The line-comment
// rule skips `://` so it won't eat URLs.
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function scaffold(name) {
  const dir = mkdtempSync(join(tmpdir(), 'ckc-'));
  const target = join(dir, name);
  const stdout = execFileSync('node', [CLI, target], { encoding: 'utf8' });
  return {
    dir,
    target,
    stdout,
    read: (f) => readFileSync(join(target, f), 'utf8'),
  };
}

// Run the CLI once and assert on the result. Cleanup happens regardless.
function withScaffold(name, fn) {
  const s = scaffold(name);
  try {
    fn(s);
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
}

test('scaffolds the expected file tree', () => {
  withScaffold('my-widgets', ({ target }) => {
    for (const f of [
      'package.json',
      'tsconfig.json',
      'tsup.config.ts',
      'README.md',
      'LICENSE',
      '.gitignore',
      'src/index.ts',
      'src/counter.tsx',
      'src/counter.css',
      'kerf.components.json',
      'component-composition.json',
      'scripts/kerf-component-catalog.mjs',
      'scripts/component-metadata.schema.json',
      'scripts/component-composition.schema.json',
    ]) {
      assert.ok(existsSync(join(target, f)), `missing ${f}`);
    }
    // The dotfile placeholder must be renamed, not shipped verbatim.
    assert.ok(
      !existsSync(join(target, '_gitignore')),
      '_gitignore should be renamed to .gitignore',
    );
  });
});

test('replaces the package-name token everywhere', () => {
  withScaffold('my-widgets', ({ read }) => {
    for (const f of ['package.json', 'README.md', 'LICENSE', 'src/index.ts']) {
      assert.ok(!read(f).includes('__PKG_NAME__'), `token left in ${f}`);
    }
    assert.equal(JSON.parse(read('package.json')).name, 'my-widgets');
    assert.match(read('README.md'), /my-widgets/);
    assert.match(
      read('LICENSE'),
      /^MIT License\n\nCopyright \(c\) The my-widgets contributors$/m,
    );
  });
});

test('package.json keeps kerfjs a peerDependency (never bundled), with ESM + subpath exports', () => {
  withScaffold('my-widgets', ({ read }) => {
    const pkg = JSON.parse(read('package.json'));
    assert.equal(pkg.type, 'module');
    assert.ok(pkg.peerDependencies?.kerfjs, 'kerfjs must be a peerDependency');
    assert.ok(
      !pkg.dependencies?.kerfjs,
      'kerfjs must NOT be a regular dependency',
    );
    assert.ok(
      pkg.devDependencies?.kerfjs,
      'kerfjs should be a devDependency for local dev',
    );
    assert.ok(
      pkg.devDependencies?.typescript,
      'TypeScript must be installed for syntax-aware catalog verification',
    );
    assert.deepEqual(pkg.exports['.'], {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    });
    assert.ok(pkg.exports['./counter'], 'subpath export missing');
    assert.deepEqual(pkg.kerfComponentCatalog, {
      source: './kerf.components.json',
      output: './component-composition.json',
    });
    assert.equal(
      pkg.scripts['catalog:generate'],
      'node scripts/kerf-component-catalog.mjs --write',
    );
    assert.equal(
      pkg.scripts['catalog:check'],
      'node scripts/kerf-component-catalog.mjs --check',
    );
    assert.match(pkg.scripts.prepublishOnly, /catalog:check/);
    // Each component owns its styles; the scaffold's own gate runs the
    // component-ownership diagnostics over its source and stylesheet.
    assert.equal(pkg.scripts['check:styles'], 'kerf-ui-analyze --root . src');
    assert.match(pkg.scripts.prepublishOnly, /check:styles/);
    assert.equal(
      pkg.devDependencies['@kerfjs/ui'],
      pkg.devDependencies.kerfjs,
      '@kerfjs/ui (kerf-ui-analyze) releases in lockstep with kerfjs',
    );
    assert.equal(pkg.exports['./counter.css'], './src/counter.css');
    assert.ok(pkg.files.includes('src/counter.css'));
    assert.ok(pkg.files.includes('dist'), 'files must ship dist');
    assert.ok(pkg.files.includes('component-composition.json'));
    assert.ok(pkg.files.includes('kerf.components.json'));
    assert.ok(pkg.files.includes('LICENSE'), 'files must ship LICENSE');
  });
});

test('tsup build keeps kerfjs external and emits ESM + TypeScript 6-compatible dts', () => {
  withScaffold('my-widgets', ({ read }) => {
    const tsup = read('tsup.config.ts');
    assert.match(
      tsup,
      /external:\s*\[\s*['"]kerfjs['"]/,
      'kerfjs must be external in the build',
    );
    assert.match(tsup, /dts:\s*\{/);
    assert.match(tsup, /ignoreDeprecations:\s*['"]6\.0['"]/);
    assert.match(tsup, /versionMajorMinor\.startsWith\(['"]6\.['"]\)/);
    assert.match(tsup, /format:\s*\[\s*['"]esm['"]/);
  });
});

test('tsconfig sets jsxImportSource to kerfjs', () => {
  withScaffold('my-widgets', ({ read }) => {
    const tsconfig = JSON.parse(stripComments(read('tsconfig.json')));
    assert.equal(tsconfig.compilerOptions.jsxImportSource, 'kerfjs');
    assert.equal(tsconfig.compilerOptions.jsx, 'react-jsx');
  });
});

test('example component shows the factory + wire patterns and no inline handlers', () => {
  withScaffold('my-widgets', ({ read }) => {
    const counter = read('src/counter.tsx');
    assert.match(
      counter,
      /export function createCounter/,
      'factory pattern missing',
    );
    assert.match(
      counter,
      /export function wireCounter/,
      'wire() disposer missing',
    );
    assert.match(counter, /delegate\(/, 'must wire events via delegate()');
    assert.match(counter, /data-action/, 'must emit delegation hooks');
    // Check code only — the comments intentionally name `onClick={...}` as the anti-pattern.
    assert.doesNotMatch(
      stripComments(counter),
      /\bon[A-Z][a-zA-Z]*=\{/,
      'no inline JSX event handlers',
    );
    assert.match(counter, /store\.state\.value/, 'reads store via state.value');
  });
});

test('example stylesheet styles only its own component and is configured by props', () => {
  withScaffold('my-widgets', ({ read }) => {
    const counter = read('src/counter.tsx');
    const css = stripComments(read('src/counter.css'));
    const catalog = JSON.parse(read('kerf.components.json'));
    assert.match(counter, /size\?: 'standard' \| 'compact'/);
    assert.match(counter, /data-size=\{size\}/);
    // Every rule's subject is Counter itself or Counter's own internals.
    for (const [, selector] of css.matchAll(/([^{}]+)\{/g)) {
      const subject = selector
        .trim()
        .split(/[\s>+~]+/)
        .at(-1);
      assert.match(
        subject,
        /^(?:\.kerf-counter|button)/,
        `${selector.trim()} must style only Counter`,
      );
    }
    // The parent-context rule keeps Counter as the subject.
    assert.match(css, /\.kui-toolbar \.kerf-counter\s*\{/);
    // Private variables and the provided context are named after Counter.
    for (const [variable] of css.matchAll(/--_[a-z0-9-]+/g))
      assert.match(variable, /^--_kerf-counter-/);
    assert.deepEqual(catalog.components[0].boundaries.publicTokens, [
      '--kerf-counter-gap',
    ]);
  });
});

test('.gitignore ignores build + dependency dirs', () => {
  withScaffold('my-widgets', ({ read }) => {
    const gi = read('.gitignore');
    assert.match(gi, /dist/);
    assert.match(gi, /node_modules/);
  });
});

test('prints next-steps guidance on success', () => {
  withScaffold('my-widgets', ({ stdout }) => {
    assert.match(stdout, /Scaffolded kerf component package "my-widgets"/);
    assert.match(stdout, /npm install/);
    assert.match(stdout, /npm run build/);
    assert.match(stdout, /npm run catalog:check/);
    assert.match(stdout, /npm run check:styles/);
  });
});

test('scaffolded local catalog script verifies generated metadata end to end', () => {
  withScaffold('my-widgets', ({ target }) => {
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [join(target, 'scripts/kerf-component-catalog.mjs'), '--check'],
          { cwd: target, encoding: 'utf8', stdio: 'pipe' },
        ),
      (error) =>
        error.stderr.includes(
          'TypeScript is required for syntax-aware export verification; run npm install',
        ),
    );
    assert.ok(
      existsSync(join(PACKAGE_NODE_MODULES, 'typescript', 'package.json')),
      'the initializer package must install its declared TypeScript dependency',
    );
    // Model the generated package after `npm install` using only the
    // initializer package's own dependency tree. Pointing at the repository
    // root hid missing package-local dependencies in isolated release jobs.
    symlinkSync(PACKAGE_NODE_MODULES, join(target, 'node_modules'), 'dir');
    const output = execFileSync(
      process.execPath,
      [join(target, 'scripts/kerf-component-catalog.mjs'), '--check'],
      { cwd: target, encoding: 'utf8' },
    );
    assert.match(output, /verified component-composition\.json/);
  });
});

test('non-interactive (no TTY) missing-arg run prints usage to stderr and exits 1', () => {
  // With no dir arg and no TTY (piped stdin, as in CI), there's nothing to
  // prompt, so it must usage+fail rather than hang.
  try {
    execFileSync('node', [CLI], { stdio: 'pipe' });
    assert.fail('should have exited non-zero');
  } catch (err) {
    assert.equal(err.status, 1);
    assert.match(String(err.stderr), /Usage: npm create kerf-component/);
  }
});

test('--help prints usage and exits 0', () => {
  const out = execFileSync('node', [CLI, '--help'], { encoding: 'utf8' });
  assert.match(out, /Usage: npm create kerf-component/);
});

test('with no arg, takes the target from piped stdin (the prompt fallback)', () => {
  // Mirrors a TTY user typing a name at the prompt: no dir arg, the name comes
  // from stdin. Run from a temp cwd so the scaffold lands there.
  const dir = mkdtempSync(join(tmpdir(), 'ckc-'));
  try {
    const stdout = execFileSync('node', [CLI], {
      cwd: dir,
      input: 'piped-widget\n',
      encoding: 'utf8',
    });
    assert.match(stdout, /Scaffolded kerf component package "piped-widget"/);
    assert.equal(
      JSON.parse(
        readFileSync(join(dir, 'piped-widget', 'package.json'), 'utf8'),
      ).name,
      'piped-widget',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects an existing non-empty target directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ckc-'));
  try {
    execFileSync('node', [CLI, join(dir, 'a')], { stdio: 'pipe' }); // first scaffold ok
    assert.throws(
      () => execFileSync('node', [CLI, join(dir, 'a')], { stdio: 'pipe' }),
      /Command failed/,
      'second scaffold into non-empty dir must fail',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects an invalid package name', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ckc-'));
  try {
    assert.throws(
      () =>
        execFileSync('node', [CLI, join(dir, 'Bad Name')], { stdio: 'pipe' }),
      /Command failed/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

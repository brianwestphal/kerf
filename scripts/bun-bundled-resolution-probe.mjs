// KF-C6HCET: disposable diagnosis, never a production install recipe.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  assertMarkdownResults,
  inputHashes,
  installedGraph,
  markdownProbes,
  packageLocation,
} from './bun-pure-wasi-probe.mjs';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

export function bundledManifestEvidence(folder) {
  const path = join(folder, 'package.json');
  const manifest = json(path);
  const names =
    manifest.bundledDependencies ?? manifest.bundleDependencies ?? [];
  assert.ok(Array.isArray(names), 'Expected an explicit bundled package list');
  return {
    manifest,
    sha256: digest(readFileSync(path)),
    bundles: names.map((name) => {
      const path = join(folder, 'node_modules', name, 'package.json');
      return {
        name,
        declared: manifest.dependencies?.[name] ?? null,
        present: existsSync(path),
        manifest: existsSync(path) ? json(path) : null,
        sha256: existsSync(path) ? digest(readFileSync(path)) : null,
      };
    }),
  };
}

export function assertResolutionOutcome(execution, bundled404) {
  assert.equal(
    execution.error,
    null,
    'Dependency command did not exit normally',
  );
  assert.equal(execution.signal, null, 'Dependency command was killed');
  assert.equal(execution.status, bundled404 ? 1 : 0, execution.stderr);
  if (bundled404)
    assert.match(
      execution.stderr,
      /GET https:\/\/registry\.npmjs\.org\/@domotion%2ftext-engine - 404[\s\S]*@domotion\/text-engine@0\.35\.0 failed to resolve/,
    );
}

export function siteTooling(site) {
  site = realpathSync(resolve(site));
  const from = join(site, 'package.json');
  const require = createRequire(from);
  const portable = (path) => relative(site, path).split('\\').join('/');
  return ['typescript', 'vite', '@playwright/test', 'astro'].map((name) => {
    const path = packageLocation(from, name);
    assert.ok(path, `Site tooling manifest missing: ${name}`);
    const entry = require.resolve(name);
    const manifest = json(path);
    assert.equal(
      manifest.name,
      name,
      `Unexpected site tooling package: ${name}`,
    );
    return {
      name,
      entry: portable(entry),
      manifestPath: portable(path),
      realManifestPath: portable(realpathSync(path)),
      manifest,
      sha256: digest(readFileSync(path)),
    };
  });
}

export function assertToolingRetained(baseline, restored) {
  assert.deepEqual(
    restored,
    baseline,
    'Frozen restore changed or lost site tooling',
  );
}

export function assertCanonicalInputs(before, after) {
  assert.deepEqual(after, before, 'Canonical source manifests/locks changed');
}

export async function runBundledResolutionProbe(
  source,
  evidence,
  bun = process.env.BUN_BINARY ?? 'bun',
) {
  source = resolve(source);
  evidence = resolve(evidence);
  mkdirSync(evidence, { recursive: true });
  const scratch = mkdtempSync(join(tmpdir(), 'kerf-bun-bundled-'));
  const env = { ...process.env, BUN_INSTALL_CACHE_DIR: join(scratch, 'cache') };
  const command = (binary, args, cwd = source) => {
    const value = spawnSync(binary, args, {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 180_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    return {
      command: [binary === bun ? 'bun' : binary, ...args],
      status: value.status,
      signal: value.signal,
      error: value.error?.code ?? null,
      stdout: (value.stdout ?? '').replaceAll(scratch, '<fixture>'),
      stderr: (value.stderr ?? '').replaceAll(scratch, '<fixture>'),
    };
  };
  const tool = (binary, args) => {
    const value = command(binary, args);
    assertResolutionOutcome(value, false);
    return value.stdout.trim();
  };
  const paths = [
    'package.json',
    'package-lock.json',
    'site/package.json',
    'site/package-lock.json',
  ];
  const hashes = (root) =>
    Object.fromEntries(
      paths.map((path) => [path, digest(readFileSync(join(root, path)))]),
    );
  const canonical = hashes(source);
  const result = {
    schema: 'kerf-bun-bundled-resolution/v1',
    commit: tool('git', ['rev-parse', 'HEAD']),
    node: process.version,
    npm: tool('npm', ['--version']),
    bun: tool(bun, ['--version']),
    bunRevision: tool(bun, ['--revision']),
    platform: process.platform,
    arch: process.arch,
    canonicalInputs: canonical,
    attempts: [],
  };
  try {
    assert.equal(result.bun, '1.4.4');
    writeFileSync(
      join(evidence, 'bun-add-help.txt'),
      tool(bun, ['add', '--help']),
    );
    const repo = join(scratch, 'repo');
    mkdirSync(repo);
    const archive = join(scratch, 'source.tar');
    assertResolutionOutcome(
      command('git', [
        'archive',
        '--format=tar',
        '--output',
        archive,
        result.commit,
      ]),
      false,
    );
    assertResolutionOutcome(
      command('tar', ['-xf', archive, '-C', repo]),
      false,
    );
    assertCanonicalInputs(canonical, hashes(repo));
    for (const path of paths)
      cpSync(
        join(repo, path),
        join(evidence, `canonical-${path.replaceAll('/', '-')}`),
      );
    const site = join(repo, 'site');
    for (const args of [
      ['pm', 'migrate'],
      ['install', '--frozen-lockfile', '--ignore-scripts'],
    ]) {
      const execution = command(bun, args, site);
      result.attempts.push({
        name: args[0] === 'pm' ? 'migration' : 'native-baseline',
        execution,
      });
      save(join(evidence, 'bundled-resolution.json'), result);
      assertResolutionOutcome(execution, false);
    }
    result.baselineTooling = siteTooling(site);
    const baseline = join(scratch, 'baseline');
    cpSync(site, baseline, { recursive: true });
    const add = [
      'add',
      '--exact',
      '--ignore-scripts',
      '@bruits/satteri-wasm32-wasi@0.10.5',
    ];
    const attempts = [
      ['default-add', []],
      ['production-add', ['--production']],
      ['isolated-add', ['--linker=isolated']],
      ['no-cache-add', ['--no-cache']],
      ['lock-only-add', ['--lockfile-only']],
    ];
    const record = (name, cwd, args, bundled404) => {
      const before = inputHashes(cwd);
      const graphBefore = installedGraph(cwd);
      save(join(evidence, `${name}-graph-before.json`), graphBefore);
      const execution = command(bun, args, cwd);
      const after = inputHashes(cwd);
      const graphAfter = installedGraph(cwd);
      save(join(evidence, `${name}-graph-after.json`), graphAfter);
      for (const path of ['package.json', 'package-lock.json', 'bun.lock'])
        if (existsSync(join(cwd, path)))
          cpSync(join(cwd, path), join(evidence, `${name}-${path}`));
      const value = { name, before, after, execution };
      result.attempts.push(value);
      save(join(evidence, 'bundled-resolution.json'), result);
      assertCanonicalInputs(canonical, hashes(source));
      assert.equal(
        after['package-lock.json'],
        before['package-lock.json'],
        'Disposable canonical npm lock changed',
      );
      assertResolutionOutcome(execution, bundled404);
      if (bundled404) {
        assert.deepEqual(after, before, 'Failed add changed fixture inputs');
        assert.deepEqual(
          graphAfter,
          graphBefore,
          'Failed add changed installed graph',
        );
      }
      return value;
    };
    for (const [name, flags] of attempts) {
      // Keep file:.. pointing at the exact archived parent for every independent control.
      const attemptRoot = join(scratch, name, 'repo');
      mkdirSync(attemptRoot, { recursive: true });
      assertResolutionOutcome(
        command('tar', ['-xf', archive, '-C', attemptRoot]),
        false,
      );
      const cwd = join(attemptRoot, 'site');
      cpSync(baseline, cwd, { recursive: true });
      record(name, cwd, [...add, ...flags], name !== 'production-add');
      if (name === 'production-add') {
        assert.equal(
          json(join(cwd, 'package.json')).dependencies[
            '@bruits/satteri-wasm32-wasi'
          ],
          '0.10.5',
        );
        assert.match(
          result.attempts.at(-1).execution.stderr,
          /unsupported platform/,
        );
        record(
          'production-frozen-restore',
          cwd,
          ['install', '--frozen-lockfile', '--ignore-scripts'],
          false,
        );
        result.restoredTooling = siteTooling(cwd);
        assertToolingRetained(result.baselineTooling, result.restoredTooling);
        const probes = markdownProbes(cwd);
        assertMarkdownResults(probes);
        result.productionProbes = probes;
      }
      for (const path of ['package.json', 'package-lock.json'])
        assert.equal(
          digest(readFileSync(join(attemptRoot, path))),
          canonical[path],
          'Archived parent input changed',
        );
    }
    // A direct registry/tarball control removes both Satteri and file-parent traversal.
    const npmLock = json(join(repo, 'package-lock.json'));
    const locked = npmLock.packages['node_modules/domotion-svg'];
    result.lockedDomotion = locked;
    for (const [name, spec] of [
      ['registry-domotion', 'domotion-svg@0.35.0'],
      ['tarball-domotion', locked.resolved],
    ]) {
      const cwd = join(scratch, name);
      mkdirSync(cwd);
      save(join(cwd, 'package.json'), {
        name: 'bundle-probe',
        version: '1.0.0',
        private: true,
      });
      record(name, cwd, ['add', '--exact', '--ignore-scripts', spec], true);
    }
    const response = await fetch(locked.resolved);
    assert.equal(response.status, 200);
    const tarball = Buffer.from(await response.arrayBuffer());
    assert.equal(
      `sha512-${createHash('sha512').update(tarball).digest('base64')}`,
      locked.integrity,
      'Published tarball differs from canonical lock integrity',
    );
    const tarPath = join(scratch, 'domotion.tgz');
    writeFileSync(tarPath, tarball);
    const unpack = join(scratch, 'published');
    mkdirSync(unpack);
    assertResolutionOutcome(
      command('tar', ['-xzf', tarPath, '-C', unpack]),
      false,
    );
    result.published = bundledManifestEvidence(join(unpack, 'package'));
    assert.ok(
      result.published.bundles.some(
        (item) =>
          item.name === '@domotion/text-engine' &&
          item.present &&
          item.manifest.version === '0.35.0',
      ),
      'Published tarball lacks expected bundle',
    );
    save(join(evidence, 'published-bundle.json'), {
      tarballSha256: digest(tarball),
      integrity: locked.integrity,
      ...result.published,
    });
    result.finding =
      'Bun1.4.4 registry and tarball resolution requests an already bundled private dependency. Production-only add bypasses parent dev resolution but skips unsupported WASI; it is not a bundle fix or WASI provisioning.';
    assertCanonicalInputs(canonical, hashes(source));
    save(join(evidence, 'bundled-resolution.json'), result);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const evidence = process.env.BUN_QUALIFICATION_EVIDENCE;
  if (!evidence) throw new Error('BUN_QUALIFICATION_EVIDENCE is required');
  await runBundledResolutionProbe(process.argv[2] ?? '.', evidence);
}

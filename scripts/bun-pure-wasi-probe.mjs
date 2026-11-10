// KF-AT2EEZ: disposable installer evidence, never a production install recipe.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const provisioningAttempts = [
  {
    name: 'native',
    args: ['install', '--frozen-lockfile', '--ignore-scripts'],
  },
  {
    name: 'all-cpus',
    args: ['install', '--frozen-lockfile', '--ignore-scripts', '--cpu=*'],
  },
  {
    name: 'any-cpu',
    args: ['install', '--frozen-lockfile', '--ignore-scripts', '--cpu=any'],
  },
  {
    name: 'all-platforms',
    args: [
      'install',
      '--frozen-lockfile',
      '--ignore-scripts',
      '--cpu=*',
      '--os=*',
    ],
  },
  {
    name: 'unsupported-wasm32',
    args: ['install', '--frozen-lockfile', '--ignore-scripts', '--cpu=wasm32'],
    expectedStatus: 1,
  },
  {
    name: 'direct-platform',
    args: [
      'add',
      '--exact',
      '--ignore-scripts',
      '@bruits/satteri-wasm32-wasi@0.10.5',
    ],
    manifestChangeAllowed: true,
    allowFailure: true,
  },
  {
    name: 'direct-all-platforms',
    args: [
      'install',
      '--frozen-lockfile',
      '--ignore-scripts',
      '--cpu=*',
      '--os=*',
    ],
  },
  {
    name: 'force-reinstall',
    args: ['install', '--frozen-lockfile', '--ignore-scripts', '--force'],
    allowFailure: true,
  },
];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const portable = (root, path) => relative(root, path).split('\\').join('/');

// Package.json subpaths can be hidden by exports. Resolve package locations
// through Node's package search paths instead of misreporting hidden metadata
// as a missing dependency. This is a package graph, not an export API check.
export function packageLocation(from, name) {
  const require = createRequire(from);
  for (const search of require.resolve.paths(name) ?? []) {
    const manifest = join(search, name, 'package.json');
    if (existsSync(manifest)) return manifest;
  }
  return null;
}

export function installedGraph(site) {
  site = realpathSync(site);
  const nodes = [];
  const links = [];
  const visited = new Set();
  const walk = (path) => {
    const physical = realpathSync(path);
    if (physical !== path)
      links.push({
        path: portable(site, path),
        target: portable(site, physical),
      });
    if (visited.has(physical)) return;
    visited.add(physical);
    const manifest = join(path, 'package.json');
    if (existsSync(manifest)) {
      const pkg = readJson(manifest);
      if (pkg.name && pkg.version) {
        const edges = Object.entries({
          ...pkg.dependencies,
          ...pkg.optionalDependencies,
          ...pkg.peerDependencies,
        }).map(([name, range]) => {
          const target = packageLocation(manifest, name);
          return {
            name,
            range,
            target: target ? portable(site, dirname(target)) : null,
          };
        });
        nodes.push({ path: portable(site, path), manifest: pkg, edges });
      }
    }
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      try {
        walk(join(path, entry.name));
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR', 'ELOOP'].includes(error.code)) throw error;
      }
    }
  };
  if (existsSync(join(site, 'node_modules'))) walk(join(site, 'node_modules'));
  nodes.sort((a, b) => a.path.localeCompare(b.path));
  links.sort((a, b) => a.path.localeCompare(b.path));
  return { nodes, links };
}

export function inputHashes(site) {
  return Object.fromEntries(
    ['package.json', 'package-lock.json', 'bun.lock'].map((name) => [
      name,
      existsSync(join(site, name))
        ? sha256(readFileSync(join(site, name)))
        : null,
    ]),
  );
}

export function assertInputBoundary(before, after, attempt) {
  assert.equal(
    after['package-lock.json'],
    before['package-lock.json'],
    'Canonical npm lock changed',
  );
  if (!attempt.manifestChangeAllowed) {
    assert.equal(
      after['package.json'],
      before['package.json'],
      'Unexpected manifest change',
    );
    assert.equal(
      after['bun.lock'],
      before['bun.lock'],
      'Frozen Bun lock changed',
    );
  }
}

function command(binary, args, cwd, env, timeout = 180_000) {
  const result = spawnSync(binary, args, {
    cwd,
    env,
    encoding: 'utf8',
    timeout,
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    status: result.status,
    signal: result.signal,
    error: result.error?.code ?? null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

export function markdownProbes(site) {
  const require = createRequire(join(site, 'package.json'));
  const entry = require.resolve('satteri');
  const loader = createRequire(entry).resolve('#binding');
  const names = [
    '@bruits/satteri-wasm32-wasi',
    '@emnapi/core',
    '@emnapi/runtime',
    '@emnapi/wasi-threads',
    '@napi-rs/wasm-runtime',
  ];
  const resolutions = names.map((name) => {
    const manifest = packageLocation(loader, name);
    return {
      name,
      path: manifest ? portable(site, manifest) : null,
      version: manifest ? readJson(manifest).version : null,
    };
  });
  const source = `const { markdownToHtml } = await import(${JSON.stringify(pathToFileURL(entry).href)});
const result = await markdownToHtml('# WASM probe\\n\\n**works**');
if (!result.html.includes('<h1>WASM probe</h1>') || !result.html.includes('<strong>works</strong>')) throw new Error('Markdown output mismatch');
console.log(result.html);`;
  const run = (strict) => {
    const env = { ...process.env };
    delete env.NAPI_RS_FORCE_WASI;
    if (strict) env.NAPI_RS_FORCE_WASI = 'error';
    const result = command(
      process.execPath,
      ['--input-type=module', '-e', source],
      site,
      env,
      30_000,
    );
    // Child diagnostics may contain the disposable directory; make evidence portable.
    result.stderr = result.stderr.replaceAll(site, '<fixture>/site');
    return result;
  };
  return {
    entry: portable(site, entry),
    loader: portable(site, loader),
    resolutions,
    native: run(false),
    strict: run(true),
  };
}

export function assertMarkdownResults(probes) {
  assert.equal(probes.native.status, 0, 'Native Markdown failed');
  for (const result of [probes.native, probes.strict]) {
    assert.equal(result.signal, null, 'Markdown process was killed or hung');
    assert.equal(result.error, null, 'Markdown process did not exit cleanly');
  }
  if (probes.strict.status !== 0) {
    assert.equal(probes.strict.status, 1);
    assert.match(probes.strict.stderr, /WASI binding not found/);
  }
}

export async function runPureBunProbe(
  source,
  evidence,
  bun = process.env.BUN_BINARY ?? 'bun',
) {
  source = realpathSync(resolve(source));
  evidence = resolve(evidence);
  mkdirSync(evidence, { recursive: true });
  const scratch = realpathSync(
    mkdtempSync(join(tmpdir(), 'kerf-pure-bun-wasi-')),
  );
  const fixture = join(scratch, 'repo');
  mkdirSync(fixture);
  const env = { ...process.env, BUN_INSTALL_CACHE_DIR: join(scratch, 'cache') };
  const tool = (binary, args) => {
    const result = command(binary, args, source, env);
    assert.equal(
      result.status,
      0,
      `${binary} ${args.join(' ')} failed: ${result.stderr}`,
    );
    return result.stdout.trim();
  };
  const result = {
    schema: 'kerf-pure-bun-wasi/v1',
    commit: tool('git', ['rev-parse', 'HEAD']),
    node: process.version,
    npm: tool('npm', ['--version']),
    bun: tool(bun, ['--version']),
    bunRevision: tool(bun, ['--revision']),
    platform: process.platform,
    arch: process.arch,
    runtimePolicy: 'Bun installs; Node executes Satteri. No Bun-runtime claim.',
    lifecyclePolicy:
      'Disposable fixture only: --ignore-scripts; isolated cache; no user config writes.',
    canonicalInputs: {},
    attempts: [],
  };
  try {
    assert.equal(result.bun, '1.4.4');
    writeFileSync(
      join(evidence, 'bun-install-help.txt'),
      tool(bun, ['install', '--help']),
    );
    const archivePath = join(scratch, 'source.tar');
    const archive = command(
      'git',
      ['archive', '--format=tar', '--output', archivePath, result.commit],
      source,
      env,
    );
    assert.equal(archive.status, 0, archive.stderr);
    const unpack = spawnSync('tar', ['-xf', archivePath, '-C', fixture]);
    assert.equal(unpack.status, 0);
    const site = join(fixture, 'site');
    for (const path of [
      'package.json',
      'package-lock.json',
      'site/package.json',
      'site/package-lock.json',
    ]) {
      const bytes = readFileSync(join(fixture, path));
      result.canonicalInputs[path] = sha256(bytes);
      writeFileSync(
        join(evidence, `canonical-${path.replaceAll('/', '-')}`),
        bytes,
      );
    }
    const initial = inputHashes(site);
    const migration = command(bun, ['pm', 'migrate'], site, env);
    writeFileSync(
      join(evidence, 'migration.json'),
      JSON.stringify(migration, null, 2),
    );
    assert.equal(migration.status, 0, 'Bun lock migration failed');
    const migrated = inputHashes(site);
    assert.equal(migrated['package.json'], initial['package.json']);
    assert.equal(migrated['package-lock.json'], initial['package-lock.json']);
    for (const attempt of provisioningAttempts) {
      const before = inputHashes(site);
      const graphBefore = installedGraph(site);
      const execution = command(bun, attempt.args, site, env);
      execution.stdout = execution.stdout.replaceAll(scratch, '<fixture>');
      execution.stderr = execution.stderr.replaceAll(scratch, '<fixture>');
      const after = inputHashes(site);
      for (const path of [
        'package.json',
        'package-lock.json',
        'site/package-lock.json',
      ]) {
        assert.equal(
          sha256(readFileSync(join(fixture, path))),
          result.canonicalInputs[path],
          `Canonical input changed: ${path}`,
        );
      }
      const probes = markdownProbes(site);
      const item = {
        name: attempt.name,
        command: ['bun', ...attempt.args],
        before,
        after,
        execution,
        probes,
      };
      result.attempts.push(item);
      writeFileSync(
        join(evidence, `${attempt.name}-graph-before.json`),
        JSON.stringify(graphBefore, null, 2),
      );
      writeFileSync(
        join(evidence, `${attempt.name}-graph-after.json`),
        JSON.stringify(installedGraph(site), null, 2),
      );
      for (const file of ['package.json', 'package-lock.json', 'bun.lock'])
        writeFileSync(
          join(evidence, `${attempt.name}-${file}`),
          readFileSync(join(site, file)),
        );
      writeFileSync(
        join(evidence, 'pure-bun-wasi.json'),
        `${JSON.stringify(result, null, 2)}\n`,
      );
      if (attempt.allowFailure)
        assert.ok(
          [0, 1].includes(execution.status),
          `${attempt.name}: unexpected process failure`,
        );
      else
        assert.equal(
          execution.status,
          attempt.expectedStatus ?? 0,
          `${attempt.name}: unexpected exit: ${execution.stderr}`,
        );
      assert.equal(execution.signal, null);
      assert.equal(execution.error, null);
      assertInputBoundary(before, after, attempt);
      assertMarkdownResults(probes);
    }
    result.recommendation = result.attempts.some(
      (item) => item.probes.strict.status === 0,
    )
      ? 'Strict WASI worked in a disposable attempt; inspect its exact graph and policy before making any support claim.'
      : 'Native-only experimental candidate. Strict WASI unsupported by tested Bun 1.4.4 provisioning; no production installer adoption.';
    writeFileSync(
      join(evidence, 'pure-bun-wasi.json'),
      `${JSON.stringify(result, null, 2)}\n`,
    );
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
  await runPureBunProbe(process.argv[2] ?? '.', evidence);
}

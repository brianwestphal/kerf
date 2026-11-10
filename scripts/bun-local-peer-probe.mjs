// KF-0X25EY: diagnose local-file snapshots without changing canonical order.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const portable = (root, path) =>
  relative(root, path).split('\\').join('/') || '.';

export function fileEvidence(path) {
  if (!existsSync(path)) return { exists: false };
  const bytes = readFileSync(path);
  return { exists: true, sha256: digest(bytes), bytes: bytes.toString('utf8') };
}

export function peerEvidence(root, consumer = 'site', name = 'kerfjs') {
  root = realpathSync(root);
  const location = join(root, consumer, 'node_modules', name);
  const snapshot = (path) => ({
    path: portable(root, path),
    exists: existsSync(path),
    realpath: existsSync(path) ? portable(root, realpathSync(path)) : null,
    symlink: existsSync(path) ? lstatSync(path).isSymbolicLink() : null,
    manifest: fileEvidence(join(path, 'package.json')),
    declaration: fileEvidence(join(path, 'dist/index.d.ts')),
  });
  return {
    source: snapshot(root),
    installed: snapshot(location),
    ancestor: snapshot(join(root, 'node_modules', name)),
  };
}

export function resolvePeerTypes(
  root,
  typescript,
  consumer = 'site',
  name = 'kerfjs',
) {
  root = realpathSync(root);
  const file = join(
    root,
    consumer,
    'src/examples/complete/row-selector/main.tsx',
  );
  const resolution = typescript.resolveModuleName(
    name,
    file,
    {
      moduleResolution: typescript.ModuleResolutionKind.Bundler,
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
    typescript.sys,
  ).resolvedModule;
  return resolution
    ? {
        compiler: typescript.version,
        path: portable(root, resolution.resolvedFileName),
        packageId: resolution.packageId ?? null,
        declaration: fileEvidence(resolution.resolvedFileName),
      }
    : null;
}

function run(binary, args, cwd, env, timeout = 240_000) {
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

function checked(binary, args, cwd, env) {
  const result = run(binary, args, cwd, env);
  assert.equal(
    result.status,
    0,
    `${binary} ${args.join(' ')}: ${result.stderr}`,
  );
  assert.equal(result.signal, null);
  assert.equal(result.error, null);
  return result;
}

function writeDeclaration(root, text) {
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/index.d.ts.next'), text);
  renameSync(join(root, 'dist/index.d.ts.next'), join(root, 'dist/index.d.ts'));
}

export function minimalPeerCase(
  root,
  installer,
  binary,
  env,
  initialDist = false,
  protocol = 'file:..',
) {
  mkdirSync(join(root, 'site'), { recursive: true });
  const manifest = {
    name: 'kerf-peer-fixture',
    version: '1.0.0',
    type: 'module',
    types: './dist/index.d.ts',
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
    files: ['dist'],
  };
  const site = {
    name: 'consumer',
    version: '1.0.0',
    private: true,
    dependencies: { 'kerf-peer-fixture': 'file:..' },
  };
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest));
  writeFileSync(join(root, 'site/package.json'), JSON.stringify(site));
  writeFileSync(
    join(root, 'site/package-lock.json'),
    JSON.stringify({
      name: site.name,
      version: site.version,
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': site,
        '..': manifest,
        'node_modules/kerf-peer-fixture': { resolved: '..', link: true },
      },
    }),
  );
  if (initialDist)
    writeDeclaration(root, 'export declare const before: string;\n');
  const commands = [];
  const install = (args) => {
    const result = checked(binary, args, join(root, 'site'), env);
    commands.push({ command: [installer, ...args], ...result });
  };
  if (installer === 'bun') {
    install(['pm', 'migrate']);
    install(['install', '--frozen-lockfile', '--ignore-scripts']);
    if (protocol === 'link:..') {
      site.dependencies['kerf-peer-fixture'] = protocol;
      writeFileSync(join(root, 'site/package.json'), JSON.stringify(site));
      install(['install', '--lockfile-only', '--ignore-scripts']);
      install(['install', '--frozen-lockfile', '--ignore-scripts']);
    }
  } else
    install(['ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund']);
  const before = peerEvidence(root, 'site', manifest.name);
  const inputsBefore = inputState(root);
  writeDeclaration(root, 'export declare const selector: string;\n');
  const created = peerEvidence(root, 'site', manifest.name);
  writeDeclaration(root, 'export declare const selector: number;\n');
  const replaced = peerEvidence(root, 'site', manifest.name);
  const inputsAfter = inputState(root);
  assert.deepEqual(inputsAfter, inputsBefore);
  if (installer === 'bun' && protocol === 'file:..') {
    assert.equal(before.installed.symlink, false);
    assert.deepEqual(
      replaced.installed.declaration,
      before.installed.declaration,
      'File snapshot unexpectedly tracked the atomic source replacement',
    );
  } else {
    assert.equal(before.installed.symlink, true);
    assert.deepEqual(created.installed.declaration, created.source.declaration);
    assert.deepEqual(
      replaced.installed.declaration,
      replaced.source.declaration,
    );
  }
  return {
    installer,
    initialDist,
    protocol,
    commands,
    before,
    created,
    replaced,
    inputsBefore,
    inputsAfter,
  };
}

function inputState(root) {
  return Object.fromEntries(
    [
      'package.json',
      'package-lock.json',
      'bun.lock',
      'site/package.json',
      'site/package-lock.json',
      'site/bun.lock',
    ].map((path) => [
      path,
      existsSync(join(root, path))
        ? digest(readFileSync(join(root, path)))
        : null,
    ]),
  );
}

export async function runLocalPeerProbe(
  source,
  evidence,
  bun = process.env.BUN_BINARY ?? 'bun',
) {
  source = realpathSync(resolve(source));
  evidence = resolve(evidence);
  mkdirSync(evidence, { recursive: true });
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'kerf-bun-peer-')));
  const root = join(scratch, 'repo');
  mkdirSync(root);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  Object.assign(env, {
    BUN_INSTALL_CACHE_DIR: join(scratch, 'cache'),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Peer Probe',
    GIT_AUTHOR_EMAIL: 'probe@example.invalid',
    GIT_COMMITTER_NAME: 'Peer Probe',
    GIT_COMMITTER_EMAIL: 'probe@example.invalid',
  });
  const tool = (binary, args) =>
    checked(binary, args, source, env).stdout.trim();
  const result = {
    schema: 'kerf-bun-local-peer/v1',
    commit: tool('git', ['rev-parse', 'HEAD']),
    node: process.version,
    npm: tool('npm', ['--version']),
    bun: tool(bun, ['--version']),
    bunRevision: tool(bun, ['--revision']),
    platform: process.platform,
    arch: process.arch,
    minimal: [],
    commands: [],
  };
  const save = () =>
    writeFileSync(
      join(evidence, 'local-peer.json'),
      `${JSON.stringify(result, null, 2).replaceAll(scratch, '<fixture>')}\n`,
    );
  const execute = (label, binary, args, cwd = root) => {
    const execution = run(binary, args, cwd, env);
    result.commands.push({
      label,
      command: [
        binary === bun ? 'bun' : binary === process.execPath ? 'node' : binary,
        ...args,
      ],
      cwd: portable(root, cwd),
      ...execution,
    });
    save();
    assert.equal(execution.status, 0, `${label}: ${execution.stderr}`);
    return execution;
  };
  try {
    assert.equal(result.bun, '1.4.4');
    for (const installer of ['bun', 'npm'])
      for (const initialDist of [false, true]) {
        result.minimal.push(
          minimalPeerCase(
            join(scratch, `${installer}-${initialDist}`),
            installer,
            installer === 'bun' ? bun : 'npm',
            env,
            initialDist,
          ),
        );
        save();
      }
    result.minimal.push(
      minimalPeerCase(
        join(scratch, 'bun-link'),
        'bun',
        bun,
        env,
        false,
        'link:..',
      ),
    );
    const archive = join(scratch, 'source.tar');
    checked(
      'git',
      ['archive', '--format=tar', '--output', archive, result.commit],
      source,
      env,
    );
    checked('tar', ['-xf', archive, '-C', root], source, env);
    checked('git', ['init', '-q', '-b', 'main'], root, env);
    checked(
      'git',
      ['commit', '-q', '--allow-empty', '-m', 'disposable probe'],
      root,
      env,
    );
    result.canonicalInputs = inputState(root);
    for (const path of [
      'package.json',
      'package-lock.json',
      'site/package.json',
      'site/package-lock.json',
    ])
      writeFileSync(
        join(evidence, `canonical-${path.replaceAll('/', '-')}`),
        readFileSync(join(root, path)),
      );
    // Exact relevant canonical order: root install, site install, THEN root build.
    execute('root-migrate', bun, ['pm', 'migrate']);
    execute('root-install', bun, ['install', '--frozen-lockfile']);
    execute('site-migrate', bun, ['pm', 'migrate'], join(root, 'site'));
    execute(
      'site-install',
      bun,
      ['install', '--frozen-lockfile'],
      join(root, 'site'),
    );
    result.frozenInputs = inputState(root);
    for (const path of ['bun.lock', 'site/bun.lock'])
      writeFileSync(
        join(evidence, `frozen-${path.replaceAll('/', '-')}`),
        readFileSync(join(root, path)),
      );
    const typescript = createRequire(join(root, 'package.json'))('typescript');
    const observe = () => ({
      peer: peerEvidence(root),
      types: resolvePeerTypes(root, typescript),
      inputs: inputState(root),
    });
    result.beforeBuild = observe();
    save();
    execute('root-build', 'npm', ['run', 'build']);
    result.afterBuild = observe();
    const typingArgs = [
      'node_modules/typescript7/bin/tsc',
      '-p',
      'site/src/examples/complete/tsconfig.json',
    ];
    result.baselineTyping = run(process.execPath, typingArgs, root, env);
    save();
    assert.equal(result.afterBuild.peer.installed.declaration.exists, false);
    assert.equal(
      result.afterBuild.types?.path,
      'node_modules/kerfjs/dist/index.d.ts',
    );
    assert.equal(
      result.baselineTyping.status,
      1,
      'Original missing-selector failure did not reproduce',
    );
    assert.match(
      result.baselineTyping.stdout,
      /TS2305:.*no exported member 'selector'/,
    );
    assert.equal(result.baselineTyping.signal, null);
    assert.equal(result.baselineTyping.error, null);
    assert.deepEqual(
      inputState(root),
      result.frozenInputs,
      'Build changed frozen input files',
    );
    // A supported path link is a SEPARATE disposable policy, not baseline repair.
    // Reset only owned build output so the candidate also installs before dist.
    renameSync(join(root, 'dist'), join(scratch, 'baseline-dist'));
    const siteManifest = JSON.parse(
      readFileSync(join(root, 'site/package.json'), 'utf8'),
    );
    siteManifest.dependencies.kerfjs = 'link:..';
    writeFileSync(
      join(root, 'site/package.json'),
      `${JSON.stringify(siteManifest, null, 2)}\n`,
    );
    execute(
      'link-policy-plan',
      bun,
      ['install', '--lockfile-only', '--ignore-scripts'],
      join(root, 'site'),
    );
    execute(
      'link-policy-install',
      bun,
      ['install', '--frozen-lockfile', '--ignore-scripts'],
      join(root, 'site'),
    );
    result.linkPolicyBeforeBuild = observe();
    execute('link-policy-root-build', 'npm', ['run', 'build']);
    result.linkPolicy = observe();
    result.linkTyping = run(process.execPath, typingArgs, root, env);
    assert.equal(
      result.linkPolicyBeforeBuild.peer.source.declaration.exists,
      false,
    );
    assert.equal(result.linkPolicyBeforeBuild.peer.installed.symlink, true);
    assert.deepEqual(
      result.linkPolicy.peer.installed.declaration,
      result.linkPolicy.peer.source.declaration,
    );
    assert.equal(result.linkPolicy.types?.path, 'dist/index.d.ts');
    assert.deepEqual(
      result.linkPolicy.inputs,
      result.linkPolicyBeforeBuild.inputs,
    );
    for (const path of [
      'package.json',
      'package-lock.json',
      'site/package-lock.json',
    ])
      assert.equal(
        inputState(root)[path],
        result.canonicalInputs[path],
        `Canonical input changed: ${path}`,
      );
    assert.equal(
      result.linkTyping.status,
      0,
      result.linkTyping.stdout + result.linkTyping.stderr,
    );
    assert.equal(result.linkTyping.signal, null);
    assert.equal(result.linkTyping.error, null);
    for (const path of ['bun.lock', 'site/bun.lock', 'site/package.json'])
      writeFileSync(
        join(evidence, `policy-${path.replaceAll('/', '-')}`),
        readFileSync(join(root, path)),
      );
    result.policy =
      'Diagnostic only: file snapshots and explicit link:.. are separate candidates; production stays npm, no global Bun link registry or build reordering.';
    save();
    console.log(
      JSON.stringify(result, null, 2).replaceAll(scratch, '<fixture>'),
    );
    return result;
  } finally {
    save();
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (!process.env.BUN_QUALIFICATION_EVIDENCE)
    throw new Error('BUN_QUALIFICATION_EVIDENCE is required');
  await runLocalPeerProbe(
    process.argv[2] ?? '.',
    process.env.BUN_QUALIFICATION_EVIDENCE,
  );
}

// Build-free artifact probe: use the already Bun-built dist bytes, never publish.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const evidence = process.env.BUN_QUALIFICATION_EVIDENCE;
if (!evidence) throw new Error('BUN_QUALIFICATION_EVIDENCE is required');
const packages = ['.', 'ui', 'eslint-plugin', 'create-kerf-component'];
const reports = [];
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120_000,
  });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}
for (const version of ['5.0.0', '5.0.0-beta.999999']) {
  const fixture = mkdtempSync(join(tmpdir(), 'kerf-bun-artifacts-'));
  const copy = (relative) => {
    const source = join(root, relative);
    const destination = join(fixture, relative);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  };
  for (const relative of packages) {
    const manifest = JSON.parse(
      readFileSync(join(root, relative, 'package.json'), 'utf8'),
    );
    copy(join(relative, 'package.json'));
    for (const entry of manifest.files) {
      if (existsSync(join(root, relative, entry))) copy(join(relative, entry));
    }
  }
  // Metadata preparation also validates the canonical scaffold schema pair.
  for (const file of [
    'scripts/prepare-release-package.mjs',
    'scripts/sync-scaffold-catalog-schema.mjs',
  ])
    copy(file);
  for (const relative of packages) {
    const cwd = join(fixture, relative);
    const manifestPath = join(cwd, 'package.json');
    const name = JSON.parse(readFileSync(manifestPath, 'utf8')).name;
    run(
      process.execPath,
      [
        join(fixture, 'scripts/prepare-release-package.mjs'),
        name,
        version,
        '--root',
        fixture,
      ],
      fixture,
    );
    const out = join(evidence, 'packed', version, name.replaceAll('/', '-'));
    mkdirSync(out, { recursive: true });
    const packed = JSON.parse(
      run(
        'npm',
        ['pack', '--ignore-scripts', '--json', '--pack-destination', out],
        cwd,
      ),
    );
    const artifact = join(out, packed[0].filename);
    const before = createHash('sha256')
      .update(readFileSync(artifact))
      .digest('hex');
    const metadata = JSON.parse(
      run('tar', ['-xOf', artifact, 'package/package.json'], cwd),
    );
    assert.equal(metadata.version, version);
    if (relative === '.' || relative === 'ui') {
      const entries = run('tar', ['-tf', artifact], cwd);
      assert.match(entries, /package\/dist\/index\.js/);
      assert.match(entries, /package\/dist\/index\.d\.ts/);
    }
    const args = [
      'publish',
      artifact,
      '--dry-run',
      '--offline',
      '--ignore-scripts',
      '--access',
      'public',
      '--json',
    ];
    if (version.includes('-')) args.push('--tag', 'beta');
    const dryRun = run('npm', args, fixture);
    assert.equal(
      createHash('sha256').update(readFileSync(artifact)).digest('hex'),
      before,
    );
    reports.push({
      name,
      version,
      filename: basename(artifact),
      sha256: before,
      integrity: packed[0].integrity,
      metadata,
      dryRun,
    });
    console.log(
      `${name}@${version}: packed artifact ${before}; offline publish dry-run passed`,
    );
  }
}
mkdirSync(evidence, { recursive: true });
writeFileSync(
  join(evidence, 'release-artifacts.json'),
  `${JSON.stringify(reports, null, 2)}\n`,
);
console.log(
  'No registry publication or OIDC token was requested. Whole stable release CLI dry-run is unavailable; see KF-Y9A9XE.',
);

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = mkdtempSync(join(tmpdir(), 'kerf-release-package-'));
const betaVersion = '5.0.0-beta.2';

const packages = [
  ['kerfjs', '.'],
  ['eslint-plugin-kerfjs', 'eslint-plugin'],
  ['create-kerf-component', 'create-kerf-component'],
  ['@kerfjs/ui', 'ui'],
] as const;

function copy(relative: string): void {
  const destination = join(fixtureRoot, relative);
  mkdirSync(resolve(destination, '..'), { recursive: true });
  cpSync(join(repoRoot, relative), destination, { recursive: true });
}

function packedText(tarball: string, relative: string): string {
  return execFileSync('tar', ['-xOf', tarball, `package/${relative}`], { encoding: 'utf8' });
}

beforeAll(() => {
  for (const relative of [
    'scripts/prepare-release-package.mjs',
    'package.json',
    'ai/manifest.json',
    'eslint-plugin/package.json',
    'eslint-plugin/index.js',
    'create-kerf-component/package.json',
    'create-kerf-component/index.js',
    'create-kerf-component/template',
    'ui/package.json',
    'ui/ai/public-api-signatures-v1.md',
    'ui/ai/webawesome-jsx-signatures-v1.md',
  ]) copy(relative);

  for (const [name] of packages) {
    execFileSync(
      process.execPath,
      [
        join(fixtureRoot, 'scripts/prepare-release-package.mjs'),
        name,
        betaVersion,
        '--root',
        fixtureRoot,
      ],
      { stdio: 'pipe' },
    );
  }
});

afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

describe('release package preparation', () => {
  it('packs synchronized beta metadata into all four release artifacts', () => {
    const tarballs = new Map<string, string>();

    for (const [name, relative] of packages) {
      const out = join(fixtureRoot, 'packed', name.replaceAll('/', '-'));
      mkdirSync(out, { recursive: true });
      const packOutput = execFileSync(
        'npm',
        ['pack', '--ignore-scripts', '--json', '--pack-destination', out],
        {
          cwd: join(fixtureRoot, relative),
          encoding: 'utf8',
          env: {
            ...process.env,
            HUSKY: '0',
            npm_config_cache: join(fixtureRoot, 'npm-cache'),
          },
        },
      );
      const packResult = JSON.parse(packOutput.slice(packOutput.indexOf('[\n'))) as Array<{
        filename: string;
      }>;
      tarballs.set(name, join(out, basename(packResult[0].filename)));
    }

    const coreTarball = tarballs.get('kerfjs')!;
    expect(JSON.parse(packedText(coreTarball, 'package.json')).version).toBe(betaVersion);
    expect(JSON.parse(packedText(coreTarball, 'ai/manifest.json')).kerfjsVersion).toBe(
      betaVersion,
    );

    const pluginTarball = tarballs.get('eslint-plugin-kerfjs')!;
    expect(JSON.parse(packedText(pluginTarball, 'package.json')).version).toBe(betaVersion);
    expect(packedText(pluginTarball, 'index.js')).toContain(`version: '${betaVersion}'`);

    const createTarball = tarballs.get('create-kerf-component')!;
    expect(JSON.parse(packedText(createTarball, 'package.json')).version).toBe(betaVersion);
    const template = JSON.parse(packedText(createTarball, 'template/package.json'));
    expect(template.peerDependencies.kerfjs).toBe('^5.0.0-0');
    expect(template.devDependencies.kerfjs).toBe(`^${betaVersion}`);

    const uiTarball = tarballs.get('@kerfjs/ui')!;
    const uiManifest = JSON.parse(packedText(uiTarball, 'package.json'));
    expect(uiManifest.version).toBe(betaVersion);
    expect(uiManifest.peerDependencies.kerfjs).toBe('^5.0.0-0');
    expect(packedText(uiTarball, 'ai/public-api-signatures-v1.md')).toContain(
      `@kerfjs/ui@${betaVersion}\` and \`kerfjs@${betaVersion}`,
    );
    expect(packedText(uiTarball, 'ai/webawesome-jsx-signatures-v1.md')).toContain(
      `@kerfjs/ui@${betaVersion}`,
    );
  });

  it('keeps preparation and packing outside every OIDC publish job', () => {
    const workflows = [
      'release.yml',
      'release-eslint-plugin.yml',
      'release-create-kerf-component.yml',
      'release-ui.yml',
    ];

    for (const workflow of workflows) {
      const source = readFileSync(join(repoRoot, '.github/workflows', workflow), 'utf8');
      const publishJob = source.slice(source.indexOf('  npm-publish:\n'));
      const beforePublish = source.slice(0, source.indexOf('  npm-publish:\n'));

      expect(beforePublish).toContain('scripts/prepare-release-package.mjs');
      expect(beforePublish).toContain('npm pack --ignore-scripts');
      expect(publishJob).toContain('actions/download-artifact@');
      expect(publishJob).toContain('npm publish');
      expect(publishJob).toContain('release-package/*.tgz');
      expect(publishJob).not.toContain('scripts/prepare-release-package.mjs');
      expect(publishJob).not.toContain('npm version');
      expect(publishJob).not.toContain('npm install');
      expect(publishJob).not.toContain('actions/checkout@');
      expect(publishJob).toContain("node-version: '${{ env.PUBLISH_NODE_VERSION }}'");
    }
  });
});

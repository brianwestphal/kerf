// @vitest-environment node
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../props/cli.mjs';
import { buildPackageComponentProps } from '../../props/component-props.mjs';
import { validateJsonSchemaSubset } from '../../scripts/lib/json-schema-subset.mjs';

const root = resolve(import.meta.dirname, '../..');
const fixture = resolve(root, 'tests/fixtures/component-props-package');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
let folder: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'kerf-ui-props-'));
  cpSync(fixture, folder, { recursive: true });
});
afterEach(() => rmSync(folder, { recursive: true, force: true }));

describe('buildPackageComponentProps', () => {
  const build = () =>
    buildPackageComponentProps({
      root: folder,
      packageJson: readJson(join(folder, 'package.json')),
      composition: readJson(join(folder, 'component-composition.json')),
      overlay: readJson(join(folder, 'component-props-overlay.json')),
    });

  it('reads each component from its named subpath’s declarations', () => {
    const { document, problems } = build();
    expect(problems).toEqual([]);
    expect(document.package).toBe('@acme/widgets');
    expect(
      document.components.map((component) => [
        component.key,
        component.import,
        component.source,
      ]),
    ).toEqual([
      ['@acme/widgets:card', '@acme/widgets/card', 'package'],
      ['@acme/widgets:meter', '@acme/widgets/meter', 'package'],
    ]);
    expect(
      validateJsonSchemaSubset(
        readJson(resolve(root, 'ai/component-props.schema.json')),
        document,
      ),
    ).toEqual([]);
  });

  it('applies zones, documented defaults, control defaults, and the overlay', () => {
    const card = build().document.components[0]!;
    const prop = (name: string) =>
      card.props.find((item) => item.name === name)!;
    expect(prop('children')).toMatchObject({
      zone: 'body',
      type: { kind: 'content' },
    });
    expect(prop('footer')).toMatchObject({ slot: true });
    expect(prop('elevation')).toMatchObject({
      type: { kind: 'enum', values: ['quiet', 'raised'] },
      default: 'quiet',
      control: 'segmented',
      group: 'Appearance',
    });
    expect(prop('rootAttributes')).toMatchObject({
      control: 'hidden',
      type: { kind: 'record' },
    });
    expect(card.groups).toEqual(['Content', 'Appearance']);
  });

  it('reports a missing declaration file, a non-component entry, and overlay keys that name nothing', () => {
    const composition = readJson(join(folder, 'component-composition.json'));
    composition.entries.push(
      {
        id: 'ghost',
        name: 'Ghost',
        kind: 'component',
        publicExports: [{ name: 'Ghost', subpath: './ghost' }],
      },
      {
        id: 'helper',
        name: 'Helper',
        kind: 'component',
        publicExports: ['createCardModel'],
      },
    );
    const { problems } = buildPackageComponentProps({
      root: folder,
      packageJson: readJson(join(folder, 'package.json')),
      composition,
      overlay: { components: { '@acme/widgets:nope': { props: {} } } },
    });
    expect(problems).toEqual([
      'ghost: no declarations for @acme/widgets/ghost',
      'overlay names unknown component "@acme/widgets:nope"',
    ]);
  });

  it('accepts a string exports map and skips other packages’ entries', () => {
    writeFileSync(
      join(folder, 'index.d.ts'),
      readFileSync(join(folder, 'types/card.d.ts')),
    );
    const { document } = buildPackageComponentProps({
      root: folder,
      packageJson: { name: '@acme/widgets', exports: './index.js' },
      composition: {
        entries: [
          {
            id: 'card',
            name: 'Card',
            kind: 'component',
            publicExports: ['Card'],
          },
          {
            id: 'other',
            package: '@other/pkg',
            name: 'Other',
            kind: 'component',
            publicExports: ['Other'],
          },
        ],
      },
    });
    expect(document.components.map((component) => component.import)).toEqual([
      '@acme/widgets',
    ]);
  });
});

describe('kerf-ui-props', () => {
  it('writes, then checks, then reports a stale file', () => {
    expect(run(['--check', '--root', folder])).toMatchObject({
      code: 1,
      output: expect.stringContaining('missing'),
    });
    expect(run(['--write', '--root', folder])).toMatchObject({
      code: 0,
      output: expect.stringContaining('wrote 2 components'),
    });
    expect(run(['--check', '--root', folder])).toMatchObject({
      code: 0,
      output: expect.stringContaining('up to date'),
    });
    const card = join(folder, 'types/card.d.ts');
    writeFileSync(
      card,
      readFileSync(card, 'utf8').replace(
        'title: string;',
        'title: string;\n  subtitle?: string;',
      ),
    );
    expect(run(['--check', '--root', folder])).toMatchObject({
      code: 1,
      output: expect.stringContaining('stale'),
    });
  });

  it('explains missing configuration, catalogs, and bad arguments', () => {
    expect(run([]).code).toBe(2);
    expect(run(['--write', '--check']).code).toBe(2);
    expect(run(['--write', '--root']).code).toBe(2);
    expect(run(['--write', '--bogus']).code).toBe(2);
    expect(run(['--write', '--root', join(folder, 'types')])).toMatchObject({
      code: 2,
      output: expect.stringContaining('no package.json'),
    });
    const packageJson = readJson(join(folder, 'package.json'));
    delete packageJson.kerfComponentCatalog.propsOutput;
    writeFileSync(join(folder, 'package.json'), JSON.stringify(packageJson));
    expect(run(['--write', '--root', folder])).toMatchObject({
      code: 2,
      output: expect.stringContaining('propsOutput'),
    });
    packageJson.kerfComponentCatalog.propsOutput = './component-props.json';
    packageJson.kerfComponentCatalog.output = './missing.json';
    writeFileSync(join(folder, 'package.json'), JSON.stringify(packageJson));
    expect(run(['--write', '--root', folder])).toMatchObject({
      code: 1,
      output: expect.stringContaining('catalog:generate'),
    });
  });

  it('runs through a symlink, as npm installs bins', () => {
    const link = join(folder, 'kerf-ui-props');
    symlinkSync(resolve(root, 'props/cli.mjs'), link);
    execFileSync(process.execPath, [link, '--write', '--root', folder], {
      stdio: 'pipe',
    });
    expect(readJson(join(folder, 'component-props.json')).package).toBe(
      '@acme/widgets',
    );
  });

  it('fails on overlay problems without writing', () => {
    writeFileSync(
      join(folder, 'component-props-overlay.json'),
      JSON.stringify({
        components: { '@acme/widgets:card': { props: { nope: { order: 1 } } } },
      }),
    );
    expect(run(['--write', '--root', folder])).toMatchObject({
      code: 1,
      output: expect.stringContaining('unknown prop "nope"'),
    });
  });
});

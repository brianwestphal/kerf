import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseArguments, run } from '../../view/cli.mjs';

const root = resolve(import.meta.dirname, '../..');
const fixture = resolve(root, 'tests/fixtures/view/inbox.kui.json');
let folder: string;
let documentPath: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'kerf-ui-view-'));
  documentPath = join(folder, 'inbox.kui.json');
  copyFileSync(fixture, documentPath);
});
afterEach(() => rmSync(folder, { recursive: true, force: true }));

describe('kerf-ui-view', () => {
  it('generates the same module as the library and checks it', () => {
    const generated = run(['generate', documentPath]);
    expect(generated.code).toBe(0);
    expect(generated.output).toMatch(/inbox\.view\.ts: kui1:[0-9a-f]{16}/);
    expect(readFileSync(join(folder, 'inbox.view.ts'), 'utf8')).toBe(
      readFileSync(resolve(root, 'tests/fixtures/view/inbox.view.ts'), 'utf8'),
    );
    expect(run(['check', documentPath])).toMatchObject({
      code: 0,
      output: expect.stringContaining('up to date'),
    });
  });

  it('reports missing, stale, and hand-edited modules', () => {
    expect(run(['check', documentPath])).toMatchObject({
      code: 1,
      output: expect.stringContaining('missing'),
    });
    run(['generate', documentPath]);
    const modulePath = join(folder, 'inbox.view.ts');
    writeFileSync(
      modulePath,
      readFileSync(modulePath, 'utf8').replace(
        'tone: "brand"',
        'tone: "danger"',
      ),
    );
    expect(run(['check', documentPath])).toMatchObject({
      code: 1,
      output: expect.stringContaining('edited by hand'),
    });
    run(['generate', documentPath]);
    const document = JSON.parse(readFileSync(documentPath, 'utf8'));
    document.root.zones.header[0].zones.trailing[0].props.tone = 'danger';
    writeFileSync(documentPath, JSON.stringify(document));
    expect(run(['check', documentPath])).toMatchObject({
      code: 1,
      output: expect.stringContaining('stale'),
    });
  });

  it('diffs the contract against the existing module', () => {
    expect(run(['diff', documentPath]).output).toContain(
      'BREAKING action "compose" added',
    );
    run(['generate', documentPath]);
    expect(run(['diff', documentPath]).output).toContain('contract unchanged');
    const document = JSON.parse(readFileSync(documentPath, 'utf8'));
    document.root.zones.header[0].zones.trailing[0].props.action = {
      $action: 'send',
    };
    writeFileSync(documentPath, JSON.stringify(document));
    const diff = run(['diff', documentPath]).output;
    expect(diff).toContain('BREAKING action "compose" removed');
    expect(diff).toContain('BREAKING action "send" added');
  });

  it('writes .view.js plus .view.d.ts for the js target and checks both', () => {
    expect(
      run(['generate', documentPath, '--target', 'js', '--declarations-only'])
        .code,
    ).toBe(0);
    expect(readFileSync(join(folder, 'inbox.view.d.ts'), 'utf8')).toContain(
      'export interface InboxInputs',
    );
    expect(readFileSync(join(folder, 'inbox.view.js'), 'utf8')).not.toContain(
      'renderInbox',
    );
    expect(
      run(['check', documentPath, '--target', 'js', '--declarations-only'])
        .code,
    ).toBe(0);
    rmSync(join(folder, 'inbox.view.d.ts'));
    expect(
      run(['check', documentPath, '--target', 'js', '--declarations-only'])
        .output,
    ).toContain('inbox.view.d.ts: missing');
  });

  it('reports validation diagnostics and resolves composed documents beside the document', () => {
    writeFileSync(
      documentPath,
      JSON.stringify({
        schema: 'kerf-ui-document/v1',
        name: 'bad',
        catalogs: [],
        root: {},
      }),
    );
    const result = run(['generate', documentPath]);
    expect(result.code).toBe(1);
    expect(result.output).toContain('KUI-V001 $.name');
    const parent = {
      schema: 'kerf-ui-document/v1',
      name: 'Shell',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3TAA',
        type: '@kerfjs/ui:list',
        zones: {
          children: [
            {
              id: '01JB8Z1M6Q8E1X9V4S7K2R3TAB',
              type: '#view',
              src: './missing.kui.json',
            },
          ],
        },
      },
    };
    writeFileSync(documentPath, JSON.stringify(parent));
    expect(run(['check', documentPath]).output).toContain('KUI-V012');
  });

  it('accepts extra catalogs and rejects bad arguments', () => {
    const props = resolve(root, 'ai/component-props.json');
    const composition = resolve(root, 'ai/component-composition.json');
    expect(
      run([
        'generate',
        documentPath,
        '--props',
        props,
        '--composition',
        composition,
      ]).code,
    ).toBe(0);
    for (const argv of [
      [],
      ['build', documentPath],
      ['generate'],
      ['generate', documentPath, '--target', 'py'],
      ['generate', '--props'],
      ['generate', documentPath, '--watch'],
    ]) {
      expect(run(argv)).toMatchObject({
        code: 2,
        output: expect.stringContaining('Usage:'),
      });
    }
    expect(
      parseArguments(['check', 'a.kui.json', '--declarations-only']),
    ).toEqual({
      command: 'check',
      documents: ['a.kui.json'],
      options: {
        target: 'ts',
        declarationsOnly: true,
        props: [],
        composition: [],
      },
    });
  });

  it('runs as a bin and exits non-zero on failure', () => {
    const cli = resolve(root, 'view/cli.mjs');
    expect(
      execFileSync(process.execPath, [cli, 'generate', documentPath], {
        encoding: 'utf8',
      }),
    ).toContain('inbox.view.ts');
    expect(() =>
      execFileSync(process.execPath, [cli, 'nope'], { stdio: 'pipe' }),
    ).toThrow();
  });
});

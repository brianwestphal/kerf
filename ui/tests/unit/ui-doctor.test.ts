import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import Ajv from 'ajv';
import { afterEach, describe, expect, it } from 'vitest';

import { isForeignRuleDefinitionDiagnostic } from '../../doctor/eslint-diagnostics.mjs';
import {
  formatUiDoctorText,
  resolveUiDoctorPackage,
  runUiDoctor,
  validateUiDoctorConfig,
} from '../../doctor/index.mjs';

const temporary: string[] = [];
afterEach(async () =>
  Promise.all(
    temporary
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  ),
);

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'kerf-ui-doctor-'));
  temporary.push(root);
  await writeFile(
    resolve(root, 'package.json'),
    '{"name":"app","private":true}\n',
  );
  await mkdir(resolve(root, 'src'));
  await writeFile(resolve(root, 'src/view.tsx'), 'export const view = 1;\n');
  return root;
}

const disabled = {
  catalog: false,
  typescript: false,
  eslint: false,
  analyzer: false,
  browser: false,
};
const diagnostic = (stage: string, message = 'Broken') => ({
  id: 'KUI-L090',
  severity: 'error',
  stage,
  message,
  location: { file: 'src/view.tsx', line: 1, column: 1 },
});

describe('Kerf UI doctor', () => {
  it('publishes schemas that accept the runtime config and report', async () => {
    const root = await fixture();
    const config = {
      schemaVersion: 1 as const,
      stages: disabled,
      suppressions: [
        {
          id: 'reviewed-file',
          rules: ['KUI-L006'],
          target: 'src/view.tsx',
          rationale: 'Reviewed until the next migration.',
        },
      ],
    };
    const report = await runUiDoctor({ root, cache: false, config });
    for (const [name, value] of [
      ['config.schema.json', config],
      ['report.schema.json', report],
    ] as const) {
      const schema = JSON.parse(
        await readFile(resolve('doctor', name), 'utf8'),
      );
      delete schema.$schema;
      const validate = new Ajv({ schemaId: 'auto', format: false }).compile(
        schema,
      );
      expect(
        validate(value),
        validate.errors?.map((error) => error.message).join('\n'),
      ).toBe(true);
    }
  });

  it('validates malformed config and reasoned exact suppressions', () => {
    const result = validateUiDoctorConfig({
      schemaVersion: 2,
      mode: 'quick',
      mystery: true,
      suppressions: [{ id: 'X', rules: [], target: '../all', rationale: 'no' }],
    });
    expect(result.map((item) => item.location?.path)).toEqual(
      expect.arrayContaining([
        '$.schemaVersion',
        '$.mode',
        '$.mystery',
        '$.suppressions[0].id',
        '$.suppressions[0].rules',
        '$.suppressions[0].target',
        '$.suppressions[0].rationale',
      ]),
    );
  });

  it('merges identical findings, retains conflicts, and makes exits deterministic', async () => {
    const root = await fixture();
    const report = await runUiDoctor({
      root,
      cache: false,
      config: {
        schemaVersion: 1,
        stages: { ...disabled, typescript: true, eslint: true, analyzer: true },
      },
      runners: {
        typescript: async () => ({ diagnostics: [diagnostic('typescript')] }),
        eslint: async () => ({ diagnostics: [diagnostic('eslint')] }),
        analyzer: async () => ({
          diagnostics: [diagnostic('analyzer', 'Different meaning')],
        }),
      },
    } as never);
    expect(report.exitCode).toBe(1);
    expect(
      report.diagnostics.filter((item) => item.id === 'KUI-L090'),
    ).toHaveLength(2);
    expect(
      report.diagnostics.find((item) => item.message === 'Broken'),
    ).toMatchObject({ stage: 'merged', sources: ['eslint', 'typescript'] });
    expect(report.diagnostics.some((item) => item.id === 'KUI-D003')).toBe(
      true,
    );
    expect(
      report.diagnostics.find((item) => item.id === 'KUI-D003')?.documentation,
    ).toBe('@kerfjs/ui/docs/ui-doctor.md');
    expect(formatUiDoctorText(report)).toContain('exit 1');
  });

  it('records suppressions with rationale without hiding them from the report', async () => {
    const root = await fixture();
    const report = await runUiDoctor({
      root,
      cache: false,
      config: {
        schemaVersion: 1,
        stages: { ...disabled, analyzer: true },
        suppressions: [
          {
            id: 'accepted-layout',
            rules: ['KUI-L090'],
            target: 'src/view.tsx',
            rationale: 'Legacy view is removed next release.',
          },
        ],
      },
      runners: {
        analyzer: async () => ({ diagnostics: [diagnostic('analyzer')] }),
      },
    } as never);
    expect(report.exitCode).toBe(0);
    expect(report.diagnostics).toEqual([]);
    expect(report.suppressions[0]).toMatchObject({
      suppression: {
        id: 'accepted-layout',
        rationale: 'Legacy view is removed next release.',
      },
    });
  });

  it('rejects stale suppression ids and documents browser diagnostics', async () => {
    const root = await fixture();
    const report = await runUiDoctor({
      root,
      cache: false,
      config: {
        schemaVersion: 1,
        stages: { ...disabled, browser: true },
        browser: { url: 'http://127.0.0.1:4173' },
        suppressions: [
          {
            id: 'typo',
            rules: ['KUI-L999'],
            target: 'main',
            rationale: 'This deliberately exercises stale ids.',
          },
        ],
      },
      runners: {
        browser: async () => ({
          diagnostics: [
            {
              id: 'KUI-B010',
              severity: 'error',
              stage: 'browser',
              message: 'Page overflows.',
              dom: { context: 'chromium:wide', selector: 'html' },
            },
          ],
        }),
      },
    } as never);
    expect(report.exitCode).toBe(2);
    expect(
      report.diagnostics.find((item) => item.id === 'KUI-D001')?.message,
    ).toContain('KUI-L999');
    expect(
      report.diagnostics.find((item) => item.id === 'KUI-B010')?.documentation,
    ).toBe('@kerfjs/ui/docs/ui-evaluator.md');
  });

  it('continues after a missing tool but returns the configuration exit', async () => {
    const root = await fixture();
    let analyzerRan = false;
    const missing = Object.assign(new Error("Cannot find package 'eslint'"), {
      code: 'ERR_MODULE_NOT_FOUND',
    });
    const report = await runUiDoctor({
      root,
      cache: false,
      config: {
        schemaVersion: 1,
        stages: { ...disabled, eslint: true, analyzer: true },
      },
      runners: {
        eslint: async () => {
          throw missing;
        },
        analyzer: async () => {
          analyzerRan = true;
          return { diagnostics: [] };
        },
      },
    } as never);
    expect(analyzerRan).toBe(true);
    expect(report.exitCode).toBe(2);
    expect(report.stages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'eslint', status: 'unavailable' }),
        expect.objectContaining({ id: 'analyzer', status: 'ran' }),
      ]),
    );
  });

  it('ignores only foreign rule definitions missing from the isolated Kerf preset', () => {
    expect(
      isForeignRuleDefinitionDiagnostic({
        ruleId: '@typescript-eslint/no-empty-object-type',
        message:
          "Definition for rule '@typescript-eslint/no-empty-object-type' was not found.",
      }),
    ).toBe(true);
    expect(
      isForeignRuleDefinitionDiagnostic({
        ruleId: 'kerfjs/not-a-rule',
        message: "Definition for rule 'kerfjs/not-a-rule' was not found.",
      }),
    ).toBe(false);
    expect(
      isForeignRuleDefinitionDiagnostic({
        ruleId: '@typescript-eslint/no-empty-object-type',
        message: 'An actual consumer rule finding.',
      }),
    ).toBe(false);
  });

  it('cancels the explicit browser stage deterministically and does not cache a partial run', async () => {
    const root = await fixture();
    const abort = new AbortController();
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const reportPromise = runUiDoctor({
      root,
      config: {
        schemaVersion: 1,
        stages: { ...disabled, browser: true },
        browser: { url: 'http://127.0.0.1:4173' },
      },
      signal: abort.signal,
      runners: {
        browser: () => {
          markStarted();
          return new Promise((_resolve, reject) =>
            abort.signal.addEventListener('abort', () =>
              reject(
                Object.assign(new Error('cancelled'), { name: 'AbortError' }),
              ),
            ),
          );
        },
      },
    } as never);
    await started;
    abort.abort();
    const report = await reportPromise;
    expect(report.exitCode).toBe(130);
    expect(report.stages).toContainEqual(
      expect.objectContaining({ id: 'browser', status: 'cancelled' }),
    );
    await expect(
      readFile(resolve(root, '.kerf-cache/ui-doctor-v1.json')),
    ).rejects.toThrow();
  });

  it('uses a content-addressed cache and redacts local roots', async () => {
    const root = await fixture();
    let calls = 0;
    const options = {
      root,
      config: {
        schemaVersion: 1 as const,
        stages: { ...disabled, analyzer: true },
      },
      runners: {
        analyzer: async () => {
          calls += 1;
          return {
            diagnostics: [
              { ...diagnostic('analyzer'), message: `Failure in ${root}` },
            ],
          };
        },
      },
    };
    const first = await runUiDoctor(options as never);
    const second = await runUiDoctor(options as never);
    expect(calls).toBe(1);
    expect(first.diagnostics[0].message).toContain('<repo-root>');
    expect(second.cache.hit).toBe(true);
    expect(second.stages).toContainEqual(
      expect.objectContaining({ id: 'analyzer', status: 'cached' }),
    );
    await writeFile(
      resolve(root, 'package-lock.json'),
      '{"lockfileVersion":3}\n',
    );
    await runUiDoctor(options as never);
    expect(calls).toBe(2);
  });

  it('requires explicit changed paths and resolves workspace names and paths', async () => {
    const root = await fixture();
    await mkdir(resolve(root, 'packages/app'), { recursive: true });
    await writeFile(
      resolve(root, 'package.json'),
      '{"private":true,"workspaces":["packages/*"]}\n',
    );
    await writeFile(
      resolve(root, 'packages/app/package.json'),
      '{"name":"@acme/app"}\n',
    );
    expect(await resolveUiDoctorPackage(root, '@acme/app')).toBe(
      resolve(root, 'packages/app'),
    );
    expect(await resolveUiDoctorPackage(root, 'packages/app')).toBe(
      resolve(root, 'packages/app'),
    );
    let receivedPaths: string[] | undefined;
    const scoped = await runUiDoctor({
      root,
      package: '@acme/app',
      mode: 'changed',
      paths: ['packages/app/src/view.tsx'],
      cache: false,
      config: { schemaVersion: 1, stages: { ...disabled, analyzer: true } },
      runners: {
        analyzer: async (options: { paths?: string[] }) => {
          receivedPaths = options.paths;
          return { diagnostics: [] };
        },
      },
    } as never);
    expect(scoped.exitCode).toBe(0);
    expect(receivedPaths).toEqual(['src/view.tsx']);
    const report = await runUiDoctor({
      root,
      mode: 'changed',
      paths: [],
      cache: false,
      config: { schemaVersion: 1, stages: disabled },
    });
    expect(report.exitCode).toBe(2);
    expect(report.diagnostics[0].message).toContain(
      'requires at least one explicit --path',
    );
  });
});

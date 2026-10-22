import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import Ajv from 'ajv';
import { afterEach, describe, expect, it } from 'vitest';

import {
  isForeignRuleDefinitionDiagnostic,
  projectConsumerCoreConfig,
} from '../../doctor/eslint-diagnostics.mjs';
import {
  formatUiDoctorText,
  resolveUiDoctorPackage,
  runUiDoctor,
  validateUiDoctorConfig,
} from '../../doctor/index.mjs';
import { checkProjectGuidance } from '../../doctor/project-guidance-checks.mjs';
// Shared build-tool module; no public declaration file is needed.
// @ts-expect-error JavaScript-only internal module
import * as traversalExclusions from '../../traversal-exclusions.mjs';
import { loadScaledTimeout } from '../helpers/load-scaled-timeout.js';

const {
  createUiTraversalFilter,
  isUiTraversalExcluded,
  UI_TRAVERSAL_ESLINT_IGNORES,
  UI_TRAVERSAL_IGNORED_DIRECTORY_NAMES,
} = traversalExclusions;

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
  it('warns for guidance without a retrieval pointer, but not a generic UI mention', async () => {
    const root = await fixture();
    await writeFile(
      resolve(root, 'AGENTS.md'),
      'Build with @kerfjs/ui and run kerf-ui-doctor.\n',
    );
    const findings = await checkProjectGuidance(root);
    expect(findings).toMatchObject([
      {
        id: 'KUI-D041',
        severity: 'warning',
        stage: 'catalog',
        location: { file: 'AGENTS.md' },
        evidence: { instructionFiles: ['AGENTS.md'] },
      },
    ]);
    expect(await checkProjectGuidance(await fixture())).toEqual([]);
    await mkdir(resolve(root, '.claude/skills/kerf-ui'), { recursive: true });
    await writeFile(
      resolve(root, '.claude/skills/kerf-ui/SKILL.md'),
      'Read node_modules/@kerfjs/ui/llms.txt.\n',
    );
    expect((await checkProjectGuidance(root)).map((item) => item.id)).toEqual([
      'KUI-D041',
    ]);
    await writeFile(
      resolve(root, 'AGENTS.md'),
      'Use $kerf-ui before changing UI.\n',
    );
    expect(await checkProjectGuidance(root)).toEqual([]);
    await writeFile(
      resolve(root, 'AGENTS.md'),
      'Read node_modules/@kerfjs/ui/llms.txt first.\n',
    );
    expect(await checkProjectGuidance(root)).toEqual([]);
    await writeFile(
      resolve(root, 'AGENTS.md'),
      'Read @kerfjs/ui/llms.txt first.\n',
    );
    expect(await checkProjectGuidance(root)).toEqual([]);
    await writeFile(
      resolve(root, 'AGENTS.md'),
      'Read .claude/skills/kerf-ui/SKILL.md first.\n',
    );
    expect(await checkProjectGuidance(root)).toEqual([]);
  });

  it('scans only conventional instruction files at workspace and package roots', async () => {
    const root = await fixture();
    const packageRoot = resolve(root, 'packages/app');
    await mkdir(packageRoot, { recursive: true });
    await mkdir(resolve(root, '.cursor/rules'), { recursive: true });
    await mkdir(resolve(root, 'src/nested'), { recursive: true });
    await writeFile(resolve(root, 'AGENTS.md'), 'No UI guidance yet.\n');
    await writeFile(resolve(root, 'src/nested/AGENTS.md'), '$kerf-ui\n');
    await writeFile(resolve(root, '.cursor/rules/ui.mdc'), 'Use $kerf-ui.\n');
    expect(await checkProjectGuidance(root, packageRoot)).toEqual([]);
    await writeFile(resolve(root, '.cursor/rules/ui.mdc'), 'Other rules.\n');
    await writeFile(resolve(packageRoot, 'CLAUDE.md'), 'Package rules.\n');
    expect((await checkProjectGuidance(root, packageRoot))[0].evidence).toEqual(
      {
        instructionFiles: [
          '.cursor/rules/ui.mdc',
          'AGENTS.md',
          'packages/app/CLAUDE.md',
        ],
      },
    );
    await writeFile(
      resolve(packageRoot, 'CLAUDE.md'),
      'Use .claude/skills/kerf-ui/SKILL.md.\n',
    );
    expect(await checkProjectGuidance(root, packageRoot)).toEqual([]);
  });

  it('does not warn from an incomplete or symlinked instruction scan', async () => {
    const root = await fixture();
    const outside = await fixture();
    await writeFile(resolve(root, 'AGENTS.md'), 'General guidance.\n');
    await writeFile(resolve(outside, 'CLAUDE.md'), '$kerf-ui\n');
    await symlink(resolve(outside, 'CLAUDE.md'), resolve(root, 'CLAUDE.md'));
    expect(await checkProjectGuidance(root)).toEqual([]);
    await rm(resolve(root, 'CLAUDE.md'));
    await writeFile(resolve(root, 'CLAUDE.md'), 'x'.repeat(256 * 1024 + 1));
    expect(await checkProjectGuidance(root)).toEqual([]);
  });

  it('invalidates cached catalog guidance findings when instruction text changes', async () => {
    const root = await fixture();
    const config = {
      schemaVersion: 1 as const,
      stages: { ...disabled, catalog: true },
    };
    const runners = {
      catalog: () =>
        checkProjectGuidance(root).then((diagnostics) => ({ diagnostics })),
    };
    await writeFile(resolve(root, 'AGENTS.md'), 'General project guidance.\n');
    const first = await runUiDoctor({ root, config, runners } as never);
    expect(first.diagnostics.some((item) => item.id === 'KUI-D041')).toBe(true);
    expect(
      (await runUiDoctor({ root, config, runners } as never)).cache.hit,
    ).toBe(true);
    await writeFile(
      resolve(root, 'AGENTS.md'),
      'Read node_modules/@kerfjs/ui/llms.txt.\n',
    );
    const repaired = await runUiDoctor({ root, config, runners } as never);
    expect(repaired.cache.hit).toBe(false);
    expect(repaired.diagnostics.some((item) => item.id === 'KUI-D041')).toBe(
      false,
    );
  });

  it('projects every shared traversal exclusion into the ESLint boundary', () => {
    const root = resolve('/workspace/app');
    for (const name of UI_TRAVERSAL_IGNORED_DIRECTORY_NAMES) {
      expect(
        isUiTraversalExcluded(root, resolve(root, name, 'output.js')),
      ).toBe(true);
      expect(UI_TRAVERSAL_ESLINT_IGNORES).toContain(`**/${name}/**`);
    }
    expect(
      isUiTraversalExcluded(
        root,
        resolve(root, 'packages/app/.claude/worktrees/generated/source.ts'),
      ),
    ).toBe(true);
    expect(UI_TRAVERSAL_ESLINT_IGNORES).toContain('**/.claude/worktrees/**');
    expect(isUiTraversalExcluded(root, resolve(root, 'src/view.tsx'))).toBe(
      false,
    );
  });

  it('excludes gitignored paths from traversal and the ESLint boundary', async () => {
    const root = await fixture();
    const outside = await fixture();
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    await mkdir(resolve(root, 'reports/trace'), { recursive: true });
    await writeFile(
      resolve(root, '.gitignore'),
      'reports/\nscratch\\[1\\].tsx\n',
    );
    await writeFile(resolve(root, 'reports/trace/module.css'), '.a {}\n');
    await writeFile(resolve(root, 'scratch[1].tsx'), 'export {};\n');
    const excluded = await createUiTraversalFilter(root);
    expect(excluded(resolve(root, 'reports'))).toBe(true);
    expect(excluded(resolve(root, 'reports/trace/module.css'))).toBe(true);
    expect(excluded(resolve(root, 'scratch[1].tsx'))).toBe(true);
    expect(excluded(resolve(root, 'src/view.tsx'))).toBe(false);
    expect(excluded(resolve(root, 'dist/view.js'))).toBe(true);
    expect(excluded.eslintIgnores).toEqual([
      ...UI_TRAVERSAL_ESLINT_IGNORES,
      'reports/**',
      'scratch\\[1\\].tsx',
    ]);
    // Outside a Git work tree only the named directories apply.
    const plain = await createUiTraversalFilter(outside);
    expect(plain(resolve(outside, 'reports/trace/module.css'))).toBe(false);
    expect(plain(resolve(outside, 'playwright-report/index.html'))).toBe(true);
    expect(plain.eslintIgnores).toEqual([...UI_TRAVERSAL_ESLINT_IGNORES]);
  });

  it('publishes schemas that accept the runtime config and report', async () => {
    const root = await fixture();
    const config = {
      schemaVersion: 1 as const,
      ownership: 'component' as const,
      ownershipContext: 'any-package' as const,
      implicitComponentOwnership: true,
      ownershipGroups: [
        {
          styleSources: ['src/style.css'],
          sources: ['src/main.tsx', 'src/app/'],
        },
      ],
      failOn: 'warning' as const,
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
      ownership: 'none',
      failOn: 'info',
      mystery: true,
      suppressions: [{ id: 'X', rules: [], target: '../all', rationale: 'no' }],
    });
    expect(result.map((item) => item.location?.path)).toEqual(
      expect.arrayContaining([
        '$.schemaVersion',
        '$.mode',
        '$.ownership',
        '$.failOn',
        '$.mystery',
        '$.suppressions[0].id',
        '$.suppressions[0].rules',
        '$.suppressions[0].target',
        '$.suppressions[0].rationale',
      ]),
    );
  });

  it('rejects malformed ownership groups and paths outside the package', () => {
    const result = validateUiDoctorConfig({
      schemaVersion: 1,
      ownershipGroups: [
        { styleSources: ['../outside.css'], sources: [] },
        { styleSources: ['src/style.css'], sources: ['src/app/'], extra: true },
      ],
    });
    expect(result.map((item) => item.location?.path)).toEqual(
      expect.arrayContaining([
        '$.ownershipGroups[0].styleSources',
        '$.ownershipGroups[0].sources',
        '$.ownershipGroups[1].extra',
      ]),
    );
  });

  it('applies failure thresholds to active findings and keeps cache results separate', async () => {
    const root = await fixture();
    const config = {
      schemaVersion: 1 as const,
      stages: { ...disabled, analyzer: true },
      suppressions: [
        {
          id: 'accepted-warning',
          rules: ['KUI-L091'],
          target: 'src/view.tsx',
          rationale: 'Accepted for this threshold test.',
        },
      ],
    };
    const runners = {
      analyzer: async () => ({
        diagnostics: [
          { ...diagnostic('analyzer'), id: 'KUI-L006', severity: 'review' },
          { ...diagnostic('analyzer'), id: 'KUI-L091', severity: 'warning' },
        ],
      }),
    };
    const run = (
      failOn?: 'error' | 'review' | 'warning',
      supplied: Record<string, unknown> = config,
    ) => runUiDoctor({ root, config: supplied, failOn, runners } as never);
    const errors = await run();
    const review = await run('review');
    const warning = await run('warning');
    expect([errors.exitCode, review.exitCode, warning.exitCode]).toEqual([
      0, 1, 1,
    ]);
    expect([errors.cache.hit, review.cache.hit, warning.cache.hit]).toEqual([
      false,
      false,
      false,
    ]);
    expect(
      new Set([errors.cache.key, review.cache.key, warning.cache.key]).size,
    ).toBe(3);
    expect(warning.summary).toMatchObject({
      errors: 0,
      review: 1,
      warnings: 0,
      suppressed: 1,
    });
    expect((await run('warning')).cache.hit).toBe(true);
    expect(
      (await run(undefined, { ...config, failOn: 'warning' })).exitCode,
    ).toBe(1);
    expect(
      (await run('error', { ...config, failOn: 'warning' })).exitCode,
    ).toBe(0);
    const warningOnly = {
      schemaVersion: 1 as const,
      stages: { ...disabled, analyzer: true },
    };
    const warningRunner = {
      analyzer: async () => ({
        diagnostics: [
          { ...diagnostic('analyzer'), id: 'KUI-L091', severity: 'warning' },
        ],
      }),
    };
    const warningRun = (failOn: 'review' | 'warning') =>
      runUiDoctor({
        root,
        cache: false,
        config: warningOnly,
        failOn,
        runners: warningRunner,
      } as never);
    expect((await warningRun('review')).exitCode).toBe(0);
    expect((await warningRun('warning')).exitCode).toBe(1);
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

  it('projects consumer core rules, globals, and suppression options without plugin rules', () => {
    expect(
      projectConsumerCoreConfig(
        {
          rules: {
            'no-empty-pattern': 'error',
            '@typescript-eslint/no-empty-object-type': 'warn',
          },
          linterOptions: { reportUnusedDisableDirectives: 'error' },
          languageOptions: {
            globals: { console: 'readonly', process: 'writable' },
            parser: { parse: () => ({}) },
          },
        },
        'src/playwright.spec.js',
      ),
    ).toEqual({
      files: ['src/playwright.spec.js'],
      rules: { 'no-empty-pattern': 'error' },
      linterOptions: { reportUnusedDisableDirectives: 'error' },
      languageOptions: {
        globals: { console: 'readonly', process: 'writable' },
      },
    });
    expect(
      projectConsumerCoreConfig(
        { languageOptions: { globals: { console: 'readonly' } } },
        'scripts/allowed.mjs',
      ),
    ).toEqual({
      files: ['scripts/allowed.mjs'],
      languageOptions: { globals: { console: 'readonly' } },
    });
    expect(
      projectConsumerCoreConfig(
        { rules: { '@typescript-eslint/no-empty-object-type': 'warn' } },
        'src/view.ts',
      ),
    ).toBeUndefined();
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
    await mkdir(resolve(root, '.claude/worktrees/generated/src'), {
      recursive: true,
    });
    const generated = resolve(
      root,
      '.claude/worktrees/generated/src/copied.tsx',
    );
    await writeFile(generated, 'export const copied = 1;\n');
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
    await writeFile(generated, 'export const copied = 2;\n');
    const afterGeneratedChange = await runUiDoctor(options as never);
    expect(calls).toBe(1);
    expect(afterGeneratedChange.cache.hit).toBe(true);
    await writeFile(
      resolve(root, 'package-lock.json'),
      '{"lockfileVersion":3}\n',
    );
    await runUiDoctor(options as never);
    expect(calls).toBe(2);
  });

  it('invalidates a package cache when parent profile or referenced catalog changes', async () => {
    const root = await fixture();
    const packageRoot = resolve(root, 'packages/web');
    await mkdir(resolve(packageRoot, 'src'), { recursive: true });
    await writeFile(
      resolve(packageRoot, 'package.json'),
      '{"name":"@example/web"}\n',
    );
    await writeFile(
      resolve(packageRoot, 'src/view.tsx'),
      'export const view = 1;\n',
    );
    await writeFile(
      resolve(root, 'package.json'),
      '{"private":true,"workspaces":["packages/*"]}\n',
    );
    const catalog = resolve(root, 'catalog.json');
    const profile = resolve(root, '.kerf-ui-profile.json');
    await writeFile(catalog, '{"version":1}\n');
    await writeFile(
      profile,
      JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        catalogs: [
          { package: '@example/web', selection: { path: './catalog.json' } },
        ],
      }),
    );
    let calls = 0;
    const options = {
      root,
      package: '@example/web',
      config: {
        schemaVersion: 1 as const,
        stages: { ...disabled, analyzer: true },
      },
      runners: {
        analyzer: async () => {
          calls += 1;
          return { diagnostics: [] };
        },
      },
    };
    await runUiDoctor(options as never);
    expect((await runUiDoctor(options as never)).cache.hit).toBe(true);
    await writeFile(catalog, '{"version":2}\n');
    expect((await runUiDoctor(options as never)).cache.hit).toBe(false);
    await writeFile(
      profile,
      JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        catalogs: [
          { package: '@example/web', selection: { path: './catalog.json' } },
        ],
        preferences: { controlOrder: 'new' },
      }),
    );
    expect((await runUiDoctor(options as never)).cache.hit).toBe(false);
    expect(calls).toBe(3);
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

  it(
    'keeps ambient declaration roots in changed TypeScript checks',
    async () => {
      const root = await fixture();
      await mkdir(resolve(root, 'node_modules'));
      await symlink(
        resolve(import.meta.dirname, '../../node_modules/typescript'),
        resolve(root, 'node_modules/typescript'),
        'dir',
      );
      await writeFile(
        resolve(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            module: 'esnext',
            moduleResolution: 'bundler',
            strict: true,
            noEmit: true,
          },
          include: ['src/**/*'],
        }),
      );
      await writeFile(
        resolve(root, 'src/globals.d.ts'),
        'export {};\ndeclare global { interface Window { fixtureFlag: true } }\n',
      );
      await writeFile(
        resolve(root, 'src/model.ts'),
        'export type FixtureFlag = typeof window.fixtureFlag;\n',
      );
      await writeFile(
        resolve(root, 'src/view.ts'),
        "import type { FixtureFlag } from './model.js';\n" +
          'export const augmented: FixtureFlag = window.fixtureFlag;\n' +
          'export const changedError: string = 1;\n',
      );
      await writeFile(
        resolve(root, 'src/unchanged.ts'),
        'export const unchangedError: string = 1;\n',
      );

      const report = await runUiDoctor({
        root,
        mode: 'changed',
        paths: ['src/view.ts'],
        cache: false,
        config: {
          schemaVersion: 1,
          stages: { ...disabled, typescript: true },
        },
      });

      expect(report.diagnostics).toEqual([
        expect.objectContaining({
          id: 'TS2322',
          location: expect.objectContaining({ file: 'src/view.ts' }),
        }),
      ]);
    },
    loadScaledTimeout(30_000),
  );
});

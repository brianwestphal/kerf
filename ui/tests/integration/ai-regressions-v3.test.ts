import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { createCannedRepairLoopFixture } from '../../ai-regressions/fixtures/v3-canned-repair-loop.mjs';
import { canonicalAiRegressionJson } from '../../scripts/lib/ai-regression-run-v3.mjs';
import { validateJsonSchemaSubset } from '../../scripts/lib/json-schema-subset.mjs';

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, '../..');
const VARIANT = 'markdown-reference-guidance-only';
const readJson = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
const prepare = async (...args: string[]) =>
  JSON.parse(
    (
      await exec(
        process.execPath,
        ['scripts/prepare-ai-regression.mjs', '--suite', '3', ...args],
        { cwd: root, maxBuffer: 64 * 1024 * 1024 },
      )
    ).stdout,
  );

describe('suite-v3 executable protocol', { timeout: 30_000 }, () => {
  it('prepares byte-identical attempt-one model input under all feedback policies', async () => {
    const { stdout } = await exec(
      process.execPath,
      [
        'scripts/prepare-ai-regression.mjs',
        '--suite',
        '3',
        '--case',
        'extend-application-navigation',
      ],
      { cwd: root, maxBuffer: 10 * 1024 * 1024 },
    );
    const requests = JSON.parse(stdout);
    expect(
      requests.map(({ condition }: { condition: string }) => condition),
    ).toEqual(['guidance-only', 'guidance-static', 'guidance-static-browser']);
    expect(
      new Set(
        requests.map(
          ({ modelInputSha256 }: { modelInputSha256: string }) =>
            modelInputSha256,
        ),
      ).size,
    ).toBe(1);
    expect(requests[0].modelInput).toEqual(requests[1].modelInput);
    expect(requests[1].modelInput).toEqual(requests[2].modelInput);
  });

  it('prepares a request whose only difference from guidance-only is the catalog representation', async () => {
    // Sequential: the full unit run is CPU-bound, and spawning both CLIs
    // at once starves concurrently running files.
    const variant = await prepare(
      '--case',
      'extend-application-navigation',
      '--condition',
      VARIANT,
    );
    const baseline = await prepare(
      '--case',
      'extend-application-navigation',
      '--condition',
      'guidance-only',
    );
    const requestSchema = await readJson(
      'ai-regressions/request-v3.schema.json',
    );
    expect(validateJsonSchemaSubset(requestSchema, variant)).toEqual([]);
    expect(variant.condition).toBe(VARIANT);
    expect(variant.attempt).toBe(1);
    for (const field of [
      'prompt',
      'caseContext',
      'responseContract',
      'responseSchema',
    ])
      expect(variant.modelInput[field]).toEqual(baseline.modelInput[field]);

    const paths = variant.modelInput.guidanceContext.sources.map(
      ({ path }: { path: string }) => path,
    );
    expect(paths).not.toContain('ai/component-catalog.json');
    expect(variant.modelInput.guidanceContext.text).not.toContain(
      '--- ai/component-catalog.json ---',
    );
    // The index then exactly the pages for what app-shell.tsx references,
    // in catalog order, at the catalog's former position.
    expect(paths).toEqual([
      'ai/skill.md',
      'ai/public-api-signatures-v1.md',
      'docs/component-selection.md',
      'docs/layout.md',
      'docs/accessibility.md',
      'ai/components/README.md',
      'ai/components/lucide-icon.md',
      'ai/components/layout.md',
      'ai/components/workbench.md',
      'ai/components/toolbar.md',
      'ai/components/toolbar-control-group.md',
      'ai/components/toolbar-text.md',
      'ai/components/value-table.md',
      'ai/components/list.md',
      'ai/components/list-item.md',
      'docs/recipes.md',
    ]);
    expect(variant.modelInput.guidanceContext.text).toContain(
      '--- ai/components/README.md ---\n# @kerfjs/ui component reference',
    );
    // Every shared source carries the same bytes as the baseline.
    const baselineHashes = new Map(
      baseline.modelInput.guidanceContext.sources.map(
        ({ path, sha256 }: { path: string; sha256: string }) => [path, sha256],
      ),
    );
    for (const { path, sha256 } of variant.modelInput.guidanceContext.sources)
      if (baselineHashes.has(path))
        expect(sha256).toBe(baselineHashes.get(path));
    expect(variant.modelInputSha256).not.toBe(baseline.modelInputSha256);
  });

  it('audits the deterministic canned repair loop without paid model execution', async () => {
    const { stdout } = await exec(
      process.execPath,
      ['scripts/audit-ai-regression-results-v3.mjs'],
      { cwd: root },
    );
    expect(stdout).toContain('canned repair replayed; 0 measured runs audited');
  });

  it('records and replays a staged canned campaign through the public scripts', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kerf-ai-v3-cli-'));
    try {
      const fixture = createCannedRepairLoopFixture();
      for (const [path, content] of fixture.artifacts) {
        const target = join(directory, path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content);
      }
      const draft = join(directory, 'draft.json');
      const recorded = join(directory, 'run.json');
      const environment = join(directory, 'environment.json');
      await writeFile(draft, canonicalAiRegressionJson(fixture.run));
      await writeFile(
        environment,
        canonicalAiRegressionJson(fixture.environment),
      );
      const record = await exec(
        process.execPath,
        [
          'scripts/record-ai-regression-run-v3.mjs',
          '--draft',
          draft,
          '--artifacts',
          directory,
          '--out',
          recorded,
          '--environment',
          environment,
        ],
        { cwd: root },
      );
      expect(record.stdout).toContain('2/3 terminal clean');
      const replay = await exec(
        process.execPath,
        [
          'scripts/replay-ai-regression-run-v3.mjs',
          '--run',
          recorded,
          '--artifacts',
          directory,
          '--environment',
          environment,
        ],
        { cwd: root },
      );
      expect(replay.stdout).toContain('replayed; browser artifacts compared');
    } finally {
      await rm(directory, { recursive: true });
    }
  });
});

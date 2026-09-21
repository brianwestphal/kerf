import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { createCannedRepairLoopFixture } from '../../ai-regressions/fixtures/v3-canned-repair-loop.mjs';
import { canonicalAiRegressionJson } from '../../scripts/lib/ai-regression-run-v3.mjs';

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, '../..');

describe('suite-v3 executable protocol', () => {
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

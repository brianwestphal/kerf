// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  assertMeaningfulOverlap,
  contentionArguments,
  contentionCells,
  instrumentDisclosureTiming,
  reportIntervals,
  summarizeDisclosure,
  unavailableAfter,
} from '../../scripts/library-contention-probe.mjs';

const title =
  'Library expand/collapse remains responsive with 5000 project files';
const metrics = () => ({
  measurements: Array.from({ length: 4 }, (_, index) => ({
    startedAt: 1000 + index * 100,
    taskMs: 40,
    visibleFrameMs: 60,
    added: index % 2 ? 25 : 0,
    removed: index % 2 ? 0 : 25,
    stableBranch: true,
  })),
});

describe('same-runner Library contention protocol (KF-1XBJDT)', () => {
  it('adds only reversible absolute timestamps to the actual canonical spec', () => {
    const source = readFileSync(
      'editor/tests/browser/library-performance.spec.ts',
      'utf8',
    );
    const patched = instrumentDisclosureTiming(source);
    expect(
      patched.replace(
        '          startedAt: performance.timeOrigin + start,\n',
        '',
      ),
    ).toBe(source);
    expect(() => instrumentDisclosureTiming(patched)).toThrow();
    expect(() => instrumentDisclosureTiming('')).toThrow();
  });
  it('predeclares every worker/trace cell with zero retries and real competitors', () => {
    expect(
      contentionCells.map(({ workers, trace }) => [workers, trace]),
    ).toEqual([
      [1, 'on'],
      [3, 'on'],
      [3, 'off'],
      [1, 'off'],
    ]);
    for (const cell of contentionCells) {
      const args = contentionArguments(cell, 'webkit', '/evidence/results');
      expect(args).toContain('--retries=0');
      expect(args).toContain(`--workers=${cell.workers}`);
      expect(args).toContain(`--trace=${cell.trace}`);
      expect(args.includes('tests/browser/params.spec.ts')).toBe(
        cell.workers === 3,
      );
      expect(args.includes('tests/browser/library.spec.ts')).toBe(
        cell.workers === 3,
      );
    }
    expect(() =>
      contentionArguments(contentionCells[0]!, 'unknown', '/x'),
    ).toThrow();
  });
  it('uses real report intervals to distinguish click overlap from setup overlap', () => {
    const intervals = reportIntervals({
      suites: [
        {
          suites: [
            {
              file: 'params.spec.ts',
              specs: [
                {
                  title: 'actual parameter workload',
                  tests: [
                    {
                      results: [
                        {
                          startTime: new Date(1040).toISOString(),
                          duration: 70,
                          status: 'passed',
                          workerIndex: 1,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const result = summarizeDisclosure(metrics(), intervals);
    expect(() => assertMeaningfulOverlap(result)).toThrow('Every measured');
    expect(() =>
      assertMeaningfulOverlap(
        summarizeDisclosure(metrics(), [
          { ...intervals[0]!, start: 900, end: 1500 },
        ]),
      ),
    ).not.toThrow();
    expect(result.map((sample) => sample.competingTests.length)).toEqual([
      1, 1, 0, 0,
    ]);
    const onlySetup = reportIntervals({
      suites: [
        {
          specs: [
            {
              title: 'earlier setup',
              tests: [
                {
                  results: [
                    {
                      startTime: new Date(100).toISOString(),
                      duration: 100,
                      status: 'passed',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(
      summarizeDisclosure(metrics(), onlySetup).every(
        (sample) => !sample.competingTests.length,
      ),
    ).toBe(true);
    expect(
      summarizeDisclosure(metrics(), [{ ...intervals[0]!, title }]).every(
        (sample) => !sample.competingTests.length,
      ),
    ).toBe(true);
  });
  it('preserves failed budgets and rejects missing/corrupt row identity evidence', () => {
    const value = metrics();
    value.measurements[0]!.taskMs = 1250;
    value.measurements[1]!.visibleFrameMs = 1007;
    const result = summarizeDisclosure(value, []);
    expect(result[0]!.taskBudgetPassed).toBe(false);
    expect(result[1]!.visibleBudgetPassed).toBe(false);
    value.measurements[0]!.stableBranch = false;
    expect(() => summarizeDisclosure(value, [])).toThrow();
    expect(() => summarizeDisclosure({ measurements: [] }, [])).toThrow(
      'Missing',
    );
  });
  it('marks later cells unavailable after an abort, rather than treating stale-server failures as independent', () => {
    expect(unavailableAfter({ status: 1, signal: null, error: null })).toBe(
      false,
    );
    expect(unavailableAfter({ status: 0, signal: null, error: null })).toBe(
      false,
    );
    expect(
      unavailableAfter({ status: null, signal: 'SIGKILL', error: 'ETIMEDOUT' }),
    ).toBe(true);
    expect(
      unavailableAfter({ status: null, signal: null, error: 'ENOENT' }),
    ).toBe(true);
  });
  it('keeps diagnostic execution manual and isolated from canonical/reusable workflows', () => {
    const workflow = parse(
      readFileSync(
        '.github/workflows/library-contention-diagnostic.yml',
        'utf8',
      ),
    );
    expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
    const job = workflow.jobs['same-runner-controls'];
    expect(job.strategy.matrix.browser).toEqual([
      'chromium',
      'firefox',
      'webkit',
    ]);
    expect(
      job.steps.find(
        (step: { name?: string }) =>
          step.name === 'Execute every predeclared same-VM cell',
      ).run,
    ).toContain('harness/scripts/library-contention-probe.mjs target');
    expect(job.steps.at(-1).if).toBe('always()');
  });
});

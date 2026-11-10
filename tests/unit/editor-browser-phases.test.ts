// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { qualificationWorkflow } from '../../scripts/sync-bun-qualification-workflow.mjs';

const source = readFileSync('.github/workflows/ci.yml', 'utf8');
const canonical = YAML.parse(source);
const performanceSpec = 'tests/browser/library-performance.spec.ts';
const exclusion = '--test-list-invert=tests/library-performance.exclude';
describe('editor functional/measurement coverage (KF-1XBJDT)', () => {
  it('retains all engines and the failing functional outcome while collecting separate performance evidence', () => {
    const job = canonical.jobs['editor-browser'];
    expect(job.strategy.matrix).toEqual({
      browser: ['chromium', 'firefox', 'webkit'],
      shard: [1, 2, 3, 4],
    });
    const steps = job.steps;
    const functional = steps.find(
      (step: { id?: string }) => step.id === 'editor_browser',
    );
    const performance = steps.find(
      (step: { id?: string }) => step.id === 'library_performance',
    );
    expect(steps.indexOf(performance)).toBeGreaterThan(
      steps.indexOf(functional),
    );
    expect(functional.run).toContain('--workers=3');
    expect(functional.run).toContain(exclusion);
    expect(functional.run).toContain('--output=test-results-functional');
    expect(performance.run).toContain(performanceSpec);
    expect(performance.run).toContain('--workers=1 --retries=0');
    expect(performance.run).not.toContain('--shard');
    expect(performance.run).toContain('--output=test-results-performance');
    expect(performance.if).toContain('matrix.shard == 3');
    expect(performance.if).toContain('!cancelled()');
    for (const outcome of ['success', 'failure'])
      expect(performance.if).toContain(
        `steps.editor_browser.outcome == '${outcome}'`,
      );
    expect(functional['continue-on-error']).toBeUndefined();
    expect(performance['continue-on-error']).toBeUndefined();
    const evidence = steps.find(
      (step: { name?: string }) =>
        step.name === 'Retain every Library performance result',
    );
    expect(evidence.if).toContain(
      "steps.library_performance.outcome == 'failure'",
    );
    expect(evidence.if).toContain(
      "steps.library_performance.outcome == 'success'",
    );
    expect(evidence.with.path).toBe('editor/test-results-performance');
    const failure = steps.find(
      (step: { name?: string }) =>
        step.name === 'Upload failed editor browser evidence',
    );
    expect(failure.with.path).toContain(
      'editor/test-results-functional/**/trace.zip',
    );
  });

  it('mirrors both phases and their evidence exactly in Bun qualification and rejects a missing phase', () => {
    const candidate = YAML.parse(YAML.stringify(qualificationWorkflow(source)));
    for (const id of ['editor_browser', 'library_performance']) {
      const original = canonical.jobs['editor-browser'].steps.find(
        (step: { id?: string }) => step.id === id,
      );
      const mirrored = candidate.jobs['editor-browser'].steps.find(
        (step: { id?: string }) => step.id === id,
      );
      expect(mirrored).toEqual(original);
    }
    for (const name of [
      'Retain every Library performance result',
      'Upload failed editor browser evidence',
    ])
      expect(
        candidate.jobs['editor-browser'].steps.find(
          (step: { name?: string }) => step.name === name,
        ),
      ).toEqual(
        canonical.jobs['editor-browser'].steps.find(
          (step: { name?: string }) => step.name === name,
        ),
      );
    const broken = globalThis.structuredClone(canonical);
    broken.jobs['editor-browser'].steps = broken.jobs[
      'editor-browser'
    ].steps.filter(
      (step: { id?: string }) => step.id !== 'library_performance',
    );
    expect(() => qualificationWorkflow(YAML.stringify(broken))).toThrow(
      'performance phase',
    );
  });
});

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { qualificationWorkflow } from '../../scripts/sync-bun-qualification-workflow.mjs';

const source = readFileSync('.github/workflows/ci.yml', 'utf8');
const candidateFrom = (source: string) =>
  YAML.parse(YAML.stringify(qualificationWorkflow(source)));

describe('disposable Bun qualification workflow', () => {
  it('retains every canonical CI job, browser matrix, and test command', () => {
    const canonical = YAML.parse(source);
    const candidate = candidateFrom(source);
    for (const [name, job] of Object.entries(canonical.jobs) as Array<
      [string, { strategy?: unknown; steps: Array<{ run?: string }> }]
    >) {
      expect(candidate.jobs[name].strategy).toEqual(job.strategy);
      for (const step of job.steps.filter(
        (step) =>
          step.run?.includes('npm run') &&
          !step.run.includes('npm ci') &&
          !step.run.includes('test:webawesome-latest'),
      )) {
        expect(
          candidate.jobs[name].steps.some(
            (candidateStep: { run?: string }) => candidateStep.run === step.run,
          ),
        ).toBe(true);
      }
    }
    expect(candidate.jobs['seventh-tree']).toBeDefined();
    expect(candidate.jobs['release-artifacts']).toBeDefined();
    expect(candidate.jobs['wasi-resolution']).toBeDefined();
  });

  it('is manual and read-only and never replaces candidate installs with npm', () => {
    const candidate = candidateFrom(source);
    expect(candidate.on).toEqual({ workflow_dispatch: null });
    expect(candidate.permissions).toEqual({ contents: 'read' });
    const text = YAML.stringify(candidate);
    expect(text).not.toContain('npm ci');
    expect(text).not.toContain('id-token');
    expect(text).not.toContain('secrets.');
    expect(text).not.toMatch(/npm publish/);
    expect(text).toContain('bun-candidate-install.mjs');
  });

  it('records dependency-variation trees before their tests can fail', () => {
    const candidate = candidateFrom(source);
    for (const name of ['eslint-plugin', 'ui-webawesome-latest']) {
      const step = candidate.jobs[name].steps.find((step: { run?: string }) =>
        step.run?.startsWith('bun add --no-save'),
      );
      expect(step.run).toContain('bun pm ls --all');
      expect(step.run).toContain(`${name}-final.bun.lock`);
      expect(step.run).toContain(`${name}-final-package.json`);
      if (name === 'ui-webawesome-latest')
        expect(step.run.indexOf('bun pm ls --all')).toBeLessThan(
          step.run.indexOf('vitest.mjs run'),
        );
    }
  });

  it('rejects a new unreviewed npm installer instead of silently qualifying it', () => {
    const canonical = YAML.parse(source);
    canonical.jobs.test.steps.push({ run: 'npm install unrelated-package' });
    expect(() => qualificationWorkflow(YAML.stringify(canonical))).toThrow(
      'Unreviewed npm install',
    );
  });

  it('keeps the checked-in candidate job graph synchronized with canonical CI', () => {
    expect(() =>
      execFileSync(
        process.execPath,
        ['scripts/sync-bun-qualification-workflow.mjs', '--check'],
        { stdio: 'pipe' },
      ),
    ).not.toThrow();
  });
});

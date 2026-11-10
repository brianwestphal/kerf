import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { qualificationWorkflow } from '../../scripts/sync-bun-qualification-workflow.mjs';
import { loadScaledTimeout } from '../helpers/load-scaled-timeout.js';

const source = readFileSync('.github/workflows/ci.yml', 'utf8');
const candidateFrom = (source: string) =>
  YAML.parse(YAML.stringify(qualificationWorkflow(source)));

describe(
  'disposable Bun qualification workflow',
  { timeout: loadScaledTimeout(20_000) },
  () => {
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
              (candidateStep: { run?: string }) =>
                candidateStep.run === step.run,
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
      expect(candidate.on.workflow_dispatch.inputs.scope).toMatchObject({
        type: 'choice',
        options: ['full', 'release-artifacts'],
        default: 'full',
      });
      expect(candidate.permissions).toEqual({ contents: 'read' });
      const text = YAML.stringify(candidate);
      expect(text).not.toContain('npm ci');
      expect(text).not.toMatch(/npm --prefix \S+ ci/);
      expect(
        candidate.jobs.gates.steps.some((step: { run?: string }) =>
          step.run?.includes('bun-candidate-install.mjs" site'),
        ),
      ).toBe(true);
      expect(text).not.toContain('id-token');
      expect(text).not.toContain('secrets.');
      expect(text).not.toMatch(/npm publish/);
      expect(text).toContain('bun-candidate-install.mjs');
    });

    it('limits release-only dispatch without dropping the default full graph', () => {
      const candidate = candidateFrom(source);
      const release = candidate.jobs['release-artifacts'];
      expect(release.if).toBeUndefined();
      expect(release.needs).toBeUndefined();
      for (const [name, job] of Object.entries(candidate.jobs) as Array<
        [string, { if?: string }]
      >) {
        if (name !== 'release-artifacts')
          expect(job.if).toBe("${{ inputs.scope != 'release-artifacts' }}");
      }
      expect(
        release.steps
          .find((step: { run?: string }) =>
            step.run?.includes('vitest.mjs run'),
          )
          .run.startsWith(
            'PATH="$GITHUB_WORKSPACE/node_modules/.bin:$PATH" HUSKY=0 node ',
          ),
      ).toBe(true);
      expect(
        release.steps.find(
          (step: { run?: string }) =>
            step.run === 'node scripts/bun-release-artifact-probe.mjs',
        ).if,
      ).toBe(
        "${{ !cancelled() && steps.candidate-build.outcome == 'success' }}",
      );
    });

    it('preserves canonical job conditions when adding the scope guard', () => {
      const canonical = YAML.parse(source);
      for (const guard of [
        "${{ github.ref == 'refs/heads/main' }}",
        'always()',
        false,
      ]) {
        canonical.jobs.test.if = guard;
        const candidate = candidateFrom(YAML.stringify(canonical));
        const prior =
          typeof guard === 'string' && guard.startsWith('${{')
            ? guard.slice(3, -2).trim()
            : String(guard);
        expect(candidate.jobs.test.if).toBe(
          `\${{ (${prior}) && inputs.scope != 'release-artifacts' }}`,
        );
      }
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
  },
);

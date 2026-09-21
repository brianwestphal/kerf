import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

interface WorkflowRunStep {
  run: string;
  workingDirectory?: string;
}

function workflowRunSteps(job: string): WorkflowRunStep[] {
  const lines = job.split('\n');
  const steps: WorkflowRunStep[] = [];
  for (const [index, line] of lines.entries()) {
    const run =
      line.match(/^ {6}- run: (.+)$/)?.[1] ??
      line.match(/^ {8}run: (.+)$/)?.[1];
    if (!run) continue;
    const workingDirectory = lines[index + 1]?.match(
      /^ {8}working-directory: (.+)$/,
    )?.[1];
    steps.push({ run, ...(workingDirectory ? { workingDirectory } : {}) });
  }
  return steps;
}

function expectOrderedRunSteps(
  actual: WorkflowRunStep[],
  expected: WorkflowRunStep[],
) {
  let previous = -1;
  for (const step of expected) {
    const index = actual.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex > previous &&
        candidate.run === step.run &&
        candidate.workingDirectory === step.workingDirectory,
    );
    expect(
      index,
      `missing ordered workflow step ${JSON.stringify(step)}`,
    ).toBeGreaterThan(previous);
    previous = index;
  }
}

describe('package metadata', () => {
  it('points the homepage at the published component-package documentation', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'),
    ) as { homepage: string };

    expect(packageJson.homepage).toBe(
      'https://brianwestphal.github.io/kerf/docs/component-packages/',
    );
    expect(
      existsSync(
        resolve(
          import.meta.dirname,
          '../../../site/src/content/docs/docs/component-packages.md',
        ),
      ),
    ).toBe(true);
  });

  it('installs, builds, and validates the UI release in dependency order', () => {
    const repoRoot = resolve(import.meta.dirname, '../../..');
    const ciWorkflow = readFileSync(
      resolve(repoRoot, '.github/workflows/ci.yml'),
      'utf8',
    );
    const releaseWorkflow = readFileSync(
      resolve(repoRoot, '.github/workflows/release-ui.yml'),
      'utf8',
    );
    const ciUiJob = ciWorkflow.slice(
      ciWorkflow.indexOf('  ui:\n'),
      ciWorkflow.indexOf('  browser:\n'),
    );
    const releaseValidationJob = releaseWorkflow.slice(
      releaseWorkflow.indexOf('  validate-and-build:\n'),
      releaseWorkflow.indexOf('  detect:\n'),
    );

    expectOrderedRunSteps(workflowRunSteps(ciUiJob), [
      { run: 'npm ci' },
      { run: 'npm run build' },
      { run: 'npm run check' },
    ]);
    expectOrderedRunSteps(workflowRunSteps(releaseValidationJob), [
      { run: 'npm ci', workingDirectory: 'ui' },
      {
        run: 'npx playwright install --with-deps chromium firefox webkit',
        workingDirectory: 'ui',
      },
      { run: 'npm run build', workingDirectory: 'ui' },
      { run: 'npm run check', workingDirectory: 'ui' },
    ]);
  });
});

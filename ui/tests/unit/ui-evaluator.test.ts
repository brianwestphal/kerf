import { execFileSync, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

import {
  buildEvaluationContexts,
  contrastRatio,
  createEvaluationReport,
  formatUiEvaluationText,
  SUBJECTIVE_REVIEW_RUBRIC,
} from '../../evaluator/index.mjs';

describe('browser UI evaluator contract', () => {
  it('ships a self-describing CLI with stable invocation failures', () => {
    const cli = resolve('evaluator/cli.mjs');
    expect(
      execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' }),
    ).toContain('kerf-ui-evaluate --url');
    const invalid = spawnSync(process.execPath, [cli, '--unknown'], {
      encoding: 'utf8',
    });
    expect(invalid.status).toBe(2);
    expect(invalid.stderr).toContain('Unknown arguments: --unknown');
  });

  it('builds the complete deterministic environment matrix', () => {
    expect(buildEvaluationContexts()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'wide-light', width: 1440 }),
        expect.objectContaining({ id: 'intermediate-light', width: 900 }),
        expect.objectContaining({ id: 'narrow-light', width: 390 }),
        expect.objectContaining({ id: 'zoom-200-light', zoom: 2 }),
        expect.objectContaining({ id: 'wide-dark', colorScheme: 'dark' }),
        expect.objectContaining({
          id: 'wide-reduced-motion',
          reducedMotion: 'reduce',
        }),
      ]),
    );
    expect(buildEvaluationContexts()).toHaveLength(6);
  });

  it('computes WCAG contrast ratios without conflating them with visual ratings', () => {
    expect(contrastRatio('#invalid', 'rgb(255, 255, 255)')).toBeNull();
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(
      contrastRatio('rgba(0, 0, 0, 0.1)', 'rgb(255, 255, 255)'),
    ).toBeCloseTo(1.25, 1);
    expect(SUBJECTIVE_REVIEW_RUBRIC.map(({ id }) => id)).toEqual([
      'hierarchy',
      'rhythm',
      'density',
      'alignment',
      'scroll-ownership',
      'aesthetic-fit',
    ]);
  });

  it('emits a schema-valid deterministic report with repair context', async () => {
    const report = createEvaluationReport({
      target: { url: 'http://127.0.0.1:4173' },
      profileFiles: ['.kerf-ui-profile.json'],
      contexts: [
        {
          id: 'chromium:wide-light',
          browser: 'chromium',
          width: 1440,
          height: 900,
          zoom: 1,
          colorScheme: 'light',
          reducedMotion: 'no-preference',
          evidence: {},
          summary: { errors: 1, warnings: 0, passed: false },
        },
      ],
      diagnostics: [
        {
          code: 'KUI-B010',
          severity: 'error',
          context: 'chromium:wide-light',
          message: 'Page overflows.',
          repair: 'Remove fixed width.',
          selector: 'html',
        },
      ],
      artifacts: [
        {
          path: 'chromium-wide-light.png',
          sha256: 'a'.repeat(64),
        },
      ],
      recordedAt: '2026-09-21T00:00:00.000Z',
      retention: 'on-failure',
    });
    const schema = JSON.parse(
      await readFile(resolve('evaluator/report.schema.json'), 'utf8'),
    );
    delete schema.$schema;
    const validate = new Ajv({ schemaId: 'auto', format: false }).compile(
      schema,
    );
    expect(
      validate(report),
      validate.errors?.map((error) => error.message).join('\n'),
    ).toBe(true);
    expect(report.summary).toEqual({ errors: 1, warnings: 0, passed: false });
    expect(report.subjectiveReview).toMatchObject({
      status: 'not-recorded',
      ratings: [],
    });
    expect(formatUiEvaluationText(report)).toContain('KUI-B010');
    expect(formatUiEvaluationText(report)).toContain(
      'Repair: Remove fixed width.',
    );
  });
});

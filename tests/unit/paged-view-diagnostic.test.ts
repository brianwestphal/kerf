// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { instrumentPagedViewTest } from '../../scripts/prepare-paged-view-diagnostic.mjs';

describe('exact-source PagedView diagnostic overlay', () => {
  it('preserves every gesture/assertion byte while changing only the fixture import', () => {
    const source = readFileSync('ui/tests/browser/paged-view.spec.ts', 'utf8');
    const result = instrumentPagedViewTest(source);
    expect(
      result.replace('./paged-view-diagnostic-fixture.js', '@playwright/test'),
    ).toBe(source);
    expect(result).toContain('await pace();');
    expect(result).toContain("await expectShowing(three, 'rates');");
  });
  it('fails closed for changed, missing or duplicate imports', () => {
    expect(() => instrumentPagedViewTest('')).toThrow(
      'Expected one canonical test import',
    );
    const source = readFileSync('ui/tests/browser/paged-view.spec.ts', 'utf8');
    expect(() => instrumentPagedViewTest(source + source)).toThrow(
      'Expected one canonical test import',
    );
    expect(() =>
      instrumentPagedViewTest(instrumentPagedViewTest(source)),
    ).toThrow('Expected one canonical test import');
  });
  it('keeps full-suite load, source identity, zero retries and failure artifacts explicit', () => {
    const workflow = YAML.parse(
      readFileSync('.github/workflows/paged-view-diagnostic.yml', 'utf8'),
    );
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(workflow.on.workflow_dispatch.inputs['source-sha'].default).toBe(
      '14c603b83ac6755bd24a4c4695f3d5f7cf9c53bc',
    );
    const steps = workflow.jobs['chromium-full-load'].steps;
    const suites = steps.filter((step: { run?: string }) =>
      step.run?.includes('playwright test'),
    );
    expect(suites).toHaveLength(2);
    for (const step of suites) {
      expect(step.run).toContain('--project=chromium --workers=2 --retries=0');
      expect(step.run).not.toMatch(/--grep|--repeat|--timeout/);
    }
    expect(
      steps.find((step: { id?: string }) => step.id === 'overlay').if,
    ).toContain("steps.control.outcome != 'skipped'");
    expect(suites[1].if).toContain("steps.overlay.outcome == 'success'");
    expect(steps.at(-1).if).toBe('always()');
  });
});

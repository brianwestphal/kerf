import { describe, expect, it } from 'vitest';

import {
  gzipDelta,
  measuringNodeMismatch,
  roundedBudget,
  updateDemoBundleBudget,
} from '../../scripts/lib/demo-bundle-budget.mjs';

const budget = {
  schemaVersion: 1,
  largestJavaScriptGzip: 150_000,
  totalJavaScriptGzip: 276_600,
  measuredLargestJavaScriptGzip: 128_393,
  measuredTotalJavaScriptGzip: 276_493,
  history: [],
};
const measurement = {
  chunks: 15,
  largestJavaScriptAsset: 'catalog.js',
  largestJavaScriptGzip: 128_451,
  totalJavaScriptGzip: 277_021,
};

describe('demo bundle budget updates', () => {
  it('reports exact byte deltas from the reviewed baseline', () => {
    expect(gzipDelta(measurement, budget)).toEqual({
      largest: 58,
      total: 528,
    });
  });

  it('rounds reviewed total budgets to the next hundred bytes', () => {
    expect(roundedBudget(277_021)).toBe(277_100);
  });

  it('records measured old/new values, budgets, timestamp, and reason', () => {
    expect(
      updateDemoBundleBudget(
        budget,
        measurement,
        'Added the reviewed List detail specimen.',
        '2026-09-23T10:00:00.000Z',
      ),
    ).toMatchObject({
      totalJavaScriptGzip: 277_100,
      measuredTotalJavaScriptGzip: 277_021,
      history: [
        {
          at: '2026-09-23T10:00:00.000Z',
          reason: 'Added the reviewed List detail specimen.',
          old: {
            measuredTotalJavaScriptGzip: 276_493,
            totalJavaScriptGzip: 276_600,
          },
          next: {
            measuredTotalJavaScriptGzip: 277_021,
            totalJavaScriptGzip: 277_100,
          },
        },
      ],
    });
  });

  it('rejects an update without a specific review reason', () => {
    expect(() =>
      updateDemoBundleBudget(budget, measurement, 'tiny', '2026-09-23'),
    ).toThrow('specific review reason');
  });
});

describe('demo bundle measuring Node', () => {
  it('accepts any release of the pinned Node major', () => {
    expect(measuringNodeMismatch('v22.23.2', '22\n')).toBeNull();
    expect(measuringNodeMismatch('v22.12.0', 'v22.21.0')).toBeNull();
  });

  it('names both versions when a different zlib would measure the bundle', () => {
    const message = measuringNodeMismatch('v26.7.0', '22\n');
    expect(message).toContain('Node v26.7.0');
    expect(message).toContain('pinned Node 22 (.nvmrc)');
    expect(message).toContain('zlib');
  });
});

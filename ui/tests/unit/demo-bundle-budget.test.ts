import { describe, expect, it } from 'vitest';

import {
  gzipDelta,
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

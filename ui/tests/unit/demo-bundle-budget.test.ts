// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  gzipDelta,
  measureOnPinnedNode,
  measuringNodeMismatch,
  roundedBudget,
  updateDemoBundleBudget,
  ZLIB_DRIFT_BYTES,
  zlibDriftRisk,
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

// KF-J1Z4VA: off the pinned Node, the check measures under it, and fails a
// size too close to call when it cannot.
describe('demo bundle on the pinned Node', () => {
  const reply =
    (node: string, status = 0) =>
    () => ({
      status,
      stdout: `npm notice\n${JSON.stringify({ node, measurement })}\n`,
    });

  it('measures under the pinned major through npx', () => {
    const calls: string[][] = [];
    const measured = measureOnPinnedNode('/assets', '22\n', (command, args) => {
      calls.push([command, ...args]);
      return reply('v22.23.4')();
    });
    expect(measured).toEqual(measurement);
    expect(calls[0]!.slice(0, 4)).toEqual([
      'npx',
      '--yes',
      '--prefer-offline',
      'node@22',
    ]);
    expect(calls[0]!.at(-1)).toBe('/assets');
  });

  it('returns null when the pinned Node cannot run or is not what ran', () => {
    expect(measureOnPinnedNode('/a', '22', reply('v22.1.0', 1))).toBeNull();
    expect(measureOnPinnedNode('/a', '22', reply('v26.13.0'))).toBeNull();
    expect(
      measureOnPinnedNode('/a', '22', () => ({ status: 0, stdout: 'oops' })),
    ).toBeNull();
  });

  it('fails a size within the zlib drift of either budget', () => {
    const roomy = { ...budget, totalJavaScriptGzip: 300_000 };
    expect(zlibDriftRisk(measurement, roomy, 'v26.13.0')).toBeNull();
    const close = {
      ...roomy,
      totalJavaScriptGzip:
        measurement.totalJavaScriptGzip + ZLIB_DRIFT_BYTES - 1,
    };
    expect(zlibDriftRisk(measurement, close, 'v26.13.0')).toMatch(
      /total measures 277021 bytes gzip on Node v26\.13\.0/,
    );
    const largest = {
      ...roomy,
      largestJavaScriptGzip: measurement.largestJavaScriptGzip + 10,
    };
    expect(zlibDriftRisk(measurement, largest, 'v26.13.0')).toMatch(
      /largest chunk/,
    );
  });
});

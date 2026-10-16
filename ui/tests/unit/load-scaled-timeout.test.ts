import { describe, expect, it } from 'vitest';

import {
  loadScaledTimeout,
  timeoutScale,
} from '../helpers/load-scaled-timeout.js';

describe('timeoutScale', () => {
  it('honors an explicit scale, capped at 4', () => {
    expect(timeoutScale({ KERF_TEST_TIMEOUT_SCALE: '2.5' }, 0, 8)).toBe(2.5);
    expect(timeoutScale({ KERF_TEST_TIMEOUT_SCALE: '10' }, 0, 8)).toBe(4);
  });

  it('keeps CI at 1 unless overridden', () => {
    expect(timeoutScale({ CI: 'true' }, 64, 8)).toBe(1);
    expect(
      timeoutScale({ CI: 'true', KERF_TEST_TIMEOUT_SCALE: '3' }, 0, 8),
    ).toBe(3);
  });

  it('scales by load per core locally, between 1 and 4', () => {
    expect(timeoutScale({}, 4, 8)).toBe(1);
    expect(timeoutScale({}, 24, 8)).toBe(3);
    expect(timeoutScale({}, 148, 10)).toBe(4);
  });

  it('ignores unusable input', () => {
    expect(timeoutScale({ KERF_TEST_TIMEOUT_SCALE: 'nope' }, 4, 8)).toBe(1);
    expect(timeoutScale({ KERF_TEST_TIMEOUT_SCALE: '0' }, 4, 0)).toBe(1);
  });

  it('never shortens a timeout', () => {
    expect(loadScaledTimeout(30_000)).toBeGreaterThanOrEqual(30_000);
  });
});

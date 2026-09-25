import { describe, expect, it } from 'vitest';

import { formatTimingRecord } from '../../scripts/lib/ticket-timing.mjs';
import {
  aggregateTicketTiming,
  formatAggregate,
  percentile,
} from '../../scripts/lib/ticket-timing-aggregate.mjs';

function push(
  started: string,
  seconds: number,
  extra: Record<string, unknown> = {},
) {
  const start = Date.parse(started);
  return formatTimingRecord({
    schema_version: 1,
    event: 'interval',
    phase: 'push_hook',
    gate: 'root:check',
    started_at: new Date(start).toISOString(),
    finished_at: new Date(start + seconds * 1000).toISOString(),
    outcome: 'passed',
    ...extra,
  });
}

function tickets(notes: Record<string, string[]>) {
  return Object.entries(notes).map(([slug, lines]) => ({
    slug,
    text: [`slug: ${slug}`, ...lines].join('\n'),
  }));
}

describe('cross-ticket timing aggregation', () => {
  it('interpolates percentiles', () => {
    expect(percentile([], 0.5)).toBeNull();
    expect(percentile([10], 0.9)).toBe(10);
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(percentile([10, 20, 30, 40], 0.9)).toBe(37);
  });

  it('counts one push attached to several tickets as one sample', () => {
    const shared = push('2026-09-24T10:00:00Z', 60);
    const result = aggregateTicketTiming(
      tickets({
        'KF-A': [shared, push('2026-09-24T11:00:00Z', 80)],
        'KF-B': [shared],
        'KF-C': [shared],
      }),
    );
    expect(result.gates).toEqual([
      expect.objectContaining({
        phase: 'push_hook',
        gate: 'root:check',
        samples: 2,
        median_ms: 70_000,
        outcomes: { passed: 2, failed: 0, interrupted: 0, skipped: 0 },
      }),
    ]);
    expect(result.phases.push_hook).toMatchObject({
      tickets: 3,
      median_ms: 60_000,
      max_ms: 140_000,
    });
    expect(result.backfill).toEqual([]);
  });

  it('detects and excludes an interval fanned out to more tickets than a coherent batch', () => {
    const backfill = push('2026-09-23T11:33:48.240Z', 55);
    const notes: Record<string, string[]> = {};
    for (let index = 0; index < 30; index += 1)
      notes[`KF-OLD${index}`] = [backfill];
    notes['KF-NEW'] = [backfill, push('2026-09-24T10:00:00Z', 75)];

    const excluded = aggregateTicketTiming(tickets(notes));
    expect(excluded.backfill).toEqual([
      {
        phase: 'push_hook',
        gate: 'root:check',
        started_at: '2026-09-23T11:33:48.240Z',
        finished_at: '2026-09-23T11:34:43.240Z',
        tickets: 31,
      },
    ]);
    expect(excluded.excluded_records).toBe(31);
    expect(excluded.tickets).toBe(1);
    expect(excluded.gates[0]).toMatchObject({ samples: 1, median_ms: 75_000 });
    expect(excluded.phases.push_hook).toMatchObject({
      tickets: 1,
      median_ms: 75_000,
    });
    expect(formatAggregate(excluded)).toContain(
      'Excluded backfill: push_hook/root:check at 2026-09-23T11:33:48.240Z attached to 31 tickets',
    );

    // Even when included on request, the backfill counts as one push.
    const included = aggregateTicketTiming(tickets(notes), {
      includeBackfill: true,
    });
    expect(included.excluded_records).toBe(0);
    expect(included.gates[0]).toMatchObject({ samples: 2 });
    expect(included.tickets).toBe(31);

    // A lower threshold reclassifies smaller fan-outs; a higher one keeps them.
    expect(
      aggregateTicketTiming(tickets(notes), { backfillThreshold: 40 }).backfill,
    ).toEqual([]);
  });

  it('keeps skipped gates out of durations and aggregates per-step timing', () => {
    const result = aggregateTicketTiming(
      tickets({
        'KF-A': [
          push('2026-09-24T10:00:00Z', 60, {
            steps: { lint: 10_000, test: 30_000 },
          }),
          push('2026-09-24T11:00:00Z', 90, {
            outcome: 'failed',
            failure_category: 'command_exit',
            steps: { lint: 12_000, test: 70_000 },
            failed_step: 'test',
          }),
          push('2026-09-24T12:00:00Z', 0, {
            outcome: 'skipped',
            skip_reason: 'tree_already_verified',
          }),
        ],
      }),
    );
    const [gate] = result.gates;
    expect(gate).toMatchObject({
      samples: 2,
      median_ms: 75_000,
      outcomes: { passed: 1, failed: 1, interrupted: 0, skipped: 1 },
    });
    expect(gate.steps.lint).toMatchObject({ samples: 2, median_ms: 11_000 });
    expect(gate.steps.test).toMatchObject({ samples: 2, p90_ms: 66_000 });
    expect(formatAggregate(result)).toContain('  test: median 50.0s');
  });

  it('filters by --since and pairs start/finish sessions by session id', () => {
    const start = formatTimingRecord({
      schema_version: 1,
      event: 'start',
      phase: 'active',
      gate: 'implementation',
      session_id: 's1',
      at: '2026-09-24T09:00:00.000Z',
    });
    const finish = formatTimingRecord({
      schema_version: 1,
      event: 'finish',
      phase: 'active',
      gate: 'implementation',
      session_id: 's1',
      at: '2026-09-24T09:30:00.000Z',
      outcome: 'passed',
    });
    const result = aggregateTicketTiming(
      tickets({
        'KF-A': [start, finish, push('2026-09-20T10:00:00Z', 30)],
      }),
      { since: '2026-09-24T00:00:00Z' },
    );
    expect(result.gates.map((gate) => [gate.phase, gate.samples])).toEqual([
      ['active', 1],
    ]);
    expect(result.phases.active).toMatchObject({ median_ms: 1_800_000 });
    expect(formatAggregate(aggregateTicketTiming([]))).toContain(
      'No timing intervals recorded.',
    );
  });
});

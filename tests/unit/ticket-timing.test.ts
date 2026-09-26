import { describe, expect, it } from 'vitest';

import {
  formatTimingRecord,
  MAX_COHERENT_TICKETS,
  parseTimingRecords,
  pushTimingTickets,
  summarizeTicketTiming,
  ticketSlugsFromSubjects,
} from '../../scripts/lib/ticket-timing.mjs';

function note(record: object) {
  return formatTimingRecord({ schema_version: 1, ...record });
}

describe('ticket timing records', () => {
  it('round-trips records while ignoring malformed note content', () => {
    const record = {
      schema_version: 1,
      event: 'interval',
      phase: 'ci',
      gate: 'github:ci',
      started_at: '2026-09-23T10:00:00.000Z',
      finished_at: '2026-09-23T10:00:02.000Z',
      outcome: 'passed',
    };

    expect(
      parseTimingRecords(
        `ordinary note\n${formatTimingRecord(record)}\nKERF_TICKET_TIMING_V1 nope`,
      ),
    ).toEqual([record]);
  });

  it('summarizes transitions, repeated failures, queue delay, and anomalies', () => {
    const text = [
      'created_at: 2026-09-23T09:00:00.000Z',
      note({
        event: 'finish',
        phase: 'active',
        gate: 'implementation',
        session_id: 'orphan',
        at: '2026-09-23T09:05:00.000Z',
        outcome: 'passed',
      }),
      note({
        event: 'start',
        phase: 'active',
        gate: 'implementation',
        session_id: 'work',
        at: '2026-09-23T09:10:00.000Z',
      }),
      note({
        event: 'interval',
        phase: 'local_verification',
        gate: 'root:check',
        started_at: '2026-09-23T09:20:00.000Z',
        finished_at: '2026-09-23T09:20:03.000Z',
        outcome: 'failed',
        failure_category: 'lint',
      }),
      note({
        event: 'interval',
        phase: 'local_verification',
        gate: 'root:check',
        started_at: '2026-09-23T09:21:00.000Z',
        finished_at: '2026-09-23T09:21:04.000Z',
        outcome: 'failed',
        failure_category: 'lint',
      }),
      note({
        event: 'finish',
        phase: 'active',
        gate: 'implementation',
        session_id: 'work',
        at: '2026-09-23T09:30:00.000Z',
        outcome: 'passed',
      }),
      note({
        event: 'start',
        phase: 'publication',
        gate: 'npm:propagation',
        session_id: 'open',
        at: '2026-09-23T09:31:00.000Z',
      }),
    ].join('\n');

    expect(summarizeTicketTiming(text)).toMatchObject({
      queue_delay_ms: 600_000,
      phases: {
        active: { attempts: 1, duration_ms: 1_200_000, failures: 0 },
        local_verification: {
          attempts: 2,
          duration_ms: 7_000,
          failures: 2,
        },
      },
      failure_categories: { lint: 2 },
      in_progress: [{ session_id: 'open' }],
      unmatched_finishes: ['orphan'],
    });
  });

  it('deduplicates ticket slugs found across outgoing commit subjects', () => {
    expect(
      ticketSlugsFromSubjects([
        'KF-WB8CJB add timing',
        'fix KF-WB8CJB and KF-ABC123',
        'unrelated',
      ]),
    ).toEqual(['KF-ABC123', 'KF-WB8CJB']);
  });

  it('ignores rule and diagnostic IDs that share the slug shape', () => {
    expect(
      ticketSlugsFromSubjects([
        'KF-8YP32A: measure KUI-B050 target size by hit-testing',
        'fix TS2304 and ESLINT-L014 noise',
      ]),
    ).toEqual(['KF-8YP32A']);
    expect(ticketSlugsFromSubjects(['HS2-ABC123 upstream'], 'HS2')).toEqual([
      'HS2-ABC123',
    ]);
  });

  it('fans a push out only while its outgoing tickets form a coherent batch', () => {
    const batch = Array.from(
      { length: MAX_COHERENT_TICKETS },
      (_, index) => `KF-B${index}`,
    );
    expect(pushTimingTickets(batch, ['KF-EXTRA'])).toEqual({
      tickets: [...batch, 'KF-EXTRA'].sort(),
      capped: false,
      outgoing: MAX_COHERENT_TICKETS,
    });
    expect(pushTimingTickets(['KF-A', 'KF-A'], [])).toEqual({
      tickets: ['KF-A'],
      capped: false,
      outgoing: 1,
    });

    const history = [...batch, 'KF-OVER'];
    expect(pushTimingTickets(history, [])).toEqual({
      tickets: [],
      capped: true,
      outgoing: MAX_COHERENT_TICKETS + 1,
    });
    expect(pushTimingTickets(history, ['KF-B0', 'KF-RELEASE'])).toEqual({
      tickets: ['KF-B0', 'KF-RELEASE'],
      capped: true,
      outgoing: MAX_COHERENT_TICKETS + 1,
    });
  });
});

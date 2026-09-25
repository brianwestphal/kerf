// Cross-ticket timing aggregation for `ticket:timing summary --all`.
//
// One push, CI run, or publication wait is often attached to several tickets
// (every ticket in the pushed batch gets the same interval). Aggregating per
// record would count that one event once per ticket, so intervals are first
// deduplicated by identity: the same phase, gate, start, and finish (or the
// same start/finish session) is one sample however many tickets carry it.
//
// Identity also exposes backfill. An interval attached to more tickets than a
// coherent batch can hold (MAX_COHERENT_TICKETS) was not measured for those
// tickets — the 2026-09-23 first push of the pre-push timing hook attached one
// ~55 s check to 374 historical tickets — so it is reported and excluded from
// every statistic by default instead of mutating the stored notes.

import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  MAX_COHERENT_TICKETS,
  parseTimingRecords,
  ticketIntervals,
  TIMING_PHASES,
} from './ticket-timing.mjs';

/** Linear-interpolated percentile of an ascending array (p in [0, 1]). */
export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return Math.round(
    sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower),
  );
}

function distribution(values) {
  const sorted = values.toSorted((a, b) => a - b);
  return {
    samples: sorted.length,
    median_ms: percentile(sorted, 0.5),
    p90_ms: percentile(sorted, 0.9),
    max_ms: sorted.length ? sorted.at(-1) : null,
  };
}

export function intervalIdentity(interval) {
  if (interval.event === 'finish') return `session:${interval.session_id}`;
  return [
    interval.phase,
    interval.gate,
    interval.started_at,
    interval.finished_at,
  ].join('|');
}

/**
 * Aggregate timing across tickets.
 *
 * @param {Array<{ slug: string, text: string }>} tickets
 * @param {{ since?: string, backfillThreshold?: number, includeBackfill?: boolean }} options
 */
export function aggregateTicketTiming(tickets, options = {}) {
  const threshold = options.backfillThreshold ?? MAX_COHERENT_TICKETS;
  const since = options.since ? Date.parse(options.since) : null;

  // identity → { interval, tickets: Set<slug> }
  const unique = new Map();
  for (const { slug, text } of tickets) {
    const { intervals } = ticketIntervals(parseTimingRecords(text));
    for (const interval of intervals) {
      if (!TIMING_PHASES.includes(interval.phase)) continue;
      if (since !== null && !(Date.parse(interval.started_at) >= since))
        continue;
      const key = intervalIdentity(interval);
      if (!unique.has(key)) unique.set(key, { interval, tickets: new Set() });
      unique.get(key).tickets.add(slug);
    }
  }

  const backfill = [];
  const kept = [];
  let excludedRecords = 0;
  for (const entry of unique.values()) {
    if (entry.tickets.size > threshold) {
      backfill.push({
        phase: entry.interval.phase,
        gate: entry.interval.gate,
        started_at: entry.interval.started_at,
        finished_at: entry.interval.finished_at,
        tickets: entry.tickets.size,
      });
      excludedRecords += entry.tickets.size;
      if (!options.includeBackfill) continue;
    }
    kept.push(entry);
  }

  const gates = new Map();
  const perTicket = new Map(); // phase → Map<slug, total ms>
  const ticketsWithTiming = new Set();
  for (const { interval, tickets: slugs } of kept) {
    const gateKey = `${interval.phase}/${interval.gate}`;
    if (!gates.has(gateKey))
      gates.set(gateKey, {
        phase: interval.phase,
        gate: interval.gate,
        durations: [],
        outcomes: { passed: 0, failed: 0, interrupted: 0, skipped: 0 },
        steps: new Map(),
      });
    const gate = gates.get(gateKey);
    const outcome =
      interval.outcome in gate.outcomes ? interval.outcome : 'failed';
    gate.outcomes[outcome] += 1;
    for (const slug of slugs) ticketsWithTiming.add(slug);
    // A skipped gate did not run: counted, but never a duration sample.
    if (outcome === 'skipped') continue;
    gate.durations.push(interval.duration_ms);
    for (const [step, ms] of Object.entries(interval.steps ?? {})) {
      if (!Number.isFinite(ms)) continue;
      if (!gate.steps.has(step)) gate.steps.set(step, []);
      gate.steps.get(step).push(ms);
    }
    if (!perTicket.has(interval.phase))
      perTicket.set(interval.phase, new Map());
    const totals = perTicket.get(interval.phase);
    for (const slug of slugs)
      totals.set(slug, (totals.get(slug) ?? 0) + interval.duration_ms);
  }

  return {
    tickets: ticketsWithTiming.size,
    backfill_threshold: threshold,
    backfill_included: Boolean(options.includeBackfill),
    backfill: backfill.sort((a, b) => b.tickets - a.tickets),
    excluded_records: options.includeBackfill ? 0 : excludedRecords,
    gates: [...gates.values()]
      .map((gate) => ({
        phase: gate.phase,
        gate: gate.gate,
        ...distribution(gate.durations),
        outcomes: gate.outcomes,
        steps: Object.fromEntries(
          [...gate.steps].map(([step, values]) => [step, distribution(values)]),
        ),
      }))
      .sort(
        (a, b) =>
          TIMING_PHASES.indexOf(a.phase) - TIMING_PHASES.indexOf(b.phase) ||
          a.gate.localeCompare(b.gate),
      ),
    phases: Object.fromEntries(
      TIMING_PHASES.filter((phase) => perTicket.has(phase)).map((phase) => {
        const { samples, ...rest } = distribution([
          ...perTicket.get(phase).values(),
        ]);
        return [phase, { tickets: samples, ...rest }];
      }),
    ),
  };
}

function seconds(ms) {
  return ms === null ? 'n/a' : `${(ms / 1000).toFixed(1)}s`;
}

/** Human-readable report for `summary --all`. */
export function formatAggregate(result) {
  const lines = [
    `Timing across ${result.tickets} ticket(s) (backfill: more than ${result.backfill_threshold} tickets per interval)`,
  ];
  for (const entry of result.backfill)
    lines.push(
      `${result.backfill_included ? 'Included' : 'Excluded'} backfill: ${entry.phase}/${entry.gate} at ${entry.started_at} attached to ${entry.tickets} tickets`,
    );
  if (result.gates.length === 0) lines.push('No timing intervals recorded.');
  for (const gate of result.gates) {
    const { passed, failed, interrupted, skipped } = gate.outcomes;
    lines.push(
      `${gate.phase}/${gate.gate}: ${gate.samples} run(s), median ${seconds(gate.median_ms)}, p90 ${seconds(gate.p90_ms)}, max ${seconds(gate.max_ms)} (${passed} passed, ${failed} failed, ${interrupted} interrupted, ${skipped} skipped)`,
    );
    for (const [step, data] of Object.entries(gate.steps))
      lines.push(
        `  ${step}: median ${seconds(data.median_ms)}, p90 ${seconds(data.p90_ms)} over ${data.samples}`,
      );
  }
  const phases = Object.entries(result.phases);
  if (phases.length) lines.push('Per-ticket phase totals:');
  for (const [phase, data] of phases)
    lines.push(
      `  ${phase}: ${data.tickets} ticket(s), median ${seconds(data.median_ms)}, p90 ${seconds(data.p90_ms)}`,
    );
  return lines.join('\n');
}

const execFileAsync = promisify(execFile);

async function readPointer(directory) {
  try {
    const target = (
      await readFile(join(directory, '.hotsheet2', 'store'), 'utf8')
    ).trim();
    return target ? resolve(directory, target) : null;
  } catch {
    return null;
  }
}

/**
 * The Hot Sheet store directory: an explicit `--store`, else the gitignored
 * `.hotsheet2/store` pointer in this checkout, else the one in the main
 * checkout (linked worktrees share its store but not its ignored files).
 */
export async function resolveStoreDirectory(cwd, explicit) {
  if (explicit) return resolve(cwd, explicit);
  const local = await readPointer(cwd);
  if (local) return local;
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd },
    );
    const main = await readPointer(dirname(stdout.trim()));
    if (main) return main;
  } catch {
    // Not a git checkout.
  }
  throw new Error(
    'No Hot Sheet store found; pass --store <dir> (the directory holding tickets/)',
  );
}

/** Read every ticket file in a store (read-only) as `{ slug, text }`. */
export async function readStoreTickets(storeDirectory) {
  const tickets = [];
  const entries = await readdir(join(storeDirectory, 'tickets'), {
    recursive: true,
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const text = await readFile(join(entry.parentPath, entry.name), 'utf8');
    const slug = text.match(/^slug:\s*(\S+)/m)?.[1] ?? entry.name;
    tickets.push({ slug, text });
  }
  return tickets;
}

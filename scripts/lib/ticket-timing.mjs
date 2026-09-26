const MARKER = 'KERF_TICKET_TIMING_V1 ';

export const TIMING_PHASES = [
  'active',
  'local_verification',
  'push_hook',
  'ci',
  'publication',
];

const IDENTIFIER = /^[a-z0-9][a-z0-9:._-]{0,79}$/;
const TICKET = /^[A-Z][A-Z0-9]*-[A-Z0-9]+$/;

export function assertTicket(value) {
  if (!TICKET.test(value)) throw new Error(`Invalid ticket slug: ${value}`);
  return value;
}

export function assertPhase(value) {
  if (!TIMING_PHASES.includes(value))
    throw new Error(`Invalid phase: ${value}`);
  return value;
}

export function assertIdentifier(value, label = 'identifier') {
  if (!IDENTIFIER.test(value))
    throw new Error(
      `Invalid ${label}: use 1-80 lowercase letters, numbers, colons, dots, underscores, or hyphens`,
    );
  return value;
}

export function isoTime(value, label = 'timestamp') {
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) throw new Error(`Invalid ${label}`);
  return date.toISOString();
}

export function formatTimingRecord(record) {
  return `${MARKER}${JSON.stringify(record)}`;
}

export function parseTimingRecords(text) {
  const records = [];
  for (const line of text.split('\n')) {
    const index = line.indexOf(MARKER);
    if (index === -1) continue;
    try {
      const record = JSON.parse(line.slice(index + MARKER.length));
      if (record?.schema_version === 1) records.push(record);
    } catch {
      // A malformed human-authored note is ignored, not allowed to break review.
    }
  }
  return records;
}

/** This project's Hot Sheet ticket prefix (`KF-ABC123`). */
export const TICKET_PREFIX = 'KF';

/**
 * Ticket slugs named in commit subjects. Only this project's prefix counts, so
 * rule and diagnostic IDs that share the shape (`KUI-B050`, `TS2304`) are not
 * mistaken for tickets.
 */
export function ticketSlugsFromSubjects(subjects, prefix = TICKET_PREFIX) {
  const pattern = new RegExp(`\\b${prefix}-[A-Z0-9]+\\b`, 'g');
  const slugs = new Set();
  for (const subject of subjects) {
    for (const match of subject.matchAll(pattern)) slugs.add(match[0]);
  }
  return [...slugs].sort();
}

function intervalFromRecord(record) {
  if (record.event !== 'interval') return null;
  const started = Date.parse(record.started_at);
  const finished = Date.parse(record.finished_at);
  if (!Number.isFinite(started) || !Number.isFinite(finished)) return null;
  return { ...record, duration_ms: Math.max(0, finished - started) };
}

// A push batch of more tickets than this is not a coherent unit of work: an
// interval attached to more tickets at once is treated as backfill.
export const MAX_COHERENT_TICKETS = 25;

/**
 * The tickets a push-hook interval is written to. Tickets derived from
 * outgoing commits fan out only while they form a coherent batch; past
 * `MAX_COHERENT_TICKETS` (a first push of a long history, a force-push) the
 * derived set is dropped and only the explicit `KERF_TICKET_TIMING_TICKETS`
 * list is recorded, so the hook never writes the backfill shape the summary
 * would have to exclude.
 */
export function pushTimingTickets(derived, explicit) {
  const outgoing = [...new Set(derived)];
  const capped = outgoing.length > MAX_COHERENT_TICKETS;
  return {
    tickets: [...new Set([...(capped ? [] : outgoing), ...explicit])].sort(),
    capped,
    outgoing: outgoing.length,
  };
}

/**
 * Every completed interval in a ticket's records, direct or start/finish
 * paired, plus the sessions still open and finishes with no start.
 */
export function ticketIntervals(records) {
  const starts = new Map();
  const intervals = [];
  const unmatchedFinishes = [];

  for (const record of records) {
    const direct = intervalFromRecord(record);
    if (direct) {
      intervals.push(direct);
      continue;
    }
    if (record.event === 'start') starts.set(record.session_id, record);
    if (record.event === 'finish') {
      const start = starts.get(record.session_id);
      if (!start) {
        unmatchedFinishes.push(record.session_id);
        continue;
      }
      starts.delete(record.session_id);
      intervals.push({
        ...record,
        phase: start.phase,
        gate: start.gate,
        started_at: start.at,
        finished_at: record.at,
        duration_ms: Math.max(0, Date.parse(record.at) - Date.parse(start.at)),
      });
    }
  }

  intervals.sort((a, b) => a.started_at.localeCompare(b.started_at));
  return { intervals, open: [...starts.values()], unmatchedFinishes };
}

export function summarizeTicketTiming(ticketText) {
  const createdMatch = ticketText.match(/^created_at:\s*(\S+)/m);
  const createdAt = createdMatch ? Date.parse(createdMatch[1]) : Number.NaN;
  const records = parseTimingRecords(ticketText);
  const { intervals, open, unmatchedFinishes } = ticketIntervals(records);
  const phases = Object.fromEntries(
    TIMING_PHASES.map((phase) => [
      phase,
      { attempts: 0, duration_ms: 0, failures: 0, skipped: 0 },
    ]),
  );
  const failureCategories = {};
  for (const interval of intervals) {
    if (!phases[interval.phase]) continue;
    // A skipped gate (the pre-push hook reusing an identical local pass) did
    // not run, so it is neither an attempt nor a failure.
    if (interval.outcome === 'skipped') {
      phases[interval.phase].skipped += 1;
      continue;
    }
    phases[interval.phase].attempts += 1;
    phases[interval.phase].duration_ms += interval.duration_ms;
    if (interval.outcome !== 'passed') phases[interval.phase].failures += 1;
    if (interval.failure_category) {
      failureCategories[interval.failure_category] =
        (failureCategories[interval.failure_category] ?? 0) + 1;
    }
  }

  const activeStarts = records
    .filter(
      (entry) =>
        entry.phase === 'active' &&
        (entry.event === 'start' || entry.event === 'interval'),
    )
    .map((entry) => entry.at ?? entry.started_at)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort();
  return {
    queue_delay_ms:
      activeStarts.length && Number.isFinite(createdAt)
        ? Math.max(0, Date.parse(activeStarts[0]) - createdAt)
        : null,
    phases,
    failure_categories: failureCategories,
    in_progress: open,
    unmatched_finishes: unmatchedFinishes,
  };
}

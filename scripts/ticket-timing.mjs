#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import {
  decideCheckSkip,
  isForced,
  readCheckPass,
  readWorktreeState,
  treeOf,
} from './lib/check-pass-cache.mjs';
import { stepTimingFields } from './lib/check-steps.mjs';
import {
  assertIdentifier,
  assertPhase,
  assertTicket,
  formatTimingRecord,
  isoTime,
  MAX_COHERENT_TICKETS,
  parseTimingRecords,
  pushTimingTickets,
  summarizeTicketTiming,
  ticketSlugsFromSubjects,
} from './lib/ticket-timing.mjs';
import {
  aggregateTicketTiming,
  formatAggregate,
  readStoreTickets,
  resolveStoreDirectory,
} from './lib/ticket-timing-aggregate.mjs';
import {
  GH_RUN_FIELDS,
  hasRecordedRun,
  MAX_TICKETS_PER_RUN,
  planCiImports,
} from './lib/ticket-timing-ci.mjs';

const execFileAsync = promisify(execFile);
const hotsheet = process.env.HOTSHEET_CLI || 'hotsheet-cli';
const gh = process.env.KERF_GH_CLI || 'gh';

function usage(message) {
  if (message) console.error(message);
  console.error(`Usage:
  npm run ticket:timing -- start <ticket> --phase <phase> --gate <id>
  npm run ticket:timing -- finish <ticket> --session <uuid> [--outcome passed|failed] [--failure-category <id>]
  npm run ticket:timing -- run <ticket> --phase <phase> --gate <id> [--failure-category <id>] -- <command> [args...]
  npm run ticket:timing -- record <ticket> --phase <phase> --gate <id> --started-at <iso> --finished-at <iso> --outcome passed|failed|interrupted|skipped
  npm run ticket:timing -- summary <ticket> [--json]
  npm run ticket:timing -- summary --all [--store <dir>] [--since <iso>] [--backfill-threshold <n>] [--include-backfill] [--json]
  npm run ticket:timing -- claim <ticket> --worker <id> [--gate <id>]
  npm run ticket:timing -- release <ticket> --worker <id> [--outcome passed|failed|interrupted]
  npm run ticket:timing -- import-ci [--limit <n>] [--branch <name>] [--dry-run]`);
  process.exit(2);
}

function options(args) {
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith('--')) parsed._.push(value);
    else {
      const name = value.slice(2).replaceAll('-', '_');
      if (['json', 'dry_run', 'all', 'include_backfill'].includes(name))
        parsed[name] = true;
      else parsed[name] = args[++index];
    }
  }
  return parsed;
}

async function showTicket(ticket) {
  return (await execFileAsync(hotsheet, ['show', ticket], { encoding: 'utf8' }))
    .stdout;
}

async function append(ticket, record) {
  const summary = `Timing: ${record.phase}/${record.gate} ${record.event}`;
  await execFileAsync(hotsheet, [
    'edit',
    ticket,
    '--note',
    formatTimingRecord(record),
    '--note-kind',
    'activity',
    '--note-summary',
    summary,
  ]);
}

function baseRecord(parsed) {
  return {
    schema_version: 1,
    phase: assertPhase(parsed.phase),
    gate: assertIdentifier(parsed.gate, 'gate'),
  };
}

async function start(ticket, parsed) {
  const record = {
    ...baseRecord(parsed),
    event: 'start',
    session_id: randomUUID(),
    at: new Date().toISOString(),
  };
  await append(ticket, record);
  console.log(record.session_id);
}

async function finish(ticket, parsed) {
  if (!parsed.session) usage('--session is required');
  const text = await showTicket(ticket);
  const startRecord = parseTimingRecords(text)
    .toReversed()
    .find(
      (entry) => entry.event === 'start' && entry.session_id === parsed.session,
    );
  if (!startRecord)
    throw new Error(`Unknown timing session: ${parsed.session}`);
  const outcome = parsed.outcome ?? 'passed';
  if (!['passed', 'failed', 'interrupted'].includes(outcome))
    throw new Error(`Invalid outcome: ${outcome}`);
  const record = {
    schema_version: 1,
    event: 'finish',
    phase: startRecord.phase,
    gate: startRecord.gate,
    session_id: parsed.session,
    at: new Date().toISOString(),
    outcome,
    ...(parsed.failure_category
      ? {
          failure_category: assertIdentifier(
            parsed.failure_category,
            'failure category',
          ),
        }
      : {}),
  };
  await append(ticket, record);
}

const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];

// Runs a command while this wrapper survives Ctrl-C / termination long enough
// to record the attempt as `interrupted`: the signal is forwarded to the child
// instead of killing the wrapper before it can write the timing note.
async function runCommand(command, args, env = process.env) {
  const child = spawn(command, args, { stdio: 'inherit', env });
  let interrupted = null;
  const forward = (signal) => {
    interrupted = signal;
    child.kill(signal);
  };
  for (const signal of FORWARDED_SIGNALS) process.on(signal, forward);
  try {
    return await new Promise((resolve) => {
      child.once('error', () => resolve({ code: 1, signal: null }));
      child.once('exit', (code, signal) =>
        resolve({ code, signal: signal ?? interrupted }),
      );
    });
  } finally {
    for (const signal of FORWARDED_SIGNALS) process.off(signal, forward);
  }
}

// Runs a command with a step log a step-timed chain (scripts/run-check-steps.mjs)
// can fill, and returns the per-step fields for the timing record.
async function runWithSteps(command) {
  const directory = await mkdtemp(join(tmpdir(), 'kerf-check-steps-'));
  const log = join(directory, 'steps.json');
  try {
    const result = await runCommand(command[0], command.slice(1), {
      ...process.env,
      KERF_CHECK_STEP_LOG: log,
    });
    let fields = {};
    try {
      fields = stepTimingFields(JSON.parse(await readFile(log, 'utf8')));
    } catch {
      // The command was not a step-timed chain, or stopped before step one.
    }
    return { result, fields };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function commandOutcome(result) {
  if (result.code === 0 && !result.signal) return { outcome: 'passed' };
  if (result.signal)
    return { outcome: 'interrupted', failure_category: 'signal' };
  return { outcome: 'failed', failure_category: 'command_exit' };
}

function exitStatus(result) {
  if (result.signal) {
    console.error(`Command terminated by ${result.signal}`);
    return result.signal === 'SIGINT' ? 130 : 1;
  }
  return result.code ?? 1;
}

async function recordInterval(ticket, parsed, outcome, extra = {}) {
  const startedAt = isoTime(parsed.started_at, 'start timestamp');
  const finishedAt = isoTime(parsed.finished_at, 'finish timestamp');
  if (Date.parse(finishedAt) < Date.parse(startedAt))
    throw new Error('Finish timestamp precedes start timestamp');
  const record = {
    ...baseRecord(parsed),
    event: 'interval',
    started_at: startedAt,
    finished_at: finishedAt,
    outcome,
    ...(parsed.failure_category
      ? {
          failure_category: assertIdentifier(
            parsed.failure_category,
            'failure category',
          ),
        }
      : {}),
    ...(parsed.skip_reason
      ? { skip_reason: assertIdentifier(parsed.skip_reason, 'skip reason') }
      : {}),
    ...extra,
  };
  await append(ticket, record);
}

async function runTimed(ticket, parsed, command) {
  if (command.length === 0) usage('A command is required after --');
  const startedAt = new Date().toISOString();
  const { result, fields } = await runWithSteps(command);
  const { outcome, failure_category } = commandOutcome(result);
  await recordInterval(
    ticket,
    {
      ...parsed,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ...(failure_category && !parsed.failure_category
        ? { failure_category }
        : {}),
    },
    outcome,
    fields,
  );
  process.exitCode = exitStatus(result);
}

function formatDuration(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

async function summary(ticket, json) {
  const result = summarizeTicketTiming(await showTicket(ticket));
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`${ticket} timing summary`);
  console.log(
    `Queue delay: ${result.queue_delay_ms === null ? 'not captured' : formatDuration(result.queue_delay_ms)}`,
  );
  for (const [phase, data] of Object.entries(result.phases))
    console.log(
      `${phase}: ${formatDuration(data.duration_ms)} across ${data.attempts} attempt(s), ${data.failures} failure(s)${data.skipped ? `, ${data.skipped} skipped` : ''}`,
    );
  const failures = Object.entries(result.failure_categories);
  console.log(
    `Failure categories: ${failures.length ? failures.map(([name, count]) => `${name}=${count}`).join(', ') : 'none'}`,
  );
  if (result.in_progress.length)
    console.log(`In progress: ${result.in_progress.length} session(s)`);
}

async function hasRemoteTrackingRefs(remoteName) {
  if (!remoteName) return false;
  const { stdout } = await execFileAsync('git', [
    'for-each-ref',
    '--format=%(refname)',
    `refs/remotes/${remoteName}`,
  ]);
  return stdout.trim().length > 0;
}

function pushedLocalShas(input) {
  return input
    .trim()
    .split('\n')
    .map((line) => line.split(/\s+/)[1])
    .filter((sha) => sha && !/^0+$/.test(sha));
}

async function subjectsFromPushInput(input, remoteName) {
  const subjects = [];
  const remoteTracksCommits = await hasRemoteTrackingRefs(remoteName);
  for (const line of input.trim().split('\n')) {
    if (!line) continue;
    const [, localSha, , remoteSha] = line.split(/\s+/);
    if (!localSha || /^0+$/.test(localSha)) continue;
    const logArgs = ['log', '--format=%s'];
    if (remoteSha && !/^0+$/.test(remoteSha))
      logArgs.push(`${remoteSha}..${localSha}`);
    else {
      logArgs.push(localSha);
      if (remoteTracksCommits) logArgs.push('--not', `--remotes=${remoteName}`);
    }
    const { stdout } = await execFileAsync('git', logArgs);
    subjects.push(...stdout.trim().split('\n').filter(Boolean));
  }
  return subjects;
}

function explicitlySuppliedTickets() {
  return ticketSlugsFromSubjects([
    process.env.KERF_TICKET_TIMING_TICKETS ?? '',
  ]);
}

async function checkSkipDecision(input) {
  const cwd = process.cwd();
  const current = await readWorktreeState(cwd);
  const pushedTrees = [];
  try {
    for (const sha of pushedLocalShas(input))
      pushedTrees.push(await treeOf(cwd, sha));
  } catch {
    return { skip: false, reason: 'unknown_tree' };
  }
  return decideCheckSkip({
    force: isForced(process.env),
    cached: await readCheckPass(cwd),
    current: { ...current, node: process.version, pushedTrees },
  });
}

async function prePush(args) {
  const separator = args.indexOf('--');
  const command = separator === -1 ? [] : args.slice(separator + 1);
  if (!command.length) usage('A pre-push command is required after --');
  const skipIfVerified = args
    .slice(0, separator)
    .includes('--skip-if-verified');
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const { tickets, capped, outgoing } = pushTimingTickets(
    ticketSlugsFromSubjects(await subjectsFromPushInput(input, args[0])),
    explicitlySuppliedTickets(),
  );
  if (capped)
    console.warn(
      `[ticket-timing] ${outgoing} outgoing tickets exceeds ${MAX_COHERENT_TICKETS}; not a coherent push, so ${tickets.length ? `recording only KERF_TICKET_TIMING_TICKETS (${tickets.join(', ')})` : 'recording no push-hook timing (set KERF_TICKET_TIMING_TICKETS to attribute it)'}`,
    );
  const decision = skipIfVerified
    ? await checkSkipDecision(input)
    : { skip: false };
  const startedAt = new Date().toISOString();
  let result = { code: 0, signal: null };
  let fields = {};
  if (decision.skip)
    console.log(
      `[pre-push] Skipping \`${command.join(' ')}\`: this exact tree already passed it locally. Set KERF_FORCE_CHECK=1 to run it anyway.`,
    );
  else ({ result, fields } = await runWithSteps(command));
  const finishedAt = new Date().toISOString();
  const { outcome, failure_category } = decision.skip
    ? { outcome: 'skipped' }
    : commandOutcome(result);
  for (const ticket of tickets) {
    try {
      await recordInterval(
        ticket,
        {
          phase: 'push_hook',
          gate: 'root:check',
          started_at: startedAt,
          finished_at: finishedAt,
          ...(failure_category ? { failure_category } : {}),
          ...(decision.skip ? { skip_reason: decision.reason } : {}),
        },
        outcome,
        fields,
      );
    } catch (error) {
      console.warn(
        `[ticket-timing] Could not record ${ticket}: ${error.message}`,
      );
    }
  }
  process.exitCode = decision.skip ? 0 : exitStatus(result);
}

// Hot Sheet leases are owned by hotsheet-cli, which has no hook kerf can
// attach to, so active time is captured by wrapping claim and release.
async function claim(ticket, parsed) {
  if (!parsed.worker) usage('--worker is required');
  await execFileAsync(hotsheet, ['claim', ticket, '--worker', parsed.worker]);
  await start(ticket, {
    phase: 'active',
    gate: parsed.gate ?? 'implementation',
  });
}

async function release(ticket, parsed) {
  if (!parsed.worker) usage('--worker is required');
  const open = summarizeTicketTiming(
    await showTicket(ticket),
  ).in_progress.filter((record) => record.phase === 'active');
  if (open.length === 0)
    console.warn(`[ticket-timing] ${ticket} has no open active session`);
  for (const record of open)
    await finish(ticket, { ...parsed, session: record.session_id });
  await execFileAsync(hotsheet, ['release', ticket, '--worker', parsed.worker]);
}

async function commitExists(sha) {
  try {
    await execFileAsync('git', ['cat-file', '-e', `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

async function importCi(parsed) {
  const limit = Number(parsed.limit ?? 30);
  if (!Number.isInteger(limit) || limit < 2 || limit > 1000)
    usage('--limit must be an integer from 2 to 1000');
  const args = [
    'run',
    'list',
    '--limit',
    String(limit),
    '--json',
    GH_RUN_FIELDS.join(','),
  ];
  if (parsed.branch) args.push('--branch', parsed.branch);
  const { stdout } = await execFileAsync(gh, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  let imported = 0;
  let existing = 0;
  for (const plan of planCiImports(JSON.parse(stdout))) {
    const { record } = plan;
    if (
      !(await commitExists(plan.head_sha)) ||
      !(await commitExists(plan.previous_sha))
    ) {
      console.warn(
        `[ticket-timing] Run ${record.run_id}: commits not available locally; fetch and retry`,
      );
      continue;
    }
    const { stdout: log } = await execFileAsync('git', [
      'log',
      '--format=%s',
      `${plan.previous_sha}..${plan.head_sha}`,
    ]);
    const tickets = ticketSlugsFromSubjects(log.split('\n'));
    if (tickets.length > MAX_TICKETS_PER_RUN) {
      console.warn(
        `[ticket-timing] Run ${record.run_id}: ${tickets.length} tickets exceeds ${MAX_TICKETS_PER_RUN}; not a coherent push, skipped`,
      );
      continue;
    }
    for (const ticket of tickets) {
      try {
        if (
          hasRecordedRun(
            parseTimingRecords(await showTicket(ticket)),
            record.run_id,
          )
        ) {
          existing += 1;
          continue;
        }
        if (parsed.dry_run)
          console.log(
            `${ticket} ${record.phase}/${record.gate} run ${record.run_id} ${record.outcome}`,
          );
        else await append(ticket, record);
        imported += 1;
      } catch (error) {
        console.warn(
          `[ticket-timing] Could not record ${ticket}: ${error.message}`,
        );
      }
    }
  }
  console.log(
    `${parsed.dry_run ? 'Would import' : 'Imported'} ${imported} run interval(s); ${existing} already recorded`,
  );
}

// Reads the store's ticket files directly (read-only) rather than calling
// `hotsheet-cli show` once per ticket.
async function summaryAll(parsed) {
  const threshold =
    parsed.backfill_threshold === undefined
      ? undefined
      : Number(parsed.backfill_threshold);
  if (
    threshold !== undefined &&
    !(Number.isInteger(threshold) && threshold > 0)
  )
    usage('--backfill-threshold must be a positive integer');
  const since = parsed.since ? isoTime(parsed.since, '--since') : undefined;
  const store = await resolveStoreDirectory(process.cwd(), parsed.store);
  const result = aggregateTicketTiming(await readStoreTickets(store), {
    since,
    backfillThreshold: threshold,
    includeBackfill: parsed.include_backfill,
  });
  console.log(
    parsed.json ? JSON.stringify(result, null, 2) : formatAggregate(result),
  );
}

const [action, ticketValue, ...rest] = process.argv.slice(2);
try {
  if (action === 'pre-push') await prePush([ticketValue, ...rest]);
  else if (action === 'import-ci')
    await importCi(
      options([ticketValue, ...rest].filter((value) => value !== undefined)),
    );
  else if (action === 'summary' && ticketValue === '--all')
    await summaryAll(options(rest));
  else {
    if (!action || !ticketValue) usage();
    const ticket = assertTicket(ticketValue);
    const separator = rest.indexOf('--');
    const parsed = options(separator === -1 ? rest : rest.slice(0, separator));
    if (action === 'start') await start(ticket, parsed);
    else if (action === 'finish') await finish(ticket, parsed);
    else if (action === 'run' && separator === -1)
      usage('A command is required after --');
    else if (action === 'run')
      await runTimed(ticket, parsed, rest.slice(separator + 1));
    else if (action === 'record') {
      const outcome = parsed.outcome;
      if (!['passed', 'failed', 'interrupted', 'skipped'].includes(outcome))
        throw new Error(`Invalid outcome: ${outcome}`);
      await recordInterval(ticket, parsed, outcome);
    } else if (action === 'summary') await summary(ticket, parsed.json);
    else if (action === 'claim') await claim(ticket, parsed);
    else if (action === 'release') await release(ticket, parsed);
    else usage(`Unknown action: ${action}`);
  }
} catch (error) {
  console.error(`[ticket-timing] ${error.message}`);
  process.exitCode = 1;
}

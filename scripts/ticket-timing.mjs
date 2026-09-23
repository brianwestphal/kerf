#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { promisify } from 'node:util';

import {
  assertIdentifier,
  assertPhase,
  assertTicket,
  formatTimingRecord,
  isoTime,
  parseTimingRecords,
  summarizeTicketTiming,
  ticketSlugsFromSubjects,
} from './lib/ticket-timing.mjs';

const execFileAsync = promisify(execFile);
const hotsheet = process.env.HOTSHEET_CLI || 'hotsheet-cli';

function usage(message) {
  if (message) console.error(message);
  console.error(`Usage:
  npm run ticket:timing -- start <ticket> --phase <phase> --gate <id>
  npm run ticket:timing -- finish <ticket> --session <uuid> [--outcome passed|failed] [--failure-category <id>]
  npm run ticket:timing -- run <ticket> --phase <phase> --gate <id> [--failure-category <id>] -- <command> [args...]
  npm run ticket:timing -- record <ticket> --phase <phase> --gate <id> --started-at <iso> --finished-at <iso> --outcome passed|failed
  npm run ticket:timing -- summary <ticket> [--json]`);
  process.exit(2);
}

function options(args) {
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith('--')) parsed._.push(value);
    else {
      const name = value.slice(2).replaceAll('-', '_');
      if (name === 'json') parsed.json = true;
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

async function runCommand(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', env: process.env });
  return new Promise((resolve) => {
    child.once('error', () => resolve({ code: 1, signal: null }));
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function recordInterval(ticket, parsed, outcome) {
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
  };
  await append(ticket, record);
}

async function runTimed(ticket, parsed, command) {
  if (command.length === 0) usage('A command is required after --');
  const startedAt = new Date().toISOString();
  const result = await runCommand(command[0], command.slice(1));
  const outcome = result.code === 0 ? 'passed' : 'failed';
  await recordInterval(
    ticket,
    {
      ...parsed,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ...(outcome === 'failed' && !parsed.failure_category
        ? { failure_category: 'command_exit' }
        : {}),
    },
    outcome,
  );
  if (result.signal) {
    console.error(`Command terminated by ${result.signal}`);
    process.exitCode = 1;
  } else process.exitCode = result.code ?? 1;
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
      `${phase}: ${formatDuration(data.duration_ms)} across ${data.attempts} attempt(s), ${data.failures} failure(s)`,
    );
  const failures = Object.entries(result.failure_categories);
  console.log(
    `Failure categories: ${failures.length ? failures.map(([name, count]) => `${name}=${count}`).join(', ') : 'none'}`,
  );
  if (result.in_progress.length)
    console.log(`In progress: ${result.in_progress.length} session(s)`);
}

async function subjectsFromPushInput(input) {
  const subjects = [];
  for (const line of input.trim().split('\n')) {
    if (!line) continue;
    const [, localSha, , remoteSha] = line.split(/\s+/);
    if (!localSha || /^0+$/.test(localSha)) continue;
    const revision =
      remoteSha && !/^0+$/.test(remoteSha)
        ? `${remoteSha}..${localSha}`
        : localSha;
    const { stdout } = await execFileAsync('git', [
      'log',
      '--format=%s',
      revision,
    ]);
    subjects.push(...stdout.trim().split('\n').filter(Boolean));
  }
  return subjects;
}

async function prePush(args) {
  const separator = args.indexOf('--');
  const command = separator === -1 ? [] : args.slice(separator + 1);
  if (!command.length) usage('A pre-push command is required after --');
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const tickets = ticketSlugsFromSubjects(await subjectsFromPushInput(input));
  const startedAt = new Date().toISOString();
  const result = await runCommand(command[0], command.slice(1));
  const finishedAt = new Date().toISOString();
  for (const ticket of tickets) {
    try {
      await recordInterval(
        ticket,
        {
          phase: 'push_hook',
          gate: 'root:check',
          started_at: startedAt,
          finished_at: finishedAt,
          ...(result.code === 0 ? {} : { failure_category: 'command_exit' }),
        },
        result.code === 0 ? 'passed' : 'failed',
      );
    } catch (error) {
      console.warn(
        `[ticket-timing] Could not record ${ticket}: ${error.message}`,
      );
    }
  }
  process.exitCode = result.code ?? 1;
}

const [action, ticketValue, ...rest] = process.argv.slice(2);
try {
  if (action === 'pre-push') await prePush([ticketValue, ...rest]);
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
      if (!['passed', 'failed', 'interrupted'].includes(outcome))
        throw new Error(`Invalid outcome: ${outcome}`);
      await recordInterval(ticket, parsed, outcome);
    } else if (action === 'summary') await summary(ticket, parsed.json);
    else usage(`Unknown action: ${action}`);
  }
} catch (error) {
  console.error(`[ticket-timing] ${error.message}`);
  process.exitCode = 1;
}

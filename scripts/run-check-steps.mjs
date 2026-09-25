#!/usr/bin/env node

// Runs an `a && b && c` npm script one segment at a time, timing each step.
// Semantics match the shell chain: in order, stopping at the first non-zero
// exit, whose status becomes this process's status. When KERF_CHECK_STEP_LOG
// names a file, the step identifiers and durations are written there after
// every step so a caller (the pre-push timing wrapper) can attach them to its
// timing record even when the chain fails or is interrupted part-way.

import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

import { splitCheckChain, stepIdentifiers } from './lib/check-steps.mjs';

const scriptName = process.argv[2];
if (!scriptName) {
  console.error('Usage: node scripts/run-check-steps.mjs <npm-script-name>');
  process.exit(2);
}

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const segments = splitCheckChain(manifest.scripts?.[scriptName]);
const names = stepIdentifiers(segments);
const logPath = process.env.KERF_CHECK_STEP_LOG;
const steps = [];

async function writeLog() {
  if (!logPath) return;
  try {
    await writeFile(logPath, `${JSON.stringify({ steps })}\n`);
  } catch {
    // Timing is advisory; it must never change the gate's result.
  }
}

let current = null;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
  process.on(signal, () => current?.kill(signal));

function run(segment) {
  return new Promise((resolve) => {
    current = spawn(segment, {
      shell: true,
      stdio: 'inherit',
      env: process.env,
    });
    current.once('error', () => resolve({ code: 1, signal: null }));
    current.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

let exitCode = 0;
for (const [index, segment] of segments.entries()) {
  const started = performance.now();
  const result = await run(segment);
  const passed = result.code === 0;
  steps.push({
    name: names[index],
    duration_ms: Math.round(performance.now() - started),
    outcome: passed ? 'passed' : result.signal ? 'interrupted' : 'failed',
  });
  await writeLog();
  if (!passed) {
    exitCode = result.code ?? 1;
    break;
  }
}

const width = Math.max(...steps.map((step) => step.name.length));
console.log('\n[check] step durations');
for (const step of steps)
  console.log(
    `  ${step.name.padEnd(width)}  ${(step.duration_ms / 1000).toFixed(1).padStart(6)}s${step.outcome === 'passed' ? '' : `  ${step.outcome}`}`,
  );
process.exitCode = exitCode;

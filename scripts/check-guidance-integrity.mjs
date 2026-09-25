#!/usr/bin/env node

import { spawn } from 'node:child_process';

import {
  clearCheckPass,
  readCheckEnvironment,
  readWorktreeState,
  sameCheckEnvironment,
  writeCheckPass,
} from './lib/check-pass-cache.mjs';
import {
  changedGuidancePaths,
  snapshotGuidance,
} from './lib/guidance-integrity.mjs';

const separator = process.argv.indexOf('--');
const command = separator === -1 ? [] : process.argv.slice(separator + 1);
// --record-pass: remember the verified tree so the pre-push hook can skip an
// identical rerun (docs/25-ticket-timing.md, "Skipping a repeated check").
const recordPass = process.argv
  .slice(2, separator === -1 ? undefined : separator)
  .includes('--record-pass');

if (command.length === 0) {
  console.error(
    'Usage: node scripts/check-guidance-integrity.mjs [--record-pass] -- <command> [args...]',
  );
  process.exit(2);
}

const root = process.cwd();
// A new run always invalidates the previous pass first, so a failed, partial,
// or interrupted rerun can never leave an earlier verdict standing.
const startState = recordPass ? await readWorktreeState(root) : null;
const startEnvironment = recordPass ? await readCheckEnvironment(root) : null;
if (recordPass) await clearCheckPass(root);
const before = await snapshotGuidance(root);
const child = spawn(command[0], command.slice(1), {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

const outcome = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => resolve({ code, signal }));
});

const after = await snapshotGuidance(root);
const changed = changedGuidancePaths(before, after);

if (changed.length > 0) {
  console.error('\nHot Sheet guidance changed while the check was running:');
  for (const path of changed) console.error(`  - ${path}`);
  console.error(
    'Stop or update the external Hot Sheet config synchronizer, restore the intended guidance, and rerun npm run check.',
  );
  process.exitCode = 1;
} else if (typeof outcome.code === 'number') {
  process.exitCode = outcome.code;
  if (outcome.code === 0 && startState?.clean) {
    const endState = await readWorktreeState(root);
    const endEnvironment = await readCheckEnvironment(root);
    // An install that changed mid-run (npm ci in another terminal) means the
    // verdict covers neither the old install nor the new one.
    if (
      endState.clean &&
      endState.tree === startState.tree &&
      sameCheckEnvironment(startEnvironment, endEnvironment)
    ) {
      try {
        await writeCheckPass(root, endState.tree, endEnvironment);
      } catch (error) {
        console.warn(`Could not record the passing tree: ${error.message}`);
      }
    }
  }
} else {
  console.error(
    `Check command terminated by ${outcome.signal ?? 'an unknown signal'}.`,
  );
  process.exitCode = 1;
}

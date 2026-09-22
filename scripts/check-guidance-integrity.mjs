#!/usr/bin/env node

import { spawn } from 'node:child_process';

import {
  changedGuidancePaths,
  snapshotGuidance,
} from './lib/guidance-integrity.mjs';

const separator = process.argv.indexOf('--');
const command = separator === -1 ? [] : process.argv.slice(separator + 1);

if (command.length === 0) {
  console.error(
    'Usage: node scripts/check-guidance-integrity.mjs -- <command> [args...]',
  );
  process.exit(2);
}

const root = process.cwd();
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
} else {
  console.error(
    `Check command terminated by ${outcome.signal ?? 'an unknown signal'}.`,
  );
  process.exitCode = 1;
}

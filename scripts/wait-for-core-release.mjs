#!/usr/bin/env node
// Usage: node scripts/wait-for-core-release.mjs <version>
//
// Run by the dependent release workflows before their npm publish job so
// kerfjs@<version> is always on npm first. With GITHUB_TOKEN,
// GITHUB_REPOSITORY, and GITHUB_SHA set (as in Actions), it also watches the
// core release.yml run for the same commit and fails fast if that run fails.
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import {
  latestRunConclusion,
  waitForCoreRelease,
} from './lib/wait-for-core-release.mjs';

const version = process.argv[2];
if (!version) {
  console.error('usage: node scripts/wait-for-core-release.mjs <version>');
  process.exit(1);
}

const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA } = process.env;

// A network error reads as "not yet": the poll retries until the timeout.
async function isPublished(target) {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/kerfjs/${encodeURIComponent(target)}`,
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function coreRunConclusion() {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_SHA) return null;
  // An API hiccup must not fail the release; the registry poll still decides.
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/release.yml/runs?event=push&head_sha=${GITHUB_SHA}`,
      {
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      },
    );
    if (!response.ok) return null;
    const body = await response.json();
    return latestRunConclusion(body.workflow_runs ?? []);
  } catch {
    return null;
  }
}

try {
  await waitForCoreRelease({
    version,
    isPublished,
    coreRunConclusion,
    sleep: (ms) => delay(ms),
    now: () => Date.now(),
    timeoutMs: 90 * 60_000,
    intervalMs: 20_000,
    log: (message) => console.log(message),
  });
} catch (error) {
  console.error(`[wait-for-core-release] ${error.message}`);
  process.exit(1);
}

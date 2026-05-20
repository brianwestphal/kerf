#!/usr/bin/env node
/**
 * KF-215: regenerate the `ai/` bundle (skill.md, cursorrules, manifest.json)
 * from the repo-root source-of-truth files (kerf.claude-skill.md,
 * kerf.cursorrules). Run after editing either source file, or after a kerfjs
 * version bump. The in-sync gate (`check-ai-bundle.mjs`) verifies you didn't
 * forget.
 *
 * Usage:
 *   node scripts/sync-ai-bundle.mjs
 *
 * See `docs/12-ai-assistant-configs.md`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { computeBundle, REPO_ROOT } from './lib/ai-bundle.mjs';

const outputs = computeBundle();
for (const { path, content } of outputs) {
  const abs = join(REPO_ROOT, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  console.log(`wrote ${path}`);
}
console.log(`\nai/ bundle regenerated (${outputs.length} files).`);

#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Move hand-curated Unreleased content into the stable release entry. */
export function updateReleaseChangelog(source, version, notes, date) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error('Expected a stable version and YYYY-MM-DD date');
  if (
    new RegExp(`^## \\[${version.replaceAll('.', '\\.')}\\]`, 'm').test(source)
  )
    throw new Error(`CHANGELOG.md already has a ${version} entry`);

  const heading = '## [Unreleased]';
  const start = source.indexOf(heading);
  if (start < 0 || (start > 0 && source[start - 1] !== '\n'))
    throw new Error('CHANGELOG.md has no Unreleased section');
  const bodyStart = start + heading.length;
  const next = source.slice(bodyStart).match(/^## \[/m);
  if (!next || next.index === undefined)
    throw new Error('CHANGELOG.md has no previous release heading');
  const nextStart = bodyStart + next.index;
  const carried = source.slice(bodyStart, nextStart).trim();
  const draft = notes.trim();
  const noChanges = /^_No changes in `[^`]+`\._$/.test(draft);
  const carriedLines = new Set(carried.split('\n').map((line) => line.trim()));
  const draftAlreadyCarried =
    Boolean(carried) &&
    draft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .every((line) => carriedLines.has(line));
  const fresh = (noChanges && carried) || draftAlreadyCarried ? '' : draft;
  const releaseBody = [carried, fresh].filter(Boolean).join('\n\n');
  if (!releaseBody) throw new Error('Release entry would be empty');

  const before = source.slice(0, start).trimEnd();
  const after = source.slice(nextStart).trimStart();
  return `${before}\n\n${heading}\n\n## [${version}] - ${date}\n\n${releaseBody}\n\n${after}`;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [, , version, notes, date, file = 'CHANGELOG.md'] = process.argv;
  const path = resolve(file);
  const updated = updateReleaseChangelog(
    readFileSync(path, 'utf8'),
    version,
    notes,
    date,
  );
  writeFileSync(path, updated);
  console.log(`[update-release-changelog] wrote ${version} to ${file}`);
}

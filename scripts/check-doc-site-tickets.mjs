#!/usr/bin/env node
/**
 * KF-433: fail the gate when a Hot Sheet ticket marker (`KF-<digits>`) reaches
 * a surface the site publishes. Hot Sheet is local-only, so a bare ticket
 * number is unlookable for every site reader; the CLAUDE.md convention bans
 * them from published pages. That convention was enforced only by reviewer
 * memory until now, which is how 18 markers accumulated on the dev-warnings
 * page before anyone noticed.
 *
 * What it scans:
 *  - Every `docs/*.md` that `site/scripts/sync-docs.mjs` publishes — the list
 *    is IMPORTED from that script's `MAP`, so a doc added to the sync map is
 *    covered automatically without touching this file.
 *  - Every `.md` / `.mdx` under `site/src/content/docs/` — the hand-authored
 *    site pages plus the generated copies of the docs above (gitignored, and
 *    simply absent on a fresh clone, which is fine).
 *
 * The scan is whole-file: prose, HTML comments, and fenced code blocks all
 * count, because Starlight renders all three.
 *
 * Run via:
 *   node scripts/check-doc-site-tickets.mjs
 *
 * Wired into `npm run check`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MAP } from '../site/scripts/sync-docs.mjs';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE_DOCS_DIR = join(REPO_ROOT, 'site/src/content/docs');
const MARKDOWN_RE = /\.mdx?$/;
const TICKET_RE = /\bKF-\d+/g;

function walkMarkdown(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    // Generated Starlight copies are gitignored — absent on a fresh clone.
    return out;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walkMarkdown(path, out);
    } else if (MARKDOWN_RE.test(name)) {
      out.push(path);
    }
  }
  return out;
}

function publishedSourceDocs() {
  return Object.entries(MAP)
    .filter(([, cfg]) => cfg.target)
    .map(([srcName]) => join(REPO_ROOT, 'docs', srcName));
}

function findMarkers(path) {
  const hits = [];
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const found = line.match(TICKET_RE);
    if (found) hits.push({ line: i + 1, text: line.trim(), markers: [...new Set(found)] });
  });
  return hits;
}

function main() {
  const files = [...publishedSourceDocs(), ...walkMarkdown(SITE_DOCS_DIR)].sort();

  const offenders = [];
  for (const path of files) {
    const hits = findMarkers(path);
    if (hits.length > 0) offenders.push({ path: relative(REPO_ROOT, path), hits });
  }

  if (offenders.length === 0) {
    process.exit(0);
  }

  const total = offenders.reduce((n, o) => n + o.hits.length, 0);
  console.error(
    `\n${total} Hot Sheet ticket marker${total === 1 ? '' : 's'} found on published site surfaces:\n`,
  );
  for (const { path, hits } of offenders) {
    console.error(`  ${path}`);
    for (const { line, text, markers } of hits) {
      const snippet = text.length > 100 ? `${text.slice(0, 97)}...` : text;
      console.error(`    ${line}: [${markers.join(', ')}] ${snippet}`);
    }
  }
  console.error(
    '\nHot Sheet is local-only, so a bare KF-NN is unlookable for a site reader.\n'
    + 'Replace each marker with the self-contained summary it stands for (usually\n'
    + 'the surrounding prose already says it, so the marker is a straight deletion).\n'
    + 'If the offender is a generated file under site/src/content/docs/, fix the\n'
    + 'source doc and re-run `node site/scripts/sync-docs.mjs`.\n',
  );
  process.exit(1);
}

main();

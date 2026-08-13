#!/usr/bin/env node
/**
 * KF-458: keep the version-pinned CDN URLs in the docs on the current major.
 *
 * The no-build / CDN quickstart (docs 6 §6.11.1, mirrored in the README and the
 * AI usage guide) shows `import … from 'https://esm.sh/kerfjs@4'`,
 * `cdn.jsdelivr.net/npm/kerfjs@4/+esm`, `unpkg.com/kerfjs@4?module`, and an
 * importmap that maps `@preact/signals-core@1`. Those pins are hardcoded — nothing
 * ties them to `package.json`, so after a MAJOR release they silently point one
 * major behind until someone edits them by hand. That is the exact drift class the
 * size / api-signature gates already guard against elsewhere.
 *
 * Major-only pins (`kerfjs@4`) resolve to the latest of that major, so they stay
 * correct across every minor/patch and only need a touch at a major bump — which is
 * precisely the boundary this gate catches. An exact pin used illustratively
 * (`kerfjs@4.1.0` in the "for reproducibility" note) is fine too: the check is on the
 * MAJOR, so it passes until the major moves and then correctly demands an update.
 *
 * What it asserts, over the SOURCE docs only (the Starlight copies are regenerated
 * from these by `sync-docs.mjs`, so the source is the single place to fix):
 *  - every `kerfjs@<version>` reference is on `package.json`'s major, and
 *  - every `@preact/signals-core@<version>` reference is on the major of the
 *    `@preact/signals-core` range in `package.json`'s `dependencies`.
 *
 * Run via:
 *   node scripts/check-cdn-versions.mjs
 *
 * Wired into `npm run check`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Source docs that carry pinned CDN URLs. The site copies under
// site/src/content/docs/ are generated from docs/*.md by sync-docs.mjs, so
// fixing the source and re-syncing is the whole workflow — we scan source only.
const SCANNED = ['README.md', 'docs/6-jsx-runtime.md', 'docs/ai/usage-guide.md'];

// A pinned reference is `<pkg>@<major>[.<minor>.<patch>][-tag]`. We only care
// about the major. `\bkerfjs@` will not match `kerf-component@` or a bare
// `eslint-plugin-kerfjs` (no trailing `@version`).
const KERF_RE = /\bkerfjs@(\d+)(?:\.\d+){0,2}(?:-[\w.]+)?/g;
const SIGNALS_RE = /@preact\/signals-core@(\d+)(?:\.\d+){0,2}(?:-[\w.]+)?/g;

function majorOf(range) {
  // Strip a leading ^ / ~ / >= etc.; take the first numeric segment.
  const m = String(range).match(/(\d+)\./);
  return m ? m[1] : null;
}

function main() {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  const kerfMajor = majorOf(pkg.version);
  const signalsMajor = majorOf(pkg.dependencies?.['@preact/signals-core'] ?? '');

  if (kerfMajor === null || signalsMajor === null) {
    console.error(
      `[check-cdn-versions] could not read a major from package.json `
      + `(version=${pkg.version}, @preact/signals-core=${pkg.dependencies?.['@preact/signals-core']}).`,
    );
    process.exit(1);
  }

  const offenders = [];
  let kerfHits = 0;

  for (const rel of SCANNED) {
    const lines = readFileSync(join(REPO_ROOT, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(KERF_RE)) {
        kerfHits++;
        if (m[1] !== kerfMajor) {
          offenders.push({ rel, line: i + 1, found: m[0], want: `kerfjs@${kerfMajor}`, text: line.trim() });
        }
      }
      for (const m of line.matchAll(SIGNALS_RE)) {
        if (m[1] !== signalsMajor) {
          offenders.push({
            rel,
            line: i + 1,
            found: m[0],
            want: `@preact/signals-core@${signalsMajor}`,
            text: line.trim(),
          });
        }
      }
    });
  }

  // Defensive floor: if the regex found no kerfjs@ pins at all, a scanned file
  // was moved/renamed or the URL shape changed — the gate is guarding nothing.
  // Fail loudly rather than pass vacuously.
  if (kerfHits === 0) {
    console.error(
      `[check-cdn-versions] found no \`kerfjs@<version>\` CDN pins in [${SCANNED.join(', ')}]. `
      + `A file moved or the URL shape changed — update SCANNED in this script.`,
    );
    process.exit(1);
  }

  if (offenders.length === 0) {
    console.log(
      `[check-cdn-versions] OK — ${kerfHits} kerfjs@ CDN pin(s) on major ${kerfMajor}; `
      + `signals-core pins on major ${signalsMajor}.`,
    );
    process.exit(0);
  }

  console.error(`\n${offenders.length} stale CDN version pin(s) — the docs point at the wrong major:\n`);
  for (const { rel, line, found, want, text } of offenders) {
    const snippet = text.length > 100 ? `${text.slice(0, 97)}...` : text;
    console.error(`  ${rel}:${line}`);
    console.error(`    found "${found}" — expected major matching "${want}"`);
    console.error(`    ${snippet}`);
  }
  console.error(
    `\nBump the pins to the current major, then re-run \`node site/scripts/sync-docs.mjs\`\n`
    + `so the generated site copies follow. See docs/6-jsx-runtime.md §6.11.1.\n`,
  );
  process.exit(1);
}

main();

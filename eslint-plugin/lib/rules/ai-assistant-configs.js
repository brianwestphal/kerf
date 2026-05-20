/**
 * Check that the kerf-app Claude Code skill / Cursor rules are installed and
 * up-to-date against the canonical files bundled inside the consumer's
 * installed `kerfjs` package (`node_modules/kerfjs/ai/manifest.json`).
 *
 * Implements §12.4 of kerf's `docs/12-ai-assistant-configs.md`. On
 * `eslint --fix`, replaces only the canonical section above the
 * `KERF-APP-CANONICAL-END` marker; the consumer's append zone below the
 * marker is preserved byte-for-byte (the "option 2" strategy from KF-217).
 *
 * Unusual for an ESLint rule: the `fix()` callback writes to a file
 * OTHER than the linted source. ESLint only invokes `fix()` when
 * `--fix` is enabled, so the side effect is opt-in by definition.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const MARKER = '<!-- KERF-APP-CANONICAL-END · your customizations below -->';
const VERSION_RE = /kerf-skill-version:\s*(\d+\.\d+\.\d+(?:-[\w.]+)?)/;
const VERSION_SCAN_BYTES = 512;

// Module-level once-per-lint-run guard. ESLint instantiates the rule
// per-file; we do the project-level filesystem check the first time the
// `Program` visitor runs and cache the result for the remaining files in
// the same lint pass.
let CHECKED = false;
let CACHED_RESULT = null;

export function _resetForTests() {
  CHECKED = false;
  CACHED_RESULT = null;
}

function resolveManifestPath(cwd) {
  try {
    // `createRequire` from a path inside cwd resolves npm deps from there.
    const req = createRequire(join(cwd, 'noop.js'));
    return req.resolve('kerfjs/ai/manifest.json');
  } catch {
    return null;
  }
}

function compareSemver(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

function findMarkerIndex(text) {
  const first = text.indexOf(MARKER);
  if (first === -1) return -1;
  const second = text.indexOf(MARKER, first + MARKER.length);
  if (second !== -1) return -2; // sentinel for "multiple markers"
  return first;
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function extractVersion(text) {
  const m = text.slice(0, VERSION_SCAN_BYTES).match(VERSION_RE);
  return m ? m[1] : null;
}

function canonicalEndOffset(text) {
  const idx = findMarkerIndex(text);
  if (idx < 0) return idx;
  // Include the marker line + the trailing newline. If the file ends
  // exactly at the marker (no newline), use end-of-file.
  const lineEnd = idx + MARKER.length;
  if (text.length > lineEnd && text[lineEnd] === '\n') return lineEnd + 1;
  return lineEnd;
}

/**
 * Classify a single bundled file against the consumer's local copy.
 * Returns one of: { state: 'missing' }, { state: 'ok' },
 * { state: 'stale', consumerVersion, bundledVersion, appendZone },
 * { state: 'forked', reason }.
 *
 * Exported for tests.
 */
export function classifyFile(file, bundleDir, cwd) {
  const destAbs = join(cwd, file.dest);
  let consumer;
  try {
    consumer = readFileSync(destAbs, 'utf8');
  } catch {
    return { state: 'missing' };
  }

  const markerIdx = findMarkerIndex(consumer);
  if (markerIdx === -1) return { state: 'forked', reason: 'no canonical-end marker' };
  if (markerIdx === -2) return { state: 'forked', reason: 'multiple canonical-end markers' };

  const canonicalEnd = canonicalEndOffset(consumer);
  const consumerCanonical = consumer.slice(0, canonicalEnd);
  const appendZone = consumer.slice(canonicalEnd);

  const consumerVersion = extractVersion(consumer);
  if (!consumerVersion) {
    return { state: 'forked', reason: 'no `kerf-skill-version` line' };
  }

  const cmp = compareSemver(consumerVersion, file.version);
  if (cmp === 0) {
    // Same version. Above-marker section should match the bundled sha256.
    if (sha256(consumerCanonical) === file.sha256) return { state: 'ok' };
    return { state: 'forked', reason: 'content above marker has been edited' };
  }
  if (cmp < 0) {
    return {
      state: 'stale',
      consumerVersion,
      bundledVersion: file.version,
      appendZone,
    };
  }
  // consumer is newer than bundled — treat as ok (consumer is ahead of installed kerfjs).
  return { state: 'ok' };
}

function loadBundle(cwd) {
  const manifestPath = resolveManifestPath(cwd);
  if (!manifestPath) return null;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
  if (!manifest || !Array.isArray(manifest.files)) return null;
  const bundleDir = dirname(manifestPath);
  return { manifest, bundleDir };
}

function isTriggered(name, cwd) {
  if (name === 'skill') return existsSync(join(cwd, '.claude'));
  if (name === 'cursorrules') {
    return existsSync(join(cwd, '.cursorrules')) || existsSync(join(cwd, '.cursor'));
  }
  return false;
}

/**
 * Run the project-level check. Exported for tests; the rule wraps this
 * with a once-per-lint-run guard.
 */
export function runCheck(cwd) {
  const bundle = loadBundle(cwd);
  if (!bundle) return null;
  const results = [];
  for (const file of bundle.manifest.files) {
    if (!isTriggered(file.name, cwd)) continue;
    results.push({ file, result: classifyFile(file, bundle.bundleDir, cwd) });
  }
  return { results, bundleDir: bundle.bundleDir };
}

/**
 * Apply the `--fix` for one file: write the bundled canonical to the
 * consumer's `dest`, appending the consumer's existing append-zone (if
 * any). Exported for tests.
 */
export function applyFix(file, bundleDir, cwd, appendZone) {
  const bundlePath = join(bundleDir, file.bundle.replace(/^ai\//, ''));
  const canonical = readFileSync(bundlePath, 'utf8');
  const dest = join(cwd, file.dest);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, canonical + (appendZone || ''));
}

const meta = {
  type: 'suggestion',
  docs: {
    description:
      'Check that the kerf-app Claude Code skill / Cursor rules are installed and up-to-date against the canonical files bundled in `kerfjs/ai/`.',
    url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ai-assistant-configs.md',
  },
  schema: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        claude: { type: 'boolean' },
        cursor: { type: 'boolean' },
      },
    },
  ],
  messages: {
    missing:
      '{{tool}} drop-in is missing at `{{dest}}`. Run `eslint --fix` to install the bundled `kerfjs/{{bundle}}`. See docs/12-ai-assistant-configs.md.',
    stale:
      '{{tool}} drop-in at `{{dest}}` is stale (have {{consumerVersion}}, latest is {{bundledVersion}}). Run `eslint --fix` to update the canonical section above the `KERF-APP-CANONICAL-END` marker; your customizations below the marker are preserved.',
    forked:
      '{{tool}} drop-in at `{{dest}}` is forked: {{reason}}. Restore the canonical layout (one `KERF-APP-CANONICAL-END` marker, no edits above it) or disable this rule with `\'kerfjs/ai-assistant-configs\': \'off\'`.',
  },
  // Mark as fixable so ESLint runs the `fix()` callback under `--fix`.
  // The callback writes to a separate file and returns null, so ESLint
  // applies no edit to the linted source itself — see file header.
  fixable: 'code',
};

function create(context) {
  return {
    Program(node) {
      if (CHECKED) return;
      CHECKED = true;
      const options = context.options[0] || {};
      const claudeEnabled = options.claude !== false;
      const cursorEnabled = options.cursor !== false;
      // ESLint v9: `context.cwd` is a string. ESLint v8: `context.getCwd()`.
      const cwd =
        (typeof context.cwd === 'string' && context.cwd)
        || (typeof context.getCwd === 'function' && context.getCwd())
        || process.cwd();
      const checked = runCheck(cwd);
      CACHED_RESULT = checked;
      if (!checked) return;

      for (const { file, result } of checked.results) {
        if (file.name === 'skill' && !claudeEnabled) continue;
        if (file.name === 'cursorrules' && !cursorEnabled) continue;
        if (result.state === 'ok') continue;

        const tool = file.name === 'skill' ? 'Claude Code kerf-app skill' : 'Cursor kerf rules';
        const bundle = file.bundle; // e.g. 'ai/skill.md'
        const data = { tool, dest: file.dest, bundle };

        if (result.state === 'missing') {
          context.report({
            node,
            messageId: 'missing',
            data,
            fix() {
              applyFix(file, checked.bundleDir, cwd, '');
              return null;
            },
          });
        } else if (result.state === 'stale') {
          context.report({
            node,
            messageId: 'stale',
            data: {
              ...data,
              consumerVersion: result.consumerVersion,
              bundledVersion: result.bundledVersion,
            },
            fix() {
              applyFix(file, checked.bundleDir, cwd, result.appendZone);
              return null;
            },
          });
        } else if (result.state === 'forked') {
          context.report({
            node,
            messageId: 'forked',
            data: { ...data, reason: result.reason },
          });
        }
      }
    },
  };
}

export default { meta, create };

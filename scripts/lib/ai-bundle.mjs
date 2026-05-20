/**
 * Shared logic for the AI-bundle scripts (sync + check). The kerfjs npm
 * package ships `ai/skill.md` / `ai/cursorrules` / `ai/manifest.json` as
 * generated mirrors of the repo-root source-of-truth files. The sync
 * script regenerates the mirror; the check script verifies the mirror
 * is in sync with the source. See `docs/12-ai-assistant-configs.md`.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

export const FILES = [
  {
    name: 'skill',
    source: 'kerf.claude-skill.md',
    bundle: 'ai/skill.md',
    dest: '.claude/skills/kerf-app/SKILL.md',
  },
  {
    name: 'cursorrules',
    source: 'kerf.cursorrules',
    bundle: 'ai/cursorrules',
    dest: '.cursorrules',
  },
];

export const MARKER = '<!-- KERF-APP-CANONICAL-END · your customizations below -->';
const VERSION_RE = /kerf-skill-version:\s*(\d+\.\d+\.\d+(?:-[\w.]+)?)/;

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

function extractVersion(source, path) {
  const head = source.slice(0, 512);
  const m = head.match(VERSION_RE);
  if (!m) {
    throw new Error(
      `${path}: missing 'kerf-skill-version: <semver>' line in the first 512 bytes. `
      + `Add it inside the file's frontmatter (.md) or as an HTML comment at the top (.cursorrules).`,
    );
  }
  return m[1];
}

function canonicalSection(source, path) {
  const idx = source.indexOf(MARKER);
  if (idx === -1) {
    throw new Error(
      `${path}: missing canonical-section marker. Append this line to the source file: ${MARKER}`,
    );
  }
  // Include the marker line itself; the consumer's append zone begins on the next line.
  const end = idx + MARKER.length;
  return source.slice(0, end) + '\n';
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Produce the bundled outputs as strings + the manifest object, deterministically
 * from the repo-root source files. No filesystem writes happen here — callers
 * (sync, check) decide what to do with the result.
 */
export function computeBundle() {
  const kerfjsVersion = readPackageVersion();
  const outputs = [];
  const manifestFiles = [];
  for (const f of FILES) {
    const sourcePath = join(REPO_ROOT, f.source);
    const source = readFileSync(sourcePath, 'utf8');
    const version = extractVersion(source, f.source);
    const canonical = canonicalSection(source, f.source);
    const bundleContent = canonical;
    outputs.push({ path: f.bundle, content: bundleContent });
    manifestFiles.push({
      name: f.name,
      source: f.source,
      bundle: f.bundle,
      dest: f.dest,
      version,
      sha256: sha256(canonical),
    });
  }
  const manifest = { kerfjsVersion, files: manifestFiles };
  const manifestContent = JSON.stringify(manifest, null, 2) + '\n';
  outputs.push({ path: 'ai/manifest.json', content: manifestContent });
  return outputs;
}

/**
 * Filesystem-driven tests for `kerfjs/ai-assistant-configs`.
 *
 * The rule reports based on what's on disk (`.claude/` presence, the
 * consumer's drop-in file content, the bundled manifest), so the
 * standard ESLint `RuleTester` (which doesn't simulate the filesystem)
 * isn't a good fit. Instead these tests build a temp project root with
 * fixture files and drive the rule's classifier directly. The shape of
 * the data the classifier returns IS the shape the rule reports on, so
 * we can assert state transitions without spinning up ESLint.
 */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { _resetForTests, applyFix, classifyFile, runCheck } from '../../lib/rules/ai-assistant-configs.js';

const MARKER = '<!-- KERF-APP-CANONICAL-END · your customizations below -->';

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function makeSkillBody(version) {
  return (
    `---\n`
    + `name: kerf-app\n`
    + `kerf-skill-version: ${version}\n`
    + `---\n`
    + `\n`
    + `# Building apps with kerf\n`
    + `\n`
    + `Canonical body for ${version}.\n`
    + `\n`
    + `${MARKER}\n`
  );
}

function makeCursorrulesBody(version) {
  return (
    `<!-- kerf-skill-version: ${version} -->\n`
    + `# kerf.cursorrules\n`
    + `\n`
    + `Canonical body for ${version}.\n`
    + `\n`
    + `${MARKER}\n`
  );
}

/**
 * Build a temp project that looks like a real consumer: node_modules/kerfjs/ai/
 * with the bundle files, an optional `.claude/` and `.cursorrules`, and a
 * `package.json` for require.resolve traversal.
 */
function setupProject({ skillVersion = '1.0.0', cursorVersion = '1.0.0', withClaude = false, withCursor = false, skillBody, cursorBody } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'kerf-ai-test-'));

  // Consumer's package.json (any content; require.resolve needs the dir to look like a project).
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }) + '\n');

  // Build the bundled kerfjs at node_modules/kerfjs/ai/.
  const bundledSkill = makeSkillBody(skillVersion);
  const bundledCursor = makeCursorrulesBody(cursorVersion);
  const aiDir = join(root, 'node_modules', 'kerfjs', 'ai');
  mkdirSync(aiDir, { recursive: true });
  writeFileSync(join(aiDir, 'skill.md'), bundledSkill);
  writeFileSync(join(aiDir, 'cursorrules'), bundledCursor);
  const manifest = {
    kerfjsVersion: '0.8.2',
    files: [
      {
        name: 'skill',
        source: 'kerf.claude-skill.md',
        bundle: 'ai/skill.md',
        dest: '.claude/skills/kerf-app/SKILL.md',
        version: skillVersion,
        sha256: sha256(bundledSkill),
      },
      {
        name: 'cursorrules',
        source: 'kerf.cursorrules',
        bundle: 'ai/cursorrules',
        dest: '.cursorrules',
        version: cursorVersion,
        sha256: sha256(bundledCursor),
      },
    ],
  };
  writeFileSync(join(aiDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  // kerfjs needs a package.json so `require.resolve('kerfjs/ai/manifest.json')`
  // can find it under the node_modules/kerfjs root. Default fixture has no
  // `exports` field, so all paths are accessible — separate fallback test
  // installs a fixture with restrictive `exports` to exercise the
  // ERR_PACKAGE_PATH_NOT_EXPORTED → direct-path-lookup branch.
  writeFileSync(
    join(root, 'node_modules', 'kerfjs', 'package.json'),
    JSON.stringify({ name: 'kerfjs', version: '0.8.2', main: 'index.js' }) + '\n',
  );

  if (withClaude) {
    mkdirSync(join(root, '.claude'), { recursive: true });
    if (skillBody !== undefined) {
      const dest = join(root, '.claude', 'skills', 'kerf-app', 'SKILL.md');
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, skillBody);
    }
  }
  if (withCursor) {
    if (cursorBody === undefined) {
      // Use sentinel cursor marker — empty .cursor/ dir is enough to trigger.
      mkdirSync(join(root, '.cursor'), { recursive: true });
    } else {
      writeFileSync(join(root, '.cursorrules'), cursorBody);
    }
  }

  return { root, manifest, bundledSkill, bundledCursor };
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

test('missing — .claude/ exists but no SKILL.md installed', () => {
  _resetForTests();
  const { root, manifest } = setupProject({ withClaude: true });
  try {
    const checked = runCheck(root);
    assert.ok(checked, 'expected runCheck to resolve manifest');
    const skillResult = checked.results.find((r) => r.file.name === 'skill');
    assert.ok(skillResult, 'skill should be triggered when .claude/ exists');
    assert.equal(skillResult.result.state, 'missing');
    // Cursor file should NOT be triggered (no .cursor* present).
    const cursorResult = checked.results.find((r) => r.file.name === 'cursorrules');
    assert.equal(cursorResult, undefined);
    void manifest;
  } finally {
    cleanup(root);
  }
});

test('ok — consumer file matches bundled version + sha256', () => {
  _resetForTests();
  const skill = makeSkillBody('1.0.0');
  const { root } = setupProject({ withClaude: true, skillBody: skill });
  try {
    const checked = runCheck(root);
    const result = checked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(result.state, 'ok');
  } finally {
    cleanup(root);
  }
});

test('stale — consumer version is behind bundle, append zone preserved', () => {
  _resetForTests();
  const consumerSkill = makeSkillBody('1.0.0') + '\n## My customizations\n\nKeep me!\n';
  const { root } = setupProject({
    skillVersion: '1.1.0',
    withClaude: true,
    skillBody: consumerSkill,
  });
  try {
    const checked = runCheck(root);
    const result = checked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(result.state, 'stale');
    assert.equal(result.consumerVersion, '1.0.0');
    assert.equal(result.bundledVersion, '1.1.0');
    assert.equal(result.appendZone, '\n## My customizations\n\nKeep me!\n');
  } finally {
    cleanup(root);
  }
});

test('forked — content above marker has been edited', () => {
  _resetForTests();
  // Same version line, but the body text differs from the bundled file.
  const consumerSkill = makeSkillBody('1.0.0').replace('Canonical body', 'EDITED body');
  const { root } = setupProject({ withClaude: true, skillBody: consumerSkill });
  try {
    const checked = runCheck(root);
    const result = checked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(result.state, 'forked');
    assert.match(result.reason, /above marker/);
  } finally {
    cleanup(root);
  }
});

test('forked — marker is missing', () => {
  _resetForTests();
  const consumerSkill = makeSkillBody('1.0.0').replace(MARKER + '\n', '');
  const { root } = setupProject({ withClaude: true, skillBody: consumerSkill });
  try {
    const checked = runCheck(root);
    const result = checked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(result.state, 'forked');
    assert.match(result.reason, /marker/);
  } finally {
    cleanup(root);
  }
});

test('forked — multiple markers', () => {
  _resetForTests();
  const consumerSkill = makeSkillBody('1.0.0') + `\n${MARKER}\nstray dupe\n`;
  const { root } = setupProject({ withClaude: true, skillBody: consumerSkill });
  try {
    const checked = runCheck(root);
    const result = checked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(result.state, 'forked');
    assert.match(result.reason, /multiple/);
  } finally {
    cleanup(root);
  }
});

test('forked — no kerf-skill-version line', () => {
  _resetForTests();
  const consumerSkill = makeSkillBody('1.0.0').replace(/kerf-skill-version:.*\n/, '');
  const { root } = setupProject({ withClaude: true, skillBody: consumerSkill });
  try {
    const checked = runCheck(root);
    const result = checked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(result.state, 'forked');
    assert.match(result.reason, /version/);
  } finally {
    cleanup(root);
  }
});

test('silent — neither .claude/ nor .cursor* present (untriggered)', () => {
  _resetForTests();
  const { root } = setupProject({});
  try {
    const checked = runCheck(root);
    assert.ok(checked);
    assert.deepEqual(checked.results, []);
  } finally {
    cleanup(root);
  }
});

test('cursor — .cursorrules file triggers the cursorrules check', () => {
  _resetForTests();
  const { root } = setupProject({ withCursor: true, cursorBody: makeCursorrulesBody('1.0.0') });
  try {
    const checked = runCheck(root);
    const cursorResult = checked.results.find((r) => r.file.name === 'cursorrules');
    assert.ok(cursorResult);
    assert.equal(cursorResult.result.state, 'ok');
  } finally {
    cleanup(root);
  }
});

test('runCheck returns null when kerfjs is not installed', () => {
  _resetForTests();
  const root = mkdtempSync(join(tmpdir(), 'kerf-ai-test-no-kerf-'));
  writeFileSync(join(root, 'package.json'), '{}');
  mkdirSync(join(root, '.claude'));
  try {
    const checked = runCheck(root);
    assert.equal(checked, null);
  } finally {
    cleanup(root);
  }
});

test('classifyFile — consumer ahead of bundle is treated as ok', () => {
  _resetForTests();
  // Bundle at 1.0.0, consumer at 1.1.0.
  const consumerSkill = makeSkillBody('1.1.0');
  const { root } = setupProject({ withClaude: true, skillBody: consumerSkill });
  try {
    const checked = runCheck(root);
    const result = checked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(result.state, 'ok');
  } finally {
    cleanup(root);
  }
});

test('applyFix — missing file is created with parent dirs', () => {
  _resetForTests();
  const { root, manifest } = setupProject({ withClaude: true });
  try {
    const file = manifest.files.find((f) => f.name === 'skill');
    const bundleDir = join(root, 'node_modules', 'kerfjs', 'ai');
    const destAbs = join(root, file.dest);
    assert.equal(existsSync(destAbs), false);
    applyFix(file, bundleDir, root, '');
    assert.equal(existsSync(destAbs), true);
    // Re-classify: should now be ok.
    const checked = runCheck(root);
    _resetForTests();
    const result = checked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(result.state, 'ok');
  } finally {
    cleanup(root);
  }
});

test('applyFix — stale file is updated, append zone preserved verbatim', () => {
  _resetForTests();
  const APPEND = '\n## My customizations\n\nDO NOT TOUCH.\n';
  const consumerSkill = makeSkillBody('1.0.0') + APPEND;
  const { root, manifest } = setupProject({
    skillVersion: '1.1.0',
    withClaude: true,
    skillBody: consumerSkill,
  });
  try {
    const file = manifest.files.find((f) => f.name === 'skill');
    const bundleDir = join(root, 'node_modules', 'kerfjs', 'ai');
    const destAbs = join(root, file.dest);

    // Sanity: before fix, classifier says stale and gives us the appendZone.
    const beforeChecked = runCheck(root);
    _resetForTests();
    const before = beforeChecked.results.find((r) => r.file.name === 'skill').result;
    assert.equal(before.state, 'stale');
    assert.equal(before.appendZone, APPEND);

    applyFix(file, bundleDir, root, before.appendZone);

    const after = readFileSync(destAbs, 'utf8');
    assert.ok(after.includes('kerf-skill-version: 1.1.0'), 'canonical was upgraded');
    assert.ok(after.endsWith(APPEND), 'append zone preserved verbatim');

    // Re-classify: should now be ok.
    const checked = runCheck(root);
    _resetForTests();
    assert.equal(
      checked.results.find((r) => r.file.name === 'skill').result.state,
      'ok',
    );
  } finally {
    cleanup(root);
  }
});

// Direct unit test of classifyFile so future refactors don't accidentally
// change its return shape contract.
test('fallback — runCheck still resolves manifest when kerfjs package.json has restrictive exports that block `./ai/*`', () => {
  _resetForTests();
  const { root } = setupProject({ withClaude: true });
  // Overwrite the fixture's kerfjs package.json with a restrictive `exports`
  // field — mirrors the real published kerfjs 0.9.1 layout that triggered
  // ERR_PACKAGE_PATH_NOT_EXPORTED in glassbox and caused the rule to silently
  // no-op. The fallback path-lookup should kick in.
  writeFileSync(
    join(root, 'node_modules', 'kerfjs', 'package.json'),
    JSON.stringify({
      name: 'kerfjs',
      version: '0.9.1',
      main: 'index.js',
      exports: {
        '.': './index.js',
      },
    }) + '\n',
  );
  try {
    const checked = runCheck(root);
    assert.ok(checked, 'fallback path lookup should resolve the manifest');
    const skill = checked.results.find((r) => r.file.name === 'skill');
    assert.equal(skill.result.state, 'missing');
  } finally {
    cleanup(root);
  }
});

test('classifyFile — direct call returns the documented state shapes', () => {
  _resetForTests();
  const { root, manifest } = setupProject({
    skillVersion: '1.1.0',
    withClaude: true,
    skillBody: makeSkillBody('1.0.0') + '\nappend\n',
  });
  try {
    const file = manifest.files.find((f) => f.name === 'skill');
    const bundleDir = join(root, 'node_modules', 'kerfjs', 'ai');
    const r = classifyFile(file, bundleDir, root);
    assert.equal(r.state, 'stale');
    assert.equal(typeof r.consumerVersion, 'string');
    assert.equal(typeof r.bundledVersion, 'string');
    assert.equal(typeof r.appendZone, 'string');
  } finally {
    cleanup(root);
  }
});

console.log('ai-assistant-configs: OK');

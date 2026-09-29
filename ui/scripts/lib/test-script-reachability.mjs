/**
 * Guards against a test file silently falling out of every gate. A vitest or
 * Playwright file only runs when some package script names it (or a directory
 * containing it) and that script is reachable from a gate CI executes.
 * `tests/integration/ai-regressions-v3.test.ts` once sat outside every script,
 * so it could rot unnoticed.
 */

const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

/** Whether a repository-relative path names a test file. */
export function isTestFile(path) {
  return TEST_FILE.test(path);
}

/** Script names reachable from `roots` through `npm run <name>` / `npm test`. */
export function reachableScripts(scripts, roots) {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name) || !(name in scripts)) continue;
    seen.add(name);
    const command = scripts[name];
    for (const match of command.matchAll(/\bnpm\s+run(?:\s+-s)?\s+([\w:.-]+)/g))
      queue.push(match[1]);
    if (/\bnpm\s+(?:test|t)\b/.test(command)) queue.push('test');
  }
  return seen;
}

/**
 * The test selectors a script command runs: each `vitest run …` path argument,
 * `'*'` for a bare `vitest run` (its default include pattern), and the
 * Playwright `testDir` for `playwright test`.
 */
export function testSelectors(command, { playwrightTestDir } = {}) {
  const selectors = [];
  for (const segment of command.split(/&&|\|\||;/)) {
    const words = segment.trim().split(/\s+/);
    const vitest = words.findIndex(
      (word, index) => word === 'vitest' && words[index + 1] === 'run',
    );
    if (vitest !== -1) {
      const paths = [];
      for (const word of words.slice(vitest + 2)) {
        if (word.startsWith('-')) continue;
        paths.push(word.replace(/^\.\//, '').replace(/\/$/, ''));
      }
      selectors.push(...(paths.length > 0 ? paths : ['*']));
    }
    const playwright = words.findIndex(
      (word, index) => word === 'playwright' && words[index + 1] === 'test',
    );
    if (playwright !== -1 && playwrightTestDir)
      selectors.push(playwrightTestDir.replace(/^\.\//, '').replace(/\/$/, ''));
  }
  return selectors;
}

/**
 * Test files no gate-reachable script selects. `files` are package-relative
 * paths; `roots` are the scripts CI runs (for example `check` and `test:e2e`).
 */
export function unreachableTestFiles(
  files,
  scripts,
  roots,
  { playwrightTestDir } = {},
) {
  const selectors = [...reachableScripts(scripts, roots)].flatMap((name) =>
    testSelectors(scripts[name], { playwrightTestDir }),
  );
  return files.filter(
    (file) =>
      isTestFile(file) &&
      !selectors.some(
        (selector) =>
          selector === '*' ||
          file === selector ||
          file.startsWith(`${selector}/`),
      ),
  );
}

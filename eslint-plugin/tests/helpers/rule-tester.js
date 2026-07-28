/**
 * A `RuleTester` configured for whichever ESLint major is installed.
 *
 * The plugin's `peerDependencies` range is a **tested** range — every major it
 * names is exercised by this suite in CI (see the matrix in
 * `.github/workflows/ci.yml`). That promise is only keepable if the suite can
 * actually run on each of them, and RuleTester's own config shape changed at
 * ESLint 9:
 *
 *   - **9 and 10** take flat-config shape — `languageOptions.parser` is the
 *     imported parser *module*.
 *   - **8** predates flat config in RuleTester and rejects `languageOptions`
 *     outright ("Unexpected top-level property"). It wants `parserOptions` at
 *     the top level and `parser` as a resolved module *path* string.
 *
 * The rules themselves are plain AST visitors and care about none of this —
 * every failure on ESLint 8 came from the harness, not the rule. Which is
 * exactly why the shim is worth its keep: without it the plugin would have to
 * drop a major it genuinely supports (`configs['legacy-recommended']` exists
 * for `.eslintrc` consumers) purely because the tests couldn't be run there.
 */

import { createRequire } from 'node:module';

import { ESLint, RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

const require = createRequire(import.meta.url);

/** Major version of the installed ESLint, as a number. */
export const eslintMajor = Number(ESLint.version.split('.')[0]);

const PARSER_OPTIONS = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  ecmaFeatures: { jsx: true },
};

/**
 * Build a `RuleTester` that parses TypeScript + JSX on the installed major.
 *
 * Every rule test uses this rather than constructing its own, so adding a
 * major to the support range is a change in one place instead of eight.
 */
export function createRuleTester() {
  if (eslintMajor >= 9) {
    return new RuleTester({
      languageOptions: { parser: tsParser, parserOptions: PARSER_OPTIONS },
    });
  }
  return new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: PARSER_OPTIONS,
  });
}

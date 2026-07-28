/**
 * A `RuleTester` configured the same way for every rule test.
 *
 * Kept as a single seam rather than repeated in each test file, because the
 * plugin's `peerDependencies` range is a **tested** range — every major it
 * names is exercised by this suite (see `scripts/eslint-matrix.mjs` and the CI
 * matrix). When a future major changes RuleTester's config shape the way
 * ESLint 9 did — `languageOptions` replacing top-level `parserOptions`, the
 * parser given as a module rather than a resolved path — this is the one file
 * that has to learn about it.
 */

import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

/** Build a `RuleTester` that parses TypeScript + JSX. */
export function createRuleTester() {
  return new RuleTester({
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
  });
}

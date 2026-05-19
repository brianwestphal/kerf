import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

import rule from '../../lib/rules/prefer-module-jsx-augmentation.js';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('prefer-module-jsx-augmentation', rule, {
  valid: [
    // Idiomatic: declaration-merge into kerfjs/jsx-runtime
    {
      code: `declare module 'kerfjs/jsx-runtime' { namespace JSX { interface IntrinsicElements { 'my-tag': { foo?: string } } } }`,
    },
    // declare global without JSX is fine
    {
      code: `declare global { interface Window { foo: number } }`,
    },
    // declare global with JSX namespace but not IntrinsicElements is fine
    // (might be augmenting JSX.Element or similar — out of scope for this rule)
    {
      code: `declare global { namespace JSX { interface ElementClass { render(): unknown } } }`,
    },
  ],
  invalid: [
    {
      code: `declare global { namespace JSX { interface IntrinsicElements { 'my-tag': { foo?: string } } } }`,
      errors: [{ messageId: 'preferModule' }],
    },
    {
      // Mixed members: rule still flags the IntrinsicElements interface
      code: `declare global {
  interface Window { foo: number }
  namespace JSX { interface IntrinsicElements { 'x-y': {} } }
}`,
      errors: [{ messageId: 'preferModule' }],
    },
  ],
});

console.log('prefer-module-jsx-augmentation: OK');

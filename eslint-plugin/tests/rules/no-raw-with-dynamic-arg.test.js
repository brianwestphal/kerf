import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

import rule from '../../lib/rules/no-raw-with-dynamic-arg.js';

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

ruleTester.run('no-raw-with-dynamic-arg', rule, {
  valid: [
    // Static string literal — always safe.
    { code: 'raw("<strong>static</strong>");' },
    // Template literal with no expressions — effectively static.
    { code: 'raw(`<em>static template</em>`);' },
    // No arguments — no-op, no report.
    { code: 'raw();' },
    // Numeric literal (unusual but literal nonetheless).
    { code: 'raw("42");' },
    // Other function called `raw` on a member expression with static arg.
    { code: 'other.raw("<b>ok</b>");' },
    // Unrelated function.
    { code: 'sanitize(userInput);' },
  ],
  invalid: [
    {
      // Variable — dynamic.
      code: 'raw(userHtml);',
      errors: [{ messageId: 'dynamic' }],
    },
    {
      // Function call result — dynamic.
      code: 'raw(fetchedContent());',
      errors: [{ messageId: 'dynamic' }],
    },
    {
      // Template literal with expressions — dynamic.
      code: 'raw(`<b>${userInput}</b>`);',
      errors: [{ messageId: 'dynamic' }],
    },
    {
      // Common unsanitized pipeline.
      code: 'raw(marked(markdown));',
      errors: [{ messageId: 'dynamic' }],
    },
    {
      // Member expression.
      code: 'raw(props.html);',
      errors: [{ messageId: 'dynamic' }],
    },
    {
      // Member-expression callee form: kerf.raw(dynamic).
      code: 'kerf.raw(userContent);',
      errors: [{ messageId: 'dynamic' }],
    },
  ],
});

import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

import rule from '../../lib/rules/require-data-key-in-each.js';

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

ruleTester.run('require-data-key-in-each', rule, {
  valid: [
    // Arrow with implicit return + data-key
    { code: 'each(items, (item) => <li data-key={item.id}>{item.name}</li>);' },
    // Arrow with implicit return + id
    { code: 'each(items, (item) => <li id={item.id}>{item.name}</li>);' },
    // Block-bodied arrow with return + data-key
    {
      code: 'each(items, (item) => { return <li data-key={item.id}>{item.name}</li>; });',
    },
    // Spread attribute — conservatively allowed (might include a key)
    { code: 'each(items, (item) => <li {...item.attrs}>{item.name}</li>);' },
    // Different identifier — not flagged (only `each` is checked).
    { code: 'map(items, (item) => <li>{item.name}</li>);' },
    // Non-arrow callback (e.g. a named function passed by reference) — rule
    // only inspects inline arrow / function-expression callbacks.
    { code: 'each(items, renderRow);' },
  ],
  invalid: [
    {
      code: 'each(items, (item) => <li>{item.name}</li>);',
      errors: [{ messageId: 'missingKey' }],
    },
    {
      code: 'each(items, (item) => { return <li>{item.name}</li>; });',
      errors: [{ messageId: 'missingKey' }],
    },
    {
      code: 'each(items, function (item) { return <li>{item.name}</li>; });',
      errors: [{ messageId: 'missingKey' }],
    },
    {
      code: 'each(items, (item) => <>{item.name}</>);',
      errors: [{ messageId: 'fragmentRoot' }],
    },
  ],
});

console.log('require-data-key-in-each: OK');

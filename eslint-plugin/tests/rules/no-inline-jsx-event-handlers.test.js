import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

import rule from '../../lib/rules/no-inline-jsx-event-handlers.js';

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

ruleTester.run('no-inline-jsx-event-handlers', rule, {
  valid: [
    // Idiomatic kerf: data-action attribute, no inline handler.
    { code: 'const x = <button data-action="save">Save</button>;' },
    // Lowercase HTML attributes that *start* with `on` but are not camelCase
    // event handlers are not flagged (kerf passes them through as attribute
    // strings — e.g., the rare native `onload` attribute on <body>).
    { code: 'const x = <body onload="x()" />;' },
    // Custom-component props named onClick are allowed — components are plain
    // functions that may accept handler-shaped props by name.
    { code: 'const x = <MyButton onClick={fn}>x</MyButton>;' },
    // Other attributes on intrinsic elements are fine.
    { code: 'const x = <div class="foo" data-key="1">x</div>;' },
  ],
  invalid: [
    {
      code: 'const x = <button onClick={fn}>Save</button>;',
      errors: [{ messageId: 'inline', data: { name: 'onClick' } }],
    },
    {
      code: 'const x = <input onChange={fn} />;',
      errors: [{ messageId: 'inline', data: { name: 'onChange' } }],
    },
    {
      code: 'const x = <form onSubmit={fn}><button /></form>;',
      errors: [{ messageId: 'inline', data: { name: 'onSubmit' } }],
    },
    {
      code: 'const x = <textarea onInput={fn} />;',
      errors: [{ messageId: 'inline', data: { name: 'onInput' } }],
    },
  ],
});

console.log('no-inline-jsx-event-handlers: OK');

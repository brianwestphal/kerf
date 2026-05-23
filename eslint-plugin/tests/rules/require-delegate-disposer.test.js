import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

import rule from '../../lib/rules/require-delegate-disposer.js';

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

ruleTester.run('require-delegate-disposer', rule, {
  valid: [
    // Assigned to a variable.
    { code: "const off = delegate(root, 'click', '.x', fn);" },
    { code: "let off; off = delegate(root, 'click', '.x', fn);" },
    // Pushed into an array.
    { code: "const disposers = []; disposers.push(delegate(root, 'click', '.x', fn));" },
    // Returned from a function.
    { code: "function setup() { return delegate(root, 'click', '.x', fn); }" },
    { code: "const setup = () => delegate(root, 'click', '.x', fn);" },
    // Passed as an argument.
    { code: "onCleanup(delegate(root, 'click', '.x', fn));" },
    // Property in an object literal.
    { code: "const teardown = { off: delegate(root, 'click', '.x', fn) };" },
    // Element in an array literal.
    { code: "const offs = [delegate(root, 'click', '.x', fn), delegate(root, 'blur', '.y', fn)];" },
    // Explicit-discard sigil — page-lifetime opt-out.
    { code: "void delegate(document.body, 'click', '.x', fn);" },
    { code: "void delegateCapture(document.body, 'blur', '.x', fn);" },
    // Not a delegate / delegateCapture call.
    { code: "addEventListener('click', fn);" },
    { code: "someOtherFn(root, 'click', '.x', fn);" },
    // Method call — `obj.delegate(...)` is not the imported `delegate()`.
    { code: "obj.delegate(root, 'click', '.x', fn);" },
    // delegateCapture in the same captured-disposer shapes.
    { code: "const off = delegateCapture(root, 'blur', '.x', fn);" },
    { code: "return delegateCapture(root, 'blur', '.x', fn);" },
  ],
  invalid: [
    {
      code: "delegate(root, 'click', '.x', fn);",
      errors: [{ messageId: 'requireDisposer', data: { fn: 'delegate' } }],
    },
    {
      code: "delegateCapture(root, 'blur', '.x', fn);",
      errors: [{ messageId: 'requireDisposer', data: { fn: 'delegateCapture' } }],
    },
    {
      // Multiple bare calls — each flagged.
      code: "delegate(root, 'click', '.x', fn); delegate(root, 'input', '.y', fn);",
      errors: [
        { messageId: 'requireDisposer', data: { fn: 'delegate' } },
        { messageId: 'requireDisposer', data: { fn: 'delegate' } },
      ],
    },
    {
      // Aliased import — same callee name in the local scope.
      code: "import { delegate } from 'kerfjs';\ndelegate(root, 'click', '.x', fn);",
      errors: [{ messageId: 'requireDisposer', data: { fn: 'delegate' } }],
    },
  ],
});

console.log('require-delegate-disposer: OK');

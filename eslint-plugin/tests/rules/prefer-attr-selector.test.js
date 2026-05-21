import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';

import rule from '../../lib/rules/prefer-attr-selector.js';

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

ruleTester.run('prefer-attr-selector', rule, {
  valid: [
    // Already using attr().selector — no literal, no flag.
    { code: "delegate(root, 'click', ACTIONS.toggle.selector, fn);" },
    // Class / id selectors — attr() is not the swap.
    { code: "delegate(root, 'click', '.toggle', fn);" },
    { code: "delegate(root, 'click', '#submit', fn);" },
    // Tag-qualified — compound selector, not a simple attr().
    { code: "delegate(root, 'click', 'button[data-action=\"x\"]', fn);" },
    // Compound attr selectors — not 1:1 with a single attr() spec.
    { code: "delegate(root, 'click', '[data-action=\"x\"][data-id=\"y\"]', fn);" },
    // Bare-attribute presence selectors — no value to embed.
    { code: "delegate(root, 'click', '[data-new]', fn);" },
    { code: "delegate(root, 'click', '[data-edit]', fn);" },
    // Not delegate / delegateCapture.
    { code: "querySelector('[data-action=\"x\"]');" },
    { code: "el.matches('[data-action=\"x\"]');" },
    // Selector argument is a variable, not a literal.
    { code: "delegate(root, 'click', selector, fn);" },
  ],
  invalid: [
    {
      code: "delegate(root, 'click', '[data-action=\"toggle\"]', fn);",
      errors: [{ messageId: 'preferAttr', data: { name: 'data-action', value: 'toggle' } }],
    },
    {
      code: "delegateCapture(root, 'blur', '[data-edit=\"row\"]', fn);",
      errors: [{ messageId: 'preferAttr', data: { name: 'data-edit', value: 'row' } }],
    },
    {
      code: "delegate(root, 'submit', '[role=\"dialog\"]', fn);",
      errors: [{ messageId: 'preferAttr', data: { name: 'role', value: 'dialog' } }],
    },
    {
      // Single-quoted CSS string inside double-quoted JS literal.
      code: 'delegate(root, "click", "[data-action=\'save\']", fn);',
      errors: [{ messageId: 'preferAttr', data: { name: 'data-action', value: 'save' } }],
    },
  ],
});

console.log('prefer-attr-selector: OK');

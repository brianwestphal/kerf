import { createRuleTester } from '../helpers/rule-tester.js';

import rule from '../../lib/rules/prefer-attr-selector.js';

const ruleTester = createRuleTester();

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
    // kerfjs/actions: delegateActions() takes a handler TABLE (an object), not a
    // literal selector arg, so it is never flagged — the action strings live in
    // the table keys, and the [data-action] wiring is internal to the helper.
    { code: "delegateActions(root, 'click', { 'select-file': fn, remove: fn2 });" },
    { code: "delegateActions(root, 'input', table, { attr: 'data-action' });" },
    // action('x').selector is a member expression (the blessed attr-table form),
    // not a literal — not flagged, same as attr('data-action','x').selector.
    { code: "delegate(root, 'click', action('select-file').selector, fn);" },
    { code: "delegate(root, 'click', A.select.selector, fn);" },
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

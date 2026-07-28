import { createRuleTester } from '../helpers/rule-tester.js';

import rule from '../../lib/rules/no-nested-mount.js';

const ruleTester = createRuleTester();

ruleTester.run('no-nested-mount', rule, {
  valid: [
    // Single top-level mount
    { code: 'mount(root, () => <div />);' },
    // Two siblings, neither nested
    {
      code: 'mount(a, () => <div />); mount(b, () => <div />);',
    },
    // mount inside a non-mount function — only mount-inside-mount is flagged.
    { code: 'function init() { mount(root, () => <div />); } init();' },
  ],
  invalid: [
    {
      code: 'mount(root, () => { mount(other, () => <div />); return <div />; });',
      errors: [{ messageId: 'nested' }],
    },
    {
      code: 'mount(root, () => mount(other, () => <div />));',
      errors: [{ messageId: 'nested' }],
    },
    {
      code: 'mount(root, function () { mount(other, () => <div />); return <div />; });',
      errors: [{ messageId: 'nested' }],
    },
  ],
});

console.log('no-nested-mount: OK');

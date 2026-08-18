import { createRuleTester } from '../helpers/rule-tester.js';

import rule from '../../lib/rules/no-raw-with-dynamic-arg.js';

const ruleTester = createRuleTester();

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
    // trustedRaw() is the blessed intention-revealing escape hatch for a
    // server-trusted DYNAMIC value — it is not `raw`, so it is never flagged.
    { code: 'trustedRaw(csrfToken);' },
    { code: 'trustedRaw(`<script src="${trustedSrc}"></script>`);' },
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

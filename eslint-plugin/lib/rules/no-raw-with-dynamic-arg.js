/**
 * Flags calls to `raw(expr)` where `expr` is not a static string literal or a
 * template literal with no dynamic expressions. `raw()` bypasses kerf's
 * HTML auto-escaping — passing a dynamic value (user input, API response, any
 * expression the user can influence) is the canonical XSS vector.
 *
 * Safe:  raw("<strong>static</strong>")
 * Safe:  raw(`<em>static template</em>`)          (no ${} expressions)
 * Error: raw(someVariable)
 * Error: raw(fetchedHtml)
 * Error: raw(`<b>${userContent}</b>`)              (template has expressions)
 * Error: raw(marked(markdown))                     (unsanitized pipeline)
 *
 * When the input IS user-controlled, the canonical fix is to sanitize first:
 *   raw(DOMPurify.sanitize(marked(userMarkdown)))
 *
 * To let the linter know the call is intentionally safe (e.g., a
 * fully-sanitized pipeline), add an eslint-disable-next-line comment.
 */

const meta = {
  type: 'problem',
  docs: {
    description:
      "Disallow `raw()` with dynamic arguments; `raw()` bypasses HTML escaping and passing dynamic values is an XSS vector.",
    url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/no-raw-with-dynamic-arg.md',
  },
  schema: [],
  messages: {
    dynamic:
      "`raw()` bypasses HTML auto-escaping. Passing a dynamic value is an XSS risk unless the input has been sanitized. Sanitize first (`DOMPurify.sanitize(...)`) then pass to `raw()`, or add `// eslint-disable-next-line kerfjs/no-raw-with-dynamic-arg` to mark a call as intentionally safe.",
  },
};

function isStaticArg(node) {
  if (!node) return false;
  // String or numeric literal: raw("html")
  if (node.type === 'Literal') return typeof node.value === 'string';
  // Template literal with no expressions: raw(`static`)
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0;
  return false;
}

function create(context) {
  return {
    CallExpression(node) {
      const callee = node.callee;
      if (!callee) return;
      // Match bare `raw(...)` and `kerfjs.raw(...)` / `kerf.raw(...)` shapes.
      const isRaw = (callee.type === 'Identifier' && callee.name === 'raw')
        || (callee.type === 'MemberExpression'
            && callee.property.type === 'Identifier'
            && callee.property.name === 'raw');
      if (!isRaw) return;
      if (node.arguments.length === 0) return;
      const arg = node.arguments[0];
      if (!isStaticArg(arg)) {
        context.report({ node, messageId: 'dynamic' });
      }
    },
  };
}

export default { meta, create };

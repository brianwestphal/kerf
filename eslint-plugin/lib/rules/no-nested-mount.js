/**
 * Hard Rule 5 — one `mount()` per root. Composition is via plain functions that
 * return JSX, not nested `mount()` calls.
 */

function isMountCall(node) {
  return (
    node &&
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'mount'
  );
}

const meta = {
  type: 'problem',
  docs: {
    description:
      "Disallow `mount()` calls nested inside another `mount()`'s render callback.",
    url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/no-nested-mount.md',
  },
  schema: [],
  messages: {
    nested:
      'Nested `mount()` is not supported — one `mount()` per root. Compose with plain functions that return JSX. See Hard Rule 5.',
  },
};

function create(context) {
  return {
    CallExpression(node) {
      if (!isMountCall(node)) return;
      let p = node.parent;
      while (p) {
        if (
          (p.type === 'ArrowFunctionExpression' || p.type === 'FunctionExpression') &&
          isMountCall(p.parent) &&
          p.parent.arguments.includes(p)
        ) {
          context.report({ node, messageId: 'nested' });
          return;
        }
        p = p.parent;
      }
    },
  };
}

export default { meta, create };

/**
 * Hard Rule 2 — `each()` rows must carry a per-item key (`data-key` or `id`).
 * Without a key, the keyed reconciler matches by position and loses identity,
 * focus, and cursor position on insert/delete.
 */

function findRootJSXFromBody(body) {
  if (!body) return null;
  if (body.type === 'JSXElement' || body.type === 'JSXFragment') return body;
  if (body.type === 'BlockStatement') {
    for (const stmt of body.body) {
      if (stmt.type === 'ReturnStatement' && stmt.argument) {
        const a = stmt.argument;
        if (a.type === 'JSXElement' || a.type === 'JSXFragment') return a;
        return null;
      }
    }
  }
  return null;
}

const meta = {
  type: 'problem',
  docs: {
    description:
      'Require `data-key` (or `id`) on the root element returned from `each()` row renders.',
    url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/require-data-key-in-each.md',
  },
  schema: [],
  messages: {
    missingKey:
      '`each()` row root must set `data-key={...}` (or `id={...}`) per item. Without a key, the diff matches by position and loses identity, focus, and cursor position on insert/delete. See Hard Rule 2.',
    fragmentRoot:
      '`each()` row must produce exactly one top-level element with a `data-key`. Fragment root is not allowed (see Hard Rule 12).',
  },
};

function create(context) {
  return {
    CallExpression(node) {
      if (node.callee.type !== 'Identifier' || node.callee.name !== 'each') return;
      const cb = node.arguments[1];
      if (!cb) return;
      if (cb.type !== 'ArrowFunctionExpression' && cb.type !== 'FunctionExpression') return;
      const root = findRootJSXFromBody(cb.body);
      if (!root) return;
      if (root.type === 'JSXFragment') {
        context.report({ node: root, messageId: 'fragmentRoot' });
        return;
      }
      const attrs = root.openingElement.attributes;
      const hasKey = attrs.some((a) => {
        if (a.type === 'JSXSpreadAttribute') return true;
        if (a.type !== 'JSXAttribute') return false;
        const n = a.name && a.name.name;
        return n === 'data-key' || n === 'id';
      });
      if (!hasKey) {
        context.report({ node: root.openingElement, messageId: 'missingKey' });
      }
    },
  };
}

export default { meta, create };

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

function isComponentRoot(name) {
  return (
    name.type === 'JSXMemberExpression' ||
    (name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name))
  );
}

function isKeyName(name) {
  return name === 'data-key' || name === 'id';
}

function hasKeyInRootAttributes(attribute) {
  const value = attribute.value;
  const object = value?.type === 'JSXExpressionContainer' && value.expression;
  if (!object || object.type !== 'ObjectExpression') return false;
  for (let index = object.properties.length - 1; index >= 0; index--) {
    const property = object.properties[index];
    // A later spread or computed name could overwrite an earlier key.
    if (property.type !== 'Property' || property.computed) return false;
    const key = property.key;
    if (isKeyName(key.type === 'Identifier' ? key.name : key.value))
      return true;
  }
  return false;
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
      if (node.callee.type !== 'Identifier' || node.callee.name !== 'each')
        return;
      const cb = node.arguments[1];
      if (!cb) return;
      if (
        cb.type !== 'ArrowFunctionExpression' &&
        cb.type !== 'FunctionExpression'
      )
        return;
      const root = findRootJSXFromBody(cb.body);
      if (!root) return;
      if (root.type === 'JSXFragment') {
        context.report({ node: root, messageId: 'fragmentRoot' });
        return;
      }
      const attrs = root.openingElement.attributes;
      const componentRoot = isComponentRoot(root.openingElement.name);
      const hasKey = attrs.some((a) => {
        if (a.type === 'JSXSpreadAttribute') return true;
        if (a.type !== 'JSXAttribute') return false;
        const n = a.name && a.name.name;
        return (
          isKeyName(n) ||
          (componentRoot && n === 'rootAttributes' && hasKeyInRootAttributes(a))
        );
      });
      if (!hasKey) {
        context.report({ node: root.openingElement, messageId: 'missingKey' });
      }
    },
  };
}

export default { meta, create };

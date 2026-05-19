/**
 * Hard Rule 9 — kerf's JSX-to-string runtime does not support inline `onClick`-style
 * event handlers. Use a `data-action` attribute and `delegate()` from the mount root.
 */

const meta = {
  type: 'problem',
  docs: {
    description:
      "Disallow inline `onClick`-style JSX event handler attributes; use `data-action` + `delegate()` instead.",
    url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/no-inline-jsx-event-handlers.md',
  },
  schema: [],
  messages: {
    inline:
      "Inline JSX event handler `{{name}}` is not supported by kerf's JSX-to-string runtime. Use a `data-action` attribute + `delegate()` from the mount root instead. See Hard Rule 9.",
  },
};

function create(context) {
  return {
    JSXAttribute(node) {
      const attr = node.name;
      if (!attr || attr.type !== 'JSXIdentifier') return;
      const name = attr.name;
      if (!/^on[A-Z]/.test(name)) return;
      const opening = node.parent;
      if (!opening || opening.type !== 'JSXOpeningElement') return;
      const elName = opening.name;
      if (!elName || elName.type !== 'JSXIdentifier') return;
      const first = elName.name[0];
      if (first !== first.toLowerCase()) return;
      context.report({ node, messageId: 'inline', data: { name } });
    },
  };
}

export default { meta, create };

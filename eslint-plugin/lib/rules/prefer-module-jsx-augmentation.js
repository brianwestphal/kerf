/**
 * Hard Rule 11 — declaration-merge `JSX.IntrinsicElements` into the
 * `kerfjs/jsx-runtime` module, not the global namespace. Kerf's JSX runtime
 * looks up custom-element typings on its own module's JSX namespace; a global
 * augmentation does not flow through.
 */

function findGlobalJSXIntrinsics(moduleBlock) {
  if (!moduleBlock || moduleBlock.type !== 'TSModuleBlock') return null;
  for (const m of moduleBlock.body) {
    if (m.type !== 'TSModuleDeclaration') continue;
    const idNode = m.id;
    if (!idNode || idNode.type !== 'Identifier' || idNode.name !== 'JSX') continue;
    const inner = m.body;
    if (!inner || inner.type !== 'TSModuleBlock') continue;
    for (const member of inner.body) {
      if (
        member.type === 'TSInterfaceDeclaration' &&
        member.id &&
        member.id.type === 'Identifier' &&
        member.id.name === 'IntrinsicElements'
      ) {
        return member;
      }
    }
  }
  return null;
}

const meta = {
  type: 'problem',
  docs: {
    description:
      "Declaration-merge `JSX.IntrinsicElements` into `kerfjs/jsx-runtime`, not the global namespace.",
    url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/prefer-module-jsx-augmentation.md',
  },
  schema: [],
  messages: {
    preferModule:
      "Declaration-merge `JSX.IntrinsicElements` into the `kerfjs/jsx-runtime` module, not `declare global`. Use `declare module 'kerfjs/jsx-runtime' { namespace JSX { interface IntrinsicElements { ... } } }`. See Hard Rule 11.",
  },
};

function create(context) {
  return {
    TSModuleDeclaration(node) {
      if (!node.global) return;
      const target = findGlobalJSXIntrinsics(node.body);
      if (target) {
        context.report({ node: target, messageId: 'preferModule' });
      }
    },
  };
}

export default { meta, create };

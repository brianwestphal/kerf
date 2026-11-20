// Only hosts that parse in ordinary HTML flow and have no form/editing state.
const hosts = new Set(['div', 'span', 'small', 'em', 'strong']);
const ownershipAttributes = new Set([
  'contenteditable',
  'data-morph-skip',
  'data-morph-skip-children',
  'data-morph-preserve',
  'is',
  'xmlns',
  'children',
  'data-kfb',
  'data-kfbrow',
]);

function definition(source, identifier) {
  for (let scope = source.getScope(identifier); scope; scope = scope.upper) {
    const variable = scope.set.get(identifier.name);
    if (variable) return variable.defs.length === 1 ? variable.defs[0] : null;
  }
  return null;
}

function importedName(source, node) {
  if (node.type !== 'Identifier') return null;
  const def = definition(source, node);
  if (
    def?.type !== 'ImportBinding' ||
    def.parent.source.value !== 'kerfjs' ||
    def.node.type !== 'ImportSpecifier' ||
    def.node.importKind === 'type' ||
    def.parent.importKind === 'type'
  )
    return null;
  return def.node.imported.name;
}

function ordinaryHost(element) {
  const opening = element.openingElement;
  if (opening.name.type !== 'JSXIdentifier' || !hosts.has(opening.name.name))
    return false;
  const seen = new Set();
  for (const attribute of opening.attributes) {
    if (
      attribute.type !== 'JSXAttribute' ||
      attribute.name.type !== 'JSXIdentifier'
    )
      return false;
    const name = attribute.name.name.toLowerCase();
    if (ownershipAttributes.has(name) || seen.has(name)) return false;
    seen.add(name);
  }
  return true;
}

// Follow only direct JSX children to the inline callback return. A wrapper
// component, slot, helper call, or nested callback can change hole ownership.
function mountCallback(element, source) {
  let node = element;
  while (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    if (node.type === 'JSXElement' && !ordinaryHost(node)) return null;
    node = node.parent;
  }
  if (node.type === 'ReturnStatement' && node.parent.type === 'BlockStatement')
    node = node.parent.parent;
  if (
    node.type !== 'ArrowFunctionExpression' &&
    node.type !== 'FunctionExpression'
  )
    return null;
  const call = node.parent;
  return call.type === 'CallExpression' &&
    call.arguments[1] === node &&
    importedName(source, call.callee) === 'mount'
    ? node
    : null;
}

function isScalar(checker, type, allowNumber) {
  if (type.isUnion())
    return type.types.every((member) => isScalar(checker, member, allowNumber));
  const base = checker.getBaseTypeOfLiteralType(type);
  return (
    base === checker.getStringType() ||
    (allowNumber && base === checker.getNumberType())
  );
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest binding a stable Kerf signal in a mounted scalar JSX leaf.',
    },
    schema: [],
    hasSuggestions: true,
    messages: {
      leaf: 'This value read subscribes the mount render. Binding the signal updates just this hole; check whether other render work relies on those rerenders.',
      bind: 'Pass the signal itself to the native JSX hole.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    const services = source.parserServices;
    const program = services?.program;
    if (!program || !services.esTreeNodeToTSNodeMap) return {};
    const opts = program.getCompilerOptions();
    // TypeScript JsxEmit.ReactJSX (4) and ReactJSXDev (5). Consume the parser's
    // Program without loading TypeScript as a dependency in untyped consumers.
    if (
      (opts.jsx !== 4 && opts.jsx !== 5) ||
      opts.jsxImportSource !== 'kerfjs' ||
      !(opts.strictNullChecks ?? opts.strict)
    )
      return {};
    if (
      source
        .getAllComments()
        .some((comment) =>
          /@jsx(?:ImportSource|Runtime|Frag)?\b/.test(comment.value),
        )
    )
      return {};

    return {
      JSXExpressionContainer(container) {
        const member = container.expression;
        if (
          member.type !== 'MemberExpression' ||
          member.optional ||
          member.computed ||
          member.object.type !== 'Identifier' ||
          member.property.name !== 'value' ||
          source.getCommentsInside(member).length
        )
          return;
        const parent = container.parent;
        const text = parent.type === 'JSXElement';
        if (
          !text &&
          !(parent.type === 'JSXAttribute' && parent.name.name === 'title')
        )
          return;
        const owner = mountCallback(
          text ? parent : parent.parent.parent,
          source,
        );
        if (!owner) return;

        const def = definition(source, member.object);
        if (
          def?.type !== 'Variable' ||
          def.parent.kind !== 'const' ||
          def.node.id.type !== 'Identifier' ||
          (def.node.range[0] >= owner.range[0] &&
            def.node.range[1] <= owner.range[1])
        )
          return;
        const init = def.node.init;
        if (
          init?.type !== 'CallExpression' ||
          !['signal', 'computed'].includes(importedName(source, init.callee))
        )
          return;
        const checker = program.getTypeChecker();
        const tsNode = (node) => services.esTreeNodeToTSNodeMap.get(node);
        const signature = checker.getResolvedSignature(tsNode(init));
        const annotation = def.node.id.typeAnnotation;
        const receiver = annotation
          ? checker.getTypeFromTypeNode(tsNode(annotation.typeAnnotation))
          : checker.getTypeAtLocation(tsNode(member.object));
        const value = checker.getPropertyOfType(receiver, 'value');
        if (
          !signature ||
          !value ||
          !isScalar(
            checker,
            checker.getTypeOfSymbolAtLocation(value, tsNode(init)),
            text,
          )
        )
          return;
        // An annotation such as { value: string } loses the signal type even
        // though the initializer was a real signal. Its proposed JSX must typecheck.
        if (
          !checker.isTypeAssignableTo(
            receiver,
            checker.getReturnTypeOfSignature(signature),
          )
        )
          return;
        context.report({
          node: member,
          messageId: 'leaf',
          suggest: [
            {
              messageId: 'bind',
              fix: (fixer) =>
                fixer.replaceText(member, source.getText(member.object)),
            },
          ],
        });
      },
    };
  },
};

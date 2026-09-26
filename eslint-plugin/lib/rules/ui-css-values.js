import {
  helperCall,
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';

const CODES = {
  raw: 'KUI-L013',
  helper: 'KUI-L014',
  expression: 'KUI-L015',
  declarations: 'KUI-L016',
  exceptional: 'KUI-L017',
};

function propertyName(node) {
  if (!node || node.computed) return undefined;
  return node.key?.name ?? node.key?.value;
}

function objectProperty(object, name) {
  return object?.properties?.find(
    (property) =>
      property.type === 'Property' && propertyName(property) === name,
  );
}

function jsxAttribute(opening, name) {
  return opening.attributes.find(
    (attribute) =>
      attribute.type === 'JSXAttribute' && attribute.name.name === name,
  );
}

function jsxValue(attribute) {
  if (!attribute?.value) return undefined;
  if (attribute.value.type === 'Literal') return attribute.value;
  if (attribute.value.type === 'JSXExpressionContainer')
    return attribute.value.expression;
  return undefined;
}

function nestedValues(value, tail) {
  if (!tail) return [value];
  if (value?.type !== 'ArrayExpression') return [];
  return value.elements.flatMap((element) => {
    if (element?.type !== 'ObjectExpression') return [];
    const property = objectProperty(element, tail);
    return property ? [property.value] : [];
  });
}

function contractValuesFromJsx(opening, path) {
  const [head, tail] = path.split('[].');
  return nestedValues(jsxValue(jsxAttribute(opening, head)), tail);
}

function contractValuesFromCall(call, path) {
  const options = call.arguments[0];
  if (options?.type !== 'ObjectExpression') return [];
  const [head, tail] = path.split('[].');
  const property = objectProperty(options, head);
  return property ? nestedValues(property.value, tail) : [];
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce cataloged property-specific CSS value contracts for Kerf UI components.',
      url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ui-css-values.md',
    },
    schema: UI_RULE_SCHEMA,
    messages: {
      config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
      raw: '{{code}}: `{{component}}.{{path}}` uses {{grammar}} grammar; replace raw `{{value}}` with {{preferred}}.',
      helper:
        '{{code}}: `{{helper}}()` produces the wrong grammar for `{{component}}.{{path}}`; use {{preferred}}.',
      expression:
        '{{code}}: `{{helper}}()` is not a standalone CSS value for `{{component}}.{{path}}`; wrap it with an accepted composer such as `calc()`.',
      declarations:
        '{{code}}: `{{component}}.{{path}}` is a forbidden declaration-list escape hatch; use `className`, public tokens, or cataloged props.',
      exceptional:
        '{{code}}: `{{value}}` is an exceptional shorthand for `{{component}}.{{path}}`; prefer {{preferred}} unless the off-scale choice is deliberate.',
    },
  },
  create(context) {
    const loaded = loadUiContract(context);
    const filename = context.filename ?? context.getFilename();
    let registry;

    const inspect = (node, entry, valuesFor) => {
      for (const cssContract of entry.cssValueProps ?? []) {
        const preferred =
          [
            ...(cssContract.canonicalShorthands ?? []).map(
              (item) => `\`${item}\``,
            ),
            ...(cssContract.helpers ?? []).map((item) => `\`${item}()\``),
          ].join(' or ') || 'a cataloged component prop';
        for (const value of valuesFor(cssContract.path)) {
          if (!value) continue;
          if (
            cssContract.grammar === 'declarations' &&
            cssContract.rawPolicy !== 'allow'
          ) {
            if (!isExcepted(loaded, CODES.declarations, filename))
              context.report({
                node: value,
                messageId: 'declarations',
                data: {
                  code: CODES.declarations,
                  component: entry.name,
                  path: cssContract.path,
                },
              });
            continue;
          }
          const literal =
            value.type === 'Literal' && typeof value.value === 'string'
              ? value.value
              : value.type === 'TemplateLiteral' &&
                  value.expressions.length === 0
                ? value.quasis[0].value.cooked
                : undefined;
          if (literal !== undefined) {
            if (cssContract.exceptionalShorthands?.includes(literal)) {
              if (!isExcepted(loaded, CODES.exceptional, filename))
                context.report({
                  node: value,
                  messageId: 'exceptional',
                  data: {
                    code: CODES.exceptional,
                    component: entry.name,
                    path: cssContract.path,
                    value: literal,
                    preferred,
                  },
                });
            } else if (
              !cssContract.shorthands?.includes(literal) &&
              cssContract.rawPolicy !== 'allow'
            ) {
              const code = CODES.raw;
              if (!isExcepted(loaded, code, filename))
                context.report({
                  node: value,
                  messageId: 'raw',
                  data: {
                    code,
                    component: entry.name,
                    path: cssContract.path,
                    grammar: cssContract.grammar,
                    value: literal,
                    preferred,
                  },
                });
            }
            continue;
          }
          if (value.type !== 'CallExpression') continue;
          const helper = helperCall(value.callee, registry, loaded);
          if (!helper) continue;
          if (cssContract.nonStandaloneHelpers?.includes(helper.imported)) {
            if (!isExcepted(loaded, CODES.expression, filename))
              context.report({
                node: value,
                messageId: 'expression',
                data: {
                  code: CODES.expression,
                  component: entry.name,
                  path: cssContract.path,
                  helper: helper.imported,
                },
              });
          } else if (
            !cssContract.helpers?.includes(helper.imported) &&
            cssContract.unsafeHelper !== helper.imported
          ) {
            if (!isExcepted(loaded, CODES.helper, filename))
              context.report({
                node: value,
                messageId: 'helper',
                data: {
                  code: CODES.helper,
                  component: entry.name,
                  path: cssContract.path,
                  helper: helper.imported,
                  preferred,
                },
              });
          }
        }
      }
    };

    return {
      Program(node) {
        if (loaded.error)
          context.report({
            node,
            messageId: 'config',
            data: { error: loaded.error },
          });
        else registry = importRegistry(node, loaded);
      },
      JSXOpeningElement(node) {
        if (!registry) return;
        const key = jsxKey(node.name, registry, loaded);
        const entry = loaded.entries.get(key);
        if (entry)
          inspect(node, entry, (path) => contractValuesFromJsx(node, path));
      },
      CallExpression(node) {
        if (!registry) return;
        let key;
        if (node.callee.type === 'Identifier')
          key = registry.locals.get(node.callee.name);
        else if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.object.type === 'Identifier' &&
          node.callee.property.type === 'Identifier'
        ) {
          const source = registry.namespaces.get(node.callee.object.name);
          const exportedKey = loaded.exports.get(node.callee.property.name);
          if (
            source === loaded.package ||
            loaded.imports.get(source) === exportedKey
          )
            key = exportedKey;
        }
        const entry = loaded.entries.get(key);
        if (entry)
          inspect(node, entry, (path) => contractValuesFromCall(node, path));
      },
    };
  },
};

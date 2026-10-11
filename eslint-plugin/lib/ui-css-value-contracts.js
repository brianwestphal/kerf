import {
  helperCall,
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from './ui-contract.js';

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

const CONTRACT_MESSAGES = {
  raw: 'KUI-L013: `{{component}}.{{path}}` uses {{grammar}} grammar; replace raw `{{value}}` with {{preferred}}.',
  helper:
    'KUI-L014: `{{helper}}()` produces the wrong grammar for `{{component}}.{{path}}`; use {{preferred}}.',
  expression:
    'KUI-L015: `{{helper}}()` is not a standalone CSS value for `{{component}}.{{path}}`; wrap it with an accepted composer such as `calc()`.',
  declarations:
    'KUI-L016: `{{component}}.{{path}}` is a forbidden declaration-list escape hatch; use `className`, public tokens, or cataloged props.',
};

const REVIEW_MESSAGES = {
  exceptional:
    'KUI-L017: `{{value}}` is an exceptional shorthand for `{{component}}.{{path}}`; prefer {{preferred}} unless the off-scale choice is deliberate.',
};

// One catalog walk backs two rules because ESLint assigns severity per rule,
// not per message. `KUI-L013`–`KUI-L016` are contract violations (analyzer
// severity `error`); `KUI-L017` is a review finding (analyzer severity
// `review`), so it lives in its own rule that the presets configure as `warn`.
// Reporting all five from one `error` rule made a deliberate off-scale choice
// fail lint while the analyzer and doctor queued it for review.
export function createCssValueRule({ review }) {
  const slug = review ? 'ui-exceptional-shorthands' : 'ui-css-values';
  const reported = review ? REVIEW_MESSAGES : CONTRACT_MESSAGES;
  return {
    meta: {
      type: review ? 'suggestion' : 'problem',
      docs: {
        description: review
          ? 'Flag valid but exceptional off-scale shorthands for Kerf UI components for review.'
          : 'Enforce cataloged property-specific CSS value contracts for Kerf UI components.',
        url: `https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/${slug}.md`,
      },
      schema: UI_RULE_SCHEMA,
      messages: {
        config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
        ...reported,
      },
    },
    create(context) {
      return createVisitors(context, (descriptor) => {
        if (descriptor.messageId in reported) context.report(descriptor);
      });
    },
  };
}

function createVisitors(context, report) {
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
            report({
              node: value,
              messageId: 'declarations',
              data: {
                component: entry.name,
                path: cssContract.path,
              },
            });
          continue;
        }
        const literal =
          value.type === 'Literal' && typeof value.value === 'string'
            ? value.value
            : value.type === 'TemplateLiteral' && value.expressions.length === 0
              ? value.quasis[0].value.cooked
              : undefined;
        if (literal !== undefined) {
          if (cssContract.exceptionalShorthands?.includes(literal)) {
            if (!isExcepted(loaded, CODES.exceptional, filename))
              report({
                node: value,
                messageId: 'exceptional',
                data: {
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
              report({
                node: value,
                messageId: 'raw',
                data: {
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
            report({
              node: value,
              messageId: 'expression',
              data: {
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
            report({
              node: value,
              messageId: 'helper',
              data: {
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
      else registry = importRegistry(node, loaded, filename);
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
}

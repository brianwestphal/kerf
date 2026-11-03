import { resolve } from 'node:path';

import {
  customElementKey,
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';

const CODE = 'KUI-L301';
const SCOPE_CODE = 'KUI-L302';
/** Web Awesome appearance-scope classes, which need its theme to do anything. */
const WA_SCOPE_CLASS =
  /(?:^|\s)(wa-(?:light|dark|invert|theme-default))(?=\s|$)/g;

/** The static class text of a `class` / `className` attribute value. */
function classText(value) {
  if (!value) return [];
  if (value.type === 'Literal' && typeof value.value === 'string')
    return [value.value];
  if (value.type !== 'JSXExpressionContainer') return [];
  const expression = value.expression;
  if (expression.type === 'Literal' && typeof expression.value === 'string')
    return [expression.value];
  if (expression.type === 'TemplateLiteral')
    return expression.quasis.map((quasi) => quasi.value.cooked ?? '');
  return [];
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Apply application-profile preferred UI component choices.',
      url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ui-preferences.md',
    },
    schema: UI_RULE_SCHEMA,
    messages: {
      config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
      preferred:
        'KUI-L301: `{{actual}}` is discouraged for `{{concept}}`; this profile prefers `{{preferred}}`. {{rationale}}',
      scope:
        'KUI-L302: `{{name}}` is a Web Awesome appearance scope that does nothing without its theme. Use the `scheme` prop on ContentItem, Pane, NavStack, or TabNavigator, or the `.kui-light` / `.kui-dark` / `.kui-invert` scope class.',
    },
  },
  create(context) {
    const contract = loadUiContract(context);
    const filename = context.filename ?? context.getFilename();
    let registry;
    return {
      JSXAttribute(node) {
        if (contract.error || isExcepted(contract, SCOPE_CODE, filename))
          return;
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : '';
        if (name !== 'class' && name !== 'className') return;
        for (const text of classText(node.value))
          for (const match of text.matchAll(WA_SCOPE_CLASS))
            context.report({
              node: node.value,
              messageId: 'scope',
              data: { name: match[1] },
            });
      },
      Program(node) {
        if (contract.error)
          context.report({
            node,
            messageId: 'config',
            data: { error: contract.error },
          });
        else registry = importRegistry(node, contract, filename);
      },
      JSXOpeningElement(node) {
        if (!registry || isExcepted(contract, CODE, filename)) return;
        // A declared component's own source is the wrapper that owns the
        // element it renders; the preference governs its callers.
        if (contract.componentSources.has(resolve(filename))) return;
        const actual =
          jsxKey(node.name, registry, contract) ??
          customElementKey(node.name, contract);
        if (!actual) return;
        for (const [concept, preference] of Object.entries(
          contract.profile.preferences ?? {},
        ))
          if ((preference.avoid ?? []).includes(actual))
            context.report({
              node: node.name,
              messageId: 'preferred',
              data: {
                actual,
                concept,
                preferred: preference.preferred,
                rationale:
                  preference.rationale ??
                  'Use the project preference unless an exact profile exception applies.',
              },
            });
      },
    };
  },
};

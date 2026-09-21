import {
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';

const CODE = 'KUI-L301';

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
    },
  },
  create(context) {
    const contract = loadUiContract(context);
    const filename = context.filename ?? context.getFilename();
    let registry;
    return {
      Program(node) {
        if (contract.error)
          context.report({
            node,
            messageId: 'config',
            data: { error: contract.error },
          });
        else registry = importRegistry(node, contract);
      },
      JSXOpeningElement(node) {
        if (!registry || isExcepted(contract, CODE, filename)) return;
        const actual = jsxKey(node.name, registry, contract);
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

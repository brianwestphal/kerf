import {
  isExcepted,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';

const CLASS_CODE = 'KUI-L101';
const TOKEN_CODE = 'KUI-L102';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Restrict Kerf UI classes and tokens to cataloged public boundaries.',
      url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ui-public-boundaries.md',
    },
    schema: UI_RULE_SCHEMA,
    messages: {
      config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
      class:
        'KUI-L101: `{{name}}` is private or uncataloged Kerf UI anatomy. Use a cataloged public class, prop, token, or component instead.',
      token:
        'KUI-L102: `{{name}}` is not a cataloged public Kerf UI token. Use a public semantic/component token.',
    },
  },
  create(context) {
    const contract = loadUiContract(context);
    const filename = context.filename ?? context.getFilename();
    let configured = false;
    const inspect = (node, value, classContext = false) => {
      if (typeof value !== 'string') return;
      if (classContext && !isExcepted(contract, CLASS_CODE, filename))
        for (const name of value
          .split(/\s+/)
          .filter((item) => item.startsWith('kui-')))
          if (!contract.publicClasses.has(name))
            context.report({ node, messageId: 'class', data: { name } });
      if (!isExcepted(contract, TOKEN_CODE, filename))
        for (const match of value.matchAll(/--kui-[a-z0-9-]+/g))
          if (!contract.publicTokens.has(match[0]))
            context.report({
              node,
              messageId: 'token',
              data: { name: match[0] },
            });
    };
    return {
      Program(node) {
        if (contract.error && !configured) {
          configured = true;
          context.report({
            node,
            messageId: 'config',
            data: { error: contract.error },
          });
        }
      },
      JSXAttribute(node) {
        if (contract.error || !['class', 'className'].includes(node.name?.name))
          return;
        if (node.value?.type === 'Literal')
          inspect(node, node.value.value, true);
        if (
          node.value?.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'Literal'
        )
          inspect(node, node.value.expression.value, true);
      },
      Literal(node) {
        if (!contract.error) inspect(node, node.value, false);
      },
      TemplateElement(node) {
        if (!contract.error) inspect(node, node.value.raw, false);
      },
    };
  },
};

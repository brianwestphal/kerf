import {
  helperCall,
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  UI_RULE_SCHEMA,
  UI_CONTRACT_LOAD_CODE,
} from '../ui-contract.js';

const MISSING_CODE = 'KUI-L401';
const CLEANUP_CODE = 'KUI-L402';

const retained = (call) => call.parent?.type !== 'ExpressionStatement';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require cataloged Kerf UI wiring and retained cleanup.',
      url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ui-wiring.md',
    },
    schema: UI_RULE_SCHEMA,
    messages: {
      config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
      missing:
        'KUI-L401: `{{component}}` requires `{{helper}}`; import and invoke the documented wiring contract.',
      cleanup:
        'KUI-L402: Retain or return the disposer from `{{helper}}`; use `void` only for an intentional page-lifetime binding.',
    },
  },
  create(context) {
    const contract = loadUiContract(context);
    const filename = context.filename ?? context.getFilename();
    let registry;
    const used = new Map();
    const calls = new Map();
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
        if (!registry) return;
        const key = jsxKey(node.name, registry, contract);
        if (key && !used.has(key)) used.set(key, node.name);
      },
      CallExpression(node) {
        if (!registry) return;
        const imported = helperCall(node.callee, registry, contract);
        if (!imported) return;
        const list = calls.get(imported.imported) ?? [];
        list.push({ node, source: imported.source });
        calls.set(imported.imported, list);
      },
      'Program:exit'(node) {
        if (!registry) return;
        for (const [key, usage] of used) {
          const entry = contract.entries.get(key);
          if (!entry?.wiring.required) continue;
          for (const helper of entry.wiring.helpers) {
            if (helper.startsWith('@')) {
              if (
                !registry.sources.has(helper) &&
                !isExcepted(contract, MISSING_CODE, filename)
              )
                context.report({
                  node: usage,
                  messageId: 'missing',
                  data: { component: key, helper },
                });
              continue;
            }
            const helperCalls = calls.get(helper) ?? [];
            if (
              !helperCalls.length &&
              !isExcepted(contract, MISSING_CODE, filename)
            )
              context.report({
                node: usage,
                messageId: 'missing',
                data: { component: key, helper },
              });
            if (!isExcepted(contract, CLEANUP_CODE, filename))
              for (const { node: call } of helperCalls)
                if (!retained(call))
                  context.report({
                    node: call,
                    messageId: 'cleanup',
                    data: { helper },
                  });
          }
        }
      },
    };
  },
};

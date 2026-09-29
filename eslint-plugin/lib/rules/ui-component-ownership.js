import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  isExcepted,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';

const PRIVATE_CODE = 'KUI-L020';
const TYPED_CODE = 'KUI-L021';

const kebab = (value) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

// The same catalog-derived facts `kerf-ui-analyze` uses for KUI-L020 /
// KUI-L021 (`@kerfjs/ui/analyzer/component-ownership.mjs`): every root-like
// public class names a component, `--_<root>-*` is that component's private
// variable, and `--<root>-<prop>` is the token its typed `<prop>` sets.
const factsCache = new WeakMap();
function ownershipFacts(contract) {
  if (factsCache.has(contract)) return factsCache.get(contract);
  const privatePrefixes = [];
  const typedTokens = new Map();
  for (const entry of contract.entries.values()) {
    const boundaries = entry.boundaries ?? {};
    const roots = [
      ...new Set(
        [boundaries.rootClass, ...(boundaries.publicClasses ?? [])].filter(
          (name) => name && !name.includes('__') && !name.includes('--'),
        ),
      ),
    ];
    const tokens = new Set(boundaries.publicTokens ?? []);
    for (const root of roots) {
      privatePrefixes.push({ prefix: `--_${root}`, entry });
      for (const contractProp of entry.cssValueProps ?? []) {
        const [head] = contractProp.path.split('[].');
        const token = `--${root}-${kebab(head)}`;
        if (tokens.has(token) && !typedTokens.has(token))
          typedTokens.set(token, { entry, path: contractProp.path });
      }
    }
  }
  privatePrefixes.sort((a, b) => b.prefix.length - a.prefix.length);
  const facts = { privatePrefixes, typedTokens };
  factsCache.set(contract, facts);
  return facts;
}

const packageNames = new Map();
function ownPackage(filename) {
  for (
    let directory = dirname(resolve(filename));
    ;
    directory = dirname(directory)
  ) {
    if (packageNames.has(directory)) return packageNames.get(directory);
    const manifest = resolve(directory, 'package.json');
    if (existsSync(manifest)) {
      let name;
      try {
        name = JSON.parse(readFileSync(manifest, 'utf8')).name;
      } catch {
        name = undefined;
      }
      if (typeof name === 'string') {
        packageNames.set(directory, name);
        return name;
      }
    }
    if (dirname(directory) === directory) return undefined;
  }
}

const gap = (entry) =>
  `If no configuration covers this need, report the component gap to ${entry?.package ?? '@kerfjs/ui'} (open a feature request) instead of overriding it.`;

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Keep code from reaching into a Kerf UI component's private variables or overriding a token its typed prop configures.",
      url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ui-component-ownership.md',
    },
    schema: UI_RULE_SCHEMA,
    messages: {
      config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
      private: `${PRIVATE_CODE}: \`{{name}}\` is {{owner}}'s private variable; components own their styles. Configure it through its typed props, variants, or public tokens. {{gap}}`,
      typed: `${TYPED_CODE}: \`{{name}}\` is what {{component}}'s typed \`{{prop}}\` prop sets; set the prop on {{component}} instead of overriding the token. {{gap}}`,
    },
  },
  create(context) {
    const contract = loadUiContract(context);
    const filename = context.filename ?? context.getFilename();
    let configured = false;
    if (contract.error)
      return {
        Program(node) {
          if (configured) return;
          configured = true;
          context.report({
            node,
            messageId: 'config',
            data: { error: contract.error },
          });
        },
      };
    const facts = ownershipFacts(contract);
    const own = ownPackage(filename);
    const checkPrivate = !isExcepted(contract, PRIVATE_CODE, filename);
    const checkTyped = !isExcepted(contract, TYPED_CODE, filename);

    const privateOwner = (name) => {
      const match = facts.privatePrefixes.find(
        ({ prefix }) => name === prefix || name.startsWith(`${prefix}-`),
      );
      if (match) return match.entry;
      return name.startsWith('--_kui-') ? null : undefined;
    };
    const reportPrivate = (node, text) => {
      if (!checkPrivate) return;
      for (const [name] of text.matchAll(/--_[a-z0-9_-]+/gi)) {
        const owner = privateOwner(name);
        if (owner === undefined || (owner && owner.package === own)) continue;
        context.report({
          node,
          messageId: 'private',
          data: {
            name,
            owner: owner ? owner.name : 'a Kerf component',
            gap: gap(owner),
          },
        });
      }
    };
    const reportTyped = (node, token) => {
      if (!checkTyped) return;
      const typed = facts.typedTokens.get(token);
      if (!typed || typed.entry.package === own) return;
      context.report({
        node,
        messageId: 'typed',
        data: {
          name: token,
          component: typed.entry.name,
          prop: typed.path,
          gap: gap(typed.entry),
        },
      });
    };
    const inspectText = (node, text) => {
      if (typeof text !== 'string') return;
      reportPrivate(node, text);
      // `--token: value` inside a style string assigns the token.
      for (const [, token] of text.matchAll(/(--[a-z0-9-]+)\s*:/gi))
        reportTyped(node, token);
    };
    const keyName = (property) =>
      property.computed
        ? property.key.type === 'Literal'
          ? property.key.value
          : undefined
        : (property.key.name ?? property.key.value);

    return {
      Literal(node) {
        if (node.parent?.type === 'Property' && node.parent.key === node)
          return;
        inspectText(node, node.value);
      },
      TemplateElement(node) {
        inspectText(node, node.value.raw);
      },
      // `style={{ '--kui-list-gap': … }}` and any object keyed by a token.
      Property(node) {
        const key = keyName(node);
        if (typeof key !== 'string' || !key.startsWith('--')) return;
        reportPrivate(node.key, key);
        reportTyped(node.key, key);
      },
      // `element.style.setProperty('--kui-list-gap', …)`.
      CallExpression(node) {
        const callee = node.callee;
        const [first] = node.arguments;
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.name === 'setProperty' &&
          first?.type === 'Literal' &&
          typeof first.value === 'string'
        )
          reportTyped(first, first.value);
      },
    };
  },
};

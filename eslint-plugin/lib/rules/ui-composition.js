import {
  importRegistry,
  isExcepted,
  jsxKey,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';

const PARENT_CODE = 'KUI-L201';
const ZONE_CODE = 'KUI-L202';
const CARDINALITY_CODE = 'KUI-L203';

const emptyShape = () => ({ min: 0, max: 0, items: [] });

function combine(shapes) {
  return shapes.reduce(
    (result, shape) => ({
      min: result.min + shape.min,
      max: result.max + shape.max,
      items: [...result.items, ...shape.items],
    }),
    emptyShape(),
  );
}

function jsxLabel(name) {
  if (name.type === 'JSXIdentifier') return `<${name.name}>`;
  if (name.type === 'JSXMemberExpression')
    return `${jsxLabel(name.object).slice(0, -1)}.${name.property.name}>`;
  return '<unknown>';
}

function zoneShape(node, registry, contract) {
  if (!node || node.type === 'JSXEmptyExpression') return emptyShape();
  if (node.type === 'JSXElement') {
    const key = jsxKey(node.openingElement.name, registry, contract);
    return {
      min: 1,
      max: 1,
      items: [{ key, label: key ?? jsxLabel(node.openingElement.name) }],
    };
  }
  if (node.type === 'JSXFragment')
    return combine(
      node.children.map((child) => zoneShape(child, registry, contract)),
    );
  if (node.type === 'JSXText')
    return node.value.trim()
      ? { min: 1, max: 1, items: [{ label: 'text' }] }
      : emptyShape();
  if (node.type === 'JSXExpressionContainer')
    return zoneShape(node.expression, registry, contract);
  if (node.type === 'ArrayExpression')
    return combine(
      node.elements.map((child) => zoneShape(child, registry, contract)),
    );
  if (node.type === 'ConditionalExpression') {
    const consequent = zoneShape(node.consequent, registry, contract);
    const alternate = zoneShape(node.alternate, registry, contract);
    return {
      min: Math.min(consequent.min, alternate.min),
      max: Math.max(consequent.max, alternate.max),
      items: [...consequent.items, ...alternate.items],
    };
  }
  if (node.type === 'LogicalExpression') {
    const left = zoneShape(node.left, registry, contract);
    const right = zoneShape(node.right, registry, contract);
    return node.operator === '&&'
      ? { min: 0, max: right.max, items: right.items }
      : {
          min: Math.min(left.min, right.min),
          max: Math.max(left.max, right.max),
          items: [...left.items, ...right.items],
        };
  }
  if (node.type === 'Literal')
    return node.value === null || typeof node.value === 'boolean'
      ? emptyShape()
      : { min: 1, max: 1, items: [{ label: 'text' }] };
  return { min: 0, max: Number.POSITIVE_INFINITY, items: [] };
}

function directParentKey(node, registry, contract) {
  let parent = node.parent?.parent;
  while (
    parent &&
    ['JSXExpressionContainer', 'JSXFragment'].includes(parent.type)
  )
    parent = parent.parent;
  return parent?.type === 'JSXElement'
    ? { key: jsxKey(parent.openingElement.name, registry, contract) }
    : undefined;
}

function boundZone(openingElement, zone, registry, contract) {
  const prop = zone.jsx?.prop;
  if (!prop) return undefined;
  if (prop === 'children')
    return {
      node: openingElement.name,
      shape: combine(
        (openingElement.parent?.children ?? []).map((child) =>
          zoneShape(child, registry, contract),
        ),
      ),
    };
  const attribute = openingElement.attributes.find(
    (candidate) =>
      candidate.type === 'JSXAttribute' && candidate.name.name === prop,
  );
  return {
    node: attribute ?? openingElement.name,
    shape: zoneShape(attribute?.value, registry, contract),
  };
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce low-false-positive catalog parent and zone contracts.',
      url: 'https://github.com/brianwestphal/kerf/blob/main/eslint-plugin/docs/rules/ui-composition.md',
    },
    schema: UI_RULE_SCHEMA,
    messages: {
      config: `${UI_CONTRACT_LOAD_CODE}: Kerf UI catalog/profile could not be loaded: {{error}}`,
      parent:
        'KUI-L201: `{{child}}` requires one of these cataloged parents: {{parents}}.',
      zone: 'KUI-L202: `{{component}}` zone `{{zone}}` does not accept {{child}}; catalog accepts: {{accepts}}.',
      cardinality:
        'KUI-L203: `{{component}}` zone `{{zone}}` requires {{cardinality}} direct children; statically found {{count}}.',
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
        if (!registry) return;
        const key = jsxKey(node.name, registry, contract);
        const entry = contract.entries.get(key);
        if (!entry) return;
        if (
          entry.parents.mode === 'listed' &&
          !isExcepted(contract, PARENT_CODE, filename)
        ) {
          const parent = directParentKey(node, registry, contract);
          if (parent && !entry.parents.entries.includes(parent.key))
            context.report({
              node: node.name,
              messageId: 'parent',
              data: { child: key, parents: entry.parents.entries.join(', ') },
            });
        }
        for (const zone of entry.zones ?? []) {
          const bound = boundZone(node, zone, registry, contract);
          if (!bound) continue;
          const { node: reportNode, shape } = bound;
          const allowed = new Set(
            zone.accepts
              .map((accepted) =>
                accepted.includes(':')
                  ? accepted
                  : `${entry.package}:${accepted}`,
              )
              .filter((accepted) => contract.entries.has(accepted)),
          );
          if (allowed.size && !isExcepted(contract, ZONE_CODE, filename))
            for (const child of shape.items)
              if (!child.key || !allowed.has(child.key))
                context.report({
                  node: reportNode,
                  messageId: 'zone',
                  data: {
                    component: key,
                    zone: zone.id,
                    child: child.label,
                    accepts: [...allowed].join(', '),
                  },
                });
          if (isExcepted(contract, CARDINALITY_CODE, filename)) continue;
          const { min, max } = zone.cardinality;
          const tooFew = shape.max < min;
          const tooMany = max !== 'unbounded' && shape.min > max;
          if (tooFew || tooMany)
            context.report({
              node: reportNode,
              messageId: 'cardinality',
              data: {
                component: key,
                zone: zone.id,
                cardinality: `${min}..${max}`,
                count: tooFew ? shape.max : shape.min,
              },
            });
        }
      },
    };
  },
};

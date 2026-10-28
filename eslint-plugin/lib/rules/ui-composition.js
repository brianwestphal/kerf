import {
  customElementKey,
  importRegistry,
  isExcepted,
  jsxExportName,
  jsxKey,
  loadUiContract,
  UI_CONTRACT_LOAD_CODE,
  UI_RULE_SCHEMA,
} from '../ui-contract.js';

const PARENT_CODE = 'KUI-L201';
const ZONE_CODE = 'KUI-L202';
const CARDINALITY_CODE = 'KUI-L203';
const INSET_CODE = 'KUI-L204';
const INTERACTIVE_CODE = 'KUI-L205';

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
    const key =
      jsxKey(node.openingElement.name, registry, contract) ??
      customElementKey(node.openingElement.name, contract);
    const entry = contract.entries.get(key);
    const exportName = jsxExportName(node.openingElement.name, registry);
    // A second JSX export from one package entry may have its own element
    // shape. It must not impersonate the entry's root in a parent's zone.
    if (entry?.jsxExports?.[exportName])
      return {
        min: 1,
        max: 1,
        items: [{ label: `${key}:${exportName}` }],
      };
    const roots = entry?.rendersAs;
    // A declared wrapper renders one of its roots, or nothing.
    if (roots?.length)
      return {
        min: 0,
        max: 1,
        items: [{ key, roots, label: `${key} (renders ${roots.join(' | ')})` }],
      };
    return {
      min: 1,
      max: 1,
      items: [
        {
          key,
          label: key ?? jsxLabel(node.openingElement.name),
          element: node.openingElement,
        },
      ],
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
  if (parent?.type === 'JSXAttribute') parent = parent.parent?.parent;
  return parent?.type === 'JSXElement'
    ? { key: jsxKey(parent.openingElement.name, registry, contract) }
    : undefined;
}

// A prop's statically written value: `{ known: true, value }`, where a bare
// boolean prop is `true` and an absent one is `undefined`, or
// `{ known: false }` when a spread or an expression could supply it.
function staticProp(openingElement, prop) {
  const attribute = openingElement.attributes.find(
    (candidate) =>
      candidate.type === 'JSXAttribute' && candidate.name.name === prop,
  );
  if (!attribute)
    return openingElement.attributes.some(
      (candidate) => candidate.type === 'JSXSpreadAttribute',
    )
      ? { known: false }
      : { known: true, value: undefined };
  if (attribute.value === null) return { known: true, value: true };
  const value =
    attribute.value.type === 'JSXExpressionContainer'
      ? attribute.value.expression
      : attribute.value;
  if (value.type === 'Literal') return { known: true, value: value.value };
  if (value.type === 'TemplateLiteral' && value.expressions.length === 0)
    return { known: true, value: value.quasis[0].value.cooked };
  return { known: false };
}

const conditionLabel = ({ prop, equals }) =>
  equals === true
    ? `\`${prop}\``
    : typeof equals === 'string'
      ? `\`${prop}="${equals}"\``
      : `\`${prop}={${equals}}\``;

// An element owns the shared content-item inset when its geometry owns its
// margin, border, and padding, unless one of its inset-free conditions holds.
// A condition the rule cannot read statically counts as holding.
function bringsInset(entry, element) {
  const geometry = entry?.layout?.geometry;
  if (
    !geometry ||
    !['margin', 'border', 'padding'].every(
      (dimension) => geometry[dimension] === 'self',
    )
  )
    return false;
  return !(entry.insetFreeWhen ?? []).some((condition) => {
    const prop = staticProp(element, condition.prop);
    return !prop.known || prop.value === condition.equals;
  });
}

// The cataloged roots an element stands for: a declared wrapper's `rendersAs`,
// otherwise the element's own entry.
const rootsOf = (key, contract) =>
  contract.entries.get(key)?.rendersAs ?? [key];

// Whether an element renders a native control or link as its root (`root`)
// or inside it (`contains`), from its entry's `content` rules (KF-VTFKX8, the
// JSX side of validateView's KUI-V014). An export with rules of its own uses
// them; a `whenProps` rule needs one of its props written, and a literal
// `false` or `null` does not count.
function interactiveOf(openingElement, registry, contract) {
  const key =
    jsxKey(openingElement.name, registry, contract) ??
    customElementKey(openingElement.name, contract);
  const content = contract.entries.get(key)?.content;
  if (!content) return undefined;
  const exportName = jsxExportName(openingElement.name, registry);
  const rules =
    content.exports?.[exportName]?.interactive ?? content.interactive ?? [];
  const written = (prop) => {
    const value = staticProp(openingElement, prop);
    return (
      openingElement.attributes.some(
        (attribute) =>
          attribute.type === 'JSXAttribute' && attribute.name.name === prop,
      ) && !(value.known && (value.value === false || value.value === null))
    );
  };
  const kinds = rules
    .filter((rule) => !rule.whenProps || rule.whenProps.some(written))
    .map((rule) => rule.kind);
  const kind = kinds.includes('root') ? 'root' : kinds[0];
  return kind ? { key, kind } : undefined;
}

// The nearest enclosing element whose root is a control or link, through
// children, zone props, and callbacks written inside them.
function interactiveHost(openingElement, registry, contract) {
  for (
    let ancestor = openingElement.parent.parent;
    ancestor;
    ancestor = ancestor.parent
  ) {
    if (ancestor.type !== 'JSXElement') continue;
    const host = interactiveOf(ancestor.openingElement, registry, contract);
    if (host?.kind === 'root') return host;
  }
  return undefined;
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
      inset:
        'KUI-L204: `{{child}}` brings its own content-item inset (1px border + 8px padding) into `{{component}}` with {{condition}}, which expects inset-free content and double-insets it; {{fix}}.',
      interactive:
        'KUI-L205: `{{child}}` renders a control or link, so it cannot sit inside `{{host}}`, which renders one itself; the browser splits the nested markup. Place it beside the host instead.',
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
        else registry = importRegistry(node, contract, filename);
      },
      JSXOpeningElement(node) {
        if (!registry) return;
        const inner = interactiveOf(node, registry, contract);
        const host =
          inner &&
          !isExcepted(contract, INTERACTIVE_CODE, filename) &&
          interactiveHost(node, registry, contract);
        if (host)
          context.report({
            node: node.name,
            messageId: 'interactive',
            data: { child: inner.key, host: host.key },
          });
        const key = jsxKey(node.name, registry, contract);
        const entry = contract.entries.get(key);
        if (!entry) return;
        const exportName = jsxExportName(node.name, registry);
        const exportContract = entry.jsxExports?.[exportName];
        // A wrapper answers to its own parent contract and to each root's.
        // Report one violated requirement per placement, with roots first.
        const placed = exportContract
          ? [
              {
                entry: { ...entry, parents: exportContract.parents },
                child: `${key}:${exportName}`,
              },
            ]
          : [
              ...(entry.rendersAs ?? []).flatMap((root) => {
                const rootEntry = contract.entries.get(root);
                return rootEntry
                  ? [{ entry: rootEntry, child: `${key} (renders ${root})` }]
                  : [];
              }),
              { entry, child: key },
            ];
        const constrained = placed.filter(
          ({ entry: placedEntry }) => placedEntry.parents?.mode === 'listed',
        );
        if (
          constrained.length &&
          !isExcepted(contract, PARENT_CODE, filename)
        ) {
          const parent = directParentKey(node, registry, contract);
          if (parent) {
            const violation = constrained.find(
              ({ entry: placedEntry }) =>
                !rootsOf(parent.key, contract).every((root) =>
                  placedEntry.parents.entries.includes(root),
                ),
            );
            if (violation)
              context.report({
                node: node.name,
                messageId: 'parent',
                data: {
                  child: violation.child,
                  parents: violation.entry.parents.entries.join(', '),
                },
              });
          }
        }
        const insetCondition = exportContract
          ? undefined
          : entry.insetFreeChildren?.find((condition) => {
              const prop = staticProp(node, condition.prop);
              return prop.known && prop.value === condition.equals;
            });
        if (insetCondition && !isExcepted(contract, INSET_CODE, filename))
          for (const child of combine(
            (node.parent?.children ?? []).map((child) =>
              zoneShape(child, registry, contract),
            ),
          ).items) {
            const childEntry = child.element && contract.entries.get(child.key);
            if (!childEntry || !bringsInset(childEntry, child.element))
              continue;
            context.report({
              node: child.element.name,
              messageId: 'inset',
              data: {
                child: child.key,
                component: key,
                condition: conditionLabel(insetCondition),
                fix: childEntry.insetFreeWhen?.length
                  ? `set ${childEntry.insetFreeWhen.map(conditionLabel).join(' or ')}`
                  : 'use an inset-free child such as `Text flush`, or inline content',
              },
            });
          }
        for (const zone of exportContract ? [] : (entry.zones ?? [])) {
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
              if (
                child.roots
                  ? !child.roots.every((root) => allowed.has(root))
                  : !child.key || !allowed.has(child.key)
              )
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

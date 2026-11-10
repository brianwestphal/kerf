// validateView: checks a Kerf UI view document (kerf-ui-document/v1, see
// docs/26-ui-editor.md) against the component-props and composition
// catalogs. Pure and synchronous, with no Node APIs, so the editor runs it in
// the browser and the CLI runs it in Node. The catalog index, the type
// system, and the `$css` grammar it checks against live in catalog.mjs,
// types.mjs, and css-grammar.mjs.

import {
  channelOf,
  fieldParent,
  fieldZoneOf,
  isBinding,
  isObject,
  keyOf,
  propsOf,
  quoteValue,
  resolveType,
  withFieldZones,
} from './catalog.mjs';
import { childKind } from './child-kind.mjs';
import { CSS_HELPERS, parseCssCall } from './css-grammar.mjs';
import { ICON_NAME, isAssignable, isLiteralOf, literalOf } from './types.mjs';
import { hasTypeExpressions, validTypeExpression } from './type-expression.mjs';

export const VIEW_DOCUMENT_SCHEMA_ID = 'kerf-ui-document/v1';

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const CAMEL = /^[a-z][A-Za-z0-9]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const ACTION_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ACTION_PROP = /^action$|[a-z]Action$/;
// Loop variable names the generated module already uses.
const RESERVED_NAMES = new Set(['inputs', 'slots', 'each', 'handlers']);
const PARAM_KINDS = new Set([
  'string',
  'number',
  'boolean',
  'enum',
  'literal',
  'content',
  'array',
  'object',
  // The exact type of one component prop (KF-H3CB2P: app-supplied values):
  // `{ kind: 'prop', component: '@kerfjs/ui:search-field', prop: 'model' }`,
  // for values a document cannot spell, such as functions and signals.
  'prop',
]);

const only = (value, keys) =>
  Object.keys(value).filter((key) => !keys.includes(key));

// Optional props print as `T | undefined`; messages name the type itself.
function describe(type) {
  return (type?.text ?? type?.kind ?? 'unknown').replace(/ \| undefined$/, '');
}

/** Validates one param or slot-input type in the document's own grammar. */
function validateDeclaredType(ctx, type, path) {
  if (type?.typescript !== undefined) {
    if (!validTypeExpression(type))
      ctx.report(
        'KUI-V001',
        path,
        'invalid TypeScript expression or portable import context',
      );
    return;
  }
  if (!isObject(type) || !PARAM_KINDS.has(type.kind)) {
    ctx.report(
      'KUI-V001',
      path,
      `type must be one of ${[...PARAM_KINDS].join(', ')}`,
    );
    return;
  }
  if (
    type.kind === 'enum' &&
    !(Array.isArray(type.values) && type.values.length)
  ) {
    ctx.report(
      'KUI-V001',
      path,
      'an enum type needs a non-empty `values` list',
    );
  }
  if (type.kind === 'prop') {
    const owner =
      typeof type.component === 'string'
        ? ctx.catalog.components.get(type.component)?.component
        : undefined;
    if (!owner?.props.some((prop) => prop.name === type.prop)) {
      ctx.report(
        'KUI-V001',
        path,
        'a prop type names a catalog `component` key and one of its `prop`s',
      );
    }
    return;
  }
  if (type.kind === 'array') {
    if (!isObject(type.items))
      ctx.report('KUI-V001', path, 'an array type needs `items`');
    else validateDeclaredType(ctx, type.items, `${path}.items`);
  }
  if (type.kind === 'object') {
    if (!Array.isArray(type.props)) {
      ctx.report('KUI-V001', path, 'an object type needs a `props` list');
      return;
    }
    type.props.forEach((prop, index) => {
      const at = `${path}.props[${index}]`;
      if (
        !isObject(prop) ||
        typeof prop.name !== 'string' ||
        typeof prop.required !== 'boolean'
      ) {
        ctx.report(
          'KUI-V001',
          at,
          'a prop needs `name`, `type`, and `required`',
        );
        return;
      }
      validateDeclaredType(ctx, prop.type, `${at}.type`);
    });
  }
}

/** Resolves a `$bind` path to its type, or reports why it cannot. */
function bindingType(ctx, path, scope, at) {
  if (typeof path !== 'string' || path === '') {
    ctx.report('KUI-V007', at, '`$bind` needs a dotted path');
    return undefined;
  }
  const [head, ...rest] = path.split('.');
  let type = scope.get(head) ?? ctx.params.get(head)?.type;
  if (!type) {
    ctx.report(
      'KUI-V007',
      at,
      `\`$bind\` path "${path}" names nothing in scope`,
    );
    return undefined;
  }
  const project = type.typescript;
  for (const segment of rest) {
    const prop = propsOf(type, {})?.find((item) => item.name === segment);
    if (!prop) {
      if (project) return { kind: 'unknown', typescript: project };
      ctx.report(
        'KUI-V007',
        at,
        `\`$bind\` path "${path}" has no "${segment}"`,
      );
      return undefined;
    }
    type = prop.type;
  }
  return project ? { ...type, typescript: project } : type;
}

/**
 * The type of a dynamic value (`$param` or `$bind`), `null` for a literal, or
 * `undefined` after reporting an unresolvable reference.
 */
function dynamicType(ctx, value, scope, at) {
  if (!isObject(value)) return null;
  if ('$param' in value) {
    const param = ctx.params.get(value.$param);
    if (!param)
      ctx.report(
        'KUI-V007',
        at,
        `\`$param\` "${value.$param}" is not a document param`,
      );
    return param?.type;
  }
  if ('$bind' in value) return bindingType(ctx, value.$bind, scope, at);
  return null;
}

function checkPropValue(ctx, prop, value, definitions, scope, at, rowScoped) {
  if (isObject(value) && '$action' in value) {
    if (
      !ACTION_PROP.test(prop.name) ||
      resolveType(prop.type, definitions).kind !== 'string'
    ) {
      ctx.report(
        'KUI-V009',
        at,
        `\`$action\` is only valid on an action-name prop, not "${prop.name}"`,
      );
    } else if (
      typeof value.$action !== 'string' ||
      !ACTION_NAME.test(value.$action)
    ) {
      ctx.report('KUI-V001', at, 'an action name is lowercase kebab-case');
    } else {
      ctx.noteAction(value.$action, rowScoped ? 'row' : 'view', at);
    }
    return;
  }
  if (isObject(value) && '$icon' in value) {
    if (prop.iconSource !== 'lucide') {
      ctx.report(
        'KUI-V013',
        at,
        `\`$icon\` is only valid on an icon-data prop, not "${prop.name}"`,
      );
    } else if (
      typeof value.$icon !== 'string' ||
      !ICON_NAME.test(value.$icon)
    ) {
      ctx.report(
        'KUI-V013',
        at,
        'an icon name is a kebab-case Lucide name such as "inbox"',
      );
    } else if (ctx.icons && !ctx.icons.has(value.$icon)) {
      ctx.report('KUI-V013', at, `unknown Lucide icon "${value.$icon}"`);
    }
    return;
  }
  if (isObject(value) && '$css' in value) {
    const target = resolveType(prop.type, definitions);
    const kinds =
      target.kind === 'union'
        ? target.members.map((member) => member.kind)
        : [target.kind];
    if (!kinds.includes('css-value')) {
      ctx.report(
        'KUI-V010',
        at,
        `\`$css\` is only valid on a css-value prop, not "${prop.name}"`,
      );
      return;
    }
    const helpers = parseCssCall(value.$css);
    const allowed = prop.cssValue?.helpers ?? CSS_HELPERS;
    // The catalog's non-standalone helpers (`plus`) may appear nested.
    const nested = [...allowed, ...(prop.cssValue?.nonStandaloneHelpers ?? [])];
    if (
      !helpers ||
      !allowed.includes(helpers[0]) ||
      !helpers
        .slice(1)
        .every((name) => nested.includes(name) || CSS_HELPERS.includes(name))
    ) {
      ctx.report(
        'KUI-V010',
        at,
        `\`$css\` must be one literal-argument call to ${allowed.join(', ')}`,
      );
    }
    return;
  }
  const type = dynamicType(ctx, value, scope, at);
  if (type === undefined) return;
  // A param typed as a component prop binds only to that prop.
  if (type?.kind === 'prop') {
    // Outside a node's own props (a `#text` value, a `#view` prop, a `$if`
    // condition, a `$slot` input) no component prop is being set, so a
    // prop-typed value fits nothing there (KF-3624D4). Reading
    // `ctx.component` there would name whichever component was checked last.
    if (!ctx.inProps) {
      ctx.report(
        'KUI-V004',
        at,
        `a ${type.component} "${type.prop}" value fits only that prop, not "${prop.name}"`,
      );
      return;
    }
    if (type.component !== ctx.component || type.prop !== prop.name) {
      ctx.report(
        'KUI-V004',
        at,
        `a ${type.component} "${type.prop}" value does not fit "${prop.name}" of ${ctx.component}`,
      );
    }
    return;
  }
  if (type === null) {
    const hooks = {
      slot: (slot) => checkValueSlot(ctx, slot, at),
      dynamic: (item, type) =>
        nestedDynamicFits(ctx, item, type, definitions, scope, at),
    };
    if (!literalOf(value, prop.type, definitions, hooks)) {
      ctx.report(
        'KUI-V004',
        at,
        `${quoteValue(value)} is not a valid ${describe(prop.type)}`,
      );
    }
  } else if (!isAssignable(type, prop.type, definitions)) {
    ctx.report(
      'KUI-V004',
      at,
      `a ${describe(type)} value does not fit ${describe(prop.type)}`,
    );
  }
}

/**
 * A `$param` / `$bind` inside a list or object prop value (KF-3QEZFB: nested
 * params): it fits when its type is assignable to that position's type, as a
 * whole prop's does. A prop-typed param names a whole component prop, so it
 * never fits inside one. Each value object resolves once (an unknown param or
 * an out-of-scope path reports once, though a union may try it against
 * several members); an unresolved one counts as fitting, so it is not also a
 * type mismatch.
 */
function nestedDynamicFits(ctx, value, type, definitions, scope, at) {
  if (!ctx.nestedDynamics.has(value))
    ctx.nestedDynamics.set(value, dynamicType(ctx, value, scope, at));
  const found = ctx.nestedDynamics.get(value);
  if (found === undefined) return true;
  if (found?.kind === 'prop') return false;
  return isAssignable(found, type, definitions);
}

/**
 * A `$slot` inside a prop value (KF-SXDM56: item slots): the application
 * fills it with content, as a zone's `$slot`, but it passes no input. Each
 * slot object reports once, though a union may try it against several
 * members. Returns true, so a malformed slot is not also a type mismatch.
 */
function checkValueSlot(ctx, slot, at) {
  if (ctx.checkedSlots.has(slot)) return true;
  ctx.checkedSlots.add(slot);
  for (const key of only(slot, ['$slot']))
    ctx.report(
      'KUI-V001',
      `${at}`,
      `a \`$slot\` in a prop value passes no "${key}"`,
    );
  if (typeof slot.$slot !== 'string' || !CAMEL.test(slot.$slot)) {
    ctx.report('KUI-V001', at, 'a slot name is a camelCase identifier');
  } else if (ctx.slots.get(slot.$slot)?.input) {
    ctx.report(
      'KUI-V001',
      at,
      `slot "${slot.$slot}" declares an input, which a \`$slot\` in a prop value cannot pass`,
    );
  }
  return true;
}

/**
 * Why a `rootAttributes` key cannot appear in a document (KF-65FTKX: data-*
 * only), or undefined. Documents carry lowercase `data-*` names only; the
 * node marker and other `data-kerf-*` names, the row key (`data-key`), and
 * the editor's `data-editor-*` hooks are reserved for the generated view.
 */
export function dataAttributeProblem(key) {
  if (!/^data-[a-z0-9]+(?:[-_.][a-z0-9]+)*$/.test(key))
    return `"${key}" is not a lowercase data-* attribute name`;
  if (/^data-(?:kerf-|editor-|key$)/.test(key))
    return `"${key}" is reserved for the generated view and the editor`;
}

/** A zone key's binding: the composition zone, or a content (`slot`) prop. */
function zonesOf(ctx, component) {
  const zones = new Map();
  const entry =
    component.export && component.key.includes('#')
      ? undefined
      : ctx.catalog.entries.get(component.key);
  for (const zone of entry?.zones ?? []) {
    if (zone.jsx?.prop) zones.set(zone.id, { prop: zone.jsx.prop, zone });
  }
  for (const prop of component.props) {
    if (prop.slot) {
      zones.set(prop.name, {
        prop: prop.name,
        text: prop.type.acceptsText === true,
      });
    }
  }
  // A Web Awesome element's slots are its zones; its default slot is its
  // children, and slotted text is ordinary light-DOM text.
  for (const slot of component.slots ?? []) {
    zones.set(slot.name, { prop: 'children', slot: slot.name, text: true });
  }
  for (const binding of zones.values()) {
    if (binding.text === undefined) {
      const prop = component.props.find((item) => item.name === binding.prop);
      binding.text = prop?.type.acceptsText === true;
    }
  }
  return zones;
}

function variantMatches(variant, present, literals) {
  if (!variant.required.every((name) => present.has(name))) return false;
  if (variant.forbidden.some((name) => present.has(name))) return false;
  return Object.entries(variant.when ?? {}).every(([name, value]) => {
    if (!present.has(name)) return value === false || value === undefined;
    return !literals.has(name) || literals.get(name) === value;
  });
}

// Callers pass only objects: checkChild classifies non-objects, and root and
// `$each` templates are checked for a `type` before they get here.
function checkNode(ctx, node, at, scope, rowScoped, parentKey, text = false) {
  // A scoped run (validate-move.mjs) records where each node is checked:
  // these arguments and the enclosing control.
  const trace = ctx.trace;
  trace?.entries?.set(node, [
    at,
    scope,
    rowScoped,
    parentKey,
    text,
    ctx.interactiveHost,
  ]);
  ctx.noteId(node.id, at);
  if (node.type === '#text') {
    for (const key of only(node, ['id', 'type', 'value']))
      ctx.report('KUI-V001', `${at}.${key}`, 'unknown field on a text node');
    if (!text) {
      ctx.report(
        'KUI-V004',
        at,
        'this zone does not take plain text; place a text component (such as Text) instead',
      );
    }
    checkPropValue(
      ctx,
      { name: 'value', type: { kind: 'string' } },
      node.value,
      {},
      scope,
      `${at}.value`,
      rowScoped,
    );
    return;
  }
  if (node.type === '#view') {
    for (const key of only(node, ['id', 'type', 'src', 'props']))
      ctx.report('KUI-V001', `${at}.${key}`, 'unknown field on a #view node');
    checkView(ctx, node, at, scope, rowScoped);
    return;
  }
  for (const key of only(node, ['id', 'type', 'name', 'props', 'zones']))
    ctx.report('KUI-V001', `${at}.${key}`, 'unknown node field');
  const resolved =
    typeof node.type === 'string'
      ? ctx.catalog.components.get(node.type)
      : undefined;
  if (!resolved) {
    ctx.report(
      'KUI-V002',
      `${at}.type`,
      `unknown component type ${JSON.stringify(node.type)}`,
    );
    return;
  }
  const { component, definitions } = resolved;
  const pkg = keyOf(node.type).slice(0, keyOf(node.type).lastIndexOf(':'));
  if (ctx.packages && !ctx.packages.has(pkg)) {
    ctx.report(
      'KUI-V002',
      `${at}.type`,
      `${pkg} is not listed in the document's catalogs`,
    );
  }
  if (node.name !== undefined) {
    ctx.noteName(node.name, at);
    if (channelOf(component) === 'none') {
      ctx.report(
        'KUI-V011',
        `${at}.name`,
        `${node.type} has no data-* channel for the node marker, so it cannot be named`,
      );
    }
  }
  const interactive = interactiveOf(ctx.catalog, node);
  if (interactive && ctx.interactiveHost) {
    ctx.report(
      'KUI-V014',
      at,
      `${node.type} renders a control or link, so it cannot sit inside ${ctx.interactiveHost}, which renders one itself`,
    );
  }
  const host = ctx.interactiveHost;
  if (interactive === 'root' && !host) ctx.interactiveHost = node.type;
  if (trace?.shallow === node) trace.hostAfter = ctx.interactiveHost;
  const zones = zonesOf(ctx, component);
  // The component whose props are checked next, for a prop-typed param.
  ctx.component = node.type;
  const byName = new Map(component.props.map((prop) => [prop.name, prop]));
  const native = new Set(component.nativeAttributes ?? []);
  const present = new Set();
  const literals = new Map();
  if (node.props !== undefined && !isObject(node.props))
    ctx.report('KUI-V001', `${at}.props`, '`props` is an object');
  // A field zone fills a content field inside a prop value (KF-PD6QC5), so
  // the prop is checked with the zone's placeholder in that field.
  const ownProps = isObject(node.props) ? node.props : {};
  const ownZones = isObject(node.zones) ? node.zones : {};
  const filledProps = withFieldZones(
    ownProps,
    Object.fromEntries(
      Object.entries(ownZones).filter(([, children]) =>
        Array.isArray(children),
      ),
    ),
    component,
    definitions,
  );
  ctx.inProps = true;
  for (const [name, value] of Object.entries(filledProps)) {
    const propAt = `${at}.props.${name}`;
    const prop = byName.get(name);
    if ([...zones.values()].some((zone) => zone.zone && zone.prop === name)) {
      ctx.report(
        'KUI-V003',
        propAt,
        `"${name}" is a zone; fill it through \`zones\``,
      );
      continue;
    }
    if (!prop && !native.has(name)) {
      ctx.report('KUI-V003', propAt, `${node.type} has no prop "${name}"`);
      continue;
    }
    present.add(name);
    if (!isObject(value) || Array.isArray(value)) literals.set(name, value);
    // A literal data-* channel names only unreserved data-* keys (KF-65FTKX).
    if (
      name === 'rootAttributes' &&
      isObject(value) &&
      !isBinding(value) &&
      Object.keys(value).filter((key) => {
        const problem = dataAttributeProblem(key);
        if (problem) ctx.report('KUI-V015', `${propAt}.${key}`, problem);
        return problem;
      }).length
    )
      continue;
    checkPropValue(
      ctx,
      prop ?? {
        name,
        type: {
          kind: 'union',
          members: [
            { kind: 'string' },
            { kind: 'number' },
            { kind: 'boolean' },
          ],
        },
      },
      value,
      definitions,
      scope,
      propAt,
      rowScoped,
    );
  }
  ctx.inProps = false;
  if (node.zones !== undefined && !isObject(node.zones))
    ctx.report('KUI-V001', `${at}.zones`, '`zones` is an object');
  const shapes = new Map();
  for (const [zoneKey, children] of Object.entries(
    isObject(node.zones) ? node.zones : {},
  )) {
    const zoneAt = `${at}.zones.${zoneKey}`;
    const field = zones.has(zoneKey)
      ? undefined
      : fieldZoneOf(component, definitions, zoneKey);
    const binding = zones.get(zoneKey) ?? field;
    if (!binding) {
      ctx.report('KUI-V003', zoneAt, `${node.type} has no zone "${zoneKey}"`);
      continue;
    }
    if (!Array.isArray(children)) {
      ctx.report('KUI-V001', zoneAt, 'a zone is a list of children');
      continue;
    }
    if (field) {
      const own = ownProps[field.prop];
      if (isBinding(own)) {
        ctx.report(
          'KUI-V003',
          zoneAt,
          `"${field.prop}" is bound, so a zone cannot fill "${zoneKey}"`,
        );
      } else if (
        field.path.reduce(
          (current, step) =>
            current === undefined || current === null
              ? undefined
              : current[step],
          own,
        ) !== undefined
      ) {
        ctx.report(
          'KUI-V003',
          zoneAt,
          `"${zoneKey}" is set in both \`props\` and \`zones\``,
        );
      }
    } else if (isObject(node.props) && binding.prop in node.props) {
      ctx.report(
        'KUI-V003',
        zoneAt,
        `"${binding.prop}" is set in both \`props\` and \`zones\``,
      );
    }
    // KF-YCM09F: an empty zone list is an explicit null, which a required
    // prop of a nullable type (SplitView's `detail` with nothing selected)
    // accepts; a zone left out entirely still leaves the prop missing.
    if (
      children.length > 0 ||
      (!field && byName.get(binding.prop)?.type?.nullable === true)
    )
      present.add(binding.prop);
    // A field inside a value another component renders (a view's toolbar
    // config) places its children in that component (KF-THTR71).
    const parent =
      (field && fieldParent(ctx, node, component, definitions, zoneKey)) ||
      node.type;
    // A shallow run checks the node alone, noting where a child appended to
    // `trace.zone` would be checked.
    if (trace?.shallow === node) {
      if (zoneKey === trace.zone)
        trace.child = [
          `${zoneAt}[${children.length - 1}]`,
          scope,
          rowScoped,
          parent,
          binding.text,
          ctx.interactiveHost,
        ];
    } else
      children.forEach((child, index) =>
        checkChild(
          ctx,
          child,
          `${zoneAt}[${index}]`,
          scope,
          rowScoped,
          parent,
          binding.text,
        ),
      );
    shapes.set(zoneKey, combine(children.map((child) => childShape(child))));
  }
  ctx.interactiveHost = host;
  if (component.variants) {
    if (
      !component.variants.some((variant) =>
        variantMatches(variant, present, literals),
      )
    ) {
      ctx.report(
        'KUI-V004',
        at,
        `${node.type} props match none of its variants`,
      );
    }
  } else {
    for (const prop of component.props) {
      if (prop.required && !prop.variantOnly && !present.has(prop.name)) {
        ctx.report('KUI-V005', at, `${node.type} requires "${prop.name}"`);
      }
    }
  }
  checkComposition(ctx, node, at, parentKey, shapes, literals, zones);
}

/**
 * An `$each` template: one keyable node, or (KF-8J8E5V: per-item row
 * designs) an `$if` chain whose every branch is one. `else` is required, so
 * each item yields exactly one row and a repeat never filters.
 */
function checkTemplate(
  ctx,
  template,
  at,
  scope,
  parentKey,
  text,
  chain = true,
) {
  // A chain nests only in `else`; `then` is always one node.
  if (chain && isObject(template) && '$if' in template) {
    for (const key of only(template, ['$if', 'then', 'else']))
      ctx.report('KUI-V001', `${at}.${key}`, 'unknown `$if` field');
    checkPropValue(
      ctx,
      { name: 'condition', type: { kind: 'boolean' } },
      template.$if,
      {},
      scope,
      `${at}.$if`,
      true,
    );
    checkTemplate(
      ctx,
      template.then,
      `${at}.then`,
      scope,
      parentKey,
      text,
      false,
    );
    if ('else' in template)
      checkTemplate(ctx, template.else, `${at}.else`, scope, parentKey, text);
    else
      ctx.report(
        'KUI-V008',
        at,
        'a template `$if` needs an `else`, so every item yields exactly one row',
      );
    return;
  }
  if (!isObject(template) || !('type' in template)) {
    ctx.report(
      'KUI-V008',
      at,
      'the template is exactly one node, or an `$if` chain of them',
    );
    return;
  }
  const entry = ctx.catalog.components.get(template.type);
  if (entry && channelOf(entry.component) === 'none') {
    ctx.report(
      'KUI-V008',
      at,
      `${template.type} has no data-* channel to carry the row key`,
    );
  }
  checkNode(ctx, template, at, scope, true, parentKey, text);
}

/**
 * An `$each`'s rows: exactly one of `template` (one node or an `$if` chain)
 * and `templates`, a map of one node per item kind picked by `kind`
 * (KF-YX6HMT: keyed row designs). `templates` needs a `default`, which an
 * item of any other kind takes, so every item yields exactly one row.
 */
function checkRows(ctx, child, at, scope, parentKey, text) {
  if (!('templates' in child)) {
    if ('kind' in child)
      ctx.report(
        'KUI-V008',
        `${at}.kind`,
        '`kind` picks one of `templates`; this `$each` has none',
      );
    checkTemplate(
      ctx,
      child.template,
      `${at}.template`,
      scope,
      parentKey,
      text,
    );
    return;
  }
  if ('template' in child)
    ctx.report(
      'KUI-V008',
      at,
      'an `$each` has exactly one of `template` and `templates`',
    );
  const templates = isObject(child.templates) ? child.templates : {};
  if (!('default' in templates))
    ctx.report(
      'KUI-V008',
      `${at}.templates`,
      '`templates` needs a `default` row design, which an item of any other kind takes',
    );
  if ('kind' in child)
    checkPropValue(
      ctx,
      { name: 'kind', type: { kind: 'string' } },
      child.kind,
      {},
      scope,
      `${at}.kind`,
      true,
    );
  else
    ctx.report(
      'KUI-V008',
      `${at}.kind`,
      '`templates` needs a `kind` that resolves to a string on the item',
    );
  for (const [kind, template] of Object.entries(templates)) {
    const path = `${at}.templates.${kind}`;
    if (!isObject(template) || !('type' in template))
      ctx.report(
        'KUI-V008',
        path,
        'each `templates` entry is exactly one node',
      );
    else checkTemplate(ctx, template, path, scope, parentKey, text, false);
  }
}

/**
 * The templates an `$each` can render a row from: its `template`, or every
 * entry of its `templates` map in order (KF-YX6HMT). Each is one node or an
 * `$if` chain of them.
 */
export function eachTemplates(each) {
  if (!('templates' in each)) return [each.template];
  // A malformed map is one malformed template, so walkers report it.
  return isObject(each.templates)
    ? Object.values(each.templates)
    : [each.templates];
}

/** Every node an `$each` can render a row from, in order; the first keys it. */
export function eachNodes(each) {
  return eachTemplates(each).flatMap(templateNodes);
}

/**
 * The nodes an `$each` template can render, in branch order: the template
 * itself, or every leaf of its `$if` chain.
 */
export function templateNodes(template) {
  if (isObject(template) && '$if' in template)
    return [
      ...templateNodes(template.then),
      ...('else' in template ? templateNodes(template.else) : []),
    ];
  return isObject(template) ? [template] : [];
}

function checkChild(ctx, child, at, scope, rowScoped, parentKey, text = false) {
  if (!isObject(child)) {
    ctx.report('KUI-V001', at, 'a zone child is an object');
    return;
  }
  switch (childKind(child)) {
    case 'each':
      return checkEach(ctx, child, at, scope, rowScoped, parentKey, text);
    case 'if':
      return checkIf(ctx, child, at, scope, rowScoped, parentKey, text);
    case 'slot':
      return checkSlot(ctx, child, at, scope, rowScoped);
    default:
      return checkNode(ctx, child, at, scope, rowScoped, parentKey, text);
  }
}

/** Checks an `$each` child: its fields, source list, key, and rows. */
function checkEach(ctx, child, at, scope, rowScoped, parentKey, text) {
  for (const key of only(child, [
    '$each',
    'as',
    'key',
    'template',
    'templates',
    'kind',
  ]))
    ctx.report('KUI-V001', `${at}.${key}`, 'unknown `$each` field');
  // KF-CFA1S1: an inner `$each` in this document renders as a plain map, but
  // a document composed into another's row cannot know it is in one: its
  // module renders a keyed each(), which kerf refuses inside a row render.
  if (ctx.rowHost && !rowScoped) {
    ctx.report(
      'KUI-V016',
      at,
      'a document composed into an `$each` row cannot repeat; move the `$each` into the composing document',
    );
  }
  const source = dynamicType(ctx, child.$each, scope, `${at}.$each`);
  const list = source ? resolveType(source, {}) : undefined;
  if (source === null)
    ctx.report(
      'KUI-V008',
      `${at}.$each`,
      '`$each` iterates a `$param` or `$bind`, not a literal',
    );
  else if (list && list.kind !== 'array')
    ctx.report(
      'KUI-V008',
      `${at}.$each`,
      `\`$each\` needs an array, not ${describe(list)}`,
    );
  // kerf's each() keys rows by item identity, so items are objects.
  else if (
    list &&
    !['object', 'unknown', 'record'].includes(resolveType(list.items, {}).kind)
  ) {
    ctx.report(
      'KUI-V008',
      `${at}.$each`,
      '`$each` items are objects (each() keys rows by item identity)',
    );
  }
  if (
    typeof child.as !== 'string' ||
    !CAMEL.test(child.as) ||
    RESERVED_NAMES.has(child.as) ||
    ctx.params.has(child.as) ||
    scope.has(child.as)
  ) {
    ctx.report(
      'KUI-V008',
      `${at}.as`,
      '`as` names the item with a camelCase identifier that is not reserved, a param, or an outer item',
    );
    return;
  }
  const inner = new Map(scope).set(
    child.as,
    list?.kind === 'array' ? list.items : { kind: 'unknown' },
  );
  const keyType =
    typeof child.key === 'string' && child.key.split('.')[0] === child.as
      ? bindingType(ctx, child.key, inner, `${at}.key`)
      : undefined;
  const keyKind = keyType && resolveType(keyType, {}).kind;
  if (!keyType || !['string', 'number', 'unknown'].includes(keyKind)) {
    ctx.report(
      'KUI-V008',
      `${at}.key`,
      '`key` is a path on the item that resolves to a string or number',
    );
  }
  checkRows(ctx, child, at, inner, parentKey, text);
}

/** Checks an `$if` child: its condition and both branches. */
function checkIf(ctx, child, at, scope, rowScoped, parentKey, text) {
  for (const key of only(child, ['$if', 'then', 'else']))
    ctx.report('KUI-V001', `${at}.${key}`, 'unknown `$if` field');
  checkPropValue(
    ctx,
    { name: 'condition', type: { kind: 'boolean' } },
    child.$if,
    {},
    scope,
    `${at}.$if`,
    rowScoped,
  );
  checkChild(ctx, child.then, `${at}.then`, scope, rowScoped, parentKey, text);
  if ('else' in child)
    checkChild(
      ctx,
      child.else,
      `${at}.else`,
      scope,
      rowScoped,
      parentKey,
      text,
    );
}

/** Checks a `$slot` child: its name and the input it passes. */
function checkSlot(ctx, child, at, scope, rowScoped) {
  for (const key of only(child, ['$slot', 'input']))
    ctx.report('KUI-V001', `${at}.${key}`, 'unknown `$slot` field');
  if (typeof child.$slot !== 'string' || !CAMEL.test(child.$slot)) {
    ctx.report(
      'KUI-V001',
      `${at}.$slot`,
      'a slot name is a camelCase identifier',
    );
    return;
  }
  const declared = ctx.slots.get(child.$slot);
  const props = declared?.input?.props ?? [];
  if (child.input !== undefined && !declared?.input) {
    ctx.report(
      'KUI-V001',
      `${at}.input`,
      `slot "${child.$slot}" declares no input`,
    );
    return;
  }
  const given = isObject(child.input) ? child.input : {};
  for (const prop of props) {
    if (!(prop.name in given)) {
      if (prop.required)
        ctx.report(
          'KUI-V005',
          `${at}.input`,
          `slot "${child.$slot}" requires input "${prop.name}"`,
        );
      continue;
    }
    checkPropValue(
      ctx,
      prop,
      given[prop.name],
      {},
      scope,
      `${at}.input.${prop.name}`,
      rowScoped,
    );
  }
  for (const name of Object.keys(given)) {
    if (!props.some((prop) => prop.name === name))
      ctx.report(
        'KUI-V003',
        `${at}.input.${name}`,
        `slot "${child.$slot}" has no input "${name}"`,
      );
  }
}

/**
 * KF-3X7MFF: where a `#view`'s `src` points, relative to the top document's
 * folder, from the composing document at `from` (undefined for the top
 * document): `src` resolves from the folder of the document that contains it,
 * as each generated module imports its children. A posix path with `.`
 * segments removed and `..` folded; it may start with `../` (or `/`).
 */
export function composedViewPath(from, src) {
  const parts = from === undefined ? [] : from.split('/').slice(0, -1);
  if (src.startsWith('/')) parts.length = 0;
  for (const part of src.split('/')) {
    if (part === '' || part === '.') continue;
    if (part !== '..') parts.push(part);
    // `..` folds a folder; above the root (`/`) it stays at the root.
    else if (parts.length && parts.at(-1) !== '..') {
      if (parts.at(-1) !== '') parts.pop();
    } else parts.push(part);
  }
  return `${src.startsWith('/') ? '/' : ''}${parts.join('/')}`;
}

function checkView(ctx, node, at, scope, rowScoped) {
  if (typeof node.src !== 'string' || node.src === '') {
    ctx.report(
      'KUI-V012',
      `${at}.src`,
      'a #view node names its document in `src`',
    );
    return;
  }
  if (!ctx.resolveView) return;
  // Cycles compare where sources point, not their text: the same `src` in
  // two folders names two documents.
  const path = composedViewPath(ctx.viewPath, node.src);
  if (ctx.viewStack.includes(path)) {
    ctx.report('KUI-V012', `${at}.src`, `#view "${node.src}" is cyclic`);
    return;
  }
  const child = ctx.resolveView(node.src, path);
  if (!isObject(child)) {
    ctx.report('KUI-V012', `${at}.src`, `#view "${node.src}" was not found`);
    return;
  }
  if (isObject(child.slots) && Object.keys(child.slots).length > 0) {
    ctx.report(
      'KUI-V012',
      `${at}.src`,
      `#view "${node.src}" declares slots, which a composing document cannot fill`,
    );
  }
  const params = isObject(child.params) ? child.params : {};
  const given = isObject(node.props) ? node.props : {};
  for (const [name, value] of Object.entries(given)) {
    if (!isObject(params[name])) {
      ctx.report(
        'KUI-V012',
        `${at}.props.${name}`,
        `#view "${node.src}" has no param "${name}"`,
      );
      continue;
    }
    checkPropValue(
      ctx,
      { name, type: params[name].type },
      value,
      {},
      scope,
      `${at}.props.${name}`,
      rowScoped,
    );
  }
  for (const [name, param] of Object.entries(params)) {
    if (
      isObject(param) &&
      !('default' in param) &&
      param.optional !== true &&
      !(name in given)
    ) {
      ctx.report(
        'KUI-V012',
        at,
        `#view "${node.src}" requires param "${name}"`,
      );
    }
  }
  const nested = validateView(child, ctx.catalog, {
    resolveView: ctx.resolveView,
    icons: ctx.icons,
    viewStack: [...ctx.viewStack, path],
    viewPath: path,
    // A composed document inside a control renders inside it too.
    interactiveHost: ctx.interactiveHost,
    // ... and one inside a row renders inside that row.
    rowHost: ctx.rowHost || rowScoped,
  });
  for (const diagnostic of nested.diagnostics) {
    ctx.report(
      diagnostic.code,
      `${at}{${node.src}}${diagnostic.path.slice(1)}`,
      diagnostic.message,
    );
  }
  // KF-RDZ7N7: a document composed into a row renders inside that keyed row,
  // and the generated row passes its key to the composed root, so a delegated
  // handler reads the row key there. Its actions are row actions of the
  // composing document; its own contract keeps them view-scoped, since
  // standalone it has no row.
  for (const [name, actionScope] of nested.actions)
    ctx.noteAction(name, rowScoped ? 'row' : actionScope, at);
}

// Zone shapes, as the ESLint rule computes them over JSX: how many direct
// children a zone can hold at least and at most, and which ones.
const shape = (min, max, items) => ({ min, max, items });
function combine(shapes) {
  return shapes.reduce(
    (total, item) =>
      shape(total.min + item.min, total.max + item.max, [
        ...total.items,
        ...item.items,
      ]),
    shape(0, 0, []),
  );
}
function childShape(child) {
  if (!isObject(child)) return shape(0, 0, []);
  switch (childKind(child)) {
    case 'each': {
      const items = eachTemplates(child).flatMap((template) =>
        isObject(template) ? childShape(template).items : [],
      );
      return shape(0, Number.POSITIVE_INFINITY, items);
    }
    case 'if': {
      const then = childShape(child.then);
      const otherwise =
        'else' in child ? childShape(child.else) : shape(0, 0, []);
      return shape(
        Math.min(then.min, otherwise.min),
        Math.max(then.max, otherwise.max),
        [...then.items, ...otherwise.items],
      );
    }
    case 'slot':
    case 'view':
      return shape(1, 1, []);
    default:
      if (child.type === '#text') return shape(1, 1, [{ label: 'text' }]);
      return shape(1, 1, [{ node: child }]);
  }
}

// Interactive content (HTML's button, a, input, label, and so on) cannot hold
// more of it: the parser splits the host and the row contract breaks. An
// entry's `content.interactive` rules say whether a node renders a control as
// its root or inside it; `content.exports` does the same per JSX export.
function interactiveOf(catalog, node) {
  const [base, exportName] = node.type.split('#');
  const content = catalog.entries.get(base)?.content;
  const rules = exportName
    ? content?.exports?.[exportName]?.interactive
    : content?.interactive;
  const props = isObject(node.props) ? node.props : {};
  const applies = (rule) =>
    !rule.whenProps ||
    rule.whenProps.some((name) => props[name] != null && props[name] !== false);
  const matched = (rules ?? []).filter(applies).map((rule) => rule.kind);
  return matched.includes('root') ? 'root' : matched[0];
}

const conditionLabel = ({ prop, equals }) =>
  `\`${prop}=${JSON.stringify(equals)}\``;

function bringsInset(entry, node) {
  const geometry = entry?.layout?.geometry;
  if (
    !geometry ||
    !['margin', 'border', 'padding'].every((side) => geometry[side] === 'self')
  )
    return false;
  const props = isObject(node.props) ? node.props : {};
  return !(entry.insetFreeWhen ?? []).some((condition) => {
    const value = props[condition.prop];
    const known = !isObject(value);
    return !known || value === condition.equals;
  });
}

function checkComposition(
  ctx,
  node,
  at,
  parentKey,
  shapes,
  literals,
  bindings,
) {
  const [base, exportName] = node.type.split('#');
  const entry = ctx.catalog.entries.get(base);
  if (!entry) return;
  const exportContract = exportName
    ? entry.jsxExports?.[exportName]
    : undefined;
  const rootsOf = (key) => ctx.catalog.entries.get(key)?.rendersAs ?? [key];
  const parents = exportName ? exportContract?.parents : entry.parents;
  if (parents?.mode === 'listed' && parentKey) {
    const parentRoots = rootsOf(keyOf(parentKey));
    if (!parentRoots.every((root) => parents.entries.includes(root))) {
      ctx.report(
        'KUI-L201',
        at,
        `\`${node.type}\` requires one of these cataloged parents: ${parents.entries.join(', ')}`,
      );
    }
  }
  if (exportName) return;
  const insetCondition = (entry.insetFreeChildren ?? []).find(
    (condition) =>
      literals.has(condition.prop) &&
      literals.get(condition.prop) === condition.equals,
  );
  for (const zone of entry.zones ?? []) {
    if (!zone.jsx?.prop) continue;
    const found = shapes.get(zone.id) ?? shape(0, 0, []);
    const allowed = new Set(
      zone.accepts
        .map((accepted) =>
          accepted.includes(':') ? accepted : `${entry.package}:${accepted}`,
        )
        .filter((accepted) => ctx.catalog.entries.has(accepted)),
    );
    if (allowed.size) {
      for (const item of found.items) {
        const key = item.node
          ? item.node.type.includes('#')
            ? item.node.type.replace('#', ':')
            : item.node.type
          : undefined;
        const roots = key ? rootsOf(key) : [];
        if (!key || !roots.every((root) => allowed.has(root))) {
          ctx.report(
            'KUI-L202',
            `${at}.zones.${zone.id}`,
            `\`${node.type}\` zone \`${zone.id}\` does not accept ${key ?? item.label}; catalog accepts: ${[...allowed].join(', ')}`,
          );
        }
      }
    }
    const { min, max } = zone.cardinality;
    if (found.max < min || (max !== 'unbounded' && found.min > max)) {
      ctx.report(
        'KUI-L203',
        `${at}.zones.${zone.id}`,
        `\`${node.type}\` zone \`${zone.id}\` requires ${min}..${max} direct children; found ${found.max < min ? found.max : found.min}`,
      );
    }
  }
  // The inset rule reads the children region, whether the catalog binds it
  // as a zone or the component exposes it as a content prop.
  const childrenKey = [...bindings].find(
    ([, binding]) => binding.prop === 'children',
  )?.[0];
  const children = childrenKey ? shapes.get(childrenKey) : undefined;
  if (!insetCondition || !children) return;
  for (const item of children.items) {
    const childEntry = item.node && ctx.catalog.entries.get(item.node.type);
    if (!childEntry || !bringsInset(childEntry, item.node)) continue;
    const fix = childEntry.insetFreeWhen?.length
      ? `set ${childEntry.insetFreeWhen.map(conditionLabel).join(' or ')}`
      : 'use an inset-free child';
    ctx.report(
      'KUI-L204',
      `${at}.zones.${childrenKey}`,
      `\`${item.node.type}\` brings its own content-item inset into \`${node.type}\` with ${conditionLabel(insetCondition)}, which expects inset-free content; ${fix}`,
    );
  }
}

/**
 * Kerf UI's whole-screen layouts: each fills its parent's height and has no
 * height of its own, so below the root it collapses to its bar unless a
 * SizedRegion or another of these layouts gives it a height (KF-KQ72TW).
 */
const SCREEN_LAYOUTS = new Set([
  '@kerfjs/ui:nav-stack',
  '@kerfjs/ui:split-view',
  '@kerfjs/ui:tab-navigator',
  '@kerfjs/ui:workbench',
]);
const SIZED_REGION = '@kerfjs/ui:sized-region';

const PANE = '@kerfjs/ui:pane';

/**
 * Whether `node`'s `zone` gives a child a definite height. A SizedRegion or
 * another whole-screen layout always does. A Pane with a literal `fill: true`
 * gives its `content` zone one when the Pane itself sits in a sized place (the
 * root, inside a SizedRegion or layout), since its rows then have a height
 * (KF-AMEZB3: a filled root Pane sizes a nested layout).
 */
function zoneSizes(node, zone, sized) {
  if (node.type === SIZED_REGION || SCREEN_LAYOUTS.has(node.type)) return true;
  return (
    sized &&
    node.type === PANE &&
    zone === 'content' &&
    isObject(node.props) &&
    node.props.fill === true
  );
}

/**
 * `KUI-H001` hints (non-blocking): a whole-screen layout below the root whose
 * place has no definite height: its parent is not a SizedRegion, another
 * whole-screen layout, or a filled Pane's content in a sized place. `sized`
 * is whether `node` itself sits in a place with a definite height.
 */
function hintUnsizedLayouts(node, at, sized, hints, isRoot = false) {
  if (!isObject(node) || typeof node.type !== 'string') return;
  if (!isRoot && !sized && SCREEN_LAYOUTS.has(node.type))
    hints.push({
      code: 'KUI-H001',
      path: at,
      message: `${node.type} has no height of its own here and collapses to its bar; wrap it in ${SIZED_REGION}`,
    });
  const child = (item, path, childSized) => {
    if (!isObject(item)) return;
    switch (childKind(item)) {
      case 'each':
        if ('templates' in item)
          for (const [kind, template] of Object.entries(
            isObject(item.templates) ? item.templates : {},
          ))
            child(template, `${path}.templates.${kind}`, childSized);
        else child(item.template, `${path}.template`, childSized);
        break;
      case 'if':
        child(item.then, `${path}.then`, childSized);
        if ('else' in item) child(item.else, `${path}.else`, childSized);
        break;
      default:
        hintUnsizedLayouts(item, path, childSized, hints);
    }
  };
  for (const [zone, children] of Object.entries(
    isObject(node.zones) ? node.zones : {},
  )) {
    const childSized = zoneSizes(node, zone, sized);
    if (Array.isArray(children))
      children.forEach((item, index) =>
        child(item, `${at}.zones.${zone}[${index}]`, childSized),
      );
  }
}

/**
 * Validates a view document. Returns `{ valid, diagnostics, hints, actions }`,
 * where each diagnostic is `{ code, path, message }` (a `KUI-V###` document id
 * or a `KUI-L201`–`L204` composition id) and `actions` maps each action name
 * to its `row` or `view` scope. `hints` are non-blocking `KUI-H###` advice
 * about a valid document (a nested layout with no height); they never make it
 * invalid. `options.resolveView(src, path)` loads a composed document, where
 * `path` is where `src` points relative to the top document's folder (each
 * `src` resolves from the document that contains it); without it, `#view`
 * nodes are checked for shape only.
 */
export function validateView(document, catalog, options = {}) {
  return runView(document, catalog, options);
}

/**
 * A validation context: the options, a diagnostics sink, and the id, name,
 * and action tables. A `trace` marks a scoped run (validate-move.mjs): it
 * records each action use, and a `quiet` one leaves conflicts to its caller.
 */
function createContext(catalog, options, trace) {
  const diagnostics = [];
  const ids = new Map();
  const names = new Map();
  const actions = new Map();
  const ctx = {
    catalog,
    diagnostics,
    actions,
    trace,
    resolveView: options.resolveView,
    icons: options.icons ? new Set(options.icons) : undefined,
    viewStack: options.viewStack ?? [],
    viewPath: options.viewPath,
    params: new Map(),
    slots: new Map(),
    checkedSlots: new WeakSet(),
    nestedDynamics: new WeakMap(),
    packages: undefined,
    interactiveHost: options.interactiveHost,
    rowHost: options.rowHost === true,
    report(code, path, message) {
      diagnostics.push({ code, path, message });
    },
    noteId(id, at) {
      if (typeof id !== 'string' || !ULID.test(id)) {
        ctx.report('KUI-V006', `${at}.id`, 'a node id is a 26-character ULID');
      } else if (ids.has(id)) {
        ctx.report(
          'KUI-V006',
          `${at}.id`,
          `duplicate node id ${id} (first at ${ids.get(id)})`,
        );
      } else ids.set(id, at);
    },
    noteName(name, at) {
      if (typeof name !== 'string' || !CAMEL.test(name)) {
        ctx.report(
          'KUI-V006',
          `${at}.name`,
          'a node name is a camelCase identifier',
        );
      } else if (names.has(name)) {
        ctx.report(
          'KUI-V006',
          `${at}.name`,
          `duplicate node name "${name}" (first at ${names.get(name)})`,
        );
      } else names.set(name, at);
    },
    noteAction(name, scope, at) {
      if (trace) {
        trace.notes.push([name, scope]);
        if (trace.quiet) return;
      }
      const seen = actions.get(name);
      if (seen && seen !== scope) {
        ctx.report(
          'KUI-V009',
          at,
          `action "${name}" is used with both row and view scope`,
        );
      } else actions.set(name, scope);
    },
  };
  return ctx;
}

/**
 * Checks a document's own fields, params, and slots into `ctx`, which then
 * knows them. False when the document is not an object.
 */
function checkHeader(ctx, document) {
  if (!isObject(document)) {
    ctx.report('KUI-V001', '$', 'a view document is a JSON object');
    return false;
  }
  for (const key of only(document, [
    '$schema',
    'schema',
    'name',
    'catalogs',
    'params',
    'slots',
    'root',
  ])) {
    ctx.report('KUI-V001', `$.${key}`, 'unknown top-level field');
  }
  if (document.schema !== VIEW_DOCUMENT_SCHEMA_ID) {
    ctx.report(
      'KUI-V001',
      '$.schema',
      `schema must be "${VIEW_DOCUMENT_SCHEMA_ID}"`,
    );
  }
  if (typeof document.name !== 'string' || !PASCAL.test(document.name)) {
    ctx.report('KUI-V001', '$.name', 'name is a PascalCase identifier');
  }
  if (
    !Array.isArray(document.catalogs) ||
    document.catalogs.some((item) => typeof item !== 'string')
  ) {
    ctx.report(
      'KUI-V001',
      '$.catalogs',
      'catalogs is a list of package names or catalog paths',
    );
  } else {
    // Only package names can be checked here; a path's package is the caller's
    // to resolve, so a document naming any path skips the package check.
    const pathLike = document.catalogs.some(
      (item) => item.startsWith('.') || item.startsWith('/'),
    );
    if (!pathLike) ctx.packages = new Set(document.catalogs);
  }
  for (const [name, param] of Object.entries(
    isObject(document.params) ? document.params : {},
  )) {
    const at = `$.params.${name}`;
    if (!CAMEL.test(name) || !isObject(param)) {
      ctx.report(
        'KUI-V001',
        at,
        'a param is a camelCase name mapped to `{ type, default?, optional? }`',
      );
      continue;
    }
    for (const key of only(param, [
      'type',
      'default',
      'optional',
      'description',
    ]))
      ctx.report('KUI-V001', `${at}.${key}`, 'unknown param field');
    // KF-JE8KHX: `optional: true` makes an input optional with no default,
    // so an omitted value reads as absent (an optional item field extracted
    // into a row document).
    if ('optional' in param && (param.optional !== true || 'default' in param))
      ctx.report(
        'KUI-V001',
        `${at}.optional`,
        'optional is `true`, on a param with no default (a default already makes it optional)',
      );
    validateDeclaredType(ctx, param.type, `${at}.type`);
    // A prop-typed param's default is a literal of that prop (KF-V9V2B6: a
    // Select's choices promoted with their current list).
    const owner =
      param.type?.kind === 'prop'
        ? ctx.catalog.components.get(param.type.component)
        : undefined;
    const ownerProp = owner?.component.props.find(
      (prop) => prop.name === param.type.prop,
    );
    if (
      'default' in param &&
      PARAM_KINDS.has(param.type?.kind) &&
      !(ownerProp
        ? isLiteralOf(param.default, ownerProp.type, owner.definitions)
        : isLiteralOf(param.default, param.type))
    ) {
      ctx.report(
        'KUI-V004',
        `${at}.default`,
        `the default is not a valid ${describe(param.type)}`,
      );
    }
    ctx.params.set(name, param);
  }
  if (document.params !== undefined && !isObject(document.params))
    ctx.report('KUI-V001', '$.params', 'params is an object');
  for (const [name, slot] of Object.entries(
    isObject(document.slots) ? document.slots : {},
  )) {
    const at = `$.slots.${name}`;
    if (!CAMEL.test(name) || !isObject(slot)) {
      ctx.report(
        'KUI-V001',
        at,
        'a slot is a camelCase name mapped to `{ input? }`',
      );
      continue;
    }
    for (const key of only(slot, ['input', 'description']))
      ctx.report('KUI-V001', `${at}.${key}`, 'unknown slot field');
    if (slot.input !== undefined) {
      if (slot.input?.kind !== 'object')
        ctx.report('KUI-V001', `${at}.input`, 'a slot input is an object type');
      else validateDeclaredType(ctx, slot.input, `${at}.input`);
    }
    ctx.slots.set(name, slot);
  }
  return true;
}

/**
 * `validateView` with an optional `trace` (validate-move.mjs): its
 * `entries` map, when given, records where each node is checked. Internal.
 */
export function runView(document, catalog, options, trace) {
  const ctx = createContext(catalog, options, trace);
  const { diagnostics, actions } = ctx;
  if (!checkHeader(ctx, document))
    return { valid: false, diagnostics, hints: [], actions };
  // KF-PK3GVY: an editor's empty draft has no root yet; it is a document,
  // but nothing can generate or render it until a component becomes one.
  if (document.root === undefined) {
    ctx.report(
      'KUI-V017',
      '$.root',
      'the document has no root; add a component to start it',
    );
  } else if (!isObject(document.root) || !('type' in document.root)) {
    ctx.report('KUI-V001', '$.root', 'root is exactly one node');
  } else {
    checkNode(ctx, document.root, '$.root', new Map(), false, undefined);
  }
  const hints = [];
  if (hasTypeExpressions(document))
    hints.push({
      code: 'KUI-H002',
      path: '$.params',
      message:
        'TypeScript parameter expressions require the owning project compiler; this pass checks structure only.',
    });
  hintUnsizedLayouts(document.root, '$.root', true, hints, true);
  return { valid: diagnostics.length === 0, diagnostics, hints, actions };
}

/**
 * Checks pieces of `document` alone (KF-SFAA5R: scoped move validation), as
 * `validateView(document, catalog)` checks them in the place `entry`
 * describes (an `entries` record of a traced run). Returns a function that
 * checks `item`, a node (or, with `asChild`, any zone child) and its
 * subtree, or, with `shallow`, the node alone, noting where a child appended
 * to `zone` would be checked. Action conflicts and duplicate ids and names
 * are left to the caller: each run has its own tables. Internal.
 */
export function createScopedCheck(document, catalog) {
  const header = createContext(catalog, {});
  checkHeader(header, document);
  return (item, entry, { asChild = false, shallow = false, zone } = {}) => {
    const trace = {
      quiet: true,
      notes: [],
      shallow: shallow ? item : undefined,
      zone,
      child: undefined,
      hostAfter: undefined,
    };
    const ctx = createContext(catalog, {}, trace);
    ctx.params = header.params;
    ctx.slots = header.slots;
    ctx.packages = header.packages;
    ctx.interactiveHost = entry[5];
    (asChild ? checkChild : checkNode)(ctx, item, ...entry.slice(0, 5));
    return { ...trace, diagnostics: ctx.diagnostics };
  };
}

/**
 * What a parent's checks read of node `node` as its child: its type and
 * whether it brings its own content-item inset (`KUI-L204`). Internal.
 */
export const childFacts = (catalog, node) =>
  `${node.type} ${bringsInset(catalog.entries.get(node.type), node)}`;

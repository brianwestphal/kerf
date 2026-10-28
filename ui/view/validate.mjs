// validateView: checks a Kerf UI view document (kerf-ui-document/v1, see
// docs/26-ui-editor.md) against the component-props and composition
// catalogs. Pure and synchronous, with no Node APIs, so the editor runs it in
// the browser and the CLI runs it in Node.

export const VIEW_DOCUMENT_SCHEMA_ID = 'kerf-ui-document/v1';

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const CAMEL = /^[a-z][A-Za-z0-9]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const ACTION_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ACTION_PROP = /^action$|[a-z]Action$/;
// Loop variable names the generated module already uses.
const RESERVED_NAMES = new Set(['inputs', 'slots', 'each', 'handlers']);
// Every builder `@kerfjs/ui/css-values` exports; a css-value prop without a
// catalog `cssValue` restriction accepts any of them.
const CSS_HELPERS = [
  'calc',
  'colorVar',
  'em',
  'fillColor',
  'flex',
  'foregroundColor',
  'foregroundColorVar',
  'lengthVar',
  'pct',
  'plus',
  'px',
  'rem',
  'remify',
  'space',
  'uiColor',
];
const PARAM_KINDS = new Set([
  'string',
  'number',
  'boolean',
  'enum',
  'literal',
  'content',
  'array',
  'object',
]);

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const only = (value, keys) =>
  Object.keys(value).filter((key) => !keys.includes(key));
const keyOf = (type) => type.split('#')[0];

/**
 * Indexes component-props and composition documents for validation. Each
 * component keeps the `definitions` table of the document that declared it,
 * so two packages' same-named types never collide.
 */
export function createViewCatalog({ props = [], composition = [] }) {
  const components = new Map();
  for (const document of props) {
    for (const component of document.components ?? []) {
      components.set(component.key, {
        component,
        definitions: document.definitions ?? {},
      });
    }
  }
  const entries = new Map();
  for (const document of composition) {
    for (const entry of document.entries ?? []) entries.set(entry.key, entry);
  }
  return { components, entries };
}

function resolveType(type, definitions) {
  let current = type;
  for (let hops = 0; current?.kind === 'ref' && hops < 32; hops += 1) {
    current = definitions[current.ref];
  }
  return current ?? { kind: 'unknown' };
}

const propsOf = (type, definitions) => resolveType(type, definitions).props;

/** Whether a value of type `from` (a param or binding) fits type `to`. */
export function isAssignable(from, to, definitions = {}) {
  const target = resolveType(to, definitions);
  const source = resolveType(from, definitions);
  if (target.kind === 'unknown' || source.kind === 'unknown') return true;
  if (target.kind === 'union') {
    return target.members.some((member) =>
      isAssignable(source, member, definitions),
    );
  }
  const values =
    source.kind === 'enum'
      ? source.values
      : source.kind === 'literal'
        ? [source.value]
        : undefined;
  if (values) {
    if (target.kind === 'enum') {
      return values.every((value) => target.values.includes(value));
    }
    if (target.kind === 'literal') {
      return values.length === 1 && values[0] === target.value;
    }
    return values.every((value) => isLiteralOf(value, target, definitions));
  }
  switch (source.kind) {
    case 'string':
    case 'number':
      return (
        target.kind === source.kind ||
        (target.kind === 'content' && target.acceptsText === true)
      );
    case 'boolean':
    case 'content':
      return target.kind === source.kind;
    case 'array':
      return (
        target.kind === 'array' &&
        isAssignable(source.items, target.items, definitions)
      );
    case 'object': {
      if (target.kind === 'record') return true;
      if (target.kind !== 'object') return false;
      const given = new Map(
        (source.props ?? []).map((prop) => [prop.name, prop]),
      );
      return (target.props ?? []).every((prop) => {
        const match = given.get(prop.name);
        if (!match) return !prop.required;
        return (
          (match.required || !prop.required) &&
          isAssignable(match.type, prop.type, definitions)
        );
      });
    }
    default:
      return false;
  }
}

/** Whether a JSON literal is a valid value of a type descriptor. */
export function isLiteralOf(value, type, definitions = {}) {
  const target = resolveType(type, definitions);
  if (value === null) return target.nullable === true;
  switch (target.kind) {
    case 'unknown':
      return true;
    case 'union':
      return target.members.some((member) =>
        isLiteralOf(value, member, definitions),
      );
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'enum':
      return target.values.includes(value);
    case 'literal':
      return value === target.value;
    case 'content':
      return (
        target.acceptsText === true &&
        (typeof value === 'string' || typeof value === 'number')
      );
    case 'array':
      return (
        Array.isArray(value) &&
        value.every((item) => isLiteralOf(item, target.items, definitions))
      );
    case 'record':
      return (
        isObject(value) &&
        Object.values(value).every((item) => typeof item === 'string')
      );
    case 'object': {
      if (!isObject(value)) return false;
      const known = new Map(
        (target.props ?? []).map((prop) => [prop.name, prop]),
      );
      const { index } = target;
      return (
        Object.entries(value).every(([name, item]) =>
          known.has(name)
            ? isLiteralOf(item, known.get(name).type, definitions)
            : index !== undefined &&
              name.startsWith(index.keyPrefix) &&
              isLiteralOf(item, index.value, definitions),
        ) &&
        [...known.values()].every(
          (prop) => !prop.required || prop.name in value,
        )
      );
    }
    default:
      return false;
  }
}

/**
 * Parses a `$css` builder call with literal arguments only: numbers, quoted
 * strings without quotes or backslashes inside, and nested builder calls.
 * Generated code emits the call verbatim and the interpreter evaluates the
 * tree, so anything else (an identifier, an operator, a template) is rejected
 * rather than trusted. Returns `{ name, args }` (each argument a number,
 * string, or nested call), or undefined when it does not parse.
 */
export function parseCssTree(source) {
  if (typeof source !== 'string') return undefined;
  const text = source.trim();
  let index = 0;
  const space = () => {
    while (text[index] === ' ') index += 1;
  };
  const call = () => {
    const name = /^[A-Za-z]+/.exec(text.slice(index))?.[0];
    if (!name || text[index + name.length] !== '(') return undefined;
    const node = { name, args: [] };
    index += name.length + 1;
    space();
    if (text[index] === ')') {
      index += 1;
      return node;
    }
    for (;;) {
      space();
      const value = argument();
      if (value === undefined) return undefined;
      node.args.push(value);
      space();
      if (text[index] === ',') index += 1;
      else if (text[index] === ')') {
        index += 1;
        return node;
      } else return undefined;
    }
  };
  const argument = () => {
    const rest = text.slice(index);
    const number = /^-?\d+(?:\.\d+)?/.exec(rest)?.[0];
    if (number) {
      index += number.length;
      return Number(number);
    }
    const quoted =
      /^'[^'\\\n]*'/.exec(rest)?.[0] ?? /^"[^"\\\n]*"/.exec(rest)?.[0];
    if (quoted) {
      index += quoted.length;
      return quoted.slice(1, -1);
    }
    return call();
  };
  const tree = call();
  return tree && index === text.length ? tree : undefined;
}

/** The helper names a `$css` call uses, outermost first, or undefined. */
export function parseCssCall(source) {
  const tree = parseCssTree(source);
  if (!tree) return undefined;
  const names = [];
  const visit = (node) => {
    names.push(node.name);
    for (const arg of node.args) if (typeof arg === 'object') visit(arg);
  };
  visit(tree);
  return names;
}

function describe(type) {
  return type?.text ?? type?.kind ?? 'unknown';
}

/** Validates one param or slot-input type in the document's own grammar. */
function validateDeclaredType(ctx, type, path) {
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
  for (const segment of rest) {
    const prop = propsOf(type, {})?.find((item) => item.name === segment);
    if (!prop) {
      ctx.report(
        'KUI-V007',
        at,
        `\`$bind\` path "${path}" has no "${segment}"`,
      );
      return undefined;
    }
    type = prop.type;
  }
  return type;
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
  if (type === null) {
    if (!isLiteralOf(value, prop.type, definitions)) {
      ctx.report(
        'KUI-V004',
        at,
        `${JSON.stringify(value)} is not a valid ${describe(prop.type)}`,
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
 * How a component carries application `data-*` attributes (the node marker
 * and a row key): its `rootAttributes` prop, a Web Awesome element's own
 * attributes, or nothing. A generated `dataChannel` field wins when present.
 */
export function channelOf(component) {
  if (component.dataChannel) return component.dataChannel;
  if (component.source === 'webawesome') return 'attributes';
  return component.props.some((prop) => prop.name === 'rootAttributes')
    ? 'rootAttributes'
    : 'none';
}

/** The prop a zone key fills: the composition zone's binding or the prop itself. */
export function zonePropOf(catalog, component, key) {
  const entry = component.key.includes('#')
    ? undefined
    : catalog.entries.get(component.key);
  const zone = entry?.zones?.find((item) => item.id === key && item.jsx?.prop);
  return zone ? zone.jsx.prop : key;
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
  const zones = zonesOf(ctx, component);
  const byName = new Map(component.props.map((prop) => [prop.name, prop]));
  const native = new Set(component.nativeAttributes ?? []);
  const present = new Set();
  const literals = new Map();
  if (node.props !== undefined && !isObject(node.props))
    ctx.report('KUI-V001', `${at}.props`, '`props` is an object');
  for (const [name, value] of Object.entries(
    isObject(node.props) ? node.props : {},
  )) {
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
  if (node.zones !== undefined && !isObject(node.zones))
    ctx.report('KUI-V001', `${at}.zones`, '`zones` is an object');
  const shapes = new Map();
  for (const [zoneKey, children] of Object.entries(
    isObject(node.zones) ? node.zones : {},
  )) {
    const zoneAt = `${at}.zones.${zoneKey}`;
    const binding = zones.get(zoneKey);
    if (!binding) {
      ctx.report('KUI-V003', zoneAt, `${node.type} has no zone "${zoneKey}"`);
      continue;
    }
    if (!Array.isArray(children)) {
      ctx.report('KUI-V001', zoneAt, 'a zone is a list of children');
      continue;
    }
    if (isObject(node.props) && binding.prop in node.props) {
      ctx.report(
        'KUI-V003',
        zoneAt,
        `"${binding.prop}" is set in both \`props\` and \`zones\``,
      );
    }
    if (children.length > 0) present.add(binding.prop);
    children.forEach((child, index) =>
      checkChild(
        ctx,
        child,
        `${zoneAt}[${index}]`,
        scope,
        rowScoped,
        node.type,
        binding.text,
      ),
    );
    shapes.set(zoneKey, combine(children.map((child) => childShape(child))));
  }
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

function checkChild(ctx, child, at, scope, rowScoped, parentKey, text = false) {
  if (!isObject(child)) {
    ctx.report('KUI-V001', at, 'a zone child is an object');
    return;
  }
  if ('$each' in child) {
    for (const key of only(child, ['$each', 'as', 'key', 'template']))
      ctx.report('KUI-V001', `${at}.${key}`, 'unknown `$each` field');
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
      !['object', 'unknown', 'record'].includes(
        resolveType(list.items, {}).kind,
      )
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
    if (!isObject(child.template) || !('type' in child.template)) {
      ctx.report(
        'KUI-V008',
        `${at}.template`,
        'the template is exactly one node',
      );
      return;
    }
    const template = ctx.catalog.components.get(child.template.type);
    if (template && channelOf(template.component) === 'none') {
      ctx.report(
        'KUI-V008',
        `${at}.template`,
        `${child.template.type} has no data-* channel to carry the row key`,
      );
    }
    checkNode(
      ctx,
      child.template,
      `${at}.template`,
      inner,
      true,
      parentKey,
      text,
    );
    return;
  }
  if ('$if' in child) {
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
    checkChild(
      ctx,
      child.then,
      `${at}.then`,
      scope,
      rowScoped,
      parentKey,
      text,
    );
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
    return;
  }
  if ('$slot' in child) {
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
    return;
  }
  checkNode(ctx, child, at, scope, rowScoped, parentKey, text);
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
  if (ctx.viewStack.includes(node.src)) {
    ctx.report('KUI-V012', `${at}.src`, `#view "${node.src}" is cyclic`);
    return;
  }
  const child = ctx.resolveView(node.src);
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
    if (isObject(param) && !('default' in param) && !(name in given)) {
      ctx.report(
        'KUI-V012',
        at,
        `#view "${node.src}" requires param "${name}"`,
      );
    }
  }
  const nested = validateView(child, ctx.catalog, {
    resolveView: ctx.resolveView,
    viewStack: [...ctx.viewStack, node.src],
  });
  for (const diagnostic of nested.diagnostics) {
    ctx.report(
      diagnostic.code,
      `${at}{${node.src}}${diagnostic.path.slice(1)}`,
      diagnostic.message,
    );
  }
  for (const [name, actionScope] of nested.actions)
    ctx.noteAction(name, actionScope, at);
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
  if ('$each' in child) {
    const template = isObject(child.template)
      ? childShape(child.template)
      : shape(0, 0, []);
    return shape(0, Number.POSITIVE_INFINITY, template.items);
  }
  if ('$if' in child) {
    const then = childShape(child.then);
    const otherwise =
      'else' in child ? childShape(child.else) : shape(0, 0, []);
    return shape(
      Math.min(then.min, otherwise.min),
      Math.max(then.max, otherwise.max),
      [...then.items, ...otherwise.items],
    );
  }
  if ('$slot' in child || child.type === '#view') return shape(1, 1, []);
  if (child.type === '#text') return shape(1, 1, [{ label: 'text' }]);
  return shape(1, 1, [{ node: child }]);
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
 * Validates a view document. Returns `{ valid, diagnostics, actions }`, where
 * each diagnostic is `{ code, path, message }` (a `KUI-V###` document id or a
 * `KUI-L201`–`L204` composition id) and `actions` maps each action name to
 * its `row` or `view` scope. `options.resolveView(src)` loads a composed
 * document; without it, `#view` nodes are checked for shape only.
 */
export function validateView(document, catalog, options = {}) {
  const diagnostics = [];
  const ids = new Map();
  const names = new Map();
  const actions = new Map();
  const ctx = {
    catalog,
    resolveView: options.resolveView,
    viewStack: options.viewStack ?? [],
    params: new Map(),
    slots: new Map(),
    packages: undefined,
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

  if (!isObject(document)) {
    ctx.report('KUI-V001', '$', 'a view document is a JSON object');
    return { valid: false, diagnostics, actions };
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
        'a param is a camelCase name mapped to `{ type, default? }`',
      );
      continue;
    }
    for (const key of only(param, ['type', 'default', 'description']))
      ctx.report('KUI-V001', `${at}.${key}`, 'unknown param field');
    validateDeclaredType(ctx, param.type, `${at}.type`);
    if (
      'default' in param &&
      PARAM_KINDS.has(param.type?.kind) &&
      !isLiteralOf(param.default, param.type)
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
  if (!isObject(document.root) || !('type' in document.root)) {
    ctx.report('KUI-V001', '$.root', 'root is exactly one node');
  } else {
    checkNode(ctx, document.root, '$.root', new Map(), false, undefined);
  }
  return { valid: diagnostics.length === 0, diagnostics, actions };
}

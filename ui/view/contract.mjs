// The view contract (docs/26-ui-editor.md §4.6): the part of a view document
// application code compiles against — inputs, actions, slots, refs — with its
// layout-independent `kui1:` digest and a breaking/non-breaking diff. Shared
// by the generator and the runtime interpreter so both compute the same digest.
import { validateView } from './validate.mjs';

const MASK_64 = 0xffffffffffffffffn;
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** JSON with object keys sorted at every level and no whitespace. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * `kui1:` plus 16 hex digits of the 64-bit FNV-1a hash of `text`'s UTF-8
 * bytes. A compatibility fingerprint, not a security measure: synchronous and
 * dependency-free so Node and browsers compute it identically.
 */
export function viewDigest(text) {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return `kui1:${hash.toString(16).padStart(16, '0')}`;
}

/** The TypeScript spelling of a document param or slot-input type. */
export function typeText(type) {
  switch (type?.kind) {
    case 'string':
    case 'number':
    case 'boolean':
      return type.kind;
    case 'literal':
      return JSON.stringify(type.value);
    case 'enum':
      return type.values.map((value) => JSON.stringify(value)).join(' | ');
    case 'content':
      return 'SafeHtml';
    // A component prop's own type (KF-H3CB2P); the generated module spells
    // it from the component function it imports.
    case 'prop':
      return `PropOf<${JSON.stringify(type.component)}, ${JSON.stringify(type.prop)}>`;
    case 'array': {
      const item = typeText(type.items);
      return `readonly ${/[|&]/.test(item) ? `(${item})` : item}[]`;
    }
    case 'object':
      return type.props.length === 0
        ? 'Readonly<Record<string, never>>'
        : `{ ${type.props
            .map(
              (prop) =>
                `readonly ${propertyName(prop.name)}${prop.required ? '' : '?'}: ${typeText(prop.type)};`,
            )
            .join(' ')} }`;
    default:
      return 'unknown';
  }
}

/** A property name as written in a TypeScript type or object literal. */
export function propertyName(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

const HTML_ELEMENTS = {
  a: 'HTMLAnchorElement',
  button: 'HTMLButtonElement',
  div: 'HTMLDivElement',
  fieldset: 'HTMLFieldSetElement',
  label: 'HTMLLabelElement',
  nav: 'HTMLElement',
  ol: 'HTMLOListElement',
  section: 'HTMLElement',
  span: 'HTMLSpanElement',
  svg: 'SVGSVGElement',
  ul: 'HTMLUListElement',
};

/** The element type a named node's ref resolves to. */
function elementOf(catalog, node) {
  if (node.type.includes('#')) return 'HTMLElement';
  const entry = catalog.entries.get(node.type);
  const tag = entry?.boundaries?.rootElement;
  // A link-capable component renders <a> instead when given an href.
  if (!tag || (isObject(node.props) && 'href' in node.props)) {
    return 'HTMLElement';
  }
  return HTML_ELEMENTS[tag] ?? 'HTMLElement';
}

/** Walks every node and child, calling `visit(node, rowScoped)` for nodes. */
export function walkView(document, visit) {
  const child = (item, row) => {
    if (!isObject(item)) return;
    if ('$each' in item) node(item.template, true);
    else if ('$if' in item) {
      child(item.then, row);
      if ('else' in item) child(item.else, row);
    } else if (!('$slot' in item)) node(item, row);
  };
  const node = (item, row) => {
    if (!isObject(item)) return;
    visit(item, row);
    for (const children of Object.values(
      isObject(item.zones) ? item.zones : {},
    )) {
      if (Array.isArray(children))
        for (const entry of children) child(entry, row);
    }
  };
  // A `$slot` inside a prop value (KF-SXDM56: item slots), at any depth.
  const valueSlots = (value, found) => {
    if (Array.isArray(value)) for (const item of value) valueSlots(item, found);
    else if (isObject(value)) {
      if (typeof value.$slot === 'string') found.add(value.$slot);
      else for (const item of Object.values(value)) valueSlots(item, found);
    }
  };
  const slots = (item, found) => {
    if (!isObject(item)) return;
    valueSlots(item.props, found);
    if ('$slot' in item) found.add(item.$slot);
    else if ('$each' in item) slots(item.template, found);
    else if ('$if' in item) {
      slots(item.then, found);
      slots(item.else, found);
    }
    for (const children of Object.values(
      isObject(item.zones) ? item.zones : {},
    )) {
      if (Array.isArray(children))
        for (const entry of children) slots(entry, found);
    }
  };
  node(document.root, false);
  const found = new Set();
  slots(document.root, found);
  return found;
}

/**
 * The contract of a valid view document:
 * `{ inputs, actions, slots, refs }`, each keyed by name.
 * Throws when the document does not validate; the generator and interpreter
 * never derive a contract from an invalid document.
 */
export function contractOf(document, catalog, options = {}) {
  const validation = validateView(document, catalog, options);
  if (!validation.valid) {
    const first = validation.diagnostics[0];
    throw new Error(
      `view document is invalid (${validation.diagnostics.length} diagnostics; first: ${first.code} at ${first.path}: ${first.message})`,
    );
  }
  const inputs = {};
  for (const [name, param] of Object.entries(document.params ?? {})) {
    inputs[name] = {
      type: typeText(param.type),
      // A prop-typed input is optional exactly when that prop is.
      optional:
        'default' in param ||
        (param.type.kind === 'prop' &&
          !catalog.components
            .get(param.type.component)
            .component.props.find((prop) => prop.name === param.type.prop)
            .required),
      shape: param.type,
    };
  }
  const refs = {};
  const used = walkView(document, (node, row) => {
    if (typeof node.name === 'string') {
      refs[node.name] = {
        element: elementOf(catalog, node),
        keyed: row,
        id: node.id,
      };
    }
  });
  const slots = {};
  for (const name of [...used].sort()) {
    const input = document.slots?.[name]?.input;
    slots[name] = input ? typeText(input) : null;
  }
  return {
    inputs,
    actions: Object.fromEntries(
      [...validation.actions].sort(([a], [b]) => (a < b ? -1 : 1)),
    ),
    slots,
    refs,
  };
}

/** The canonical form a contract digest covers (no node ids or shapes). */
function digestForm(contract) {
  return {
    inputs: Object.fromEntries(
      Object.entries(contract.inputs).map(([name, input]) => [
        name,
        { type: input.type, optional: input.optional },
      ]),
    ),
    actions: contract.actions,
    slots: contract.slots,
    refs: Object.fromEntries(
      Object.entries(contract.refs).map(([name, ref]) => [
        name,
        { element: ref.element, keyed: ref.keyed },
      ]),
    ),
  };
}

/** The contract's `kui1:` digest (§4.6): layout, literals, and ids excluded. */
export function contractDigest(contract) {
  return viewDigest(canonicalJson(digestForm(contract)));
}

/** The contract as it is recorded in a generated module's header. */
export function serializeContract(contract) {
  return canonicalJson(digestForm(contract));
}

const enumValues = (text) => {
  const parts = text.split(' | ');
  return parts.every((part) => /^".*"$|^-?\d/.test(part))
    ? new Set(parts)
    : undefined;
};

/** Whether every value `before` allows is still allowed by `after`. */
function widens(before, after) {
  if (before === after) return true;
  const old = enumValues(before);
  if (!old) return false;
  if (after === 'string') return [...old].every((part) => part.startsWith('"'));
  if (after === 'number')
    return [...old].every((part) => !part.startsWith('"'));
  const next = enumValues(after);
  return next !== undefined && [...old].every((part) => next.has(part));
}

/**
 * Compares two contracts (from `serializeContract`/`digestForm` shape or
 * `contractOf`) and lists every change as
 * `{ member, name, change, breaking, detail }` (§6). An empty list means the
 * application needs no change.
 */
export function diffContracts(before, after) {
  const changes = [];
  const add = (member, name, change, breaking, detail) =>
    changes.push({ member, name, change, breaking, detail });
  const names = (a, b) =>
    [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();

  for (const name of names(before.inputs, after.inputs)) {
    const old = before.inputs[name];
    const next = after.inputs[name];
    if (!old)
      add(
        'input',
        name,
        'added',
        !next.optional,
        next.optional ? 'optional' : 'required',
      );
    else if (!next) add('input', name, 'removed', true, old.type);
    else if (old.type !== next.type) {
      add(
        'input',
        name,
        widens(old.type, next.type) ? 'widened' : 'retyped',
        !widens(old.type, next.type),
        `${old.type} → ${next.type}`,
      );
    } else if (old.optional !== next.optional) {
      add(
        'input',
        name,
        next.optional ? 'made optional' : 'made required',
        !next.optional,
        old.type,
      );
    }
  }
  for (const name of names(before.actions, after.actions)) {
    const old = before.actions[name];
    const next = after.actions[name];
    if (!old) add('action', name, 'added', true, next);
    else if (!next) add('action', name, 'removed', true, old);
    else if (old !== next)
      add('action', name, 'rescoped', true, `${old} → ${next}`);
  }
  for (const name of names(before.slots, after.slots)) {
    if (!(name in before.slots))
      add('slot', name, 'added', true, after.slots[name] ?? 'no input');
    else if (!(name in after.slots))
      add('slot', name, 'removed', true, before.slots[name] ?? 'no input');
    else if (before.slots[name] !== after.slots[name]) {
      add(
        'slot',
        name,
        'retyped',
        true,
        `${before.slots[name] ?? 'no input'} → ${after.slots[name] ?? 'no input'}`,
      );
    }
  }
  for (const name of names(before.refs, after.refs)) {
    const old = before.refs[name];
    const next = after.refs[name];
    if (!old) add('ref', name, 'added', false, next.element);
    else if (!next) add('ref', name, 'removed', true, old.element);
    else if (old.element !== next.element || old.keyed !== next.keyed) {
      add(
        'ref',
        name,
        'retyped',
        true,
        `${old.keyed ? 'keyed ' : ''}${old.element} → ${next.keyed ? 'keyed ' : ''}${next.element}`,
      );
    }
  }
  return changes;
}

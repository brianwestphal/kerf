// The catalog side of @kerfjs/ui/view: indexes component-props and
// composition documents (createViewCatalog), resolves prop types, and maps
// field zones (a content field inside a prop value) to the prop path they
// fill. Shared by the validator, the generator, and the interpreter.

export const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const keyOf = (type) => type.split('#')[0];

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
  // A config type another component renders as an entry (KF-THTR71), keyed
  // `package:TypeName` since type names are only unique within a package.
  const configParents = new Map();
  for (const document of composition) {
    for (const entry of document.entries ?? []) {
      entries.set(entry.key, entry);
      for (const name of entry.configTypes ?? [])
        configParents.set(
          `${keyOf(entry.key).split(':')[0]}:${name}`,
          entry.key,
        );
    }
  }
  return { components, entries, configParents };
}

export function resolveType(type, definitions) {
  let current = type;
  for (let hops = 0; current?.kind === 'ref' && hops < 32; hops += 1) {
    current = definitions[current.ref];
  }
  return current ?? { kind: 'unknown' };
}

export const propsOf = (type, definitions) =>
  resolveType(type, definitions).props;

/** A type, or each member of a union of it (unions of unions flattened). */
function membersOf(type, definitions) {
  const resolved = resolveType(type, definitions);
  return resolved.kind === 'union'
    ? resolved.members.flatMap((member) => membersOf(member, definitions))
    : [resolved];
}

const INDEX = /^\d+$/;

/**
 * A zone key that names a content field inside a prop value (KF-PD6QC5:
 * field zones): the prop, then field names and list indexes, dot-separated
 * (`leftRail.content`, `mainToolbar.title`, `views.0.content`). Walks the
 * prop's type through refs, union members, objects (never a field the type
 * forbids), and lists, and ends at rendered content. Returns the prop, the
 * path inside its value, and whether the field takes text; undefined for any
 * other key.
 */
export function fieldZoneOf(component, definitions, key) {
  const walked = walkField(component, definitions, key);
  if (!walked) return undefined;
  const content = walked.types
    .flatMap((type) => membersOf(type, definitions))
    .find((type) => type.kind === 'content');
  return content
    ? {
        prop: walked.name,
        path: walked.path.map((step) =>
          INDEX.test(step) ? Number(step) : step,
        ),
        text: content.acceptsText === true,
      }
    : undefined;
}

/**
 * The types a field zone key reaches in a component's prop value, with the
 * named types (`ref`s) of the value that holds that field: a NavStack view's
 * `views.0.toolbar.leading` is held by a `NavStackViewToolbar`.
 */
function walkField(component, definitions, key) {
  if (typeof key !== 'string' || !key.includes('.')) return undefined;
  const [name, ...path] = key.split('.');
  const prop = component.props.find((item) => item.name === name);
  if (!prop || prop.slot || prop.zone) return undefined;
  let types = [prop.type];
  let holders = [];
  for (const step of path) {
    holders = types.flatMap((type) => (type.kind === 'ref' ? [type.ref] : []));
    const next = [];
    for (const type of types.flatMap((item) => membersOf(item, definitions))) {
      if (INDEX.test(step)) {
        if (type.kind === 'array') next.push(type.items);
        continue;
      }
      const field =
        type.kind === 'object'
          ? type.props?.find((item) => item.name === step)
          : undefined;
      if (field && resolveType(field.type, definitions).kind !== 'never')
        next.push(field.type);
    }
    if (!next.length) return undefined;
    types = next;
  }
  return { name, path, types, holders };
}

/**
 * The component a field zone's children are placed in (KF-THTR71): a
 * content field inside a value another component renders, such as a
 * NavStack view's toolbar config, which renders as a Toolbar. A config type
 * may name one field (`ListDetailDialogList.toolbar`) when only that field
 * renders in the component. Undefined when neither the field nor its holder
 * is cataloged.
 */
export function fieldParent(ctx, node, component, definitions, key) {
  const pkg = keyOf(node.type).split(':')[0];
  const walked = walkField(component, definitions, key);
  const field = walked?.path.at(-1);
  for (const holder of walked?.holders ?? []) {
    // KF-WBH5P2: one field of a holder that renders only that field in
    // another component (`ListDetailDialogList.toolbar` in a Toolbar)
    // names it alone; the whole holder's mapping is the fallback.
    const parent =
      ctx.catalog.configParents?.get(`${pkg}:${holder}.${field}`) ??
      ctx.catalog.configParents?.get(`${pkg}:${holder}`);
    if (parent) return parent;
  }
  return undefined;
}

/**
 * Where a field zone's children go in a prop value while it is checked,
 * interpreted, or generated: a placeholder no document can spell, so it
 * never reads as a literal of the document's own.
 */
export class ZoneFill {
  constructor(key, children) {
    this.key = key;
    this.children = children;
  }
}

/**
 * A prop value as a problem quotes it: JSON, with each field zone written as
 * `<zone key>` rather than its nodes (KF-20GMVX), so the message stays short
 * and does not change when something inside the zone does.
 */
export function quoteValue(value) {
  return JSON.stringify(value, (_key, item) =>
    item instanceof ZoneFill ? `<zone ${item.key}>` : item,
  );
}

/** `value` with `fill` at `path`, copying each object and list on the way. */
function withAt(value, path, fill) {
  if (!path.length) return fill;
  const [step, ...rest] = path;
  if (typeof step === 'number') {
    const list = Array.isArray(value) ? [...value] : [];
    list[step] = withAt(list[step], rest, fill);
    return list;
  }
  const object = isObject(value) ? { ...value } : {};
  object[step] = withAt(object[step], rest, fill);
  return object;
}

/** Whether a value is a binding (`$param`, `$bind`, …) rather than a literal. */
export const isBinding = (value) =>
  isObject(value) && Object.keys(value).some((key) => key.startsWith('$'));

/**
 * `props` with each filled field zone's placeholder (a `ZoneFill`) at its
 * path, so the zone fills that content field (KF-PD6QC5). A prop held by a
 * binding is left alone; validation reports the clash.
 */
export function withFieldZones(props, zones, component, definitions) {
  let merged = props;
  for (const key of Object.keys(zones)) {
    const field = fieldZoneOf(component, definitions, key);
    if (!field || !zones[key].length || isBinding(merged[field.prop])) continue;
    merged = {
      ...merged,
      [field.prop]: withAt(
        merged[field.prop],
        field.path,
        new ZoneFill(key, zones[key]),
      ),
    };
  }
  return merged;
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

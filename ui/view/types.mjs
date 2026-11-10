// The structural type system of @kerfjs/ui/view: whether a param or binding
// type fits a prop type (isAssignable) and whether a JSON literal is a value
// of a type (isLiteralOf), over the catalogs' type descriptors.

import { isObject, resolveType, ZoneFill } from './catalog.mjs';
import { parseCssCall } from './css-grammar.mjs';

export const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Whether a value of type `from` (a param or binding) fits type `to`. */
export function isAssignable(from, to, definitions = {}) {
  // Project TypeScript types are checked by the Node language service against
  // the generated module. The structural pass cannot prove TS assignability.
  if (from?.typescript || to?.typescript) return true;
  // A component prop's type fits only that same component prop.
  if (from?.kind === 'prop' || to?.kind === 'prop')
    return (
      from?.kind === to?.kind &&
      from.component === to.component &&
      from.prop === to.prop
    );
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
  return literalOf(value, type, definitions);
}

/**
 * `isLiteralOf`, with `hooks` for the forms a prop value may nest:
 * `hooks.slot` decides a `{ $slot }` at a content-typed position (KF-SXDM56:
 * item slots), and `hooks.dynamic` a `{ $param }` / `{ $bind }` at any typed
 * position against that position's type (KF-3QEZFB: nested params). Without
 * them, neither is a literal.
 */
export function literalOf(value, type, definitions, hooks) {
  if (
    hooks?.dynamic &&
    isObject(value) &&
    ('$param' in value || '$bind' in value)
  )
    return hooks.dynamic(value, type);
  if (type?.typescript) return true;
  const target = resolveType(type, definitions);
  if (value === null) return target.nullable === true;
  switch (target.kind) {
    case 'unknown':
      return true;
    case 'union':
      return target.members.some((member) =>
        literalOf(value, member, definitions, hooks),
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
    // A builder call inside a list or object value (KF-3J9GJV).
    case 'css-value':
      return isObject(value) && parseCssCall(value.$css) !== undefined;
    case 'content':
      if (value instanceof ZoneFill) return true;
      if (hooks?.slot && isObject(value) && '$slot' in value)
        return hooks.slot(value);
      return (
        target.acceptsText === true &&
        (typeof value === 'string' || typeof value === 'number')
      );
    case 'array':
      return (
        Array.isArray(value) &&
        value.every((item) => literalOf(item, target.items, definitions, hooks))
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
            ? // An icon-data field names its icon (KF-3J9GJV).
              (known.get(name).iconSource &&
                ICON_NAME.test(item?.$icon ?? '')) ||
              literalOf(item, known.get(name).type, definitions, hooks)
            : index !== undefined &&
              name.startsWith(index.keyPrefix) &&
              literalOf(item, index.value, definitions, hooks),
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

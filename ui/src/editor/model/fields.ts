// Field editors for structured props (KF-AJHJB8 design; KF-Z9S029: object
// forms). Which editor a list or object prop gets, the container its form
// opens in, the fields of an object type, and edits at a path inside a prop
// value. Read from the props catalog's type graph, so an application
// component's catalog gets the same editors with no per-component table.
import type { ViewType, ViewValue } from '@kerfjs/ui/view';

import { resolveType } from './examples.js';
import type { InspectorProp } from './inspector.js';

type Definitions = Readonly<Record<string, ViewType>>;

/** A place inside a prop value: object field names and list indexes. */
export type FieldPath = readonly (string | number)[];

/**
 * How a structured value edits: a form of an `object`'s fields, a list
 * editor of objects (`object-list`) or of a union's members (`union-list`),
 * inline `tags` for strings, an inline `enum-set` of string values, an
 * `icon` picker for icon data, or typed `json` for anything else.
 */
export type FieldEditorKind =
  | 'object'
  | 'object-list'
  | 'union-list'
  | 'tags'
  | 'enum-set'
  | 'icon'
  | 'json';

/** Where a field editor's form opens: pushed in the Inspector, or a dialog. */
export type FieldContainer = 'subview' | 'dialog';

/** The most fields a single-step form shows in the Inspector's pushed view. */
export const SUBVIEW_FIELDS = 10;

interface TypeShape {
  readonly kind: string;
  readonly text?: string;
  readonly values?: readonly unknown[];
  readonly members?: readonly ViewType[];
  readonly items?: ViewType;
  readonly props?: readonly {
    readonly name: string;
    readonly type: ViewType;
    readonly required?: boolean;
    readonly description?: string;
    readonly iconSource?: string;
  }[];
}

const shape = (type: ViewType | undefined, definitions: Definitions) =>
  resolveType(type, definitions) as TypeShape | undefined;

/** Whether a resolved type is an object with fields a form can show. */
const isFormObject = (type: TypeShape | undefined) =>
  type?.kind === 'object' && (type.props?.length ?? 0) > 0;

/**
 * The editor for a value of `type`. `iconSource` marks icon data (a
 * LucideIcon's `icon`), which the props catalog records on the prop rather
 * than in the type.
 */
export function fieldEditorKind(
  type: ViewType | undefined,
  definitions: Definitions,
  iconSource?: string,
): FieldEditorKind {
  if (iconSource === 'lucide') return 'icon';
  const resolved = shape(type, definitions);
  if (isFormObject(resolved)) return 'object';
  if (resolved?.kind !== 'array') return 'json';
  const item = shape(resolved.items, definitions);
  switch (item?.kind) {
    case 'string':
      return 'tags';
    case 'enum':
      return item.values?.length &&
        item.values.every((value) => typeof value === 'string')
        ? 'enum-set'
        : 'json';
    case 'object':
      return isFormObject(item) ? 'object-list' : 'json';
    case 'union':
      return unionMembers(item, definitions).length ? 'union-list' : 'json';
    default:
      return 'json';
  }
}

/**
 * The members of a union a list editor can add: each object member with
 * fields, and a string member as plain text. Empty when any member is
 * neither, since such a list cannot be edited item by item.
 */
export function unionMembers(
  type: ViewType | TypeShape | undefined,
  definitions: Definitions,
): readonly ViewType[] {
  const union = shape(type as ViewType, definitions);
  const members = union?.members ?? [];
  return members.every((member) => {
    const resolved = shape(member, definitions);
    return resolved?.kind === 'string' || isFormObject(resolved);
  })
    ? members
    : [];
}

/**
 * An object type's fields, shaped like the Inspector's props so the same
 * controls (`controlFor`) edit them. Empty for any other type.
 */
export function objectFields(
  type: ViewType | undefined,
  definitions: Definitions,
): readonly InspectorProp[] {
  const resolved = shape(type, definitions);
  if (!isFormObject(resolved)) return [];
  return resolved!.props!.map((field) => ({
    name: field.name,
    type: field.type as InspectorProp['type'],
    required: field.required === true,
    ...(field.iconSource ? { iconSource: field.iconSource } : {}),
  }));
}

/**
 * The container a field editor opens in. A single step of at most
 * {@link SUBVIEW_FIELDS} fields pushes in the Inspector; more fields, a
 * sub-selection (a list to pick an item from, then configure it), or a
 * picker opens a dialog. `explicit` (an app's field editor) wins.
 */
export function containerFor(
  type: ViewType | undefined,
  definitions: Definitions,
  iconSource?: string,
  explicit?: FieldContainer,
): FieldContainer {
  if (explicit) return explicit;
  switch (fieldEditorKind(type, definitions, iconSource)) {
    case 'object':
      return objectFields(type, definitions).length > SUBVIEW_FIELDS
        ? 'dialog'
        : 'subview';
    case 'object-list':
    case 'union-list':
    case 'icon':
      return 'dialog';
    default:
      return 'subview';
  }
}

/** How a step of a field editor reads as a title: a field name or "Item 2". */
export function stepTitle(place: {
  readonly prop: string;
  readonly path: FieldPath;
}): string {
  const step = place.path.at(-1);
  if (step === undefined) return place.prop;
  return typeof step === 'number' ? `Item ${step + 1}` : step;
}

/** The type at `path` inside a value of `type`, following fields and items. */
export function typeAt(
  type: ViewType | undefined,
  definitions: Definitions,
  path: FieldPath,
  /** For a union list's items: the item's value picks its member. */
  value?: ViewValue,
): ViewType | undefined {
  let current = type;
  let at: ViewValue | undefined = value;
  for (const step of path) {
    const resolved = shape(current, definitions);
    if (typeof step === 'number') {
      if (resolved?.kind !== 'array') return undefined;
      at = Array.isArray(at) ? at[step] : undefined;
      current = memberFor(resolved.items, definitions, at);
    } else {
      const field = resolved?.props?.find((item) => item.name === step);
      if (!field) return undefined;
      at = fieldsOf(at)?.[step];
      current = field.type;
    }
  }
  return current;
}

/**
 * The member of a union `type` that `value` belongs to: the object member
 * whose literal discriminant (`kind`) the value carries, else the first
 * object member, or the string member for text. Other types return as given.
 */
export function memberFor(
  type: ViewType | undefined,
  definitions: Definitions,
  value: ViewValue | undefined,
): ViewType | undefined {
  const union = shape(type, definitions);
  if (union?.kind !== 'union') return type;
  const members = union.members!;
  if (typeof value === 'string')
    return members.find(
      (member) => shape(member, definitions)?.kind === 'string',
    );
  const objects = members.filter((member) =>
    isFormObject(shape(member, definitions)),
  );
  const fields = fieldsOf(value);
  if (!fields) return objects[0];
  return (
    objects.find((member) =>
      shape(member, definitions)!.props!.every((field) => {
        const literal = shape(field.type, definitions);
        if (literal?.kind !== 'literal') return true;
        const own = fields[field.name];
        return own === undefined
          ? field.required !== true
          : own === (literal as { value?: unknown }).value;
      }),
    ) ?? objects[0]
  );
}

type Fields = Readonly<Record<string, ViewValue>>;

/** `value`'s fields when it is an object literal, else undefined. */
const fieldsOf = (value: ViewValue | undefined): Fields | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Fields)
    : undefined;

/** The value at `path` inside `value`, or undefined where nothing is set. */
export function valueAt(
  value: ViewValue | undefined,
  path: FieldPath,
): ViewValue | undefined {
  let current = value;
  for (const step of path) {
    if (typeof step === 'number')
      current = Array.isArray(current) ? current[step] : undefined;
    else current = fieldsOf(current)?.[step];
  }
  return current;
}

/**
 * `value` with `next` at `path`, copying each object and list on the way.
 * `undefined` removes an object field (or a list item); missing objects on
 * the way are created. An object left with no fields becomes `undefined`,
 * so clearing a form's last field unsets the prop.
 */
export function withValueAt(
  value: ViewValue | undefined,
  path: FieldPath,
  next: ViewValue | undefined,
): ViewValue | undefined {
  if (!path.length) return next;
  const [step, ...rest] = path;
  if (typeof step === 'number') {
    const list = Array.isArray(value) ? [...value] : [];
    // Clearing an item's last field keeps the item; only removing it drops it.
    const item =
      withValueAt(list[step], rest, next) ?? (rest.length ? {} : undefined);
    if (item === undefined) list.splice(step, 1);
    else list[step] = item;
    return list;
  }
  const object: Record<string, ViewValue> = { ...fieldsOf(value) };
  const field = withValueAt(object[step!], rest, next);
  if (field === undefined) delete object[step!];
  else object[step!] = field;
  return Object.keys(object).length ? object : undefined;
}

/**
 * How a structured value reads on its Inspector row: "Not set", "3 fields
 * set", or "2 items".
 */
export function fieldSummary(value: ViewValue | undefined): string {
  if (value === undefined) return 'Not set';
  if (Array.isArray(value))
    return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
  const fields = fieldsOf(value);
  if (fields) {
    const count = Object.keys(fields).length;
    return `${count} ${count === 1 ? 'field' : 'fields'} set`;
  }
  return 'Set';
}

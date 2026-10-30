// Field editors for structured props (KF-AJHJB8 design; KF-Z9S029: object
// forms). Which editor a list or object prop gets, the container its form
// opens in, the fields of an object type, and edits at a path inside a prop
// value. Read from the props catalog's type graph, so an application
// component's catalog gets the same editors with no per-component table.
import type { ViewNode, ViewType, ViewValue } from '@kerfjs/ui/view';

import { resolveType, singular } from './examples.js';
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

/**
 * The most fields a list's items may have for the list to edit in the
 * Inspector's pushed view (KF-CY1D5W): a list and its item form are a
 * sub-selection, a dialog's job, unless the items are this small.
 */
export const SMALL_ITEM_FIELDS = 3;

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

/** Whether a resolved type holds a list or an object. */
const isStructuredShape = (type: TypeShape | undefined) =>
  type?.kind === 'array' || type?.kind === 'object';

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
 * The values a set of enum values offers (KF-A9ZHGW: a Pane's
 * `separators`), in the catalog's order; empty for any other type.
 */
export function enumSetValues(
  type: ViewType | undefined,
  definitions: Definitions,
): readonly string[] {
  if (fieldEditorKind(type, definitions) !== 'enum-set') return [];
  const item = shape(shape(type, definitions)!.items, definitions)!;
  return item.values as readonly string[];
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
  // A field the type forbids (`never`) is no field to edit (KF-907BXY).
  return resolved!
    .props!.filter((field) => shape(field.type, definitions)?.kind !== 'never')
    .map((field) => ({
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
    case 'object-list': {
      const item = shape(type, definitions)!.items;
      const fields = objectFields(item, definitions);
      // Small items with no list or object of their own (a Slider tick).
      return fields.length <= SMALL_ITEM_FIELDS &&
        fields.every(
          (field) =>
            !isStructuredShape(shape(field.type as ViewType, definitions)),
        )
        ? 'subview'
        : 'dialog';
    }
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
        // A field the member forbids (`never`) rules it out when set: a
        // static Workbench panel has no `navStack` (KF-907BXY).
        if (literal?.kind === 'never') return fields[field.name] === undefined;
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

/** The kinds of item a list editor adds: a label and the member's type. */
export interface ListMember {
  readonly label: string;
  readonly type: ViewType;
}

/** "PopupMenuHeading" → ["Popup", "Menu", "Heading"]. */
const camelWords = (name: string) => name.match(/[A-Z][a-z0-9]*|[a-z0-9]+/g)!;

/**
 * A union member's type name: its `ref`, or the last named type of an
 * intersection (`Base<Id> & TabNavigatorTabDotBadge`).
 */
const memberName = (member: ViewType): string | undefined => {
  const { ref, text } = member as { ref?: string; text?: string };
  if (ref) return ref;
  const last = text?.split('&').at(-1)!.trim();
  return last && /^[A-Z][A-Za-z0-9]*$/.test(last) ? last : undefined;
};

/**
 * What a list of `type` adds (KF-CY1D5W): its one item type, or each member
 * of its union, labeled for an Add menu. A string member is "Text"; an
 * object member is named by a text literal field it carries (`kind:
 * "divider"` → "Divider"), else by its type name less the words every
 * member's name shares (`PopupMenuHeading` → "Heading"), else after the
 * list (`suggestions` → "Suggestion").
 */
/**
 * Labels for a union's object members (KF-907BXY): a text literal field
 * each carries (`kind: "divider"` → "Divider"), else its type name less the
 * words every member's name shares (`WorkbenchStaticPanel` → "Static
 * panel"), else `fallback`.
 */
export function memberLabels(
  members: readonly ViewType[],
  definitions: Definitions,
  fallback: string,
): string[] {
  const names = members.map((member) => {
    const named = memberName(member);
    return named ? camelWords(named) : undefined;
  });
  const named = names.filter(Boolean) as string[][];
  let shared = 0;
  while (
    named.length > 1 &&
    named.every((words) => words.length > shared + 1) &&
    named.every((words) => words[shared] === named[0]![shared])
  )
    shared += 1;
  return members.map((member, index) => {
    const resolved = shape(member, definitions)!;
    if (resolved.kind === 'string') return 'Text';
    const literal = (resolved.props ?? [])
      .map(
        (field) =>
          (shape(field.type, definitions) as { value?: unknown }).value,
      )
      .find((value) => typeof value === 'string') as string | undefined;
    const label = literal ?? names[index]?.slice(shared).join(' ') ?? fallback;
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  });
}

export function listMembers(
  type: ViewType | undefined,
  definitions: Definitions,
  /** The list's prop or field name, for an otherwise unnamed member. */
  name = 'items',
): readonly ListMember[] {
  const items = shape(type, definitions)?.items;
  const union = shape(items, definitions);
  if (union?.kind !== 'union')
    return items ? [{ label: singular(name), type: items }] : [];
  const members = unionMembers(union, definitions);
  const labels = memberLabels(members, definitions, singular(name));
  return members.map((member, index) => ({
    label: labels[index]!,
    type: member,
  }));
}

/**
 * How a list item reads in its list editor: a string as itself, an object
 * by its first text `label`, `name`, `title`, `value`, `key`, or `id`, else
 * by the literal it carries ("Divider"), else numbered ("Item 3").
 */
export function listItemLabel(
  value: ViewValue | undefined,
  index: number,
): string {
  if (typeof value === 'string') return value || `Item ${index + 1}`;
  const fields = fieldsOf(value);
  for (const name of ['label', 'name', 'title', 'value', 'key', 'id']) {
    const text = fields?.[name];
    if (typeof text === 'string' && text) return text;
  }
  const kind = fields?.kind;
  return typeof kind === 'string' && kind
    ? kind.charAt(0).toUpperCase() + kind.slice(1)
    : `Item ${index + 1}`;
}

/**
 * The field zones a node offers (KF-PD6QC5: field zones): every content
 * field inside a prop value it sets, by key (`leftRail.content`,
 * `mainToolbar.title`, `views.0.content`), so the editor can fill it with
 * nodes; plus every field zone it already fills. A prop it leaves unset or
 * binds offers none until it is set (choose a panel kind first).
 */
export function fieldZoneKeys(
  node: ViewNode,
  props: readonly InspectorProp[],
  definitions: Definitions,
): string[] {
  const keys = new Set<string>();
  const walk = (
    type: ViewType,
    value: ViewValue | undefined,
    path: FieldPath,
  ): void => {
    const resolved = shape(memberFor(type, definitions, value), definitions);
    if (resolved?.kind === 'content') {
      keys.add(path.join('.'));
      return;
    }
    if (path.length > 5) return;
    const fields = resolved?.kind === 'object' ? fieldsOf(value) : undefined;
    if (fields && !isBindingValue(value))
      for (const field of objectFields(resolved as ViewType, definitions))
        walk(field.type as ViewType, fields[field.name], [...path, field.name]);
    if (resolved?.kind === 'array' && Array.isArray(value))
      value.forEach((item, index) =>
        walk(resolved.items!, item, [...path, index]),
      );
  };
  for (const prop of props) {
    if (prop.slot || prop.zone) continue;
    const value = node.props?.[prop.name] as ViewValue | undefined;
    if (value === undefined || isBindingValue(value)) continue;
    // The prop itself is not a field zone; only fields inside its value.
    const resolved = shape(prop.type as ViewType, definitions);
    if (resolved?.kind === 'content') continue;
    walk(prop.type as ViewType, value, [prop.name]);
  }
  for (const key of Object.keys(node.zones ?? {}))
    if (key.includes('.')) keys.add(key);
  return [...keys];
}

/** A binding (`$param`, `$bind`, …) rather than a literal value. */
const isBindingValue = (value: ViewValue | undefined) =>
  Object.keys(fieldsOf(value) ?? {}).some((key) => key.startsWith('$'));

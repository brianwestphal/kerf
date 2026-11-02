// The Inspector's data attributes editor (KF-65FTKX: a component's
// `rootAttributes`, limited to unreserved `data-*` keys with string values).
import {
  dataAttributeProblem,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';

import { resolveType } from './examples.js';

type Definitions = Readonly<Record<string, ViewType>>;

/** The prop a component's data-* channel is (docs/26 §4.5). */
export const DATA_ATTRIBUTES_PROP = 'rootAttributes';

/** One data attribute, in the order the document holds it. */
export type DataAttribute = readonly [name: string, value: string];

/**
 * The attributes a `rootAttributes` value holds, or undefined when the
 * editor cannot edit it (a binding, or a value that is not a string record).
 */
export function dataAttributes(
  value: ViewValue | undefined,
): readonly DataAttribute[] | undefined {
  if (value === undefined) return [];
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return undefined;
  const entries = Object.entries(value);
  return entries.every(
    ([key, item]) => !key.startsWith('$') && typeof item === 'string',
  )
    ? (entries as DataAttribute[])
    : undefined;
}

/**
 * The keys a component sets on its own root and so protects: the `never`
 * fields of its `rootAttributes` type (a Badge's `data-tone`).
 */
export function protectedDataAttributes(
  type: ViewType,
  definitions: Definitions = {},
): ReadonlySet<string> {
  const keys = new Set<string>();
  const visit = (member: ViewType | undefined): void => {
    const node = resolveType(member, definitions) as
      | {
          kind: string;
          props?: readonly { name: string; type: ViewType }[];
          members?: readonly ViewType[];
        }
      | undefined;
    if (node?.kind === 'union') node.members!.forEach(visit);
    if (node?.kind !== 'object') return;
    for (const prop of node.props ?? [])
      if (prop.type.kind === 'never' && prop.name.startsWith('data-'))
        keys.add(prop.name);
  };
  visit(type);
  return keys;
}

/**
 * Why `name` cannot be the attribute at `index`, or undefined: it must be a
 * lowercase, unreserved `data-*` name (the validator's `KUI-V015` rule),
 * one the component does not set itself, and not already in the list.
 */
export function dataAttributeNameError(
  name: string,
  attributes: readonly DataAttribute[],
  index: number,
  protectedNames: ReadonlySet<string> = new Set(),
): string | undefined {
  const problem = dataAttributeProblem(name);
  if (problem)
    return /reserved/.test(problem)
      ? 'Reserved for the editor.'
      : 'Use a lowercase data-* name.';
  if (protectedNames.has(name)) return 'The component sets this one.';
  if (attributes.some(([key], at) => at !== index && key === name))
    return 'Already set above.';
  return undefined;
}

/** An unused `data-*` name for a new attribute. */
export function newDataAttributeName(
  attributes: readonly DataAttribute[],
  protectedNames: ReadonlySet<string> = new Set(),
): string {
  const taken = (name: string) =>
    protectedNames.has(name) || attributes.some(([key]) => key === name);
  let name = 'data-name';
  for (let count = 2; taken(name); count += 1) name = `data-name-${count}`;
  return name;
}

/** One change to the list: rename or set the attribute at an index, add, or remove one. */
export type DataAttributeEdit =
  | { readonly kind: 'name'; readonly index: number; readonly name: string }
  | { readonly kind: 'value'; readonly index: number; readonly value: string }
  | { readonly kind: 'add'; readonly name: string }
  | { readonly kind: 'remove'; readonly index: number };

/**
 * The `rootAttributes` value after an edit, keeping the others in order;
 * undefined (unset) once the last attribute is removed.
 */
export function editDataAttributes(
  attributes: readonly DataAttribute[],
  edit: DataAttributeEdit,
): Record<string, string> | undefined {
  let next: DataAttribute[];
  switch (edit.kind) {
    case 'name':
      next = attributes.map((item, at) =>
        at === edit.index ? [edit.name, item[1]] : item,
      );
      break;
    case 'value':
      next = attributes.map((item, at) =>
        at === edit.index ? [item[0], edit.value] : item,
      );
      break;
    case 'add':
      next = [...attributes, [edit.name, '']];
      break;
    case 'remove':
      next = attributes.filter((_item, at) => at !== edit.index);
      break;
  }
  return next.length ? Object.fromEntries(next) : undefined;
}

// Placeholder values for list and object props (KF-HNNWN9: a Combobox, a
// Select, or a PopupMenu added from the palette has its suggestions, choices,
// or items to render). One rule for every component, read from the props
// catalog's type graph rather than a per-component table.
import type { ViewDocument, ViewType, ViewValue } from '@kerfjs/ui/view';

type Definitions = Readonly<Record<string, ViewType>>;

interface TypeNode {
  readonly kind: string;
  readonly ref?: string;
  readonly values?: readonly unknown[];
  readonly value?: unknown;
  readonly members?: readonly TypeNode[];
  readonly items?: TypeNode;
  readonly props?: readonly {
    readonly name: string;
    readonly type: TypeNode;
    readonly required?: boolean;
  }[];
  readonly acceptsText?: true;
}

/** How many items a placeholder list holds. */
export const EXAMPLE_ITEMS = 3;

/** `type` with its `ref`s followed, or undefined for an unknown name. */
export function resolveType(
  type: ViewType | undefined,
  definitions: Definitions,
): TypeNode | undefined {
  let current = type as TypeNode | undefined;
  for (let hops = 0; current?.kind === 'ref' && hops < 32; hops += 1)
    current = definitions[current.ref!] as TypeNode | undefined;
  return current?.kind === 'ref' ? undefined : current;
}

/** Whether a prop of `type` holds a list or an object literal. */
export function isStructured(
  type: ViewType | undefined,
  definitions: Definitions,
): boolean {
  const kind = resolveType(type, definitions)?.kind;
  return kind === 'array' || kind === 'object';
}

/**
 * "suggestions" → "Suggestion", "entries" → "Entry", "trailingMenu" →
 * "Trailing menu".
 */
function singular(name: string): string {
  const word = name
    .replace(/ies$/, 'y')
    .replace(/s$/, '')
    .replace(
      /([a-z0-9])([A-Z])/g,
      (_, a: string, b: string) => `${a} ${b.toLowerCase()}`,
    );
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const slug = (text: string) => text.toLowerCase().replace(/\s+/g, '-');

/** "View 1" + "content" → "view1Content", a slot name. */
const camel = (...words: string[]) =>
  words
    .join(' ')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(
      (word, index) =>
        (index ? word.charAt(0).toUpperCase() : word.charAt(0).toLowerCase()) +
        word.slice(1),
    )
    .join('');

/** Names an item slot for content no literal can hold, from a name hint. */
export type SlotNamer = (hint: string) => string;

/** Every `$slot` name `document` uses: in zones or inside prop values. */
export function usedSlots(document: ViewDocument): Set<string> {
  const names = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value !== null && typeof value === 'object') {
      const { $slot } = value as { $slot?: unknown };
      if (typeof $slot === 'string') names.add($slot);
      Object.values(value).forEach(visit);
    }
  };
  visit(document.root);
  return names;
}

/**
 * A namer that hands out slot names no place in `taken` (or an earlier call)
 * uses: the hint, else the hint numbered from 2.
 */
export function slotNamer(taken: Iterable<string>): SlotNamer {
  const used = new Set(taken);
  return (hint) => {
    let name = hint;
    for (let count = 2; used.has(name); count += 1) name = `${hint}${count}`;
    used.add(name);
    return name;
  };
}

/**
 * A placeholder literal of `type`, or undefined when none can be made up (a
 * function, a CSS value). `name` is the prop the value is for: list items are
 * numbered after it ("Choice 1" with value `choice-1`). Rendered content no
 * text can stand for (a view's body, an icon) becomes an item slot named by
 * `slot` (KF-SXDM56: "view1Content"); without `slot` there is none.
 */
export function exampleValue(
  type: ViewType | undefined,
  definitions: Definitions,
  name: string,
  slot?: SlotNamer,
): ViewValue | undefined {
  return example(resolveType(type, definitions), {
    definitions,
    name,
    index: 0,
    depth: 0,
    slot,
  });
}

interface Place {
  readonly definitions: Definitions;
  /** The list the value sits in, or the prop it is for. */
  readonly name: string;
  /** 1-based position in that list; 0 outside a list. */
  readonly index: number;
  readonly depth: number;
  /** The object field the value fills, if any. */
  readonly field?: string;
  readonly slot?: SlotNamer;
}

function example(
  type: TypeNode | undefined,
  place: Place,
): ViewValue | undefined {
  const { definitions, name, index, depth } = place;
  if (!type || depth > 4) return undefined;
  const label = `${singular(name)}${index ? ` ${index}` : ''}`;
  const inner = (next: ViewType | undefined, change: Partial<Place> = {}) =>
    example(resolveType(next, definitions), {
      ...place,
      depth: depth + 1,
      ...change,
    });
  switch (type.kind) {
    case 'string':
      return label;
    case 'content':
      if (type.acceptsText) return label;
      return place.slot
        ? { $slot: place.slot(camel(label, place.field ?? '')) }
        : undefined;
    case 'number':
      return index;
    case 'boolean':
      return false;
    case 'literal':
      return type.value as ViewValue;
    case 'enum':
      return type.values?.[0] as ViewValue | undefined;
    case 'union':
      for (const member of type.members ?? []) {
        const value = inner(member as ViewType);
        if (value !== undefined) return value;
      }
      return undefined;
    case 'array': {
      const items: ViewValue[] = [];
      for (let item = 1; item <= EXAMPLE_ITEMS; item += 1) {
        const value = inner(type.items as ViewType, { index: item });
        if (value === undefined) return undefined;
        items.push(value);
      }
      return items;
    }
    case 'object': {
      const value: Record<string, ViewValue> = {};
      for (const prop of type.props ?? []) {
        if (!prop.required) continue;
        // An item's `value` and `id` are its slug; its other text reads as
        // its label ("Choice 1").
        const field =
          (prop.name === 'value' || prop.name === 'id') &&
          resolveType(prop.type as ViewType, definitions)?.kind === 'string'
            ? slug(label)
            : inner(
                prop.type as ViewType,
                // A nested list numbers its own items ("Item 1").
                resolveType(prop.type as ViewType, definitions)?.kind ===
                  'array'
                  ? { field: prop.name, name: prop.name, index: 0 }
                  : { field: prop.name },
              );
        if (field === undefined) return undefined;
        value[prop.name] = field;
      }
      return value;
    }
    default:
      return undefined;
  }
}

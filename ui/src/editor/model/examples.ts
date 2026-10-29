// Placeholder values for list and object props (KF-HNNWN9: a Combobox, a
// Select, or a PopupMenu added from the palette has its suggestions, choices,
// or items to render). One rule for every component, read from the props
// catalog's type graph rather than a per-component table.
import type { ViewType, ViewValue } from '@kerfjs/ui/view';

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

/** "suggestions" → "Suggestion", "items" → "Item", "entries" → "Entry". */
function singular(name: string): string {
  const word = name.replace(/ies$/, 'y').replace(/s$/, '');
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const slug = (text: string) => text.toLowerCase().replace(/\s+/g, '-');

/**
 * A placeholder literal of `type`, or undefined when none can be made up (a
 * function, rendered content, a CSS value). `name` is the prop the value is
 * for: list items are numbered after it ("Choice 1" with value `choice-1`).
 */
export function exampleValue(
  type: ViewType | undefined,
  definitions: Definitions,
  name: string,
): ViewValue | undefined {
  return example(resolveType(type, definitions), definitions, name, 0, 0);
}

function example(
  type: TypeNode | undefined,
  definitions: Definitions,
  /** The list the value sits in, or the prop it is for. */
  name: string,
  /** 1-based position in that list; 0 outside a list. */
  index: number,
  depth: number,
): ViewValue | undefined {
  if (!type || depth > 4) return undefined;
  const label = `${singular(name)}${index ? ` ${index}` : ''}`;
  switch (type.kind) {
    case 'string':
      return label;
    case 'content':
      return type.acceptsText ? label : undefined;
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
        const value = example(
          resolveType(member as ViewType, definitions),
          definitions,
          name,
          index,
          depth + 1,
        );
        if (value !== undefined) return value;
      }
      return undefined;
    case 'array': {
      const items: ViewValue[] = [];
      for (let item = 1; item <= EXAMPLE_ITEMS; item += 1) {
        const value = example(
          resolveType(type.items as ViewType, definitions),
          definitions,
          name,
          item,
          depth + 1,
        );
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
            : example(
                resolveType(prop.type as ViewType, definitions),
                definitions,
                name,
                index,
                depth + 1,
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

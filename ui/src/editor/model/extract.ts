// KF-D9P3NP: Extract to document (row template phase 3, docs/26-ui-editor.md
// §3.7). A selected subtree becomes a document of its own, whose params are
// the values the subtree reads from outside itself, and a `#view` node takes
// its place, passing those values back. These are the pure parts: the path
// the editor suggests, why a node cannot be extracted, and the two documents.
import {
  validateView,
  type ViewCatalog,
  type ViewChild,
  type ViewDocument,
  type ViewNode,
  type ViewTemplate,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';

import { documentFileName, findNode, visitNodes } from './document.js';
import { eachScopes } from './edits.js';

const kebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const folderOf = (path: string) => path.slice(0, path.lastIndexOf('/') + 1);

/**
 * The project path the editor suggests for a node extracted from the
 * document at `documentPath` (undefined for a draft): beside it, named from
 * the document and the node (`views/messages.kui.json` and a ListItem make
 * `views/messages-list-item.kui.json`; a named node uses its name).
 */
export function extractSuggestion(
  document: ViewDocument,
  documentPath: string | undefined,
  id: string,
): string {
  const node = findNode(document, id)!.node;
  const file = documentPath ?? documentFileName(document);
  const base = file
    .slice(file.lastIndexOf('/') + 1)
    .replace(/(\.kui)?\.json$/, '');
  const part = node.name ?? node.type.slice(node.type.lastIndexOf(':') + 1);
  return `${documentPath ? folderOf(documentPath) : ''}${base}-${kebab(part) || 'part'}.kui.json`;
}

/** The `src` a document at `from` names the document at `to` by. */
export function relativeSrc(from: string, to: string): string {
  const fromParts = from.split('/').slice(0, -1);
  const toParts = to.split('/');
  let shared = 0;
  while (
    shared < fromParts.length &&
    shared < toParts.length - 1 &&
    fromParts[shared] === toParts[shared]
  )
    shared += 1;
  const up = fromParts.length - shared;
  const rest = toParts.slice(shared).join('/');
  return up ? `${'../'.repeat(up)}${rest}` : `./${rest}`;
}

/** The PascalCase document name a file at `path` gets. */
export function documentNameFor(path: string): string {
  const base = path
    .slice(path.lastIndexOf('/') + 1)
    .replace(/(\.kui)?\.json$/, '');
  const name = base
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join('');
  return /^[A-Z]/.test(name) ? name : `View${name}`;
}

/** Whether `value` holds a `$slot` (a zone slot or an item slot) anywhere. */
function holdsSlot(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(holdsSlot);
  if (value === null || typeof value !== 'object') return false;
  if ('$slot' in value) return true;
  return Object.values(value).some(holdsSlot);
}

/** Why node `id` cannot be extracted, or undefined when it can. */
export function extractProblem(
  document: ViewDocument,
  id: string,
): string | undefined {
  const found = findNode(document, id);
  if (!found) return 'Select a node to extract.';
  if (!found.ancestors.length)
    return 'The root is the whole document; Save As copies it.';
  if (holdsSlot(found.node))
    return 'It holds a slot, and a composed document cannot declare slots.';
  return undefined;
}

/** A reference the subtree reads from outside itself. */
type Read =
  | { readonly kind: 'param'; readonly name: string }
  | { readonly kind: 'item'; readonly as: string; readonly field?: string };

const readKey = (read: Read) =>
  read.kind === 'param'
    ? `param ${read.name}`
    : `item ${read.as}${read.field === undefined ? '' : `.${read.field}`}`;

const fieldOf = (type: ViewType | undefined, name: string) =>
  type?.kind === 'object'
    ? type.props?.find((prop) => prop.name === name)?.type
    : undefined;

const CAMEL = /^[a-z][A-Za-z0-9]*$/;
/** Names the generated module uses, which a param must not take. */
const RESERVED = new Set(['inputs', 'slots', 'each', 'handlers']);

/** Maps every `$param` and `$bind` in a value, outside names in `local`. */
type Reference = (
  value: { readonly $param: string } | { readonly $bind: string },
) => ViewValue;

function mapValue(
  value: ViewValue,
  local: ReadonlySet<string>,
  reference: Reference,
): ViewValue {
  if (Array.isArray(value))
    return value.map((item: ViewValue) => mapValue(item, local, reference));
  if (value === null || typeof value !== 'object') return value;
  if ('$param' in value) return reference(value as { $param: string });
  if ('$bind' in value) {
    const head = String(value.$bind).split('.')[0]!;
    return local.has(head) ? value : reference(value as { $bind: string });
  }
  if (Object.keys(value).some((key) => key.startsWith('$'))) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      mapValue(item as ViewValue, local, reference),
    ]),
  );
}

/** `node`'s subtree with every value outside `local` mapped by `reference`. */
function mapSubtree(
  node: ViewNode,
  local: ReadonlySet<string>,
  reference: Reference,
): ViewNode {
  const value = (item: ViewValue, names = local) =>
    mapValue(item, names, reference);
  const template = (
    item: ViewTemplate,
    names: ReadonlySet<string>,
  ): ViewTemplate =>
    '$if' in item
      ? {
          ...item,
          $if: value(item.$if, names),
          then: mapSubtree(item.then, names, reference),
          else: template(item.else, names),
        }
      : mapSubtree(item, names, reference);
  const child = (item: ViewChild): ViewChild => {
    if ('$each' in item) {
      const names = new Set([...local, item.as]);
      if ('templates' in item)
        return {
          ...item,
          $each: value(item.$each),
          kind: value(item.kind, names),
          templates: Object.fromEntries(
            Object.entries(item.templates).map(([kind, row]) => [
              kind,
              mapSubtree(row, names, reference),
            ]),
          ),
        } as ViewChild;
      return {
        ...item,
        $each: value(item.$each),
        template: template(item.template, names),
      };
    }
    if ('$if' in item)
      return {
        ...item,
        $if: value(item.$if),
        then: child(item.then),
        ...(item.else ? { else: child(item.else) } : {}),
      };
    // A slot never reaches here: extractProblem refuses it first.
    return mapSubtree(item as ViewNode, local, reference);
  };
  return {
    ...node,
    ...(node.props
      ? {
          props: Object.fromEntries(
            Object.entries(node.props).map(([name, item]) => [
              name,
              value(item),
            ]),
          ),
        }
      : {}),
    ...(node.value !== undefined ? { value: value(node.value) } : {}),
    ...(node.zones
      ? {
          zones: Object.fromEntries(
            Object.entries(node.zones).map(([zone, list]) => [
              zone,
              list.map(child),
            ]),
          ),
        }
      : {}),
  };
}

/** `document` with node `id` replaced by `replacement`, wherever it sits. */
function replaceNode(
  document: ViewDocument,
  id: string,
  replacement: ViewNode,
): ViewDocument {
  const node = (item: ViewNode): ViewNode =>
    item.id === id
      ? replacement
      : item.zones
        ? {
            ...item,
            zones: Object.fromEntries(
              Object.entries(item.zones).map(([zone, list]) => [
                zone,
                list.map(child),
              ]),
            ),
          }
        : item;
  const template = (item: ViewTemplate): ViewTemplate =>
    '$if' in item
      ? { ...item, then: node(item.then), else: template(item.else) }
      : node(item);
  const child = (item: ViewChild): ViewChild => {
    if ('$each' in item)
      return 'templates' in item
        ? ({
            ...item,
            templates: Object.fromEntries(
              Object.entries(item.templates).map(([kind, row]) => [
                kind,
                node(row),
              ]),
            ),
          } as ViewChild)
        : { ...item, template: template(item.template) };
    if ('$if' in item)
      return {
        ...item,
        then: child(item.then),
        ...(item.else ? { else: child(item.else) } : {}),
      };
    if ('$slot' in item) return item;
    return node(item);
  };
  return { ...document, root: node(document.root!) };
}

/** The `$each` names a subtree introduces. */
function localNames(node: ViewNode): Set<string> {
  const names = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value !== null && typeof value === 'object') {
      const { $each: each, as } = value as { $each?: unknown; as?: unknown };
      if (each !== undefined && typeof as === 'string') names.add(as);
      Object.values(value).forEach(visit);
    }
  };
  visit(node);
  return names;
}

export interface Extraction {
  /** The composing document, with the `#view` in place of the subtree. */
  readonly document: ViewDocument;
  /** The new document, whose root is the subtree. */
  readonly extracted: ViewDocument;
  /** The `#view` node's id. */
  readonly view: string;
  /** Its `src`, relative to the composing document. */
  readonly src: string;
}

export interface ExtractOptions {
  /** The composing document's project path. */
  readonly documentPath: string;
  /** The new document's project path. */
  readonly path: string;
  /** The `#view` node's id. */
  readonly view: string;
  readonly catalog: ViewCatalog;
  /** Loads the documents the composing document already composes. */
  readonly resolveView?: (src: string) => unknown;
}

/**
 * Extracts node `id` of `document` into a new document at `options.path`.
 * Every `$param` and every `$bind` the subtree reads from outside itself
 * becomes a param of the new document: a document param keeps its name and
 * definition, and an enclosing `$each` item's field (`message.subject`)
 * becomes a param named for the field, typed from the item's type. A `#view`
 * replaces the subtree and passes each value back. Refused, with the reason,
 * when a read has no known type or the result adds a problem.
 */
export function extractToDocument(
  document: ViewDocument,
  id: string,
  options: ExtractOptions,
): Extraction | { readonly error: string } {
  const problem = extractProblem(document, id);
  if (problem) return { error: problem };
  const { documentPath, path, catalog, resolveView } = options;
  const node = findNode(document, id)!.node;
  const params = document.params ?? {};

  // The type of each enclosing `$each` item, outermost first.
  const items = new Map<string, ViewType | undefined>();
  const typeOf = (value: unknown): ViewType | undefined => {
    const source = value as { $param?: string; $bind?: string };
    if (typeof source?.$param === 'string') return params[source.$param]?.type;
    if (typeof source?.$bind !== 'string') return undefined;
    const [head, ...rest] = source.$bind.split('.');
    const start = items.has(head!) ? items.get(head!) : params[head!]?.type;
    return rest.reduce<ViewType | undefined>(fieldOf, start);
  };
  for (const scope of eachScopes(document, id)) {
    const type = typeOf(scope.source);
    items.set(scope.as, type?.kind === 'array' ? type.items : undefined);
  }

  // What the subtree reads from outside itself, in document order.
  const local = localNames(node);
  const reads = new Map<string, Read>();
  const readOf = (
    value: { readonly $param: string } | { readonly $bind: string },
  ): Read | undefined => {
    if ('$param' in value) return { kind: 'param', name: value.$param };
    const [head, field] = value.$bind.split('.');
    if (items.has(head!)) return { kind: 'item', as: head!, field };
    return { kind: 'param', name: head! };
  };
  mapSubtree(node, local, (value) => {
    const read = readOf(value)!;
    reads.set(readKey(read), read);
    return value;
  });

  // Names: document params keep theirs; an item read takes its field's name.
  const names = new Map<string, string>();
  const taken = new Set([...local, ...RESERVED]);
  for (const [key, read] of reads)
    if (read.kind === 'param') {
      names.set(key, read.name);
      taken.add(read.name);
    }
  const newParams: Record<
    string,
    { type: ViewType; default?: unknown; description?: string }
  > = {};
  const props: Record<string, ViewValue> = {};
  for (const [key, read] of reads) {
    if (read.kind === 'param') {
      const definition = params[read.name];
      // An unknown param stays a problem the validator reports.
      if (!definition) continue;
      newParams[read.name] = { ...definition };
      props[read.name] = { $param: read.name };
      continue;
    }
    const base = read.field ?? read.as;
    const camel = CAMEL.test(base)
      ? base
      : base.replace(/[^A-Za-z0-9]+(.)?/g, (_, next = '') =>
          String(next).toUpperCase(),
        );
    const own = CAMEL.test(camel) ? camel : `${read.as}Value`;
    let name = taken.has(own)
      ? `${read.as}${own[0]!.toUpperCase()}${own.slice(1)}`
      : own;
    for (let count = 2; taken.has(name); count += 1) name = `${own}${count}`;
    const itemType = items.get(read.as);
    const type =
      read.field === undefined ? itemType : fieldOf(itemType, read.field);
    const bound = read.field === undefined ? read.as : `${read.as}.${base}`;
    if (!type)
      return {
        error: `${bound} has no known type, so it cannot become a param. Bind the repeat to a typed param first.`,
      };
    names.set(key, name);
    taken.add(name);
    newParams[name] = { type };
    props[name] = { $bind: bound };
  }

  // A nested #view resolves from the top document (KF-3X7MFF: the CLI
  // resolves nested sources from it), so its src holds only in that folder.
  const composes = visitNodes({ ...document, root: node }).some(
    (visit) => visit.node.type === '#view',
  );
  if (composes && folderOf(path) !== folderOf(documentPath))
    return {
      error:
        'It composes other documents, so it extracts into the same folder as this document.',
    };

  const root = mapSubtree(node, local, (value) => {
    const read = readOf(value)!;
    if (read.kind === 'param') return value;
    const name = names.get(readKey(read))!;
    const path = String((value as { $bind: string }).$bind).split('.');
    const rest = path.slice(read.field === undefined ? 1 : 2);
    return rest.length
      ? { $bind: [name, ...rest].join('.') }
      : { $param: name };
  });
  const extracted: ViewDocument = {
    ...(document.$schema ? { $schema: document.$schema } : {}),
    schema: document.schema,
    name: documentNameFor(path),
    catalogs: [...document.catalogs],
    ...(Object.keys(newParams).length ? { params: newParams } : {}),
    root,
  };
  const src = relativeSrc(documentPath, path);
  const next = replaceNode(document, id, {
    id: options.view,
    type: '#view',
    src,
    ...(Object.keys(props).length ? { props } : {}),
  });

  // Refused when it adds a problem, such as a row document with its own
  // keyed repeat (KUI-V016); problems the subtree had move with it.
  const counts = new Map<string, number>();
  for (const { code } of validateView(document, catalog, { resolveView })
    .diagnostics)
    counts.set(code, (counts.get(code) ?? 0) + 1);
  const added = validateView(next, catalog, {
    resolveView: (name) => (name === src ? extracted : resolveView?.(name)),
  }).diagnostics.find(({ code }) => {
    const left = counts.get(code) ?? 0;
    counts.set(code, left - 1);
    return left <= 0;
  });
  if (added) return { error: `It cannot be extracted: ${added.message}.` };
  return { document: next, extracted, view: options.view, src };
}

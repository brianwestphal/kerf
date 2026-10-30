// interpretView: renders a view document at runtime (docs/26-ui-editor.md §7)
// with exactly the generated module's semantics, after checking that the
// document's contract is the one the application compiled against. For
// server-driven screens; tree-shakes away when unused.
import { each } from 'kerfjs';
import { jsx } from 'kerfjs/jsx-runtime';

import * as cssValues from '../dist/css-values.js';
import { contractDigest, contractOf } from './contract.mjs';
import {
  channelOf,
  fieldZoneOf,
  parseCssTree,
  withFieldZones,
  ZoneFill,
  zonePropOf,
} from './validate.mjs';

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Thrown when a served document's contract differs from the one the
 * application compiled against. `expected` and `actual` are digests;
 * `contract` is the served document's full contract, so a host can log
 * exactly which inputs, actions, slots, or refs it changed.
 */
export class KuiContractMismatch extends Error {
  constructor(name, expected, actual, contract) {
    super(
      `view "${name}" has contract ${actual}, but the application was built against ${expected}; regenerate the app's view module or roll back the document`,
    );
    this.name = 'KuiContractMismatch';
    this.expected = expected;
    this.actual = actual;
    this.contract = contract;
  }
}

/** Evaluates a parsed `$css` call against the css-values builders. */
function evaluateCss(node) {
  const builder = cssValues[node.name];
  return builder(
    ...node.args.map((arg) =>
      typeof arg === 'object' ? evaluateCss(arg) : arg,
    ),
  );
}

function readPath(root, path) {
  return path.reduce((current, segment) => current?.[segment], root);
}

/**
 * Renders a view document. Options:
 * - `catalog`: from `createViewCatalog` (validation and zone bindings);
 * - `components`: catalog key → component function (Kerf UI and app
 *   components the document uses; Web Awesome elements need none);
 * - `inputs`, `slots`: as the generated `render<Name>` takes them;
 * - `contract`: the `<name>Contract` digest the app compiled against;
 * - `onMismatch(error)`: returns fallback `SafeHtml` instead of throwing;
 * - `resolveView(src)`: loads composed documents synchronously.
 * Throws on an invalid document or a component missing from `components`.
 */
export function interpretView(document, options) {
  const { catalog, components, inputs = {}, slots = {}, resolveView } = options;
  const contract = contractOf(document, catalog, { resolveView });
  const actual = contractDigest(contract);
  if (options.contract !== actual) {
    const error = new KuiContractMismatch(
      document.name,
      options.contract,
      actual,
      contract,
    );
    if (options.onMismatch) return options.onMismatch(error);
    throw error;
  }
  return renderDocument(document, inputs, slots, options);
}

/**
 * Renders a document for an editor preview: no validation or contract check,
 * and every node in `broken` (ids the caller's validation flagged), or whose
 * evaluation throws, renders `placeholder(node, reason)` instead, so one bad
 * node never blanks the rest. Options are interpretView's (without
 * `contract`/`onMismatch`) plus `broken` (a Set of node ids) and
 * `placeholder`. Not for applications: they render with interpretView, whose
 * strictness is what keeps a served document from silently breaking them.
 */
export function previewView(document, options) {
  const { inputs = {}, slots = {} } = options;
  return renderDocument(document, inputs, slots, options);
}

function renderDocument(document, inputs, slots, options) {
  const { catalog, components, resolveView } = options;
  const params = document.params ?? {};

  const value = (raw, scope) => {
    // A field zone's children, in the content field it fills (KF-PD6QC5).
    if (raw instanceof ZoneFill) return children(raw.children, scope);
    if (isObject(raw) && '$param' in raw) {
      // `??` as in the generated module: null and undefined take the default.
      const read = inputs[raw.$param];
      return 'default' in params[raw.$param]
        ? (read ?? params[raw.$param].default)
        : read;
    }
    if (isObject(raw) && '$bind' in raw) {
      const [head, ...rest] = raw.$bind.split('.');
      return readPath(scope.has(head) ? scope.get(head) : inputs[head], rest);
    }
    if (isObject(raw) && '$action' in raw) return raw.$action;
    if (isObject(raw) && '$icon' in raw) {
      const icon = options.icons?.[raw.$icon];
      if (!icon) {
        throw new Error(
          `interpretView: no icon data for "${raw.$icon}"; pass it in options.icons`,
        );
      }
      return icon;
    }
    if (isObject(raw) && '$css' in raw)
      return evaluateCss(parseCssTree(raw.$css));
    // An item slot (KF-SXDM56): content the application fills, as a zone's.
    if (isObject(raw) && '$slot' in raw) return slots[raw.$slot]();
    if (isObject(raw)) {
      return Object.fromEntries(
        Object.keys(raw).map((key) => [key, value(raw[key], scope)]),
      );
    }
    if (Array.isArray(raw)) return raw.map((item) => value(item, scope));
    return raw;
  };

  const children = (list, scope, slot) => {
    const items = list.map((child) => childValue(child, scope, slot));
    return items.length === 1 ? items[0] : items;
  };

  const childValue = (child, scope, slot) => {
    if ('$each' in child) {
      // The key path starts with `as` (validation requires it); read the rest
      // from the item.
      const rest = child.key.split('.').slice(1);
      return each(
        value(child.$each, scope),
        (item) =>
          nodeValue(
            child.template,
            new Map(scope).set(child.as, item),
            readPath(item, rest),
            slot,
          ),
        { key: child.template.id },
      );
    }
    if ('$if' in child) {
      if (value(child.$if, scope)) return childValue(child.then, scope, slot);
      return 'else' in child ? childValue(child.else, scope, slot) : null;
    }
    if ('$slot' in child) {
      return isObject(child.input)
        ? slots[child.$slot](value(child.input, scope))
        : slots[child.$slot]();
    }
    return nodeValue(child, scope, undefined, slot);
  };

  // A preview (previewView) swaps a node it cannot render for the caller's
  // placeholder: one the caller already knows is broken, or one whose
  // evaluation throws. The strict interpretView path never does.
  const nodeValue = (node, scope, rowKey, slot) => {
    const { placeholder, broken } = options;
    if (!placeholder) return evaluateNode(node, scope, rowKey, slot);
    if (broken?.has(node.id)) return placeholder(node, 'problem');
    try {
      return evaluateNode(node, scope, rowKey, slot);
    } catch (error) {
      return placeholder(
        node,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const evaluateNode = (node, scope, rowKey, slot) => {
    if (node.type === '#text') {
      const text = value(node.value, scope);
      return slot ? jsx('span', { slot, children: text }) : text;
    }
    if (node.type === '#view') {
      const child = resolveView(node.src);
      return renderDocument(child, value(node.props ?? {}, scope), {}, options);
    }
    const { component: definition, definitions } = catalog.components.get(
      node.type,
    );
    const zones = isObject(node.zones) ? node.zones : {};
    const props = withFieldZones(
      isObject(node.props) ? node.props : {},
      zones,
      definition,
      definitions,
    );
    const out = {};
    for (const name of Object.keys(props)) {
      if (name !== 'rootAttributes') out[name] = value(props[name], scope);
    }
    if (definition.source === 'webawesome') {
      out['data-kerf-node'] = node.id;
      if (rowKey !== undefined) out['data-key'] = String(rowKey);
      if (slot) out.slot = slot;
      const parts = Object.keys(zones)
        .sort()
        .flatMap((key) =>
          zones[key].map((child) =>
            childValue(child, scope, key === 'default' ? undefined : key),
          ),
        );
      if (parts.length) out.children = parts.length === 1 ? parts[0] : parts;
      return jsx(definition.tagName, out);
    }
    for (const key of Object.keys(zones)) {
      if (fieldZoneOf(definition, definitions, key)) continue;
      out[zonePropOf(catalog, definition, key)] = children(zones[key], scope);
    }
    if (slot && definition.props.some((prop) => prop.name === 'slot'))
      out.slot = slot;
    const channel = channelOf(definition);
    if (channel === 'rootAttributes') {
      const base =
        props.rootAttributes === undefined
          ? {}
          : value(props.rootAttributes, scope);
      out.rootAttributes = {
        ...base,
        'data-kerf-node': node.id,
        ...(rowKey === undefined ? {} : { 'data-key': String(rowKey) }),
      };
    } else if (channel === 'native') {
      out['data-kerf-node'] = node.id;
      if (rowKey !== undefined) out['data-key'] = String(rowKey);
    }

    const render = components[node.type];
    if (typeof render !== 'function') {
      throw new Error(
        `interpretView: no component function for ${node.type}; pass it in options.components`,
      );
    }
    return render(out);
  };

  return nodeValue(document.root, new Map(), undefined, undefined);
}

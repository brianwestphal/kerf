// createMoveCheck (KF-SFAA5R: scoped move validation): whether moving one
// node adds a problem, answered without validating the whole moved document
// per destination. A move changes no id, name, slot, or param, so only three
// places can gain or lose problems: the source parent, the target parent, and
// the moved subtree in its new place. Each is checked alone with the
// validator's own checkNode, and the result is the full validation's,
// adjusted. Where a check depends on more than those places (the order of
// action uses, a stale component, duplicate ids, a problem quoting a value
// the move changes; docs/26-ui-editor.md §8.1), the check answers `undefined`
// and the caller validates in full, so an answer is never a guess.
import {
  childFacts,
  createScopedCheck,
  runView,
  validateView,
} from './validate.mjs';

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const keyOf = ({ code, message }) => `${code} ${message}`;
const conflictKey = (name) =>
  `KUI-V009 action "${name}" is used with both row and view scope`;

function count(diagnostics, into = new Map(), sign = 1) {
  for (const diagnostic of diagnostics) {
    const key = keyOf(diagnostic);
    into.set(key, (into.get(key) ?? 0) + sign);
  }
  return into;
}

/**
 * Whether one `$slot` object sits at two places a prop value is checked
 * from: the validator reports a malformed one once per document, by
 * identity, so a piece checked alone would report it again.
 */
function sharedSlot(root) {
  const seen = new WeakSet();
  const value = (item) => {
    if (item === null || typeof item !== 'object') return false;
    if ('$slot' in item) {
      if (seen.has(item)) return true;
      seen.add(item);
    }
    return Object.values(item).some(value);
  };
  const child = (item) => {
    if (!isObject(item)) return false;
    if ('$each' in item) return node(item.template);
    if ('$if' in item)
      return value(item.$if) || child(item.then) || child(item.else);
    if ('$slot' in item) return value(item.input);
    return node(item);
  };
  const node = (item) =>
    isObject(item) &&
    (value(item.props) ||
      value(item.value) ||
      Object.values(isObject(item.zones) ? item.zones : {}).some(
        (list) => Array.isArray(list) && list.some(child),
      ));
  return node(root);
}

/**
 * Every node by id and every node placed directly in a zone list, as the
 * editor's edits find them. Undefined unless the tree is well formed, ids
 * are distinct strings, and names are distinct: then no move can report a
 * duplicate, and each id names one node.
 */
function indexDocument(document) {
  const nodes = new Map();
  const placements = new Map();
  const names = new Set();
  let ok = isObject(document) && !sharedSlot(document.root);
  const node = (item) => {
    if (!ok || !isObject(item) || !('type' in item)) return void (ok = false);
    if (typeof item.id !== 'string' || nodes.has(item.id)) ok = false;
    nodes.set(item.id, item);
    if (typeof item.name === 'string') {
      if (names.has(item.name)) ok = false;
      names.add(item.name);
    }
    if (item.zones === undefined) return;
    if (!isObject(item.zones)) return void (ok = false);
    for (const [zone, list] of Object.entries(item.zones)) {
      if (!Array.isArray(list)) return void (ok = false);
      list.forEach((entry, index) => child(entry, item, zone, index, true));
    }
  };
  const child = (item, parent, zone, index, direct) => {
    if (!isObject(item)) ok = false;
    else if ('$each' in item) node(item.template);
    else if ('$if' in item) {
      child(item.then, parent, zone, index, false);
      if ('else' in item) child(item.else, parent, zone, index, false);
    } else if (!('$slot' in item)) {
      if (direct) placements.set(item.id, { parent, zone, index });
      node(item);
    }
  };
  if (ok) node(document.root);
  return ok ? { nodes, placements } : undefined;
}

/** The ids of every node a zone child holds, itself included. */
function heldIds(item, ids = new Set()) {
  if ('$slot' in item) return ids;
  if ('$each' in item) return heldIds(item.template, ids);
  if ('$if' in item) {
    heldIds(item.then, ids);
    if (item.else) heldIds(item.else, ids);
    return ids;
  }
  ids.add(item.id);
  for (const list of Object.values(item.zones ?? {}))
    for (const inner of list) heldIds(inner, ids);
  return ids;
}

/**
 * `node`'s tree with `prepare` applied to every node, sharing what it leaves
 * alone; `map` records each node's prepared copy.
 */
function prepareTree(node, prepare, map) {
  const prepared = prepare(node);
  let changed = prepared !== node;
  let zones;
  if (node.zones) {
    zones = {};
    for (const [key, list] of Object.entries(node.zones)) {
      zones[key] = list.map((item) => prepareChild(item, prepare, map));
      changed ||= zones[key].some((item, index) => item !== list[index]);
    }
  }
  const result = !changed ? node : zones ? { ...prepared, zones } : prepared;
  map.set(node, result);
  return result;
}

function prepareChild(item, prepare, map) {
  if ('$each' in item) {
    const template = prepareTree(item.template, prepare, map);
    return template === item.template ? item : { ...item, template };
  }
  if ('$if' in item) {
    const then = prepareChild(item.then, prepare, map);
    const otherwise =
      'else' in item ? prepareChild(item.else, prepare, map) : undefined;
    return then === item.then && otherwise === item.else
      ? item
      : { ...item, then, ...('else' in item ? { else: otherwise } : {}) };
  }
  if ('$slot' in item) return item;
  return prepareTree(item, prepare, map);
}

/**
 * Prepares to ask, for node `id`, whether moving it to the end of a zone adds
 * a problem: whether `validateView(moved, catalog)` (with `prepare` applied
 * to every node of the moved document) has a problem, by code and message,
 * that `validateView(document, catalog)` lacks. `prepare` may change a
 * node's own fields from its own fields and its zones' lengths, as the
 * editor's field ownership does; it never changes zones.
 *
 * The returned function takes the target `parent` id and `zone` and answers
 * `true` when the move changes the document and adds no problem, `false`
 * when it adds one or moves nothing (into the node itself), and `undefined`
 * when only a full validation can tell.
 */
export function createMoveCheck(document, catalog, id, options = {}) {
  const prepare = options.prepare ?? ((node) => node);
  const undecided = () => undefined;
  const index = indexDocument(document);
  const place = index?.placements.get(id);
  if (!place) return undecided;

  const map = new Map();
  const root = prepareTree(document.root, prepare, map);
  const prepared = root === document.root ? document : { ...document, root };
  const trace = { entries: new Map(), notes: [], stale: false };
  const base = runView(prepared, catalog, {}, trace).diagnostics;
  // A stale component read depends on document order.
  if (trace.stale) return undecided;
  const beforeCounts = count(
    prepared === document ? base : validateView(document, catalog).diagnostics,
  );
  const baseCounts = count(base);
  const excess = [...baseCounts].filter(
    ([key, total]) => total > (beforeCounts.get(key) ?? 0),
  );
  const baseUses = new Map();
  for (const [name, scope] of trace.notes) {
    const uses = baseUses.get(name) ?? { row: 0, view: 0 };
    uses[scope] += 1;
    baseUses.set(name, uses);
  }

  const check = createScopedCheck(prepared, catalog);
  const shallow = (node, entry, zone) =>
    check(node, entry, { shallow: true, zone });
  const scopeIds = new Map();
  let scopeCount = 0;
  const subtreeRuns = new Map();
  const subtree = (node, entry) => {
    if (!scopeIds.has(entry[1])) scopeIds.set(entry[1], scopeCount++);
    // An entry is checkNode's arguments (path, scope, row scope, parent,
    // text zone) and the enclosing control; all but the path matter.
    const [, scope, ...rest] = entry;
    const key = JSON.stringify([scopeIds.get(scope), ...rest]);
    if (!subtreeRuns.has(key))
      subtreeRuns.set(key, check(node, entry, { asChild: true }));
    return subtreeRuns.get(key);
  };

  const sourceDoc = place.parent;
  const sourceZone = place.zone;
  const movedDoc = index.nodes.get(id);
  const moved = map.get(movedDoc);
  const source = map.get(sourceDoc);
  const held = heldIds(movedDoc);
  const without = (zones) => ({
    ...zones,
    [sourceZone]: zones[sourceZone].filter((_, at) => at !== place.index),
  });
  const leftDoc = { ...sourceDoc, zones: without(sourceDoc.zones) };
  const left = { ...prepare(leftDoc), zones: without(source.zones) };
  const sourceEntry = trace.entries.get(source);
  const sourceBefore = sourceEntry && shallow(source, sourceEntry);
  const sourceAfter = sourceEntry && shallow(left, sourceEntry);
  const movedEntry = trace.entries.get(moved);
  const movedBefore = movedEntry && check(moved, movedEntry, { asChild: true });
  const shallowBefore = new Map();
  // Same host for its children, same facts for its parent: else the move
  // reaches past the three places.
  const sameReach = (before, after, node, next) =>
    before.hostAfter === after.hostAfter &&
    childFacts(catalog, node) === childFacts(catalog, next);

  return (parent, zone) => {
    if (held.has(parent)) return false;
    const targetDoc = index.nodes.get(parent);
    if (!targetDoc || (targetDoc === sourceDoc && zone === sourceZone))
      return undefined;
    const list = targetDoc.zones?.[zone];
    if (list !== undefined && !Array.isArray(list)) return undefined;
    const same = targetDoc === sourceDoc;
    const target = map.get(targetDoc);
    const append = (zones, item) => ({
      ...(zones ?? {}),
      [zone]: [...(zones?.[zone] ?? []), item],
    });
    const baseDoc = same ? leftDoc : targetDoc;
    const landed = {
      ...prepare({ ...baseDoc, zones: append(baseDoc.zones, movedDoc) }),
      zones: append(same ? left.zones : target.zones, moved),
    };
    const removed = movedBefore ? [movedBefore] : [];
    const added = [];
    if (sourceEntry && !same) {
      if (!sameReach(sourceBefore, sourceAfter, source, left)) return undefined;
      removed.push(sourceBefore);
      added.push(sourceAfter);
    }
    const targetEntry = trace.entries.get(target);
    if (targetEntry) {
      if (!shallowBefore.has(target))
        shallowBefore.set(target, shallow(target, targetEntry));
      const before = shallowBefore.get(target);
      const after = shallow(landed, targetEntry, zone);
      if (!sameReach(before, after, target, landed)) return undefined;
      removed.push(before);
      added.push(after);
      if (after.child) {
        const run = subtree(moved, after.child);
        if (run.stale) return undefined;
        added.push(run);
      }
    }
    const delta = new Map();
    const uses = new Map();
    for (const [runs, sign] of [
      [removed, -1],
      [added, 1],
    ]) {
      for (const run of runs) {
        count(run.diagnostics, delta, sign);
        for (const [name, scope] of run.notes) {
          const use = uses.get(name) ?? { row: 0, view: 0 };
          use[scope] += sign;
          uses.set(name, use);
        }
      }
    }
    // Each use of an action in the other scope than its first use reports a
    // conflict. One scope reports none; with both, document order decides
    // between the two counts, which matters only when they fall on either
    // side of the count before the move.
    const conflicts = new Map();
    for (const [name, use] of uses) {
      const total = baseUses.get(name) ?? { row: 0, view: 0 };
      const row = total.row + use.row;
      const view = total.view + use.view;
      const key = conflictKey(name);
      const before = beforeCounts.get(key) ?? 0;
      if (!row || !view) conflicts.set(key, 0);
      else if (Math.min(row, view) > before) return false;
      else if (Math.max(row, view) <= before) conflicts.set(key, before);
      else return undefined;
    }
    for (const key of new Set([
      ...delta.keys(),
      ...excess.map(([key]) => key),
    ])) {
      const total =
        conflicts.get(key) ??
        (baseCounts.get(key) ?? 0) + (delta.get(key) ?? 0);
      if (total > (beforeCounts.get(key) ?? 0)) return false;
    }
    return true;
  };
}

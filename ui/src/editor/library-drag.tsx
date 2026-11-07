// Library and Outline drag and drop (KF-N0CSVT: split out of editor.tsx):
// the node a drag carries, where each drop lands and whether it may, the
// drop captions and refusals, replacing drops, and the drop menu's choices.
// createEditor wires the pointer and keyboard events; this owns the drop
// decisions they ask about.
import {
  validateView,
  type ViewDocument,
  type ViewNode,
} from '@kerfjs/ui/view';
import { type Signal, signal } from 'kerfjs';

import { openPopupMenuAt } from '../components/actions/popup-menu/popup-menu.js';
import type { TreeListMove } from '../components/collections/tree-list/wiring/wire-tree-list.js';
import type { CanvasDropSurface } from './canvas-drag.js';
import type { EditorContext } from './editor-context.js';
import { findNode, visitNodes } from './model/document.js';
import { dropPlacement, insertPlacement, sourceOf } from './model/drop.js';
import {
  isSeedPlaceholder,
  layoutZones,
  type Replacement,
  replaceNode,
  singleChildPlace,
  zoneRegions,
  zoneTitle,
} from './model/drop-zones.js';
import {
  copyChild,
  insertNode,
  newNodeId,
  placeChild,
  primaryFirst,
  replaceRoot,
  withCatalog,
  type ZoneOption,
} from './model/edits.js';
import { insertedView } from './model/insert-view.js';
import {
  nodeTitle,
  type OutlineNode,
  outlineTree,
  slotRowAddress,
  slotRowId,
  zoneLabel,
} from './model/outline.js';
import { placementReason } from './model/problems.js';
import {
  DOCUMENT_AREAS,
  type DocumentArea,
  DROP_MENU,
  EMPTY_ZONE_TARGET,
  emptyZoneTarget,
  REPLACE_TARGET,
  replaceTarget,
  ROOT_TARGET,
  SPRING_MS,
} from './shell-names.js';

/**
 * KF-FXACB5: a Library document's read: the document, or why it cannot be
 * inserted.
 */
export type LibraryRead =
  { readonly document: ViewDocument } | { readonly problem: string };

/** What createLibraryDrag reads beyond the editor context. */
export interface LibraryDragDeps {
  readonly CHANGED_MEANWHILE: 'The document changed meanwhile; insert it again.';
  readonly PALETTE_SOURCE: 'component:';
  readonly asRoot: (node: ViewNode) => ViewNode;
  readonly emptyDocument: () => ViewDocument;
  readonly documentArea: Signal<DocumentArea>;
  readonly documentSource: (sourceId: string) => string | undefined;
  readonly fromLibrary: (sourceId: string) => boolean;
  readonly libraryAnswers: Map<string, LibraryRead>;
  readonly readLibraryDocument: (path: string) => Promise<LibraryRead>;
  readonly refuseLibrary: (message: string) => void;
  readonly seededNode: (key: string) => ViewNode;
  readonly showDocument: (path: string, document: ViewDocument) => void;
  readonly sourceProblem: (sourceId: string) => string | undefined;
  readonly zonesOf: (node: ViewNode, wanted?: string) => ZoneOption[];
}

export function createLibraryDrag(ctx: EditorContext, deps: LibraryDragDeps) {
  const { autosave, commit, currentProblems, doc, inspectorArea, select } = ctx;
  const { componentNames, viewCatalog } = ctx.catalog;
  const {
    CHANGED_MEANWHILE,
    PALETTE_SOURCE,
    asRoot,
    documentArea,
    documentSource,
    emptyDocument,
    fromLibrary,
    libraryAnswers,
    readLibraryDocument,
    refuseLibrary,
    seededNode,
    showDocument,
    sourceProblem,
    zonesOf,
  } = deps;

  /**
   * The node a palette drag adds, made once per drag so its id, and so the
   * cached drop results, stay the same while it moves. A document's `#view`
   * is made again once its read answers, with its required params seeded.
   */
  let dragged: ViewNode | undefined;
  let draggedKey: unknown;
  const draggedNode = (sourceId: string): ViewNode => {
    const path = documentSource(sourceId);
    const read = path === undefined ? undefined : libraryAnswers.get(path);
    const key = read ?? sourceId;
    if (draggedKey !== key) {
      draggedKey = key;
      dragged =
        path === undefined
          ? seededNode(sourceId.slice(PALETTE_SOURCE.length))
          : insertedView(
              newNodeId(),
              autosave!.path.peek(),
              path,
              // A refused document never reaches a drop (`sourceProblem`).
              (read as { document: ViewDocument } | undefined)?.document ??
                emptyDocument(),
            );
    }
    return dragged!;
  };

  /**
   * KF-FXACB5: a Library document's drop waits for its read, then places
   * like a component's; a refused or stale one says why in the Library.
   */
  const applyMove = (move: TreeListMove) => {
    const path = documentSource(move.sourceId);
    if (path === undefined) {
      placeMove(move);
      return;
    }
    const before = doc.peek();
    void readLibraryDocument(path).then((read) => {
      if ('problem' in read) return refuseLibrary(read.problem);
      if (doc.peek() !== before) return refuseLibrary(CHANGED_MEANWHILE);
      showDocument(path, read.document);
      placeMove(move);
    });
  };

  const placeMove = (move: TreeListMove) => {
    // KF-WKABP2: a drop replacing a node alone in its zone; authored content
    // asks first, a seeded placeholder does not.
    const replaced = replaceTarget(move.target.id);
    if (replaced) {
      if (!replaceFor(move)) return;
      if (
        isSeedPlaceholder(doc.value, replaced, (key) =>
          componentNames.get(key)!,
        )
      )
        commitReplace(move);
      else pendingReplace.value = move;
      return;
    }
    if (fromLibrary(move.sourceId)) {
      const to = dropFor(move);
      if (!to) return;
      const node = draggedNode(move.sourceId);
      draggedKey = undefined;
      if (to.parent === ROOT_TARGET) {
        // KF-PK3GVY: seeded as Replace the root seeds it (a Pane fills).
        const root = asRoot(node);
        commit(replaceRoot(doc.value, root));
        select({ kind: 'node', id: root.id });
        inspectorArea.value = 'properties';
        return;
      }
      commit(
        withCatalog(
          insertNode(doc.value, to.parent, to.zone, node, to.index),
          node.type,
        ),
      );
      select({ kind: 'node', id: node.id });
      // A new node opens on its Properties, ready to fill in.
      inspectorArea.value = 'properties';
      return;
    }
    const to = dropFor(move);
    const from = sourceOf(doc.value, move.sourceId);
    if (!to || !from) return;
    const moved = placeChild(doc.value, from, to);
    commit(moved.document);
    select(
      slotRowAddress(move.sourceId)
        ? { kind: 'slot', address: moved.at }
        : { kind: 'node', id: move.sourceId },
    );
  };

  /**
   * An outline row's label by id (a node's name or component, or a slot),
   * kept per document while a drag passes over the same rows.
   */
  let rowLabels: { document: ViewDocument; labels: Map<string, string> } = {
    document: doc.value,
    labels: new Map(),
  };
  const rowLabel = (id: string): string => {
    if (rowLabels.document !== doc.value || !rowLabels.labels.size) {
      const labels = new Map<string, string>();
      const add = (nodes: readonly OutlineNode[]) => {
        for (const node of nodes) {
          labels.set(node.id, node.label);
          if (node.children) add(node.children);
        }
      };
      add(outlineTree(doc.value, componentNames));
      rowLabels = { document: doc.value, labels };
    }
    // Every drag source and target is an outline row.
    return rowLabels.labels.get(id)!;
  };

  /**
   * A zone as a drop caption names it (KF-WKABP2): its container, then the
   * zone by its layout's name ("Workbench › Left rail") or its key.
   */
  const zoneName = (parent: string, zone: string) => {
    const node = findNode(doc.value, parent)?.node;
    const title = (node && zoneTitle(node.type, zone)) ?? zoneLabel(zone);
    return `${rowLabel(parent)} › ${title}`;
  };
  /** What a replacing drop replaces, by name: a placeholder by its text. */
  const replacedName = (id: string) =>
    isSeedPlaceholder(doc.value, id, (key) => componentNames.get(key)!)
      ? String(findNode(doc.value, id)!.node.props!.children)
      : rowLabel(id);

  /**
   * Where a legal drag move lands, in words (KF-Y4GHQV): beside its target,
   * or inside it, naming the zone when the target has more than one.
   */
  const dropCaption = (move: TreeListMove): string => {
    if (move.target.id === ROOT_TARGET) return 'As the root';
    const replaced = replaceTarget(move.target.id);
    if (replaced) return `Replace ${replacedName(replaced)}`;
    const empty = emptyZoneTarget(move.target.id);
    if (empty) return `Inside ${zoneName(empty.parent, empty.zone)}`;
    const target = rowLabel(move.target.id);
    if (move.target.position === 'before') return `Before ${target}`;
    if (move.target.position === 'after') return `After ${target}`;
    const zone = dropFor(move)?.zone;
    const node = findNode(doc.value, move.target.id)?.node;
    return node && zone && zoneKeys(node).length > 1
      ? `Inside ${target} › ${zone}`
      : `Inside ${target}`;
  };

  /**
   * Why a drag cannot drop on canvas target `targetId` (KF-6RYJ64): the
   * first problem placing it there would add, else that it does not fit.
   */
  const dropRefusal = (sourceId: string, targetId: string): string => {
    // KF-FXACB5: a Library document that cannot be composed goes nowhere.
    const problem = sourceProblem(sourceId);
    if (problem) return problem;
    const empty = emptyZoneTarget(targetId);
    const slot = slotRowAddress(targetId);
    const parent = empty?.parent ?? slot?.parent ?? targetId;
    // Canvas targets and drag sources are always nodes of the document.
    const target = findNode(doc.value, parent)!.node;
    const node = fromLibrary(sourceId)
      ? draggedNode(sourceId)
      : findNode(doc.value, sourceId)!.node;
    const name = node.name ?? nodeTitle(node, componentNames);
    // The zone a drop inside would fill: not one whose prop holds text.
    const zone =
      empty?.zone ??
      slot?.zone ??
      zoneKeys(target).find((key) => target.props?.[key] === undefined);
    if (!zone) return `${name} cannot go here`;
    const before = new Set(
      currentProblems.value.map(({ diagnostic }) => diagnostic.message),
    );
    const inserted = fromLibrary(sourceId)
      ? node
      : // A copy, so its names do not clash with the original's.
        copyChild(
          node,
          new Set(
            visitNodes(doc.value).flatMap(({ node: item }) =>
              item.name ? [item.name] : [],
            ),
          ),
        );
    const placed = withCatalog(
      insertNode(doc.value, parent, zone, inserted),
      node.type,
    );
    return (
      placementReason(
        placed,
        validateView(placed, viewCatalog).diagnostics.filter(
          (diagnostic) => !before.has(diagnostic.message),
        ),
        inserted.id,
        componentNames,
      ) ?? `${name} cannot go here`
    );
  };

  /**
   * A drop surface that opens the Document tab a drag rests on for
   * `SPRING_MS` (spring-loading, KF-67K2VP), so a drag from the palette can
   * go on to the outline. It never offers a drop itself.
   */
  const springTabs = (): CanvasDropSurface => {
    let pending: { tab: string; timer: number } | undefined;
    const clear = () => {
      if (pending) window.clearTimeout(pending.timer);
      pending = undefined;
    };
    return {
      over: (hit) => {
        const tab = hit
          ?.closest<HTMLElement>(`[data-tab-id^="${DOCUMENT_AREAS}-"]`)
          ?.dataset.tabId?.slice(DOCUMENT_AREAS.length + 1) as
          DocumentArea | undefined;
        if (tab === pending?.tab) return undefined;
        clear();
        if (tab && tab !== documentArea.value)
          pending = {
            tab,
            timer: window.setTimeout(() => {
              documentArea.value = tab;
              pending = undefined;
            }, SPRING_MS),
          };
        return undefined;
      },
      clear,
    };
  };

  /** Zone keys a node offers, for moving a node into it. */
  // KF-W10DXQ: a drop inside a node tries its main zone first.
  const zoneKeys = (node: ViewNode) =>
    primaryFirst(zonesOf(node)).map((zone) => zone.key);

  /**
   * The placement a drop on an outline row asks for, if legal. Validating
   * a drop runs the validator, so results are kept per document while a
   * drag passes over the same rows.
   */
  let dropCache: { document: ViewDocument; drops: Map<string, unknown> } = {
    document: doc.value,
    drops: new Map(),
  };
  /** The drop results kept for the current document. */
  const cachedDrops = () => {
    if (dropCache.document !== doc.value)
      dropCache = { document: doc.value, drops: new Map() };
    return dropCache.drops;
  };
  const dropFor = (target: TreeListMove) => {
    if (sourceProblem(target.sourceId)) return undefined;
    // KF-PK3GVY: only a palette drag reaches a rootless canvas, and it
    // becomes the root.
    if (target.target.id === ROOT_TARGET)
      return doc.value.root || !fromLibrary(target.sourceId)
        ? undefined
        : { parent: ROOT_TARGET, zone: '', index: 0 };
    // KF-7BB55F: inside an empty zone's placeholder is the zone's first place.
    const empty = emptyZoneTarget(target.target.id);
    // KF-WKABP2: a zone region's target names the zone's end.
    const move = empty
      ? {
          ...target,
          target: {
            id: slotRowId(empty.parent, empty.zone, empty.index),
            position: 'before' as const,
          },
        }
      : target;
    const drops = cachedDrops();
    const key = `${move.sourceId} ${move.target.id} ${move.target.position}`;
    if (!drops.has(key))
      drops.set(
        key,
        fromLibrary(move.sourceId)
          ? insertPlacement(
              doc.value,
              viewCatalog,
              draggedNode(move.sourceId),
              move.target.id,
              move.target.position,
              zoneKeys,
            )
          : dropPlacement(
              doc.value,
              viewCatalog,
              move.sourceId,
              move.target.id,
              move.target.position,
              zoneKeys,
            ),
      );
    return drops.get(key) as ReturnType<typeof dropPlacement>;
  };

  /**
   * KF-WKABP2: the document a replacing drop leaves, if legal: the dragged
   * component or node in place of the node the target names.
   */
  const replaceFor = (move: TreeListMove) => {
    if (sourceProblem(move.sourceId)) return undefined;
    const target = replaceTarget(move.target.id)!;
    const drops = cachedDrops();
    const key = `replace ${move.sourceId} ${target}`;
    if (!drops.has(key)) {
      const by: Replacement = fromLibrary(move.sourceId)
        ? { node: draggedNode(move.sourceId) }
        : { moved: move.sourceId };
      drops.set(
        key,
        slotRowAddress(move.sourceId)
          ? undefined
          : replaceNode(doc.value, viewCatalog, target, by),
      );
    }
    return drops.get(key) as ViewDocument | undefined;
  };
  /** The move replacing node `id` with what `sourceId` drags, if legal. */
  const replaceMove = (sourceId: string, id: string) => {
    if (id === sourceId || !singleChildPlace(doc.value, viewCatalog, id))
      return undefined;
    const move = {
      sourceId,
      target: { id: `${REPLACE_TARGET}${id}`, position: 'inside' as const },
    };
    return replaceFor(move) ? move : undefined;
  };
  /** The move into the end of zone `zone` of node `parent`. */
  const zoneMove = (sourceId: string, parent: ViewNode, zone: string) => ({
    sourceId,
    target: {
      id: `${EMPTY_ZONE_TARGET}${JSON.stringify({
        parent: parent.id,
        zone,
        index: parent.zones?.[zone]?.length ?? 0,
      })}`,
      position: 'inside' as const,
    },
  });
  /**
   * The legal move into zone `zone` of `parent`; for a zone full with one
   * child, the move replacing that child.
   */
  const zoneDrop = (sourceId: string, parent: ViewNode, zone: string) => {
    const move = zoneMove(sourceId, parent, zone);
    if (dropFor(move)) return move;
    const children = parent.zones?.[zone];
    const only = children?.length === 1 ? children[0] : undefined;
    return only && 'id' in only && 'type' in only
      ? replaceMove(sourceId, only.id)
      : undefined;
  };
  /** The canvas node an element shows, if it is one. */
  const canvasNode = (element: HTMLElement) => {
    const id = element.dataset.kerfNode;
    return id ? findNode(doc.value, id)?.node : undefined;
  };
  /**
   * A container's legal zones where its layout puts them (KF-WKABP2), in
   * client coordinates over `element`.
   */
  const canvasZones = (element: HTMLElement, sourceId: string) => {
    const node = canvasNode(element);
    if (!node || !zoneRegions(node.type) || node.id === sourceId)
      return undefined;
    // A rendered panel of this container (not of one nested in it) with a
    // size gives its zone's box.
    const partBox = (selector: string) => {
      const part = [...element.querySelectorAll<HTMLElement>(selector)].find(
        (item) => item.parentElement?.closest('[data-kerf-node]') === element,
      );
      const box = part?.getBoundingClientRect();
      return box?.width && box.height ? box : undefined;
    };
    return layoutZones(
      node.type,
      element.getBoundingClientRect(),
      partBox,
    ).flatMap(({ zone, box }) => {
      const move = zoneDrop(sourceId, node, zone);
      return move ? [{ move, box }] : [];
    });
  };
  /**
   * Every legal way a drop on node `id` lands (KF-WKABP2), for the menu a
   * drop asks with: into each of its zones, and replacing it; ambiguous
   * when two or more zones take it and none is the node's main zone, which
   * a drop inside would otherwise default to (KF-W10DXQ).
   */
  const dropChoicesFor = (id: string, sourceId: string) => {
    const node = findNode(doc.value, id)?.node;
    if (!node || id === sourceId) return { choices: [], ambiguous: false };
    const zones = new Set([
      ...zoneKeys(node),
      ...(zoneRegions(node.type) ?? []).map((region) => region.zone),
    ]);
    // A full zone with one child offers replacing that child.
    const choices = [...zones].flatMap((zone) => {
      const move = zoneDrop(sourceId, node, zone);
      if (!move) return [];
      const replaced = replaceTarget(move.target.id);
      return [
        {
          move,
          label: replaced
            ? `Replace ${replacedName(replaced)}`
            : `Inside ${zoneName(id, zone)}`,
        },
      ];
    });
    const primary = zonesOf(node).find((zone) => zone.primary)?.key;
    const into = choices.filter(({ move }) => emptyZoneTarget(move.target.id));
    const ambiguous =
      into.length > 1 &&
      !into.some(
        ({ move }) => emptyZoneTarget(move.target.id)!.zone === primary,
      );
    const replace = replaceMove(sourceId, id);
    return {
      choices: replace
        ? [...choices, { move: replace, label: `Replace ${replacedName(id)}` }]
        : choices,
      ambiguous,
    };
  };
  /**
   * KF-Z54E4H: where the Library stands during a palette drag. `aside`: the
   * transient Library closed when the drag began, out of the way of what
   * it covered; `asked`: the drop asked where it goes; `back`: it returns
   * once that question is answered.
   */
  const library = { aside: false, asked: false, back: false };
  /** The drop choices the menu shows while it is open. */
  const dropChoices = signal<readonly { move: TreeListMove; label: string }[]>(
    [],
  );
  /** Opens the drop menu with `choices` at `point` (KF-WKABP2). */
  const askDrop = (
    root: HTMLElement,
    choices: readonly { move: TreeListMove; label: string }[],
    point: { x: number; y: number },
  ) => {
    dropChoices.value = choices;
    library.asked = true;
    // The menu renders its new entries first.
    window.requestAnimationFrame(() =>
      openPopupMenuAt(
        root.querySelector<HTMLElement>(`[${DROP_MENU}]`)!,
        point.x,
        point.y,
      ),
    );
  };
  /**
   * An outline drop inside a row whose node has several places for it asks
   * where (KF-WKABP2), below the row; any other drop applies.
   */
  const moveOrAsk = (root: HTMLElement, move: TreeListMove) => {
    const { id, position } = move.target;
    if (position === 'inside' && !replaceTarget(id) && !emptyZoneTarget(id)) {
      const { choices, ambiguous } = dropChoicesFor(id, move.sourceId);
      if (ambiguous) {
        // The drop came from this row.
        const box = root
          .querySelector<HTMLElement>(
            `.kui-tree-list [data-item-id="${CSS.escape(id)}"]`,
          )!
          .getBoundingClientRect();
        askDrop(root, choices, { x: box.left + 24, y: box.bottom });
        return;
      }
    }
    applyMove(move);
  };
  /** A replacing drop awaiting confirmation (KF-WKABP2). */
  const pendingReplace = signal<TreeListMove | null>(null);
  /** Applies a legal replacing drop and selects what took the place. */
  const commitReplace = (move: TreeListMove) => {
    const next = replaceFor(move);
    if (!next) return;
    const id = fromLibrary(move.sourceId)
      ? draggedNode(move.sourceId).id
      : move.sourceId;
    draggedKey = undefined;
    commit(next);
    select({ kind: 'node', id });
    inspectorArea.value = 'properties';
  };

  return {
    applyMove,
    askDrop,
    canvasNode,
    canvasZones,
    commitReplace,
    dropCaption,
    dropChoices,
    dropChoicesFor,
    dropFor,
    dropRefusal,
    library,
    moveOrAsk,
    pendingReplace,
    replaceMove,
    rowLabel,
    springTabs,
    zoneKeys,
  };
}

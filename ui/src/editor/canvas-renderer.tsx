// The edit canvas's renderer (KF-YF1PDR: split out of editor.tsx): previews a
// document through previewView with the catalog's components, sample inputs,
// slot and empty-zone stand-ins, and placeholders for nodes that cannot
// render, and contains a preview whose mount fails.
import {
  contractDigest,
  contractOf,
  interpretView,
  lucideExportName,
  previewView,
  type ViewDocument,
  type ViewNode,
} from '@kerfjs/ui/view';
import { mount, type SafeHtml } from 'kerfjs';
import { icons as lucideIcons } from 'lucide';

import { Badge } from '../components/feedback/badge/badge.js';
import { EmptyState } from '../components/feedback/empty-state/empty-state.js';
import { Text } from '../components/typography/text/text.js';
import type { EditorCatalog } from './catalog.js';
import { HOOK } from './dom-hooks.js';
import type { FieldPlace } from './field-place.js';
import { visitNodes } from './model/document.js';
import { legalZones } from './model/edits.js';
import { propLabel } from './model/fields.js';
import { itemSlots, nodeTitle, zoneLabel } from './model/outline.js';
import { markRows, type RowProps, withRowProps } from './model/play-values.js';
import { playedView, playedViews } from './model/play-views.js';
import { type PreviewSlot, previewSlots } from './model/preview-slots.js';
import type { Problem } from './model/problems.js';
import { sampleInputs } from './model/sample-inputs.js';
import {
  embeddedDialogs,
  embeddedPopup,
  shownScenes,
} from './model/shown-scenes.js';
import { composesViews, ownedSourceOf, ownedViews } from './model/views.js';

// interpretView reads `$icon` names; Lucide exports icons by PascalCase name.
export const icons = new Proxy({} as Record<string, unknown>, {
  get: (_target, name) =>
    (lucideIcons as Record<string, unknown>)[lucideExportName(String(name))],
});

/** A slot's placeholder on the canvas: the app fills slots at runtime. */
/**
 * The placeholders for one preview's slots, each marked with where its
 * `$slot` sits so the canvas can select it (KF-5RKX3W).
 */
const slotPlaceholders = (
  placed: ReadonlyMap<string, PreviewSlot>,
  /** What an empty zone's stand-in says. */
  emptyLabel: (slot: PreviewSlot) => string,
) =>
  new Proxy({} as Record<string, () => SafeHtml>, {
    get: (_target, name) => {
      // previewSlots names every slot placed in a zone; any other name is a
      // slot inside a prop value (KF-SXDM56), which selects with its node.
      const slot = placed.get(String(name));
      // KF-ZWJHJR: an empty container's stand-in belongs to its node, so a
      // click selects the node and a drop lands inside it.
      if (slot?.empty)
        return () => (
          <div
            class="kui-editor__empty"
            {...{ [HOOK.empty]: JSON.stringify(slot.address) }}
          >
            {Text({ children: emptyLabel(slot), tone: 'quiet' })}
          </div>
        );
      return () =>
        slot
          ? Text({
              children: `${slot.name} slot`,
              tone: 'quiet',
              [HOOK.slotAddress]: JSON.stringify(slot.address),
            })
          : Text({ children: `${String(name)} slot`, tone: 'quiet' });
    },
  });

/** The canvas's sample param values: text labels and app stand-ins. */
export const canvasInputs = (
  document: ViewDocument,
  placeholders: EditorCatalog['placeholders'],
) =>
  sampleInputs(
    document,
    (label) => Text({ children: label }),
    (key) => placeholders[key]?.(),
  );

/** The canvas renderer for one catalog. */
export function canvasRenderer(
  catalog: EditorCatalog,
  /**
   * KF-5N26H6: a composed document by its `#view` `src`, once loaded; the
   * canvas renders it in place, selectable as its `#view` node.
   */
  resolveView?: (src: string) => ViewDocument | undefined,
  /**
   * KF-58917B: in play, a composed document by its path and its `#view`'s
   * composed id (model/play-views.ts): that `#view`'s play copy, or the one
   * the editor sent.
   */
  playView?: (path: string, owner: string) => ViewDocument,
) {
  const { viewCatalog, componentNames, placeholders, propsByKey } = catalog;
  /** Stands in for a node the preview cannot render; still selectable. */
  const brokenNode = (node: ViewNode): SafeHtml =>
    Badge({
      tone: 'danger',
      children: `${node.name ?? nodeTitle(node, componentNames)} cannot render`,
      rootAttributes: { 'data-kerf-node': node.id },
    });

  const knownKeys = new Set(viewCatalog.components.keys());
  /**
   * The zone an empty container shows a stand-in in (KF-ZWJHJR): its main
   * zone, while that zone and the `children` prop it renders are unset.
   */
  const zonesFor = (node: ViewNode) =>
    legalZones(
      node,
      viewCatalog.entries.get(node.type) as Parameters<typeof legalZones>[1],
      propsByKey.get(node.type)?.props ?? [],
      knownKeys,
    );
  const primaryZoneOf = (node: ViewNode) =>
    node.type.startsWith('#')
      ? undefined
      : zonesFor(node).find((zone) => zone.primary)?.key;
  const emptyZonesOf = (
    node: ViewNode,
    selected: boolean,
  ): readonly string[] => {
    if (node.type.startsWith('#')) return [];
    // KF-HGG7MJ: a selected node's item slots (a TabNavigator tab's
    // content) are field zones a drop fills, so they show as empty zones.
    const fieldSlots = selected
      ? itemSlots(node).map(({ at }) => at.join('.'))
      : [];
    if (node.props?.children !== undefined) return fieldSlots;
    const zones = zonesFor(node);
    const primary = zones.find((zone) => zone.primary);
    const holds = Object.values(node.zones ?? {}).some((list) => list.length);
    // KF-6EV4Q5: a node that holds something in another zone (an icon-only
    // button) is not empty; its main zone shows while it is selected.
    if (primary)
      return !selected && holds ? fieldSlots : [primary.key, ...fieldSlots];
    // KF-7BB55F: a container with no main zone (a Toolbar) shows each empty
    // zone while it holds nothing at all, or while it is selected.
    // Only composition zones: a content prop (a ListItem's label or icon)
    // edits from its own row.
    const composition = new Set(
      (
        (
          viewCatalog.entries.get(node.type) as
            { zones?: readonly { id: string }[] } | undefined
        )?.zones ?? []
      ).map((zone) => zone.id),
    );
    return !selected && holds
      ? []
      : [
          ...zones
            .filter((zone) => composition.has(zone.key) && !zone.disabledReason)
            .map((zone) => zone.key),
          ...fieldSlots,
        ];
  };

  /** Renders the document onto the canvas, or explains why it cannot. */
  return (
    source: ViewDocument,
    problems: readonly Problem[],
    /** The selected node, which shows its empty zones too (KF-7BB55F). */
    selected?: string,
    /** KF-RMZ2NP: the lower view a NavStack shows, by node id. */
    views?: ReadonlyMap<string, number>,
    /**
     * KF-60BEEJ: play mode renders the view as it runs, with no stand-ins
     * for empty containers to select or drop into.
     */
    play = false,
    /** KF-RF6RCS: param values a play-mode handler set, over the samples. */
    overrides?: Readonly<Record<string, unknown>>,
    /** KF-XV732Q: play-time props of repeated rows, by node id and key. */
    rows: RowProps = {},
    /**
     * KF-M2FGPQ: the Inspector's open field place on the selected node, so
     * a PopupMenu shows the submenu being edited open.
     */
    field?: FieldPlace,
  ): SafeHtml => {
    // The selected node's tab shows, whatever tab the document opens on.
    const scenes = shownScenes(source, selected, views);
    const { document: shown, slots: placed } = previewSlots(
      play ? scenes : embeddedPopup(embeddedDialogs(scenes), selected, field),
      play ? () => [] : (node) => emptyZonesOf(node, node.id === selected),
    );
    // KF-7XQAFR: in play, a node nested in a row carries its row's key.
    const marked = play ? markRows(shown, viewCatalog) : shown;
    // KF-5N26H6: a composed document's nodes carry its `#view`'s id;
    // KF-58917B: in play, an id composed with it.
    const composed = resolveView !== undefined && composesViews(marked);
    const owned = play ? playedViews : ownedViews;
    const document = composed ? owned(marked) : marked;
    const titles = new Map(
      visitNodes(source).map(({ node }) => [
        node.id,
        node.name ?? nodeTitle(node, componentNames),
      ]),
    );
    const primaryZones = new Map(
      visitNodes(source).map(({ node }) => [node.id, primaryZoneOf(node)]),
    );
    const components = withRowProps(catalog.components, rows);
    const preview = {
      catalog: viewCatalog,
      components,
      inputs: { ...canvasInputs(document, placeholders), ...overrides },
      slots: slotPlaceholders(placed, ({ held, address: { parent, zone } }) => {
        if (primaryZones.get(parent) === zone)
          return `${titles.get(parent)!} is empty — drag a component here`;
        // A field zone (a tab's content) names the item slot it replaces
        // (KF-HGG7MJ), or its place.
        const place = !zone.includes('.')
          ? propLabel(zone)
          : held
            ? `${held} slot`
            : zoneLabel(zone);
        return `${place} — drop here`;
      }),
      icons,
      // Only a `#view` the validation found loaded renders (one that is not
      // is a problem, so a placeholder); the play stage's are the ones its
      // editor sent (KF-85SCQD).
      ...(composed
        ? {
            // KF-3X7MFF: a key's source is already where it points from the
            // top document's folder, and its own `#view`s resolve from there.
            resolveView: play
              ? (key: string) => playedView(key, viewCatalog, playView!)
              : (key: string) => {
                  const { owner, src: at } = ownedSourceOf(key);
                  return ownedViews(resolveView(at)!, owner, at);
                },
          }
        : {}),
    };
    // A node whose component has no function here (an application component
    // its host did not register) previews as a placeholder too (KF-6GT5QY).
    const unregistered = visitNodes(document).flatMap(({ node }) =>
      node.type.startsWith('#') || node.type in components ? [] : [node.id],
    );
    // A document with problems still previews (KF-F355BF): each node a problem
    // is about renders as a placeholder and everything else renders normally.
    // A composing document previews this way too: its composed documents'
    // nodes share their `#view`'s id, which a strict render would refuse.
    if (problems.length || unregistered.length || composed) {
      return previewView(document, {
        ...preview,
        broken: new Set([
          ...problems.flatMap(({ nodeId }) => (nodeId ? [nodeId] : [])),
          ...unregistered,
        ]),
        placeholder: brokenNode,
      });
    }
    try {
      // KF-7XQAFR: play's row marks use the renderer's reserved
      // `data-kerf-*` names, so play renders without interpretView's
      // validation; `problems` already holds the document's own. A node
      // that throws stands in for itself, as on the canvas.
      if (play)
        return previewView(document, { ...preview, placeholder: brokenNode });
      return interpretView(document, {
        ...preview,
        // The editor previews any document, so it checks it against itself.
        contract: contractDigest(contractOf(document, viewCatalog)),
      });
    } catch (error) {
      return cannotPreview(error);
    }
  };
}

const cannotPreview = (error: unknown) =>
  EmptyState({
    title: 'This document cannot be previewed',
    detail: (error as Error).message,
  });

/**
 * The preview, or why it cannot render (KF-P6FPG2). The canvas is part of
 * the editor's own render, so a preview that fails when mounted (such as a
 * repeated row whose markup the HTML parser splits into two elements) would
 * stop the whole editor from updating. Mounting it once into a detached
 * element first catches that failure here. This must run outside the
 * editor's render: a mount sets kerf's render context for its own pass and
 * clears it afterwards.
 */
export function contained(preview: SafeHtml): SafeHtml {
  const probe = globalThis.document.createElement('div');
  try {
    mount(probe, () => preview)();
    return preview;
  } catch (error) {
    return cannotPreview(error);
  }
}

// Slot placeholders the canvas can select (KF-5RKX3W). The preview renders a
// `$slot` through a function looked up by slot name, so two places that use
// one slot would be indistinguishable. Each placed `$slot` gets its own
// preview name, which maps back to where it sits.
import type { ViewChild, ViewDocument, ViewNode } from '@kerfjs/ui/view';

import type { SlotAddress } from './control-flow.js';

/** A placed slot in the preview: its document name and where it sits. */
export interface PreviewSlot {
  readonly name: string;
  readonly address: SlotAddress;
  /**
   * Set on a stand-in for an empty zone (KF-ZWJHJR: empty containers): the
   * node that zone belongs to, which the placeholder selects and drops into.
   */
  readonly empty?: true;
}

/**
 * `document` with every `$slot` renamed to a unique preview name (declared
 * like the original), and the slot each preview name stands for. Each zone
 * `emptyZonesOf` names for a node that holds nothing gets a stand-in slot,
 * so an empty container has something to see, select, and drop into.
 */
export function previewSlots(
  document: ViewDocument,
  emptyZonesOf: (node: ViewNode) => readonly string[] = () => [],
): {
  readonly document: ViewDocument;
  readonly slots: ReadonlyMap<string, PreviewSlot>;
} {
  const slots = new Map<string, PreviewSlot>();
  const declared: Record<string, unknown> = { ...(document.slots ?? {}) };
  const child = (item: ViewChild, address: SlotAddress): ViewChild => {
    if ('$slot' in item) {
      const preview = `${item.$slot}KuiPreview${slots.size}`;
      slots.set(preview, { name: item.$slot, address });
      if (document.slots?.[item.$slot])
        declared[preview] = document.slots[item.$slot];
      return { ...item, $slot: preview };
    }
    if ('$each' in item) return { ...item, template: node(item.template) };
    if ('$if' in item)
      return {
        ...item,
        then: child(item.then, address),
        ...(item.else ? { else: child(item.else, address) } : {}),
      };
    return node(item);
  };
  const node = (item: ViewNode): ViewNode => {
    const zones = item.zones
      ? Object.fromEntries(
          Object.entries(item.zones).map(([zone, children]) => [
            zone,
            children.map((entry, index) =>
              child(entry, { parent: item.id, zone, index }),
            ),
          ]),
        )
      : undefined;
    const empties = emptyZonesOf(item).filter((zone) => !zones?.[zone]?.length);
    if (!empties.length) return zones ? { ...item, zones } : item;
    const filled: Record<string, ViewChild[]> = { ...zones };
    for (const zone of empties) {
      const preview = `kuiEmptyPreview${slots.size}`;
      slots.set(preview, {
        name: preview,
        address: { parent: item.id, zone, index: 0 },
        empty: true,
      });
      filled[zone] = [{ $slot: preview }];
    }
    return { ...item, zones: filled };
  };
  const root = node(document.root);
  return slots.size
    ? {
        document: { ...document, root, slots: declared } as ViewDocument,
        slots,
      }
    : { document, slots };
}

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
}

/**
 * `document` with every `$slot` renamed to a unique preview name (declared
 * like the original), and the slot each preview name stands for.
 */
export function previewSlots(document: ViewDocument): {
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
  const node = (item: ViewNode): ViewNode =>
    item.zones
      ? {
          ...item,
          zones: Object.fromEntries(
            Object.entries(item.zones).map(([zone, children]) => [
              zone,
              children.map((entry, index) =>
                child(entry, { parent: item.id, zone, index }),
              ),
            ]),
          ),
        }
      : item;
  const root = node(document.root);
  return slots.size
    ? {
        document: { ...document, root, slots: declared } as ViewDocument,
        slots,
      }
    : { document, slots };
}

import { realmOf } from '../../../../shared/dom/realm.js';

const ROW = '[data-component="row"][data-v-align="control"]';
const BOX = ':scope > [data-row-control]';
const OFFSET = '--_kui-row-control-offset';
const SHIFTED = 'data-row-control-shifted';

function clearOffset(item: HTMLElement) {
  item.removeAttribute(SHIFTED);
  item.style.removeProperty(OFFSET);
}

function offsetsFor(row: HTMLElement, observed: Set<Element>) {
  const { HTMLElement } = realmOf(row);
  const lines = new Map<number, Array<{ item: HTMLElement; center: number }>>();
  const offsets = new Map<HTMLElement, number>();
  observed.add(row);
  for (const item of row.children) {
    if (!(item instanceof HTMLElement)) continue;
    const control = item.querySelector<HTMLElement>(BOX) ?? item;
    observed.add(item);
    observed.add(control);
    const box = control.getBoundingClientRect();
    if (box.height === 0) continue;
    const top = item.getBoundingClientRect().top;
    // Subtract the published margin to recover each flex line's natural top.
    // Whole-pixel offsets keep the grouping stable on fractional layouts.
    const offset = item.hasAttribute(SHIFTED)
      ? Number.parseFloat(item.style.getPropertyValue(OFFSET)) || 0
      : 0;
    const key = Math.round(top - offset);
    const line = lines.get(key) ?? [];
    line.push({ item, center: box.top - top + box.height / 2 });
    lines.set(key, line);
  }
  for (const line of lines.values()) {
    const center = Math.max(...line.map((entry) => entry.center));
    for (const entry of line)
      offsets.set(entry.item, Math.round(center - entry.center));
  }
  return offsets;
}

/**
 * Align control boxes in Rows that use `vAlign="control"`. Wire once on the
 * containing form or layout and dispose with it. A direct child's own box is
 * used unless a direct descendant carries `data-row-control`, as in Select
 * and TextField.
 */
export function wireRowControlAlignment(root: HTMLElement): () => void {
  const view = realmOf(root);
  let observed = new Set<Element>();
  let shifted = new Set<HTMLElement>();
  let frame: number | undefined;

  const update = () => {
    const targets = new Set<Element>();
    const next = new Set<HTMLElement>();
    const rows = [...root.querySelectorAll<HTMLElement>(ROW)];
    if (root.matches(ROW)) rows.unshift(root);
    const offsets = rows.flatMap((row) => [...offsetsFor(row, targets)]);
    for (const [item, offset] of offsets) {
      if (!offset) continue;
      const value = `${offset}px`;
      if (item.style.getPropertyValue(OFFSET) !== value)
        item.style.setProperty(OFFSET, value);
      item.toggleAttribute(SHIFTED, true);
      next.add(item);
    }
    for (const item of shifted) if (!next.has(item)) clearOffset(item);
    shifted = next;

    for (const element of observed)
      if (!targets.has(element)) resize.unobserve(element);
    for (const element of targets)
      if (!observed.has(element)) resize.observe(element);
    observed = targets;
  };
  const schedule = () => {
    if (frame !== undefined) return;
    frame = view.requestAnimationFrame(() => {
      frame = undefined;
      update();
    });
  };
  const resize = new view.ResizeObserver(schedule);
  const mutations = new view.MutationObserver(schedule);
  mutations.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: [
      'data-v-align',
      'data-row-control',
      SHIFTED,
      'hidden',
      'style',
    ],
  });
  update();
  return () => {
    resize.disconnect();
    mutations.disconnect();
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    for (const item of shifted) clearOffset(item);
  };
}

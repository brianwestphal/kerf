/**
 * KF-TBC6V7: cost of candidate guards for unmarked live-node injection.
 * These measure the krausest partial-update row on the existing text fast path.
 * A cached count is included for cost comparison, but cannot detect injection
 * after the cache was populated. A top-level count misses nested injection.
 */
import { bench, describe } from 'vitest';

import { tryTextContentFastPath } from '../../src/list-reconcile-fast-paths.js';

const before =
  '<tr data-key="1"><td>1</td><td><a class="lbl">pretty red house</a></td>' +
  '<td><a class="remove"><span>×</span></a></td><td></td></tr>';
const after = before.replace('pretty red house', 'pretty red house !!!');
const template = document.createElement('template');
template.innerHTML = before;
const row = template.content.firstElementChild!;
const label = row.querySelector('.lbl')!.firstChild!;

function liveTextCount(root: Node): number {
  let count = 0;
  const walk = (node: Node) => {
    if (node.nodeType === 3) count++;
    for (let child = node.firstChild; child; child = child.nextSibling)
      walk(child);
  };
  walk(root);
  return count;
}

const expectedTextCount = liveTextCount(row);
const expectedChildCount = row.childNodes.length;
const cachedTextCount = expectedTextCount;

function update() {
  label.nodeValue = 'pretty red house';
  tryTextContentFastPath(row, before, after);
}

describe('partial-update live drift guards', () => {
  bench('current text fast path', update);

  bench('full live text count before fast path', () => {
    if (liveTextCount(row) !== expectedTextCount) return;
    update();
  });

  bench('cached text count before fast path (misses later injection)', () => {
    if (cachedTextCount !== expectedTextCount) return;
    update();
  });

  bench(
    'top-level child count before fast path (misses nested injection)',
    () => {
      if (row.childNodes.length !== expectedChildCount) return;
      update();
    },
  );
});

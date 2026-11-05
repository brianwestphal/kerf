// KF-ZW633Z: selecting a node costs work linear in the document. The outline
// once located every row on a fresh clone of the document (a clone per row,
// the square of the document per click), and each Embed in candidate
// validated the unchanged document again.
import type { ViewDocument } from '@kerfjs/ui/view';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { attach } from './editing-harness.js';
import { createEditor, defaultCatalog } from './kerf-catalog.js';

/** A Pane holding `count` Text nodes, as the ticket measured. */
function flatPane(count: number): ViewDocument {
  const id = (index: number) => String(index).padStart(26, '0');
  return {
    schema: 'kerf-ui-document/v1',
    name: 'Flat',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: id(0),
      type: '@kerfjs/ui:pane',
      zones: {
        content: Array.from({ length: count }, (_, index) => ({
          id: id(index + 1),
          type: '@kerfjs/ui:text',
          props: { children: `Row ${index}` },
        })),
      },
    },
  } as ViewDocument;
}

afterEach(() => vi.restoreAllMocks());

/** Document clones and catalog lookups one selection change makes. */
function selectionCost(count: number) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor({ document: flatPane(count) });
  attach(root, editor);
  const rows = editor.document.value.root!.zones!.content! as readonly {
    id: string;
  }[];
  editor.selection.value = { kind: 'node', id: rows[1]!.id };
  const clone = vi.spyOn(globalThis, 'structuredClone');
  const lookup = vi.spyOn(defaultCatalog.viewCatalog.components, 'get');
  editor.selection.value = { kind: 'node', id: rows[2]!.id };
  const cost = {
    clones: clone.mock.calls.length,
    lookups: lookup.mock.calls.length,
  };
  vi.restoreAllMocks();
  return cost;
}

describe('selecting a node', () => {
  it('clones the document a fixed number of times, not once per row', () => {
    const small = selectionCost(20);
    const large = selectionCost(80);
    expect(small.clones).toBeGreaterThan(0);
    expect(large.clones).toBe(small.clones);
  });

  it('costs work linear in the document', () => {
    // 4× the rows: linear work is under 5×; one pass per row would be 16×.
    const small = selectionCost(20);
    const large = selectionCost(80);
    expect(large.lookups / small.lookups).toBeLessThan(5);
  });
});

import type { ViewDocument } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  conditionOptions,
  controlOf,
  insertSlot,
  itemNameFor,
  removeSlot,
  renameItem,
  repeatOptions,
  setCondition,
  setRepeat,
  setSlotInput,
  slotAt,
  slotInputOptions,
  slotInputs,
} from '../../../src/editor/model/control-flow.js';
import { History, insertNode } from '../../../src/editor/model/edits.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { viewCatalog } from './kerf-catalog.js';

const inbox = sample as unknown as ViewDocument;
const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const TITLE = '01JB8Z1M6Q8E1X9V4S7K2R3T5C';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5F';
const EMPTY = '01JB8Z1M6Q8E1X9V4S7K2R3T5G';
const T = '01JB8Z1M6Q8E1X9V4S7K2R3T6A';
const R = '01JB8Z1M6Q8E1X9V4S7K2R3T6B';
const BADGE = '01JB8Z1M6Q8E1X9V4S7K2R3T6C';
const DETAIL = { parent: PANE, zone: 'content', index: 2 };
const valid = (document: ViewDocument) =>
  validateView(document, viewCatalog).diagnostics;
const labels = (options: readonly { label: string }[]) =>
  options.map((option) => option.label);

describe('controlOf', () => {
  it('reports the condition and repeat around a node, and none for the root', () => {
    expect(controlOf(inbox, COMPOSE)).toEqual({});
    expect(controlOf(inbox, EMPTY)).toEqual({
      condition: { $param: 'showEmpty' },
    });
    expect(controlOf(inbox, ROW)).toEqual({
      repeat: { source: { $param: 'items' }, as: 'item', key: 'item.id' },
    });
    expect(controlOf(inbox, PANE)).toBeUndefined();
    expect(controlOf(inbox, 'missing')).toBeUndefined();
  });

  it('leaves else branches and nested conditions to the file', () => {
    const text = (id: string) => ({
      id,
      type: '@kerfjs/ui:text',
      props: { children: id },
    });
    const document = {
      ...inbox,
      root: {
        ...inbox.root,
        zones: {
          content: [
            { $if: { $param: 'showEmpty' }, then: text('A'), else: text('B') },
            {
              $if: { $param: 'showEmpty' },
              then: { $if: { $param: 'showEmpty' }, then: text('C') },
            },
          ],
        },
      },
    } as unknown as ViewDocument;
    expect(controlOf(document, 'A')).toBeUndefined();
    expect(controlOf(document, 'B')).toBeUndefined();
    expect(controlOf(document, 'C')).toBeUndefined();
    expect(setCondition(document, 'A', undefined)).toBe(document);
    expect(conditionOptions(document, viewCatalog, 'A')).toEqual([]);
    expect(repeatOptions(document, viewCatalog, 'A')).toEqual([]);
  });
});

describe('conditions', () => {
  it('wraps, rewrites, and unwraps a condition, keeping the document valid', () => {
    const shown = setCondition(inbox, COMPOSE, { $param: 'showEmpty' });
    expect(controlOf(shown, COMPOSE)).toEqual({
      condition: { $param: 'showEmpty' },
    });
    expect(valid(shown)).toEqual([]);
    expect(controlOf(inbox, COMPOSE)).toEqual({});
    const always = setCondition(shown, COMPOSE, undefined);
    expect(always).toEqual(inbox);
    const removed = setCondition(inbox, EMPTY, undefined);
    expect(controlOf(removed, EMPTY)).toEqual({});
    expect(valid(removed)).toEqual([]);
  });

  it('offers only boolean sources the validator accepts', () => {
    expect(labels(conditionOptions(inbox, viewCatalog, COMPOSE))).toEqual([
      'Param showEmpty',
    ]);
    expect(conditionOptions(inbox, viewCatalog, PANE)).toEqual([]);
  });

  it('offers a row item’s boolean fields inside the row, never for the repeat itself', () => {
    const document = {
      ...inbox,
      params: {
        ...inbox.params,
        items: {
          type: {
            kind: 'array',
            items: {
              kind: 'object',
              props: [
                { name: 'id', type: { kind: 'string' }, required: true },
                { name: 'label', type: { kind: 'string' }, required: true },
                { name: 'unread', type: { kind: 'boolean' }, required: true },
              ],
            },
          },
        },
      },
    } as unknown as ViewDocument;
    // The row's own condition sits outside its $each, so its item is not in scope.
    expect(labels(conditionOptions(document, viewCatalog, ROW))).toEqual([
      'Param showEmpty',
    ]);
    const badge = {
      id: BADGE,
      type: '@kerfjs/ui:text',
      props: { children: 'New' },
    };
    const withBadge = insertNode(
      setRepeat(document, ROW, undefined),
      FOLDERS,
      'children',
      badge,
    );
    const inRow = setRepeat(withBadge, BADGE, {
      source: { $param: 'items' },
      as: 'item',
      key: 'item.id',
    });
    expect(labels(conditionOptions(inRow, viewCatalog, BADGE))).toEqual([
      'Param showEmpty',
    ]);
  });
});

describe('repeats', () => {
  it('suggests object lists with an item name and key', () => {
    expect(labels(repeatOptions(inbox, viewCatalog, COMPOSE))).toEqual([
      'Param items',
    ]);
    const text = {
      id: T,
      type: '@kerfjs/ui:list-item',
      props: { label: 'x', action: { $action: 'open' } },
    };
    const document = insertNode(inbox, FOLDERS, 'children', text);
    expect(repeatOptions(document, viewCatalog, T)).toEqual([
      {
        label: 'Param items',
        source: { $param: 'items' },
        as: 'item',
        key: 'item.id',
      },
    ]);
    expect(repeatOptions(inbox, viewCatalog, PANE)).toEqual([]);
  });

  it('repeats under a condition and stops repeating, in either order', () => {
    const item = {
      id: T,
      type: '@kerfjs/ui:list-item',
      props: { label: 'x', action: { $action: 'open' } },
    };
    const start = insertNode(inbox, FOLDERS, 'children', item);
    const repeat = { source: { $param: 'items' }, as: 'item', key: 'item.id' };
    const both = setCondition(setRepeat(start, T, repeat), T, {
      $param: 'showEmpty',
    });
    expect(controlOf(both, T)).toEqual({
      condition: { $param: 'showEmpty' },
      repeat,
    });
    expect(valid(both)).toEqual([]);
    const conditionOnly = setRepeat(both, T, undefined);
    expect(controlOf(conditionOnly, T)).toEqual({
      condition: { $param: 'showEmpty' },
    });
    const repeatOnly = setCondition(both, T, undefined);
    expect(controlOf(repeatOnly, T)).toEqual({ repeat });
    expect(
      setCondition(setRepeat(repeatOnly, T, undefined), T, undefined),
    ).toEqual(start);
  });

  it('renames a row item and every binding to it', () => {
    const result = renameItem(inbox, ROW, 'message');
    if ('error' in result) throw new Error(result.error);
    expect(controlOf(result.document, ROW)?.repeat).toEqual({
      source: { $param: 'items' },
      as: 'message',
      key: 'message.id',
    });
    expect(valid(result.document)).toEqual([]);
    expect(JSON.stringify(result.document)).not.toContain('item.label');
    expect(renameItem(inbox, ROW, 'Bad name')).toEqual({
      error: 'An item name is a camelCase identifier.',
    });
    expect(renameItem(inbox, COMPOSE, 'other')).toEqual({
      error: 'This node does not repeat.',
    });
  });

  it('repeats a node inside a row over a list field of the row item', () => {
    const tagged = {
      ...inbox,
      params: {
        ...inbox.params,
        items: {
          type: {
            kind: 'array',
            items: {
              kind: 'object',
              props: [
                { name: 'id', type: { kind: 'string' }, required: true },
                { name: 'label', type: { kind: 'string' }, required: true },
                {
                  name: 'tags',
                  type: {
                    kind: 'array',
                    items: {
                      kind: 'object',
                      props: [
                        {
                          name: 'name',
                          type: { kind: 'string' },
                          required: true,
                        },
                      ],
                    },
                  },
                  required: true,
                },
              ],
            },
          },
        },
      },
    } as unknown as ViewDocument;
    const tag = {
      id: T,
      type: '@kerfjs/ui:button',
      props: {
        children: { $bind: 'item.label' },
        action: { $action: 'tag' },
        items: [{ $bind: 'item.label' }, 'kept'],
      },
    };
    const document = insertNode(tagged, ROW, 'trailing', tag);
    const options = repeatOptions(document, viewCatalog, T);
    expect(options.find((option) => option.label === 'item.tags')).toEqual({
      label: 'item.tags',
      source: { $bind: 'item.tags' },
      as: 'tag',
      key: 'tag.name',
    });
    const nested = setRepeat(document, T, options.at(-1)!);
    // The inner scope iterates a bound list, which offers no item fields here.
    expect(labels(conditionOptions(nested, viewCatalog, T))).toEqual([
      'Param showEmpty',
    ]);
    const renamed = renameItem(document, ROW, 'entry');
    if ('error' in renamed) throw new Error(renamed.error);
    expect(JSON.stringify(renamed.document)).toContain(
      '[{"$bind":"entry.label"},"kept"]',
    );
  });

  it('keeps a condition when renaming the item under it', () => {
    const shown = setCondition(inbox, ROW, { $param: 'showEmpty' });
    const result = renameItem(shown, ROW, 'message');
    if ('error' in result) throw new Error(result.error);
    expect(controlOf(result.document, ROW)).toEqual({
      condition: { $param: 'showEmpty' },
      repeat: { source: { $param: 'items' }, as: 'message', key: 'message.id' },
    });
  });

  it('names items from their list', () => {
    expect(itemNameFor('orders', new Set())).toBe('order');
    expect(itemNameFor('entries', new Set())).toBe('entry');
    expect(itemNameFor('order.lines', new Set())).toBe('line');
    expect(itemNameFor('data', new Set())).toBe('item');
    expect(itemNameFor('s', new Set())).toBe('item');
    expect(itemNameFor('orders', new Set(['order']))).toBe('item');
  });
});

describe('slots', () => {
  it('finds a slot and its declared inputs', () => {
    expect(slotAt(inbox, DETAIL)?.$slot).toBe('detail');
    expect(slotAt(inbox, { ...DETAIL, index: 0 })).toBeUndefined();
    expect(slotAt(inbox, { ...DETAIL, zone: 'missing' })).toBeUndefined();
    expect(slotInputs(inbox, DETAIL)).toEqual([
      { name: 'selectedId', type: { kind: 'string' }, required: true },
    ]);
    expect(slotInputs(inbox, { ...DETAIL, index: 9 })).toEqual([]);
  });

  it('inserts a new slot with a declaration, and removes both', () => {
    const result = insertSlot(
      inbox,
      TITLE.replace('C', 'B'),
      'trailing',
      'actions',
    );
    if ('error' in result) throw new Error(result.error);
    expect(result.address).toEqual({
      parent: '01JB8Z1M6Q8E1X9V4S7K2R3T5B',
      zone: 'trailing',
      index: 1,
    });
    expect(result.document.slots?.actions).toEqual({});
    expect(valid(result.document)).toEqual([]);
    const removed = removeSlot(result.document, result.address);
    expect(removed).toEqual(inbox);
  });

  it('reuses an existing declaration and keeps it while another place uses it', () => {
    const result = insertSlot(inbox, FOLDERS, 'children', 'detail');
    if ('error' in result) throw new Error(result.error);
    expect(result.document.slots).toEqual(inbox.slots);
    const removed = removeSlot(result.document, result.address);
    expect(removed.slots).toEqual(inbox.slots);
    const lastUse = removeSlot(inbox, DETAIL);
    expect(lastUse.slots).toBeUndefined();
    expect(valid(lastUse)).toEqual([]);
    expect(removeSlot(inbox, { ...DETAIL, index: 0 })).toBe(inbox);
  });

  it('keeps other declarations when removing one', () => {
    const result = insertSlot(inbox, FOLDERS, 'children', 'footer');
    if ('error' in result) throw new Error(result.error);
    const removed = removeSlot(result.document, DETAIL);
    expect(Object.keys(removed.slots ?? {})).toEqual(['footer']);
  });

  it('passes a row’s item to a new slot inside the row', () => {
    const row = {
      id: R,
      type: '@kerfjs/ui:list-item',
      props: { label: { $bind: 'item.label' }, action: { $action: 'open' } },
    };
    const withRow = setRepeat(insertNode(inbox, FOLDERS, 'children', row), R, {
      source: { $param: 'items' },
      as: 'item',
      key: 'item.id',
    });
    const result = insertSlot(withRow, R, 'trailing', 'rowActions', true);
    if ('error' in result) throw new Error(result.error);
    expect(slotAt(result.document, result.address)).toEqual({
      $slot: 'rowActions',
      input: { item: { $bind: 'item' } },
    });
    expect(result.document.slots?.rowActions?.input?.props).toEqual([
      expect.objectContaining({ name: 'item', required: true }),
    ]);
    expect(valid(result.document)).toEqual([]);
    expect(
      labels(
        slotInputOptions(result.document, viewCatalog, result.address, 'item'),
      ),
    ).toEqual(['Item item']);
    const plain = insertSlot(withRow, R, 'trailing', 'other');
    if ('error' in plain) throw new Error(plain.error);
    expect(slotAt(plain.document, plain.address)).toEqual({ $slot: 'other' });
  });

  it('declares the first slot of a document with no params or slots', () => {
    const bare = {
      schema: 'kerf-ui-document/v1',
      name: 'Bare',
      catalogs: ['@kerfjs/ui'],
      root: { id: PANE, type: '@kerfjs/ui:pane' },
    } as unknown as ViewDocument;
    const result = insertSlot(bare, PANE, 'content', 'body', true);
    if ('error' in result) throw new Error(result.error);
    expect(result.document.slots).toEqual({ body: {} });
    const removed = removeSlot(result.document, result.address);
    expect(removed.slots).toBeUndefined();
    expect(removed.root.zones).toEqual({ content: [] });
  });

  it('keeps a declaration still used in an else branch', () => {
    const document = {
      ...inbox,
      root: {
        ...inbox.root,
        zones: {
          ...inbox.root.zones,
          footer: [
            {
              $if: { $param: 'showEmpty' },
              then: { $slot: 'other' },
              else: { $slot: 'detail' },
            },
          ],
        },
      },
    } as unknown as ViewDocument;
    expect(removeSlot(document, DETAIL).slots).toEqual(inbox.slots);
  });

  it('refuses bad names and missing parents', () => {
    expect(insertSlot(inbox, FOLDERS, 'children', 'Bad')).toEqual({
      error: 'A slot name is a camelCase identifier.',
    });
    expect(insertSlot(inbox, 'missing', 'children', 'ok')).toEqual({
      error: 'No node missing.',
    });
  });

  it('sets and clears slot inputs from the sources that fit', () => {
    expect(
      labels(slotInputOptions(inbox, viewCatalog, DETAIL, 'selectedId')),
    ).toEqual(['Param title', 'Param selectedId']);
    expect(
      slotInputOptions(inbox, viewCatalog, { ...DETAIL, index: 0 }, 'x'),
    ).toEqual([]);
    const cleared = setSlotInput(inbox, DETAIL, 'selectedId', undefined);
    expect(slotAt(cleared, DETAIL)).toEqual({ $slot: 'detail' });
    expect(valid(cleared).map((item) => item.code)).toEqual(['KUI-V005']);
    const set = setSlotInput(cleared, DETAIL, 'selectedId', {
      $param: 'title',
    });
    expect(slotAt(set, DETAIL)?.input).toEqual({
      selectedId: { $param: 'title' },
    });
    expect(setSlotInput(inbox, { ...DETAIL, index: 0 }, 'x', 1)).toBe(inbox);
  });

  it('undoes and redoes a control-flow edit as one step', () => {
    const history = new History();
    const shown = setCondition(inbox, COMPOSE, { $param: 'showEmpty' });
    history.record(inbox);
    expect(history.undo(shown)).toEqual(inbox);
  });
});

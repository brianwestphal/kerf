import type { ViewDocument } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { findNode, visitNodes } from '../../../src/editor/model/document.js';
import {
  bindingOptions,
  History,
  insertNode,
  isMovable,
  legalZones,
  moveNode,
  moveNodeTo,
  newNodeId,
  paramTypeFor,
  promoteToParam,
  removeNode,
  renameNode,
  setProp,
} from '../../../src/editor/model/edits.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { propsByKey, viewCatalog } from './kerf-catalog.js';

const inbox = sample as unknown as ViewDocument;
const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const TITLE = '01JB8Z1M6Q8E1X9V4S7K2R3T5C';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5F';
const ids = (document: ViewDocument) =>
  visitNodes(document).map(({ node }) => node.id.slice(-2));
const valid = (document: ViewDocument) =>
  validateView(document, viewCatalog).diagnostics;

describe('newNodeId', () => {
  it('makes time-ordered, valid, distinct ULIDs', () => {
    const first = newNodeId(1_000, () => 0);
    expect(first).toBe('00000000Z80000000000000000');
    expect(newNodeId()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(newNodeId()).not.toBe(newNodeId());
    expect(newNodeId(2_000, () => 0) > first).toBe(true);
  });
});

describe('structural edits', () => {
  const button = {
    id: newNodeId(),
    type: '@kerfjs/ui:button',
    props: { children: 'Archive' },
  };

  it('inserts into a zone, at the end or an index, without touching the original', () => {
    const appended = insertNode(inbox, TOOLBAR, 'trailing', button);
    expect(findNode(appended, button.id)?.ancestors.at(-1)).toMatchObject({
      zone: 'trailing',
    });
    expect(valid(appended)).toEqual([]);
    expect(findNode(inbox, button.id)).toBeUndefined();
    const first = insertNode(inbox, TOOLBAR, 'trailing', button, 0);
    const trailing = (
      findNode(first, TOOLBAR)!.node.zones!.trailing as readonly {
        id: string;
      }[]
    ).map((item) => item.id);
    expect(trailing[0]).toBe(button.id);
    const fresh = insertNode(inbox, TITLE, 'center', button);
    expect(findNode(fresh, button.id)).toBeDefined();
    expect(() => insertNode(inbox, 'missing', 'x', button)).toThrow(/no node/);
  });

  it('removes and reorders nodes placed in zones, but not the root or a template', () => {
    expect(ids(removeNode(inbox, COMPOSE))).not.toContain('5D');
    expect(() => removeNode(inbox, PANE)).toThrow(/cannot be removed/);
    expect(() => removeNode(inbox, ROW)).toThrow(/cannot be removed/);
    expect(isMovable(inbox, PANE)).toEqual({
      up: false,
      down: false,
      remove: false,
    });
    expect(isMovable(inbox, FOLDERS)).toEqual({
      up: false,
      down: true,
      remove: true,
    });
    const moved = moveNode(inbox, FOLDERS, 1);
    const content = findNode(moved, PANE)!.node.zones!.content as readonly {
      id?: string;
    }[];
    expect(content[0]).toHaveProperty('$if');
    expect(moveNode(moved, FOLDERS, -1)).toEqual(inbox);
    expect(moveNode(inbox, FOLDERS, -1)).toBe(inbox);
    expect(() => moveNode(inbox, PANE, 1)).toThrow(/cannot move/);
  });

  it('edits a node in an $if else branch but keeps it in its structure', () => {
    const withElse = globalThis.structuredClone(inbox) as unknown as {
      root: { zones: { content: Record<string, unknown>[] } };
    };
    const branch = withElse.root.zones.content.find((item) => '$if' in item)!;
    branch.else = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5H',
      type: '@kerfjs/ui:text',
      props: { children: 'All caught up' },
    };
    const document = withElse as unknown as ViewDocument;
    const edited = setProp(
      document,
      '01JB8Z1M6Q8E1X9V4S7K2R3T5H',
      'children',
      'Inbox zero',
    );
    expect(
      findNode(edited, '01JB8Z1M6Q8E1X9V4S7K2R3T5H')?.node.props?.children,
    ).toBe('Inbox zero');
    expect(isMovable(document, '01JB8Z1M6Q8E1X9V4S7K2R3T5H').remove).toBe(
      false,
    );
  });

  it('moves a node into another zone and refuses moving it into itself', () => {
    const moved = moveNodeTo(inbox, COMPOSE, TOOLBAR, 'leading');
    expect(findNode(moved, COMPOSE)?.ancestors.at(-1)).toMatchObject({
      zone: 'leading',
    });
    expect(() => moveNodeTo(inbox, TOOLBAR, TITLE, 'x')).toThrow(/into itself/);
    expect(() => moveNodeTo(inbox, TOOLBAR, TOOLBAR, 'leading')).toThrow(
      /into itself/,
    );
    expect(() => moveNodeTo(inbox, ROW, TOOLBAR, 'leading')).toThrow(
      /cannot move/,
    );
  });
});

describe('names and props', () => {
  it('renames, unnames, and refuses invalid or duplicate names', () => {
    const renamed = renameNode(inbox, COMPOSE, 'sendButton');
    expect(
      'document' in renamed && findNode(renamed.document, COMPOSE)?.node.name,
    ).toBe('sendButton');
    const unnamed = renameNode(inbox, COMPOSE, '  ');
    expect(
      'document' in unnamed && findNode(unnamed.document, COMPOSE)?.node.name,
    ).toBeUndefined();
    expect(renameNode(inbox, COMPOSE, 'Send')).toEqual({
      error: expect.stringContaining('camelCase'),
    });
    expect(renameNode(inbox, COMPOSE, 'folderList')).toEqual({
      error: 'Another node is already named folderList.',
    });
    expect(renameNode(inbox, COMPOSE, 'composeButton')).toHaveProperty(
      'document',
    );
    expect(renameNode(inbox, 'missing', 'x')).toEqual({
      error: 'No node missing.',
    });
  });

  it('sets and clears props', () => {
    const toned = setProp(inbox, COMPOSE, 'tone', 'danger');
    expect(findNode(toned, COMPOSE)?.node.props?.tone).toBe('danger');
    const cleared = setProp(
      setProp(inbox, TOOLBAR, 'label', 'Top'),
      TOOLBAR,
      'label',
      undefined,
    );
    expect(findNode(cleared, TOOLBAR)?.node).not.toHaveProperty('props');
    expect(() => setProp(inbox, 'missing', 'x', 1)).toThrow(/no node/);
  });

  it('promotes a literal prop to a param with its value as the default', () => {
    const result = promoteToParam(
      inbox,
      COMPOSE,
      'tone',
      'composeTone',
      paramTypeFor({ kind: 'enum', values: ['neutral', 'brand'] })!,
    );
    expect('document' in result).toBe(true);
    if (!('document' in result)) return;
    expect(result.document.params?.composeTone).toEqual({
      type: { kind: 'enum', values: ['neutral', 'brand'] },
      default: 'brand',
    });
    expect(findNode(result.document, COMPOSE)?.node.props?.tone).toEqual({
      $param: 'composeTone',
    });
    const unset = promoteToParam(inbox, COMPOSE, 'emphasis', 'emphasis', {
      kind: 'string',
    });
    expect('document' in unset && unset.document.params?.emphasis).toEqual({
      type: { kind: 'string' },
    });
    expect(
      promoteToParam(inbox, COMPOSE, 'tone', 'title', { kind: 'string' }),
    ).toEqual({ error: 'There is already a param named title.' });
    expect(
      promoteToParam(inbox, COMPOSE, 'tone', 'Bad', { kind: 'string' }),
    ).toHaveProperty('error');
    expect(
      promoteToParam(inbox, 'missing', 'tone', 'x', { kind: 'string' }),
    ).toEqual({ error: 'No node missing.' });
  });

  it('maps prop types to param types', () => {
    expect(paramTypeFor({ kind: 'boolean' })).toEqual({ kind: 'boolean' });
    expect(paramTypeFor({ kind: 'content' })).toEqual({ kind: 'content' });
    expect(paramTypeFor({ kind: 'enum' })).toEqual({
      kind: 'enum',
      values: [],
    });
    expect(paramTypeFor({ kind: 'function' })).toBeUndefined();
  });
});

describe('legalZones', () => {
  const keys = new Set(viewCatalog.components.keys());
  const zonesOf = (id: string) => {
    const node = findNode(inbox, id)!.node;
    const entry = viewCatalog.entries.get(node.type) as Parameters<
      typeof legalZones
    >[1];
    return legalZones(node, entry, propsByKey.get(node.type)!.props, keys);
  };

  it('lists bound composition zones, then content props, with accepted components', () => {
    expect(zonesOf(TOOLBAR).map((zone) => zone.key)).toEqual([
      'leading',
      'center',
      'trailing',
    ]);
    expect(zonesOf(PANE).map((zone) => zone.key)).toEqual([
      'header',
      'content',
      'footer',
    ]);
    expect(zonesOf(COMPOSE).map((zone) => zone.key)).toEqual([
      'children',
      'icon',
    ]);
  });

  it('restricts a zone to its accepted components and disables a full zone', () => {
    const bar = {
      id: 'b',
      type: '@kerfjs/ui:tab-bar',
      zones: { trailing: [{ id: 'x', type: '@kerfjs/ui:button' }] },
    };
    const entry = viewCatalog.entries.get('@kerfjs/ui:tab-bar') as Parameters<
      typeof legalZones
    >[1];
    const zones = legalZones(
      bar,
      entry,
      propsByKey.get('@kerfjs/ui:tab-bar')!.props,
      keys,
    );
    const trailing = zones.find((zone) => zone.key === 'trailing')!;
    expect(trailing.accepts).toContain('@kerfjs/ui:button');
    expect(trailing.disabledReason).toBe('trailing holds at most 1');
    expect(zones.find((zone) => zone.key === 'tabs')?.accepts).toEqual([
      '@kerfjs/ui:tabs',
    ]);
    expect(legalZones({ id: 'n', type: 'x' }, undefined, [], keys)).toEqual([]);
  });
});

describe('History', () => {
  it('undoes and redoes, clears the future on a new edit, and caps its length', () => {
    const history = new History(2);
    const a = inbox;
    const b = setProp(a, COMPOSE, 'tone', 'danger');
    const c = setProp(b, COMPOSE, 'tone', 'success');
    expect(history.undo(a)).toBe(a);
    expect(history.redo(a)).toBe(a);
    history.record(a);
    history.record(b);
    expect(history.canUndo).toBe(true);
    expect(history.undo(c)).toBe(b);
    expect(history.canRedo).toBe(true);
    expect(history.redo(b)).toBe(c);
    history.record(c);
    expect(history.canRedo).toBe(false);
    history.record(c);
    expect(history.undo(c)).toBe(c);
    expect(history.undo(c)).toBe(c);
    expect(history.undo(c)).toBe(c);
    expect(history.canUndo).toBe(false);
    history.record(a);
    history.clear();
    expect(history.canUndo || history.canRedo).toBe(false);
  });
});

describe('bindingOptions', () => {
  // KF-K5TKCV: the sources the validator accepts for a prop.
  const labels = (id: string, prop: string) =>
    bindingOptions(inbox, viewCatalog, id, prop).map((option) => option.label);

  it('offers params that fit the prop, and in-scope item fields', () => {
    // The ListItem row sits in folderList's $each over items (as "item").
    expect(labels(ROW, 'label')).toEqual([
      'Param title',
      'Param selectedId',
      'item.id',
      'item.label',
    ]);
    // A boolean prop takes only the boolean param.
    expect(labels(ROW, 'disabled')).toEqual(['Param showEmpty']);
    // Outside the template, no item is in scope.
    expect(labels(TITLE, 'text')).toEqual(['Param title', 'Param selectedId']);
    expect(
      bindingOptions(inbox, viewCatalog, ROW, 'label').at(-1)?.value,
    ).toEqual({ $bind: 'item.label' });
  });

  it('finds scopes through $if branches and ignores other item sources', () => {
    const nested = globalThis.structuredClone(inbox) as unknown as {
      params?: Record<string, unknown>;
      root: { zones: { content: Record<string, unknown>[] } };
    };
    const branch = nested.root.zones.content.find((item) => '$if' in item)!;
    branch.else = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5H',
      type: '@kerfjs/ui:text',
      props: { children: 'All caught up' },
    };
    const document = nested as unknown as ViewDocument;
    expect(
      bindingOptions(
        document,
        viewCatalog,
        '01JB8Z1M6Q8E1X9V4S7K2R3T5H',
        'children',
      ).map((option) => option.label),
    ).toContain('Param title');
    // An $each over something other than an array param offers no fields.
    const literal = globalThis.structuredClone(inbox) as unknown as {
      params: Record<string, unknown>;
    };
    literal.params.items = { type: { kind: 'string' } };
    expect(
      bindingOptions(
        literal as unknown as ViewDocument,
        viewCatalog,
        ROW,
        'label',
      ).map((option) => option.label),
    ).not.toContain('item.label');
    const bare = globalThis.structuredClone(inbox) as unknown as {
      params?: unknown;
    };
    delete bare.params;
    expect(
      bindingOptions(
        bare as unknown as ViewDocument,
        viewCatalog,
        TITLE,
        'text',
      ),
    ).toEqual([]);
  });
});

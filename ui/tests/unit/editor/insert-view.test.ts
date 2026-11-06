// KF-PX5EVZ: insert an existing document as a `#view` (docs/26-ui-editor.md
// §3.7): which documents the picker offers, its filter, why a document
// cannot be composed, and the node that composes one.
import type { ViewDocument } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  filterDocuments,
  insertableDocuments,
  insertedView,
  insertProblem,
  requiredParamProps,
} from '../../../src/editor/model/insert-view.js';
import { rowDocument } from './fixtures-views.js';

const doc = (extra: Partial<ViewDocument> = {}): ViewDocument => ({
  schema: 'kerf-ui-document/v1',
  name: 'Part',
  catalogs: ['@kerfjs/ui'],
  root: { id: '01JC0V1EW0000000000000000R', type: '@kerfjs/ui:text' },
  ...extra,
});

describe('insertableDocuments', () => {
  it('drops the current document, drafts, other files, and repeats, sorted', () => {
    expect(
      insertableDocuments(
        [
          'views/b.kui.json',
          'views/messages.kui.json',
          '.kerf-ui-editor/drafts/x.kui.json',
          'a.kui.json',
          'views/b.kui.json',
          'notes.json',
        ],
        'views/messages.kui.json',
      ),
    ).toEqual(['a.kui.json', 'views/b.kui.json']);
    expect(insertableDocuments(['a.kui.json'], undefined)).toEqual([
      'a.kui.json',
    ]);
  });
});

describe('filterDocuments', () => {
  const paths = ['views/message-row.kui.json', 'views/inbox.kui.json'];
  it('keeps paths holding every word, ignoring case', () => {
    expect(filterDocuments(paths, '')).toEqual(paths);
    expect(filterDocuments(paths, '  ROW  ')).toEqual([paths[0]]);
    expect(filterDocuments(paths, 'views inbox')).toEqual([paths[1]]);
    expect(filterDocuments(paths, 'views zzz')).toEqual([]);
  });
});

describe('insertProblem', () => {
  it('refuses an empty document and one that declares slots', () => {
    expect(insertProblem(doc())).toBeUndefined();
    expect(insertProblem(doc({ slots: {} }))).toBeUndefined();
    expect(insertProblem(doc({ root: undefined }))).toMatch(/empty/);
    expect(insertProblem(doc({ slots: { body: {} } }))).toMatch(
      /declares slots/,
    );
  });
});

describe('requiredParamProps', () => {
  it('seeds each required param with an example or a minimal literal', () => {
    const props = requiredParamProps(
      doc({
        params: {
          title: { type: { kind: 'string' } },
          count: { type: { kind: 'number' } },
          open: { type: { kind: 'boolean' } },
          tone: { type: { kind: 'enum', values: ['info', 'danger'] } },
          body: { type: { kind: 'content' } },
          parts: { type: { kind: 'array', items: { kind: 'content' } } },
          onPick: { type: { kind: 'function' } },
          other: { type: { kind: 'ref', ref: 'Missing' } },
          withDefault: { type: { kind: 'string' }, default: 'x' },
          maybe: { type: { kind: 'string' }, optional: true },
        },
      }),
    );
    expect(props).toEqual({
      title: 'Title',
      count: 0,
      open: false,
      tone: 'info',
      body: '',
      parts: [],
      onPick: { $action: 'onPick' },
      other: {},
    });
    expect(requiredParamProps(doc())).toEqual({});
  });
});

describe('insertedView', () => {
  it('names the document relative to the composing one and seeds its params', () => {
    expect(
      insertedView(
        'V1',
        'views/messages.kui.json',
        'views/message-row.kui.json',
        rowDocument(),
      ),
    ).toEqual({
      id: 'V1',
      type: '#view',
      src: './message-row.kui.json',
      props: { title: 'Title' },
    });
    expect(
      insertedView('V2', 'app/main.kui.json', 'parts/part.kui.json', doc()),
    ).toEqual({ id: 'V2', type: '#view', src: '../parts/part.kui.json' });
  });
});

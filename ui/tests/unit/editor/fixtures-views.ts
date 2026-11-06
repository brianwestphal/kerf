// KF-5N26H6: a list document whose rows are a composed row document
// (docs/26-ui-editor.md §3.5 "Row and grid item templates", §3.7).
import type { ViewDocument } from '@kerfjs/ui/view';

export const ROW_PATH = 'views/message-row.kui.json';
export const LIST_PATH = 'views/messages.kui.json';
export const ROW_VIEW = '01JC0V1EW0000000000000000V';
const LIST_ROOT = '01JC0V1EW0000000000000000S';

export const rowDocument = (): ViewDocument => ({
  schema: 'kerf-ui-document/v1',
  name: 'MessageRow',
  catalogs: ['@kerfjs/ui'],
  params: {
    title: { type: { kind: 'string' } },
    unread: { type: { kind: 'boolean' }, default: false },
  },
  root: {
    id: '01JC0V1EW0000000000000000R',
    type: '@kerfjs/ui:list-item',
    props: {
      label: { $param: 'title' },
      selected: { $param: 'unread' },
      action: { $action: 'open-message' },
    },
  },
});

export const listDocument = (
  props: Record<string, unknown> = { title: { $bind: 'message.subject' } },
  src = './message-row.kui.json',
  /** More params beside `messages`. */
  params: Record<string, unknown> = {},
): ViewDocument =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Messages',
    catalogs: ['@kerfjs/ui'],
    params: {
      ...params,
      messages: {
        type: {
          kind: 'array',
          items: {
            kind: 'object',
            props: [
              { name: 'id', type: { kind: 'string' }, required: true },
              { name: 'subject', type: { kind: 'string' }, required: true },
              { name: 'count', type: { kind: 'number' }, required: true },
            ],
          },
        },
        default: [
          { id: 'm1', subject: 'Quarterly report', count: 1 },
          { id: 'm2', subject: 'Lunch on Friday', count: 2 },
        ],
      },
    },
    root: {
      id: LIST_ROOT,
      type: '@kerfjs/ui:list',
      props: { ariaLabel: 'Messages' },
      zones: {
        children: [
          {
            $each: { $param: 'messages' },
            as: 'message',
            key: 'message.id',
            template: { id: ROW_VIEW, type: '#view', src, props },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

// Consumer-side compile fixture for the generated inbox.view.ts (KF-WWJGSN:
// view generator). `npm run typecheck` compiles it, so each @ts-expect-error
// below proves a contract guarantee from docs/26-ui-editor.md §4 holds: an
// unhandled or unknown action, a missing required input, a wrong input type,
// and a raw string where a slot needs SafeHtml all fail to compile.
import { raw } from 'kerfjs';

import {
  inboxContract,
  inboxRefs,
  renderInbox,
  wireInbox,
} from './inbox.view.js';

const items = [{ id: 'a', label: 'Alpha' }];
const detail = ({ selectedId }: { readonly selectedId: string }) =>
  raw(`<p>${selectedId}</p>`);

export const html = renderInbox(
  { items, selectedId: 'a', title: 'Mail' },
  { detail },
);

export function wire(root: HTMLElement): () => void {
  return wireInbox(root, {
    compose: ({ event }) => event.preventDefault(),
    'open-item': ({ key }) => void key.toUpperCase(),
  });
}

export function refs(root: HTMLElement): string {
  const { composeButton, row } = inboxRefs(root);
  composeButton.disabled = true;
  return `${inboxContract}:${row('a')?.id ?? ''}`;
}

export const missingHandler = (root: HTMLElement) =>
  // @ts-expect-error: every action in the document must be handled.
  wireInbox(root, { compose: () => undefined });

export const extraHandler = (root: HTMLElement) =>
  wireInbox(root, {
    compose: () => undefined,
    'open-item': () => undefined,
    // @ts-expect-error: an action the document no longer declares.
    archive: () => undefined,
  });

// @ts-expect-error: `items` and `selectedId` are required inputs.
export const missingInput = renderInbox({}, { detail });

export const wrongInput = renderInbox(
  // @ts-expect-error: `showEmpty` is a boolean input.
  { items, selectedId: 'a', showEmpty: 'yes' },
  { detail },
);

export const rawSlot = renderInbox(
  { items, selectedId: 'a' },
  // @ts-expect-error: a slot returns SafeHtml, never a raw string.
  { detail: () => '<p>unsafe</p>' },
);

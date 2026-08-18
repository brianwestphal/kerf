/**
 * Integration: `kerfjs/overlay` composed with mount + delegate + signals.
 * A delegated button opens a confirm(); resolving it drives a signal-backed
 * counter that a separate mount() region reflects — the full async round trip.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { delegate } from '../../src/delegate.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { confirm, overlay } from '../../src/overlay.js';
import { signal } from '../../src/reactive.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('overlay — full pipeline', () => {
  it('a confirm() resolved via OK drives a signal-backed mount() region', async () => {
    const deletions = signal(0);
    const app = document.createElement('div');
    document.body.appendChild(app);

    mount(app, () =>
      jsx('div', {
        children: [
          jsx('span', { class: 'count', children: deletions.value }),
          jsx('button', { class: 'del', children: 'delete' }),
        ],
      }),
    );

    delegate(app, 'click', '.del', () => {
      void confirm('Delete?').then((ok) => {
        if (ok) deletions.value++;
      });
    });

    // Cancel path: nothing changes.
    (app.querySelector('.del') as HTMLElement).click();
    (document.querySelector('[data-confirm="cancel"]') as HTMLElement).click();
    await Promise.resolve();
    expect(app.querySelector('.count')?.textContent).toBe('0');

    // OK path: the counter increments and the mount() region reflects it.
    (app.querySelector('.del') as HTMLElement).click();
    (document.querySelector('[data-confirm="ok"]') as HTMLElement).click();
    await Promise.resolve();
    await Promise.resolve();
    expect(app.querySelector('.count')?.textContent).toBe('1');
    // The dialog is gone from the DOM afterward.
    expect(document.querySelector('.kerf-confirm')).toBeNull();
  });

  it('overlay content mounted reactively updates while open, and is disposed on close', () => {
    const msg = signal('loading…');
    const h = overlay(() => jsx('p', { class: 'status', children: msg.value }), { trap: false, dismiss: false });
    expect(document.querySelector('.status')?.textContent).toBe('loading…');
    msg.value = 'ready';
    expect(document.querySelector('.status')?.textContent).toBe('ready');
    h.close();
    expect(document.querySelector('.status')).toBeNull();
  });
});

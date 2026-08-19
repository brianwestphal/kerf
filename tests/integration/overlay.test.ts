/**
 * Integration: `kerfjs/overlay` composed with mount + delegate + signals.
 * A delegated button opens a confirm(); resolving it drives a signal-backed
 * counter that a separate mount() region reflects — the full async round trip.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { delegate } from '../../src/delegate.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { confirm, form, overlay, prompt } from '../../src/overlay.js';
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

  it('a delegated button opens prompt(), and the entered string drives a mount() region', async () => {
    const label = signal('untitled');
    const app = document.createElement('div');
    document.body.appendChild(app);

    mount(app, () =>
      jsx('div', {
        children: [
          jsx('span', { class: 'label', children: label.value }),
          jsx('button', { class: 'rename', children: 'rename' }),
        ],
      }),
    );

    delegate(app, 'click', '.rename', () => {
      void prompt('New name', { defaultValue: label.value }).then((name) => {
        if (name !== null) label.value = name;
      });
    });

    (app.querySelector('.rename') as HTMLElement).click();
    const input = document.querySelector('.kerf-prompt__input') as HTMLInputElement;
    input.value = 'diagram';
    (document.querySelector('[data-prompt="ok"]') as HTMLElement).click();
    await Promise.resolve();
    await Promise.resolve();
    expect(app.querySelector('.label')?.textContent).toBe('diagram');
    expect(document.querySelector('.kerf-prompt')).toBeNull();
  });

  it('a form() collects a multi-field record that drives a mount() region', async () => {
    const conn = signal('none');
    const app = document.createElement('div');
    document.body.appendChild(app);

    mount(app, () => jsx('span', { class: 'conn', children: conn.value }));

    void form([
      { name: 'host', defaultValue: 'localhost' },
      { name: 'port', defaultValue: '5432' },
    ]).then((rec) => {
      if (rec !== null) conn.value = `${rec.host}:${rec.port}`;
    });

    (document.querySelector('[data-field="host"]') as HTMLInputElement).value = 'db';
    (document.querySelector('[data-form="ok"]') as HTMLElement).click();
    await Promise.resolve();
    await Promise.resolve();
    expect(app.querySelector('.conn')?.textContent).toBe('db:5432');
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

/**
 * Integration: `kerfjs/async` composed with mount + signals. A resource's
 * status drives a mount() region through idle → loading → completed, proving
 * `resource.value` is a tracking read the render pipeline reacts to.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { resource } from '../../src/async.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('async — full pipeline', () => {
  it("a resource's status drives a mount() region through loading → data", async () => {
    const users = resource<string[]>();
    const app = document.createElement('div');
    document.body.appendChild(app);

    mount(app, () => {
      const s = users.value;
      if (s.status === 'running') return jsx('p', { class: 'state', children: 'loading' });
      if (s.status === 'completed') {
        return jsx('ul', { class: 'state', children: (s.data ?? []).map((u) => jsx('li', { children: u })) });
      }
      return jsx('p', { class: 'state', children: 'idle' });
    });

    expect(app.querySelector('.state')?.textContent).toBe('idle');

    const d = deferred<string[]>();
    const p = users.run(() => d.promise);
    expect(app.querySelector('.state')?.textContent).toBe('loading');

    d.resolve(['ada', 'grace']);
    await p;
    await Promise.resolve();
    expect(app.querySelectorAll('.state li').length).toBe(2);
    expect(app.querySelector('.state li')?.textContent).toBe('ada');
  });
});

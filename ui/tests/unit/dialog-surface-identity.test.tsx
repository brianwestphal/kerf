import { mount, signal } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { DialogSurface } from '../../src/surface-scaffold.js';

describe('DialogSurface rootAttributes', () => {
  it('passes data-* identity to the root and protects its own attributes', () => {
    const output = String(
      DialogSurface({
        children: <p>Body</p>,
        size: 'large',
        rootAttributes: {
          'data-key': 'setup',
          'data-size': 'small',
          'data-component': 'x',
        },
      }),
    );
    expect(output).toContain('data-key="setup"');
    expect(output).toContain('data-size="large"');
    expect(output).not.toContain('data-size="small"');
    expect(output).toContain('data-component="dialog-surface"');
    expect(String(DialogSurface({ children: <p>Body</p> }))).not.toContain(
      'data-key',
    );
  });

  it('keeps each keyed sibling dialog on its own element across re-renders', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const order = signal(['setup', 'connect']);
    const names: Record<string, string> = {
      setup: 'Set up project',
      connect: 'Connect repository',
    };
    const dispose = mount(root, () => (
      <div>
        {order.value.map((key) => (
          <DialogSurface rootAttributes={{ 'data-key': key }}>
            <wa-dialog label={names[key]}>
              <p>{names[key]}</p>
            </wa-dialog>
          </DialogSurface>
        ))}
      </div>
    ));
    const surface = (key: string) =>
      root.querySelector<HTMLElement>(`[data-key="${key}"]`)!;
    const setup = surface('setup');
    const connect = surface('connect');
    setup.dataset.marker = 'setup-element';

    order.value = ['connect'];
    expect(surface('connect')).toBe(connect);
    expect(root.querySelector('[data-marker="setup-element"]')).toBeNull();

    order.value = ['setup', 'connect'];
    expect(surface('connect')).toBe(connect);
    expect(surface('connect').textContent).toBe('Connect repository');
    expect(surface('setup').textContent).toBe('Set up project');
    dispose();
    root.remove();
  });
});

import { describe, expect, it, vi } from 'vitest';

import { installDialogLabel } from '../../src/components/surfaces/surface-scaffold/internal/install-dialog-label.js';

function fixture(scoped = true) {
  const parent = document.createElement('div');
  if (scoped) parent.className = 'kui-dialog-surface';
  const host = document.createElement('wa-dialog') as unknown as HTMLElement & {
    dialog?: HTMLDialogElement;
    label: string;
    withoutHeader: boolean;
    update(changed: unknown): void;
  };
  const shadow = host.attachShadow({ mode: 'open' });
  const panel = document.createElement('dialog');
  shadow.append(panel);
  host.dialog = panel;
  host.label = 'Edit workspace';
  host.withoutHeader = false;
  const update = vi.fn((changed: unknown) => {
    let title = shadow.getElementById('title');
    if (host.withoutHeader) title?.remove();
    else {
      if (!title) {
        title = document.createElement('h2');
        title.id = 'title';
        panel.append(title);
      }
      title.textContent = host.label;
    }
    return changed;
  });
  host.update = update;
  parent.append(host);
  installDialogLabel(host);
  return { host, panel, update, shadow };
}

describe('Web Awesome dialog naming adapter', () => {
  it('names the rendered native title before the first modal opening and installs once', () => {
    const { host, panel, update } = fixture();
    const patched = host.update;
    installDialogLabel(host);
    expect(host.update).toBe(patched);
    const changed = new Map([['label', '']]);
    host.update(changed);
    expect(update).toHaveBeenCalledExactlyOnceWith(changed);
    expect(panel.getAttribute('aria-labelledby')).toBe('title');
    expect(panel.hasAttribute('aria-label')).toBe(false);
  });

  it('walks headed, updated, headerless, explicit and restored names without stale competing attributes', () => {
    const { host, panel, shadow } = fixture();
    host.update(undefined);
    host.label = 'Review changes';
    host.update(undefined);
    expect(shadow.getElementById('title')!.textContent).toBe('Review changes');
    expect(panel.getAttribute('aria-labelledby')).toBe('title');
    host.withoutHeader = true;
    host.update(undefined);
    expect(panel.getAttribute('aria-label')).toBe('Review changes');
    expect(panel.hasAttribute('aria-labelledby')).toBe(false);
    host.label = '';
    host.update(undefined);
    expect(panel.getAttribute('aria-label')).toBe('');
    host.setAttribute('aria-label', ' Explicit workspace name ');
    host.update(undefined);
    expect(panel.getAttribute('aria-label')).toBe('Explicit workspace name');
    host.removeAttribute('aria-label');
    host.label = 'Edit workspace';
    host.withoutHeader = false;
    host.update(undefined);
    expect(panel.getAttribute('aria-labelledby')).toBe('title');
    expect(panel.hasAttribute('aria-label')).toBe(false);
  });

  it('synchronizes attribute-only explicit name changes without another render', async () => {
    const { host, panel, update } = fixture();
    host.update(undefined);
    host.setAttribute('aria-label', 'First explicit name');
    await vi.waitFor(() =>
      expect(panel.getAttribute('aria-label')).toBe('First explicit name'),
    );
    host.setAttribute('aria-label', 'Second explicit name');
    await vi.waitFor(() =>
      expect(panel.getAttribute('aria-label')).toBe('Second explicit name'),
    );
    host.removeAttribute('aria-label');
    await vi.waitFor(() =>
      expect(panel.getAttribute('aria-labelledby')).toBe('title'),
    );
    expect(panel.hasAttribute('aria-label')).toBe(false);
    expect(update).toHaveBeenCalledOnce();
    host.parentElement!.className = '';
    host.setAttribute('aria-label', 'Unwrapped explicit name');
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(panel.getAttribute('aria-labelledby')).toBe('title');
    expect(panel.hasAttribute('aria-label')).toBe(false);
  });

  it.each(['aria-label', 'aria-labelledby'])(
    'preserves an externally supplied native %s and clears only its own competing name',
    (attribute) => {
      const { host, panel } = fixture();
      host.update(undefined);
      panel.setAttribute(attribute, 'external-name');
      host.withoutHeader = true;
      host.update(undefined);
      expect(panel.getAttribute(attribute)).toBe('external-name');
      if (attribute === 'aria-label')
        expect(panel.hasAttribute('aria-labelledby')).toBe(false);
      panel.removeAttribute(attribute);
      host.update(undefined);
      expect(panel.getAttribute('aria-label')).toBe('Edit workspace');
    },
  );

  it('preserves pre-existing native naming, descriptions and the original update failure', () => {
    const { host, panel } = fixture();
    panel.setAttribute('aria-label', 'Native supplied name');
    panel.setAttribute('aria-describedby', 'description');
    host.update(undefined);
    expect(panel.getAttribute('aria-label')).toBe('Native supplied name');
    expect(panel.getAttribute('aria-describedby')).toBe('description');
    const failing = {
      update() {
        throw new Error('render failed');
      },
    };
    installDialogLabel(failing);
    expect(() => failing.update()).toThrow('render failed');
  });

  it('leaves unwrapped dialogs alone and tolerates an update before the native panel exists', () => {
    const raw = fixture(false);
    raw.host.update(undefined);
    expect(raw.panel.hasAttribute('aria-labelledby')).toBe(false);
    const { host, panel } = fixture();
    host.dialog = undefined;
    host.update(undefined);
    expect(panel.hasAttribute('aria-labelledby')).toBe(false);
    host.dialog = panel;
    host.update(undefined);
    expect(panel.getAttribute('aria-labelledby')).toBe('title');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  installSelectOptionSemantics,
  restoreOptionSemantics,
} from '../../src/install-select-option-semantics.js';

// Fakes of the Web Awesome members this boundary adapts. The browser suite
// (tests/browser/select-option-semantics.spec.ts) covers the real elements
// under a real kerf re-render.
interface FakeOption extends HTMLElement {
  selected: boolean;
  disabled: boolean;
}

interface FakeSelect extends HTMLElement {
  updated(changedProperties: unknown): void;
}

function prototype() {
  const originalUpdated = vi.fn();
  const proto = { updated: originalUpdated };
  Object.setPrototypeOf(proto, HTMLDivElement.prototype);
  return { proto, originalUpdated };
}

function option(selected = false, disabled = false): FakeOption {
  const element = document.createElement('wa-option') as FakeOption;
  Object.assign(element, { selected, disabled });
  element.setAttribute('role', 'option');
  element.setAttribute('aria-selected', String(selected));
  element.setAttribute('aria-disabled', String(disabled));
  return element;
}

function build(proto: object, kerf = true) {
  const host = document.createElement('div') as unknown as FakeSelect;
  Object.setPrototypeOf(host, proto);
  if (kerf) host.dataset.component = 'select';
  const options = [option(), option(true), option(false, true)];
  // Options nested in a group still belong to the Select.
  const group = document.createElement('div');
  group.append(options[2]!);
  host.append(options[0]!, options[1]!, group);
  document.body.append(host);
  return { host, options };
}

const flush = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, 0));

function strip(element: HTMLElement) {
  for (const name of ['role', 'aria-selected', 'aria-disabled']) {
    element.removeAttribute(name);
  }
}

function semantics(element: HTMLElement) {
  return ['role', 'aria-selected', 'aria-disabled'].map((name) =>
    element.getAttribute(name),
  );
}

describe('Select option semantics boundary', () => {
  afterEach(() => document.body.replaceChildren());

  it('installs once per prototype', () => {
    const { proto } = prototype();
    installSelectOptionSemantics(proto);
    const installed = proto.updated;
    installSelectOptionSemantics(proto);
    expect(proto.updated).toBe(installed);
  });

  it('restores stripped option semantics from the live state after a render', async () => {
    const { proto, originalUpdated } = prototype();
    installSelectOptionSemantics(proto);
    const { host, options } = build(proto);
    host.updated(new Map());
    // Later updates do not attach a second observer.
    host.updated(new Map());
    expect(originalUpdated).toHaveBeenCalledTimes(2);

    options.forEach(strip);
    await flush();
    expect(options.map(semantics)).toEqual([
      ['option', 'false', 'false'],
      ['option', 'true', 'false'],
      ['option', 'false', 'true'],
    ]);

    // A rewrite that disagrees with the live state is corrected too.
    options[0]!.setAttribute('aria-selected', 'true');
    options[1]!.setAttribute('role', 'presentation');
    await flush();
    expect(semantics(options[0]!)).toEqual(['option', 'false', 'false']);
    expect(semantics(options[1]!)).toEqual(['option', 'true', 'false']);
  });

  it('follows the live selection, not the stripped attribute', async () => {
    const { proto } = prototype();
    installSelectOptionSemantics(proto);
    const { host, options } = build(proto);
    host.updated(new Map());
    options[0]!.selected = true;
    options[1]!.selected = false;
    options.forEach(strip);
    await flush();
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('ignores non-option descendants and Selects outside Kerf', async () => {
    const { proto } = prototype();
    installSelectOptionSemantics(proto);
    const { host } = build(proto);
    host.updated(new Map());
    const group = host.querySelector('div')!;
    group.setAttribute('role', 'group');
    group.removeAttribute('role');
    await flush();
    expect(group.hasAttribute('role')).toBe(false);

    const raw = build(proto, false);
    raw.host.updated(new Map());
    strip(raw.options[1]!);
    await flush();
    expect(semantics(raw.options[1]!)).toEqual([null, null, null]);
  });

  it('writes only attributes that differ', () => {
    const element = option(true);
    const setAttribute = vi.spyOn(element, 'setAttribute');
    restoreOptionSemantics(element);
    expect(setAttribute).not.toHaveBeenCalled();
  });
});

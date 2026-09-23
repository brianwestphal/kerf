import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { animateSelectPopup } from '../../src/animate-select-popup.js';
import { installSelectLifecycle } from '../../src/install-select-lifecycle.js';

vi.mock('../../src/animate-select-popup.js', () => ({
  animateSelectPopup: vi.fn(),
}));

function host() {
  const element = Object.assign(document.createElement('div'), {
    open: false,
    disabled: false,
    updateComplete: Promise.resolve(true),
    listbox: document.createElement('div'),
    popup: { active: false, popup: document.createElement('div') },
    currentOption: undefined as HTMLElement | undefined,
    selectedOptions: [] as HTMLElement[],
    getFirstOption: vi.fn<() => HTMLElement | undefined>(),
    setCurrentOption: vi.fn(),
    addOpenListeners: vi.fn(),
    removeOpenListeners: vi.fn(),
    handleOpenChange: vi.fn(() => Promise.resolve()) as () => Promise<void>,
    handleDisabledChange() {
      if (this.disabled && this.open) this.open = false;
    },
  });
  element.dataset.component = 'select';
  element.listbox.hidden = true;
  element.listbox.scrollTo = vi.fn();
  document.body.append(element);
  return element;
}

describe('Select lifecycle ownership', () => {
  let finishes: Array<() => void>;
  beforeEach(() => {
    finishes = [];
    vi.mocked(animateSelectPopup).mockImplementation(
      () => new Promise((resolve) => finishes.push(resolve)),
    );
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
  });
  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('installs once and leaves raw Web Awesome selects with their native lifecycle', async () => {
    const select = host();
    const original = select.handleOpenChange;
    installSelectLifecycle(select);
    const installed = select.handleOpenChange;
    installSelectLifecycle(select);
    expect(select.handleOpenChange).toBe(installed);
    delete select.dataset.component;
    await select.handleOpenChange();
    expect(original).toHaveBeenCalledOnce();
    expect(animateSelectPopup).not.toHaveBeenCalled();
  });

  it('ignores old hide/show completions through repeated reversals and preserves the latest close', async () => {
    const select = host();
    installSelectLifecycle(select);
    const events: string[] = [];
    for (const name of ['wa-after-show', 'wa-after-hide'])
      select.addEventListener(name, () => events.push(name));
    const pending: Promise<void>[] = [];
    for (const open of [true, false, true, false, true]) {
      select.open = open;
      pending.push(select.handleOpenChange());
    }
    for (const index of [1, 3, 0, 2]) finishes[index]();
    await Promise.all(pending.slice(0, 4));
    expect(select.popup.active).toBe(true);
    expect(select.listbox.hidden).toBe(false);
    expect(events).toEqual([]);
    finishes[4]();
    await pending[4];
    expect(events).toEqual(['wa-after-show']);
    select.open = false;
    const close = select.handleOpenChange();
    finishes[5]();
    await close;
    expect(select.popup.active).toBe(false);
    expect(select.listbox.hidden).toBe(true);
    expect(events).toEqual(['wa-after-show', 'wa-after-hide']);
  });

  it('suppresses stale focus and completion when disabled, removed, or synchronously reversed', async () => {
    const select = host();
    installSelectLifecycle(select);
    const after = vi.fn();
    select.addEventListener('wa-after-show', after);
    select.open = true;
    const opening = select.handleOpenChange();
    select.disabled = true;
    const closing = select.handleOpenChange();
    finishes[0]();
    finishes[1]();
    await Promise.all([opening, closing]);
    expect(select.popup.active).toBe(false);
    select.disabled = false;
    const detached = select.handleOpenChange();
    select.remove();
    finishes[2]();
    await detached;
    expect(select.popup.active).toBe(false);
    expect(select.listbox.hidden).toBe(true);
    await select.handleOpenChange();
    expect(after).not.toHaveBeenCalled();
    document.body.append(select);
    select.addEventListener(
      'wa-show',
      () => {
        select.open = false;
      },
      { once: true },
    );
    await select.handleOpenChange();
    expect(animateSelectPopup).toHaveBeenCalledTimes(3);
    for (const [callback] of vi.mocked(window.requestAnimationFrame).mock.calls)
      callback(0);
    // Only each opening's initial native selection runs; deferred focus is stale.
    expect(select.setCurrentOption).toHaveBeenCalledTimes(3);
  });

  it('keeps instances independent and preserves prevented lifecycle events', async () => {
    const first = host();
    const second = host();
    const prototype = {
      handleOpenChange: () => Promise.resolve(),
      handleDisabledChange: () => undefined,
    };
    installSelectLifecycle(prototype);
    first.handleOpenChange = prototype.handleOpenChange;
    second.handleOpenChange = prototype.handleOpenChange;
    first.open = second.open = true;
    const one = first.handleOpenChange();
    const two = second.handleOpenChange();
    finishes[1]();
    await two;
    expect(first.popup.active).toBe(true);
    finishes[0]();
    await one;
    second.addEventListener('wa-hide', (event) => event.preventDefault());
    second.open = false;
    await second.handleOpenChange();
    expect(second.open).toBe(true);
    expect(second.popup.active).toBe(true);
    first.open = false;
    const close = first.handleOpenChange();
    finishes[2]();
    await close;
    first.addEventListener('wa-show', (event) => event.preventDefault());
    first.open = true;
    await first.handleOpenChange();
    expect(first.open).toBe(false);
    expect(first.listbox.hidden).toBe(true);
  });

  it('closes after the native disabled watcher changes open during an update', async () => {
    const select = host();
    installSelectLifecycle(select);
    select.handleDisabledChange();
    select.open = true;
    const opening = select.handleOpenChange();
    select.disabled = true;
    select.handleDisabledChange();
    finishes[1]();
    finishes[0]();
    await opening;
    expect(select.open).toBe(false);
    expect(select.popup.active).toBe(false);
    expect(select.listbox.hidden).toBe(true);
    delete select.dataset.component;
    select.open = true;
    select.handleDisabledChange();
    expect(animateSelectPopup).toHaveBeenCalledTimes(2);
  });

  it('keeps an accepted animation alive when its reversal is prevented', async () => {
    const select = host();
    installSelectLifecycle(select);
    const after = vi.fn();
    select.addEventListener('wa-after-show', after);
    select.open = true;
    const opening = select.handleOpenChange();
    const acceptedSignal = vi.mocked(animateSelectPopup).mock.calls[0][2];
    select.addEventListener('wa-hide', (event) => event.preventDefault());
    select.open = false;
    const rejected = select.handleOpenChange();
    // Simulate Lit's restoration watcher before the updateComplete checkpoint.
    const restored = select.handleOpenChange();
    expect(acceptedSignal.aborted).toBe(false);
    finishes[0]();
    await Promise.all([opening, rejected, restored]);
    expect(after).toHaveBeenCalledOnce();
    expect(animateSelectPopup).toHaveBeenCalledOnce();
    expect(select.open).toBe(true);
  });

  it.each([-10, 10, 0])(
    'retains native option focus and vertical reveal for offset %s',
    async (offset) => {
      const select = host();
      const option = document.createElement('div');
      select.currentOption = option;
      select.selectedOptions = [option];
      vi.spyOn(option, 'getBoundingClientRect').mockReturnValue({
        top: offset,
      } as DOMRect);
      installSelectLifecycle(select);
      select.open = true;
      const opening = select.handleOpenChange();
      const callback = vi.mocked(window.requestAnimationFrame).mock.calls[0][0];
      callback(0);
      finishes[0]();
      await opening;
      expect(select.setCurrentOption).toHaveBeenNthCalledWith(1, option);
      expect(select.setCurrentOption).toHaveBeenNthCalledWith(2, option);
      expect(select.listbox.scrollTo).toHaveBeenCalledTimes(
        offset === 0 ? 0 : 1,
      );
    },
  );
});

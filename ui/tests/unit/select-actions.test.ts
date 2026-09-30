import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  installSelectActions,
  runSelectAction,
} from '../../src/install-select-actions.js';

type Host = Parameters<typeof runSelectAction>[0];
type Option = ReturnType<Host['getAllOptions']>[number];

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts) host.remove();
  hosts.length = 0;
});

function fixture() {
  const host = document.createElement('wa-select') as unknown as Host;
  host.dataset.component = 'select';
  host.multiple = true;
  host.disabled = false;
  host.updateComplete = Promise.resolve();
  const options = ['bug', 'browser', 'docs'].map((value) => {
    const option = document.createElement('wa-option') as Option;
    option.setAttribute('value', value);
    option.disabled = value === 'browser';
    return option;
  });
  host.selectedOptions = [options[0]!];
  host.getAllOptions = () => options;
  host.setSelectedOptions = vi.fn((next: Option[]) => {
    host.selectedOptions = next;
  });
  const input = vi.fn();
  const change = vi.fn();
  host.addEventListener('input', input);
  host.addEventListener('change', change);
  document.body.append(host);
  hosts.push(host);
  return { host, options, input, change };
}

describe('multiple Select actions', () => {
  it('selects only enabled choices, clears them, and emits ordinary events once per change', async () => {
    const { host, options, input, change } = fixture();
    expect(runSelectAction(host, 'all')).toBe(true);
    expect(host.selectedOptions).toEqual([options[0], options[2]]);
    expect(host.hasInteracted).toBe(true);
    expect(host.valueHasChanged).toBe(true);
    await host.updateComplete;
    expect(input).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledTimes(1);
    expect(runSelectAction(host, 'all')).toBe(false);
    expect(runSelectAction(host, 'clear')).toBe(true);
    expect(host.selectedOptions).toEqual([]);
    await host.updateComplete;
    expect(change).toHaveBeenCalledTimes(2);
    expect(runSelectAction(host, 'clear')).toBe(false);
    expect(change).toHaveBeenCalledTimes(2);
  });

  it('ignores a disabled or single-value host and delegates only opt-in buttons', async () => {
    const { host, options, change } = fixture();
    host.disabled = true;
    expect(runSelectAction(host, 'clear')).toBe(false);
    host.disabled = false;
    host.multiple = false;
    expect(runSelectAction(host, 'clear')).toBe(false);
    host.multiple = true;
    const button = document.createElement('button');
    button.dataset.selectAction = 'clear';
    host.append(button);
    installSelectActions(document);
    installSelectActions(document);
    button.click();
    await host.updateComplete;
    expect(change).toHaveBeenCalledTimes(1);
    expect(host.selectedOptions).toEqual([]);
    button.dataset.selectAction = 'all';
    button.click();
    await host.updateComplete;
    expect(host.selectedOptions).toEqual([options[0], options[2]]);
    expect(change).toHaveBeenCalledTimes(2);
    const laterKeydown = vi.fn();
    document.addEventListener('keydown', laterKeydown);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(laterKeydown).not.toHaveBeenCalled();
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(laterKeydown).toHaveBeenCalledTimes(1);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(laterKeydown).toHaveBeenCalledTimes(2);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(laterKeydown).toHaveBeenCalledTimes(3);
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    document.body.click();
    const unrelated = document.createElement('button');
    unrelated.dataset.selectAction = 'clear';
    document.body.append(unrelated);
    unrelated.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(laterKeydown).toHaveBeenCalledTimes(5);
    unrelated.click();
    unrelated.remove();
    button.dataset.selectAction = 'invalid';
    button.click();
    expect(change).toHaveBeenCalledTimes(2);
    button.dataset.selectAction = 'clear';
    button.disabled = true;
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.disabled = false;
    expect(change).toHaveBeenCalledTimes(2);
    document.removeEventListener('keydown', laterKeydown);
    button.click();
    await host.updateComplete;
    expect(change).toHaveBeenCalledTimes(3);
    expect(host.selectedOptions).toEqual([]);
  });
});

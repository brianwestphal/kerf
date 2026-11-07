// KF-NF65PK: the one typeahead contract Select and PopupMenu share.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TYPEAHEAD_RESET as MENU_TYPEAHEAD_RESET } from '../../src/components/actions/popup-menu/internal/popup-menu-controller.js';
import { SELECT_TYPEAHEAD_RESET } from '../../src/components/forms/select/internal/select-controller.js';
import {
  createTypeahead,
  itemLabel,
  TYPEAHEAD_RESET,
} from '../../src/shared/dom/typeahead.js';

afterEach(() => {
  vi.useRealTimers();
});

const items = (...labels: string[]) =>
  labels.map((label) => {
    const item = document.createElement('div');
    item.innerHTML = `<span class="label">${label}</span>`;
    return item;
  });
const label = (item: Element) => itemLabel(item, '.label');

describe('shared typeahead', () => {
  it('is the single reset both popups use', () => {
    expect(SELECT_TYPEAHEAD_RESET).toBe(TYPEAHEAD_RESET);
    expect(MENU_TYPEAHEAD_RESET).toBe(TYPEAHEAD_RESET);
  });

  it('matches a growing prefix, backs up with Backspace, and resets after the delay', () => {
    vi.useFakeTimers();
    const typeahead = createTypeahead(window);
    const owner = document.createElement('div');
    const list = items('Copy', 'Copy link', 'Cut');
    expect(typeahead.type(owner, 'c', list, label)).toBe(list[0]);
    expect(typeahead.type(owner, 'u', list, label)).toBe(list[2]);
    expect(typeahead.type(owner, 'Backspace', list, label)).toBe(list[0]);
    expect(typeahead.query(owner)).toBe('c');
    // A typed space is part of the prefix.
    typeahead.type(owner, 'o', list, label);
    typeahead.type(owner, 'p', list, label);
    typeahead.type(owner, 'y', list, label);
    expect(typeahead.type(owner, ' ', list, label)).toBe(list[1]);
    vi.advanceTimersByTime(TYPEAHEAD_RESET);
    expect(typeahead.query(owner)).toBe('');
  });

  it('matches nothing for a Backspace on an empty query or one that empties it', () => {
    const typeahead = createTypeahead(window);
    const owner = document.createElement('div');
    const list = items('Alpha', 'Beta');
    expect(typeahead.type(owner, 'Backspace', list, label)).toBeUndefined();
    expect(typeahead.type(owner, 'b', list, label)).toBe(list[1]);
    expect(typeahead.type(owner, 'Backspace', list, label)).toBeUndefined();
  });

  it('keeps one query per owner', () => {
    const typeahead = createTypeahead(window);
    const a = document.createElement('div');
    const b = document.createElement('div');
    const list = items('Alpha', 'Beta');
    typeahead.type(a, 'a', list, label);
    expect(typeahead.type(b, 'b', list, label)).toBe(list[1]);
    expect(typeahead.query(a)).toBe('a');
  });

  it('falls back to the whole item when the label element is missing', () => {
    const bare = document.createElement('div');
    bare.innerHTML = '  <i>icon</i>\n  Hand   authored ';
    expect(itemLabel(bare, '.label')).toBe('icon Hand authored');
    expect(label(items(' Spaced ')[0])).toBe('Spaced');
  });
});

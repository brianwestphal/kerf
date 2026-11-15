import { mount, signal } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchField } from '../../src/components/forms/search-field/search-field.js';
import {
  SEARCH_RESULT_ANNOUNCE_DELAY,
  watchSearchFieldResults,
} from '../../src/components/forms/search-field/wiring/announce-search-results.js';
import { wireSearchFields } from '../../src/components/forms/search-field/wiring/wire-search-fields.js';

// KF-8CDT8B: SearchField's in-field find readout and its polite announcement.
describe('SearchField resultText', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('renders the readout before Clear and describes the editor with it', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <SearchField
        id="find"
        label="Find"
        query="release"
        resultText="2 of 5"
      />,
    );
    const field = root.querySelector('.kui-search-field')!;
    const result = field.querySelector('.kui-search-field__result')!;
    expect(result.id).toBe('find-result');
    expect(result.textContent).toBe('2 of 5');
    expect(result.nextElementSibling?.className).toBe(
      'kui-search-field__result-live',
    );
    const live = result.nextElementSibling!;
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(live.hasAttribute('data-morph-skip')).toBe(true);
    expect(live.textContent).toBe('');
    expect(live.nextElementSibling?.className).toBe('kui-search-field__clear');
    expect(
      field
        .querySelector('.kui-search-field__editor')!
        .getAttribute('aria-describedby'),
    ).toBe('find-result');
  });

  it('joins the form hint and the readout in the description', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <SearchField
        id="find"
        label="Find"
        presentation="form-field"
        hint="Matches whole words"
        resultText=""
      />,
    );
    expect(
      root
        .querySelector('.kui-search-field__editor')!
        .getAttribute('aria-describedby'),
    ).toBe('find-hint find-result');
    expect(root.querySelector('.kui-search-field__result')!.textContent).toBe(
      '',
    );
  });

  it('renders no readout without resultText or while collapsed', () => {
    const root = document.createElement('div');
    root.innerHTML = String(<SearchField id="plain" label="Find" />);
    expect(root.querySelector('.kui-search-field__result')).toBeNull();
    expect(
      root
        .querySelector('.kui-search-field__editor')!
        .hasAttribute('aria-describedby'),
    ).toBe(false);
    root.innerHTML = String(
      <SearchField id="collapsed" label="Find" collapsible resultText="" />,
    );
    expect(root.querySelector('.kui-search-field__result')).toBeNull();
    expect(root.querySelector('.kui-search-field__result-live')).toBeNull();
  });

  it('announces the readout once it settles, through renders that keep the live text', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    document.body.append(root);
    const result = signal('');
    const query = signal('');
    const stopMount = mount(root, () => (
      <SearchField
        id="find"
        label="Find"
        query={query.value}
        resultText={result.value}
      />
    ));
    const stop = wireSearchFields(root, { collapsible: false });
    const live = () =>
      root.querySelector<HTMLElement>('.kui-search-field__result-live')!;

    // Typing: each keystroke's readout restarts the quiet period.
    query.value = 'r';
    result.value = '1 of 40';
    await Promise.resolve();
    vi.advanceTimersByTime(SEARCH_RESULT_ANNOUNCE_DELAY - 100);
    query.value = 're';
    result.value = '1 of 12';
    await Promise.resolve();
    vi.advanceTimersByTime(SEARCH_RESULT_ANNOUNCE_DELAY - 100);
    expect(live().textContent).toBe('');
    vi.advanceTimersByTime(100);
    expect(live().textContent).toBe('1 of 12');

    // A render that changes something else keeps the announced text.
    query.value = 'rel';
    await Promise.resolve();
    expect(live().textContent).toBe('1 of 12');

    // Stepping to the next match announces the new position.
    result.value = '2 of 12';
    await Promise.resolve();
    vi.advanceTimersByTime(SEARCH_RESULT_ANNOUNCE_DELAY);
    expect(live().textContent).toBe('2 of 12');

    // A readout that settles back on the announced text says nothing new.
    result.value = '3 of 12';
    await Promise.resolve();
    result.value = '2 of 12';
    await Promise.resolve();
    const write = vi.spyOn(live(), 'textContent', 'set');
    vi.advanceTimersByTime(SEARCH_RESULT_ANNOUNCE_DELAY);
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();

    // An emptied field announces nothing, even if a readout lingers.
    root
      .querySelector<HTMLElement>('.kui-search-field')!
      .setAttribute('data-placeholder-visible', 'true');
    result.value = 'No matches';
    await Promise.resolve();
    vi.advanceTimersByTime(SEARCH_RESULT_ANNOUNCE_DELAY);
    expect(live().textContent).toBe('');

    // Disposal cancels a pending announcement.
    root
      .querySelector<HTMLElement>('.kui-search-field')!
      .setAttribute('data-placeholder-visible', 'false');
    result.value = '1 of 2';
    await Promise.resolve();
    stop();
    vi.advanceTimersByTime(SEARCH_RESULT_ANNOUNCE_DELAY);
    expect(live().textContent).toBe('');
    stopMount();
  });

  it('watches readouts that appear later and ignores fields without a live region', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    document.body.append(root);
    const stop = watchSearchFieldResults(root);

    // A field rendered after wiring, inside a container.
    const wrapper = document.createElement('section');
    wrapper.innerHTML = String(
      <SearchField id="late" label="Find" query="x" resultText="1 of 3" />,
    );
    root.append(wrapper);
    // A readout added directly to an existing field.
    const bare = document.createElement('div');
    bare.className = 'kui-search-field';
    root.append(bare);
    await Promise.resolve();
    const orphan = document.createElement('span');
    orphan.className = 'kui-search-field__result';
    orphan.textContent = 'No matches';
    bare.append(orphan);
    // Text outside any readout is not a result.
    root.append(document.createTextNode('unrelated'));
    await Promise.resolve();
    vi.advanceTimersByTime(SEARCH_RESULT_ANNOUNCE_DELAY);
    expect(
      root.querySelector('.kui-search-field__result-live')!.textContent,
    ).toBe('1 of 3');
    expect(bare.querySelector('.kui-search-field__result-live')).toBeNull();
    stop();
  });
});

import { describe, expect, it, vi } from 'vitest';

import {
  createTokenSearchModel,
  type TokenSearchState,
} from '../../src/components/forms/token-search-field/model/token-search-model.js';

const rules = [
  {
    name: 'tag',
    suggest: (input: string) =>
      ['client', 'design system'].filter((value) => value.startsWith(input)),
  },
  {
    name: 'is',
    parse: (input: string) =>
      ['open', 'closed'].includes(input.toLowerCase())
        ? input.toLowerCase()
        : undefined,
    suggest: (input: string) =>
      ['open', 'closed'].filter((value) => value.startsWith(input)),
  },
];

describe('createTokenSearchModel', () => {
  it('commits grammar tokens, preserves boolean text and offsets, and evaluates state', () => {
    const evaluate = vi.fn(({ query, tokens }: TokenSearchState) => ({
      query,
      filters: tokens.map((token) => [token.kind, token.parsedValue]),
    }));
    const model = createTokenSearchModel({ rules, evaluate });
    model.edit({ query: 'NOT tag:"design system" AND is:OPEN ', tokens: [] });
    expect(model.state.value).toMatchObject({
      query: 'NOT  AND ',
      tokens: [
        { kind: 'tag', parsedValue: 'design system', offset: 4 },
        { kind: 'is', parsedValue: 'open', offset: 9 },
      ],
    });
    expect(model.result.value).toEqual({
      query: 'NOT  AND ',
      filters: [
        ['tag', 'design system'],
        ['is', 'open'],
      ],
    });
    expect(evaluate).toHaveBeenCalledTimes(2);
  });

  it('leaves unfinished and invalid expressions as text until a valid commit', () => {
    const model = createTokenSearchModel({ rules });
    model.edit({ query: 'is:other ', tokens: [] });
    expect(model.state.value).toEqual({ query: 'is:other ', tokens: [] });
    model.edit({ query: 'is:open', tokens: [] });
    expect(model.state.value.tokens).toHaveLength(0);
    model.submit({ query: 'is:open', tokens: [] });
    expect(model.state.value).toMatchObject({
      query: '',
      tokens: [{ kind: 'is', value: 'is:open' }],
    });
  });

  it('suggests values, accepts a choice, removes, clears, and refills', () => {
    const onSubmit = vi.fn();
    const model = createTokenSearchModel({ rules, onSubmit });
    model.edit({ query: 'hello tag:cl', tokens: [] });
    expect(model.suggestions.value).toEqual([
      { value: 'tag:client', label: 'tag:client' },
    ]);
    model.choose('tag:client');
    expect(model.state.value).toMatchObject({
      query: 'hello ',
      tokens: [{ value: 'tag:client', offset: 6 }],
    });
    expect(model.suggestions.value).toEqual([]);
    model.remove('tag:client');
    expect(model.state.value.tokens).toEqual([]);
    model.edit({ query: 'tag:"design system" ', tokens: [] });
    expect(model.state.value.tokens[0]?.value).toBe('tag:"design system"');
    model.clear();
    expect(model.state.value).toEqual({ query: '', tokens: [] });
    model.submit({ query: 'refilled', tokens: [] });
    expect(onSubmit).toHaveBeenCalledWith(
      { query: 'refilled', tokens: [] },
      undefined,
    );
  });

  it('replaces DOM-owned text when clearing a query with no chips', () => {
    const model = createTokenSearchModel({ rules });
    model.edit({ query: 'plain text', tokens: [] });
    expect(model.editorRevision.value).toBe(0);
    model.clear();
    expect(model.editorRevision.value).toBe(1);
    expect(model.state.value).toEqual({ query: '', tokens: [] });
  });

  it('replaces programmatic search state and advances the editor revision even without chip changes', () => {
    const model = createTokenSearchModel({ rules });
    model.edit({ query: 'draft', tokens: [] });
    model.replace({ query: 'roadmap', tokens: [] });
    expect(model.state.value).toEqual({ query: 'roadmap', tokens: [] });
    expect(model.editorRevision.value).toBe(1);

    model.replace({ query: 'roadmap', tokens: [] });
    expect(model.editorRevision.value).toBe(2);
    model.replace({ query: 'tag:cl', tokens: [] });
    expect(model.state.value).toEqual({ query: 'tag:cl', tokens: [] });
    expect(model.suggestions.value).toEqual([
      { value: 'tag:client', label: 'tag:client' },
    ]);
    model.replace({ query: 'tag:client ', tokens: [] });
    expect(model.state.value).toMatchObject({
      query: '',
      tokens: [{ value: 'tag:client' }],
    });
    expect(model.editorRevision.value).toBe(4);
    model.clear();
    expect(model.editorRevision.value).toBe(5);
  });

  it('keeps existing chip positions correct when committing text around them', () => {
    const model = createTokenSearchModel({ rules });
    model.edit({
      query: 'tag:client before  after ',
      tokens: [{ value: 'is:open', label: 'is:open', offset: 18 }],
    });
    expect(model.state.value).toMatchObject({
      query: ' before  after ',
      tokens: [
        { value: 'tag:client', offset: 0 },
        { value: 'is:open', offset: 8 },
      ],
    });
  });

  it('expands a chip for editing, dismisses suggestions, and handles repeated empty/refill transitions', () => {
    const model = createTokenSearchModel({ rules });
    model.edit({ query: 'tag:client ', tokens: [] });
    model.expandToken('tag:client');
    expect(model.state.value).toEqual({ query: 'tag:client ', tokens: [] });
    expect(model.suggestions.value).toEqual([]);
    model.edit({ query: 'tag:cl', tokens: [] });
    expect(model.suggestions.value).toHaveLength(1);
    model.dismiss();
    expect(model.suggestions.value).toEqual([]);
    model.edit({ query: 'tag:cl', tokens: [] });
    expect(model.suggestions.value).toHaveLength(1);
    model.clear();
    model.remove('tag:client');
    model.choose('tag:client');
    expect(model.state.value).toEqual({ query: '', tokens: [] });
    model.edit({ query: 'is:closed ', tokens: [] });
    expect(model.state.value.tokens).toMatchObject([
      { value: 'is:closed', parsedValue: 'closed' },
    ]);
  });

  it('rejects ambiguous rule names', () => {
    expect(() =>
      createTokenSearchModel({ rules: [{ name: 'tag' }, { name: 'TAG' }] }),
    ).toThrow('unique words');
  });

  it('accepts an empty grammar and keeps ordinary text as text', () => {
    const model = createTokenSearchModel();
    model.edit({ query: 'plain words', tokens: [] }, true);
    expect(model.state.value).toEqual({ query: 'plain words', tokens: [] });
    expect(model.suggestions.value).toEqual([]);
  });

  it('rejects empty values and invalid suggestions without losing the active query', () => {
    const model = createTokenSearchModel({
      rules: [
        {
          name: 'is',
          parse: (input: string) => (input === 'open' ? input : undefined),
          suggest: () => ['open', 'closed'],
        },
      ],
    });
    model.edit({ query: 'is:', tokens: [] }, true);
    expect(model.state.value.tokens).toHaveLength(0);
    expect(model.suggestions.value).toEqual([
      { value: 'is:open', label: 'is:open' },
    ]);
    model.choose('is:closed');
    expect(model.state.value.query).toBe('is:');
    model.expandToken('missing');
    model.remove('missing');
    expect(model.state.value.tokens).toHaveLength(0);
  });

  it('expands a middle chip and shifts later offsets across an existing query', () => {
    const model = createTokenSearchModel({
      rules,
      initial: {
        query: 'one two',
        tokens: [
          { value: 'tag:client', label: 'Client', offset: 4 },
          { value: 'is:open', label: 'Open', offset: 7 },
        ],
      },
    });
    model.expandToken('tag:client');
    expect(model.state.value).toMatchObject({
      query: 'one tag:client two',
      tokens: [{ value: 'is:open', offset: 18 }],
    });
  });

  it('ignores empty saved tokens and invalid editor chips while retaining valid chips without offsets', () => {
    const model = createTokenSearchModel({
      rules,
      initial: { query: '', tokens: [{ value: 'tag:', label: 'Empty' }] },
    });
    expect(model.state.value.tokens).toEqual([]);
    model.edit({
      query: 'text',
      tokens: [
        { value: 'other:x', label: 'Unknown' },
        { value: 'tag:client', label: 'Client' },
      ],
    });
    expect(model.state.value.tokens).toMatchObject([
      { value: 'tag:client', offset: 4 },
    ]);
  });

  it('keeps a preceding chip in place when expanding the final chip', () => {
    const model = createTokenSearchModel({
      rules,
      initial: {
        query: 'text',
        tokens: [
          { value: 'tag:client', label: 'Client', offset: 0 },
          { value: 'is:open', label: 'Open', offset: 4 },
        ],
      },
    });
    model.expandToken('is:open');
    expect(model.state.value.tokens).toMatchObject([
      { value: 'tag:client', offset: 0 },
    ]);
    expect(model.state.value.query).toBe('textis:open ');
  });

  it('rehydrates saved valid tokens, skips invalid ones, and labels object suggestions', () => {
    const model = createTokenSearchModel({
      rules: [
        {
          name: 'tag',
          label: (value: string) => `Tag ${value}`,
          suggest: () => [{ value: 'client', label: 'Client account' }],
        },
      ],
      initial: {
        query: 'tag:',
        tokens: [
          { value: 'tag:design', label: 'Design', offset: 0 },
          { value: 'other:ignored', label: 'Ignored' },
        ],
      },
    });
    expect(model.state.value.tokens).toMatchObject([
      { value: 'tag:design', label: 'Design', parsedValue: 'design' },
    ]);
    expect(model.suggestions.value).toEqual([
      { value: 'tag:client', label: 'Client account' },
    ]);
    model.choose('tag:client');
    expect(model.state.value.tokens).toHaveLength(2);
  });

  it('passes committed tokens to suggestions after initial state and each transition', () => {
    const suggest = vi.fn((input: string, state: TokenSearchState) =>
      ['client', 'design'].filter(
        (value) =>
          value.startsWith(input) &&
          !state.tokens.some(
            (token) => token.kind === 'tag' && token.parsedValue === value,
          ),
      ),
    );
    const model = createTokenSearchModel({
      rules: [{ name: 'tag', suggest }],
      initial: {
        query: 'tag:c',
        tokens: [{ value: 'tag:client', label: 'Client', offset: 0 }],
      },
    });
    expect(model.suggestions.value).toEqual([]);
    expect(suggest).toHaveBeenLastCalledWith('c', model.state.value);

    model.remove('tag:client');
    expect(model.suggestions.value).toEqual([
      { value: 'tag:client', label: 'tag:client' },
    ]);
    model.choose('tag:client');
    expect(model.suggestions.value).toEqual([]);
    model.clear();
    model.edit({ query: 'tag:c', tokens: [] });
    expect(model.suggestions.value).toEqual([
      { value: 'tag:client', label: 'tag:client' },
    ]);
  });

  it('commits a computed value for the active prefix outside suggestions', () => {
    const model = createTokenSearchModel({ rules });
    model.commit('release');
    expect(model.state.value).toEqual({ query: '', tokens: [] });

    model.edit({ query: 'owner tag:rel', tokens: [] });
    expect(model.suggestions.value).toEqual([]);
    model.dismiss();
    model.commit('release');
    expect(model.state.value).toMatchObject({
      query: 'owner ',
      tokens: [{ kind: 'tag', value: 'tag:release', offset: 6 }],
    });

    model.edit({ query: 'is:other', tokens: model.state.value.tokens });
    model.commit('invalid');
    expect(model.state.value.query).toBe('is:other');
    model.commit('open');
    expect(model.state.value).toMatchObject({
      query: '',
      tokens: [
        { value: 'tag:release', offset: 6 },
        { value: 'is:open', parsedValue: 'open', offset: 0 },
      ],
    });
    model.clear();
    model.commit('release');
    expect(model.state.value).toEqual({ query: '', tokens: [] });
    model.edit({ query: 'tag:', tokens: [] });
    model.commit('design system');
    expect(model.state.value.tokens).toMatchObject([
      { value: 'tag:"design system"', parsedValue: 'design system', offset: 0 },
    ]);
  });
});

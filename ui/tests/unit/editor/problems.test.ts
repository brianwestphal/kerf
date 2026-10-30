import type { ViewDocument } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  nodeIdForPath,
  placementReason,
  problemCounts,
  problemsOf,
  readableMessage,
  variantFix,
} from '../../../src/editor/model/problems.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { propsByKey, viewCatalog } from './kerf-catalog.js';

const inbox = sample as unknown as ViewDocument;
const broken = (): ViewDocument => {
  const document = globalThis.structuredClone(inbox) as unknown as {
    root: {
      zones: {
        header: { zones: { trailing: { props: Record<string, unknown> }[] } }[];
      };
    };
    params: Record<string, unknown>;
  };
  document.root.zones.header[0]!.zones.trailing[0]!.props.tone = 'purple';
  document.params.bad = { type: { kind: 'map' } };
  return document as unknown as ViewDocument;
};

describe('nodeIdForPath', () => {
  it('maps a diagnostic path to the deepest node it passes through', () => {
    expect(
      nodeIdForPath(
        inbox,
        '$.root.zones.header[0].zones.trailing[0].props.tone',
      ),
    ).toBe('01JB8Z1M6Q8E1X9V4S7K2R3T5D');
    expect(
      nodeIdForPath(
        inbox,
        '$.root.zones.content[0].zones.children[0].template.props.label',
      ),
    ).toBe('01JB8Z1M6Q8E1X9V4S7K2R3T5F');
    expect(nodeIdForPath(inbox, '$.root.zones.content[1].then')).toBe(
      '01JB8Z1M6Q8E1X9V4S7K2R3T5G',
    );
    expect(nodeIdForPath(inbox, '$.root')).toBe('01JB8Z1M6Q8E1X9V4S7K2R3T5A');
  });

  it('returns nothing for document-level paths and stops at composed views', () => {
    expect(nodeIdForPath(inbox, '$.params.title.type')).toBeUndefined();
    expect(nodeIdForPath(inbox, '$.name')).toBeUndefined();
    expect(nodeIdForPath(inbox, '$.root.zones.missing[3].props')).toBe(
      '01JB8Z1M6Q8E1X9V4S7K2R3T5A',
    );
    expect(
      nodeIdForPath(
        inbox,
        '$.root.zones.header[0]{./child.kui.json}.root.type',
      ),
    ).toBe('01JB8Z1M6Q8E1X9V4S7K2R3T5B');
  });
});

describe('problemsOf and problemCounts', () => {
  it('attaches node ids where a problem has one and counts them per node', () => {
    const document = broken();
    const problems = problemsOf(
      document,
      validateView(document, viewCatalog).diagnostics,
    );
    expect(
      problems.map((problem) => [problem.diagnostic.code, problem.nodeId]),
    ).toEqual([
      ['KUI-V001', undefined],
      ['KUI-V004', '01JB8Z1M6Q8E1X9V4S7K2R3T5D'],
    ]);
    expect([...problemCounts(problems)]).toEqual([
      ['01JB8Z1M6Q8E1X9V4S7K2R3T5D', 1],
    ]);
  });
});

describe('variant problems (KF-TVZ06Y)', () => {
  const variantsOf = (type: string) =>
    (
      propsByKey.get(type) as
        { variants?: Parameters<typeof variantFix>[1] } | undefined
    )?.variants;
  const fix = (type: string, props: Record<string, unknown>, zones = {}) =>
    variantFix(
      { id: 'n', type: `@kerfjs/ui:${type}`, props, zones } as never,
      variantsOf(`@kerfjs/ui:${type}`)!,
    );

  it('says which props would match a variant', () => {
    expect(fix('text-field', {})).toBe('set "label" or "ariaLabel"');
    expect(
      variantFix(
        { id: 'n', type: '@kerfjs/ui:text-field' } as never,
        variantsOf('@kerfjs/ui:text-field')!,
      ),
    ).toBe('set "label" or "ariaLabel"');
    expect(fix('text-field', { label: 'A', ariaLabel: 'A' })).toBe(
      'remove "ariaLabel" or "label"',
    );
    // A Button's filled icon zone counts as set; an empty one does not.
    expect(
      fix(
        'button',
        {},
        { icon: [{ id: 'i', type: '@kerfjs/ui:lucide-icon' }], children: [] },
      ),
    ).toBe('set "children" or "ariaLabel"');
    // A mode prop left unset reads as its default, false.
    expect(fix('list-header', { label: 'Files', expanded: true })).toMatch(
      /remove "expanded"|set "toggle"/,
    );
    // A Button's icon zone counts as set.
    expect(fix('button', { ariaLabel: 'Close' })).toBe(
      'set "children" or "icon"',
    );
    expect(fix('list-header', { label: 'Files', toggle: true })).toBe(
      'set "toggle" to false',
    );
    // A bound mode prop may already pick a variant: nothing to say.
    expect(
      fix('list-header', { label: 'Files', toggle: { $param: 'open' } }),
    ).toBe('');
    expect(fix('slider', { label: 'Volume', ariaLabel: 'Volume' })).toBe(
      'set "id"; remove "ariaLabel"',
    );
  });

  it('appends the fix to the validator’s variant problem, and only there', () => {
    const document = {
      ...inbox,
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3TV1',
        type: '@kerfjs/ui:text-field',
        props: {},
      },
    } as unknown as ViewDocument;
    const { diagnostics } = validateView(document, viewCatalog);
    const [problem] = problemsOf(document, diagnostics, variantsOf);
    expect(problem!.diagnostic.message).toBe(
      '@kerfjs/ui:text-field props match none of its variants: set "label" or "ariaLabel"',
    );
    // Without variants, or for other problems, the message stays.
    expect(problemsOf(document, diagnostics)[0]!.diagnostic.message).toBe(
      diagnostics[0]!.message,
    );
    expect(
      problemsOf(
        broken(),
        validateView(broken(), viewCatalog).diagnostics,
        variantsOf,
      ).map((item) => item.diagnostic.message),
    ).toEqual(
      validateView(broken(), viewCatalog).diagnostics.map((d) => d.message),
    );
  });
});

describe('readable placement reasons (KF-6RYJ64)', () => {
  const names = new Map([
    ['@kerfjs/ui:toolbar', 'Toolbar'],
    ['@kerfjs/ui:toolbar-control-group', 'ToolbarControlGroup'],
  ]);
  it('writes component keys as names and parents as where it goes', () => {
    expect(
      readableMessage(
        '`@kerfjs/ui:toolbar-control-group` requires one of these cataloged parents: @kerfjs/ui:toolbar, @acme/x:panel',
        names,
      ),
    ).toBe('ToolbarControlGroup goes in Toolbar or @acme/x:panel');
    expect(readableMessage('plain words', names)).toBe('plain words');
  });

  it('prefers a problem about the placed node, else the first, else none', () => {
    const at = (path: string, message: string) =>
      ({ code: 'KUI-L201', path, message, severity: 'error' }) as never;
    const document = inbox;
    const compose = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
    const path = '$.root.zones.header[0].zones.trailing[0]';
    expect(
      placementReason(
        document,
        [at('$.root', 'about the root'), at(path, 'about the button')],
        compose,
        names,
      ),
    ).toBe('about the button');
    expect(
      placementReason(
        document,
        [at('$.root', 'about the root')],
        compose,
        names,
      ),
    ).toBe('about the root');
    expect(placementReason(document, [], compose, names)).toBeUndefined();
  });
});

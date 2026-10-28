import type { ViewDocument } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  nodeIdForPath,
  problemCounts,
  problemsOf,
} from '../../../src/editor/model/problems.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { viewCatalog } from './kerf-catalog.js';

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

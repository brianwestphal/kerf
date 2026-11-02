// @vitest-environment node
// KF-JN4PF5: every ux-demo configuration the editor builds is saved as a
// sample (editor/samples/, written by the demo-builds browser spec). Each one
// must load in the editor: a view document that parses and validates against
// the editor's catalog with no diagnostics.
import { readdirSync, readFileSync } from 'node:fs';

import { validateView, type ViewDocument } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { kerfUiCatalog } from '../../src/catalog.js';
import { sampleName } from '../browser/sample-name.js';

const folder = new URL('../../samples/', import.meta.url);
const samples = readdirSync(folder).filter((file) =>
  file.endsWith('.kui.json'),
);

describe('editor build samples', () => {
  it('has a sample for each built configuration, and no other', () => {
    const spec = readFileSync(
      new URL('../browser/demo-builds.spec.ts', import.meta.url),
      'utf8',
    );
    const builds = [...spec.matchAll(/^test\(\s*'(builds [^']+)'/gm)].map(
      ([, title]) => sampleName(title!).file,
    );
    expect(builds.length).toBeGreaterThan(0);
    expect([...samples].sort()).toEqual([...builds].sort());
  });

  it.each(samples)('%s loads in the editor', (file) => {
    const document = JSON.parse(
      readFileSync(new URL(file, folder), 'utf8'),
    ) as ViewDocument;
    expect(document.schema).toBe('kerf-ui-document/v1');
    expect(
      validateView(document, kerfUiCatalog.viewCatalog).diagnostics,
    ).toEqual([]);
  });
});

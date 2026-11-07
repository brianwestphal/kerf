// The private editor app is a host of `@kerfjs/ui/editor` (KF-6GT5QY): its
// catalog is Kerf UI's, and its sample is a valid document in it.
import { describe, expect, it } from 'vitest';

import { kerfUiCatalog } from '../../src/catalog.js';
import { loadSample } from '../../src/sample.js';

describe('the private editor host', () => {
  it('gives the editor Kerf UI’s catalog and a valid sample', () => {
    expect(kerfUiCatalog.componentNames.get('@kerfjs/ui:button')).toBe(
      'Button',
    );
    expect(typeof kerfUiCatalog.components['@kerfjs/ui:button']).toBe(
      'function',
    );
    expect(() => loadSample(kerfUiCatalog.viewCatalog)).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';

import { Toolbar } from '../../src/components/actions/toolbar/toolbar.js';

describe('Toolbar position semantics', () => {
  it('uses header by default and footer on request with identical zones', () => {
    const props = { label: 'Commands', leading: <button>Run</button> };
    const header = String(Toolbar(props));
    const footer = String(Toolbar({ ...props, position: 'footer' }));

    expect(header).toMatch(/^<header class="kui-toolbar"/);
    expect(footer).toMatch(/^<footer class="kui-toolbar"/);
    expect(footer).toContain('aria-label="Commands"');
    expect(footer).toContain(
      '<div class="kui-toolbar__leading"><button>Run</button></div>',
    );
    expect(footer.replaceAll('footer', 'header')).toBe(header);
  });
});

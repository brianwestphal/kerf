import { describe, expect, it } from 'vitest';

// The build script is JavaScript because it runs directly under Node.
// @ts-expect-error no declaration file is needed for this build-only module
import { buildLibraryPage } from '../../scripts/build-design-templates.mjs';

describe('design template library composition', () => {
  it('builds an HTML sheet that references individual variant SVGs', () => {
    const page = buildLibraryPage(
      'sample-component',
      [
        { id: 'default', label: 'Default & ready', width: 320, height: 80 },
        { id: 'compact', label: 'Compact <mode>', width: 240, height: 48 },
      ],
      {
        suffix: '-dark',
        libraryBackground: '#1c1c1e',
        captionColor: '#aeaeb2',
      },
    );

    expect(page.width).toBe(352);
    expect(page.height).toBe(220);
    expect(page.html).toContain(
      '<img src="./sample-component/default-dark.svg" width="320" height="80" alt="">',
    );
    expect(page.html).toContain(
      '<img src="./sample-component/compact-dark.svg" width="240" height="48" alt="">',
    );
    expect(page.html).toContain('Default &amp; ready');
    expect(page.html).toContain('Compact &lt;mode&gt;');
    expect(page.html).not.toContain('<svg');
  });
});

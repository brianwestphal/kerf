import { describe, expect, it } from 'vitest';

import { libraryDocumentIcon } from '../../../src/editor/model/library-document-icon.js';
import { libraryDocumentTree } from '../../../src/editor/model/library-document-tree.js';

describe('Library document icons', () => {
  it.each([
    ['view.kui.json', 'file-braces-corner'],
    ['APP.TSX', 'file-code-corner'],
    ['README.md', 'file-text'],
    ['photo.PNG', 'file-image'],
    ['voice.wav', 'file-headphone'],
    ['movie.mp4', 'file-play'],
    ['backup.tar.gz', 'file-archive'],
    ['rows.csv', 'file-spreadsheet'],
    ['unknown.xyz', 'file'],
    ['LICENSE', 'file'],
  ])('chooses the extension category for %s', (path, name) => {
    const host = document.createElement('div');
    host.innerHTML = String(libraryDocumentIcon(path));
    expect(host.querySelector('svg')?.getAttribute('data-lucide')).toBe(name);
    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('provides folder and file icons to both hierarchy consumers', () => {
    const [folder] = libraryDocumentTree(['views/example.kui.json']);
    expect(String(folder!.icon)).toContain('data-lucide="folder"');
    expect(String(folder!.children![0]!.icon)).toContain(
      'data-lucide="file-braces-corner"',
    );
  });
});

import { describe, expect, it } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { renderDocument } from '../../src/renderDocument.js';

describe('renderDocument()', () => {
  it('prepends <!DOCTYPE html> to a SafeHtml document', () => {
    const page = jsx('html', { children: jsx('body', { children: 'hi' }) });
    expect(renderDocument(page)).toBe('<!DOCTYPE html><html><body>hi</body></html>');
  });

  it('accepts a raw string too', () => {
    expect(renderDocument('<html></html>')).toBe('<!DOCTYPE html><html></html>');
  });

  it('honors a custom doctype', () => {
    expect(renderDocument('<svg/>', { doctype: 'svg PUBLIC "-//W3C//DTD SVG 1.1//EN"' })).toBe(
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"><svg/>',
    );
  });
});

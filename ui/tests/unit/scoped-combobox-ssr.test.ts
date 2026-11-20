// @vitest-environment node
import { expect, it } from 'vitest';

import { createComboboxOwner } from '../../docs/examples/scoped-combobox.js';

it('renders escaped, request-local seeds before a document or host exists', () => {
  expect(typeof document).toBe('undefined');
  const render = (seed: string) => {
    const owner = createComboboxOwner();
    const field = owner.field({ id: 'tag', initialValue: seed, onCommit() {} });
    const html = String(field.render({ label: 'Tag', suggestions: [] }));
    owner.dispose();
    return html;
  };
  expect(render('a"<b')).toContain('value="a&quot;&lt;b"');
  expect(render('second request')).toContain('value="second request"');
});

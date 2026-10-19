import { describe, expect, it } from 'vitest';

import { ValuePreview } from '../../src/components/data-display/value-preview/value-preview.js';
import { type CssLength, px } from '../../src/shared/styles/css-values.js';

describe('ValuePreview', () => {
  it('keeps literal plain-text value and an accessible keyboard scroll target', () => {
    const html = String(
      ValuePreview({
        label: 'Remote Version',
        value: 'First line\nSecond <line> & more',
        id: 'remote-version',
      }),
    );
    const host = document.createElement('div');
    host.innerHTML = html;
    const output = host.querySelector('output')!;
    expect(output.textContent).toBe('First line\nSecond <line> & more');
    expect(output.querySelector('line')).toBeNull();
    expect(output.getAttribute('aria-label')).toBe('Remote Version');
    expect(output.tabIndex).toBe(0);
    expect(output.id).toBe('remote-version');
    expect(output.dataset.component).toBe('value-preview');
  });

  it('leaves an empty value empty and only applies typed bound overrides when supplied', () => {
    const plain = String(ValuePreview({ label: 'Empty Version', value: '' }));
    expect(plain).not.toContain('style=');
    expect(plain).toContain('></output>');
    const bounded = String(
      ValuePreview({
        label: 'Local Version',
        value: 'Change',
        minHeight: px(64),
        maxHeight: px(160),
        className: 'local-value',
        slot: 'version',
      }),
    );
    expect(bounded).toContain('class="kui-value-preview local-value"');
    expect(bounded).toContain(
      'style="--_kui-value-preview-min-height:64px;--_kui-value-preview-max-height:160px"',
    );
    expect(bounded).toContain('slot="version"');
  });

  it('rejects runtime length values that inject another CSS declaration', () => {
    expect(() =>
      ValuePreview({
        label: 'Version',
        value: 'Text',
        minHeight: '48px;color:red' as CssLength,
      }),
    ).toThrow('ValuePreview minHeight requires one CSS length.');
    expect(() =>
      ValuePreview({
        label: 'Version',
        value: 'Text',
        maxHeight: '96\npx' as CssLength,
      }),
    ).toThrow('ValuePreview maxHeight requires one CSS length.');
  });
});

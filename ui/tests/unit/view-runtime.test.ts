import { raw, type SafeHtml } from 'kerfjs';
import { describe, expect, it, vi } from 'vitest';

import { kuiComponent } from '../../src/view-runtime/kui-component.js';

describe('generated component runtime boundary', () => {
  it('defers evaluation until props arrive and returns the exact SafeHtml instance', () => {
    const output: SafeHtml = raw('<strong>Ready</strong>');
    const component = vi.fn((_props: { label: string }) => output);
    const render = kuiComponent(component);
    expect(component).not.toHaveBeenCalled();
    const props = { label: 'Ready' };
    expect(render(props)).toBe(output);
    expect(component).toHaveBeenCalledExactlyOnceWith(props);
  });
});

import { Trophy } from 'lucide';
import { describe, expect, it } from 'vitest';

import {
  Chip,
  type ChipProps,
} from '../../src/components/feedback/chip/chip.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';

describe('Chip icon and truncation', () => {
  it('renders a decorative leading icon and retains the full label as a title', () => {
    const html = String(
      Chip({
        children: 'Acme & Sons "International"',
        icon: LucideIcon({ icon: Trophy, name: 'trophy' }),
        truncate: true,
        tone: 'success',
      }),
    );
    expect(html).toContain('data-truncate=""');
    expect(html).toContain('class="kui-chip__icon" aria-hidden="true"');
    expect(html).toContain('data-lucide="trophy"');
    expect(html).toContain('title="Acme &amp; Sons &quot;International&quot;"');
    expect(html).not.toContain('kui-chip__remove');
  });

  it('keeps ordinary and removable chip markup when truncation is omitted', () => {
    const ordinary = String(Chip({ children: 'Ready' }));
    expect(ordinary).not.toContain('data-truncate');
    expect(ordinary).not.toContain('title=');
    const removable = String(
      Chip({
        children: 'Ready',
        truncate: true,
        removeAction: 'remove-chip',
        removeLabel: 'Remove Ready',
      }),
    );
    expect(removable).toContain('data-action="remove-chip"');
    expect(removable).toContain('aria-label="Remove Ready"');
  });

  it('rejects rich markup truncation from JavaScript callers', () => {
    expect(() =>
      Chip({
        children: <strong>Rich label</strong>,
        truncate: true,
      } as unknown as ChipProps),
    ).toThrow(TypeError);
  });
});

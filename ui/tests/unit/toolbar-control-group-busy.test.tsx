import { Circle } from 'lucide';
import { describe, expect, it } from 'vitest';

import { LucideIcon } from '../../src/lucide-icon.js';
import { ToolbarControlGroup } from '../../src/toolbar-control-group.js';

const button = (
  <button type="button" aria-label="Run check" data-action="run-check">
    <LucideIcon icon={Circle} name="circle" />
  </button>
);

describe('ToolbarControlGroup busy state', () => {
  it('preserves the action in its original slot and blocks it while announcing work', () => {
    const idle = String(
      ToolbarControlGroup({ children: button, single: true }),
    );
    const busy = String(
      ToolbarControlGroup({
        children: button,
        single: true,
        busy: true,
        busyLabel: 'Running check',
      }),
    );

    expect(idle).not.toContain(' inert');
    expect(idle).not.toContain('kui-toolbar-control-group__busy-spinner');
    expect(busy).toContain('data-busy="true"');
    expect(busy).toContain('aria-busy="true" inert');
    expect(busy).toContain('data-action="run-check"');
    expect(busy).toContain('data-component="loading-spinner"');
    expect(busy).toContain('role="status">Running check</span>');
  });
});

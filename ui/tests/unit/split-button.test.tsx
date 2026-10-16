import { describe, expect, it } from 'vitest';

import { SplitButton } from '../../src/components/actions/split-button/split-button.js';

describe('SplitButton', () => {
  it('renders two native buttons in a group on the brand fill by default', () => {
    const html = String(
      SplitButton({
        label: 'Deploy',
        action: 'deploy',
        optionsLabel: 'Deploy Options',
        optionsAction: 'deploy-options',
      }),
    );
    expect(html).toContain(
      '<div class="kui-split-button" data-component="split-button" data-tone="brand" role="group">',
    );
    expect(html).toContain(
      '<button type="button" class="kui-split-button__primary" data-action="deploy"><span class="kui-split-button__label">Deploy</span></button>',
    );
    expect(html).toContain(
      'class="kui-split-button__options" data-action="deploy-options" aria-label="Deploy Options" aria-haspopup="menu" aria-expanded="false" title="Deploy Options">',
    );
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('aria-busy');
  });

  it('reflects tone, fill, busy, expanded, controls, disabled halves, and metadata', () => {
    const html = String(
      SplitButton({
        label: 'Codex Running',
        accessibleLabel: 'Codex workflow is running',
        action: 'drive',
        icon: <svg />,
        optionsLabel: 'Choose provider',
        optionsAction: 'drive-options',
        optionsExpanded: true,
        optionsPopup: 'dialog',
        optionsControls: 'drive-menu',
        tone: 'neutral',
        fill: true,
        busy: true,
        disabled: true,
        optionsDisabled: true,
        title: 'Already running',
        className: 'drive',
        slot: 'footer',
        rootAttributes: {
          'data-workflow': 'drive',
          'data-tone': 'danger',
        } as unknown as Record<`data-${string}`, string>,
      }),
    );
    expect(html).toContain('data-workflow="drive"');
    expect(html).toContain(
      'class="kui-split-button drive" data-component="split-button" data-tone="neutral" data-fill="true" data-busy="true" role="group" slot="footer"',
    );
    expect(html).toContain(
      'aria-label="Codex workflow is running" aria-busy="true" title="Already running" disabled>',
    );
    // A busy primary shows the spinner instead of its icon.
    expect(html).toContain('kui-loading-spinner');
    expect(html).not.toContain('<svg></svg>');
    expect(html).toContain(
      'aria-haspopup="dialog" aria-expanded="true" aria-controls="drive-menu" title="Choose provider" disabled>',
    );
  });

  it('shows the icon when idle', () => {
    expect(
      String(
        SplitButton({
          label: 'Drive',
          action: 'drive',
          icon: <svg />,
          optionsLabel: 'Options',
          optionsAction: 'options',
        }),
      ),
    ).toContain(
      '<span class="kui-split-button__icon" aria-hidden="true"><svg></svg></span>',
    );
  });

  it('marks the pill shape on the group and leaves the default rounded unmarked', () => {
    const base = {
      label: 'Deploy',
      action: 'deploy',
      optionsLabel: 'Deploy Options',
      optionsAction: 'deploy-options',
    };
    expect(String(SplitButton({ ...base, shape: 'pill' }))).toContain(
      '<div class="kui-split-button" data-component="split-button" data-tone="brand" data-shape="pill" role="group">',
    );
    expect(String(SplitButton({ ...base, shape: 'rounded' }))).not.toContain(
      'data-shape',
    );
    expect(String(SplitButton(base))).not.toContain('data-shape');
  });

  it('keeps data-shape protected from rootAttributes', () => {
    const html = String(
      SplitButton({
        label: 'Deploy',
        action: 'deploy',
        optionsLabel: 'Deploy Options',
        optionsAction: 'deploy-options',
        rootAttributes: { 'data-shape': 'pill' } as unknown as Record<
          `data-${string}`,
          string
        >,
      }),
    );
    expect(html).not.toContain('data-shape');
  });
});

import { PanelHeader } from '@kerfjs/ui/panel-header';

import { button } from './state.js';

export function LayoutDemo() {
  return (
    <div class="demo-layout kui-pane" data-demo="layout">
      <PanelHeader
        title="Semantic layout"
        titleId="layout-title"
        actions={button('New item', 'log-add')}
      />
      <section class="kui-pane__content kui-content">
        <div class="demo-layout__surface kui-content-item">
          <strong>One owner per item</strong>
          <p>
            Each content child owns its margin, border, background, padding, and
            radius.
          </p>
        </div>
        <div class="demo-layout__actions kui-control-cluster">
          {button('Primary action', 'log-add')}
          {button('Secondary action', 'log-more')}
        </div>
        <div class="kui-inline-metadata kui-content-item">
          <span>24px major rhythm</span>
          <span>·</span>
          <span>8px internal rhythm</span>
        </div>
      </section>
    </div>
  );
}

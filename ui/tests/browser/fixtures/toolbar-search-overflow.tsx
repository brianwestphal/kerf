import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/token-search-field.css';

import { TokenSearchField } from '@kerfjs/ui/token-search-field';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields';
import { mount, signal } from 'kerfjs';

const open = signal(false);
const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
mount(root, () => (
  <main style="max-width:480px;padding:16px">
    <ToolbarControlGroup
      content="search"
      expanded={open.value}
      single={!open.value}
      expandedOverflow="visible"
    >
      <TokenSearchField
        id="search-anchor"
        label="Search views"
        presentation="toolbar-group"
        collapsible
        expanded={open.value}
        expandLabel="Open search"
      />
      {open.value ? (
        <section
          data-test-search-surface
          data-token-search-keep-open
          aria-label="Choose updated date"
          style="position:absolute;inset-block-start:calc(100% + 8px);inset-inline-start:0;width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--kui-color-neutral-border-normal);border-radius:12px;background:var(--kui-color-surface);color:var(--kui-color-text);z-index:10"
        >
          <strong>Updated before</strong>
          <button
            type="button"
            data-choose-date
            style="display:block;width:100%;padding:8px;margin-top:4px;border:0;border-radius:8px;background:var(--kui-color-neutral-fill-quiet);color:inherit;font:inherit"
          >
            Choose October 5
          </button>
        </section>
      ) : null}
    </ToolbarControlGroup>
  </main>
));
wireTokenSearchFields(root, {
  collapsible: { signals: { 'search-anchor': open } },
});
root.addEventListener('click', (event) => {
  if ((event.target as Element).closest('[data-choose-date]'))
    root.querySelector<HTMLElement>(
      '[data-test-search-surface]',
    )!.dataset.clicked = 'true';
});

import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { SplitView } from '@kerfjs/ui/split-view';

const pane = (title: string, detail: string) => (
  <div class="demo-split-view__pane kui-content">
    <div class="kui-content-item">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  </div>
);

export function SplitViewDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'split-view' }}>
      <CatalogExample
        label="Roomy list-detail split"
        note="The public list-width token controls the fixed primary pane; each pane owns its internal content geometry."
        align="none"
      >
        <SplitView
          id="catalog-split-view-roomy"
          label="Messages"
          className="demo-split-view demo-split-view--roomy"
          listTitle="Threads"
          detailTitle="Message"
          list={pane('Threads', 'Project update · Design review · Launch plan')}
          detail={pane(
            'Project update',
            'The selected message fills the remaining space.',
          )}
        />
      </CatalogExample>
      <CatalogExample
        label="Compact detail"
        note="On compact device classes the app supplies one controlled navigation stack instead of squeezing both panes."
        align="none"
      >
        <SplitView
          id="catalog-split-view-compact"
          label="Messages"
          className="demo-split-view demo-split-view--compact"
          compact
          detailActive
          listTitle="Threads"
          detailTitle="Project update"
          list={pane('Threads', 'Choose a message')}
          detail={pane('Project update', 'Compact detail content')}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

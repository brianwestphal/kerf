import '@kerfjs/ui/nav-stack.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { signal } from 'kerfjs';

const rootView = (): NavStackView => ({
  key: 'library',
  title: 'Library',
  content: (
    <div class="kui-content">
      <div class="kui-content-item">
        <strong>Saved projects</strong>
        <span>Choose an item to push its detail view.</span>
      </div>
    </div>
  ),
});

const detailView = (): NavStackView => ({
  key: 'project-atlas',
  title: 'Project Atlas',
  content: (
    <div class="kui-content">
      <div class="kui-content-item">
        <strong>Project Atlas</strong>
        <span>The previous view remains mounted beneath this detail.</span>
      </div>
    </div>
  ),
});

const demoViews = signal<NavStackView[]>([rootView(), detailView()]);

export function resetNavStackDemo(): void {
  demoViews.value = [rootView(), detailView()];
}

export function popNavStackDemo(): void {
  if (demoViews.value.length > 1)
    demoViews.value = demoViews.value.slice(0, -1);
}

export function NavStackDemo() {
  return (
    <CatalogExampleStack
      label="Navigation stack states"
      rootAttributes={{ 'data-demo': 'nav-stack' }}
    >
      <CatalogExample
        label="Pushed detail"
        note="The app owns the ordered view array; the public wire helper animates the controlled pop and restores the root view."
      >
        <NavStack
          id="catalog-nav-stack"
          label="Project library"
          className="demo-nav-stack"
          views={demoViews.value}
          backLabel="Back to library"
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

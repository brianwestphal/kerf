import {
  Catalog,
  CatalogExample,
  CatalogExampleStack,
  type CatalogSection,
} from '@kerfjs/ui/catalog';
import { ListItem } from '@kerfjs/ui/list-item';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { mount, raw, type SafeHtml } from 'kerfjs';

export type CatalogAuthoringFixtureMode = 'component' | 'composition';

const sections: CatalogSection[] = [
  {
    category: 'Fixture',
    entries: [
      { id: 'status', name: 'Status banner' },
      { id: 'workspace', name: 'Workspace composition' },
    ],
  },
];

function FocusedPreview(): SafeHtml {
  return CatalogExampleStack({
    label: 'Status banner states',
    rootAttributes: { 'data-demo': 'status' },
    children: [
      CatalogExample({
        label: 'Default',
        children: StateBanner({ tone: 'info', title: 'Connected' }),
      }),
      CatalogExample({
        label: 'Authoring note',
        note: 'Explanatory chrome is excluded from geometry inspection.',
        rootAttributes: { 'data-catalog-geometry-overlay-skip': '' },
        children: raw(
          '<p data-fixture-explanation>The application owns status copy.</p>',
        ),
      }),
    ],
  });
}

function CompositionPreview(): SafeHtml {
  return CatalogExampleStack({
    label: 'Workspace composition',
    rootAttributes: { 'data-demo': 'workspace' },
    children: CatalogExample({
      label: 'Complete composition',
      children: [
        StateBanner({ tone: 'neutral', title: 'Workspace ready' }),
        ListItem({ action: 'open-inbox', label: 'Inbox' }),
      ],
    }),
  });
}

/** Downstream-style fixture authored only from the published Catalog contract. */
export interface CatalogAuthoringConsumerProps {
  mode: CatalogAuthoringFixtureMode;
}

export function CatalogAuthoringConsumer({
  mode,
}: CatalogAuthoringConsumerProps): SafeHtml {
  return Catalog({
    brand: { title: 'Consumer catalog' },
    sections,
    active: mode === 'component' ? 'status' : 'workspace',
    geometryOverlay: mode === 'component',
    content: mode === 'component' ? FocusedPreview() : CompositionPreview(),
  });
}

const fixtureRoot = document.querySelector<HTMLElement>(
  '[data-catalog-authoring-fixture]',
);
if (fixtureRoot) {
  const mode =
    fixtureRoot.dataset.mode === 'composition' ? 'composition' : 'component';
  mount(fixtureRoot, () => CatalogAuthoringConsumer({ mode }));
}

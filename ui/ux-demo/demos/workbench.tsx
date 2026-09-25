import '@kerfjs/ui/workbench.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Workbench } from '@kerfjs/ui/workbench';

import { DemoContentItem } from './demo-content-item.js';

const region = (title: string, detail: string) => (
  <div class="kui-content">
    <DemoContentItem title={title} detail={detail} />
  </div>
);

export function WorkbenchDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'workbench' }}>
      <CatalogExample
        label="Full desktop workspace"
        note="The shell owns panel tracks and separators; each region owns its content and scroll behavior."
        align="none"
        compactFallback="Workbench is a desktop-class shell. Use focused navigation and overlays instead at this viewport width."
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'tall',
          frame: 'solid',
          surface: 'lowered',
          responsive: 'roomy-only',
        }}
      >
        <Workbench
          id="catalog-workbench-full"
          label="Project workbench"
          leftRail={{
            label: 'Navigator',
            content: region('Navigator', 'Files and symbols'),
          }}
          main={region(
            'Editor',
            'The central work area expands into free space.',
          )}
          rightRail={{
            label: 'Inspector',
            content: region('Inspector', 'Selection details'),
          }}
          bottomDrawer={{
            label: 'Console',
            content: region('Console', 'Build output and diagnostics'),
          }}
        />
      </CatalogExample>
      <CatalogExample
        label="Controlled collapsed panels"
        note="Collapsed tracks snap to zero while their fixed-size content slides out."
        align="none"
        compactFallback="Collapsed tracks preserve desktop workspace state; they are not a compact-layout substitute."
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'reduced',
          frame: 'solid',
          surface: 'lowered',
          responsive: 'roomy-only',
        }}
      >
        <Workbench
          id="catalog-workbench-collapsed"
          label="Focused editor workbench"
          leftRail={{
            label: 'Navigator',
            content: region('Navigator', 'Still mounted'),
            collapsed: true,
          }}
          main={region('Editor', 'The app owns every collapsed flag.')}
          rightRail={{
            label: 'Inspector',
            content: region('Inspector', 'Visible peripheral panel'),
          }}
          bottomDrawer={{
            label: 'Console',
            content: region('Console', 'Still mounted'),
            collapsed: true,
            separator: 'hidden',
            collapseMotion: 'fade-slide',
            contentOverflow: 'visible',
            restoreControl: (
              <button type="button" aria-label="Show collapsed console">
                Show console
              </button>
            ),
          }}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

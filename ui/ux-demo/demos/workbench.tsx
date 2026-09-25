import './workbench.css';
import '@kerfjs/ui/workbench.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Workbench } from '@kerfjs/ui/workbench';

const region = (title: string, detail: string, main = false) => (
  <div
    class={`demo-workbench__region${main ? ' demo-workbench__region--main' : ''}`}
  >
    <strong>{title}</strong>
    <span class="demo-workbench__region-detail">{detail}</span>
  </div>
);

export function WorkbenchDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'workbench' }}>
      <CatalogExample
        label="Full desktop workspace"
        note="The shell owns panel tracks and separators; each region owns its content and scroll behavior."
        align="none"
      >
        <p class="demo-workbench__compact-guidance">
          Workbench is a desktop-class shell. Use focused navigation and
          overlays instead at this viewport width.
        </p>
        <div class="demo-workbench">
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
              true,
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
        </div>
      </CatalogExample>
      <CatalogExample
        label="Controlled collapsed panels"
        note="Collapsed tracks snap to zero while their fixed-size content slides out."
        align="none"
      >
        <p class="demo-workbench__compact-guidance">
          Collapsed tracks preserve desktop workspace state; they are not a
          compact-layout substitute.
        </p>
        <div class="demo-workbench demo-workbench--compact">
          <Workbench
            id="catalog-workbench-collapsed"
            label="Focused editor workbench"
            leftRail={{
              label: 'Navigator',
              content: region('Navigator', 'Still mounted'),
              collapsed: true,
            }}
            main={region('Editor', 'The app owns every collapsed flag.', true)}
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
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

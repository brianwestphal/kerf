import './sunken-prototype.css';

import { Pane } from '@kerfjs/ui/pane';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';

const prototypeBackdrops = [
  ['default', 'Default'],
  ['lowered', 'Lowered'],
  ['warm', 'Warm'],
  ['textured', 'Textured'],
] as const;

/** Opt-in research specimen; production component defaults remain opaque. */
export function SunkenPrototype() {
  return (
    <div class="demo-sunken-prototype" data-sunken-prototype>
      {prototypeBackdrops.map(([id, name]) => (
        <div class="demo-sunken-prototype__backdrop" data-backdrop={id}>
          <strong>{name} backdrop</strong>
          <div class="demo-sunken-prototype__first">
            <SunkenPanel ariaLabel={`${name} first layer`}>
              <span>First layer</span>
              <div class="demo-sunken-prototype__second">
                <SunkenPanel>
                  <span>Second layer</span>
                  <div class="demo-sunken-prototype__third">
                    <SunkenPanel>
                      <button type="button">Third level focus</button>
                    </SunkenPanel>
                  </div>
                </SunkenPanel>
              </div>
            </SunkenPanel>
          </div>
          <div class="demo-sunken-prototype__first demo-sunken-prototype__pane">
            <Pane
              appearance="sunken"
              label={`${name} Pane layer`}
              header={<strong>Pane header</strong>}
            >
              <div class="demo-sunken-prototype__second">
                <SunkenPanel>
                  <span>Pane content layer</span>
                </SunkenPanel>
              </div>
            </Pane>
          </div>
          <div class="demo-sunken-prototype__first">
            <wa-card appearance="sunken">
              <div>Web Awesome card</div>
              <div class="demo-sunken-prototype__second">
                <wa-details appearance="sunken" summary="Nested details" open>
                  Second layer content
                </wa-details>
              </div>
            </wa-card>
          </div>
        </div>
      ))}
    </div>
  );
}

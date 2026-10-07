import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/workbench.css';
import '@kerfjs/ui/pane.css';

import { Pane } from '@kerfjs/ui/pane';
import { Workbench } from '@kerfjs/ui/workbench';
import { mount } from 'kerfjs';

const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
mount(root, () => (
  <Workbench
    id="quotes-workbench"
    label="Quotes workspace"
    mainLabel="Quotes"
    mainTabIndex={0}
    mainOutlined
    main={
      <Pane
        label="Quotes pane"
        appearance="sunken"
        deepInset
        outlined
        tabIndex={0}
        contentLabel="Quotes content"
      >
        <div class="edge-list">
          <div class="edge-matrix" data-edge-matrix>
            <div class="edge-matrix__wide">
              <button type="button" data-edge-cell>
                Select quote
              </button>
              <select aria-label="Quote status" data-edge-select>
                <option>Open</option>
                <option>Approved</option>
              </select>
            </div>
          </div>
          <div class="edge-matrix__filler">More quotes below</div>
        </div>
      </Pane>
    }
  />
));

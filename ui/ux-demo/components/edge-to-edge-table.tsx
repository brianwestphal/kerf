import './edge-to-edge-table.css';

import { ContentItem } from '@kerfjs/ui/content-item';
import { Pane } from '@kerfjs/ui/pane';

/** App-owned table specimen showing how a Pane child uses its resolved inset. */
export function EdgeToEdgeTable({ deepInset }: { deepInset: boolean }) {
  return (
    <Pane
      label={deepInset ? 'Inset procurement table' : 'Plain procurement table'}
      deepInset={deepInset}
      rootAttributes={{ 'data-edge-table': deepInset ? 'deep' : 'plain' }}
    >
      <ContentItem>
        <span data-edge-table-reference>Purchase orders</span>
      </ContentItem>
      <div class="edge-to-edge-table" data-edge-table-bleed>
        <table>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Office equipment</td>
              <td>$2,480</td>
            </tr>
            <tr>
              <td>Workshop supplies</td>
              <td>$760</td>
            </tr>
            <tr>
              <td>Freight service</td>
              <td>$1,120</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Pane>
  );
}

import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/row.css';
import '@kerfjs/ui/grid.css';

import { Grid } from '@kerfjs/ui/grid';
import { List } from '@kerfjs/ui/list';
import { Row } from '@kerfjs/ui/row';
import { mount } from 'kerfjs';

/**
 * Nested List, Row, and Grid instances where the outer instance sets `gap` and
 * `flex` and the inner one omits both. The inner instance must resolve its own
 * defaults rather than inherit the outer instance's private variables.
 */
const cell = (label: string) => <div data-cell>{label}</div>;

const view = () => (
  <div data-nested-root style="display:flex;flex-direction:column;height:600px">
    <List gap="l" flex rootAttributes={{ 'data-case': 'list-outer' }}>
      <List rootAttributes={{ 'data-case': 'list-inner' }}>
        {cell('a')}
        {cell('b')}
      </List>
    </List>
    <Row gap="l" flex rootAttributes={{ 'data-case': 'row-outer' }}>
      <Row rootAttributes={{ 'data-case': 'row-inner' }}>
        {cell('a')}
        {cell('b')}
      </Row>
    </Row>
    <Grid
      columns={1}
      gap="l"
      flex
      rootAttributes={{ 'data-case': 'grid-outer' }}
    >
      <Grid columns={2} rootAttributes={{ 'data-case': 'grid-inner' }}>
        {cell('a')}
        {cell('b')}
      </Grid>
    </Grid>
    <List gap="l" flex rootAttributes={{ 'data-case': 'list-in-row-outer' }}>
      <Row gap="m" flex rootAttributes={{ 'data-case': 'row-in-list' }}>
        <List rootAttributes={{ 'data-case': 'list-in-row-inner' }}>
          {cell('a')}
          {cell('b')}
        </List>
      </Row>
    </List>
  </div>
);

const root = document.querySelector<HTMLElement>('[data-nested-host]');
if (root) mount(root, view);

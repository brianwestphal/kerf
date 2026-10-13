import { List } from '@kerfjs/ui/list';
import { Pane } from '@kerfjs/ui/pane';
import { Text } from '@kerfjs/ui/text';

// App-owned regions with translucent chrome laid over both block edges of a
// scroll owner. Overlaying chrome publishes how far it covers each edge
// through the inherited `--kui-scroll-clearance-block-*` context; a List or
// Pane that opts in with `scrollClearance` clears it inside its own scroll
// area. The chrome itself is app markup, not a kerf component.
const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <Text>{`Message ${index + 1}`}</Text>
  ));

const region = (name: string, scroller: unknown) => (
  <section
    data-region={name}
    style="position:relative;display:grid;grid-template-rows:minmax(0,1fr);height:320px;width:320px;margin:16px;overflow:hidden;--kui-scroll-clearance-block-start:48px;--kui-scroll-clearance-block-end:64px"
  >
    {scroller}
    <div
      data-overlay="header"
      style="position:absolute;inset-inline:0;inset-block-start:0;height:48px;background:rgb(255 255 255 / 0.6);pointer-events:none"
    />
    <div
      data-overlay="footer"
      style="position:absolute;inset-inline:0;inset-block-end:0;height:64px;background:rgb(255 255 255 / 0.6);pointer-events:none"
    />
  </section>
);

document.querySelector('[data-app]')!.innerHTML = String(
  <>
    {region(
      'list-both',
      <List scrollable scrollClearance="both">
        {rows(30)}
      </List>,
    )}
    {region(
      'list-start',
      <List scrollable scrollClearance="block-start">
        {rows(30)}
      </List>,
    )}
    {region('list-none', <List scrollable>{rows(30)}</List>)}
    {region(
      'pane-both',
      <Pane scrollClearance="both" safeAreaEdges={[]}>
        {rows(30)}
      </Pane>,
    )}
  </>,
);

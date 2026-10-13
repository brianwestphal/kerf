import { ContentItem } from '@kerfjs/ui/content-item';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireScrollDividers } from '@kerfjs/ui/wire-scroll-dividers';

// A Pane whose header is laid over its scrolling content
// (`headerPresentation="overlay"`). `wireScrollDividers` measures the header
// and publishes its height as the block-start scroll clearance the content
// clears automatically; the unwired copy keeps its header docked.
const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <ContentItem>{`Message ${index + 1}`}</ContentItem>
  ));

const region = (name: string, wired: boolean) => (
  <section
    data-region={name}
    data-wired={String(wired)}
    style="display:grid;grid-template-rows:minmax(0,1fr);height:360px;width:360px;margin:16px"
  >
    <Pane
      label="Messages"
      headerPresentation="overlay"
      safeAreaEdges={[]}
      header={
        <Toolbar
          label="Messages Header"
          leading={<ToolbarText text="Messages" size="xlarge" wrap />}
        />
      }
    >
      {rows(30)}
    </Pane>
  </section>
);

const app = document.querySelector<HTMLElement>('[data-app]')!;
app.innerHTML = String(
  <>
    {region('wired', true)}
    {region('unwired', false)}
  </>,
);
wireScrollDividers(app.querySelector<HTMLElement>('[data-wired="true"]')!);

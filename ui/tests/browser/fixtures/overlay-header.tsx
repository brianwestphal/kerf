import { ContentItem } from '@kerfjs/ui/content-item';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { wireScrollDividers } from '@kerfjs/ui/wire-scroll-dividers';

// A Pane whose header is laid over its scrolling content
// (`headerPresentation="overlay"`). `wireScrollDividers` measures the header
// and publishes its height as the block-start scroll clearance the content
// clears automatically; the unwired copy keeps its header docked. The
// described copy holds a default-size title with a quiet description, the
// colors that need lifting to stay at AA over the material.
const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <ContentItem>{`Message ${index + 1}`}</ContentItem>
  ));

const region = (
  name: string,
  wired: boolean,
  title = <ToolbarText text="Messages" size="xlarge" wrap />,
) => (
  <section
    data-region={name}
    data-wired={String(wired)}
    style="display:grid;grid-template-rows:minmax(0,1fr);height:360px;width:360px;margin:16px"
  >
    <Pane
      label="Messages"
      headerPresentation="overlay"
      safeAreaEdges={[]}
      header={<Toolbar label="Messages Header" leading={title} />}
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
    {region(
      'described',
      true,
      <ToolbarText text="Messages" description="3 unread" />,
    )}
  </>,
);
for (const wired of app.querySelectorAll<HTMLElement>('[data-wired="true"]'))
  wireScrollDividers(wired);

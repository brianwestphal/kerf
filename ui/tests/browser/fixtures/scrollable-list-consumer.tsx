import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import { Text } from '@kerfjs/ui/text';

const description =
  '/Users/someone/Documents/projects/a-very-long-project-directory-name/with/nested/folders/that/wraps/onto/several/lines';

// An app-owned bounded column (max-height, no definite height) whose only
// child is a scrollable List of multiline rows: the shape Hot Sheet's
// remote-project dialog uses.
document.querySelector('[data-app]')!.innerHTML = String(
  <nav
    data-bounded
    style="display:flex;flex-direction:column;max-height:240px;width:320px"
  >
    <List gap="2xs" flex scrollable>
      {Array.from({ length: 6 }, (_, index) => (
        <ListItem
          label={`Project ${index + 1}`}
          description={description}
          multiline
          action="open"
          itemId={String(index)}
        />
      ))}
    </List>
  </nav>,
);

// A scrollable List of non-interactive rows inside a rounded, clipping
// container: the scroller itself takes keyboard focus, and its ring must stay
// inside the clip (Hot Sheet's project-close dialog).
document.querySelector('[data-app]')!.insertAdjacentHTML(
  'beforeend',
  String(
    <div
      data-ring-host
      style="display:flex;flex-direction:column;height:160px;width:320px;margin:24px;overflow:hidden;border-radius:12px;background:#f2f2f7"
    >
      <List flex scrollable rootAttributes={{ 'data-ring-list': '' }}>
        {Array.from({ length: 8 }, (_, index) => (
          <Text>{`Project ${index + 1}`}</Text>
        ))}
      </List>
    </div>,
  ),
);

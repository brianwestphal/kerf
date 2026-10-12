import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';

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

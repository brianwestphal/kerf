import { List } from '@kerfjs/ui/list';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { popupMenuElementsRegistered } from '@kerfjs/ui/popup-menu/register';
import { Text } from '@kerfjs/ui/text';

// Keep the registration entry in the fixture bundle so the last row's menu opens.
document.documentElement.dataset.registered = String(
  popupMenuElementsRegistered,
);

document.querySelector('[data-app]')!.innerHTML = String(
  <main style="height:100%;display:flex;flex-direction:column;min-height:0">
    <Text>Projects</Text>
    <List flex scrollable rootAttributes={{ 'data-popup-list': '' }}>
      {Array.from({ length: 28 }, (_, index) => (
        <div style="height:76px;min-height:76px;display:flex;align-items:center;justify-content:space-between;padding:8px">
          <Text>{`Project ${index + 1}`}</Text>
          <PopupMenu
            label={`Actions for project ${index + 1}`}
            items={[{ label: 'Open', action: 'open' }]}
            rootAttributes={{ 'data-row-menu': String(index) }}
          />
        </div>
      ))}
    </List>
  </main>,
);

import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components';
import { commit, exposePicker, options } from './picker';

exposePicker((host) => {
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      <ComboBox onSelectionChange={(key) => key != null && commit(key)}>
        <Label>Fruit</Label>
        <Input />
        <Popover>
          <ListBox>
            {options.map((s) => (
              <ListBoxItem id={s} key={s}>
                {s}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </ComboBox>,
    ),
  );
  return () => root.unmount();
});

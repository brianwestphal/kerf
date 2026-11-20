import { Combobox } from '@kobalte/core/combobox';
import { render } from 'solid-js/web';
import { commit, exposePicker, options } from './picker';

exposePicker((root) =>
  render(
    () => (
      <Combobox
        options={options}
        defaultFilter="contains"
        onChange={(value) => value && commit(value)}
        itemComponent={(props) => (
          <Combobox.Item item={props.item}>
            <Combobox.ItemLabel>{props.item.rawValue}</Combobox.ItemLabel>
          </Combobox.Item>
        )}
      >
        <Combobox.Label>Fruit</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input />
        </Combobox.Control>
        <Combobox.Portal>
          <Combobox.Content>
            <Combobox.Listbox />
          </Combobox.Content>
        </Combobox.Portal>
      </Combobox>
    ),
    root,
  ),
);

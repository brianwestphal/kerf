import { mount } from 'kerfjs';
import { Combobox } from '@kerfjs/ui/combobox';
import { wireComboboxes } from '@kerfjs/ui/wire-comboboxes';
import { commit, exposePicker, options } from './picker';

exposePicker((root) => {
  const stop = mount(root, () => (
    <Combobox
      id="fruit"
      label="Fruit"
      suggestions={options}
      createLabel={false}
    />
  ));
  const unwire = wireComboboxes(root, {
    onCommit: ({ value }) => commit(value),
  });
  return () => {
    unwire();
    stop();
    root.replaceChildren();
  };
});

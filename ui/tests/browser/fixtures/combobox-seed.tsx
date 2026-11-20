import { Combobox } from '@kerfjs/ui/combobox';
import { wireComboboxes } from '@kerfjs/ui/wire-comboboxes';
import { mount, signal } from 'kerfjs';

export function start(host: HTMLElement) {
  const seed = signal('first');
  const suggestions = signal(['one']);
  const generation = signal(0);
  const unmount = mount(host, () => (
    <form data-key={generation.value}>
      <Combobox
        id="tag"
        label="Tag"
        suggestions={suggestions.value}
        value={seed.value}
      />
      <button type="reset">Reset</button>
    </form>
  ));
  const unwire = wireComboboxes(host, { onCommit() {} });
  return {
    refresh: () => {
      suggestions.value = ['one', 'two'];
    },
    setSeed: (text: string) => {
      seed.value = text;
    },
    remount: () => {
      generation.value++;
    },
    dispose: () => {
      unwire();
      unmount();
    },
  };
}

Object.assign(window, {
  seedFixture: start(document.body.appendChild(document.createElement('main'))),
});

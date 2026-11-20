import { wireComboboxes } from '@kerfjs/ui/wire-comboboxes';
import { mount, signal } from 'kerfjs';

import { createComboboxOwner } from '../../../docs/examples/scoped-combobox.js';

export function start() {
  const commits: string[] = [];
  function app(name: string, keys: string[]) {
    const root = document.body.appendChild(document.createElement('main'));
    const owner = createComboboxOwner(keys);
    const props = signal({
      label: name,
      suggestions: ['blue', 'blueberry'],
      hint: 'original',
    });
    let generation = 0;
    const register = (id: string, initialValue: string, callbackId = id) =>
      owner.field({
        id,
        initialValue,
        onCommit: ({ value, created }) =>
          commits.push([name, callbackId, value, created].join('/')),
      });
    const field = register(name, 'seed');
    const extra = signal<ReturnType<typeof register> | undefined>(undefined);
    const unmount = mount(root, () => (
      <form>
        {field.render(props.value)}
        <section>
          {extra.value?.render({ label: 'Nested', suggestions: ['blue'] })}
        </section>
        <button type="reset">Reset</button>
      </form>
    ));
    owner.connect(root);
    return {
      refresh() {
        props.value = {
          label: props.peek().label + ' edited',
          suggestions: ['blueberry', 'blue', 'blues'],
          hint: 'updated',
        };
      },
      add(seed: string) {
        extra.value = register(
          name + '-nested',
          seed,
          'nested-' + ++generation,
        );
      },
      remove() {
        extra.peek()?.dispose();
        extra.value = undefined;
      },
      mixManual() {
        return wireComboboxes(root, {
          onCommit: ({ value }) => commits.push('manual/' + value),
        });
      },
      release() {
        owner.dispose();
      },
      unmount() {
        owner.dispose();
        unmount();
        root.remove();
      },
    };
  }
  return { commits, a: app('one', [';']), b: app('two', [',']) };
}

Object.assign(window, { scopedFixture: start() });

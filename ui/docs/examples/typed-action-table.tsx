import { Button } from '@kerfjs/ui/button';
import { mount, signal } from 'kerfjs';
import { action, type ActionHandler, delegateActions } from 'kerfjs/actions';

/** A command name must belong to the table that handles this event. */
export function mountCounter(root: HTMLElement): () => void {
  const count = signal(0);
  const clicks = {
    increment: () => {
      count.value += 1;
    },
    reset: () => {
      count.value = 0;
    },
  } satisfies Record<string, ActionHandler<HTMLButtonElement>>;
  const click = action<keyof typeof clicks>;
  const increment = click('increment');
  const reset = click('reset');

  const unmount = mount(root, () => (
    <section>
      <output>{count}</output>
      <Button action={increment.value}>Increment</Button>
      <button type="button" {...reset.attrs}>
        Reset
      </button>
    </section>
  ));
  const unwire = delegateActions(root, 'click', clicks);
  return () => {
    unwire();
    unmount();
  };
}

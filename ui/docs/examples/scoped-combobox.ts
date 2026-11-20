import { Combobox, type ComboboxProps } from '@kerfjs/ui/combobox';
import {
  type ComboboxCommit,
  wireComboboxes,
} from '@kerfjs/ui/wire-comboboxes';

type RenderProps = Omit<ComboboxProps, 'id' | 'value'>;
type FieldOptions = {
  id: string;
  initialValue?: string;
  onCommit: (commit: ComboboxCommit) => void;
};

const boundary = 'data-example-combobox-owner';
const selector = `[${boundary}]`;

/** Consumer recipe. Create once outside mount's repeating render callback. */
export function createComboboxOwner(commitKeys: readonly string[] = [',']) {
  const fields = new Map<
    string,
    { token: symbol; commit: FieldOptions['onCommit'] }
  >();
  const keys = [...commitKeys];
  let root: HTMLElement | undefined;
  let unwire: (() => void) | undefined;
  let disposed = false;

  function ensureLive() {
    if (disposed) throw new Error('Combobox owner was disposed');
  }

  function startWiring() {
    if (!root || unwire || fields.size === 0) return;
    unwire = wireComboboxes(root, {
      commitKeys: keys,
      onCommit: (event) => fields.get(event.id)?.commit(event),
    });
  }

  function closeFocused(id?: string) {
    const focused = root?.ownerDocument.activeElement;
    if (
      focused &&
      root?.contains(focused) &&
      fields.has(focused.id) &&
      (id === undefined || id === focused.id)
    ) {
      // The wire's focusout closes the popover and stops following its anchor.
      (focused as HTMLElement).blur();
    }
  }

  function stopWiring() {
    unwire?.();
    unwire = undefined;
  }

  return {
    field({ id, initialValue = '', onCommit }: FieldOptions) {
      ensureLive();
      if (fields.has(id)) throw new Error(`Duplicate Combobox id: ${id}`);
      const token = Symbol();
      fields.set(id, { token, commit: onCommit });
      startWiring();
      return {
        render(props: RenderProps) {
          if (fields.get(id)?.token !== token)
            throw new Error('Combobox field was disposed');
          return Combobox({ ...props, id, value: initialValue });
        },
        dispose() {
          if (fields.get(id)?.token !== token) return;
          closeFocused(id);
          fields.delete(id);
          if (!fields.size) stopWiring();
        },
      };
    },
    connect(host: HTMLElement) {
      ensureLive();
      if (root || host.closest(selector) || host.querySelector(selector))
        throw new Error(
          'Overlapping Combobox owners must share the outer owner',
        );
      host.setAttribute(boundary, '');
      root = host;
      startWiring();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      closeFocused();
      stopWiring();
      fields.clear();
      root?.removeAttribute(boundary);
      root = undefined;
    },
  };
}

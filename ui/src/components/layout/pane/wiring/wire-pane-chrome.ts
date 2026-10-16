import { effect, type Signal } from 'kerfjs';

/** The app-owned open state of a Pane's `overlay` compact chrome. */
export interface WirePaneChromeOptions {
  /** The signal the Pane renders as `compactChromeOpen.header`. */
  header?: Signal<boolean>;
  /** The signal the Pane renders as `compactChromeOpen.footer`. */
  footer?: Signal<boolean>;
}

type Slot = 'header' | 'footer';

/**
 * Make a Pane's open `overlay` compact chrome transient, like a Workbench's
 * overlay rail: Escape, or a press that starts and ends outside the open
 * chrome, sets its signal back to false, and focus left inside the closed
 * chrome returns to the control that had focus when it opened. `root` holds
 * the Pane (its NavStack, dialog, or Workbench); the app still opens the
 * chrome from its own control, and a press on that control toggles as usual
 * because the dismissal is decided at the click. Returns a disposer.
 */
export function wirePaneChrome(
  root: HTMLElement,
  { header, footer }: WirePaneChromeOptions,
): () => void {
  const doc = root.ownerDocument;
  const slots = (
    [
      ['header', header],
      ['footer', footer],
    ] as const
  ).filter((entry): entry is [Slot, Signal<boolean>] => entry[1] !== undefined);
  const elementOf = (slot: Slot) =>
    root.querySelector<HTMLElement>(
      `.kui-pane[data-compact-${slot}="overlay"] > .kui-pane__${slot}`,
    );
  const open = () => slots.filter(([, state]) => state.peek());
  const openers = new Map<Slot, Element | null>();

  const stops = slots.map(([slot, state]) => {
    let was = state.peek();
    return effect(() => {
      const now = state.value;
      if (now && !was) openers.set(slot, doc.activeElement);
      if (!now && was) {
        // Focus stranded in the closed chrome goes back to its opener.
        const element = elementOf(slot);
        const opener = openers.get(slot);
        if (
          element?.contains(doc.activeElement) &&
          opener instanceof HTMLElement
        )
          opener.focus({ preventScroll: true });
        openers.delete(slot);
      }
      was = now;
    });
  });

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const shown = open();
    if (shown.length === 0) return;
    event.preventDefault();
    // The chrome holding focus closes first; otherwise the last one opened.
    const [, state] =
      shown.find(([slot]) => elementOf(slot)?.contains(doc.activeElement)) ??
      shown[shown.length - 1]!;
    state.value = false;
  };

  let pressed: Slot[] = [];
  const outside = (slot: Slot, path: EventTarget[]) => {
    const element = elementOf(slot);
    return !element || !path.includes(element);
  };
  const onPointerdown = (event: PointerEvent) => {
    const path = event.composedPath();
    pressed = open()
      .map(([slot]) => slot)
      .filter((slot) => outside(slot, path));
  };
  const onClick = (event: MouseEvent) => {
    const candidates = pressed;
    pressed = [];
    const path = event.composedPath();
    for (const [slot, state] of open())
      if (candidates.includes(slot) && outside(slot, path)) state.value = false;
  };

  doc.addEventListener('keydown', onKeydown);
  doc.addEventListener('pointerdown', onPointerdown, true);
  doc.addEventListener('click', onClick);
  return () => {
    for (const stop of stops) stop();
    doc.removeEventListener('keydown', onKeydown);
    doc.removeEventListener('pointerdown', onPointerdown, true);
    doc.removeEventListener('click', onClick);
  };
}

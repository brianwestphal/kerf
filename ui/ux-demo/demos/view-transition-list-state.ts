import { signal } from 'kerfjs';

export type ViewTransitionListAction =
  'reorder' | 'insert' | 'remove' | 'reset';
export interface ViewTransitionListRow {
  id: 'a' | 'b' | 'c' | 'd';
  label: string;
}

const initial: readonly ViewTransitionListRow[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

export const viewTransitionListRows =
  signal<readonly ViewTransitionListRow[]>(initial);

/** Keep IDs stable while the app changes the list's order and membership. */
export function nextViewTransitionListRows(
  current: readonly ViewTransitionListRow[],
  action: ViewTransitionListAction,
): readonly ViewTransitionListRow[] {
  switch (action) {
    case 'reorder':
      return [...current].reverse();
    case 'insert':
      return current.some((row) => row.id === 'd')
        ? current
        : [
            ...current.slice(0, 1),
            { id: 'd', label: 'Delta' },
            ...current.slice(1),
          ];
    case 'remove':
      return current.slice(0, -1);
    case 'reset':
      return initial;
  }
}

let pendingCapture = false;
let active: ViewTransition | undefined;
const queued: ViewTransitionListAction[] = [];

function apply(action: ViewTransitionListAction) {
  viewTransitionListRows.value = nextViewTransitionListRows(
    viewTransitionListRows.value,
    action,
  );
}

/** The catalog app owns the transition around the source write, not Kerf. */
export function changeViewTransitionList(
  action: ViewTransitionListAction,
): void {
  if (
    !document.startViewTransition ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('demo-reduced-motion')
  ) {
    apply(action);
  } else if (pendingCapture) {
    queued.push(action);
  } else if (active) {
    apply(action);
  } else {
    pendingCapture = true;
    const transition = document.startViewTransition(() => {
      try {
        apply(action);
        for (const next of queued.splice(0)) apply(next);
      } finally {
        pendingCapture = false;
      }
    });
    active = transition;
    const clear = () => {
      if (active === transition) active = undefined;
    };
    void transition.finished.then(clear, clear);
  }
}

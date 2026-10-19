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
const clipProperty = '--demo-list-view-transition-clip';

/** Document transition snapshots live above the catalog's scrolling pane. */
function visibleSpecimenClip(): string | undefined {
  const specimen = document.querySelector('[data-demo-view-transitions]');
  if (!specimen) return undefined;
  const bounds = specimen.getBoundingClientRect();
  let top = Math.max(0, bounds.top);
  let right = Math.min(window.innerWidth, bounds.right);
  let bottom = Math.min(window.innerHeight, bounds.bottom);
  let left = Math.max(0, bounds.left);
  for (
    let element = specimen.parentElement;
    element;
    element = element.parentElement
  ) {
    if (
      element.scrollHeight <= element.clientHeight &&
      element.scrollWidth <= element.clientWidth
    )
      continue;
    const rect = element.getBoundingClientRect();
    top = Math.max(top, rect.top);
    right = Math.min(right, rect.right);
    bottom = Math.min(bottom, rect.bottom);
    left = Math.max(left, rect.left);
  }
  return `inset(${Math.min(window.innerHeight, top)}px ${Math.max(0, window.innerWidth - right)}px ${Math.max(0, window.innerHeight - bottom)}px ${Math.min(window.innerWidth, left)}px)`;
}

function apply(action: ViewTransitionListAction) {
  const specimen = document.querySelector('[data-demo-view-transitions]');
  const scrollPositions: Array<{
    element: Element;
    top: number;
    left: number;
  }> = [];
  for (let element = specimen; element; element = element.parentElement) {
    if (
      element.scrollHeight > element.clientHeight ||
      element.scrollWidth > element.clientWidth
    )
      scrollPositions.push({
        element,
        top: element.scrollTop,
        left: element.scrollLeft,
      });
  }
  try {
    viewTransitionListRows.value = nextViewTransitionListRows(
      viewTransitionListRows.value,
      action,
    );
  } finally {
    for (const { element, top, left } of scrollPositions) {
      if (!element.isConnected) continue;
      element.scrollTop = top;
      element.scrollLeft = left;
    }
  }
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
    const page = document.documentElement;
    const previousRootName = page.style.viewTransitionName;
    const clip = visibleSpecimenClip();
    if (clip) page.style.setProperty(clipProperty, clip);
    // The full-page root snapshot would disappear outside the specimen clip.
    page.style.viewTransitionName = 'none';
    let transition: ViewTransition;
    try {
      transition = document.startViewTransition(() => {
        try {
          apply(action);
          for (const next of queued.splice(0)) apply(next);
        } finally {
          pendingCapture = false;
        }
      });
    } catch (error) {
      pendingCapture = false;
      page.style.viewTransitionName = previousRootName;
      page.style.removeProperty(clipProperty);
      throw error;
    }
    active = transition;
    const clear = () => {
      if (active === transition) {
        active = undefined;
        page.style.viewTransitionName = previousRootName;
        page.style.removeProperty(clipProperty);
      }
    };
    void transition.finished.then(clear, clear);
  }
}

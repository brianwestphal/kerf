import { EmptyState, LoadingSpinner, MenuItem, StateBanner, Toolbar, ToolbarText } from '@kerfjs/ui';
import { delegate, each, mount, signal } from 'kerfjs';

interface PagefindData {
  excerpt: string;
  meta: { title?: string };
  url: string;
}

interface PagefindResult {
  data: () => Promise<PagefindData>;
  id: string;
}

interface PagefindResponse {
  results: PagefindResult[];
}

interface PagefindModule {
  search: (query: string) => Promise<PagefindResponse>;
}

interface SearchResult {
  excerpt: string;
  id: string;
  title: string;
  url: string;
}

type SearchState = 'idle' | 'loading' | 'ready' | 'error';

const open = signal(false);
const query = signal('');
const results = signal<SearchResult[]>([]);
const state = signal<SearchState>('idle');
let pagefindPromise: Promise<PagefindModule> | undefined;
let searchSequence = 0;
let disposeSearch: (() => void) | undefined;

function basePath(): string {
  const base = document.documentElement.dataset.kerfBase ?? '/kerf/';
  return base.endsWith('/') ? base : `${base}/`;
}

function loadPagefind(): Promise<PagefindModule> {
  pagefindPromise ??= import(/* @vite-ignore */ `${basePath()}pagefind/pagefind.js`) as Promise<PagefindModule>;
  return pagefindPromise;
}

function cleanExcerpt(excerpt: string): string {
  const decoded = new DOMParser().parseFromString(excerpt, 'text/html').body.textContent ?? '';
  return decoded.replace(/\s+/g, ' ').trim();
}

async function runSearch(value: string): Promise<void> {
  const sequence = ++searchSequence;
  query.value = value;
  if (!value.trim()) {
    results.value = [];
    state.value = 'idle';
    return;
  }

  state.value = 'loading';
  try {
    const pagefind = await loadPagefind();
    const response = await pagefind.search(value);
    const data = await Promise.all(response.results.slice(0, 8).map((result) => result.data()));
    if (sequence !== searchSequence) return;
    results.value = data.map((result, index) => ({
      excerpt: cleanExcerpt(result.excerpt),
      id: response.results[index]?.id ?? result.url,
      title: result.meta.title ?? 'Kerf documentation',
      url: result.url,
    }));
    state.value = 'ready';
  } catch {
    if (sequence !== searchSequence) return;
    results.value = [];
    state.value = 'error';
  }
}

function resultList() {
  if (state.value === 'loading') {
    return <EmptyState title="Searching the handbook" detail="Loading the prebuilt index…" busy />;
  }
  if (state.value === 'error') {
    return <StateBanner title="Search is unavailable" detail="Try loading this page again." tone="danger" urgency="alert" />;
  }
  if (!query.value) {
    return <EmptyState title="Search the Kerf handbook" detail="Find APIs, patterns, examples, and migration guides." />;
  }
  if (results.value.length === 0) {
    return <EmptyState title="No matching cuts" detail="Try a broader term, such as signals, lists, or routing." />;
  }
  return <div class="kerf-search-results" role="listbox" aria-label="Search results">
    {each(results.value, (result) => (
      <a class="kui-menu-item kerf-search-result" href={result.url} role="option" data-key={result.id}>
        <span class="kerf-search-result__copy">
          <strong>{result.title}</strong>
          <span>{result.excerpt}</span>
        </span>
        <span class="kui-menu-item__trailing" aria-hidden="true">↗</span>
      </a>
    ), { key: 'search-results' })}
  </div>;
}

export function renderSearch() {
  return <div class="kerf-search" data-search-open={String(open.value)}>
    <MenuItem
      action="open-search"
      className="kerf-search-trigger"
      label="Search docs"
      accessibleLabel="Search documentation"
      trailing={<kbd aria-hidden="true">⌘ K</kbd>}
    />
    <dialog class="kerf-search-dialog" open={open.value} aria-label="Search documentation">
      <div class="kerf-search-scrim" data-action="close-search">
        <section class="kerf-search-panel" aria-label="Search documentation">
          <Toolbar
            label="Search controls"
            leading={<ToolbarText text="Search the docs" size="large" />}
            trailing={<MenuItem action="close-search" className="kerf-search-close" label="Close" />}
          />
          <label class="kerf-search-field">
            <span class="sr-only">Search documentation</span>
            <span aria-hidden="true">⌕</span>
            <input type="search" value={query.value} placeholder="Signals, keyed lists, router…" autocomplete="off" data-search-input />
            {state.value === 'loading' && <LoadingSpinner label="Searching" />}
          </label>
          <div class="kerf-search-body">{resultList()}</div>
          <footer><span>Static HTML by Kerf</span><span>Search + UI by Kerf</span></footer>
        </section>
      </div>
    </dialog>
  </div>;
}

export function hydrateSearch(): void {
  const host = document.querySelector<HTMLElement>('.kerf-search-host');
  if (!host || host.dataset.hydrated === 'true') return;
  host.dataset.hydrated = 'true';
  disposeSearch?.();

  const disposeMount = mount(host, renderSearch);
  const disposers = [
    delegate(host, 'click', '[data-action="open-search"]', () => {
      open.value = true;
      requestAnimationFrame(() => host.querySelector<HTMLInputElement>('[data-search-input]')?.focus());
    }),
    delegate(host, 'click', '[data-action="close-search"]', (event, target) => {
      if (target.classList.contains('kerf-search-scrim') && event.target !== target) return;
      open.value = false;
    }),
    delegate<HTMLInputElement>(host, 'input', '[data-search-input]', (_event, input) => {
      void runSearch(input.value);
    }),
    delegate(host, 'click', '.kerf-search-result', () => {
      open.value = false;
    }),
  ];
  const onKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open.value = !open.value;
      if (open.value) requestAnimationFrame(() => host.querySelector<HTMLInputElement>('[data-search-input]')?.focus());
    } else if (event.key === 'Escape' && open.value) {
      open.value = false;
    }
  };
  window.addEventListener('keydown', onKeydown);
  disposeSearch = () => {
    disposeMount();
    disposers.forEach((dispose) => dispose());
    window.removeEventListener('keydown', onKeydown);
  };
}

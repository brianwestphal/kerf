import { delegate, effect, morph } from 'kerfjs';
import { createRouter } from 'kerfjs/router';

import { hydrateSearch } from './search';
import { hydrateShowcase } from './showcase';
import '../styles/site.css';

const root = document.querySelector<HTMLElement>('#site-root');
if (!root) throw new Error('Kerf site root is missing');

const base = document.documentElement.dataset.kerfBase?.replace(/\/$/, '') ?? '/kerf';
const router = createRouter({ routes: [{ path: '*', component: () => null }], base });
let renderedPath = root.querySelector<HTMLElement>('[data-current-path]')?.dataset.currentPath ?? '/';
let navigationSequence = 0;

function rehydratePage(): void {
  requestAnimationFrame(() => {
    hydrateSearch();
    hydrateShowcase();
  });
}

async function swapPage(path: string): Promise<void> {
  const sequence = ++navigationSequence;
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { headers: { Accept: 'text/html' } });
  } catch {
    location.assign(`${base}${path}`);
    return;
  }
  if (!response.ok) {
    location.assign(`${base}${path}`);
    return;
  }
  const incoming = new DOMParser().parseFromString(await response.text(), 'text/html');
  const nextRoot = incoming.querySelector<HTMLElement>('#site-root');
  if (!nextRoot) {
    location.assign(`${base}${path}`);
    return;
  }
  if (sequence !== navigationSequence) return;
  morph(root!, nextRoot);
  document.title = incoming.title;
  const description = incoming.querySelector('meta[name="description"]')?.getAttribute('content');
  if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  renderedPath = path;
  document.body.dataset.navOpen = 'false';
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  else window.scrollTo({ top: 0 });
  rehydratePage();
}

delegate<HTMLElement>(root, 'click', '[data-action="navigate"]', (_event, target) => {
  const path = target.dataset.itemId;
  if (path) router.navigate(path);
});
delegate(root, 'click', '[data-action="open-nav"]', () => {
  document.body.dataset.navOpen = 'true';
  root.querySelector<HTMLElement>('[data-action="open-nav"]')?.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => root.querySelector<HTMLElement>('[data-action="close-nav"]')?.focus());
});
delegate(root, 'click', '[data-action="close-nav"]', () => {
  document.body.dataset.navOpen = 'false';
  const trigger = root.querySelector<HTMLElement>('[data-action="open-nav"]');
  trigger?.setAttribute('aria-expanded', 'false');
  trigger?.focus();
});
delegate(root, 'click', '[data-action="history-back"]', () => router.back());
delegate(root, 'click', '[data-action="history-forward"]', () => router.forward());
delegate(root, 'click', '[data-action="toggle-theme"]', () => {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : current === 'light' ? 'dark' : matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('kerf-site-theme', next);
});
delegate<HTMLElement>(root, 'click', '[data-action="scroll-to"]', (_event, target) => {
  const id = target.dataset.itemId;
  if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

effect(() => {
  const route = router.route.value;
  if (route.path !== renderedPath) void swapPage(route.path);
  else if (route.hash) requestAnimationFrame(() => document.getElementById(route.hash.slice(1))?.scrollIntoView());
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.dataset.navOpen === 'true') {
    document.body.dataset.navOpen = 'false';
    root.querySelector<HTMLElement>('[data-action="open-nav"]')?.focus();
  }
});

rehydratePage();

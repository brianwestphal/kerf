import { readFile, readdir } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

import { Marked } from 'marked';

export const BASE_PATH = '/kerf';
export const LEGACY_REDIRECTS = {
  '/examples/basics/09-raw-sanitise/': '/kerf/examples/basics/09-raw-sanitize/',
};

const COMPLETE_APPS = [
  ['todomvc', 'TodoMVC', 'defineStore, each, delegated events, and localStorage.', 'Animated preview of the TodoMVC example'],
  ['markdown-editor', 'Live Markdown editor', 'computed rendering, raw HTML, and DOMPurify.', 'Animated preview of the Markdown editor'],
  ['kanban', 'Mini Kanban', 'Keyed lists, pointer events, and drag state.', 'Animated preview of the Kanban example'],
  ['chat', 'Chat UI', 'Streaming signal writes and delegated actions.', 'Animated preview of the chat example'],
  ['dashboard', 'Realtime dashboard', 'Large keyed tables, batching, and canvas.', 'Animated preview of the dashboard example'],
  ['row-selector', 'Row selector', 'Fine-grained bindings without list re-renders.', 'Animated preview of the row selector'],
  ['live-poll', 'Live poll (no build step)', 'Tagged templates and an import map.', 'Animated preview of the live poll'],
  ['virtual-list', 'Virtual list', '10,000-row virtualization, filtering, dialogs, and toast.', 'Animated preview of the virtual list'],
  ['router', 'Router', 'The postcard router with params and browser history.', 'Animated preview of the router example'],
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slugify(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

export function routeFromRelative(file) {
  const withoutExtension = file.slice(0, -extname(file).length).split(sep).join('/');
  const route = withoutExtension === 'index'
    ? '/'
    : withoutExtension.endsWith('/index')
      ? `/${withoutExtension.slice(0, -'/index'.length)}/`
      : `/${withoutExtension}/`;
  return route.replace(/\/+/g, '/');
}

export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error('Documentation source is missing frontmatter');
  const value = (name) => {
    const field = match[1].match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
    return field.replace(/^(['"])(.*)\1$/, '$2');
  };
  return {
    attributes: { title: value('title'), description: value('description') },
    body: source.slice(match[0].length),
  };
}

function completeAppsGrid() {
  const sourceBase = 'https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete';
  return `<div class="app-grid">${COMPLETE_APPS.map(([slug, title, blurb, alt]) => `
    <article class="app-card">
      <a class="app-card__thumb" href="${BASE_PATH}/examples/complete/${slug}/"><img src="${BASE_PATH}/demos/${slug}.svg" alt="${escapeHtml(alt)}" loading="lazy"></a>
      <div class="app-card__body"><h3 class="app-card__title"><a href="${BASE_PATH}/examples/complete/${slug}/">${title}</a></h3><p class="app-card__blurb">${blurb}</p>
      <div class="app-cta app-cta--sm"><a class="app-cta__run" href="${BASE_PATH}/run/${slug}/">▶ Run live</a><a class="app-cta__source" href="${sourceBase}/${slug}" target="_blank" rel="noopener external">Source</a></div></div>
    </article>`).join('')}</div>`;
}

function showcase() {
  return `<section class="kerf-live-showcase" aria-labelledby="kerf-live-showcase-title">
    <div class="kerf-live-showcase__intro"><p class="kerf-live-showcase__eyebrow">This site is the demo</p><h2 id="kerf-live-showcase-title">Static at the door. Kerf all the way through.</h2><p>Every URL arrives as searchable HTML generated from Kerf JSX. Once loaded, Kerf routing and <code>@kerfjs/ui</code> own the complete interface.</p></div>
    <div class="kerf-showcase-host"></div>
  </section>`;
}

async function perfTable(repoRoot) {
  const data = JSON.parse(await readFile(resolve(repoRoot, 'bench/results.json'), 'utf8'));
  const scenarios = ['swap rows', 'remove row', 'clear 1k', 'partial update', 'select row'];
  const frameworks = [['kerfjs', 'kerf'], ['solid', 'Solid'], ['vue', 'Vue'], ['react-hooks', 'React']];
  const indices = scenarios.map((label) => data.scenarios.findIndex((scenario) => scenario.label === label));
  const rows = frameworks.map(([key, label]) => {
    const framework = data.frameworks.find((entry) => entry.name === key);
    if (!framework || indices.some((index) => index < 0)) throw new Error('Benchmark subset no longer matches bench/results.json');
    return { label, version: framework.version, values: indices.map((index) => framework.values[index]) };
  });
  const best = scenarios.map((_, column) => Math.min(...rows.map((row) => row.values[column]).filter((value) => value !== null)));
  const captured = data.capturedAt ? data.capturedAt.slice(0, 10) : 'unknown';
  return `<figure class="perf-table"><div class="table-scroll"><table><caption>Keyed list operations — median ms, lower is better <span class="perf-meta">krausest js-framework-benchmark · ${captured}</span></caption><thead><tr><th>Framework</th>${scenarios.map((scenario) => `<th>${scenario}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr class="${row.label === 'kerf' ? 'highlight' : ''}"><th>${row.label}</th>${row.values.map((value, column) => `<td class="${value === best[column] ? 'is-best' : ''}">${value === null ? '—' : value.toFixed(1)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="perf-foot">Bold = fastest in column. <a href="https://krausest.github.io/js-framework-benchmark/current.html">Official benchmark</a>; <a href="https://github.com/brianwestphal/kerf/blob/main/bench/results.md">full results and methodology</a>.</p><p class="perf-versions">Versions: ${rows.map((row) => `${row.label} ${row.version}`).join(' · ')}</p></figure>`;
}

function renderCardGrid(source, stash) {
  return source.replace(/<CardGrid>([\s\S]*?)<\/CardGrid>/g, (_whole, cards) => {
    const rendered = [];
    const cardPattern = /<Card\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/Card>/g;
    const linkPattern = /<LinkCard\s+title="([^"]+)"\s+description="([^"]+)"\s+href="([^"]+)"\s*\/>/g;
    for (const match of cards.matchAll(cardPattern)) {
      rendered.push(`<article class="doc-card"><h3>${escapeHtml(match[1])}</h3>${new Marked().parse(match[2].trim())}</article>`);
    }
    for (const match of cards.matchAll(linkPattern)) {
      rendered.push(`<a class="doc-card doc-card--link" href="${match[3]}"><h3>${escapeHtml(match[1])}</h3><p>${escapeHtml(match[2])}</p><span aria-hidden="true">→</span></a>`);
    }
    return stash(`<div class="doc-card-grid">${rendered.join('')}</div>`);
  });
}

async function expandDirectives(body, { path, siteRoot, repoRoot }) {
  const blocks = [];
  const stash = (html) => {
    const token = `KERFSTATICBLOCK${blocks.length}TOKEN`;
    blocks.push(html);
    return token;
  };

  let expanded = renderCardGrid(body, stash);
  expanded = expanded
    .replace(/<KerfShowcase\s*\/>/g, () => stash(showcase()))
    .replace(/<CompleteAppsGrid\s*\/>/g, () => stash(completeAppsGrid()))
    .replace(/<PerfTable\s*\/>/g, () => stash(perfTable(repoRoot)));

  expanded = expanded.replace(/<LiveExample\s*\/>/g, () => {
    const slug = path.split('/').filter(Boolean).at(-1);
    return stash(`<iframe class="kerf-live-example-frame" src="${BASE_PATH}/run/basics/${slug}/" title="Live ${escapeHtml(slug)} example" loading="lazy"></iframe>`);
  });

  expanded = expanded.replace(/<Code\s+lang="([^"]+)"\s+code=\{source\}\s+title="([^"]+)"\s*\/>/g, (_whole, lang, title) => {
    const slug = path.split('/').filter(Boolean).at(-1);
    const sourcePath = resolve(siteRoot, 'src/examples/basics', slug, 'main.tsx');
    return stash(readFile(sourcePath, 'utf8').then((code) => `<figure class="code-block"><figcaption>${escapeHtml(title)}</figcaption><pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre></figure>`));
  });

  for (let index = 0; index < blocks.length; index++) blocks[index] = await blocks[index];

  const renderer = new Marked({ gfm: true });
  let html = await renderer.parse(expanded);
  for (let index = 0; index < blocks.length; index++) {
    html = html.replace(`<p>KERFSTATICBLOCK${index}TOKEN</p>`, blocks[index]).replace(`KERFSTATICBLOCK${index}TOKEN`, blocks[index]);
  }
  return html;
}

function addHeadingIds(html) {
  const used = new Map();
  const toc = [];
  const result = html.replace(/<h([2-3])>([\s\S]*?)<\/h\1>/g, (_whole, depthText, content) => {
    const depth = Number(depthText);
    const base = slugify(content);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    toc.push({ depth, id, label: content.replace(/<[^>]+>/g, '') });
    return `<h${depth} id="${id}">${content}<a class="heading-anchor" href="#${id}" aria-label="Link to ${escapeHtml(content.replace(/<[^>]+>/g, ''))}">#</a></h${depth}>`;
  });
  return { html: result, toc };
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && ['.md', '.mdx'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

export async function loadPages(siteRoot) {
  const repoRoot = resolve(siteRoot, '..');
  const docsRoot = resolve(siteRoot, 'src/content/docs');
  const files = (await walk(docsRoot)).sort();
  const pages = [];
  for (const file of files) {
    const relativePath = relative(docsRoot, file);
    const path = routeFromRelative(relativePath);
    const { attributes, body } = parseFrontmatter(await readFile(file, 'utf8'));
    if (!attributes.title || !attributes.description) throw new Error(`${relativePath} needs title and description`);
    const rendered = await expandDirectives(body, { path, siteRoot, repoRoot });
    const { html, toc } = addHeadingIds(rendered);
    pages.push({ ...attributes, path, html, toc, source: relativePath });
  }
  return pages;
}

export function findPage(pages, path) {
  const normalized = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}/`;
  return pages.find((page) => page.path === normalized);
}

export const NAVIGATION = [
  { label: 'Start here', items: [['Getting started', '/getting-started/'], ['Why Kerf', '/why-kerf/'], ['Use cases', '/use-cases/'], ['When to use something else', '/alternatives/']] },
  { label: 'Docs', items: [['Overview', '/docs/overview/'], ['Reactivity', '/docs/reactivity/'], ['Stores', '/docs/stores/'], ['Render', '/docs/render/'], ['Events', '/docs/events/'], ['JSX runtime', '/docs/jsx/'], ['SVG', '/docs/svg/'], ['Component packages', '/docs/component-packages/'], ['@kerfjs/ui', '/docs/ui-package/'], ['Dev-mode warnings', '/docs/dev-warnings/'], ['ESLint plugin', '/docs/eslint-plugin/']] },
  { label: 'Reference', items: [['API reference', '/api/']] },
  { label: 'Examples', items: [['Basics', '/examples/basics/'], ['Complete apps', '/examples/complete/'], ['Interactive tour', '/demo/']] },
  { label: 'Migrating', items: [['Pick your starting point', '/migrating/'], ['React', '/migrating/react/'], ['Vue', '/migrating/vue/'], ['Svelte', '/migrating/svelte/'], ['Solid', '/migrating/solid/'], ['Preact', '/migrating/preact/'], ['Alpine', '/migrating/alpine/'], ['Lit', '/migrating/lit/'], ['vanjs', '/migrating/vanjs/'], ['htmx', '/migrating/htmx/'], ['Angular', '/migrating/angular/'], ['jQuery', '/migrating/jquery/'], ['Redux', '/migrating/redux/'], ['Astro', '/migrating/astro/']] },
];

export function pageOutputPath(distDir, path) {
  return path === '/' ? join(distDir, 'index.html') : join(distDir, path.slice(1), 'index.html');
}

export function sourceName(file) {
  return basename(file, extname(file));
}

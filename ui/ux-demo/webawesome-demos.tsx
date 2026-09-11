import '@awesome.me/webawesome/dist/components/accordion-item/accordion-item.js';
import '@awesome.me/webawesome/dist/components/accordion/accordion.js';
import '@awesome.me/webawesome/dist/components/animated-image/animated-image.js';
import '@awesome.me/webawesome/dist/components/animation/animation.js';
import '@awesome.me/webawesome/dist/components/avatar/avatar.js';
import '@awesome.me/webawesome/dist/components/badge/badge.js';
import '@awesome.me/webawesome/dist/components/breadcrumb-item/breadcrumb-item.js';
import '@awesome.me/webawesome/dist/components/breadcrumb/breadcrumb.js';
import '@awesome.me/webawesome/dist/components/button-group/button-group.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/callout/callout.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/carousel-item/carousel-item.js';
import '@awesome.me/webawesome/dist/components/carousel/carousel.js';
import '@awesome.me/webawesome/dist/components/checkbox-group/checkbox-group.js';
import '@awesome.me/webawesome/dist/components/checkbox/checkbox.js';
import '@awesome.me/webawesome/dist/components/color-picker/color-picker.js';
import '@awesome.me/webawesome/dist/components/comparison/comparison.js';
import '@awesome.me/webawesome/dist/components/copy-button/copy-button.js';
import '@awesome.me/webawesome/dist/components/details/details.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import '@awesome.me/webawesome/dist/components/divider/divider.js';
import '@awesome.me/webawesome/dist/components/drawer/drawer.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/format-bytes/format-bytes.js';
import '@awesome.me/webawesome/dist/components/format-date/format-date.js';
import '@awesome.me/webawesome/dist/components/format-number/format-number.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/include/include.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/intersection-observer/intersection-observer.js';
import '@awesome.me/webawesome/dist/components/known-date/known-date.js';
import '@awesome.me/webawesome/dist/components/markdown/markdown.js';
import '@awesome.me/webawesome/dist/components/mutation-observer/mutation-observer.js';
import '@awesome.me/webawesome/dist/components/number-input/number-input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/otp-input/otp-input.js';
import '@awesome.me/webawesome/dist/components/page/page.js';
import '@awesome.me/webawesome/dist/components/pagination/pagination.js';
import '@awesome.me/webawesome/dist/components/popover/popover.js';
import '@awesome.me/webawesome/dist/components/popup/popup.js';
import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';
import '@awesome.me/webawesome/dist/components/progress-ring/progress-ring.js';
import '@awesome.me/webawesome/dist/components/qr-code/qr-code.js';
import '@awesome.me/webawesome/dist/components/radio-group/radio-group.js';
import '@awesome.me/webawesome/dist/components/radio/radio.js';
import '@awesome.me/webawesome/dist/components/random-content/random-content.js';
import '@awesome.me/webawesome/dist/components/rating/rating.js';
import '@awesome.me/webawesome/dist/components/relative-time/relative-time.js';
import '@awesome.me/webawesome/dist/components/resize-observer/resize-observer.js';
import '@awesome.me/webawesome/dist/components/scroller/scroller.js';
import '@awesome.me/webawesome/dist/components/skeleton/skeleton.js';
import '@awesome.me/webawesome/dist/components/slider/slider.js';
import '@awesome.me/webawesome/dist/components/spinner/spinner.js';
import '@awesome.me/webawesome/dist/components/split-panel/split-panel.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import '@awesome.me/webawesome/dist/components/tab-group/tab-group.js';
import '@awesome.me/webawesome/dist/components/tab-panel/tab-panel.js';
import '@awesome.me/webawesome/dist/components/tab/tab.js';
import '@awesome.me/webawesome/dist/components/tag/tag.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import '@awesome.me/webawesome/dist/components/time-input/time-input.js';
import '@awesome.me/webawesome/dist/components/toast-item/toast-item.js';
import '@awesome.me/webawesome/dist/components/toast/toast.js';
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js';
import '@awesome.me/webawesome/dist/components/tree-item/tree-item.js';
import '@awesome.me/webawesome/dist/components/tree/tree.js';
import '@awesome.me/webawesome/dist/components/zoomable-frame/zoomable-frame.js';

import type { SafeHtml } from 'kerfjs';

import { webAwesomeCatalog,type WebAwesomeCatalogId } from './catalog.js';

const demoImage = new URL('./animated-image-demo.gif?no-inline', import.meta.url).href;
const demoFrame = '<!doctype html><style>body{margin:0;display:grid;min-height:100vh;place-items:center;font:16px system-ui;color:#1d1d1f;background:#f5f5f7}strong{color:#006edc}</style><strong>Zoomable Kerf content</strong>';

type DemoRenderer = () => SafeHtml;

const specimenRenderers: Record<WebAwesomeCatalogId, DemoRenderer> = {
  'wa-button': () => <div class="wa-demo-row"><wa-button variant="brand" appearance="accent">Primary</wa-button><wa-button appearance="outlined">Secondary</wa-button><wa-button variant="danger" appearance="filled">Destructive</wa-button></div>,
  'wa-button-group': () => <wa-button-group label="Text alignment"><wa-button appearance="outlined">Start</wa-button><wa-button appearance="outlined">Center</wa-button><wa-button appearance="outlined">End</wa-button></wa-button-group>,
  'wa-copy-button': () => <div class="wa-demo-inline-field"><code>npm i @kerfjs/ui</code><wa-copy-button value="npm i @kerfjs/ui" copy-label="Copy install command"></wa-copy-button></div>,
  'wa-dropdown': () => <wa-dropdown><wa-button slot="trigger" appearance="outlined" with-caret>Project actions</wa-button><wa-dropdown-item>Rename</wa-dropdown-item><wa-dropdown-item>Duplicate</wa-dropdown-item><wa-dropdown-item variant="danger">Delete</wa-dropdown-item></wa-dropdown>,
  'wa-dropdown-item': () => <div class="wa-demo-menu" role="menu"><wa-dropdown-item>Open</wa-dropdown-item><wa-dropdown-item type="checkbox" checked>Pin to sidebar</wa-dropdown-item><wa-dropdown-item disabled>Unavailable</wa-dropdown-item></div>,

  'wa-checkbox': () => <div class="wa-demo-stack"><wa-checkbox checked>Include in release</wa-checkbox><wa-checkbox indeterminate>Some child tasks complete</wa-checkbox><wa-checkbox disabled>Locked setting</wa-checkbox></div>,
  'wa-checkbox-group': () => <wa-checkbox-group label="Notifications" hint="Choose every channel you want to receive."><wa-checkbox checked>Email summaries</wa-checkbox><wa-checkbox>Desktop alerts</wa-checkbox><wa-checkbox>Mentions only</wa-checkbox></wa-checkbox-group>,
  'wa-color-picker': () => <wa-color-picker label="Workspace accent" value="#0088ff" format="hex" with-opacity></wa-color-picker>,
  'wa-input': () => <div class="wa-demo-form-stack"><wa-input label="Project name" value="Component library" hint="Visible to collaborators" with-clear></wa-input><wa-input label="Search" placeholder="Filter components"></wa-input></div>,
  'wa-known-date': () => <wa-known-date label="Release date" value="2026-09-11" hint="Enter the date you already know."></wa-known-date>,
  'wa-number-input': () => <wa-number-input label="Review limit" value="12" min="1" max="50" hint="Between 1 and 50"></wa-number-input>,
  'wa-option': () => <wa-select label="Option states" value="selected"><wa-option value="available">Available option</wa-option><wa-option value="selected">Selected option</wa-option><wa-option value="disabled" disabled>Disabled option</wa-option></wa-select>,
  'wa-otp-input': () => <wa-otp-input label="Verification code" value="274816" format="### ###" hint="Six-digit code"></wa-otp-input>,
  'wa-radio': () => <div class="wa-demo-stack" role="group" aria-label="Radio states"><wa-radio value="selected" checked>Selected choice</wa-radio><wa-radio value="available">Available choice</wa-radio><wa-radio value="disabled" disabled>Disabled choice</wa-radio></div>,
  'wa-radio-group': () => <wa-radio-group label="Layout density" value="balanced"><wa-radio value="compact">Compact</wa-radio><wa-radio value="balanced">Balanced</wa-radio><wa-radio value="roomy">Roomy</wa-radio></wa-radio-group>,
  'wa-rating': () => <wa-rating label="Component quality" value="4"></wa-rating>,
  'wa-select': () => <wa-select label="Priority" value="high" hint="Used to order the queue"><wa-option value="normal">Normal</wa-option><wa-option value="high">High</wa-option><wa-option value="urgent">Urgent</wa-option></wa-select>,
  'wa-slider': () => <wa-slider label="Completion" value="68" with-markers with-tooltip></wa-slider>,
  'wa-switch': () => <div class="wa-demo-stack"><wa-switch checked>Live updates</wa-switch><wa-switch>Compact navigation</wa-switch><wa-switch disabled>Managed setting</wa-switch></div>,
  'wa-textarea': () => <wa-textarea label="Release note" rows="4" value="Every free component has a focused catalog route." hint="Markdown is supported."></wa-textarea>,
  'wa-time-input': () => <wa-time-input label="Review time" value="14:30" hour-format="24" with-now></wa-time-input>,

  'wa-accordion': () => <wa-accordion><wa-accordion-item label="Theme contract" expanded>Override semantic tokens after the Kerf theme import.</wa-accordion-item><wa-accordion-item label="Component loading">Import only the modules the application renders.</wa-accordion-item></wa-accordion>,
  'wa-accordion-item': () => <wa-accordion><wa-accordion-item label="Focused accordion item" expanded>This item remains usable inside its required parent composition.</wa-accordion-item></wa-accordion>,
  'wa-card': () => <wa-card with-header with-footer><strong slot="header">Release readiness</strong><p>Production components, contracts, and browser checks stay together.</p><wa-button slot="footer" appearance="plain">View checklist</wa-button></wa-card>,
  'wa-details': () => <div class="wa-demo-stack"><wa-details summary="Compatibility notes" open>Web Awesome 3.12 uses the same semantic theme contract.</wa-details><wa-details summary="Collapsed details">Secondary information stays out of the main flow.</wa-details></div>,
  'wa-dialog': () => <div class="wa-demo-launcher"><wa-button variant="brand" data-action="show-wa-dialog">Open dialog</wa-button><span>The live dialog uses its native modal layer.</span><wa-dialog id="catalog-wa-dialog" label="Publish component library" with-footer><p>Review the version and release notes before publishing.</p><wa-button slot="footer" appearance="plain" data-action="hide-wa-dialog">Cancel</wa-button><wa-button slot="footer" variant="brand" data-action="hide-wa-dialog">Publish</wa-button></wa-dialog></div>,
  'wa-divider': () => <div class="wa-demo-divider"><section><strong>Ready</strong><span>12 components</span></section><wa-divider></wa-divider><section><strong>Needs review</strong><span>3 components</span></section></div>,
  'wa-drawer': () => <div class="wa-demo-launcher"><wa-button variant="brand" data-action="show-wa-drawer">Open drawer</wa-button><span>The drawer enters from the trailing edge.</span><wa-drawer id="catalog-wa-drawer" label="Inspector" with-footer><p>Theme and accessibility settings live here.</p><wa-button slot="footer" variant="brand" data-action="hide-wa-drawer">Done</wa-button></wa-drawer></div>,
  'wa-page': () => <wa-page class="wa-demo-page" mobile-breakpoint="0"><strong slot="header">Workspace</strong><a slot="navigation" href="#overview">Overview</a><strong slot="main-header">Component catalog</strong><p>A compact application shell inside the preview canvas.</p><small slot="footer">Kerf UI · Web Awesome</small></wa-page>,
  'wa-scroller': () => <wa-scroller class="wa-demo-scroller"><article>Foundation</article><article>Navigation</article><article>Controls</article><article>Feedback</article><article>Helpers</article></wa-scroller>,
  'wa-split-panel': () => <wa-split-panel class="wa-demo-split" position="42"><div slot="start"><strong>Navigator</strong><span>Resizable start panel</span></div><div slot="end"><strong>Canvas</strong><span>Resizable end panel</span></div></wa-split-panel>,

  'wa-breadcrumb': () => <wa-breadcrumb label="Current location"><wa-breadcrumb-item href="#workspace">Workspace</wa-breadcrumb-item><wa-breadcrumb-item href="#components">Components</wa-breadcrumb-item><wa-breadcrumb-item>Theme</wa-breadcrumb-item></wa-breadcrumb>,
  'wa-breadcrumb-item': () => <wa-breadcrumb label="Breadcrumb item states"><wa-breadcrumb-item href="#parent">Parent link</wa-breadcrumb-item><wa-breadcrumb-item>Current page</wa-breadcrumb-item></wa-breadcrumb>,
  'wa-pagination': () => <wa-pagination total="237" page-size="10" page="8" with-edges with-summary label="Component results"></wa-pagination>,
  'wa-tab': () => <wa-tab-group active="focused"><wa-tab panel="focused">Focused tab</wa-tab><wa-tab panel="neighbor">Neighbor</wa-tab><wa-tab-panel name="focused">Tabs stay paired with a named panel.</wa-tab-panel><wa-tab-panel name="neighbor">Neighboring content.</wa-tab-panel></wa-tab-group>,
  'wa-tab-group': () => <wa-tab-group active="tokens"><wa-tab panel="tokens">Tokens</wa-tab><wa-tab panel="coverage">Coverage</wa-tab><wa-tab panel="usage">Usage</wa-tab><wa-tab-panel name="tokens">Semantic values keep both systems coherent.</wa-tab-panel><wa-tab-panel name="coverage">Every free component has a route.</wa-tab-panel><wa-tab-panel name="usage">Import only the modules you render.</wa-tab-panel></wa-tab-group>,
  'wa-tab-panel': () => <wa-tab-group active="panel"><wa-tab panel="panel">Panel owner</wa-tab><wa-tab-panel name="panel">This focused panel is rendered inside its required tab group.</wa-tab-panel></wa-tab-group>,
  'wa-tree': () => <wa-tree selection="single"><wa-tree-item expanded>Components<wa-tree-item selected>Controls</wa-tree-item><wa-tree-item>Feedback</wa-tree-item></wa-tree-item><wa-tree-item>Foundations</wa-tree-item></wa-tree>,
  'wa-tree-item': () => <wa-tree selection="single"><wa-tree-item expanded>Parent item<wa-tree-item selected>Focused tree item</wa-tree-item><wa-tree-item>Sibling item</wa-tree-item></wa-tree-item></wa-tree>,

  'wa-badge': () => <div class="wa-demo-row"><wa-badge variant="neutral">Draft</wa-badge><wa-badge variant="brand">In review</wa-badge><wa-badge variant="success">Ready</wa-badge><wa-badge variant="warning">Attention</wa-badge><wa-badge variant="danger">Blocked</wa-badge></div>,
  'wa-callout': () => <div class="wa-demo-callouts"><wa-callout variant="brand">Changes are ready for review.</wa-callout><wa-callout variant="success">All checks passed.</wa-callout><wa-callout variant="warning">One dependency is behind.</wa-callout><wa-callout variant="danger">Publishing is blocked.</wa-callout></div>,
  'wa-progress-bar': () => <div class="wa-demo-form-stack"><wa-progress-bar value="72" label="Build progress">72%</wa-progress-bar><wa-progress-bar label="Checking dependencies"></wa-progress-bar></div>,
  'wa-progress-ring': () => <div class="wa-demo-row wa-demo-rings"><wa-progress-ring value="72" label="Build progress">72%</wa-progress-ring><wa-progress-ring label="Loading"></wa-progress-ring></div>,
  'wa-skeleton': () => <div class="wa-demo-skeleton"><wa-skeleton effect="sheen"></wa-skeleton><wa-skeleton effect="sheen"></wa-skeleton><wa-skeleton effect="sheen"></wa-skeleton></div>,
  'wa-spinner': () => <div class="wa-demo-row wa-demo-spinners"><wa-spinner aria-label="Loading small"></wa-spinner><wa-spinner aria-label="Loading medium"></wa-spinner><wa-spinner aria-label="Loading large"></wa-spinner></div>,
  'wa-tag': () => <div class="wa-demo-row"><wa-tag variant="brand" pill>Design system</wa-tag><wa-tag variant="success">Stable</wa-tag><wa-tag variant="warning" removable>Needs review</wa-tag></div>,
  'wa-toast': () => <div class="wa-demo-launcher"><wa-button variant="brand" data-action="show-wa-toast">Show toast</wa-button><span>The notification uses Web Awesome's programmatic stack API. Hot Sheet 2 currently renders its own app-level toast.</span><wa-toast id="catalog-wa-toast" placement="top-end"></wa-toast></div>,
  'wa-toast-item': () => <wa-toast-item class="wa-demo-toast-item" variant="success" duration="0">The component catalog is ready.</wa-toast-item>,
  'wa-tooltip': () => <div class="wa-demo-row"><wa-button id="catalog-tooltip-target" appearance="outlined">Hover or focus</wa-button><wa-tooltip for="catalog-tooltip-target">Uses the shared tooltip palette</wa-tooltip></div>,

  'wa-animated-image': () => <wa-animated-image class="wa-demo-media" src={demoImage} alt="Blue geometric Kerf preview"></wa-animated-image>,
  'wa-avatar': () => <div class="wa-demo-row wa-demo-avatars"><wa-avatar initials="KW" label="Kerf workspace"></wa-avatar><wa-avatar initials="UI" label="UI team"></wa-avatar><wa-avatar label="Fallback icon"></wa-avatar></div>,
  'wa-carousel': () => <wa-carousel class="wa-demo-carousel" navigation pagination mouse-dragging><wa-carousel-item><div>Foundation</div></wa-carousel-item><wa-carousel-item><div>Components</div></wa-carousel-item><wa-carousel-item><div>Patterns</div></wa-carousel-item></wa-carousel>,
  'wa-carousel-item': () => <wa-carousel class="wa-demo-carousel" navigation><wa-carousel-item><div>Focused carousel item</div></wa-carousel-item><wa-carousel-item><div>Neighboring item</div></wa-carousel-item></wa-carousel>,
  'wa-comparison': () => <wa-comparison class="wa-demo-comparison" position="55"><div slot="before">Before</div><div slot="after">After</div></wa-comparison>,
  'wa-icon': () => <div class="wa-demo-row wa-demo-icons"><wa-icon name="circle-question" library="system" label="Help"></wa-icon><wa-icon name="chevron-right" library="system" label="Next"></wa-icon><wa-icon name="play-circle" library="system" label="Play"></wa-icon></div>,
  'wa-markdown': () => <wa-markdown><script type="text/markdown">## Release ready

Semantic tokens keep **Kerf UI** and Web Awesome visually coherent.

- Independently importable
- Fully themed</script></wa-markdown>,
  'wa-qr-code': () => <wa-qr-code value="https://kerfjs.dev" label="Kerf website" size="160"></wa-qr-code>,
  'wa-zoomable-frame': () => <wa-zoomable-frame class="wa-demo-zoomable-frame" srcdoc={demoFrame} zoom="1" loading="eager"></wa-zoomable-frame>,

  'wa-animation': () => <wa-animation name="pulse"><div class="wa-demo-observed"><strong>Animation target</strong><span>Use the component API to play a preset or custom keyframes.</span></div></wa-animation>,
  'wa-format-bytes': () => <dl class="wa-demo-values"><div><dt>Binary</dt><dd><wa-format-bytes value="10485760"></wa-format-bytes></dd></div><div><dt>Decimal</dt><dd><wa-format-bytes value="10485760" unit="bit" display="long"></wa-format-bytes></dd></div></dl>,
  'wa-format-date': () => <dl class="wa-demo-values"><div><dt>Date</dt><dd><wa-format-date date="2026-09-11T12:00:00Z" month="long" day="numeric" year="numeric" time-zone="UTC"></wa-format-date></dd></div><div><dt>Time</dt><dd><wa-format-date date="2026-09-11T12:00:00Z" hour="numeric" minute="2-digit" time-zone="UTC"></wa-format-date></dd></div></dl>,
  'wa-format-number': () => <dl class="wa-demo-values"><div><dt>Number</dt><dd><wa-format-number value="1284"></wa-format-number></dd></div><div><dt>Percent</dt><dd><wa-format-number value="0.72" type="percent"></wa-format-number></dd></div><div><dt>Currency</dt><dd><wa-format-number value="49" type="currency" currency="USD"></wa-format-number></dd></div></dl>,
  'wa-include': () => <div class="wa-demo-include"><template id="catalog-include-source"><wa-callout variant="brand">Included from a local template fragment.</wa-callout></template><wa-include src="#catalog-include-source"></wa-include></div>,
  'wa-intersection-observer': () => <div class="wa-demo-observer" data-observer-demo="intersection">
    <div id="catalog-intersection-root" class="wa-demo-observer__viewport">
      <div class="wa-demo-observer__spacer">Target is below</div>
      <wa-intersection-observer root="catalog-intersection-root" threshold="0.6" intersect-class="is-intersecting"><div class="wa-demo-observed" data-observer-target><strong>Observed intersection target</strong><span>The helper emits when this surface enters or leaves its root.</span></div></wa-intersection-observer>
      <div class="wa-demo-observer__spacer">Target is above</div>
    </div>
    <div class="wa-demo-observer__controls"><button type="button" class="demo-button" data-action="toggle-wa-intersection">Reveal target</button><output data-observer-output aria-live="polite">Waiting for an intersection change</output></div>
  </div>,
  'wa-mutation-observer': () => <div class="wa-demo-observer" data-observer-demo="mutation">
    <wa-mutation-observer attr="data-revision" child-list><div class="wa-demo-observed" data-observer-target data-revision="0"><strong>Observed mutation target</strong><span data-observer-copy>The helper reports attribute and child-list changes.</span></div></wa-mutation-observer>
    <div class="wa-demo-observer__controls"><button type="button" class="demo-button" data-action="mutate-wa-target">Mutate target</button><output data-observer-output aria-live="polite">No mutations observed yet</output></div>
  </div>,
  'wa-popover': () => <div class="wa-demo-anchor"><wa-button id="catalog-popover-target" appearance="outlined">Toggle popover</wa-button><wa-popover for="catalog-popover-target" placement="bottom"><strong>Popover content</strong><p>Interactive content stays anchored to its trigger.</p><wa-button size="small">Action</wa-button></wa-popover></div>,
  'wa-popup': () => <wa-popup class="wa-demo-popup" active placement="bottom" distance="10" arrow><wa-button slot="anchor" appearance="outlined">Anchor</wa-button><div class="wa-demo-popup__panel">Low-level positioned content</div></wa-popup>,
  'wa-random-content': () => <div class="wa-demo-random"><wa-random-content mode="sequence" items="1" animation="fade"><article>Foundation tokens</article><article>Component primitives</article><article>Composition patterns</article></wa-random-content><wa-button appearance="outlined" data-action="randomize-wa-content">Show another</wa-button></div>,
  'wa-relative-time': () => <div class="wa-demo-inline-field"><span>Last updated</span><strong><wa-relative-time date="2026-09-10T12:00:00Z" format="long"></wa-relative-time></strong></div>,
  'wa-resize-observer': () => <div class="wa-demo-observer" data-observer-demo="resize">
    <wa-resize-observer><div class="wa-demo-observed wa-demo-observed--resizable" data-observer-target><strong>Observed resize target</strong><span>The helper emits when this preview changes dimensions.</span></div></wa-resize-observer>
    <div class="wa-demo-observer__controls"><button type="button" class="demo-button" data-action="resize-wa-target">Resize target</button><output data-observer-output aria-live="polite">Waiting for a resize</output></div>
  </div>,
};

export const webAwesomeComponentDemos: Record<WebAwesomeCatalogId, DemoRenderer> = Object.fromEntries(
  webAwesomeCatalog.map((entry) => [entry.id, () => <section class="wa-component-demo" data-demo={entry.id}>
    <header><span>Web Awesome 3.12 · {entry.category}</span><strong>{entry.name}</strong></header>
    <div class="wa-component-demo__specimen">{specimenRenderers[entry.id]()}</div>
  </section>]),
) as Record<WebAwesomeCatalogId, DemoRenderer>;

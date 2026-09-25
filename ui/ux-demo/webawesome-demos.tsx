import './webawesome-demos.css';
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

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Select } from '@kerfjs/ui/select';
import { Text } from '@kerfjs/ui/text';
import type { SafeHtml } from 'kerfjs';

import { webAwesomeCatalog, type WebAwesomeCatalogId } from './catalog.js';

const demoImage = new URL(
  './animated-image-demo.gif?no-inline',
  import.meta.url,
).href;
const demoFrame =
  '<!doctype html><style>body{margin:0;display:grid;min-height:100vh;place-items:center;font:16px system-ui;color:#1d1d1f;background:#f5f5f7}strong{color:#006edc}</style><strong>Zoomable Kerf content</strong>';
const trustedMarkdownDemo = `## Release ready

Semantic tokens keep **Kerf UI** and Web Awesome visually coherent.

- Independently importable
- Fully themed`;

type DemoRenderer = () => SafeHtml;

const specimenRenderers: Record<WebAwesomeCatalogId, DemoRenderer> = {
  'wa-button': () => (
    <div class="wa-demo-row">
      <wa-button variant="brand" appearance="accent">
        Primary
      </wa-button>
      <wa-button appearance="outlined">Secondary</wa-button>
      <wa-button variant="danger" appearance="filled">
        Destructive
      </wa-button>
    </div>
  ),
  'wa-button-group': () => (
    <wa-button-group label="Text alignment">
      <wa-button appearance="outlined">Start</wa-button>
      <wa-button appearance="outlined">Center</wa-button>
      <wa-button appearance="outlined">End</wa-button>
    </wa-button-group>
  ),
  'wa-copy-button': () => (
    <div class="wa-demo-inline-field">
      <code class="wa-demo-inline-field__code">npm i @kerfjs/ui</code>
      <wa-copy-button
        value="npm i @kerfjs/ui"
        copy-label="Copy install command"
      ></wa-copy-button>
    </div>
  ),
  'wa-dropdown': () => (
    <wa-dropdown>
      <wa-button slot="trigger" appearance="outlined" with-caret>
        Project actions
      </wa-button>
      <wa-dropdown-item>Rename</wa-dropdown-item>
      <wa-dropdown-item>Duplicate</wa-dropdown-item>
      <wa-dropdown-item variant="danger">Delete</wa-dropdown-item>
    </wa-dropdown>
  ),
  'wa-dropdown-item': () => (
    <div class="wa-demo-menu" role="menu">
      <wa-dropdown-item>Open</wa-dropdown-item>
      <wa-dropdown-item type="checkbox" checked>
        Pin to sidebar
      </wa-dropdown-item>
      <wa-dropdown-item disabled>Unavailable</wa-dropdown-item>
    </div>
  ),

  'wa-checkbox': () => (
    <div class="wa-demo-stack">
      <wa-checkbox checked>Include in release</wa-checkbox>
      <wa-checkbox indeterminate>Some child tasks complete</wa-checkbox>
      <wa-checkbox disabled>Locked setting</wa-checkbox>
    </div>
  ),
  'wa-checkbox-group': () => (
    <wa-checkbox-group
      label="Notifications"
      hint="Choose every channel you want to receive."
    >
      <wa-checkbox checked>Email summaries</wa-checkbox>
      <wa-checkbox>Desktop alerts</wa-checkbox>
      <wa-checkbox>Mentions only</wa-checkbox>
    </wa-checkbox-group>
  ),
  'wa-color-picker': () => (
    <wa-color-picker
      label="Workspace accent"
      value="#0088ff"
      format="hex"
      with-opacity
    ></wa-color-picker>
  ),
  'wa-input': () => (
    <div class="wa-demo-form-stack">
      <wa-input
        label="Project name"
        value="Component library"
        hint="Visible to collaborators"
        with-clear
      ></wa-input>
      <wa-input label="Search" placeholder="Filter components"></wa-input>
    </div>
  ),
  'wa-known-date': () => (
    <wa-known-date
      label="Release date"
      value="2026-09-11"
      hint="Enter the date you already know."
    ></wa-known-date>
  ),
  'wa-number-input': () => (
    <wa-number-input
      label="Review limit"
      value="12"
      min="1"
      max="50"
      hint="Between 1 and 50"
    ></wa-number-input>
  ),
  'wa-option': () => (
    <wa-select label="Option states" value="selected">
      <wa-option value="available">Available option</wa-option>
      <wa-option value="selected">Selected option</wa-option>
      <wa-option value="disabled" disabled>
        Disabled option
      </wa-option>
    </wa-select>
  ),
  'wa-otp-input': () => (
    <wa-otp-input
      label="Verification code"
      value="274816"
      format="### ###"
      hint="Six-digit code"
    ></wa-otp-input>
  ),
  'wa-radio': () => (
    <div class="wa-demo-stack" role="group" aria-label="Radio states">
      <wa-radio value="selected" checked>
        Selected choice
      </wa-radio>
      <wa-radio value="available">Available choice</wa-radio>
      <wa-radio value="disabled" disabled>
        Disabled choice
      </wa-radio>
    </div>
  ),
  'wa-radio-group': () => (
    <wa-radio-group label="Layout density" value="balanced">
      <wa-radio value="compact">Compact</wa-radio>
      <wa-radio value="balanced">Balanced</wa-radio>
      <wa-radio value="roomy">Roomy</wa-radio>
    </wa-radio-group>
  ),
  'wa-rating': () => (
    <wa-rating label="Component quality" value="4"></wa-rating>
  ),
  'wa-select': () => (
    <wa-select label="Priority" value="high" hint="Used to order the queue">
      <wa-option value="normal">Normal</wa-option>
      <wa-option value="high">High</wa-option>
      <wa-option value="urgent">Urgent</wa-option>
    </wa-select>
  ),
  'wa-slider': () => (
    <wa-slider
      label="Completion"
      value="68"
      with-markers
      with-tooltip
    ></wa-slider>
  ),
  'wa-switch': () => (
    <div class="wa-demo-stack">
      <wa-switch checked>Live updates</wa-switch>
      <wa-switch>Compact navigation</wa-switch>
      <wa-switch disabled>Managed setting</wa-switch>
    </div>
  ),
  'wa-textarea': () => (
    <wa-textarea
      label="Release note"
      rows="4"
      value="Every free component has a focused catalog route."
      hint="Markdown is supported."
    ></wa-textarea>
  ),
  'wa-time-input': () => (
    <wa-time-input
      label="Review time"
      value="14:30"
      hour-format="24"
      with-now
    ></wa-time-input>
  ),

  'wa-accordion': () => (
    <div class="wa-demo-stack">
      <wa-accordion appearance="sunken">
        <wa-accordion-item label="Sunken disclosure" expanded>
          The lowered surface follows the same framed geometry.
        </wa-accordion-item>
      </wa-accordion>
      <wa-accordion appearance="outlined">
        <wa-accordion-item label="Outlined disclosure" expanded>
          The framed header uses the roomier container inset.
        </wa-accordion-item>
      </wa-accordion>
      <wa-accordion appearance="plain">
        <wa-accordion-item label="Plain disclosure" expanded>
          Header and body align directly with surrounding content.
        </wa-accordion-item>
      </wa-accordion>
    </div>
  ),
  'wa-accordion-item': () => (
    <wa-accordion>
      <wa-accordion-item label="Focused accordion item" expanded>
        This item remains usable inside its required parent composition.
      </wa-accordion-item>
    </wa-accordion>
  ),
  'wa-card': () => (
    <wa-card appearance="sunken" with-header with-footer>
      <Text slot="header">
        <strong>Release readiness</strong>
      </Text>

      <Text>
        Production components, contracts, and browser checks stay together.
      </Text>

      <wa-button slot="footer" appearance="plain">
        View checklist
      </wa-button>
    </wa-card>
  ),
  'wa-details': () => (
    <div class="wa-demo-stack">
      <wa-details appearance="sunken" summary="Sunken compatibility notes" open>
        <Text>The lowered surface follows the same framed geometry.</Text>
      </wa-details>
      <wa-details
        appearance="outlined"
        summary="Outlined compatibility notes"
        open
      >
        <Text>The framed header uses the roomier container inset.</Text>
      </wa-details>
      <wa-details appearance="plain" summary="Plain compatibility notes" open>
        <Text>Header and body align directly with surrounding content.</Text>
      </wa-details>
    </div>
  ),
  'wa-dialog': () => (
    <div class="wa-demo-launcher">
      <wa-button variant="brand" data-action="show-wa-dialog">
        Open dialog
      </wa-button>
      <span class="wa-demo-launcher__copy">
        Footer actions replace the native header action.
      </span>
      <wa-dialog
        id="catalog-wa-dialog"
        class="hide-actions"
        label="Publish component library"
        with-footer
      >
        <Text>Review the version and release notes before publishing.</Text>
        <wa-button
          slot="footer"
          appearance="plain"
          data-action="hide-wa-dialog"
        >
          Cancel
        </wa-button>
        <wa-button slot="footer" variant="brand" data-action="hide-wa-dialog">
          Publish
        </wa-button>
      </wa-dialog>
    </div>
  ),
  'wa-divider': () => (
    <div class="wa-demo-divider">
      <section class="wa-demo-divider__section">
        <strong>Ready</strong>
        <span class="wa-demo-divider__detail">12 components</span>
      </section>
      <wa-divider></wa-divider>
      <section class="wa-demo-divider__section">
        <strong>Needs review</strong>
        <span class="wa-demo-divider__detail">3 components</span>
      </section>
    </div>
  ),
  'wa-drawer': () => (
    <div class="wa-demo-launcher">
      <wa-button variant="brand" data-action="show-wa-drawer">
        Open drawer
      </wa-button>
      <span class="wa-demo-launcher__copy">
        The drawer enters from the trailing edge.
      </span>
      <wa-drawer id="catalog-wa-drawer" label="Inspector" with-footer>
        <Text>Theme and accessibility settings live here.</Text>
        <wa-button slot="footer" variant="brand" data-action="hide-wa-drawer">
          Done
        </wa-button>
      </wa-drawer>
    </div>
  ),
  'wa-page': () => (
    <div class="wa-demo-page-frame">
      <wa-page mobile-breakpoint="0">
        <strong class="wa-demo-page__region" slot="header">
          Workspace
        </strong>
        <a class="wa-demo-page__navigation" slot="navigation" href="#overview">
          Overview
        </a>
        <strong class="wa-demo-page__region" slot="main-header">
          Component catalog
        </strong>
        <p class="wa-demo-page__region">
          A compact application shell inside the preview canvas.
        </p>
        <small class="wa-demo-page__region" slot="footer">
          Kerf UI · Web Awesome
        </small>
      </wa-page>
    </div>
  ),
  'wa-scroller': () => (
    <div class="wa-demo-scroller-frame">
      <wa-scroller>
        <article class="wa-demo-scroller__card">Foundation</article>
        <article class="wa-demo-scroller__card">Navigation</article>
        <article class="wa-demo-scroller__card">Controls</article>
        <article class="wa-demo-scroller__card">Feedback</article>
        <article class="wa-demo-scroller__card">Helpers</article>
      </wa-scroller>
    </div>
  ),
  'wa-split-panel': () => (
    <div class="wa-demo-split-frame">
      <wa-split-panel position="42">
        <div class="wa-demo-split__pane" slot="start">
          <strong>Navigator</strong>
          <span class="wa-demo-split__detail">Resizable start panel</span>
        </div>
        <div class="wa-demo-split__pane" slot="end">
          <strong>Canvas</strong>
          <span class="wa-demo-split__detail">Resizable end panel</span>
        </div>
      </wa-split-panel>
    </div>
  ),

  'wa-breadcrumb': () => (
    <wa-breadcrumb label="Current location">
      <wa-breadcrumb-item href="#workspace">Workspace</wa-breadcrumb-item>
      <wa-breadcrumb-item href="#components">Components</wa-breadcrumb-item>
      <wa-breadcrumb-item>Theme</wa-breadcrumb-item>
    </wa-breadcrumb>
  ),
  'wa-breadcrumb-item': () => (
    <wa-breadcrumb label="Breadcrumb item states">
      <wa-breadcrumb-item href="#parent">Parent link</wa-breadcrumb-item>
      <wa-breadcrumb-item>Current page</wa-breadcrumb-item>
    </wa-breadcrumb>
  ),
  'wa-pagination': () => (
    <wa-pagination
      total="237"
      page-size="10"
      page="8"
      with-edges
      with-summary
      label="Component results"
    ></wa-pagination>
  ),
  'wa-tab': () => (
    <wa-tab-group active="focused">
      <wa-tab panel="focused">Focused tab</wa-tab>
      <wa-tab panel="neighbor">Neighbor</wa-tab>
      <wa-tab-panel name="focused">
        Tabs stay paired with a named panel.
      </wa-tab-panel>
      <wa-tab-panel name="neighbor">Neighboring content.</wa-tab-panel>
    </wa-tab-group>
  ),
  'wa-tab-group': () => (
    <wa-tab-group active="tokens">
      <wa-tab panel="tokens">Tokens</wa-tab>
      <wa-tab panel="coverage">Coverage</wa-tab>
      <wa-tab panel="usage">Usage</wa-tab>
      <wa-tab-panel name="tokens">
        Semantic values keep both systems coherent.
      </wa-tab-panel>
      <wa-tab-panel name="coverage">
        Every free component has a route.
      </wa-tab-panel>
      <wa-tab-panel name="usage">
        Import only the modules you render.
      </wa-tab-panel>
    </wa-tab-group>
  ),
  'wa-tab-panel': () => (
    <wa-tab-group active="panel">
      <wa-tab panel="panel">Panel owner</wa-tab>
      <wa-tab-panel name="panel">
        This focused panel is rendered inside its required tab group.
      </wa-tab-panel>
    </wa-tab-group>
  ),
  'wa-tree': () => (
    <wa-tree selection="single">
      <wa-tree-item expanded>
        Components<wa-tree-item selected>Controls</wa-tree-item>
        <wa-tree-item>Feedback</wa-tree-item>
      </wa-tree-item>
      <wa-tree-item>Foundations</wa-tree-item>
    </wa-tree>
  ),
  'wa-tree-item': () => (
    <wa-tree selection="single">
      <wa-tree-item expanded>
        Parent item<wa-tree-item selected>Focused tree item</wa-tree-item>
        <wa-tree-item>Sibling item</wa-tree-item>
      </wa-tree-item>
    </wa-tree>
  ),

  'wa-badge': () => (
    <div class="wa-demo-labeled-stack">
      <span class="wa-demo-labeled-stack__label">
        Status badges · filled pill
      </span>
      <div class="wa-demo-row">
        <wa-badge variant="neutral" appearance="filled" pill="pill">
          Draft
        </wa-badge>
        <wa-badge variant="brand" appearance="filled" pill="pill">
          In review
        </wa-badge>
        <wa-badge variant="success" appearance="filled" pill="pill">
          Ready
        </wa-badge>
        <wa-badge variant="warning" appearance="filled" pill="pill">
          Attention
        </wa-badge>
        <wa-badge variant="danger" appearance="filled" pill="pill">
          Blocked
        </wa-badge>
      </div>
      <span class="wa-demo-labeled-stack__label">Accent pill</span>
      <div class="wa-demo-row">
        <wa-badge variant="neutral" appearance="accent" pill="pill">
          Neutral
        </wa-badge>
        <wa-badge variant="brand" appearance="accent" pill="pill">
          Brand
        </wa-badge>
        <wa-badge variant="success" appearance="accent" pill="pill">
          Success
        </wa-badge>
        <wa-badge variant="warning" appearance="accent" pill="pill">
          Warning
        </wa-badge>
        <wa-badge variant="danger" appearance="accent" pill="pill">
          Danger
        </wa-badge>
      </div>
      <span class="wa-demo-labeled-stack__label">Filled outlined pill</span>
      <div class="wa-demo-row">
        <wa-badge variant="neutral" appearance="filled-outlined" pill="pill">
          Neutral
        </wa-badge>
        <wa-badge variant="brand" appearance="filled-outlined" pill="pill">
          Brand
        </wa-badge>
        <wa-badge variant="success" appearance="filled-outlined" pill="pill">
          Success
        </wa-badge>
        <wa-badge variant="warning" appearance="filled-outlined" pill="pill">
          Warning
        </wa-badge>
        <wa-badge variant="danger" appearance="filled-outlined" pill="pill">
          Danger
        </wa-badge>
      </div>
    </div>
  ),
  'wa-callout': () => (
    <div class="wa-demo-callouts">
      <wa-callout variant="brand">Changes are ready for review.</wa-callout>
      <wa-callout variant="success">All checks passed.</wa-callout>
      <wa-callout variant="warning">One dependency is behind.</wa-callout>
      <wa-callout variant="danger">Publishing is blocked.</wa-callout>
    </div>
  ),
  'wa-progress-bar': () => (
    <div class="wa-demo-form-stack">
      <wa-progress-bar value="72" label="Build progress">
        72%
      </wa-progress-bar>
      <wa-progress-bar label="Checking dependencies"></wa-progress-bar>
    </div>
  ),
  'wa-progress-ring': () => (
    <div class="wa-demo-row wa-demo-ring-group">
      <wa-progress-ring value="72" label="Build progress">
        72%
      </wa-progress-ring>
      <wa-progress-ring label="Loading"></wa-progress-ring>
    </div>
  ),
  'wa-skeleton': () => (
    <div class="wa-demo-skeleton">
      <div class="wa-demo-skeleton__bar-frame wa-demo-skeleton__bar-frame--heading">
        <wa-skeleton effect="sheen"></wa-skeleton>
      </div>
      <div class="wa-demo-skeleton__bar-frame">
        <wa-skeleton effect="sheen"></wa-skeleton>
      </div>
      <div class="wa-demo-skeleton__bar-frame wa-demo-skeleton__bar-frame--closing">
        <wa-skeleton effect="sheen"></wa-skeleton>
      </div>
    </div>
  ),
  'wa-spinner': () => (
    <div class="wa-demo-row">
      <span class="wa-demo-spinner-frame wa-demo-spinner-frame--small">
        <wa-spinner aria-label="Loading small"></wa-spinner>
      </span>
      <span class="wa-demo-spinner-frame wa-demo-spinner-frame--medium">
        <wa-spinner aria-label="Loading medium"></wa-spinner>
      </span>
      <span class="wa-demo-spinner-frame wa-demo-spinner-frame--large">
        <wa-spinner aria-label="Loading large"></wa-spinner>
      </span>
    </div>
  ),
  'wa-tag': () => (
    <div class="wa-demo-labeled-stack">
      <span class="wa-demo-labeled-stack__label">Tags · rounded rectangle</span>
      <div class="wa-demo-row">
        <wa-tag variant="neutral">frontend</wa-tag>
        <wa-tag variant="brand">design-system</wa-tag>
        <wa-tag variant="success">stable</wa-tag>
        <wa-tag variant="warning" with-remove="with-remove">
          needs-review
        </wa-tag>
      </div>
      <small class="wa-demo-labeled-stack__note">
        Removal is owned by the feature handling the bubbling{' '}
        <code>wa-remove</code> event.
      </small>
    </div>
  ),
  'wa-toast': () => (
    <div class="wa-demo-launcher">
      <wa-button variant="brand" data-action="show-wa-toast">
        Show toast
      </wa-button>
      <span class="wa-demo-launcher__copy">
        The notification uses Web Awesome's programmatic stack API. Hot Sheet 2
        currently renders its own app-level toast.
      </span>
      <wa-toast id="catalog-wa-toast" placement="top-end"></wa-toast>
    </div>
  ),
  'wa-toast-item': () => (
    <div class="wa-demo-toast-item-frame">
      <wa-toast-item variant="success" duration="0">
        The component catalog is ready.
      </wa-toast-item>
    </div>
  ),
  'wa-tooltip': () => (
    <div class="wa-demo-labeled-stack">
      <span class="wa-demo-labeled-stack__label">Kerf default · no arrow</span>
      <div class="wa-demo-row">
        <wa-button id="catalog-tooltip-target" appearance="outlined">
          Hover or focus
        </wa-button>
        <wa-tooltip for="catalog-tooltip-target">
          Uses the shared tooltip palette
        </wa-tooltip>
      </div>
      <small class="wa-demo-labeled-stack__note">
        Override <code>--wa-tooltip-arrow-size</code> or add{' '}
        <code>without-arrow</code> explicitly when local intent should be
        self-documenting.
      </small>
    </div>
  ),

  'wa-animated-image': () => (
    <div class="wa-demo-media-frame">
      <wa-animated-image
        src={demoImage}
        alt="Blue geometric Kerf preview"
      ></wa-animated-image>
    </div>
  ),
  'wa-avatar': () => (
    <div class="wa-demo-row wa-demo-avatar-group">
      <wa-avatar initials="KW" label="Kerf workspace"></wa-avatar>
      <wa-avatar initials="UI" label="UI team"></wa-avatar>
      <wa-avatar label="Fallback icon"></wa-avatar>
    </div>
  ),
  'wa-carousel': () => (
    <div class="wa-demo-carousel-frame">
      <wa-carousel navigation pagination mouse-dragging>
        <wa-carousel-item>
          <div class="wa-demo-carousel__slide">Foundation</div>
        </wa-carousel-item>
        <wa-carousel-item>
          <div class="wa-demo-carousel__slide">Components</div>
        </wa-carousel-item>
        <wa-carousel-item>
          <div class="wa-demo-carousel__slide">Patterns</div>
        </wa-carousel-item>
      </wa-carousel>
    </div>
  ),
  'wa-carousel-item': () => (
    <div class="wa-demo-carousel-frame">
      <wa-carousel navigation>
        <wa-carousel-item>
          <div class="wa-demo-carousel__slide">Focused carousel item</div>
        </wa-carousel-item>
        <wa-carousel-item>
          <div class="wa-demo-carousel__slide">Neighboring item</div>
        </wa-carousel-item>
      </wa-carousel>
    </div>
  ),
  'wa-comparison': () => (
    <div class="wa-demo-comparison-frame">
      <wa-comparison position="55">
        <div
          class="wa-demo-comparison__side wa-demo-comparison__side--before"
          slot="before"
        >
          Before
        </div>
        <div
          class="wa-demo-comparison__side wa-demo-comparison__side--after"
          slot="after"
        >
          After
        </div>
      </wa-comparison>
    </div>
  ),
  'wa-icon': () => (
    <div class="wa-demo-row wa-demo-icon-group">
      <wa-icon name="circle-question" library="system" label="Help"></wa-icon>
      <wa-icon name="chevron-right" library="system" label="Next"></wa-icon>
      <wa-icon name="play-circle" library="system" label="Play"></wa-icon>
    </div>
  ),
  'wa-markdown': () => (
    <div class="wa-demo-labeled-stack">
      <span class="wa-demo-labeled-stack__label">
        Trusted static Markdown · client-rendered
      </span>
      <wa-markdown>
        <script type="text/markdown">{trustedMarkdownDemo}</script>
      </wa-markdown>
      <small class="wa-demo-labeled-stack__note">
        Do not pass unsanitized or untrusted Markdown to this component.
      </small>
    </div>
  ),
  'wa-qr-code': () => (
    <wa-qr-code
      value="https://kerfjs.dev"
      label="Kerf website"
      size="160"
    ></wa-qr-code>
  ),
  'wa-zoomable-frame': () => (
    <div class="wa-demo-zoomable-frame-shell">
      <wa-zoomable-frame
        srcdoc={demoFrame}
        zoom="1"
        loading="eager"
      ></wa-zoomable-frame>
    </div>
  ),

  'wa-animation': () => (
    <div class="wa-demo-animation" data-animation-demo>
      <section
        class="wa-demo-animation__preview"
        aria-label="Animation preview"
      >
        <wa-animation
          name="bounce"
          duration="900"
          easing="ease-in-out"
          iterations="1"
        >
          <div class="wa-demo-animation__target">
            <strong class="wa-demo-animation__target-title">Kerf</strong>
            <span class="wa-demo-animation__target-detail">
              Animation target
            </span>
          </div>
        </wa-animation>
        <output
          class="wa-demo-animation__status"
          data-animation-output
          aria-live="polite"
        >
          Ready to play
        </output>
      </section>
      <section
        class="wa-demo-animation__settings"
        aria-label="Animation settings"
      >
        <Select
          name="animation-preset"
          value="bounce"
          label="Preset"
          choices={[
            { value: 'bounce', label: 'Bounce' },
            { value: 'fadeIn', label: 'Fade in' },
            { value: 'jello', label: 'Jello' },
            { value: 'shakeX', label: 'Shake horizontally' },
          ]}
        />
        <Select
          name="animation-easing"
          value="ease-in-out"
          label="Easing"
          choices={[
            { value: 'linear', label: 'Linear' },
            { value: 'ease', label: 'Ease' },
            { value: 'ease-in', label: 'Ease in' },
            { value: 'ease-out', label: 'Ease out' },
            { value: 'ease-in-out', label: 'Ease in and out' },
          ]}
        />
        <label class="wa-demo-animation__range">
          <span class="wa-demo-animation__range-label">
            Duration{' '}
            <output
              class="wa-demo-animation__range-output"
              data-animation-duration
            >
              900 ms
            </output>
          </span>
          <input
            class="wa-demo-animation__range-input"
            type="range"
            name="animation-duration"
            min="250"
            max="2000"
            step="50"
            value="900"
          />
        </label>
        <label class="wa-demo-animation__range">
          <span class="wa-demo-animation__range-label">
            Playback rate{' '}
            <output class="wa-demo-animation__range-output" data-animation-rate>
              1×
            </output>
          </span>
          <input
            class="wa-demo-animation__range-input"
            type="range"
            name="animation-rate"
            min="0.5"
            max="2"
            step="0.25"
            value="1"
          />
        </label>
        <div class="wa-demo-animation__actions">
          <wa-button
            variant="brand"
            appearance="accent"
            data-action="play-wa-animation"
          >
            Play
          </wa-button>
          <wa-button data-action="pause-wa-animation">Pause</wa-button>
          <wa-button data-action="finish-wa-animation">Finish</wa-button>
          <wa-button data-action="cancel-wa-animation">Cancel</wa-button>
        </div>
      </section>
    </div>
  ),
  'wa-format-bytes': () => (
    <dl class="wa-demo-values">
      <div class="wa-demo-values__row">
        <dt class="wa-demo-values__term">Binary</dt>
        <dd class="wa-demo-values__description">
          <wa-format-bytes value="10485760"></wa-format-bytes>
        </dd>
      </div>
      <div class="wa-demo-values__row">
        <dt class="wa-demo-values__term">Decimal</dt>
        <dd class="wa-demo-values__description">
          <wa-format-bytes
            value="10485760"
            unit="bit"
            display="long"
          ></wa-format-bytes>
        </dd>
      </div>
    </dl>
  ),
  'wa-format-date': () => (
    <dl class="wa-demo-values">
      <div class="wa-demo-values__row">
        <dt class="wa-demo-values__term">Date</dt>
        <dd class="wa-demo-values__description">
          <wa-format-date
            date="2026-09-11T12:00:00Z"
            month="long"
            day="numeric"
            year="numeric"
            time-zone="UTC"
          ></wa-format-date>
        </dd>
      </div>
      <div class="wa-demo-values__row">
        <dt class="wa-demo-values__term">Time</dt>
        <dd class="wa-demo-values__description">
          <wa-format-date
            date="2026-09-11T12:00:00Z"
            hour="numeric"
            minute="2-digit"
            time-zone="UTC"
          ></wa-format-date>
        </dd>
      </div>
    </dl>
  ),
  'wa-format-number': () => (
    <dl class="wa-demo-values">
      <div class="wa-demo-values__row">
        <dt class="wa-demo-values__term">Number</dt>
        <dd class="wa-demo-values__description">
          <wa-format-number value="1284"></wa-format-number>
        </dd>
      </div>
      <div class="wa-demo-values__row">
        <dt class="wa-demo-values__term">Percent</dt>
        <dd class="wa-demo-values__description">
          <wa-format-number value="0.72" type="percent"></wa-format-number>
        </dd>
      </div>
      <div class="wa-demo-values__row">
        <dt class="wa-demo-values__term">Currency</dt>
        <dd class="wa-demo-values__description">
          <wa-format-number
            value="49"
            type="currency"
            currency="USD"
          ></wa-format-number>
        </dd>
      </div>
    </dl>
  ),
  'wa-include': () => (
    <div class="wa-demo-include">
      <template id="catalog-include-source">
        <wa-callout variant="brand">
          Included from a local template fragment.
        </wa-callout>
      </template>
      <wa-include src="#catalog-include-source"></wa-include>
    </div>
  ),
  'wa-intersection-observer': () => (
    <div class="wa-demo-observer" data-observer-demo="intersection">
      <div id="catalog-intersection-root" class="wa-demo-observer__viewport">
        <div class="wa-demo-observer__spacer">Target is below</div>
        <wa-intersection-observer
          root="catalog-intersection-root"
          threshold="0.6"
          intersect-class="is-intersecting"
        >
          <div class="wa-demo-observed" data-observer-target>
            <strong>Observed intersection target</strong>
            <span class="wa-demo-observed__detail">
              The helper emits when this surface enters or leaves its root.
            </span>
          </div>
        </wa-intersection-observer>
        <div class="wa-demo-observer__spacer">Target is above</div>
      </div>
      <div class="wa-demo-observer__controls">
        <wa-button data-action="toggle-wa-intersection">
          Reveal target
        </wa-button>
        <output
          class="wa-demo-observer__output"
          data-observer-output
          aria-live="polite"
        >
          Waiting for an intersection change
        </output>
      </div>
    </div>
  ),
  'wa-mutation-observer': () => (
    <div class="wa-demo-observer" data-observer-demo="mutation">
      <wa-mutation-observer attr="data-revision" child-list>
        <div class="wa-demo-observed" data-observer-target data-revision="0">
          <strong>Observed mutation target</strong>
          <span class="wa-demo-observed__detail" data-observer-copy>
            The helper reports attribute and child-list changes.
          </span>
        </div>
      </wa-mutation-observer>
      <div class="wa-demo-observer__controls">
        <wa-button data-action="mutate-wa-target">Mutate target</wa-button>
        <output
          class="wa-demo-observer__output"
          data-observer-output
          aria-live="polite"
        >
          No mutations observed yet
        </output>
      </div>
    </div>
  ),
  'wa-popover': () => (
    <div class="wa-demo-anchor">
      <span class="wa-demo-anchor__label">Kerf default · no arrow</span>
      <wa-button id="catalog-popover-target" appearance="outlined">
        Toggle popover
      </wa-button>
      <wa-popover for="catalog-popover-target" placement="bottom">
        <strong>Popover content</strong>
        <p class="wa-demo-popover__copy">
          Interactive content stays anchored to its trigger.
        </p>
        <wa-button size="small">Action</wa-button>
      </wa-popover>
      <small class="wa-demo-anchor__note">
        Override <code>--kui-wa-popover-arrow-size</code> for a scope or{' '}
        <code>--arrow-size</code> on one popover to restore a pointer.
      </small>
    </div>
  ),
  'wa-popup': () => (
    <div class="wa-demo-popup-frame">
      <wa-popup active placement="bottom" distance="10" arrow>
        <wa-button slot="anchor" appearance="outlined">
          Anchor
        </wa-button>
        <div class="wa-demo-popup__panel">Low-level positioned content</div>
      </wa-popup>
    </div>
  ),
  'wa-random-content': () => (
    <div class="wa-demo-random">
      <wa-random-content mode="sequence" items="1" animation="fade">
        <article class="wa-demo-random__card">Foundation tokens</article>
        <article class="wa-demo-random__card">Component primitives</article>
        <article class="wa-demo-random__card">Composition patterns</article>
      </wa-random-content>
      <wa-button appearance="outlined" data-action="randomize-wa-content">
        Show another
      </wa-button>
    </div>
  ),
  'wa-relative-time': () => (
    <div class="wa-demo-inline-field">
      <span>Last updated</span>
      <strong>
        <wa-relative-time
          date="2026-09-10T12:00:00Z"
          format="long"
        ></wa-relative-time>
      </strong>
    </div>
  ),
  'wa-resize-observer': () => (
    <div class="wa-demo-observer" data-observer-demo="resize">
      <div class="wa-demo-observer__resize-frame">
        <wa-resize-observer>
          <div
            class="wa-demo-observed wa-demo-observed--resizable"
            data-observer-target
          >
            <strong>Observed resize target</strong>
            <span class="wa-demo-observed__detail">
              The helper emits when this preview changes dimensions.
            </span>
          </div>
        </wa-resize-observer>
      </div>
      <div class="wa-demo-observer__controls">
        <wa-button data-action="resize-wa-target">Resize target</wa-button>
        <output
          class="wa-demo-observer__output"
          data-observer-output
          aria-live="polite"
        >
          Waiting for a resize
        </output>
      </div>
    </div>
  ),
};

export const webAwesomeComponentDemos: Record<
  WebAwesomeCatalogId,
  DemoRenderer
> = Object.fromEntries(
  webAwesomeCatalog.map((entry) => [
    entry.id,
    () => (
      <CatalogExampleStack
        label={`${entry.name} Web Awesome demo`}
        rootAttributes={{ 'data-demo': entry.id }}
      >
        <CatalogExample
          label={entry.name}
          note={`Web Awesome 3.12 · ${entry.category}`}
        >
          {specimenRenderers[entry.id]()}
        </CatalogExample>
      </CatalogExampleStack>
    ),
  ]),
) as Record<WebAwesomeCatalogId, DemoRenderer>;

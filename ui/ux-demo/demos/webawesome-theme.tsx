export function WebAwesomeThemeDemo() {
  return <div class="webawesome-theme-demo" data-demo="webawesome-theme">
    <section>
      <header><p>Actions</p><span>Buttons, groups, menus, and copy feedback</span></header>
      <div class="webawesome-theme-demo__row">
        <wa-button variant="brand" appearance="accent">Primary</wa-button>
        <wa-button appearance="outlined">Secondary</wa-button>
        <wa-button variant="danger" appearance="filled">Destructive</wa-button>
        <wa-button-group label="View density"><wa-button appearance="outlined">Comfortable</wa-button><wa-button appearance="outlined">Compact</wa-button></wa-button-group>
        <wa-dropdown><wa-button slot="trigger" appearance="plain" with-caret>Popup menu</wa-button><wa-dropdown-item>Rename</wa-dropdown-item><wa-dropdown-item>Duplicate</wa-dropdown-item></wa-dropdown>
        <wa-copy-button value="npm i @kerfjs/ui" copy-label="Copy install command"></wa-copy-button>
      </div>
    </section>

    <section>
      <header><p>Forms</p><span>Shared form geometry, focus, and semantic states</span></header>
      <div class="webawesome-theme-demo__forms">
        <wa-input label="Project name" value="Component library" hint="Visible to collaborators"></wa-input>
        <wa-number-input label="Review limit" value="12" min="1" max="50"></wa-number-input>
        <wa-select label="Priority" value="high"><wa-option value="normal">Normal</wa-option><wa-option value="high">High</wa-option></wa-select>
        <wa-textarea label="Release note" rows="3" value="Theme every free component through shared semantic tokens."></wa-textarea>
        <wa-checkbox-group label="Notifications"><wa-checkbox checked>Email summaries</wa-checkbox><wa-checkbox>Desktop alerts</wa-checkbox></wa-checkbox-group>
        <wa-radio-group label="Layout" value="balanced"><wa-radio value="compact">Compact</wa-radio><wa-radio value="balanced">Balanced</wa-radio></wa-radio-group>
        <wa-slider label="Completion" value="68" with-markers with-tooltip></wa-slider>
        <div class="webawesome-theme-demo__compact-controls"><wa-switch checked>Live updates</wa-switch><wa-rating label="Quality" value="4"></wa-rating><wa-color-picker label="Accent" value="#0088ff"></wa-color-picker></div>
      </div>
    </section>

    <section>
      <header><p>Structure and navigation</p><span>Panels and navigation use the same borders and surfaces</span></header>
      <div class="webawesome-theme-demo__columns">
        <div class="webawesome-theme-demo__stack">
          <wa-card with-header><strong slot="header">Release readiness</strong><p>Production components, contracts, and browser checks stay together.</p><wa-button slot="footer" appearance="plain">View checklist</wa-button></wa-card>
          <wa-accordion><wa-accordion-item label="Theme contract" expanded>Override semantic <code>--wa-*</code> values after the Kerf theme import.</wa-accordion-item><wa-accordion-item label="Component loading">Import only the Web Awesome component modules the app renders.</wa-accordion-item></wa-accordion>
          <wa-details summary="Compatibility notes">The theme targets Web Awesome 3.12 and remains an optional package entry.</wa-details>
        </div>
        <div class="webawesome-theme-demo__stack">
          <wa-breadcrumb label="Location"><wa-breadcrumb-item href="#">Workspace</wa-breadcrumb-item><wa-breadcrumb-item href="#">Components</wa-breadcrumb-item><wa-breadcrumb-item>Theme</wa-breadcrumb-item></wa-breadcrumb>
          <wa-tab-group active="tokens"><wa-tab panel="tokens">Tokens</wa-tab><wa-tab panel="coverage">Coverage</wa-tab><wa-tab-panel name="tokens">Semantic values style Kerf and Web Awesome together.</wa-tab-panel><wa-tab-panel name="coverage">Visual controls inherit the complete theme.</wa-tab-panel></wa-tab-group>
          <wa-tree selection="single"><wa-tree-item expanded>Components<wa-tree-item selected>Controls</wa-tree-item><wa-tree-item>Feedback</wa-tree-item></wa-tree-item><wa-tree-item>Foundations</wa-tree-item></wa-tree>
          <wa-scroller class="webawesome-theme-demo__scroller"><span>Scrollable item 1</span><span>Scrollable item 2</span><span>Scrollable item 3</span><span>Scrollable item 4</span></wa-scroller>
        </div>
      </div>
    </section>

    <section>
      <header><p>Feedback and data</p><span>Brand and status variants stay meaningful in both appearances</span></header>
      <div class="webawesome-theme-demo__stack">
        <div class="webawesome-theme-demo__row"><wa-badge variant="neutral" pill="pill">Draft</wa-badge><wa-badge variant="brand" pill="pill">In review</wa-badge><wa-badge variant="success" pill="pill">Ready</wa-badge><wa-badge variant="warning" pill="pill">Needs attention</wa-badge><wa-badge variant="danger" pill="pill">Blocked</wa-badge></div>
        <div class="webawesome-theme-demo__callouts"><wa-callout variant="brand">Changes are ready for review.</wa-callout><wa-callout variant="success">All checks passed.</wa-callout><wa-callout variant="warning">One dependency is behind.</wa-callout><wa-callout variant="danger">Publishing is blocked.</wa-callout></div>
        <div class="webawesome-theme-demo__progress"><wa-progress-bar value="72" label="Build progress"></wa-progress-bar><wa-progress-ring value="72" label="Build progress">72%</wa-progress-ring><wa-spinner aria-label="Loading"></wa-spinner><wa-skeleton effect="sheen"></wa-skeleton></div>
        <div class="webawesome-theme-demo__row"><wa-tag variant="brand">design-system</wa-tag><wa-tag variant="success">stable</wa-tag><wa-button id="theme-tooltip-target" appearance="plain">Hover for details</wa-button><wa-tooltip for="theme-tooltip-target">Uses the shared tooltip palette</wa-tooltip></div>
      </div>
    </section>

    <section>
      <header><p>Media and formatting</p><span>Non-control components inherit type and foreground semantics</span></header>
      <div class="webawesome-theme-demo__media"><wa-avatar initials="KW" label="Kerf workspace"></wa-avatar><wa-qr-code value="https://kerfjs.dev" label="Kerf website" size="96"></wa-qr-code><dl><div><dt>Storage</dt><dd><wa-format-bytes value="10485760"></wa-format-bytes></dd></div><div><dt>Count</dt><dd><wa-format-number value="1284"></wa-format-number></dd></div><div><dt>Date</dt><dd><wa-format-date date="2026-09-11T12:00:00Z" month="short" day="numeric" year="numeric" time-zone="UTC"></wa-format-date></dd></div><div><dt>Updated</dt><dd><wa-relative-time date="2026-09-10T12:00:00Z" format="long"></wa-relative-time></dd></div></dl></div>
    </section>
  </div>;
}

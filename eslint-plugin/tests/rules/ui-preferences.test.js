import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createRuleTester } from '../helpers/rule-tester.js';
import { appFile, appRoot } from '../helpers/ui-app-fixture.js';
import { uiSettings } from '../helpers/ui-contract-fixture.js';

import preferences from '../../lib/rules/ui-preferences.js';

const tester = createRuleTester();
const settings = uiSettings();

tester.run('ui-preferences', preferences, {
  valid: [
    {
      code: "import { SegmentedControl as Choice } from '@kerfjs/ui'; <Choice />;",
      settings,
    },
    {
      code: "import { WaButtonGroup } from 'other-ui'; <WaButtonGroup />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import { WaButtonGroup as Choice } from '@kerfjs/ui'; <Choice />;",
      settings,
      errors: [{ messageId: 'preferred' }],
    },
    {
      code: "import * as UI from '@kerfjs/ui'; <UI.WaButtonGroup />;",
      settings,
      errors: [{ messageId: 'preferred' }],
    },
  ],
});

// KF-M2F5K4: a Web Awesome appearance-scope class does nothing without its
// theme, so KUI-L302 points at the Kerf scope instead.
tester.run('ui-preferences Web Awesome scope classes', preferences, {
  valid: [
    { code: '<div className="kui-dark card" />;', settings },
    { code: '<div class="wa-darkish wa-light-ish" />;', settings },
    { code: '<div className={theme} />;', settings },
    { code: '<div title="wa-dark" />;', settings },
  ],
  invalid: [
    {
      code: '<div className="wa-dark" />;',
      settings,
      errors: [{ messageId: 'scope', data: { name: 'wa-dark' } }],
    },
    {
      code: '<section class="panel wa-invert" />;',
      settings,
      errors: [{ messageId: 'scope', data: { name: 'wa-invert' } }],
    },
    {
      code: "<div className={'wa-light'} />;",
      settings,
      errors: [{ messageId: 'scope', data: { name: 'wa-light' } }],
    },
    {
      code: '<div className={`wa-theme-default ${extra}`} />;',
      settings,
      errors: [{ messageId: 'scope', data: { name: 'wa-theme-default' } }],
    },
  ],
});

// KF-JPE38T: a raw native form navigates on submit; KUI-L303 points at the
// Kerf UI Form, whose wireForms contract cancels the navigation.
tester.run('ui-preferences raw form', preferences, {
  valid: [
    {
      code: "import { Form } from '@kerfjs/ui/form'; <Form action='save' />;",
      settings,
    },
    { code: '<formula />;', settings },
    { code: '<div role="form" />;', settings },
  ],
  invalid: [
    {
      code: '<form onsubmit="x"><input /></form>;',
      settings,
      errors: [{ messageId: 'rawForm' }],
    },
    {
      code: '<section><form /></section>;',
      settings,
      errors: [{ messageId: 'rawForm' }],
    },
  ],
});

// The shipped catalogs plus the shipped package-default profile: every
// Discouraged Web Awesome element authored directly as a JSX tag reports
// KUI-L301, while a declared wrapper's own source may render what it wraps.
const shippedDefaultsSettings = uiSettings({
  catalog: undefined,
  selectionCatalog: undefined,
  catalogPath: join(
    import.meta.dirname,
    '../../../ui/ai/component-composition.json',
  ),
  selectionCatalogPath: join(
    import.meta.dirname,
    '../../../ui/ai/component-catalog.json',
  ),
  profile: undefined,
  workspaceRoot: appRoot,
  profileDefaultsPath: join(
    import.meta.dirname,
    '../../../ui/ai/application-ui-profile.defaults.json',
  ),
});
const shippedDefaults = JSON.parse(
  readFileSync(
    join(
      import.meta.dirname,
      '../../../ui/ai/application-ui-profile.defaults.json',
    ),
    'utf8',
  ),
);
const discouragedTags = [
  ['wa-button-group', 'segmented-control'],
  ['wa-dropdown', 'popup-menu'],
  ['wa-dropdown-item', 'popup-menu'],
  ['wa-option', 'select'],
  ['wa-select', 'select'],
  ['wa-split-panel', 'resize'],
  ['wa-tab', 'tab-bar'],
  ['wa-tab-group', 'tab-bar'],
  ['wa-tab-panel', 'tab-bar'],
  ['wa-tree', 'tree-list'],
  ['wa-tree-item', 'tree-list'],
  ['wa-animated-image', 'content-item'],
  ['wa-comparison', 'content-item'],
  ['wa-icon', 'lucide-icon'],
  ['wa-zoomable-frame', 'content-item'],
  ['wa-button', 'button'],
  ['wa-input', 'text-field'],
  ['wa-textarea', 'text-field'],
  ['wa-checkbox', 'checkbox'],
  ['wa-checkbox-group', 'checkbox-group'],
  ['wa-radio-group', 'radio-group'],
  ['wa-radio', 'radio-group'],
  ['wa-switch', 'switch'],
  ['wa-dialog', 'surface-scaffold'],
  ['wa-badge', 'badge'],
  ['wa-tag', 'chip'],
  ['wa-spinner', 'loading-spinner'],
  ['wa-skeleton', 'skeleton'],
  ['wa-drawer', 'surface-scaffold'],
  ['wa-card', 'content-item'],
  ['wa-page', 'recipe-app-shell'],
  ['wa-callout', 'state-banner'],
  ['wa-popover', 'anchored-surface'],
  ['wa-popup', 'anchored-surface'],
  ['wa-toast', 'toast'],
  ['wa-toast-item', 'toast'],
  ['wa-tooltip', 'tooltip'],
  ['wa-details', 'disclosure'],
  ['wa-accordion', 'disclosure'],
  ['wa-accordion-item', 'disclosure'],
  ['wa-progress-bar', 'progress-bar'],
  ['wa-progress-ring', 'progress-ring'],
  ['wa-slider', 'slider'],
  ['wa-tag-input', 'tag-field'],
  ['wa-color-picker', 'color-field'],
];

tester.run('ui-preferences discouraged Web Awesome tags', preferences, {
  valid: [
    // Integration elements no Kerf component replaces stay allowed.
    ...['wa-qr-code', 'wa-copy-button', 'wa-carousel', 'wa-rating'].map(
      (tag) => ({
        code: `<div><${tag} /></div>;`,
        filename: appFile,
        settings: shippedDefaultsSettings,
      }),
    ),
    // Unknown custom elements and plain HTML are application-owned.
    {
      code: '<my-widget><div /></my-widget>;',
      filename: appFile,
      settings: shippedDefaultsSettings,
    },
    // A declared wrapper's own source renders the element it wraps.
    {
      code: 'export const StatusChip = () => <wa-button-group />;',
      filename: join(appRoot, 'src/status-chip.tsx'),
      settings: shippedDefaultsSettings,
    },
  ],
  invalid: discouragedTags.map(([tag, preferred]) => {
    const [concept, preference] = Object.entries(
      shippedDefaults.preferences,
    ).find(([, entry]) => entry.avoid?.includes(`@kerfjs/ui:${tag}`));
    return {
      code: `<div><${tag} /></div>;`,
      filename: appFile,
      settings: shippedDefaultsSettings,
      errors: [
        {
          messageId: 'preferred',
          data: {
            actual: `@kerfjs/ui:${tag}`,
            concept,
            preferred: `@kerfjs/ui:${preferred}`,
            rationale: preference.rationale,
          },
        },
      ],
    };
  }),
});

console.log('ui-preferences: OK');

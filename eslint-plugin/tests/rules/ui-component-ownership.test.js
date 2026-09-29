import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import plugin from '../../index.js';
import ownership from '../../lib/rules/ui-component-ownership.js';
import { createRuleTester } from '../helpers/rule-tester.js';
import { profile, uiSettings } from '../helpers/ui-contract-fixture.js';

const tester = createRuleTester();
const GAP =
  'If no configuration covers this need, report the component gap to @kerfjs/ui (open a feature request) instead of overriding it.';
const ACME_GAP =
  'If no configuration covers this need, report the component gap to @acme/widgets (open a feature request) instead of overriding it.';
// The catalogs @kerfjs/ui actually ships, so the typed-prop tokens are the
// real ones (`List gap` sets `--kui-list-gap`).
const settings = uiSettings({
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
});

// A component package whose own source may use its own private variables and
// tokens, while an application may not.
const acmeRoot = mkdtempSync(join(tmpdir(), 'kerfjs-ownership-'));
mkdirSync(join(acmeRoot, 'widgets/src'), { recursive: true });
mkdirSync(join(acmeRoot, 'app/src'), { recursive: true });
writeFileSync(
  join(acmeRoot, 'widgets/package.json'),
  JSON.stringify({ name: '@acme/widgets' }),
);
writeFileSync(
  join(acmeRoot, 'app/package.json'),
  JSON.stringify({ name: 'acme-app' }),
);
const acmeSettings = uiSettings({
  catalog: {
    schemaVersion: 2,
    package: '@acme/widgets',
    entries: [
      {
        key: '@acme/widgets:meter',
        package: '@acme/widgets',
        id: 'meter',
        name: 'Meter',
        parents: { mode: 'any', entries: [] },
        wiring: { required: false, helpers: [] },
        boundaries: {
          rootClass: 'acme-meter',
          publicClasses: ['acme-meter'],
          publicTokens: ['--acme-meter-gap'],
        },
        cssValueProps: [{ path: 'gap', grammar: 'length', examples: [] }],
      },
    ],
  },
  selectionCatalog: {
    schemaVersion: 1,
    package: '@acme/widgets',
    entries: [
      {
        id: 'meter',
        publicExports: ['Meter'],
        delivery: { moduleImport: '@acme/widgets/meter' },
        wiring: [],
      },
    ],
  },
  profile: { schemaVersion: 1, scope: 'package' },
});

tester.run('ui-component-ownership', ownership, {
  valid: [
    // Reading and theming public tokens is configuration.
    {
      code: "const css = 'color: var(--kui-color-surface); --kui-color-surface: white';",
      settings,
    },
    {
      code: "const css = 'border-color: var(--kui-list-divider-color)';",
      settings,
    },
    { code: '<div style="--kui-list-divider-color: red" />;', settings },
    // A token read without an assignment, and application private variables.
    { code: "const token = '--kui-list-gap';", settings },
    { code: "const css = '--_app-gap: 4px';", settings },
    {
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="xs" />;',
      settings,
    },
    // The package that owns the component may use its own internals.
    {
      code: "const css = '--_acme-meter-gap: 2px; --acme-meter-gap: 4px';",
      filename: join(acmeRoot, 'widgets/src/meter.tsx'),
      settings: acmeSettings,
    },
    {
      code: "const css = '--_kui-list-gap: 0';",
      filename: join(acmeRoot, 'app/src/view.tsx'),
      settings: uiSettings({
        profile: {
          ...profile,
          exceptions: [
            {
              id: 'legacy-private',
              rules: ['KUI-L020'],
              target: 'app',
              rationale: 'Migration boundary.',
            },
          ],
        },
        workspaceRoot: acmeRoot,
      }),
    },
  ],
  invalid: [
    {
      code: "const css = 'gap: var(--_kui-list-gap)';",
      settings,
      errors: [
        {
          messageId: 'private',
          data: {
            name: '--_kui-list-gap',
            owner: 'List',
            gap: GAP,
          },
        },
      ],
    },
    {
      code: '<div style={{ "--_kui-toolbar-control-group-slot": "0" }} />;',
      settings,
      errors: [
        {
          messageId: 'private',
          data: {
            name: '--_kui-toolbar-control-group-slot',
            owner: 'ToolbarControlGroup',
            gap: GAP,
          },
        },
      ],
    },
    {
      code: "const css = '--_kui-floating-covered: 1';",
      settings,
      errors: [
        {
          messageId: 'private',
          data: {
            name: '--_kui-floating-covered',
            owner: 'a Kerf component',
            gap: GAP,
          },
        },
      ],
    },
    {
      code: '<div style="--kui-list-gap: 4px" />;',
      settings,
      errors: [
        {
          messageId: 'typed',
          data: {
            name: '--kui-list-gap',
            component: 'List',
            prop: 'gap',
            gap: GAP,
          },
        },
      ],
    },
    {
      code: "<div style={{ '--kui-floating-toolbar-inset': '0' }} />;",
      settings,
      errors: [
        {
          messageId: 'typed',
          data: {
            name: '--kui-floating-toolbar-inset',
            component: 'FloatingToolbar',
            prop: 'inset',
            gap: GAP,
          },
        },
      ],
    },
    {
      code: "el.style.setProperty('--kui-disclosure-arrow-size', '12px');",
      settings,
      errors: [
        {
          messageId: 'typed',
          data: {
            name: '--kui-disclosure-arrow-size',
            component: 'DisclosureArrow',
            prop: 'size',
            gap: GAP,
          },
        },
      ],
    },
    {
      code: 'const css = `--kui-row-gap: ${gap}`;',
      settings,
      errors: [{ messageId: 'typed' }],
    },
    // An application reaching into a third-party package's component.
    {
      code: "const css = '--_acme-meter-gap: 2px; --acme-meter-gap: 4px';",
      filename: join(acmeRoot, 'app/src/view.tsx'),
      settings: acmeSettings,
      errors: [
        {
          messageId: 'private',
          data: {
            name: '--_acme-meter-gap',
            owner: 'Meter',
            gap: ACME_GAP,
          },
        },
        {
          messageId: 'typed',
          data: {
            name: '--acme-meter-gap',
            component: 'Meter',
            prop: 'gap',
            gap: ACME_GAP,
          },
        },
      ],
    },
    {
      code: "const css = '--_kui-list-gap: 0';",
      settings: uiSettings({
        catalogPath: '/missing.json',
        catalog: undefined,
      }),
      errors: [{ messageId: 'config' }],
    },
  ],
});

test('the UI configs enable ui-component-ownership as an error', () => {
  assert.equal(
    plugin.configs['recommended-ui'].rules['kerfjs/ui-component-ownership'],
    'error',
  );
  assert.equal(
    plugin.configs['strict-ui'].rules['kerfjs/ui-component-ownership'],
    'error',
  );
  assert.equal(
    plugin.configs.recommended.rules['kerfjs/ui-component-ownership'],
    undefined,
  );
});

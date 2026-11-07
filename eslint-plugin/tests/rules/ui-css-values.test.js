import { createRuleTester } from '../helpers/rule-tester.js';
import {
  shippedUiSettings,
  uiSettings,
} from '../helpers/ui-contract-fixture.js';

import cssValues from '../../lib/rules/ui-css-values.js';

const tester = createRuleTester();
const settings = uiSettings();

const thirdPartyCatalog = {
  schemaVersion: 1,
  package: '@acme/ui',
  entries: [
    {
      key: '@acme/ui:stack',
      package: '@acme/ui',
      id: 'stack',
      name: 'Stack',
      parents: { mode: 'any', entries: [] },
      wiring: { required: false, helpers: [] },
      boundaries: { publicClasses: [], publicTokens: [] },
      cssValueProps: [
        {
          path: 'gap',
          grammar: 'length',
          helpers: ['rem'],
          shorthands: ['tight'],
          canonicalShorthands: ['tight'],
          exceptionalShorthands: [],
          rawPolicy: 'forbid',
          examples: ['gap="tight"'],
        },
      ],
    },
  ],
};
const thirdPartySettings = uiSettings({
  catalog: thirdPartyCatalog,
  selectionCatalog: {
    schemaVersion: 1,
    package: '@acme/ui',
    entries: [
      {
        id: 'stack',
        publicExports: ['Stack', 'rem'],
        delivery: { browserImport: '@acme/ui/stack' },
        wiring: [],
      },
    ],
  },
  profile: { schemaVersion: 1, scope: 'package' },
});

// A synthetic catalog whose Card declares inset-free children while
tester.run('ui-css-values', cssValues, {
  valid: [
    // KUI-L017 (exceptional shorthand) is a review finding reported by
    // ui-exceptional-shorthands at `warn`; the contract rule stays silent.
    {
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="xl" />;',
      settings,
    },
    {
      code: 'import { List, rem, flex } from \'@kerfjs/ui\'; <List gap="xs" flex={flex(1, 1, rem(20))} />;',
      settings,
    },
    {
      code: "import { List, calc, plus, rem, px } from '@kerfjs/ui'; List({ gap: calc(plus(rem(1), px(2))) });",
      settings,
    },
    {
      code: "import { Skeleton, em } from '@kerfjs/ui'; <Skeleton width={em(12)} />;",
      settings,
    },
    {
      code: "import { Select, uiColor } from '@kerfjs/ui'; <Select choices={[{ label: 'A', value: 'a', color: uiColor('accent') }]} />;",
      settings,
    },
    {
      code: "import { List } from '@kerfjs/ui'; const gap = getGap(); <List gap={gap} />;",
      settings,
    },
    {
      code: 'import { List } from \'other-ui\'; <List gap="12px" />;',
      settings,
    },
    {
      code: "import { Stack, rem } from '@acme/ui'; <Stack gap={rem(1)} />;",
      settings: thirdPartySettings,
    },
    // Helper exports share a catalog entry with a component (`List` ships
    // `flex`/`uiColor`), but a helper is not that component: an object
    // argument whose keys match a contract path must not inherit it.
    {
      code: "import { flex, uiColor } from '@kerfjs/ui'; flex({ gap: '12px', flex: 'grow' }); uiColor({ gap: 'xl' });",
      settings,
    },
    {
      code: "import * as ui from '@kerfjs/ui'; ui.flex({ gap: '12px' });",
      settings,
    },
    {
      code: "import { uiColor } from '@kerfjs/ui/select'; uiColor({ choices: [{ label: 'A', value: 'a', color: 'red' }] });",
      settings,
    },
    // Object-member paths (`iconTile.color`) walk into an object literal; a
    // tone string has no members, and `foreground` takes foreground helpers.
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { fillColor, foregroundColor, uiColor } from '@kerfjs/ui'; <ListItem label=\"A\" iconTile={{ color: fillColor('#e5484d'), foreground: foregroundColor('white') }} />; <ListItem label=\"B\" iconTile={{ color: uiColor('brand-fill-loud') }} />; <ListItem label=\"C\" iconTile=\"brand\" />;",
      settings: shippedUiSettings,
    },
    // Helpers resolve from ANY `@kerfjs/ui` subpath — the documented
    // `@kerfjs/ui/css-values` path included — by named, aliased, default, or
    // namespace import, exactly as kerf-ui-analyze resolves them.
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { fillColor, foregroundColor as fg } from '@kerfjs/ui/css-values'; import * as css from '@kerfjs/ui/css-values'; <ListItem label=\"A\" iconTile={{ color: fillColor('#e5484d'), foreground: fg('white') }} />; <ListItem label=\"B\" iconTile={{ color: css.uiColor('brand-fill-loud'), foreground: css.foregroundColor('white') }} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { List } from '@kerfjs/ui/list'; import { calc, plus, rem, px, flex } from '@kerfjs/ui/css-values'; <List gap={calc(plus(rem(1), px(2)))} flex={flex(1, 1, rem(20))} />;",
      settings: shippedUiSettings,
    },
    // A same-named helper from outside the package (or a package that merely
    // shares the prefix) is not a cataloged helper.
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { foregroundColor } from 'other-ui/css-values'; import { flex } from '@kerfjs/ui-extras'; <ListItem label=\"A\" iconTile={{ color: foregroundColor('#000') }} />; <ListItem label=\"B\" iconTile={{ color: flex(1) }} />;",
      settings: shippedUiSettings,
    },
  ],
  invalid: [
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { foregroundColor } from '@kerfjs/ui/css-values'; <ListItem label=\"A\" iconTile={{ color: foregroundColor('#e5484d') }} />;",
      settings: shippedUiSettings,
      errors: [
        {
          message:
            'KUI-L014: `foregroundColor()` produces the wrong grammar for `ListItem.iconTile.color`; use `fillColor()` or `uiColor()` or `colorVar()`.',
        },
      ],
    },
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { foregroundColor as fg } from '@kerfjs/ui/css-values'; <ListItem label=\"A\" iconTile={{ color: fg('#e5484d') }} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import * as css from '@kerfjs/ui/css-values'; ListItem({ label: 'A', iconTile: { color: css.foregroundColor('#e5484d') } });",
      settings: shippedUiSettings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { ChoiceChips } from '@kerfjs/ui/choice-chips'; import { foregroundColor } from '@kerfjs/ui/css-values'; <ChoiceChips choices={[{ label: 'A', value: 'a', swatch: foregroundColor('#000') }]} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { List } from '@kerfjs/ui/list'; import { plus, rem, px } from '@kerfjs/ui/css-values'; <List gap={plus(rem(1), px(2))} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'expression' }],
    },
    {
      code: "import { List } from '@kerfjs/ui/list'; import * as css from '@kerfjs/ui/css-values'; List({ gap: css.plus(css.rem(1), css.px(2)) });",
      settings: shippedUiSettings,
      errors: [{ messageId: 'expression' }],
    },
    {
      code: "import { ListItemLink } from '@kerfjs/ui/list-item'; import { foregroundColor } from '@kerfjs/ui'; <ListItemLink href=\"/a\" label=\"A\" iconTile={{ color: foregroundColor('#e5484d') }} />;",
      settings: shippedUiSettings,
      errors: [
        {
          message:
            'KUI-L014: `foregroundColor()` produces the wrong grammar for `ListItem.iconTile.color`; use `fillColor()` or `uiColor()` or `colorVar()`.',
        },
      ],
    },
    {
      code: "import { ListActionRow } from '@kerfjs/ui/list-action-row'; import { fillColor } from '@kerfjs/ui'; ListActionRow({ label: 'A', iconTile: { color: fillColor('#000000'), foreground: fillColor('#ffffff') } });",
      settings: shippedUiSettings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="12px" />;',
      settings,
      errors: [{ messageId: 'raw' }],
    },
    {
      code: "import { List } from '@kerfjs/ui'; List({ gap: 'xxs' });",
      settings,
      errors: [{ messageId: 'raw' }],
    },
    {
      code: "import { List, flex } from '@kerfjs/ui'; <List gap={flex(1)} />;",
      settings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { List, plus, rem, px } from '@kerfjs/ui'; <List gap={plus(rem(1), px(2))} />;",
      settings,
      errors: [{ messageId: 'expression' }],
    },
    {
      code: 'import { ListItem } from \'@kerfjs/ui\'; <ListItem style="color: red" />;',
      settings,
      errors: [{ messageId: 'declarations' }],
    },
    {
      code: "import { ListItem } from '@kerfjs/ui'; const declarations = getStyle(); <ListItem style={declarations} />;",
      settings,
      errors: [{ messageId: 'declarations' }],
    },
    {
      code: "import { Skeleton, uiColor } from '@kerfjs/ui'; <Skeleton width={uiColor('accent')} />;",
      settings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { Select } from '@kerfjs/ui'; <Select choices={[{ label: 'A', value: 'a', color: '#fff' }]} />;",
      settings,
      errors: [{ messageId: 'raw' }],
    },
    {
      // Pins the full text so every suggested helper stays wrapped in its own
      // balanced pair of backticks.
      code: "import { Select, flex } from '@kerfjs/ui'; <Select choices={[{ label: 'A', value: 'a', color: flex(1) }]} />;",
      settings,
      errors: [
        {
          message:
            'KUI-L014: `flex()` produces the wrong grammar for `Select.choices[].color`; use `uiColor()` or `colorVar()`.',
        },
      ],
    },
    {
      code: "import { Select } from '@kerfjs/ui'; <Select choices={[{ label: 'A', value: 'a', color: 'red' }]} />;",
      settings,
      errors: [
        {
          message:
            'KUI-L013: `Select.choices[].color` uses color grammar; replace raw `red` with `uiColor()` or `colorVar()`.',
        },
      ],
    },
    {
      code: 'import { Stack } from \'@acme/ui\'; <Stack gap="12px" />;',
      settings: thirdPartySettings,
      errors: [{ messageId: 'raw' }],
    },
    // The same shapes still flag through the real component.
    {
      code: "import { List, flex } from '@kerfjs/ui'; flex({ gap: '12px' }); List({ gap: '12px' });",
      settings,
      errors: [{ messageId: 'raw', line: 1, column: 77 }],
    },
    {
      code: "import * as ui from '@kerfjs/ui'; ui.flex({ gap: '12px' }); ui.List({ gap: '13px' });",
      settings,
      errors: [{ messageId: 'raw', column: 76 }],
    },
    {
      code: "import { Select, uiColor } from '@kerfjs/ui/select'; uiColor({ choices: [{ color: 'red' }] }); Select({ choices: [{ color: 'blue' }] });",
      settings,
      errors: [{ messageId: 'raw', column: 124 }],
    },
  ],
});

console.log('ui-css-values: OK');

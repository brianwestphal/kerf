import { createRuleTester } from '../helpers/rule-tester.js';
import { profile, uiSettings } from '../helpers/ui-contract-fixture.js';

import composition from '../../lib/rules/ui-composition.js';
import preferences from '../../lib/rules/ui-preferences.js';
import boundaries from '../../lib/rules/ui-public-boundaries.js';
import wiring from '../../lib/rules/ui-wiring.js';
import cssValues from '../../lib/rules/ui-css-values.js';

const tester = createRuleTester();
const settings = uiSettings();
const thirdPartyCatalog = {
  schemaVersion: 2,
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

tester.run('ui-public-boundaries', boundaries, {
  valid: [
    { code: '<div class="kui-toolbar" />;', settings },
    {
      code: '<div class="kui-workbench kui-workbench__rail kui-workbench__rail--left kui-workbench__rail--right kui-workbench__center kui-workbench__main kui-workbench__drawer kui-workbench__panel-content" />;',
      settings,
    },
    { code: "const css = 'color: var(--kui-color-border)';", settings },
    {
      code: "const css = 'width: var(--kui-workbench-rail-width); height: var(--kui-workbench-drawer-height)';",
      settings,
    },
    {
      code: '<div class="kui-private" />;',
      filename: `${process.cwd()}/legacy/view.tsx`,
      settings: uiSettings({
        profile: {
          ...profile,
          exceptions: [
            {
              id: 'legacy-class',
              rules: ['KUI-L101'],
              target: 'legacy',
              rationale: 'Migration boundary.',
            },
          ],
        },
      }),
    },
  ],
  invalid: [
    {
      code: '<div className="kui-private" />;',
      settings,
      errors: [{ messageId: 'class' }],
    },
    {
      code: "const css = 'color: var(--kui-secret)';",
      settings,
      errors: [{ messageId: 'token' }],
    },
  ],
});

tester.run('ui-composition', composition, {
  valid: [
    {
      code: "import { Toolbar, ToolbarControlGroup as Group } from '@kerfjs/ui'; <Toolbar leading={<Group />} />;",
      settings,
    },
    {
      code: "import { Toolbar, ToolbarText } from '@kerfjs/ui'; <Toolbar center={<ToolbarText />} />;",
      settings,
    },
    {
      code: "import { ToolbarControlGroup as Group } from 'other-ui'; <Group />;",
      settings,
    },
    {
      code: "import { Pane, Toolbar as Bar } from '@kerfjs/ui'; const body = getContent(); <Pane header={<Bar />}>{body}</Pane>;",
      settings,
    },
    {
      code: "import { Pane, SegmentedControl } from '@kerfjs/ui'; <Pane footer={<SegmentedControl />} />;",
      settings,
    },
    {
      code: "import * as UI from '@kerfjs/ui'; const alternate = true; <UI.TabBar>{alternate ? <UI.AppTab /> : [<UI.AppTab />, <UI.AppTab />]}</UI.TabBar>;",
      settings,
    },
    {
      code: "import { TabBar as Tabs } from '@kerfjs/ui/tab-bar'; import { AppTab as Tab } from '@kerfjs/ui/app-tab'; const ready = true; <Tabs>{ready && <Tab />}</Tabs>;",
      settings,
    },
    {
      code: "import { SplitView } from '@kerfjs/ui'; const list = getList(); const detail = getDetail(); <SplitView list={list} detail={detail} />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import { Toolbar, SegmentedControl } from '@kerfjs/ui'; <Toolbar leading={<SegmentedControl />} />;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { Toolbar, ToolbarControlGroup } from '@kerfjs/ui'; <Toolbar center={<ToolbarControlGroup />} />;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; <Toolbar leading={<button>Save</button>} />;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; const Action = () => <button />; <Toolbar trailing={<Action />} />;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { TabBar } from '@kerfjs/ui'; <TabBar />;",
      settings,
      errors: [{ messageId: 'cardinality' }],
    },
    {
      code: "import { TabBar, ToolbarText } from '@kerfjs/ui'; <TabBar><ToolbarText /></TabBar>;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { AppTab, LucideIcon } from '@kerfjs/ui'; <div><AppTab closeIcon={<><LucideIcon /><LucideIcon /></>} /></div>;",
      settings,
      errors: [{ messageId: 'parent' }, { messageId: 'cardinality' }],
    },
    {
      code: "import { SplitView } from '@kerfjs/ui'; <SplitView />;",
      settings,
      errors: [{ messageId: 'cardinality' }, { messageId: 'cardinality' }],
    },
    {
      code: "import { Toolbar, ToolbarText } from '@kerfjs/ui'; <Toolbar center={<><ToolbarText /><ToolbarText /></>} />;",
      settings,
      errors: [{ messageId: 'cardinality' }],
    },
    {
      code: "import * as UI from '@kerfjs/ui'; <UI.SegmentedControl><UI.ToolbarControlGroup /></UI.SegmentedControl>;",
      settings,
      errors: [{ messageId: 'parent' }],
    },
    {
      code: "import { ToolbarControlGroup } from '@kerfjs/ui'; <div><ToolbarControlGroup /></div>;",
      settings,
      errors: [{ messageId: 'parent' }],
    },
  ],
});

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

tester.run('ui-wiring', wiring, {
  valid: [
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import { wireTokenSearchFields as wire } from '@kerfjs/ui/wire-token-search-fields'; const dispose = wire(root); <TokenSearchField />;",
      settings,
    },
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields'; void wireTokenSearchFields(root); <TokenSearchField />;",
      settings,
    },
    {
      code: "import { TokenSearchField, wireTokenSearchFields as wire } from '@kerfjs/ui'; const dispose = wire(root); <TokenSearchField />;",
      settings,
    },
    {
      code: "import * as UI from '@kerfjs/ui'; const dispose = UI.wireTokenSearchFields(root); <UI.TokenSearchField />;",
      settings,
    },
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import * as Wiring from '@kerfjs/ui/wire-token-search-fields'; const dispose = Wiring.wireTokenSearchFields(root); <TokenSearchField />;",
      settings,
    },
    {
      code: "import * as Field from '@kerfjs/ui/token-search-field'; import * as UI from '@kerfjs/ui'; const dispose = UI.wireTokenSearchFields(root); <Field.TokenSearchField />;",
      settings,
    },
    {
      code: "import Select from '@kerfjs/ui/select'; import '@kerfjs/ui/select/register'; <Select />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; <TokenSearchField />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import { wireTokenSearchFields } from 'other-ui'; const dispose = wireTokenSearchFields(root); <TokenSearchField />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields'; wireTokenSearchFields(root); <TokenSearchField />;",
      settings,
      errors: [{ messageId: 'cleanup' }],
    },
    {
      code: "import Select from '@kerfjs/ui/select'; <Select />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
  ],
});

tester.run('ui-css-values', cssValues, {
  valid: [
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
  ],
  invalid: [
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
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="xl" />;',
      settings,
      errors: [{ messageId: 'exceptional' }],
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
      code: 'import { Stack } from \'@acme/ui\'; <Stack gap="12px" />;',
      settings: thirdPartySettings,
      errors: [{ messageId: 'raw' }],
    },
  ],
});

console.log('ui-contracts: OK');

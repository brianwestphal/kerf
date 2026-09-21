import { createRuleTester } from '../helpers/rule-tester.js';
import { profile, uiSettings } from '../helpers/ui-contract-fixture.js';

import composition from '../../lib/rules/ui-composition.js';
import preferences from '../../lib/rules/ui-preferences.js';
import boundaries from '../../lib/rules/ui-public-boundaries.js';
import wiring from '../../lib/rules/ui-wiring.js';

const tester = createRuleTester();
const settings = uiSettings();

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

console.log('ui-contracts: OK');

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createRuleTester } from '../helpers/rule-tester.js';
import { appFile, appRoot, appSettings } from '../helpers/ui-app-fixture.js';
import {
  profile,
  shippedUiSettings,
  uiSettings,
} from '../helpers/ui-contract-fixture.js';

import wiring from '../../lib/rules/ui-wiring.js';

const tester = createRuleTester();
const settings = uiSettings();

const wiringRoot = mkdtempSync(join(tmpdir(), 'kerf-wiring-'));
const wiringEntry = join(wiringRoot, 'main.tsx');
const wiringEntryTwo = join(wiringRoot, 'other.tsx');
const wiringLeaf = join(wiringRoot, 'leaf.tsx');
const wiringApp = join(wiringRoot, 'app.tsx');
const wiringInit = join(wiringRoot, 'init.ts');
const wiringRootHelper = join(wiringRoot, 'search-field.tsx');
const currencyLeaf = join(wiringRoot, 'currencies-view.tsx');
const registrationEntry = join(wiringRoot, 'registration-entry.tsx');
const registrationLeaf = join(wiringRoot, 'registration-leaf.tsx');
const registrationInit = join(wiringRoot, 'registration-init.ts');
const registrationUnrelated = join(wiringRoot, 'registration-unrelated.ts');
const serverPage = join(wiringRoot, 'server-page.tsx');
const serverPageTwo = join(wiringRoot, 'server-page-two.tsx');
const browserEntry = join(wiringRoot, 'browser-entry.ts');
const otherBrowserEntry = join(wiringRoot, 'other-browser-entry.ts');
writeFileSync(
  wiringEntry,
  "import './leaf'; import '@kerfjs/ui/select/register'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; const dispose = wireSearchFields(root);\n",
);
writeFileSync(
  wiringLeaf,
  "import { SearchField, Select } from '@kerfjs/ui'; export const View = () => <><SearchField /><Select /></>;\n",
);
writeFileSync(wiringEntryTwo, "import('./leaf');\n");
writeFileSync(
  currencyLeaf,
  "import { SearchField } from '@kerfjs/ui/search-field'; export const CurrenciesView = () => <SearchField id='currency-filter' />;\n",
);
writeFileSync(wiringApp, "import { init } from './init.js'; init();\n");
writeFileSync(
  wiringInit,
  "import './currencies-view.js'; import { wireShellSearch } from './search-field.js'; export function init() { void wireShellSearch(root); }\n",
);
writeFileSync(
  wiringRootHelper,
  "import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; export function wireShellSearch(root) { return wireSearchFields(root, { onEdit({ id }) { if (id === 'currency-filter') updateFilter(); } }); }\n",
);
writeFileSync(
  registrationEntry,
  "import './registration-leaf'; import './registration-init';\n",
);
writeFileSync(
  registrationLeaf,
  "import { Select } from '@kerfjs/ui'; export const View = () => <Select />;\n",
);
writeFileSync(registrationInit, "import '@kerfjs/ui/select/register';\n");
writeFileSync(
  registrationUnrelated,
  "import '@kerfjs/ui/popup-menu/register';\n",
);
writeFileSync(
  serverPage,
  "import { Select } from '@kerfjs/ui/select'; export const Page = () => <Select />;\n",
);
writeFileSync(
  serverPageTwo,
  "import { Select } from '@kerfjs/ui/select'; export const PageTwo = () => <Select />;\n",
);
writeFileSync(browserEntry, "import '@kerfjs/ui/select/register';\n");
writeFileSync(otherBrowserEntry, "import '@kerfjs/ui/select/register';\n");
const entrySettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['main.tsx'] } },
});
const rootHelperSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['app.tsx'] } },
});
const registrationSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['registration-entry.tsx'] } },
});
const pairedSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: {
    ...profile,
    wiring: {
      entries: [
        {
          render: ['server-page.tsx', 'server-page-two.tsx'],
          client: ['browser-entry.ts'],
        },
      ],
    },
  },
});
const unrelatedPairSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: {
    ...profile,
    wiring: {
      entries: [
        { render: ['server-page.tsx'], client: ['browser-entry.ts'] },
        'other-browser-entry.ts',
      ],
    },
  },
});
const multiClientPairSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: {
    ...profile,
    wiring: {
      entries: [
        {
          render: ['server-page.tsx'],
          client: ['browser-entry.ts', 'other-browser-entry.ts'],
        },
      ],
    },
  },
});
const twoEntrySettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['main.tsx', 'other.tsx'] } },
});
const choiceEntry = join(wiringRoot, 'choice-entry.tsx');
const choiceLeaf = join(wiringRoot, 'choice-leaf.tsx');
const choiceListboxEntry = join(wiringRoot, 'choice-listbox-entry.tsx');
const choiceListboxLeaf = join(wiringRoot, 'choice-listbox-leaf.tsx');
writeFileSync(choiceEntry, "import './choice-leaf';\n");
writeFileSync(
  choiceLeaf,
  "import { ChoiceChips } from '@kerfjs/ui'; export const View = () => <><ChoiceChips choices={options} /><ChoiceChips multiple='toggle' choices={options} /></>;\n",
);
writeFileSync(choiceListboxEntry, "import './choice-listbox-leaf';\n");
writeFileSync(
  choiceListboxLeaf,
  "import { ChoiceChips } from '@kerfjs/ui'; export const View = () => <ChoiceChips choices={options.filter((item) => item.value > 0)} multiple={true} />;\n",
);
const choiceEntrySettings = uiSettings({
  workspaceRoot: wiringRoot,
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
  profile: { ...profile, wiring: { entries: ['choice-entry.tsx'] } },
});
const choiceListboxEntrySettings = uiSettings({
  ...choiceEntrySettings.kerfjs.ui,
  profile: { ...profile, wiring: { entries: ['choice-listbox-entry.tsx'] } },
});
const moduleScopeSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['main.tsx'] } },
  catalog: {
    ...settings.kerfjs.ui.catalog,
    entries: settings.kerfjs.ui.catalog.entries.map((entry) =>
      entry.id === 'search-field'
        ? { ...entry, wiring: { ...entry.wiring, scope: 'module' } }
        : entry,
    ),
  },
});
const catalogProviderSettings = uiSettings({
  catalog: {
    ...settings.kerfjs.ui.catalog,
    entries: settings.kerfjs.ui.catalog.entries.map((entry) =>
      entry.id === 'pane'
        ? {
            ...entry,
            wiring: { required: true, helpers: ['wireScrollDividers'] },
          }
        : entry,
    ),
  },
});
// An application entry sees the FilePicker wiring in init.ts while a narrow
// SplitView exception belongs to the view that renders it, not to the entry.
const wiringExceptionRoot = mkdtempSync(join(tmpdir(), 'kerf-wiring-source-'));
const wiringExceptionSource = (name, source) =>
  writeFileSync(join(wiringExceptionRoot, name), source);
wiringExceptionSource(
  'picker.tsx',
  "import { FilePicker } from '@kerfjs/ui'; export const Picker = () => <FilePicker />;\n",
);
wiringExceptionSource(
  'excepted-split.tsx',
  "import { SplitView } from '@kerfjs/ui'; export const Split = () => <SplitView />;\n",
);
wiringExceptionSource(
  'plain-split.tsx',
  "import { SplitView } from '@kerfjs/ui'; export const Split = () => <SplitView />;\n",
);
wiringExceptionSource(
  'init.ts',
  "import { wireFilePickers } from '@kerfjs/ui/wire-file-pickers'; export const dispose = wireFilePickers(root);\n",
);
wiringExceptionSource(
  'excepted-entry.tsx',
  "import './picker.js'; import './excepted-split.js'; import './init.js';\n",
);
wiringExceptionSource(
  'plain-entry.tsx',
  "import './picker.js'; import './excepted-split.js'; import './plain-split.js'; import './init.js';\n",
);
writeFileSync(
  join(wiringExceptionRoot, '.kerf-ui-profile.json'),
  JSON.stringify({
    schemaVersion: 1,
    scope: 'workspace',
    wiring: { entries: ['excepted-entry.tsx', 'plain-entry.tsx'] },
    exceptions: [
      {
        id: 'fixed-split',
        rules: ['KUI-L401'],
        target: 'excepted-split.tsx',
        rationale: 'The split has a fixed width.',
      },
    ],
  }),
);
const wiringExceptionSettings = uiSettings({
  ...shippedUiSettings.kerfjs.ui,
  workspaceRoot: wiringExceptionRoot,
  profile: undefined,
  profileDefaultsPath: join(
    import.meta.dirname,
    '../../../ui/ai/application-ui-profile.defaults.json',
  ),
});

tester.run('ui-wiring', wiring, {
  valid: [
    {
      code: "import './picker.js'; import './excepted-split.js'; import './init.js';",
      filename: join(wiringExceptionRoot, 'excepted-entry.tsx'),
      settings: wiringExceptionSettings,
    },
    {
      code: "import { ChoiceChips } from '@kerfjs/ui'; <ChoiceChips choices={options} />; <ChoiceChips multiple='toggle' choices={options} />; <ChoiceChips multiple={false} choices={options} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import './choice-leaf';",
      filename: choiceEntry,
      settings: choiceEntrySettings,
    },
    {
      code: "import { Form } from '@kerfjs/ui/form'; import { wireForms } from '@kerfjs/ui/wire-forms'; const stop = wireForms(root); <Form action='save' />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { ChoiceChips } from '@kerfjs/ui'; <ChoiceChips multiple='toggle' choices={options} />;",
      filename: choiceLeaf,
      settings: choiceEntrySettings,
    },
    {
      // This app-owned root is explicitly typed void. Its one page-lifetime
      // call satisfies L401 without a meaningless void operator or L402.
      code: "import './review-view.js'; import { startReview } from './interactions/review-index.js'; startReview();",
      filename: join(appRoot, 'src/review-entry.tsx'),
      settings: appSettings,
    },
    {
      code: "import { mountReview as start } from './interactions/review.js'; start();",
      filename: join(appRoot, 'src/review-setup.ts'),
      settings: appSettings,
    },
    {
      code: "import { Pane } from '@kerfjs/ui'; import { wireCatalog } from '@kerfjs/ui/wire-catalog'; const stop = wireCatalog(root, options); <Pane />;",
      settings: catalogProviderSettings,
    },
    {
      code: "import './wiring-view.js'; import { start } from './wiring-start.js'; const dispose = start();",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
    },
    {
      code: "import './wiring-view.js'; import { start } from './wiring-start-alias.js'; const dispose = start();",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
    },
    {
      code: "import { TicketSearch } from './ticket-search.js'; import { wire } from './interactions/alias.js'; const dispose = wire(root); <TicketSearch />;",
      filename: appFile,
      settings: appSettings,
    },
    // A required root-delegated action is satisfied by a reachable handler:
    // a delegateActions table key, or a delegate() selector in the same file.
    {
      code: "import './board-view.js'; import { wireBoard } from './board-actions.js'; const dispose = wireBoard(root);",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
    },
    {
      code: "import { delegate } from 'kerfjs'; import { BoardCard } from './board-card.js'; const dispose = delegate(root, 'click', '[data-action=\"open-card\"]', () => {}); <BoardCard />;",
      filename: appFile,
      settings: appSettings,
    },
    {
      code: "import { delegateActions } from 'kerfjs/actions'; import { BoardCard } from './board-card.js'; const dispose = delegateActions(root, 'click', { openCard: () => {}, 'open-card': () => {} }); <BoardCard />;",
      filename: appFile,
      settings: appSettings,
    },
    {
      code: "import { TicketSearch } from './ticket-search.js'; import { wireTicketSearch as wire } from './interactions/index.js'; const dispose = wire(root); <TicketSearch />;",
      filename: appFile,
      settings: appSettings,
    },
    {
      code: "import './leaf'; import '@kerfjs/ui/select/register'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; const dispose = wireSearchFields(root);",
      filename: wiringEntry,
      settings: entrySettings,
    },
    {
      code: "import './registration-leaf'; import './registration-init';",
      filename: registrationEntry,
      settings: registrationSettings,
    },
    {
      code: "import { Select } from '@kerfjs/ui'; export const View = () => <Select />;",
      filename: registrationLeaf,
      settings: registrationSettings,
    },
    {
      code: "import '@kerfjs/ui/select/register';",
      filename: browserEntry,
      settings: pairedSettings,
    },
    {
      code: 'export const ready = true;',
      filename: browserEntry,
      settings: multiClientPairSettings,
    },
    {
      code: "import { Select } from '@kerfjs/ui/select'; export const Page = () => <Select />;",
      filename: serverPage,
      settings: pairedSettings,
    },
    {
      code: "import { Select } from '@kerfjs/ui/select'; export const PageTwo = () => <Select />;",
      filename: serverPageTwo,
      settings: pairedSettings,
    },
    {
      code: "import { SearchField, Select } from '@kerfjs/ui'; <><SearchField /><Select /></>;",
      filename: wiringLeaf,
      settings: twoEntrySettings,
    },
    {
      code: "import { init } from './init.js'; init();",
      filename: wiringApp,
      settings: rootHelperSettings,
    },
    {
      code: "import { SearchField } from '@kerfjs/ui/search-field'; export const CurrenciesView = () => <SearchField id='currency-filter' />;",
      filename: currencyLeaf,
      settings: rootHelperSettings,
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import { wireSearchFields as wire } from '@kerfjs/ui/wire-search-fields'; const dispose = wire(root); <SearchField />;",
      settings,
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; void wireSearchFields(root); <SearchField />;",
      settings,
    },
    {
      code: "import { SearchField, wireSearchFields as wire } from '@kerfjs/ui'; const dispose = wire(root); <SearchField />;",
      settings,
    },
    {
      code: "import * as UI from '@kerfjs/ui'; const dispose = UI.wireSearchFields(root); <UI.SearchField />;",
      settings,
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import * as Wiring from '@kerfjs/ui/wire-search-fields'; const dispose = Wiring.wireSearchFields(root); <SearchField />;",
      settings,
    },
    {
      code: "import * as Field from '@kerfjs/ui/search-field'; import * as UI from '@kerfjs/ui'; const dispose = UI.wireSearchFields(root); <Field.SearchField />;",
      settings,
    },
    {
      code: "import Select from '@kerfjs/ui/select'; import '@kerfjs/ui/select/register'; <Select />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import './picker.js'; import './excepted-split.js'; import './plain-split.js'; import './init.js';",
      filename: join(wiringExceptionRoot, 'plain-entry.tsx'),
      settings: wiringExceptionSettings,
      errors: [{ messageId: 'missing' }, { messageId: 'missing' }],
    },
    {
      code: "import { ChoiceChips } from '@kerfjs/ui'; <ChoiceChips multiple choices={options} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { ChoiceChips } from '@kerfjs/ui'; <ChoiceChips multiple={mode} choices={options} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'missing' }],
    },
    // KF-JPE38T: a Form without wireForms would navigate on submit.
    {
      code: "import { Form } from '@kerfjs/ui/form'; <Form action='save' />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import './choice-listbox-leaf';",
      filename: choiceListboxEntry,
      settings: choiceListboxEntrySettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import './review-view.js';",
      filename: join(appRoot, 'src/review-entry.tsx'),
      settings: appSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { Pane } from '@kerfjs/ui'; import { wireCatalog } from 'other-ui'; const stop = wireCatalog(root, options); <Pane />;",
      settings: catalogProviderSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { wireTicketSearch } from './interactions/ticket-search.js'; wireTicketSearch(root);",
      filename: join(appRoot, 'src/wiring-start.ts'),
      settings: appSettings,
      errors: [{ messageId: 'cleanup' }],
    },
    {
      code: "import './wiring-view.js'; import './wiring-commented.js';",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
      errors: [{ messageId: 'missing' }],
    },
    // Only the component's own source (which renders data-action and imports
    // delegate) and a comment mention are reachable: neither is a handler.
    {
      code: "import './board-view.js'; import { wireOther } from './board-actions-other.js'; const dispose = wireOther(root);",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
      errors: [
        {
          messageId: 'action',
          data: { component: 'karwan-app:board-card', action: 'open-card' },
        },
      ],
    },
    // Naming the action without a Kerf delegation import is not handling it.
    {
      code: "import { BoardCard } from './board-card.js'; const action = 'open-card'; <BoardCard />;",
      filename: appFile,
      settings: appSettings,
      errors: [{ messageId: 'action' }],
    },
    {
      code: "import './wiring-view.js'; import { wireTicketSearch } from './other-interactions.js'; const dispose = wireTicketSearch(root);",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { TicketSearch } from './ticket-search.js'; import { wireTicketSearch } from './other-interactions.js'; const dispose = wireTicketSearch(root); <TicketSearch />;",
      filename: appFile,
      settings: appSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import('./leaf');",
      filename: wiringEntryTwo,
      settings: twoEntrySettings,
      errors: [{ messageId: 'missing' }, { messageId: 'missing' }],
    },
    {
      code: "import './leaf'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; const dispose = wireSearchFields(root);",
      filename: wiringEntry,
      settings: entrySettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import './registration-leaf';",
      filename: registrationEntry,
      settings: registrationSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: 'export const ready = true;',
      filename: browserEntry,
      settings: pairedSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: 'export const ready = true;',
      filename: browserEntry,
      settings: unrelatedPairSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import './registration-leaf'; import './registration-unrelated';",
      filename: registrationEntry,
      settings: registrationSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import './leaf'; import '@kerfjs/ui/select/register'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; wireSearchFields(root);",
      filename: wiringEntry,
      settings: entrySettings,
      errors: [{ messageId: 'cleanup' }],
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; <SearchField />;",
      filename: wiringLeaf,
      settings: moduleScopeSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; <SearchField />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import { wireSearchFields } from 'other-ui'; const dispose = wireSearchFields(root); <SearchField />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; wireSearchFields(root); <SearchField />;",
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

console.log('ui-wiring: OK');

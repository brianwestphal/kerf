import { createRuleTester } from '../helpers/rule-tester.js';
import { appCase } from '../helpers/ui-app-fixture.js';
import {
  shippedUiSettings,
  uiSettings,
} from '../helpers/ui-contract-fixture.js';

import composition from '../../lib/rules/ui-composition.js';

const tester = createRuleTester();
const settings = uiSettings();

// mode="bare" and whose Note declares `plain` as its inset-free form.
const insetEntry = (id, name, overrides = {}) => ({
  key: `@acme/ui:${id}`,
  package: '@acme/ui',
  id,
  name,
  parents: { mode: 'any', entries: [] },
  wiring: { required: false, helpers: [] },
  boundaries: { publicClasses: [], publicTokens: [] },
  layout: {
    roles: ['structure'],
    geometry: { margin: 'self', border: 'self', padding: 'self' },
  },
  ...overrides,
});
const insetCatalogSettings = uiSettings({
  catalog: {
    schemaVersion: 1,
    package: '@acme/ui',
    entries: [
      insetEntry('card', 'Card', {
        insetFreeChildren: [{ prop: 'mode', equals: 'bare' }],
      }),
      insetEntry('note', 'Note', {
        insetFreeWhen: [{ prop: 'plain', equals: true }],
      }),
    ],
  },
  selectionCatalog: {
    schemaVersion: 1,
    package: '@acme/ui',
    entries: [
      { id: 'card', publicExports: ['Card'], wiring: [] },
      { id: 'note', publicExports: ['Note'], wiring: [] },
    ],
  },
  profile: { schemaVersion: 1, scope: 'package' },
});

tester.run('ui-composition', composition, {
  valid: [
    {
      code: "import { Toolbar, ToolbarControlGroup, ToolbarActionLink as Link } from '@kerfjs/ui'; <Toolbar trailing={<ToolbarControlGroup><Link href='/report' label='Report' /></ToolbarControlGroup>} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; <Toolbar trailing={<wa-button variant='brand'>New ticket</wa-button>} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; <Toolbar leading={<button type='button'>Save</button>} center={<input aria-label='Search' />} trailing={<wa-button variant='brand'>New ticket</wa-button>} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; const Action = () => <button />; <Toolbar trailing={<Action />} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import * as UI from '@kerfjs/ui'; <UI.Toolbar trailing={<UI.ToolbarControlGroup><UI.ToolbarActionLink href='/report' label='Report' /></UI.ToolbarControlGroup>} />;",
      settings: shippedUiSettings,
    },
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
      code: "import * as UI from '@kerfjs/ui'; const alternate = true; <UI.TabBar>{alternate ? <UI.TabBarItem /> : [<UI.TabBarItem />, <UI.TabBarItem />]}</UI.TabBar>;",
      settings,
    },
    {
      code: "import { TabBar as Tabs } from '@kerfjs/ui/tab-bar'; import { TabBarItem as Tab } from '@kerfjs/ui/tab-bar-item'; const ready = true; <Tabs>{ready && <Tab />}</Tabs>;",
      settings,
    },
    {
      code: "import { TabBar, TabBarItem } from '@kerfjs/ui'; <TabBar trailing={<wa-button>Add tab</wa-button>} end={<wa-button variant='brand'>New ticket</wa-button>}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
    },
    {
      code: "import { TabBar, TabBarItem, Button } from '@kerfjs/ui'; <TabBar trailing={<Button>Add tab</Button>} end={<Button tone='brand'>New ticket</Button>}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
    },
    {
      code: "import { TabBar, TabBarItem, ToolbarControlGroup } from '@kerfjs/ui'; <TabBar leading={<ToolbarControlGroup />} trailing={<ToolbarControlGroup />} end={<ToolbarControlGroup />}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
    },
    // Zone validation deliberately stops at a local binding.
    {
      code: "import { TabBar, TabBarItem } from '@kerfjs/ui'; const actions = <div><wa-button>New ticket</wa-button></div>; <TabBar trailing={actions}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
    },
    {
      code: "import { SplitView } from '@kerfjs/ui'; const list = getList(); const detail = getDetail(); <SplitView list={list} detail={detail} />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import { Toolbar, ToolbarActionLink } from '@kerfjs/ui'; <Toolbar trailing={<ToolbarActionLink href='/report' label='Report' />} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'parent' }],
    },
    {
      code: "import { Toolbar, ToolbarActionLink } from '@kerfjs/ui'; <Toolbar><ToolbarActionLink href='/report' label='Report' /></Toolbar>;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'parent' }],
    },
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
      code: "import { TabBar, TabBarItem } from '@kerfjs/ui'; <TabBar end={<div><wa-button>New ticket</wa-button></div>}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { TabBarItem, LucideIcon } from '@kerfjs/ui'; <div><TabBarItem closeIcon={<><LucideIcon /><LucideIcon /></>} /></div>;",
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

// The shipped catalog declares Disclosure's embedded appearance as expecting
// inset-free children, and Text's flush/span forms as inset-free.
const embedded = (children, props = "appearance='embedded'") => ({
  code: `import { ContentItem, Disclosure, List, Text, ValueTable } from '@kerfjs/ui'; const ready = true; <ContentItem><Disclosure title='AI Feedback' ${props}>${children}</Disclosure></ContentItem>;`,
  settings: shippedUiSettings,
});
const insetMessage = (child, fix) =>
  `KUI-L204: \`@kerfjs/ui:${child}\` brings its own content-item inset (1px border + 8px padding) into \`@kerfjs/ui:disclosure\` with \`appearance="embedded"\`, which expects inset-free content and double-insets it; ${fix}.`;
tester.run('ui-composition inset-free children', composition, {
  valid: [
    embedded('<Text flush>Group Export.</Text>'),
    embedded('<Text flush={true}>Group Export.</Text>'),
    embedded("<Text variant='span'>Group Export.</Text>"),
    embedded('Group Export and Share in one control group.'),
    embedded('<strong>Group</strong> Export.'),
    // A List owns no inset of its own, and only direct children are checked.
    embedded('<List><Text>One</Text></List>'),
    // Other appearances keep the geometry block content lands on.
    embedded('<Text>Proxy and retry limits.</Text>', ''),
    embedded('<Text>Proxy.</Text>', "appearance='framed'"),
    embedded('<ValueTable rows={[]} />', "appearance='sunken'"),
    // Values the rule cannot read statically are not reported.
    embedded('<Text>Proxy.</Text>', 'appearance={appearance}'),
    embedded('<Text>Proxy.</Text>', '{...props}'),
    embedded('<Text flush={compact}>Proxy.</Text>'),
    embedded('<Text {...textProps}>Proxy.</Text>'),
  ],
  invalid: [
    {
      ...embedded('<Text>Group Export and Share.</Text>'),
      errors: [
        { message: insetMessage('text', 'set `flush` or `variant="span"`') },
      ],
    },
    {
      ...embedded(
        "<Text flush={false} tone='quiet'>Group Export.</Text>",
        'appearance={"embedded"}',
      ),
      errors: [{ messageId: 'inset' }],
    },
    {
      ...embedded("<Text variant='h3'>Title</Text>", 'appearance={`embedded`}'),
      errors: [{ messageId: 'inset' }],
    },
    {
      ...embedded('<ValueTable rows={[]} />'),
      errors: [
        {
          message: insetMessage(
            'value-table',
            'use an inset-free child such as `Text flush`, or inline content',
          ),
        },
      ],
    },
    // Fragments, arrays, and conditional branches are direct children too.
    {
      ...embedded('<><Text flush>Fine</Text><Text>Inset</Text></>'),
      errors: [{ messageId: 'inset' }],
    },
    {
      ...embedded(
        '{ready ? <Text>Inset</Text> : <Text flush>Fine</Text>}{[<ContentItem />]}',
      ),
      errors: [{ messageId: 'inset' }, { messageId: 'inset' }],
    },
  ],
});

// The check is catalog-driven: it applies to any entry that declares it.
tester.run('ui-composition catalog-declared inset-free children', composition, {
  valid: [
    {
      code: "import { Card, Note } from '@acme/ui'; <Card mode='bare'><Note plain /></Card>;",
      settings: insetCatalogSettings,
    },
    {
      code: "import { Card, Note } from '@acme/ui'; <Card><Note /></Card>;",
      settings: insetCatalogSettings,
    },
  ],
  invalid: [
    {
      code: "import { Card, Note } from '@acme/ui'; <Card mode='bare'><Note /><Card /></Card>;",
      settings: insetCatalogSettings,
      errors: [
        {
          message:
            'KUI-L204: `@acme/ui:note` brings its own content-item inset (1px border + 8px padding) into `@acme/ui:card` with `mode="bare"`, which expects inset-free content and double-insets it; set `plain`.',
        },
        { messageId: 'inset' },
      ],
    },
  ],
});

// KF-VTFKX8: the catalog's content rules mark components whose root is a
// control or link; nothing interactive may render inside them (KUI-L205, the
// JSX side of validateView's KUI-V014).
const interactive = (code) => ({
  code: `import { Badge, Button, Chip, ListItem, ListItemLink, Row, Select, Toolbar } from '@kerfjs/ui'; const tags = []; const on = true; ${code}`,
  settings: shippedUiSettings,
});
const nested = (child, host) => ({
  message: `KUI-L205: \`@kerfjs/ui:${child}\` renders a control or link, so it cannot sit inside \`@kerfjs/ui:${host}\`, which renders one itself; the browser splits the nested markup. Place it beside the host instead.`,
});
tester.run('ui-composition interactive content', composition, {
  valid: [
    interactive(
      "<ListItem action='open' label='Inbox' trailing={<Badge>3</Badge>} />;",
    ),
    // A Chip is a control only with an action, link, or remove button.
    interactive(
      "<ListItem action='open' label='Inbox' trailing={<Chip>New</Chip>} />;",
    ),
    interactive(
      "<ListItem action='open' label='Inbox' trailing={<Chip action={false}>New</Chip>} />;",
    ),
    // Controls beside a row, or in a container that is not a control, are fine.
    interactive(
      "<><ListItem action='open' label='Inbox' /><Button>Go</Button></>;",
    ),
    interactive('<Row><Button>Go</Button><Select label="Pick" /></Row>;'),
    interactive('<Toolbar trailing={<Button>Go</Button>} />;'),
    // A component defined elsewhere is not visible to the rule.
    interactive(
      "const Go = () => <Button>Go</Button>; <ListItem action='open' label='Inbox' trailing={<Go />} />;",
    ),
  ],
  invalid: [
    {
      ...interactive(
        "<ListItem action='open' label='Inbox' trailing={<Button>Go</Button>} />;",
      ),
      errors: [nested('button', 'list-item')],
    },
    {
      ...interactive(
        "<ListItem action='open' label='Inbox' description={<Row>{on && <Select label='Pick' />}</Row>} />;",
      ),
      errors: [nested('select', 'list-item')],
    },
    {
      ...interactive(
        "<ListItemLink href='/x' label='Docs' trailing={tags.map((tag) => <Chip href={tag}>{tag}</Chip>)} />;",
      ),
      errors: [nested('chip', 'list-item')],
    },
    {
      ...interactive(
        "<Button><Chip removeAction='drop' removeLabel='Remove'>A</Chip><wa-button>B</wa-button></Button>;",
      ),
      errors: [nested('chip', 'button'), nested('wa-button', 'button')],
    },
  ],
});

tester.run('ui-composition rendersAs wrappers', composition, {
  valid: [
    // A wrapper that renders a ToolbarControlGroup (or nothing) fits trailing.
    appCase(
      "import { DemandSegmentsControl } from './demand-segments-control.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
    ),
    // Each root of a multi-root wrapper is accepted by leading.
    appCase(
      "import { ViewSegmentedControl } from './view-segmented-control'; <Toolbar leading={<ViewSegmentedControl />} />;",
    ),
    // A third-party wrapper resolves by its package subpath.
    appCase(
      "import { GroupWrap } from '@acme/bits/group-wrap'; <Toolbar trailing={<><GroupWrap /><GroupWrap /></>} />;",
    ),
    // A subpath-less private-application export resolves by source file.
    appCase(
      "import { SourceOnlyGroup } from './source-only-group.js'; <Toolbar trailing={<SourceOnlyGroup />} />;",
    ),
    // A wrapper imported through a barrel's named re-export.
    appCase(
      "import { DemandSegmentsControl } from './components/index.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
    ),
    // A renamed re-export resolves to the cataloged export it renames.
    appCase(
      "import { HeadingText } from './components/index.js'; <Toolbar center={<HeadingText />} />;",
    ),
    // A star re-export, and a chain through a directory index.
    appCase(
      "import { ViewSegmentedControl } from './segments.js'; <Toolbar leading={<ViewSegmentedControl />} />;",
    ),
    appCase(
      "import { DemandSegmentsControl } from './barrel'; <Toolbar trailing={<DemandSegmentsControl />} />;",
    ),
    // Wrappers may render nothing, so two in a max-1 zone are not a certain overflow.
    appCase(
      "import { TitleText } from './title-text.js'; <Toolbar center={<><TitleText /><TitleText /></>} />;",
    ),
    // A wrapper used as a parent counts as its root: a ToolbarControlGroup
    // needs a Toolbar parent, and AppToolbar renders one.
    appCase(
      "import { AppToolbar } from './app-toolbar.js'; <AppToolbar><ToolbarControlGroup /></AppToolbar>;",
    ),
  ],
  invalid: [
    // The wrapper's root is not a toolbar zone child.
    appCase(
      "import { StatusChip } from './status-chip.js'; <Toolbar trailing={<StatusChip />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // center accepts ToolbarText only; one root (the group) does not fit.
    appCase(
      "import { ViewSegmentedControl } from './view-segmented-control.js'; <Toolbar center={<ViewSegmentedControl />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // An undeclared app component keeps today's KUI-L202 behavior.
    appCase(
      "import { PlainWidget } from './plain-widget.js'; <Toolbar trailing={<PlainWidget />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A subpath-less export registers no package-name import.
    appCase(
      "import { SourceOnlyGroup } from 'karwan-app'; <Toolbar trailing={<SourceOnlyGroup />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // An import that does not name the cataloged source file stays unresolved.
    appCase(
      "import { DemandSegmentsControl } from '../elsewhere/demand-segments-control.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A barrel's re-export of a non-cataloged component stays unresolved, as
    // does a component the barrel reaches through a non-cataloged local file.
    appCase(
      "import { Mystery } from './components/index.js'; <Toolbar trailing={<Mystery />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    appCase(
      "import { LocalGroup } from './components/index.js'; <Toolbar trailing={<LocalGroup />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A renamed re-export is reachable only by its new name.
    appCase(
      "import { TitleText } from './components/index.js'; <Toolbar trailing={<TitleText />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // Commented-out and namespace re-exports are not followed.
    appCase(
      "import { SourceOnlyGroup } from './components/index.js'; <Toolbar trailing={<SourceOnlyGroup />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    appCase(
      "import { DemandSegmentsControl } from './namespace.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A re-export cycle terminates without resolving.
    appCase(
      "import { DemandSegmentsControl } from './cycle-a.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A wrapper parent that renders a group is not the Toolbar the child needs.
    appCase(
      "import { DemandSegmentsControl } from './demand-segments-control.js'; <DemandSegmentsControl><ToolbarControlGroup /></DemandSegmentsControl>;",
      { errors: [{ messageId: 'parent' }] },
    ),
    // The wrapper and rendered ToolbarControlGroup both require Toolbar;
    // the placement gets one diagnostic, not two.
    appCase(
      "import { DemandSegmentsControl } from './demand-segments-control.js'; <div><DemandSegmentsControl /></div>;",
      { errors: [{ messageId: 'parent' }] },
    ),
    // Distinct listed requirements from multiple roots still yield one
    // diagnostic at the placement.
    appCase(
      "import { ViewSegmentedControl } from './view-segmented-control.js'; <div><ViewSegmentedControl /></div>;",
      { errors: [{ messageId: 'parent' }] },
    ),
  ],
});

console.log('ui-composition: OK');

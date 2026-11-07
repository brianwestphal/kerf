import { join } from 'node:path';

import { createRuleTester } from '../helpers/rule-tester.js';
import { appCase, appRoot } from '../helpers/ui-app-fixture.js';
import {
  profile,
  shippedUiSettings,
  uiSettings,
} from '../helpers/ui-contract-fixture.js';

import boundaries from '../../lib/rules/ui-public-boundaries.js';

const tester = createRuleTester();
const settings = uiSettings();

tester.run('ui-public-boundaries', boundaries, {
  valid: [
    // A component's own root class on that component is not a recreation.
    {
      code: 'import { Toolbar } from \'@kerfjs/ui\'; <Toolbar className="kui-toolbar" />;',
      settings,
    },
    // Placeable classes: layout utilities, the document root, item geometry
    // on a non-div carrier, and a Web Awesome modifier class.
    {
      code: '<main class="kui-content kui-scroll-owner"><p class="kui-inline-metadata" /></main>;',
      settings: shippedUiSettings,
    },
    {
      code: '<section class="app-palette kui-content"><ul class="kui-content-item" /><footer class="kui-control-cluster kui-content-item kui-content-item--framed" /></section>;',
      settings: shippedUiSettings,
    },
    {
      code: 'import { Text } from \'@kerfjs/ui/text\'; <Text class="kui-content-item" />;',
      settings: shippedUiSettings,
    },
    {
      code: '<wa-dialog class="hide-actions" />;',
      settings: shippedUiSettings,
    },
    // ContentItem itself (its own element), a class only an interpolation
    // completes, and item geometry in a template literal on a non-div carrier.
    {
      code: 'import { ContentItem } from \'@kerfjs/ui/content-item\'; <ContentItem className="kui-content-item" />;',
      settings: shippedUiSettings,
    },
    {
      code: 'const size = "x"; <div class={`kui-toolbar-${size} app-row`} />;',
      settings,
    },
    {
      code: 'const extra = "x"; <ul class={`kui-content-item ${extra}`} />;',
      settings: shippedUiSettings,
    },
    {
      code: '<div class="kui-toolbar" />;',
      filename: `${process.cwd()}/legacy/view.tsx`,
      settings: uiSettings({
        profile: {
          ...profile,
          exceptions: [
            {
              id: 'legacy-toolbar',
              rules: ['KUI-L103'],
              target: 'legacy',
              rationale: 'Migration boundary.',
            },
          ],
        },
      }),
    },
    // The documented @kerfjs/ui/document.css mount container (ui/README.md,
    // ui/docs/document-baseline.md), in the exact downstream shape.
    {
      code: '<div id="app" class="kui-app-root" />;',
      settings: shippedUiSettings,
    },
    {
      code: '<div id="app" className="kui-app-root" />;',
      settings: shippedUiSettings,
    },
    { code: "const css = 'color: var(--kui-color-border)';", settings },
    {
      code: "const paneStyle = '--kui-pane-scrollbar-gutter: stable';",
      settings: shippedUiSettings,
    },
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
    // Recreating a component by its anatomy classes instead of rendering it.
    {
      code: '<div class="kui-toolbar" />;',
      settings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-toolbar',
            component: 'Toolbar',
            render: '`Toolbar`',
          },
        },
      ],
    },
    {
      code: '<div class="kui-workbench kui-workbench__rail kui-workbench__main" />;',
      settings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-workbench',
            component: 'Workbench',
            render: '`Workbench`',
          },
        },
        {
          messageId: 'component',
          data: {
            name: 'kui-workbench__rail',
            component: 'Workbench',
            render: '`Workbench`',
          },
        },
        {
          messageId: 'component',
          data: {
            name: 'kui-workbench__main',
            component: 'Workbench',
            render: '`Workbench`',
          },
        },
      ],
    },
    {
      code: '<aside class="kui-pane"><nav className={"kui-pane__content kui-content"} /></aside>;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'component',
          data: { name: 'kui-pane', component: 'Pane', render: '`Pane`' },
        },
        {
          messageId: 'component',
          data: {
            name: 'kui-pane__content',
            component: 'Pane',
            render: '`Pane`',
          },
        },
      ],
    },
    {
      code: '<wa-dropdown class="kui-popup-menu"><a class="kui-toolbar-action-link" /></wa-dropdown>;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-popup-menu',
            component: 'PopupMenu',
            render: '`PopupMenu`',
          },
        },
        {
          messageId: 'component',
          data: {
            name: 'kui-toolbar-action-link',
            component: 'ToolbarActionLink',
            render: '`ToolbarActionLink`',
          },
        },
      ],
    },
    // A plain div carrying item geometry is exactly what ContentItem renders.
    {
      code: '<section class="kui-content"><div class="kui-content-item">Summary</div></section>;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'componentRoot',
          data: {
            name: 'kui-content-item',
            element: 'div',
            component: 'ContentItem',
            render: '`ContentItem`',
          },
        },
      ],
    },
    {
      code: 'const extra = "x"; <div className={`kui-content-item kui-content-item--framed ${extra}`} />;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'componentRoot',
          data: {
            name: 'kui-content-item',
            element: 'div',
            component: 'ContentItem',
            render: '`ContentItem`',
          },
        },
        {
          messageId: 'componentRoot',
          data: {
            name: 'kui-content-item--framed',
            element: 'div',
            component: 'ContentItem',
            render: '`ContentItem`',
          },
        },
      ],
    },
    {
      code: '<div class="kui-content-item--pill" />;',
      filename: `${process.cwd()}/legacy/view.tsx`,
      settings: {
        ...shippedUiSettings,
        kerfjs: {
          ui: {
            ...shippedUiSettings.kerfjs.ui,
            profile: {
              ...profile,
              exceptions: [
                {
                  id: 'legacy-class',
                  rules: ['KUI-L101'],
                  target: 'legacy',
                  rationale: 'An L101 exception does not excuse L103.',
                },
              ],
            },
          },
        },
      },
      errors: [{ messageId: 'componentRoot' }],
    },
    // Anatomy classes in a template literal are recreated anatomy too.
    {
      code: 'const extra = "x"; <div class={`kui-toolbar ${extra}`} />;',
      settings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-toolbar',
            component: 'Toolbar',
            render: '`Toolbar`',
          },
        },
      ],
    },
    {
      code: 'const extra = "x"; <div class={`kui-private ${extra}`} />;',
      settings,
      errors: [{ messageId: 'class', data: { name: 'kui-private' } }],
    },
    // Another component's anatomy class as a hook on a component's root.
    {
      code: 'import { Text } from \'@kerfjs/ui/text\'; <Text class="kui-toolbar-text" />;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-toolbar-text',
            component: 'ToolbarText',
            render: '`ToolbarText`',
          },
        },
      ],
    },
    {
      code: '<div className="kui-private" />;',
      settings,
      errors: [{ messageId: 'class' }],
    },
    {
      code: '<div id="app" class="kui-app-root kui-private" />;',
      settings: shippedUiSettings,
      errors: [{ messageId: 'class', data: { name: 'kui-private' } }],
    },
    {
      code: "const css = 'color: var(--kui-secret)';",
      settings,
      errors: [{ messageId: 'token' }],
    },
  ],
});

// A declared component package's anatomy classes on an application-owned
// element are reported with the component to render, like @kerfjs/ui's.
// `kerfjs/html` tagged templates write the same markup without JSX; their
// static class attributes carry the same KUI-L101 / KUI-L103 contract.
const htmlCase = (code, extra = {}) => ({
  code: `import { html } from 'kerfjs/html';\n${code}`,
  settings: shippedUiSettings,
  ...extra,
});
const contentItemRoot = (name = 'kui-content-item') => ({
  messageId: 'componentRoot',
  data: {
    name,
    element: 'div',
    component: 'ContentItem',
    render: '`ContentItem`',
  },
});
const paneAnatomy = (name) => ({
  messageId: 'component',
  data: { name, component: 'Pane', render: '`Pane`' },
});
tester.run('ui-public-boundaries kerfjs/html templates', boundaries, {
  valid: [
    // Placeable classes, and item geometry on a non-div carrier.
    htmlCase(
      'html`<main class="kui-content kui-scroll-owner"><ul class="kui-content-item"></ul></main>`;',
    ),
    // A hole is a whole class value: unknown, so never reported.
    htmlCase('const cls = "kui-pane"; html`<aside class=${cls}></aside>`;'),
    htmlCase('const cls = "kui-pane"; html`<aside class="${cls}"></aside>`;'),
    // A name a hole completes is not known.
    htmlCase('const s = "x"; html`<div class="kui-toolbar-${s}"></div>`;'),
    // Comments, text, other attributes, and closing tags are not class values.
    htmlCase(
      'html`<!-- <div class="kui-pane"> --><p title="class=kui-pane">class="kui-pane"</p></div>`;',
    ),
    // `className` is not an HTML attribute name; html writes names verbatim.
    htmlCase('html`<div data-class="kui-pane" classname-x="kui-pane"></div>`;'),
    // Only the kerfjs/html tag: another `html` tag is not kerf markup.
    {
      code: 'const html = String.raw; html`<aside class="kui-pane"></aside>`;',
      settings: shippedUiSettings,
    },
    {
      code: 'import { html } from \'lit\'; html`<aside class="kui-pane"></aside>`;',
      settings: shippedUiSettings,
    },
    // A profile exception for KUI-L103 covers the template too.
    htmlCase('html`<aside class="kui-pane"></aside>`;', {
      filename: `${process.cwd()}/legacy/view.ts`,
      settings: uiSettings({
        ...shippedUiSettings.kerfjs.ui,
        profile: {
          ...profile,
          exceptions: [
            {
              id: 'legacy-pane',
              rules: ['KUI-L103'],
              target: 'legacy',
              rationale: 'Migration boundary.',
            },
          ],
        },
      }),
    }),
  ],
  invalid: [
    // The ContentItem root-element case: a plain <div> is ContentItem.
    htmlCase(
      'html`<section class="kui-content"><div class="kui-content-item">Unread</div></section>`;',
      { errors: [contentItemRoot()] },
    ),
    // Tag and attribute names are case-insensitive; single quotes and
    // unquoted static values count.
    htmlCase(
      "html`<DIV CLASS='kui-content-item kui-content-item--framed'></DIV><aside class=kui-pane></aside>`;",
      {
        errors: [
          contentItemRoot(),
          contentItemRoot('kui-content-item--framed'),
          paneAnatomy('kui-pane'),
        ],
      },
    ),
    htmlCase(
      'html`<aside class="kui-pane">\n  <nav class="kui-pane__content kui-content">Inbox</nav>\n</aside>`;',
      { errors: [paneAnatomy('kui-pane'), paneAnatomy('kui-pane__content')] },
    ),
    // Classes in later static parts, after holes, and in nested templates.
    htmlCase(
      'const label = "Mail"; const open = true; html`<p>${label}</p><aside aria-label=${label} class="kui-pane">${open ? html`<div class="kui-content-item"></div>` : ""}</aside>`;',
      { errors: [paneAnatomy('kui-pane'), contentItemRoot()] },
    ),
    // Complete static names before a hole count (the runtime rejects this
    // partial value, but the names are known).
    htmlCase(
      'const extra = "x"; html`<aside class="kui-pane ${extra}"></aside>`;',
      {
        errors: [paneAnatomy('kui-pane')],
      },
    ),
    // A namespace import of kerfjs/html.
    {
      code: 'import * as k from \'kerfjs/html\'; k.html`<aside class="kui-pane"></aside>`;',
      settings: shippedUiSettings,
      errors: [paneAnatomy('kui-pane')],
    },
    // An aliased import, and KUI-L101 private anatomy.
    {
      code: 'import { html as h } from \'kerfjs/html\'; h`<div class="kui-private"></div>`;',
      settings: shippedUiSettings,
      errors: [{ messageId: 'class', data: { name: 'kui-private' } }],
    },
    // Tokens in the template are reported once (by TemplateElement).
    htmlCase(
      'html`<div style="color: var(--kui-private-token)" class="kui-pane"></div>`;',
      {
        errors: [
          paneAnatomy('kui-pane'),
          { messageId: 'token', data: { name: '--kui-private-token' } },
        ],
      },
    ),
  ],
});

tester.run('ui-public-boundaries declared component packages', boundaries, {
  valid: [
    // The component's own source writes its anatomy; that is not a recreation.
    {
      ...appCase(
        'export function PlainWidget() { return <div class="karwan-widget" />; }',
      ),
      filename: join(appRoot, 'src/plain-widget.tsx'),
    },
    // The package's own component element carries its own root class.
    appCase(
      'import { Meter } from \'@acme/bits/meter\'; <Meter className="acme-meter" />;',
    ),
    // Placeable item geometry on a carrier other than the element Card renders.
    appCase('<ul class="acme-card acme-card--framed" />;'),
    // Uncataloged application classes are the application's own.
    appCase('<div class="acme-meterish app-row" />;'),
  ],
  invalid: [
    appCase('<div class="acme-meter"><span class="acme-meter__bar" /></div>;', {
      errors: [
        {
          messageId: 'component',
          data: { name: 'acme-meter', component: 'Meter', render: '`Meter`' },
        },
        {
          messageId: 'component',
          data: {
            name: 'acme-meter__bar',
            component: 'Meter',
            render: '`Meter`',
          },
        },
      ],
    }),
    appCase('<section class="acme-card acme-card--framed" />;', {
      errors: ['acme-card', 'acme-card--framed'].map((name) => ({
        messageId: 'componentRoot',
        data: { name, element: 'section', component: 'Card', render: '`Card`' },
      })),
    }),
    // Another component's source does not own the class.
    {
      ...appCase('export const Other = () => <div class="karwan-widget" />;'),
      filename: join(appRoot, 'src/title-text.tsx'),
      errors: [{ messageId: 'component' }],
    },
    // An application catalog's class (no subpath export) names its component.
    appCase('<div class="karwan-widget" />;', {
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'karwan-widget',
            component: 'PlainWidget',
            render: '`PlainWidget`',
          },
        },
      ],
    }),
    // Another package's anatomy class as a hook on a Kerf UI component.
    appCase('<Toolbar className="acme-meter" />;', {
      errors: [
        {
          messageId: 'component',
          data: { name: 'acme-meter', component: 'Meter', render: '`Meter`' },
        },
      ],
    }),
  ],
});

console.log('ui-public-boundaries: OK');

import { createRuleTester } from '../helpers/rule-tester.js';
import { uiSettings } from '../helpers/ui-contract-fixture.js';

import exceptionalShorthands from '../../lib/rules/ui-exceptional-shorthands.js';

const tester = createRuleTester();
const settings = uiSettings();

tester.run('ui-exceptional-shorthands', exceptionalShorthands, {
  valid: [
    {
      code: 'import { List, rem } from \'@kerfjs/ui\'; <List gap="xs" />; <List gap={rem(1)} />;',
      settings,
    },
    // Contract violations belong to ui-css-values, never to the review rule.
    {
      code: 'import { List, flex } from \'@kerfjs/ui\'; <List gap="12px" />; <List gap={flex(1)} />;',
      settings,
    },
    {
      code: 'import { ListItem } from \'@kerfjs/ui\'; <ListItem style="color: red" />;',
      settings,
    },
    {
      code: 'import { List } from \'other-ui\'; <List gap="xl" />;',
      settings,
    },
  ],
  invalid: [
    {
      // Pins the full text: kerf-ui-analyze emits the identical message so
      // kerf-ui-doctor merges the two reports into one review finding.
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="xl" />;',
      settings,
      errors: [
        {
          message:
            'KUI-L017: `xl` is an exceptional shorthand for `List.gap`; prefer `none` or `2xs` or `xs` or `m` or `l` or `px()` or `rem()` or `em()` or `pct()` or `space()` or `lengthVar()` or `calc()` unless the off-scale choice is deliberate.',
        },
      ],
    },
    {
      code: "import { List } from '@kerfjs/ui'; List({ gap: 's' });",
      settings,
      errors: [{ messageId: 'exceptional' }],
    },
  ],
});

console.log('ui-exceptional-shorthands: OK');

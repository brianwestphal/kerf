// The app's own field editor for its ShippingWindow type (KF-EXA2WH: field
// editor API): two presets beside the editor's type-driven form, named to
// the Vite plugin through its `fieldEditors` option.
import { Button } from '@kerfjs/ui/button';
import type { FieldEditors } from '@kerfjs/ui/editor';
import { List } from '@kerfjs/ui/list';

const fieldEditors: FieldEditors = {
  ShippingWindow: {
    render: (context) => (
      <List>
        <List controlInsets="trbl" gap>
          <Button
            emphasis="secondary"
            action={context.setAction}
            rootAttributes={context.set({ from: 'Mon', to: 'Tue' })}
          >
            Next day
          </Button>
          <Button
            emphasis="secondary"
            action={context.setAction}
            rootAttributes={context.set({ from: 'Mon', to: 'Fri' })}
          >
            This week
          </Button>
        </List>
        {context.form()}
      </List>
    ),
  },
};

export default fieldEditors;

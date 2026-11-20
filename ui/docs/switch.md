# Switch placement

Use a Switch for a setting that takes effect immediately. Its native checkbox supplies keyboard and form behavior. Listen for the input's `change` event to persist the new value.

```tsx
import { Switch } from "@kerfjs/ui/switch";

<Switch
  label="Group new tickets automatically"
  hint="Keep related tickets together as they arrive."
  labelPlacement="start"
  checked={groupTickets.value}
  action="toggle-group-tickets"
/>;
```

## Layout and accessibility requirements

- Omit `labelPlacement` or use `"end"` for the compact inline layout with the track before the label.
- Use `"start"` in settings rows. The label and hint share the leading text column. The track stays at the trailing edge of the available width, including when the text wraps. Both edges follow the writing direction.
- Default and compact sizes use the same placement rules. The visible label provides the switch's name and its hint provides the description. Clicking the label activates the switch, Space toggles a focused switch, and the focus ring follows the track. A disabled switch retains its native disabled behavior.

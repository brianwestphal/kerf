import '@kerfjs/ui/lucide-icon.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ChoiceChips, type ChoiceChipsChoice } from '@kerfjs/ui/choice-chips';
import { foregroundColor, px } from '@kerfjs/ui/css-values';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { DialogSurface } from '@kerfjs/ui/surface-scaffold';
import { FieldLabel } from '@kerfjs/ui/text';
import { Calendar, Columns3, List as ListIcon } from 'lucide';

import {
  choiceChipsColor,
  choiceChipsDialogColor,
  choiceChipsView,
} from './state.js';

const colorChoices: readonly ChoiceChipsChoice[] = [
  { value: 'transparent', label: 'Transparent', swatch: 'transparent' },
  { value: 'blue', label: 'Blue', swatch: foregroundColor('#3b82f6') },
  { value: 'green', label: 'Green', swatch: foregroundColor('#22c55e') },
  { value: 'orange', label: 'Orange', swatch: foregroundColor('#f97316') },
  { value: 'red', label: 'Red', swatch: foregroundColor('#ef4444') },
  { value: 'purple', label: 'Purple', swatch: foregroundColor('#a855f7') },
  { value: 'pink', label: 'Pink', swatch: foregroundColor('#ec4899') },
  { value: 'teal', label: 'Teal', swatch: foregroundColor('#14b8a6') },
  { value: 'gray', label: 'Gray', swatch: foregroundColor('#6b7280') },
];

export function ChoiceChipsDemo() {
  return (
    <CatalogExampleStack
      label="ChoiceChips Variants"
      rootAttributes={{ 'data-demo': 'choice-chips' }}
    >
      <CatalogExample
        label="Color palette"
        note="Nine labeled swatches wrap as separate pills. Tab reaches the group once; arrow keys move the selection."
      >
        <ChoiceChips
          id="choice-chips-color"
          name="command-color"
          label="Command Color"
          value={choiceChipsColor.value}
          action="choice-chips-demo"
          choices={colorChoices}
        />
      </CatalogExample>
      <CatalogExample
        label="In a 560px dialog"
        note="The checked radio is the form value; Save reads it from the form."
        align="inline-control"
      >
        <DialogSurface preferredWidth={px(560)}>
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="choice-chips-dialog"
          >
            Edit Command
          </wa-button>
          <wa-dialog id="choice-chips-dialog" label="Edit Command">
            <form id="choice-chips-dialog-form">
              <FieldLabel id="choice-chips-dialog-label">Color</FieldLabel>
              <ChoiceChips
                id="choice-chips-dialog-color"
                name="color"
                labelledBy="choice-chips-dialog-label"
                value={choiceChipsDialogColor.value}
                action="choice-chips-demo"
                choices={colorChoices}
              />
            </form>
            <wa-button
              slot="footer"
              data-action="hide-wa-dialog"
              data-dialog-id="choice-chips-dialog"
            >
              Cancel
            </wa-button>
            <wa-button
              slot="footer"
              variant="brand"
              data-action="save-choice-chips-dialog"
            >
              Save
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Compact with icons"
        note="A compact group leads each choice with an icon; one choice is unavailable."
      >
        <ChoiceChips<string>
          id="choice-chips-view"
          name="board-view"
          label="Board View"
          size="compact"
          value={choiceChipsView.value}
          action="choice-chips-demo"
          choices={[
            {
              value: 'board',
              label: 'Board',
              icon: <LucideIcon icon={Columns3} name="columns-3" />,
            },
            {
              value: 'list',
              label: 'List',
              icon: <LucideIcon icon={ListIcon} name="list" />,
            },
            {
              value: 'calendar',
              label: 'Calendar',
              icon: <LucideIcon icon={Calendar} name="calendar" />,
              disabled: true,
              title: 'Calendar view needs a due-date field',
            },
          ]}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

import '@kerfjs/ui/lucide-icon.css';

import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ChoiceChips, type ChoiceChipsChoice } from '@kerfjs/ui/choice-chips';
import { ContentItem } from '@kerfjs/ui/content-item';
import { fillColor, px } from '@kerfjs/ui/css-values';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { DialogSurface } from '@kerfjs/ui/surface-scaffold';
import { FieldLabel } from '@kerfjs/ui/text';
import {
  Bug,
  Calendar,
  CircleQuestionMark,
  Columns3,
  List as ListIcon,
  MessageSquare,
  Minus,
  Move,
  Pencil,
  Plus,
} from 'lucide';

import {
  choiceChipsColor,
  choiceChipsDialogColor,
  choiceChipsIntents,
  choiceChipsLabels,
  choiceChipsView,
} from './state.js';

const labelChoices: readonly ChoiceChipsChoice[] = [
  { value: 'bug', label: 'Bug', swatch: fillColor('#ef4444') },
  { value: 'feature', label: 'Feature', swatch: fillColor('#3b82f6') },
  { value: 'docs', label: 'Docs', swatch: fillColor('#22c55e') },
  { value: 'design', label: 'Design', swatch: fillColor('#a855f7') },
  { value: 'chore', label: 'Chore', swatch: fillColor('#6b7280') },
];

const intentChoices: readonly ChoiceChipsChoice[] = [
  {
    value: 'comment',
    label: 'Comment',
    icon: <LucideIcon icon={MessageSquare} name="message-square" />,
  },
  { value: 'bug', label: 'Bug', icon: <LucideIcon icon={Bug} name="bug" /> },
  {
    value: 'change',
    label: 'Change',
    icon: <LucideIcon icon={Pencil} name="pencil" />,
  },
  {
    value: 'insert',
    label: 'Insert',
    icon: <LucideIcon icon={Plus} name="plus" />,
  },
  {
    value: 'remove',
    label: 'Remove',
    icon: <LucideIcon icon={Minus} name="minus" />,
  },
  {
    value: 'move',
    label: 'Move',
    icon: <LucideIcon icon={Move} name="move" />,
  },
  {
    value: 'question',
    label: 'Question',
    icon: <LucideIcon icon={CircleQuestionMark} name="circle-question-mark" />,
  },
];

const colorChoices: readonly ChoiceChipsChoice[] = [
  { value: 'transparent', label: 'Transparent', swatch: 'transparent' },
  { value: 'blue', label: 'Blue', swatch: fillColor('#3b82f6') },
  { value: 'green', label: 'Green', swatch: fillColor('#22c55e') },
  { value: 'orange', label: 'Orange', swatch: fillColor('#f97316') },
  { value: 'red', label: 'Red', swatch: fillColor('#ef4444') },
  { value: 'purple', label: 'Purple', swatch: fillColor('#a855f7') },
  { value: 'pink', label: 'Pink', swatch: fillColor('#ec4899') },
  { value: 'teal', label: 'Teal', swatch: fillColor('#14b8a6') },
  { value: 'gray', label: 'Gray', swatch: fillColor('#6b7280') },
];

export function ChoiceChipsDemo() {
  return (
    <CatalogExampleStack
      label="ChoiceChips Variants"
      rootAttributes={{ 'data-demo': 'choice-chips' }}
    >
      <CatalogExample
        label="Color Palette"
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
        label="In a 560px Dialog"
        note="The checked radio is the form value; Save reads it from the form."
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': 'choice-chips-dialog' }}
        >
          Edit Command
        </Button>
        <DialogSurface
          id="choice-chips-dialog"
          label="Edit Command"
          preferredWidth={px(560)}
          footer={
            <>
              <Button rootAttributes={{ 'data-dialog-close': '' }}>
                Cancel
              </Button>
              <Button tone="brand" action="save-choice-chips-dialog">
                Save
              </Button>
            </>
          }
        >
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
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Compact with Icons"
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
      <CatalogExample
        label="Multiple Selection"
        note="With multiple, each pill is a checkbox: Tab reaches every pill, Space toggles it, and every checked value submits."
      >
        <ChoiceChips
          id="choice-chips-labels"
          name="labels"
          label="Labels"
          multiple
          value={choiceChipsLabels.value}
          action="choice-chips-demo"
          choices={labelChoices}
        />
      </CatalogExample>
      <CatalogExample
        label="On Dark Chrome"
        note="Inside a .wa-dark appearance scope the chips resolve every color from the dark palette, so they read on inverse chrome such as a media viewer."
      >
        <ContentItem appearance="surface" className="wa-dark">
          <ChoiceChips
            id="choice-chips-intents"
            name="intents"
            label="Annotation Intents"
            multiple
            size="compact"
            value={choiceChipsIntents.value}
            action="choice-chips-demo"
            choices={intentChoices}
          />
        </ContentItem>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

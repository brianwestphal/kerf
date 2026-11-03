import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TextField } from '@kerfjs/ui/text-field';
import { Eye, EyeOff, Search } from 'lucide';

import { textFieldPasswordShown } from './state.js';

/** The End Toggle example's action (KF-3Y2GS2). */
export const REVEAL_TEXT_FIELD_DEMO_ACTION = 'text-field-demo-reveal';

export function TextFieldDemo() {
  const shown = textFieldPasswordShown.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'text-field' }}>
      <CatalogExample
        label="Labels and Hints"
        note="The label sits above the field and the hint below it; both name and describe the input."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            label="Project Name"
            value="Component library"
            hint="Visible to collaborators"
            clearable
          />
          <TextField
            ariaLabel="Search Components"
            placeholder="Search components"
            icon={<LucideIcon icon={Search} name="search" size="s" />}
            type="search"
            clearable
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="End Toggle"
        note="toggle puts an icon toggle button at the field's end, reporting aria-pressed; the application flips pressed in its action. Here it shows the password."
        align="inline-control"
      >
        <TextField
          label="Password"
          type={shown ? 'text' : 'password'}
          value="correct horse battery"
          autocomplete="off"
          toggle={{
            label: 'Show Password',
            icon: shown ? (
              <LucideIcon icon={EyeOff} name="eye-off" />
            ) : (
              <LucideIcon icon={Eye} name="eye" />
            ),
            pressed: shown,
            action: REVEAL_TEXT_FIELD_DEMO_ACTION,
          }}
        />
      </CatalogExample>
      <CatalogExample
        label="Validation"
        note="An error replaces nothing: it follows the hint in the danger color and marks the field invalid."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            label="Email"
            type="email"
            value="robin@"
            hint="Used for sign-in."
            error="Enter a complete email address."
            required
          />
          <TextField label="Owner" value="Design Systems" readOnly />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Exact Entry"
        note="Native spelling, correction, capitalization, and keyboard hints pass through to the control."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            label="Confirmation Phrase"
            placeholder="Type the phrase exactly"
            autocapitalize="off"
            autocorrect="off"
            spellcheck={false}
          />
          <TextField
            label="Card Number"
            inputMode="numeric"
            autocorrect="off"
            spellcheck={false}
          />
          <TextField
            label="Place Names"
            multiline
            rows={2}
            autocapitalize="words"
            autocorrect="off"
            spellcheck={false}
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Compact"
        note="The compact size matches compact Buttons and Selects."
        align="inline-control"
      >
        <List gap="xs">
          <TextField size="compact" label="Quantity" value="12" />
          <TextField size="compact" label="Unit" value="pieces" disabled />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Multiple Lines"
        note="A fixed-height textarea resizes vertically; a growing one follows its content up to maxRows, then scrolls."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            multiline
            rows={4}
            label="Release Note"
            value="Every free component has a focused catalog route."
            hint="Markdown is supported."
            maxLength={200}
            showCount
          />
          <TextField
            multiline
            rows={2}
            maxRows={6}
            label="Comment"
            placeholder="Grows as you type"
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Native Date"
        note="A date field keeps the browser's date picker, value, and input events."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            label="Needed By"
            type="date"
            name="neededBy"
            value="2026-11-12"
            required
          />
          <TextField
            label="Received On"
            type="date"
            name="receivedOn"
            value="2026-10-18"
            readOnly
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Numeric Constraints"
        note="Number fields keep native range and step validity, including unrestricted decimal steps."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            label="Customs Duty"
            type="number"
            value="12.50"
            min="0"
            max="100"
            step="0.01"
          />
          <TextField
            label="Exchange Rate"
            type="number"
            value="1.2345"
            step="any"
          />
          <TextField
            label="AI Budget"
            type="number"
            value="10"
            min={0}
            step={1}
          />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

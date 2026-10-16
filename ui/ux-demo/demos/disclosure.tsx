import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Disclosure } from '@kerfjs/ui/disclosure';
import { List } from '@kerfjs/ui/list';
import { Text } from '@kerfjs/ui/text';

const FAQ = [
  {
    id: 'billing',
    title: 'When am I billed?',
    answer: 'On the first of each month, for the seats active the day before.',
  },
  {
    id: 'seats',
    title: 'Can I change the number of seats?',
    answer: 'Yes. Added seats are prorated; removed seats end with the period.',
  },
  {
    id: 'export',
    title: 'How do I export my data?',
    answer: 'Settings › Data › Export creates an archive of every project.',
  },
] as const;

export function DisclosureDemo() {
  return (
    <CatalogExampleStack
      label="Disclosure Variants"
      rootAttributes={{ 'data-demo': 'disclosure' }}
    >
      <CatalogExample
        label="Plain Disclosure"
        note="A native details element: the summary row is a button that Enter and Space toggle, and its arrow follows the live open state. The content starts on the title's text column."
      >
        <List>
          <Disclosure title="Advanced Settings" detail="3 options">
            <Text>
              Proxy, request timeout, and retry limits apply to every connection
              this workspace makes.
            </Text>
          </Disclosure>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Framed and Sunken"
        note="appearance draws the standard neutral border (framed) or the lowered, textured work surface (sunken). Frame one only when it marks a real distinction."
      >
        <List gap="xs">
          <Disclosure title="Release Notes" appearance="framed" open>
            <Text>Faster sync, a new export format, and four fixes.</Text>
          </Disclosure>
          <Disclosure title="Build Log" detail="412 lines" appearance="sunken">
            <Text font="monospace">npm run build — completed in 18.4s</Text>
          </Disclosure>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Accordion"
        note="Disclosures that share a name form an exclusive group: opening one closes the others (the native details name attribute)."
      >
        <List gap="xs">
          {FAQ.map(({ id, title, answer }) => (
            <Disclosure
              title={title}
              name="disclosure-demo-faq"
              appearance="framed"
              rootAttributes={{ 'data-key': id }}
            >
              <Text>{answer}</Text>
            </Disclosure>
          ))}
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}

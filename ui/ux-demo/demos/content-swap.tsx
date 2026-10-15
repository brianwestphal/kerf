import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentSwap } from '@kerfjs/ui/content-swap';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { Row } from '@kerfjs/ui/row';

import { contentSwapFaded, contentSwapStep } from './state.js';

export function ContentSwapDemo() {
  const step = contentSwapStep.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'content-swap' }}>
      <CatalogExample
        label="Push Between Steps"
        note="Next pushes the second step in from the end; Back pushes the first step back in from the start. The hidden side is inert."
        viewport={{ width: 'compact', frame: 'solid' }}
      >
        <ContentSwap
          label="Connect a Project"
          active={step}
          direction={step === 'b' ? 'forward' : 'backward'}
          a={
            <List gap="xs" controlInsets="tb">
              <ListInsetText>
                Step 1 of 2 · Choose the folder that holds the project.
              </ListInsetText>
              <Row hAlign="right" controlInsets="rl">
                <Button action="content-swap-next">Next</Button>
              </Row>
            </List>
          }
          b={
            <List gap="xs" controlInsets="tb">
              <ListInsetText>
                Step 2 of 2 · Confirm the connection settings.
              </ListInsetText>
              <Row hAlign="right" controlInsets="rl">
                <Button action="content-swap-back">Back</Button>
              </Row>
            </List>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Crossfade"
        note='transition="crossfade" fades between sides in place.'
        viewport={{ width: 'compact', frame: 'solid' }}
      >
        <ContentSwap
          transition="crossfade"
          active={contentSwapFaded.value}
          a={
            <Row controlInsets="trbl">
              <Button action="content-swap-fade">Show Details</Button>
            </Row>
          }
          b={
            <Row controlInsets="trbl">
              <Button action="content-swap-fade" tone="brand">
                Hide Details
              </Button>
            </Row>
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}

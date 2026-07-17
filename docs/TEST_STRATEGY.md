# Test Strategy

The reference application must prove architectural claims, not only UI behaviour.

## Unit tests

- selector creation and resolution;
- identity minting;
- note body conversion;
- shape matching and validation;
- contracts and invariants;
- storage-target selection;
- save-result reduction;
- permission-state mapping.

## Linked-data fixtures

Fixtures should include:

- a minimal valid annotation;
- an annotation with extra predicates and types;
- language-tagged and typed values;
- several annotations in one resource;
- one annotation spread across linked subjects;
- malformed or partial data;
- the same subject discovered through two sources;
- read-only public data enriched by private facts.

Every edit-and-save test should confirm that unrelated data survives.

## Component tests

- keyboard navigation;
- wide margin and narrow drawer presentation;
- editable versus read-only notes;
- loading, empty, unauthorised, failed, and partial states;
- unresolved and ambiguous targets;
- custom templates or styles where supported.

## Storage contract tests

Run the same behavioural expectations against browser storage and Solid-backed storage where the capabilities overlap:

- create;
- load;
- update;
- delete or retract;
- preserve identity;
- report source and write capability;
- recover after interrupted save.

The tests should not pretend the implementations are identical where they are not.

## Solid integration tests

Use a disposable test Pod or server to test:

- login/session boundaries separately from data operations;
- resource and container discovery;
- creating a new target resource;
- saving changes to original sources;
- partial multi-resource failure;
- WAC and ACP scenarios where available;
- notifications without automatic merge;
- concurrent external change.

## End-to-end scenarios

1. Create a local note, reload, and edit it.
2. Connect to Solid and create a new private note.
3. Deliberately copy a local note to Solid without losing the original unexpectedly.
4. Load private and public notes together.
5. Edit only a writable source.
6. Submit a note without making it public.
7. Change the document and recover or report the target.
8. Embed the component on a second site with a different inbox.
9. Open the same note in a second compatible consumer.
10. Enable, break, and safely disable a residential overlay.

## Book example tests

Code used in the book should be exercised by automated tests or generated from tested examples. Examples may be simplified, but not fictional.

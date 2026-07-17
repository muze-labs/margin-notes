# Design: Solid Margin Notes

## Summary

Solid Margin Notes is an embeddable component for attaching personal or shared notes to exact parts of a web document. It starts with browser storage and can optionally connect to a Solid Pod. The same component should work on *Programming for Wizards* and on unrelated sites.

## Primary use cases

### Personal notes

A reader selects or focuses a paragraph, opens a margin editor, writes a note, and finds it again after navigation or reload. No account or network connection is required.

### Solid-backed notes

A reader connects to Solid and chooses or discovers a storage location. Existing local notes can remain local or be copied to Solid deliberately. The component must not silently move or publish notes.

### Public note collections

A site author may configure one or more read-only note sources. A source can be enabled by default or offered as an optional set the reader can turn on.

### Submission

A reader may submit a selected note to a configured Solid inbox. Submission is not publication. The site author or another process may curate and publish a separate representation.

### Reuse on another site

Another author should be able to include the component, provide different note sources and inboxes, and supply stable anchors for their own content.

## Integration surface

The minimum integration should be a script tag. Optional configuration may be supplied by:

1. page metadata;
2. a global or imported configuration call;
3. explicit per-page hooks.

A possible future shape is:

```html
<meta name="solid-margin-notes:app" content="https://example.test/apps/notes/">
<meta name="solid-margin-notes:inbox" content="https://pod.example/inbox/notes/">
<script src="https://cdn.example/solid-margin-notes.js"></script>
<script>
  SolidMarginNotes.configure({
    publicSources: [
      { url: "https://example.test/notes/public", defaultVisible: true }
    ]
  });
</script>
```

This is illustrative, not an accepted API.

## Interaction design

### Anchors

The host page should provide stable element identifiers where possible. The component should augment them with selectors that help recover from document changes:

- canonical document URL;
- stable host-provided fragment identifier;
- quoted text;
- surrounding text;
- optional text position;
- optional document version or content hash.

No single selector is sufficient in every case. Resolution should return a confidence or status rather than pretending every note still has an exact target.

### Editing

The Cobalt note widget is the expected editor. Notes may begin as plain text or Cobalt content, but the linked-data representation should not bind the entire application to one editor implementation.

### Display

The component should support:

- an unobtrusive marker near annotated content;
- a margin panel on wide layouts;
- an overlay or drawer on narrow layouts;
- source and author attribution;
- visible distinction between editable and read-only notes;
- clear unresolved-anchor states.

### Local versus Solid storage

The user should always know where a note will be saved. Connecting to Solid must not silently migrate local notes. A storage choice should be explicit, reversible where practical, and remembered as a preference rather than embedded in every component.

## Data sources

The UI may combine several sources:

- local browser notes;
- the reader's private Solid notes;
- a public collection selected by the site author;
- optional collections selected by the reader;
- submitted or curated notes;
- future notifications indicating that a source may have changed.

Each note must retain source provenance and write capability. A combined list is a view, not a merged document.

## Publication states

The first implementation should avoid one overloaded `visibility` field. These are distinct operations:

- **private** — stored where only the reader can access it;
- **shared by access** — the same resource is made readable to selected parties;
- **submitted** — a representation or link is sent to an inbox;
- **published** — a public source exposes the note;
- **copied** — a new note derived from another note is stored elsewhere.

The implementation must make the chosen operation explicit.

## Error and empty states

The product must have deliberate behaviour for:

- no notes;
- no stable anchors on the page;
- logged out;
- Solid provider unavailable;
- storage resource missing;
- read-only source;
- permission denied;
- one source failing while others load;
- one resource failing during save;
- unresolved or ambiguous target;
- malformed or unexpected linked data;
- an unsupported editor body format.

## Accessibility

Annotations must be reachable and operable by keyboard. The relationship between marker, target, editor, and note list must be expressed to assistive technology. The margin presentation may not be the only presentation.

## Non-functional constraints

- Browser-native first.
- No build step required for the simplest embedding path.
- No Solid login required for useful local operation.
- No destructive replacement of unknown linked data.
- No mandatory central service.
- Application-specific policy stays outside generic libraries.
- Useful diagnostics in development without making bleeding-edge HTML or CSS impossible to save later.

# Programming For Wizards Touchstone

The margin-notes component is not only a feature for the book. It is the working example of the book's argument.

Use this document when changing the app, examples, or associated libraries. If a proposed change moves away from this touchstone, call that out explicitly before implementing it.

## The Why

*Programming for Wizards* argues that software changes what people can notice, say, and do. Names, formats, protocols, and boundaries are not implementation details. They are the shape of the world the program creates.

For margin notes, that means:

- A reader's private notes must start as the reader's notes, not as content captured by the book, the component, or the author.
- A note should point at a stable passage without becoming part of that passage.
- The data should use names that can survive this implementation and be understood by other tools.
- Storage should move toward the user's home, not deeper into an application-owned account.
- Sharing should be one deliberate act across a boundary, not a side effect of writing.
- The component should stay small enough to be embedded, inspected, replaced, or reimplemented.
- The book should remain a book; the margin component should not become a publishing platform, identity provider, storage service, or social network.

## Design Consequences

- Prefer browser-local storage for the first slice because it gives the reader an immediate private margin without login.
- Prefer Solid-backed storage when crossing devices or tools becomes necessary because it moves data toward user-controlled storage.
- Prefer linked data names for saved notes because independent tools need shared meanings, not only portable JSON.
- Preserve unknown facts because this app is only one partial view over an open graph.
- Keep host anchors stable and explicit because the passage address is the meeting point between book and note.
- Keep inbox submission separate from private note storage because publishing and personal writing have different owners.
- Keep app-specific policy out of reusable libraries because libraries should provide useful boundaries, not a hidden application worldview.
- Keep the code readable and view-source-friendly because the project teaches by being inspected.

## Warning Signs

Warn before continuing if a change would:

- make the book, host page, or component silently receive private notes;
- make Solid required for basic local usefulness;
- create a closed application-owned model beside the linked-data model;
- remove subject identity, source provenance, or unknown predicates from stored notes;
- hide storage, permission, or network semantics behind a convenience API the app still needs to reason about;
- treat sharing as the default rather than a deliberate selected-note action;
- make the component depend on the book's site structure in a way that prevents use elsewhere;
- grow a general framework or social platform around a margin-note slice before the app proves the need;
- make the code harder for a curious developer to understand by reading it directly.

## Relationship To Muze Principles

Muze's design principles and this book are aligned: small pieces, public names, browser-native standards, replaceable tools, and user-controlled software. When the two seem to pull in different directions, prefer the concrete lesson from the margin-notes use case and record the tension in the decision log or open questions.

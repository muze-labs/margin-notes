# Current Implementation Slice

Keep exactly one primary slice active. AI assistants and contributors should read this file before proposing code.

## Slice M1.1 — Create and restore one local note

**Status:** Ready  
**Milestone:** 1 — Local note from end to end

## User-visible outcome

A host page loads the component, a reader selects one supplied paragraph anchor, writes a note with Cobalt, reloads the page, and sees the same note attached to the same paragraph.

## Why this slice comes first

It tests the component boundary, annotation identity, target identity, Cobalt body representation, linked-data representation, and browser persistence without allowing authentication or network behaviour to obscure those questions.

## Accepted constraints

- Use one native linked-data model in memory and storage.
- Do not add Solid login or remote storage.
- Prefer a stable anchor supplied by the host page.
- Keep resource-location policy out of presentation code.
- Preserve room for quote and context selectors, but do not implement robust reattachment yet.
- Use contracts for explicit host and data assumptions.

## Explicit non-goals

- automatic paragraph matching after document edits;
- Solid authentication;
- SimplySolid implementation;
- public note sources;
- permissions or publication;
- interoperability conventions;
- residential programming;
- a generic storage-provider framework.

## Acceptance evidence

The slice is complete when an automated browser test demonstrates:

1. the component mounts through the intended host API;
2. the reader creates a note for a stable paragraph anchor;
3. the note is represented as linked data;
4. the linked-data graph is written to browser storage;
5. a reload restores the note and target;
6. the note can be edited and deleted with keyboard access;
7. no SimplySolid code was added without a separate, evidenced pressure.

## Questions this slice should answer

- What is the smallest useful host API?
- What identifier should a local annotation use?
- How should browser storage represent a graph without creating another domain model?
- What Cobalt representation belongs in the annotation body?
- Which contracts reveal host integration mistakes early?

## Expected documents to update

- `docs/DATA_MODEL.md`
- `docs/DECISIONS.md`
- `docs/OPEN_QUESTIONS.md`
- `docs/BOOK_NOTES.md`
- `docs/STATUS.md`

Add to `docs/DESIGN_PRESSURES.md` only when the slice exposes a concrete stack boundary problem.

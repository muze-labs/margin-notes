# Application-to-Book Feedback Loop

The application is the source of truth for the future book's practical claims.

## During implementation

For every significant discovery, add a short entry to `BOOK_NOTES.md`. When it also pressures a stack boundary, first give it an ID in `DESIGN_PRESSURES.md`. Record:

- milestone and date;
- problem encountered;
- assumption that turned out to be incomplete;
- smallest failed approach;
- chosen solution;
- which stack layer changed;
- code or test that demonstrates the issue;
- possible chapter or section;
- whether the lesson is general Solid knowledge or specific to Muze.

## What makes good book material

The strongest material is likely to come from moments where a reasonable application-local assumption conflicts with shared data:

- a paragraph identifier changes;
- one list contains subjects from several resources;
- a note is readable but not writable;
- a save succeeds for one resource and fails for another;
- an application sees facts it did not create;
- a shape matches data without owning its structure;
- publishing turns out not to be the same as granting access;
- a component must work without knowing where its data lives.

## Chapter order

Do not freeze the final chapter order yet. A likely progression is:

1. local reactive application;
2. contracts and component boundaries;
3. linked-data values, names, and identity;
4. shapes and open-world behaviour;
5. Solid login and resources;
6. source-aware workspaces;
7. creation and save routing;
8. discovery, permissions, and sharing;
9. reusable components and interoperability;
10. residential programming.

Implementation may move these lessons.

## Evidence policy

A code example intended for the book should:

- come from, or be mechanically reduced from, a working test or example;
- state which package versions it uses;
- avoid APIs that exist only in prose;
- make failures visible rather than assuming a perfect network;
- preserve the distinction between standards and project conventions.

## Avoiding retrospective neatness

The book may simplify a detour, but it should not erase the reason a boundary exists. Keep enough of the failed approach to show why the final design was earned.


## SimplySolid evidence

For every SimplySolid capability that appears in the book, preserve the chain from application need to validated behaviour. The book may simplify APIs, but it should not present a merely designed or unit-tested capability as established practice.

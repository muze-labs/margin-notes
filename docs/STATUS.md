# Project Status

## Current phase

Milestone 0 is complete enough to support implementation. The active work item is slice M3.2 in `CURRENT_SLICE.md`: local-first notes that can later sync to a discovered Solid resource.

## Completed

- project rationale;
- initial product design;
- proposed architecture;
- initial linked-data model;
- vertical implementation plan;
- decision and open-question logs;
- AI-assisted workflow guidance;
- demand-driven SimplySolid workflow and stopping rules;
- design-pressure and shared-library proposal records;
- SimplySolid feature-state matrix;
- one explicit active implementation slice;
- privacy and test requirements;
- MIT licence selected;
- package name selected as `margin-notes`;
- host integration API exposes `mount(config)` as the primary app entry point;
- SimplyFlow app composition with the paragraph-note-stacks feature component;
- Cobalt editor modal integration for creating and editing note bodies;
- local browser persistence using OLDMed annotation subjects through an IndexedDB-backed local store;
- executable host contract validation used by the real component;
- headless browser coverage for the mounted public API create, restore, edit, and delete path;
- mounted keyboard coverage for focus, create, note traversal, action reachability, and Escape collapse;
- mounted edit coverage preserves subject identity and unknown predicates;
- quiet paragraph-side creation affordances and collapsed note stacks;
- fixed-resource Solid store adapter behind the existing store boundary;
- Turtle serialization/parsing for the fixed-resource Solid store through OLDM;
- mounted browser coverage that creates and restores a note through the Turtle-backed Solid resource adapter with a fake Lading-style Solid client;
- default local-first notes storage through SimplySolid and solid-workspace;
- mounted browser coverage that creates/restores local notes through SimplySolid, connects to a discovered Solid notes resource, merges existing local and remote notes, and syncs the result;
- manual validation in the programming-for-wizards book that margin notes work through the new path and previously stored notes are still available.

## Remaining M3.2 work

Slice M3.2: local-first notes with a Solid replica:

1. record the exact manual smoke-test environment and steps if this validation should become repeatable evidence;
2. decide how offline sync-pending and failed remote saves should become visible in the UI;
3. decide whether the example page should expose the Solid connection path for manual testing.

## Known unresolved choices

- repository location;
- exact Web Annotation shape;
- local identifier namespace;
- browser tooling;
- exact styling and placement for narrow-screen note creation controls;
- exact error UI for failed remote saves.


## SimplySolid status

SimplySolid is now required by the default storage path. Features used by the mounted local-first and Solid-connect browser flows are marked in `SIMPLYSOLID_FEATURES.md`; broader workspace capabilities remain **Designed** until an active slice produces evidence for them.

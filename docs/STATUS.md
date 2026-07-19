# Project Status

## Current phase

Milestone 0 is complete enough to support implementation. The active work item is slice M3.1 in `CURRENT_SLICE.md`: saving the existing note graph to one configured Solid resource.

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
- mounted browser coverage that creates and restores a note through the Turtle-backed Solid resource adapter with a fake Lading-style Solid client.

## Remaining M3.1 work

Slice M3.1: one configured Solid resource:

1. run a real Solid server smoke test or record why fake-client evidence is sufficient for this slice;
2. decide how failed remote saves should become visible in the UI;
3. decide whether the example page should expose a configured resource URL for manual testing.

## Known unresolved choices

- repository location;
- exact Web Annotation shape;
- local identifier namespace;
- browser tooling;
- exact styling and placement for narrow-screen note creation controls;
- exact error UI for failed remote saves.


## SimplySolid status

No SimplySolid capability is required by implemented application code yet. The first fixed-resource Solid path is resolved in the application as a store adapter. Features listed in `SIMPLYSOLID_FEATURES.md` remain **Designed** until an active slice produces evidence for them.

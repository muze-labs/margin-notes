# Project Status

## Current phase

Milestone 0 is complete enough to support implementation. The active work item is slice M1.1 in `CURRENT_SLICE.md`, and implementation is in progress.

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
- quiet paragraph-side creation affordances and collapsed note stacks.

## Remaining M1.1 work

Slice M1.1: a browser-only end-to-end note:

1. add an automated browser test for create, reload, edit, delete, and keyboard access;
2. add browser round-trip coverage for the local OLDMed annotation graph;
3. verify edits preserve subject identity and unknown predicates;
4. update data-model, open-question, and book notes with the evidence from that implementation.

## Known unresolved choices

- repository location;
- exact Web Annotation shape;
- local identifier namespace;
- browser tooling;
- exact styling and placement for narrow-screen note creation controls.


## SimplySolid status

No SimplySolid capability is required by implemented application code yet. Features listed in `SIMPLYSOLID_FEATURES.md` remain **Designed** until an active slice produces evidence for them.

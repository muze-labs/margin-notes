# Project Status

## Current phase

Milestone 0 is complete enough to begin implementation. The active work item is slice M1.1 in `CURRENT_SLICE.md`.

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
- privacy and test requirements.

## Next implementation target

Slice M1.1: a browser-only end-to-end note:

1. mount component;
2. identify a paragraph;
3. create a note using Cobalt;
4. represent it as linked data;
5. save to browser storage;
6. restore it after reload;
7. render an accessible marker and note panel.

## Known unresolved choices

- repository and package name;
- licence;
- exact Web Annotation shape;
- local identifier namespace;
- Cobalt body representation;
- host integration API;
- test runner and browser tooling.


## SimplySolid status

No SimplySolid capability is required by implemented application code yet. Features listed in `SIMPLYSOLID_FEATURES.md` remain **Designed** until an active slice produces evidence for them.

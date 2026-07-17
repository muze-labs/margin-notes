# Implementation Plan

The project should grow through complete vertical slices. Each milestone must leave a usable application and update the decision and book notes.

## Milestone 0 — Repository and design

**Outcome:** a shared description of the problem, boundaries, assumptions, and open questions.

- [x] Create repository structure
- [x] Record reason for existence
- [x] Draft product design and architecture
- [x] Draft linked-data model
- [x] Add AI-assisted workflow rules
- [x] Add demand-driven SimplySolid workflow and stopping rules
- [x] Add design-pressure, proposal, and feature-state records
- [x] Define the first active implementation slice
- [x] Select licence
- [x] Select package name
- [ ] Confirm repository location


## Gate for every milestone

Before starting a milestone, break it into one small active slice in `CURRENT_SLICE.md`. Complete and validate that slice before replacing it with the next one.

A milestone mentioning SimplySolid describes expected application pressure, not pre-approved library scope. For every shared-library change:

1. observe the pressure in the active slice;
2. record it in `DESIGN_PRESSURES.md`;
3. decide the owning layer;
4. write a proposal with explicit non-goals;
5. implement contract tests in the owning library;
6. validate the result in this application;
7. update `SIMPLYSOLID_FEATURES.md`.

## Milestone 1 — Local note from end to end

**Outcome:** a reader can create, edit, delete, and restore one or more notes without Solid.

- mount through one script include;
- discover annotatable paragraphs;
- create stable host anchors where supplied;
- open the Cobalt editor;
- represent notes as linked data in memory;
- save and load the same graph from browser storage;
- render markers and a responsive note panel;
- support keyboard operation;
- add tests for navigation and reload.

**Questions to answer:**

- What is the smallest useful host API?
- How should local linked-data identifiers be minted?
- What body representation does Cobalt require?
- Which SimplyFlow primitives make the interaction clearest?

## Milestone 2 — Robust target resolution

**Outcome:** notes can survive modest document edits and report when they cannot be resolved confidently.

- combine fragment, text quote, context, and optional position selectors;
- distinguish exact, approximate, ambiguous, and unresolved matches;
- preserve old selectors when adding improved ones;
- provide diagnostics and a manual reattach flow;
- test inserted, removed, and moved paragraphs.

## Milestone 3 — Solid connection and storage

**Outcome:** a user can connect to Solid, select a storage target, and save private notes there.

- authenticate through Lading;
- load resources through jsfs-solid and/or SimplySolid;
- model browser and Solid notes without two application data models;
- expose source and write capability;
- choose or discover `createIn` targets;
- save existing notes to their source;
- report results per resource;
- keep local operation available while logged out.

## Milestone 4 — Several sources in one view

**Outcome:** private, local, and public notes can coexist without losing provenance.

- configure public sources through metadata and JavaScript;
- add optional source selection;
- use shapes to discover notes;
- combine sources in a source-aware workspace or equivalent view;
- deduplicate only when identity justifies it;
- retain read-only and writable status;
- tolerate one failing source.

## Milestone 5 — Sharing, submission, and publication

**Outcome:** users can deliberately share or submit selected notes.

- distinguish access grants, copies, links, submissions, and publication;
- configure or discover a submission inbox;
- support WAC or ACP through explicit operations;
- show permission failures as ordinary states;
- keep the author's published collection separate from the submission inbox;
- test revocation and update behaviour where possible.

## Milestone 6 — Reusable component package

**Outcome:** the component works on an unrelated site without assumptions tied to the book.

- document host integration contract;
- support custom anchor discovery;
- support custom note sources and inboxes;
- expose templates, styles, commands, actions, and public APIs intentionally;
- provide CDN and module entry points;
- provide a minimal standalone example;
- define versioning and compatibility policy.

## Milestone 7 — Interoperability conventions

**Outcome:** the application can hand data or actions to another compatible application.

Only implement conventions that solve a demonstrated need:

- resource and WebID URL parameters;
- preferences;
- launcher integration;
- intent or share actions;
- notifications;
- a common bus, if a concrete use case remains.

Each convention must be labelled as standard, established convention, Muze convention, or experiment.

## Milestone 8 — Residential programming

**Outcome:** an opted-in user can modify the component without forking it.

- load one local overlay layer;
- compose remote modifications before presenting one active overlay;
- override templates, styles, functions, commands, and actions;
- allow new component parts;
- keep lexical imports and explicit component references;
- recover from broken overlays;
- record provenance and compatibility;
- demonstrate replacing the target-resolution strategy or editor.

## Exit criteria for the reference application

The application is ready to drive the book when it has:

- one coherent linked-data model across storage modes;
- working multi-source views;
- source-aware save behaviour;
- tested unknown-data preservation;
- explicit identity and storage-target rules;
- permissions and failure states;
- an unrelated integration example;
- at least one interoperable second consumer or fixture;
- a complete record of significant design changes;
- evidence linking every implemented SimplySolid capability to an application pressure and validation path.

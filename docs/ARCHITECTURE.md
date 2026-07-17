# Proposed Architecture

This document defines boundaries to test, not an implementation that must be preserved.

## Layer overview

### Host integration

Responsible for:

- discovering canonical page identity;
- finding annotatable elements;
- reading stable identifiers and page metadata;
- reporting navigation or content changes;
- mounting the component.

It must not know how Solid resources are loaded or saved.

### Annotation targeting

Responsible for:

- creating selectors for a target;
- resolving selectors against the current document;
- reporting exact, approximate, ambiguous, or unresolved matches;
- keeping page-specific DOM logic out of the linked-data model.

### Application state

SimplyFlow is expected to manage:

- active document and target;
- visible note sources;
- selected note;
- editor state;
- derived note lists;
- commands and actions;
- loading, saving, and error states.

Reactive state should describe the application. Network requests and storage writes should remain explicit effects.

### Presentation components

Responsible for markers, lists, editors, source selectors, and status messages. Components should receive data and capabilities rather than fetch resources directly.

### Annotation model

OLDM is expected to expose native linked data through ordinary property access. The application should keep identifiers, links, and unknown predicates intact.

JAQT may provide derived views that require graph-pattern queries rather than direct property access.

### Shapes

OLDM Shape is expected to:

- discover annotations and related subjects;
- define the minimum data a component expects;
- optionally validate data before save.

Shapes must not turn open linked data into closed application classes. Additional predicates remain part of the working graph.

### Storage ports

The application should depend on a small capability-oriented interface rather than on a universal storage abstraction.

Likely capabilities include:

- list or load annotation sources;
- add a source;
- create an annotation;
- update or delete an annotation where allowed;
- save pending changes;
- report provenance and write capability;
- subscribe to change notifications where supported.

Browser storage and SimplySolid may satisfy these capabilities differently while exposing the same annotation graph.

### Solid transport and identity

Expected responsibilities:

- Lading: authentication, session, authenticated fetch;
- jsfs-solid: resources, containers, files, metadata, HTTP behaviour;
- SimplySolid: source-aware workspace, shaped collections, pending changes, save routing.

The exact split must be confirmed during implementation.

### Discovery and preferences

Responsible for finding or remembering:

- the user's annotation storage;
- configured public sources;
- an inbox for submissions;
- preferred editor and presentation options;
- app identifiers and supported conventions.

Discovery may use profiles, preferences, type indexes, page metadata, explicit configuration, or a remembered user choice. These mechanisms should not be collapsed into one opaque lookup.

### Sharing and publication

Responsible for explicit operations such as granting access, copying, submitting, or publishing. This policy belongs above generic resource storage.

### Residential overlays

Loaded only when the host application opts in. Local and remote overlays may modify or add component parts, but the core application must remain recoverable.

## Dependency direction

A desired dependency direction is:

```text
host page
  -> application composition
    -> presentation components
    -> annotation targeting
    -> application services
      -> workspace / storage capabilities
        -> linked-data model
        -> Solid transport and authentication
```

Lower layers must not import application policy from higher layers.

## Source-aware state

A note shown in one list may have come from browser storage, a private Pod resource, or a public source. The application must retain:

- subject identity;
- source resource;
- whether the source is writable;
- pending local changes;
- save result per resource;
- optional origin or derivation information.

Flattening notes into anonymous JavaScript records would lose the property the application is intended to demonstrate.

## Boundaries to test early

1. Can one shaped collection span browser and Solid sources without lying about provenance?
2. Can a component edit a note without knowing its resource URL?
3. Can unknown predicates survive edit and save?
4. Can several changed resources produce partial success without corrupting local state?
5. Can local and remote storage use one linked-data identity model?
6. Can target resolution remain separate from annotation storage?
7. Can permissions be exposed without baking WAC or ACP rules into presentation components?

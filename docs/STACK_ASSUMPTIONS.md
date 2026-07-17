# Muze Stack Assumptions

This document records the expected role of each library. It is not a promise that every library must be used. Implementation should remove or change a dependency when the boundary proves wrong.

## SimplyFlow

Expected role:

- reactive application state;
- commands and actions;
- DOM bindings;
- lists, pages, and components;
- explicit effects around storage and network operations.

Questions to test:

- handling several independently loading sources;
- representing partial failure;
- reconnecting an editor or overlay after navigation and reload.

## OLDM

Expected role:

- native linked-data subjects and properties;
- `$`-style vocabulary names;
- preservation of identity, links, datatypes, languages, and unfamiliar predicates;
- one graph model across local and remote storage.

## JAQT

Expected role:

- graph-pattern queries for derived annotation views;
- combining related subjects without mapping them into application-owned classes;
- reactive query results where appropriate.

Use only where direct property access is no longer clear.

## OLDM Shape

Expected role:

- discovering annotations and related subjects;
- expressing the minimum facts needed by a component or operation;
- optional validation before save.

It must not become a closed mapper. Extra predicates remain present and saveable.

## Lading

Expected role:

- Solid login and session lifecycle;
- authenticated fetch or transport setup;
- keeping identity concerns outside application data and presentation.

## jsfs-solid

Expected role:

- reading and writing resources and ordinary files;
- container discovery;
- HTTP metadata and errors;
- non-RDF assets used by notes or editors.

## SimplySolid

Expected role:

- a source-aware workspace over resources and containers;
- shaped collections;
- provenance and write-target tracking;
- pending changes;
- `createIn` decisions for new roots;
- save results per resource;
- optional notifications without automatic merge.

This application is expected to be a major integration test for the workspace design.

## Assert

Expected role:

- executable preconditions, postconditions, and invariants;
- clear separation of programmer errors from expected network and permission failures;
- component and service contracts used throughout examples.

## Cobalt Note

Expected role:

- note editing UI and structured body representation.

The application should not require every external annotation consumer to adopt Cobalt.

## Metro

Possible role:

- small reusable UI elements and base styling.

Metro should be used where it improves the component, not to make the application a showcase for every package.

## SimplyCode and residential programming

Later role:

- inspect and modify component-shaped units;
- store one local overlay layer;
- compose remote modifications;
- add or override functions, templates, styles, commands, actions, transformers, and APIs;
- keep opt-in and recovery behaviour explicit.

## Status labels for documentation

Every feature described in code or book material should be labelled as one of:

- Web platform standard;
- W3C or Solid standard;
- established ecosystem convention;
- Muze library behaviour;
- Muze application convention;
- experiment or proposal.

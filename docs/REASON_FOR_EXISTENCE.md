# Reason for Existence

## The problem

A book about building Solid applications can easily describe an architecture that looks coherent on paper but fails at the first real boundary: paragraph identity, data discovery, permissions, partial saves, unknown predicates, concurrent edits, or reuse on a site the original author did not control.

Writing the book first would force later chapters to repair assumptions introduced earlier. It would also make the Muze libraries appear more settled than they are.

## Why this application comes first

The margin-notes application is a compact but demanding reference application. It requires:

- an embeddable user interface;
- reactive local state;
- stable links into documents;
- native linked data;
- browser and Solid storage;
- several read-only and writable sources in one view;
- identity and target-resource decisions;
- permissions and publication;
- graceful behaviour without login or network access;
- interoperability with sites and applications outside the book;
- a path towards residential programming.

Each of these requirements tests a claim made in *Programming for Wizards* and a boundary in the Muze stack.

## What this repository is for

This repository has four jobs.

### 1. Reference implementation

It should become a complete example of a small Solid application built with Muze libraries. Examples in the future book should be extracted from working code rather than invented separately.

### 2. Stack integration test

The application should reveal where SimplyFlow, OLDM, JAQT, Lading, jsfs-solid, SimplySolid, Assert, Cobalt, Metro, and later residential-programming tools fit together—or fail to fit together.

### 3. Design laboratory

Unexpected problems should be recorded before they are polished away. The project should capture the naive solution, why it failed, the chosen solution, and which layer owns it.

### 4. Source material for the book

The future book should follow the order in which the application acquires capabilities. It should explain real detours, not only the final API.

## Definition of success

The repository succeeds when the component can be embedded on an unrelated website and can:

- create notes locally without requiring Solid;
- use the same linked-data model locally and remotely;
- attach a note to a stable fragment of a changing document;
- store private notes in a user-selected Solid location;
- combine notes from several sources without erasing provenance;
- preserve data it does not understand;
- distinguish private notes, shared notes, submissions, and published notes;
- expose useful failure and permission states;
- share data with another compatible application;
- be modified through an opt-in residential overlay without forking the original.

## Non-goals

This project is not intended to become:

- a universal annotation server;
- a complete RDF editor;
- a generic abstraction that hides every difference between WAC and ACP;
- a mandatory application shell for all Solid software;
- a reason to force every Muze library into one application;
- a second implementation of browser or Solid standards when a small adapter will do.

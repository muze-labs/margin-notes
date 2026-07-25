# Demand-Driven SimplySolid Development

This application is a design probe for SimplySolid. It should test the design by trying to build a real application, not by implementing the design document in advance.

## Governing rule

Do not implement a SimplySolid capability solely because it appears in a design document.

A library change must be justified by a concrete application slice that cannot be completed cleanly with the current stack. Implement the smallest coherent capability that completes that slice, then return to the application.

## Development loop

For each vertical slice:

1. State the user-visible behaviour.
2. Try to implement it with the current libraries.
3. Record the exact point where the current API becomes insufficient or distorts the application.
4. Decide which layer owns the missing behaviour.
5. Write a small proposal before changing a shared library.
6. Implement the narrowest coherent API.
7. Add library contract tests and an application integration test.
8. Exercise the path against a real Solid server when network or persistence semantics are involved.
9. Update the feature state, design-pressure log, decisions, and book notes.

The desired evidence chain is:

> application need → design pressure → proposal → tests → library change → application use → design update

Avoid the reverse chain:

> design document → broad implementation → application forced to fit it

## Choosing the owning layer

Prefer the narrowest layer that can own the behaviour without leaking policy.

### Keep it in the application when

- it is specific to margin notes, books, paragraphs, publication, or this site's user experience;
- only one caller needs it;
- the application can express it without losing linked-data semantics;
- moving it into a library would require options for imagined future callers.

### Put it in the reusable component when

- another host site needs the same behaviour;
- it belongs to annotation presentation or interaction;
- it can be configured without learning resource locations or login policy.

### Put it in SimplySolid when

- the need concerns source-aware linked data across resources;
- the application would otherwise lose provenance, identity, pending-change ownership, or save routing;
- the behaviour is independent of margin notes;
- a small API can express it without embedding application policy.

### Put it elsewhere in the stack when

- the need is authentication or session lifecycle: Metro-Solid;
- the need is resource transport or container access: jsfs-solid;
- the need is linked-data representation: OLDM;
- the need is shape matching or validation: OLDM Shape;
- the need is querying: JAQT;
- the need is contracts: Assert;
- the need is reactive UI composition: SimplyFlow.

A missing application feature is not automatically a missing SimplySolid feature.

## Required evidence for a SimplySolid change

Before implementation, record:

- the active application slice;
- the attempted use of the current API;
- the observable problem;
- why application-local code is not sufficient;
- the proposed API;
- alternatives rejected;
- explicit non-goals;
- tests that will prove the need;
- expected documentation changes.

Use `docs/proposals/0000-template.md` and link it from `docs/DESIGN_PRESSURES.md`.

## Stopping rules

Stop and record the idea rather than implementing it when:

- no active slice requires it;
- the API needs a plugin system, callback family, or strategy interface for hypothetical variation;
- the same result can be reached with an explicit value or synchronous function;
- the change hides WAC, ACP, HTTP, or resource semantics that the application must understand;
- the change maps linked data into a closed application model;
- the proposal cannot name an application test that would fail without it;
- the feature is useful only after several other unimplemented features exist.

## Validation is stronger than implementation

A feature is not validated merely because it has unit tests. It is validated only after the margin-notes application uses it in an end-to-end path and the design still holds.

See `docs/SIMPLYSOLID_FEATURES.md` for the state model.

## Repository boundary

The margin-notes application and `solid-tools` should remain separate repositories and packages. During development, use a local workspace, file dependency, or package link.

A task may require changes in both repositories, but keep the commits separate:

- one commit in `solid-tools` for the smallest library capability;
- one commit here that uses and validates that capability.

Do not hide experimental SimplySolid code inside this application. Do not copy application policy into `solid-tools` to avoid coordinating two repositories.

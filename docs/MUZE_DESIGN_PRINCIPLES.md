# Muze Design Principles

This project follows the Muze design principles from the shared Muze policy:

<https://github.com/muze-nl/.github/blob/main/maturity-policy.md>

Use these principles when changing the margin-notes app or proposing changes to associated Muze libraries.

## Product And Code Direction

Muze builds web software for technically curious people who are not necessarily professional programmers, while still keeping the tools serious enough for professionals.

Prefer:

- simple vertical slices over complete feature surfaces;
- small libraries with one clear concern;
- abstractions that respect conceptual boundaries;
- browser-native standards before custom machinery;
- lightweight APIs only when they make application code easier to read and write;
- stable long-term public APIs;
- components and frameworks that can be adapted or replaced;
- open, standards-based, and open-source hosting paths;
- software that remains small enough for slow devices and connections;
- view-source friendly code that invites developers to inspect, learn, and modify it.

When there is a trade-off, prefer composability, replaceability, web-platform alignment, and long-term simplicity over convenience, popularity, or feature breadth.

## How This Applies Here

- Margin-notes code should be readable as an example, not merely functional.
- A feature should remain application-local until there is evidence that a reusable library boundary is needed.
- A shared-library change should expose the smallest stable API that solves the demonstrated application need.
- Solid and linked-data behavior should stay visible where the application needs to reason about it; do not hide important resource, permission, or provenance semantics behind convenience wrappers.
- Components should be replaceable parts of the page rather than a framework-owned world.
- Browser-local operation should stay useful, small, and inspectable while Solid-backed behavior is incomplete.

## Package Namespace Maturity

The `@muze-nl` npm namespace is a production-readiness signal. A package published there should have a stable public API, install cleanly in a fresh project, and document supported usage clearly.

Experimental libraries belong under `@muze-labs` until they are ready for that stronger signal. Moving a package from `@muze-labs` to `@muze-nl` is a release-readiness decision, not only a naming cleanup.

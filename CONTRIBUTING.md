# Contributing

The project is not yet open for general contributions, and no licence has been selected. Discussion and experiments should remain small and tied to the active slice in `docs/CURRENT_SLICE.md`.

A useful change should:

- solve a concrete reference-application problem;
- preserve the local end-to-end path;
- include tests or an observable acceptance case;
- update design documents when evidence changes an assumption;
- add a book note when it exposes a teachable boundary;
- avoid broad abstractions that have only hypothetical callers.

## Shared-library changes

Do not open a SimplySolid implementation change merely because the design contains the feature.

First:

1. record the problem in `docs/DESIGN_PRESSURES.md`;
2. demonstrate it in the active slice;
3. decide the owning layer;
4. add a proposal under `docs/proposals/` when a shared-library change remains justified;
5. name both the library contract test and the application validation test.

Keep changes to `solid-tools` and this repository in separate commits. See `docs/WORKING_WITH_SOLID_TOOLS.md`.

## Pull requests

Use the pull-request template. A pull request that changes a shared-library assumption should link the design pressure, proposal, test evidence, feature-state update, and relevant decision or book note.

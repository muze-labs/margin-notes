# Shared-Library Proposals

Use this directory only when an active application slice may require a change to SimplySolid or another shared Muze library.

A proposal is not permission to implement a roadmap item. It records the evidence for the smallest change under consideration.

## Naming

Use a sequential number and a concise name:

`0001-source-aware-readonly.md`

Link the proposal from its entry in `docs/DESIGN_PRESSURES.md`.

## Lifecycle

1. Draft the proposal from an observed pressure.
2. Run the smallest useful experiment.
3. Accept, revise, reject, or resolve the pressure outside the library.
4. When accepted, implement contract tests and the narrow change in the owning repository.
5. Validate it in this application.
6. Keep rejected proposals; mark their outcome and evidence.

# AI-Assisted Workflow

AI assistance is useful for exploration, implementation, review, tests, and documentation. It must not quietly turn provisional ideas into project history.

## Before changing code

An assistant should read, at minimum:

- `README.md`;
- `AGENTS.md`;
- `docs/DESIGN.md`;
- `docs/ARCHITECTURE.md`;
- `docs/DECISIONS.md`;
- `docs/OPEN_QUESTIONS.md`;
- the current milestone in `docs/IMPLEMENTATION_PLAN.md`.

## Working rules

1. Prefer a complete vertical slice over speculative infrastructure.
2. Do not invent an API merely to make documentation look complete.
3. Mark assumptions and proposals explicitly.
4. Preserve existing user decisions unless implementation evidence requires revisiting them.
5. When a decision changes, update the decision log and explain the evidence.
6. Keep application policy out of generic libraries unless the same need appears independently.
7. Add tests that demonstrate source identity, unknown-data preservation, failure behaviour, and permissions.
8. Never silently publish, migrate, or broaden access to user notes.
9. Keep browser-only operation functional while Solid work is incomplete.
10. Do not describe a Muze convention as part of the Solid specification.

## Suggested task format

AI-assisted implementation tasks should state:

- the milestone outcome;
- the smallest end-to-end behaviour to add;
- relevant accepted decisions;
- explicit non-goals;
- tests or observable acceptance criteria;
- documents that must be updated when the task reveals a design change.

## Review questions

For every significant change, ask:

- Has a presentation component learned a storage location?
- Has linked data been flattened into an application-owned duplicate model?
- Can unknown predicates survive?
- Is subject identity stable?
- Is the save target explicit and source-aware?
- Is a permission or network failure represented as an expected state?
- Does local mode still work?
- Is a standard being confused with a project convention?
- Did the change produce a lesson for the book?

## Documentation discipline

AI-generated prose should be edited to match the project's direct style. Avoid generic claims of completeness. Prefer concrete boundaries, trade-offs, and observed behaviour.

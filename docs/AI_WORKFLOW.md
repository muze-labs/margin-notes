# AI-Assisted Workflow

AI assistance is useful for exploration, implementation, review, tests, and documentation. It must not quietly turn provisional ideas into project history or a SimplySolid roadmap into speculative code.

## Before changing code

An assistant should read, at minimum:

- `README.md`;
- `AGENTS.md`;
- `docs/CURRENT_SLICE.md`;
- `docs/DESIGN.md`;
- `docs/ARCHITECTURE.md`;
- `docs/DATA_MODEL.md`;
- `docs/PROGRAMMING_FOR_WIZARDS_TOUCHSTONE.md`;
- `docs/MUZE_DESIGN_PRINCIPLES.md`;
- `docs/DEMAND_DRIVEN_SIMPLYSOLID.md`;
- `docs/DECISIONS.md`;
- `docs/OPEN_QUESTIONS.md`;
- `docs/DESIGN_PRESSURES.md`;
- `docs/SIMPLYSOLID_FEATURES.md`.

## Default working loop

1. Restate the active slice as observable user behaviour.
2. Implement or test the smallest complete path with the current stack.
3. Keep a problem in application code until evidence identifies a reusable boundary.
4. When blocked, record the design pressure before proposing a library API.
5. Run the smallest experiment that can decide the owning layer.
6. For a shared-library change, write a proposal and explicit non-goals.
7. Add tests before or with implementation.
8. Return immediately to the application and validate the new capability.
9. Update feature states, decisions, open questions, status, and book notes.

## Working rules

1. Prefer a complete vertical slice over speculative infrastructure.
2. Do not invent an API merely to make documentation look complete.
3. Do not implement SimplySolid from its design document ahead of application need.
4. Mark assumptions and proposals explicitly.
5. Preserve existing user decisions unless implementation evidence requires revisiting them.
6. When a decision changes, update the decision log and explain the evidence.
7. Keep application policy out of generic libraries.
8. Add tests that demonstrate source identity, unknown-data preservation, failure behaviour, and permissions when relevant.
9. Never silently publish, migrate, or broaden access to user notes.
10. Keep browser-only operation functional while Solid work is incomplete.
11. Do not describe a Muze convention as part of the Solid specification.
12. Do not call a feature validated until this application exercises it end to end.
13. Use Muze design principles when choosing trade-offs: prefer simplicity, composability, replaceability, browser-native standards, long-term API stability, and view-source-friendly code.
14. Keep experimental packages under `@muze-labs`; use `@muze-nl` only when the package is ready to signal stable supported use.
15. Keep the margin-notes app aligned with the why from *Programming for Wizards*: private notes, stable passage addresses, linked meanings, user-owned storage, deliberate sharing, and replaceable tools.
16. Warn before implementing a change that moves away from that touchstone.

## Task format

AI-assisted implementation tasks should state:

- the current slice and user-visible outcome;
- the smallest end-to-end behaviour to add;
- relevant accepted decisions;
- explicit non-goals;
- tests or observable acceptance criteria;
- design pressures that may be investigated;
- documents that must be updated when evidence changes the design.

For cross-repository work, also state:

- which repository owns each change;
- the expected library contract test;
- the expected application integration test;
- the commit or package version used for validation.

## Library-change gate

Before changing SimplySolid or another shared library, the assistant must be able to answer:

1. Which current user-visible behaviour is blocked?
2. What was attempted with the existing API?
3. What observable failure or distortion resulted?
4. Why is application-local code the wrong owner?
5. What is the smallest proposed API?
6. What nearby capability remains deliberately unsupported?
7. Which library test proves the contract?
8. Which application test validates the need?

If these answers are unavailable, continue the application experiment or record an open question. Do not implement the library idea.

## Review questions

For every significant change, ask:

- Has a presentation component learned a storage location?
- Has linked data been flattened into an application-owned duplicate model?
- Can unknown predicates survive?
- Is subject identity stable?
- Is source provenance still available?
- Is the save target explicit and source-aware?
- Is a permission or network failure represented as an expected state?
- Does local mode still work?
- Is a standard being confused with a project convention?
- Is a designed feature being described as implemented or validated?
- Does the change preserve composability, replaceability, browser-platform alignment, and long-term simplicity?
- Does the change still reflect the *Programming for Wizards* why, or should the user be warned before continuing?
- Would a curious developer understand the code by reading it directly?
- Does any package namespace change match the package's maturity?
- Did the change produce a lesson for the book?

## Status updates during AI work

Keep progress reports tied to evidence:

- what end-to-end path now works;
- what concrete pressure was observed;
- which assumption was disproved;
- which test now captures the behaviour.

Avoid reporting speculative architecture as progress.

## Documentation discipline

AI-generated prose should match the project's direct style. Avoid generic claims of completeness. Prefer concrete boundaries, trade-offs, and observed behaviour.

Do not clean up the history so thoroughly that the reason for a boundary disappears. The application exists partly to preserve those reasons for the book.

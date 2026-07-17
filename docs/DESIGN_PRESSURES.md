# Design Pressures

This log records concrete pressure from the application on the current stack. It is not a wishlist for SimplySolid.

A design pressure begins when an active application slice encounters a real boundary problem. It ends when the problem is resolved in the correct layer and demonstrated by tests.

## Status values

- **Observed** — the active slice exposed a concrete problem
- **Investigating** — small alternatives or experiments are in progress
- **Proposed** — an owning layer and smallest change have been proposed
- **Resolved in application** — no shared-library change was needed
- **Resolved in component** — solved in the reusable margin-notes component
- **Resolved in library** — a shared-library change was implemented
- **Validated** — the application uses the result end to end
- **Closed** — the original pressure was based on a mistaken assumption or disappeared

## Index

| ID | Status | Active slice | Pressure | Owning layer | Evidence |
|---|---|---|---|---|---|
| DP-000 | Closed | Repository setup | Establish a demand-driven process before SimplySolid implementation begins. | Project workflow | `docs/DEMAND_DRIVEN_SIMPLYSOLID.md` |

No SimplySolid capability is currently required by an implemented application slice.

## Entry template

Copy this section for each new pressure.

```markdown
## DP-NNN: Concise problem name

**Status:** Observed  
**Active slice:** Link to `docs/CURRENT_SLICE.md` or issue  
**Opened:** YYYY-MM-DD

### User-visible need

What must the current slice allow the reader to do?

### Attempt with the current stack

What code or API was tried?

### Observable problem

What became impossible, unsafe, misleading, or unnecessarily duplicated?

### Why this is not merely application policy

Explain why the application or component should not own the behaviour.

### Candidate owning layers

- Application
- Margin-notes component
- SimplySolid
- Another named library
- Convention or documentation only

### Smallest experiment

What is the least work that can distinguish the candidates?

### Proposal

Link to `docs/proposals/NNNN-name.md` when a shared-library change is proposed.

### Evidence

Link to failing tests, fixtures, examples, commits, or issue discussions.

### Resolution

What changed, in which repository, and what remained deliberately unsupported?

### Validation

Which end-to-end application test demonstrates the result?

### Book consequence

What should the future book explain because this pressure existed?
```

## Logging rules

- Record the pressure before implementing a shared-library solution.
- Describe observed behaviour, not a preferred API.
- One pressure may end with no library change.
- Split pressures when they have different owning layers or tests.
- Link design changes to evidence; do not rewrite history into a tidy story.

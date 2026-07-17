# Decision Log

Record decisions here while the project is small. Larger decisions may later move into individual ADR files.

Statuses:

- **Accepted** — current direction; implementation may still force revision
- **Proposed** — plausible direction requiring a test
- **Deferred** — intentionally postponed
- **Rejected** — considered and not chosen

| ID | Status | Decision | Reason |
|---|---|---|---|
| D001 | Accepted | Build the reference application before writing the book. | The application should expose real constraints and prevent the book from teaching speculative solutions. |
| D002 | Accepted | Start with browser storage and no login. | It produces a complete vertical slice and keeps Solid integration from hiding basic product problems. |
| D003 | Accepted | Use one linked-data model for local and Solid-backed notes. | Storage mode should not create two application models or a later migration rewrite. |
| D004 | Accepted | Keep the component reusable outside *Programming for Wizards*. | Reuse is one of the claims the project is meant to test. |
| D005 | Accepted | Allow the host page to configure or advertise a submission inbox. | Other site authors must not be forced to use the book author's inbox. |
| D006 | Accepted | Allow site-provided public note sources, default or optional. | A site author may curate notes without owning the reader's private notes. |
| D007 | Accepted | Treat submission and publication as separate operations. | An inbox is not a public collection, and curation must not silently publish user data. |
| D008 | Accepted | Prefer stable host-provided fragment identifiers, augmented by quote/context selectors. | No single targeting mechanism survives every document change. |
| D009 | Accepted | Preserve unknown predicates and extra types. | A Solid application is one partial view over shared open-world data. |
| D010 | Accepted | Keep provenance and write capability with each loaded subject. | A combined UI must not imply that all notes came from or can be saved to one place. |
| D011 | Accepted | Introduce contracts early and keep them in later examples. | Boundary assumptions should remain executable rather than becoming prose only. |
| D012 | Accepted | Load residential overlays only after explicit application opt-in. | User-modifiable code is powerful and must not be discovered or executed silently. |
| D013 | Proposed | Use the W3C Web Annotation vocabulary as the base data model. | It already describes annotations, bodies, targets, and selectors, but must be tested against Cobalt and Solid save behaviour. |
| D014 | Proposed | Keep resource loading outside presentation components. | Reusable components should depend on data and capabilities rather than storage locations. |
| D015 | Proposed | Use a source-aware SimplySolid workspace as the central Solid data boundary. | It matches the need to combine multiple resources while preserving provenance and save targets. |
| D016 | Deferred | Define launcher, intent, and common-bus conventions. | These should be driven by a working interoperability need, not added to complete a conceptual stack. |
| D017 | Deferred | Choose a public software licence. | The project owner should make this explicit before outside reuse or contributions. |
| D018 | Accepted | Use the margin-notes application as a demand-driven test of SimplySolid. | Shared-library work should follow concrete application pressure rather than the SimplySolid design roadmap. |
| D019 | Accepted | Track SimplySolid capabilities as designed, required, implemented, or validated. | A design idea, tested library API, and successful application path are different kinds of evidence. |
| D020 | Accepted | Require a design-pressure entry and small proposal before adding a shared-library capability. | The record prevents AI-assisted work from turning speculative gaps into broad abstractions. |
| D021 | Accepted | Keep SimplySolid implementation in `solid-tools`, with separate library and application commits. | The reference application must validate the package boundary rather than hide framework code locally. |

## Decision template

When adding a decision, capture:

1. the concrete problem;
2. the naive or previous solution;
3. evidence that it failed or became insufficient;
4. the selected solution;
5. which layer owns the solution;
6. consequences and unresolved risks;
7. likely book chapter or lesson.

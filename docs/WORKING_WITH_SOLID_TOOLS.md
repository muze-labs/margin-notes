# Working with `solid-tools`

The margin-notes repository tests the SimplySolid design, but it should not contain SimplySolid implementation code.

## Local development layout

A convenient checkout is:

```text
work/
├── solid-margin-notes/
└── solid-tools/
```

Use the package manager's workspace, file dependency, or link mechanism once implementation tooling has been selected. Record the exact command in this document when it becomes real; do not invent package scripts in advance.

## Cross-repository task sequence

When a slice exposes a genuine library need:

1. Add a design-pressure entry here.
2. Add a proposal under `docs/proposals/`.
3. Create a failing application test or a minimal reproduction.
4. Add failing contract tests in `solid-tools`.
5. Implement the smallest library change in `solid-tools`.
6. Commit the library change separately.
7. Update this application to use the local package.
8. Make the application test pass without application-specific library options.
9. Commit the application integration separately.
10. Update the feature matrix and design documents in both repositories.

## Commit boundaries

Prefer commits that tell the evidence chain clearly.

Example library commit:

```text
simplysolid: preserve source capability in collection items
```

Example application commit:

```text
show private and read-only public notes together
```

Avoid commits that mix unrelated application UI, library abstractions, and document rewrites.

## Version references

Until packages are released, record the exact `solid-tools` commit used by an application milestone. Once releases exist, record package versions in examples and book notes.

## AI coordination

An AI assistant working in only one repository must not assume it can edit the other. It should leave a complete proposal, test expectation, and integration requirement rather than simulating the missing change locally.

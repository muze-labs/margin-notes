# Working with `solid-tools`

The margin-notes repository tests the SimplySolid design, but it should not contain SimplySolid implementation code.

Cross-repository work must also follow the Muze design principles in [MUZE_DESIGN_PRINCIPLES.md](MUZE_DESIGN_PRINCIPLES.md): small single-concern libraries, correct conceptual boundaries, browser-native standards where practical, stable APIs, replaceability, and view-source-friendly code.

## Local development layout

A convenient checkout is:

```text
work/
├── solid-margin-notes/
└── solid-tools/
```

The application now uses published Solid Tools, SimplyFlow, and OLDM packages.
Install the recorded dependency tree with `npm ci`, then run `npm run lint` and
`npm test`. The existing application lockfile records the tested versions.

Cobalt is temporarily the exception: `scripts/build.mjs` resolves its built
packages from `../cobalt-note/packages/*/dist`. Build that sibling checkout with
`npm install --package-lock=false` and `npm run build` until the new scoped Cobalt
releases are available. Remove those aliases when installing the published editor.

For a library repair, use an explicit temporary local dependency or link and
record the library commit. Return to registry dependencies after release and
verify with `npm ls` that matching versions have not retained local symlinks.
Tests must use public package exports rather than another repository's internal
source paths.

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

Keep experimental package work under `@muze-labs`. Treat any move into `@muze-nl` as release-readiness work requiring a stable public API, fresh-project installability, and clear supported-usage documentation.

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

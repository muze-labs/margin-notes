# Project Structure — Current M3.2 Implementation

This document describes the current project structure for the margin-notes application while M3.2 is in progress.

## Technology Stack

- **Language**: Vanilla JavaScript (ES modules)
- **Documentation**: JSDoc for type hints
- **Build**: esbuild for bundling
- **Tests**: Node.js native test runner
- **Linting**: ESLint

## Directory Structure

```
margin-notes/
├── src/
│   ├── index.js              # Entry point (exposes API to host)
│   ├── host-contract.js      # API definitions and executable validation
│   ├── component.js          # SimplyFlow app setup and compatibility adapter
│   ├── design-system.css     # Curated the-ds subset imported as text
│   ├── cobalt-editor-modal.html # Modal markup imported as text
│   ├── cobalt-editor-modal.css  # Modal styles imported as text
│   └── features/
│       ├── paragraph-note-stacks.js # Feature component for paragraph-side notes
│       └── paragraph-note-stacks/   # Feature model, templates, and styles
├── dist/
│   ├── index.js              # Built browser bundle
│   └── index.js.map          # Source map
├── test/
│   └── host-contract.test.js # Contract tests
├── examples/
│   └── simple.html           # Example host page
├── scripts/
│   ├── build.mjs             # Build script (esbuild)
│   ├── dev.mjs               # Development server
│   └── README.md             # Scripts documentation
├── package.json              # Project dependencies and scripts
├── eslint.config.js          # Linting configuration
└── docs/                     # Design documents (existing)
```

## Host API Contract

The component exposes a simple API that host pages use. See [src/host-contract.js](../src/host-contract.js).

### Key Types & Recommended Anchor ID Format

The component uses a simple host API. Host pages should mark annotatable elements with both:
- A stable element ID following the pattern: `{type}-{namespace}-{text-slug}`
- A `data-note-target` attribute to identify annotatable elements

**ID Format Examples:**
```html
<!-- Paragraph -->
<p id="p-chapter1-dependencies-are-not-a-problem" data-note-target>
  Dependencies are not a problem in themselves...
</p>

<!-- Heading -->
<h2 id="h-chapter1-section-title" data-note-target>
  Section Title
</h2>

<!-- Blockquote -->
<aside id="aside-chapter1-note-title" data-note-target>
  <p>Important note...</p>
</aside>
```

This pattern, adopted from `programming-for-wizards`, is intended to be:

- stable across page reloads;
- human-readable and debuggable;
- useful for manual work because the slug contains a text hint;
- explicit about element type through prefixes such as `p`, `h`, and `aside`;
- namespaced by chapter, page, or host context.

**Type Definitions:**

- **`AnchorTarget`** — A stable anchor supplied by the host page
  - `id`: unique identifier (should follow the pattern above)
  - `element`: the DOM element
  - `label`: optional description

- **`HostConfig`** — Configuration passed to the component
  - `anchors[]`: array of AnchorTarget
  - `container`: where the component UI mounts
  - `namespace?`: for multiple instances (defaults to "margin-notes")
  - `storeKey?`: custom browser-local note key
  - `storageKey?`: backwards-compatible alias for `storeKey`
  - `store?`: optional object with async `load`, `save`, and `remove` methods
  - `theme?`: optional margin-notes color theme, one of `system`, `light`, or `dark`

- **`MarginNotesApp`** — The mounted SimplyFlow app
  - `destroy()`: clean up
  - `actions`: async note behavior actions
  - `getNotesForAnchor(anchorId)`: return stored notes for one anchor
  - `setTheme(theme)`: update the margin-notes color theme at runtime
  - `getTheme()`: return the current margin-notes color theme

- **`MarginNotesAPI`** — What the host page receives
  - `mount(config)`: mount and return the SimplyFlow app
  - `create()`: backwards-compatible adapter for the previous component API
  - `createSolidResourceStore(options)`: create a store adapter for one configured Solid resource

### Usage Example

```javascript
// Host page discovers annotatable elements
const anchors = Array.from(document.querySelectorAll('[data-note-target]')).map(el => ({
  id: el.id,  // Use element ID as stable anchor
  element: el,
  label: el.textContent.substring(0, 50)
}));

// Mount the SimplyFlow app
const app = MarginNotes.mount({
  anchors,
  container: { element: document.getElementById('notes') },
  theme: 'system'
});
```

## App Implementation (M1.1 Scope)

[src/component.js](../src/component.js) contains the SimplyFlow app setup. Paragraph-note behavior lives in [src/features/paragraph-note-stacks.js](../src/features/paragraph-note-stacks.js) as a feature component with templates, styles, commands, shortcuts, and async actions.

The feature component does not define app state. The app owns the state in `data.marginNotes`, and app `start()` explicitly calls the feature setup action.
Feature helpers and dependencies are merged into `app.api.notes`, so actions can call `this.api.notes` without reaching back through `app.components`.
Templates and styles live in `.html` and `.css` files and are imported as text by esbuild before being added to the app/component object. The app uses a curated local subset of `the-ds` tokens and button/dialog primitives instead of importing the whole design system into host pages.

- **Store**: small app-facing store API with async `load`, `save`, and `remove` methods over opaque values. It remains available for custom host stores and legacy local-note migration.
- **SimplySolid notes service**: the default storage path creates a local-first `notes` resource and collection through `@muze-labs/simplysolid`. The local replica is persisted in the `margin-notes-workspace` IndexedDB database, and the Solid replica is attached after WebID/resource discovery.
- **Solid resource store**: `createSolidResourceStore({ resourceUrl, solid })` implements the same store API against one configured Solid resource through Metro-Solid resource methods and Turtle serialization. Without an injected client it composes the `jsfs-solid` Metro client stack with Metro-OLDM enabled by default.
- **Stored value**: app-facing graph document containing OLDMed annotation subjects with `prefix$predicate` names; the Solid adapter stores this graph as Turtle.
- **Note structure**: `oa$Annotation` subjects with `oa$hasBody`, `oa$hasTarget`, `dcterms$created`, and `dcterms$modified`.
- **Operations**: `createNote()`, `updateNote()`, `deleteNote()`, `getNotesForAnchor()`.
- **UI**: SimplyFlow templates and commands for the paragraph-side note controls.
- **Theme**: `theme` mount config plus `setTheme()` / `getTheme()` keep margin notes on `system`, `light`, or `dark` without reading host-specific settings directly.
- **Imperative DOM boundary**: host-anchor attachment, layout measurement, focus placement, and Cobalt editor mounting.

The current browser-local note document is still JSON-like, while the Solid path stores Turtle. Both deliberately use the same object naming style OLDM exposes so the local-first workspace path does not require renaming the application model. The old store boundary remains for custom host stores and migration, but default create/update/delete/save operations now delegate to SimplySolid.

## Build & Development

**Build the component:**
```bash
npm run build
```

Output: `dist/index.js` with source map.

The current build and dependency setup resolves local SimplyFlow, Cobalt, and `solid-tools` packages from this development workspace. That is useful for stack work, but the dependency story should be made clone-friendly before the repository is used as a public teaching example.

**Run tests:**
```bash
npm test
```

The current tests cover the annotation model, local store, executable host contract, fixed-resource Solid adapter, local-first SimplySolid storage, Solid connection sync, and mounted browser paths through the SimplyFlow app.

**Development server:**
```bash
npm run dev
```

Serves `examples/simple.html` at `http://localhost:3000` for local testing.

## Example Host Page

[examples/simple.html](../examples/simple.html) demonstrates:

1. A host page with annotatable paragraphs marked with `data-note-target`
2. A container element where the component mounts
3. How the host discovers anchors and initializes the component
4. Local create, edit, delete, and reload behaviour when served with the built bundle

## Tests

Run `npm test` to build the browser bundle, run the unit tests, and exercise a mounted public API path in headless Chrome.

- Config validation for anchors, containers, duplicate ids, and optional stores
- Store-key derivation and backwards-compatible `storageKey` handling
- Annotation model creation, migration, and preservation behavior
- Local store contract over opaque values
- Mounted browser create, restore, edit, and delete path through `MarginNotesAPI.mount()`
- Mounted edit preservation of subject identity and unknown predicates
- Mounted keyboard focus, create, note traversal, action reachability, and Escape collapse

## Remaining Steps for M3.2

Priority order:

1. **Real-server smoke test** — Try the local-first connect/sync path against a disposable Solid Pod or record why fake-client evidence is enough for the current teaching step.
2. **Pending-sync UI** — Decide how offline sync-pending and failed remote writes should be visible to the reader.
3. **Example-page coverage** — Run the browser path against `examples/simple.html` or keep the fixture equivalent and explain why.

## Decision Record

This structure embodies these decisions from [docs/CURRENT_SLICE.md](../docs/CURRENT_SLICE.md):

- Component mounts through the script-tag-friendly host API.
- Host supplies stable anchors; the component does not auto-discover targets yet.
- Storage policy is local-first, with Solid connected later as a remote replica.
- Paragraph note chrome is rendered with SimplyFlow templates and commands.
- Cobalt bodies are preserved in their minimal JSON fragment form under a Muze `cobalt$fragment` predicate, with plain text duplicated through standard body predicates.

Questions still being answered in this slice:

- What identifier should a local annotation use?
- Which host contract checks reveal integration mistakes before the browser workflow runs?

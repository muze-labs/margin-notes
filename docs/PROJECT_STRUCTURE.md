# Project Structure — Current M1.1 Implementation

This document describes the current project structure for the margin-notes application while M1.1 is in progress.

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

- **`MarginNotesApp`** — The mounted SimplyFlow app
  - `destroy()`: clean up
  - `actions`: async note behavior actions
  - `getNotesForAnchor(anchorId)`: return stored notes for one anchor

- **`MarginNotesAPI`** — What the host page receives
  - `mount(config)`: mount and return the SimplyFlow app
  - `create()`: backwards-compatible adapter for the previous component API

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
  container: { element: document.getElementById('notes') }
});
```

## App Implementation (M1.1 Scope)

[src/component.js](../src/component.js) contains the SimplyFlow app setup. Paragraph-note behavior lives in [src/features/paragraph-note-stacks.js](../src/features/paragraph-note-stacks.js) as a feature component with templates, styles, commands, shortcuts, and async actions.

The feature component does not define app state. The app owns the state in `data.marginNotes`, and app `start()` explicitly calls the feature setup action.
Feature helpers and dependencies are merged into `app.api.notes`, so actions can call `this.api.notes` without reaching back through `app.components`.
Templates and styles live in `.html` and `.css` files and are imported as text by esbuild before being added to the app/component object.

- **Store**: small app-facing store API with async `load`, `save`, and `remove` methods over opaque values. The default browser-local implementation is backed by IndexedDB.
- **Stored value**: JSON-like document containing OLDMed annotation subjects with `prefix$predicate` names.
- **Note structure**: `oa$Annotation` subjects with `oa$hasBody`, `oa$hasTarget`, `dcterms$created`, and `dcterms$modified`.
- **Operations**: `createNote()`, `updateNote()`, `deleteNote()`, `getNotesForAnchor()`.
- **UI**: SimplyFlow templates and commands for the paragraph-side note controls.
- **Imperative DOM boundary**: host-anchor attachment, layout measurement, focus placement, and Cobalt editor mounting.

The current storage path does not import OLDM, parse Turtle, or write to Solid. It deliberately uses the same object naming style OLDM exposes so the later OLDM-backed path does not require renaming the application model. The store boundary is intentionally generic so a later JSFS-backed store can be tested without changing note code.

## Build & Development

**Build the component:**
```bash
npm run build
```

Output: `dist/index.js` with source map.

The current build script resolves local SimplyFlow and Cobalt package paths from this development workspace. That is useful for stack work, but the dependency story should be made clone-friendly before the repository is used as a public teaching example.

**Run tests:**
```bash
npm test
```

The current unit tests cover the annotation model, local store, and executable host contract. Browser tests still need to exercise the mounted SimplyFlow app.

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
- Mounted browser create, restore, and delete path through `MarginNotesAPI.mount()`

## Remaining Steps for M1.1

Priority order:

1. **Edit-flow browser coverage** — Verify that editing a mounted note preserves subject identity.
2. **Unknown-predicate round trip** — Verify that unrelated OLDMed facts survive mounted edit and save.
3. **Keyboard accessibility evidence** — Demonstrate create, edit, delete, note traversal, and collapse behaviour without mouse-only assumptions.
4. **Example-page coverage** — Run the browser path against `examples/simple.html` or keep the fixture equivalent and explain why.
5. **End-to-end validation** — Host page can create, edit, delete, reload, and preserve the same annotation subject identity.

Keep Solid login and remote storage out of M1.1. Local storage still needs to prove the linked-data model before SimplySolid work begins.

## Decision Record

This structure embodies these decisions from [docs/CURRENT_SLICE.md](../docs/CURRENT_SLICE.md):

- Component mounts through the script-tag-friendly host API.
- Host supplies stable anchors; the component does not auto-discover targets yet.
- Storage policy remains browser-local with no authentication.
- Paragraph note chrome is rendered with SimplyFlow templates and commands.
- Cobalt bodies are preserved in their minimal JSON fragment form under a Muze `cobalt$fragment` predicate, with plain text duplicated through standard body predicates.

Questions still being answered in this slice:

- What identifier should a local annotation use?
- Which host contract checks reveal integration mistakes before the browser workflow runs?

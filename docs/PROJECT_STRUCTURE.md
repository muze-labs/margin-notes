# Project Structure — M1.1 Implementation Start

This document describes the initial project structure for the margin-notes application at the start of M1.1 (Create and restore one local note).

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
│   ├── host-contract.js      # API definitions (JSDoc)
│   ├── component.js          # SimplyFlow app setup and compatibility adapter
│   ├── cobalt-editor-modal.html # Modal markup imported as text
│   ├── cobalt-editor-modal.css  # Modal styles imported as text
│   └── features/
│       ├── paragraph-note-stacks.js # Feature component for paragraph-side notes
│       └── paragraph-note-stacks/   # Feature templates and styles imported as text
├── dist/
│   ├── index.js              # Built bundle (5.8KB)
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

The component exposes a simple API that host pages use. See [src/host-contract.ts](../src/host-contract.ts).

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

This pattern (adopted from `programming-for-wizards`) is:
- ✅ Stable across page reloads
- ✅ Human-readable and debuggable
- ✅ Includes a text hint in the slug for easier manual work
- ✅ Clear element type prefix (p, h, aside, etc.)
- ✅ Namespaced (chapter, section, etc.)

**Type Definitions:**

- **`AnchorTarget`** — A stable anchor supplied by the host page
  - `id`: unique identifier (should follow the pattern above)
  - `element`: the DOM element
  - `label`: optional description

- **`HostConfig`** — Configuration passed to the component
  - `anchors[]`: array of AnchorTarget
  - `container`: where the component UI mounts
  - `namespace?`: for multiple instances (defaults to "margin-notes")
  - `storageKey?`: custom localStorage key

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

- **Storage**: Simple JSON in localStorage (not yet linked data)
- **Note structure**: `{ id, anchorId, body, created, modified }`
- **Operations**: `createNote()`, `updateNote()`, `deleteNote()`, `getNotesForAnchor()`
- **UI**: SimplyFlow templates and commands for the note list and actions

M1.1 deliberately uses simple JSON storage to focus on the host-component boundary. The linked-data representation will come when Milestone 2+ pressures require it.

## Build & Development

**Build the component:**
```bash
npm run build
```

Output: `dist/index.js` (5.8 KB bundle with source map)

**Run tests:**
```bash
npm test
```

Currently 8 contract tests, all passing.

**Development server:**
```bash
npm run dev
```

Serves `examples/simple.html` at `http://localhost:3000` for local testing.

## Example Host Page

[examples/simple.html](../examples/simple.html) demonstrates:

1. A host page with annotatable paragraphs (marked with `data-anchor` attributes)
2. A container element where the component mounts
3. How the host discovers anchors and initializes the component

## Tests

Run `npm test` to verify the host contract tests. They validate:

- Component creation and initialization
- Config validation (anchors, container required)
- Support for multiple instances via namespace
- Component lifecycle (initialize, destroy)

## Next Steps for M1.1

Priority order:

1. **Build setup** — Configure TypeScript transpilation (esbuild/tsc)
2. **Browser tests** — Set up Playwright or similar for integration tests
3. **Cobalt integration** — Replace prompt() with Cobalt editor for note body
4. **Keyboard accessibility** — Ensure all operations work without mouse
5. **End-to-end validation** — Host page can create, edit, delete, and reload notes

Keep storage as JSON for M1.1. The linked-data (RDF/Turtle) graph representation comes in M2 when SimplySolid is introduced.

## Decision Record

This structure embodies these decisions from [docs/CURRENT_SLICE.md](../docs/CURRENT_SLICE.md):

- ✅ Component mounts through script tag (host API)
- ✅ Host supplies stable anchors (no auto-discovery yet)
- ✅ One native data model in memory (simple JSON for now)
- ✅ Storage policy kept separate (localStorage, no auth)
- ✅ Tests for the contract boundary

Questions to answer in this slice are now testable:

- ✅ What is the smallest useful host API? → `HostConfig` with anchors and container
- ⏳ What identifier should a local annotation use? → Testing in browser tests
- ⏳ How should browser storage represent a graph? → JSON now, graph later
- ⏳ What Cobalt representation belongs in the annotation body? → To be integrated
- ⏳ Which contracts reveal host integration mistakes early? → Covered by tests

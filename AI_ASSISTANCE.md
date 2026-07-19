# AI Assistance Guide

Use this file as working context when asking an AI assistant to change the margin-notes app. The goal is not just to make the code work, but to keep it a clear example of the Muze stack, SimplyFlow, and component-shaped programming.

## First Principles

- Build the smallest working vertical slice that answers the current request.
- Prefer existing project decisions over generic best practices. Read `docs/PROGRAMMING_FOR_WIZARDS_TOUCHSTONE.md`, `docs/MUZE_DESIGN_PRINCIPLES.md`, `docs/DECISIONS.md`, `docs/PROJECT_STRUCTURE.md`, and `AGENTS.md` before architectural edits.
- Keep the application useful without Solid until the Solid milestone requires otherwise.
- Treat this app as example code: clarity of stack usage matters as much as behavior.
- Treat the margin-notes app as the book's practical example: private first, stable passage targets, linked meanings, user-owned storage, deliberate sharing, and replaceable tools.
- Warn the user before implementing any change that moves away from the book touchstone.
- Apply the Muze preference for simplicity, composability, replaceability, browser-native standards, long-term API stability, and view-source-friendly code.
- For associated libraries, keep experimental work under `@muze-labs`; treat any move to `@muze-nl` as a production-readiness decision.

## SimplyFlow App Shape

- The top-level app owns all state in `app.data`.
- Feature components must not own state. They may provide setup behavior that creates or initializes objects inside `app.data`, but that setup is called explicitly by the app start hook.
- Prefer SimplyFlow lifecycle APIs such as `hooks.start` when the installed SimplyFlow version supports them. If the local API differs, inspect the SimplyFlow source and follow the current package behavior.
- Do not add a custom start action when a lifecycle hook is the better fit.
- Actions should be async by default unless that makes the code awkward for no benefit.
- Actions should use named parameters:

```js
async createNote({ anchorId }) {
  // ...
}
```

- Commands and shortcuts should be thin adapters. They should call actions, not contain feature logic.

```js
commands: {
  createNote(_element, anchor) {
    return this.actions.createNote({ anchorId: anchor?.id });
  },
}
```

## Feature Components

- A SimplyFlow component is a plain object that may contain the same kinds of things as an app: `templates`, `styles`, `commands`, `shortcuts`, `actions`, `api`, and lifecycle hooks.
- `app.components` is the component registry for future residential programming features. Runtime code should not reach back through it for ordinary behavior.
- SimplyFlow merges component properties into the app. Call merged behavior through the app, for example `this.api.notes.findNote(...)`, not `this.components.paragraphNoteStacks...`.
- Use a feature component when a set of templates, styles, commands, shortcuts, actions, and helper APIs belong together.
- Keep feature helpers and replaceable dependencies on the app/component object, usually under a named API namespace:

```js
api: {
  notes: {
    findNote({ app, noteId }) {
      // ...
    },
  },
}
```

## Live-Editable Code Rule

Future residential programming should allow running code to be replaced. For that to work:

- Functions on the app/component object must not depend on private module-local helper functions.
- If an action needs helper behavior, put that helper on `api`, `actions`, `commands`, or another app/component property.
- When one helper calls another helper in the same namespace, use `this.otherHelper(...)` so the function still works when replaced.
- Imported classes, libraries, and constants that actions need should be reachable through the app/component object when practical, for example `this.api.notes.CobaltEditorModal`.

Module-local constants are fine for static imported text assets and other values that are directly placed onto the component object. They are not fine as hidden behavior dependencies for replaceable functions.

## Templates And Styles

- Keep SimplyFlow templates in separate `.html` files.
- Keep CSS in separate `.css` files.
- Import those files as text through esbuild loaders, then assign the strings to `templates` and `styles`.

```js
import NOTE_TEMPLATE from './feature/note.html';
import NOTE_STYLES from './feature/note.css';

export const feature = {
  templates: {
    note: NOTE_TEMPLATE,
  },
  styles: {
    note: NOTE_STYLES,
  },
};
```

- Do not bury large HTML or CSS literals in JavaScript modules.
- Use SimplyFlow templates for UI rendering. Avoid manual DOM construction for app UI when a template/list/map/field can express it.
- Imperative DOM is acceptable for host integration, measurement, focus placement, and connecting third-party widgets.
- `data-simply-match` belongs on templates used inside fields, lists, and maps. There is no `data-simply-match` behavior in `<simply-render>`.

## State And Rendering

- Prefer `data-simply-field`, `data-simply-list`, `data-simply-map`, commands, shortcuts, and actions over direct DOM updates.
- Keep derived view fields in `app.data` when templates need them.
- Keep runtime-only resources outside `app.data`, for example observers, timers, host DOM references, and other non-serializable objects.
- When a feature needs layout measurement, isolate the measuring code in `api` or actions and keep the rendered HTML template-driven.

## Margin Notes UI Conventions

- Note creation affordances should be quiet: reveal them on paragraph hover or keyboard focus.
- Notes are spatially tied to their paragraph.
- Collapsed notes are one line with text overflow ellipsis.
- Multiple notes should fit the available paragraph height when collapsed; show an overflow toggle only when needed.
- The overflow label doubles as the expand/collapse toggle.
- Keyboard users should be able to move through notes with arrow keys and collapse/blur with Escape.

## Verification

After behavior or build changes, run:

```bash
npm run lint
npm test
npm run build
```

For UI changes, also run or describe a browser smoke test against `examples/simple.html`, checking the actual rendered DOM and interaction behavior.

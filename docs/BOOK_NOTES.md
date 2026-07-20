# Book Notes

Append implementation discoveries here. Keep entries brief and factual while the work is fresh.

## Entry template

### YYYY-MM-DD — Short title

- **Milestone:**
- **Problem:**
- **Initial assumption:**
- **What failed:**
- **Decision:**
- **Owning layer:**
- **Evidence:**
- **Book relevance:**
- **Standard, convention, or Muze-specific:**
- **Remaining question:**

### 2026-07-19 — First Solid storage boundary

- **Milestone:** 3 — Solid connection and storage
- **Problem:** Add Solid persistence without making the note UI depend on Solid concepts.
- **Initial assumption:** The existing store boundary might be too small once HTTP and Pods enter the picture.
- **What failed:** Nothing yet; one fixed resource still fits `load`, `save`, and `remove`.
- **Decision:** Add `createSolidResourceStore({ resourceUrl, solid })` as an application adapter before introducing a SimplySolid workspace. The adapter accepts a Lading-style Solid client and can create the `jsfs-solid` Metro client stack itself.
- **Owning layer:** Application / margin-notes package edge.
- **Evidence:** `test/solid-resource-store.test.js` and mounted browser coverage in `test/browser-mounted.test.js`.
- **Book relevance:** A boundary made for local storage becomes the place where Solid can attach without rewriting the application.
- **Standard, convention, or Muze-specific:** Solid uses ordinary Web resource operations and Turtle linked data; Metro, Metro-OLDM, OLDM, and Lading are Muze stack choices; the app-facing graph document is a Muze implementation shape, not a separate storage format.
- **Remaining question:** When do multiple resources, provenance, partial failure, or shared editing create real pressure for SimplySolid?

### 2026-07-20 — Local-first forced the workspace boundary

- **Milestone:** 3 — Solid connection and storage
- **Problem:** Readers should keep using margin notes before or without network access, then sync local work to Solid later.
- **Initial assumption:** The app could merge its local note graph with the discovered remote Turtle graph during connect.
- **What failed:** The merge function made margin-notes responsible for open-world resource semantics that should be reusable across PWA-style Solid apps.
- **Decision:** Use a SimplySolid local-first `notes` resource by default, then attach the discovered Solid resource as its remote replica and call `sync('notes')`.
- **Owning layer:** SimplySolid / solid-workspace for resource replicas and sync; margin-notes for note UI and Solid connection UX.
- **Evidence:** Mounted browser tests cover local SimplySolid restore, connecting with local and remote notes, and syncing the combined graph to the discovered resource.
- **Book relevance:** Local-first is not an optional storage trick; it changes the right abstraction from "adapter" to "workspace resource".
- **Standard, convention, or Muze-specific:** Solid resources and Turtle are standards/conventions; SimplySolid local-first resources and `sync('notes')` are Muze stack API choices.
- **Remaining question:** How should pending sync and remote conflict reconciliation be surfaced in the reader UI?

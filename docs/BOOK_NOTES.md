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
- **Standard, convention, or Muze-specific:** Solid uses ordinary Web resource operations; Metro, Metro-OLDM, and Lading are Muze stack choices; the current JSON graph document is a Muze implementation step, not a final interoperability format.
- **Remaining question:** When do multiple resources, provenance, or Turtle/OLDM parsing create real pressure for SimplySolid?

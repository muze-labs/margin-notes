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
- **Decision:** Add `createSolidResourceStore({ resourceUrl, solid })` as an application adapter before introducing a SimplySolid workspace. The adapter accepts a Solid API client and can create the `jsfs-solid` Metro client stack itself.
- **Owning layer:** Application / margin-notes package edge.
- **Evidence:** `test/solid-resource-store.test.js` and mounted browser coverage in `test/browser-mounted.test.js`.
- **Book relevance:** A boundary made for local storage becomes the place where Solid can attach without rewriting the application.
- **Standard, convention, or Muze-specific:** Solid uses ordinary Web resource operations and Turtle linked data; Metro, Metro-OLDM, OLDM, and Metro-Solid are Muze stack choices; the app-facing graph document is a Muze implementation shape, not a separate storage format.
- **Remaining question:** When do multiple resources, provenance, partial failure, or shared editing create real pressure for SimplySolid?

### 2026-07-20 — Local-first forced the workspace boundary

- **Milestone:** 3 — Solid connection and storage
- **Problem:** Readers should keep using margin notes before or without network access, then sync local work to Solid later.
- **Initial assumption:** The app could merge its local note graph with the discovered remote Turtle graph during connect.
- **What failed:** The merge function made margin-notes responsible for open-world resource semantics that should be reusable across PWA-style Solid apps.
- **Decision:** Use a SimplySolid local-first `notes` resource by default, then attach the discovered Solid resource as its remote replica and call `sync('notes')`.
- **Owning layer:** SimplySolid / solid-workspace for resource replicas and sync; margin-notes for note UI and Solid connection UX.
- **Evidence:** Mounted browser tests cover local SimplySolid restore, connecting with local and remote notes, and syncing the combined graph to the discovered resource. Manual validation in the programming-for-wizards book confirmed the app works and previously stored notes remain available after the migration.
- **Book relevance:** Local-first is not an optional storage trick; it changes the right abstraction from "adapter" to "workspace resource".
- **Standard, convention, or Muze-specific:** Solid resources and Turtle are standards/conventions; SimplySolid local-first resources and `sync('notes')` are Muze stack API choices.
- **Remaining question:** How should pending sync and remote conflict reconciliation be surfaced in the reader UI?

### 2026-09-23 — Prefixes name properties; IRIs identify values

- **Milestone:** M3.2, local-first notes with Solid sync.
- **Problem:** Loaded notes disappeared because application filters expected shorthand classes after OLDM began returning full IRIs.
- **Decision:** Keep class/datatype values explicit and absolute. Keep shorthand at property-name and serialization boundaries; expand old saved class values at load.
- **Owning layer:** OLDM defines the value contract; solid-tools consumes it; margin-notes owns compatibility with its old saved documents.
- **Evidence:** 66 library tests and 53 application tests pass against OLDM `341530e` and solid-tools `003c62c`. Mounted fake-Solid tests cover creation, restoration, editing, deletion, remount, and sync.
- **Book relevance:** A spelling convenience must not change vocabulary identity. Unknown classes, named-node links, and literal metadata need explicit round-trip tests.
- **Remaining question:** Repeat the current slice against a disposable real Pod; fake responses establish application behavior, not server conformance.

## 2026-10-30 — Completion belongs to the operation's owner

A successful IndexedDB request is not a committed transaction. A merged remote
snapshot is not permission to overwrite a newer local save. A service wrapper
must not turn a failed save into a successful return value. These distinctions
belong in the library that owns persistence, not in UI locks or app merge code.

The corrected boundary removed the default app-owned graph-to-Solid adaptation.
Native OLDM values then exposed a SimplyFlow proxy invariant failure, fixed at
the reactive boundary. The connected browser test also showed that announcing
“connected” before installing notes allowed a new note to disappear from view.
Small tests at the owner and one mounted workflow exposed failures a passing
lower-level suite had missed.

## Native graph ownership without migration layers — 2026-10-30

D047 removes the app's historic compatibility responsibilities. Show one Turtle
storage contract for IndexedDB and host-provided stores, one OLDM working context,
and explicit app-owned encoding of editor literals. UI state is a view: resolve a
native node by id before editing, save it through the owning collection, and read
fresh nodes after sync. A note projection must never decide which unrelated facts
survive a complete resource save.

## Native editor data without teaching the editor Turtle — 2026-10-30

Cobalt already exposes a plain Fragment value. A small application bridge is
sufficient to persist its text and formatting as RDF. An ordered Collection is
necessary: RDF multivalues cannot stand in for annotation sequence, and Cobalt's
precedence field is a separate fact. Native representation also exposes the
identity question during sync: a named immutable fragment snapshot lets the
body select one complete edit while unknown facts remain attached to their
original subjects. Retaining those snapshots has a storage cost; pruning needs
its own ownership policy. See D048 and `COBALT_RDF.md`.

## Edit ownership should not multiply stored metadata — 2026-10-30

Per-subject sync made one note carry repeated timestamps and three copies of
its text. Declaring the annotation/body edit boundary lets one root timestamp
govern the editable body link. Persist domain data once; configure reconciliation
ownership separately. Immutable fragment snapshots still have a storage cost,
and preserving unknown facts remains distinct from selecting edited scalars.


The maintainer's later clarification removed revision history from the margin
notes requirements. Stable current fragments plus explicit edit ownership replace
the snapshot approach described above. This illustrates the cost of selecting a
storage model for an unrequested future feature: identity and synchronization
mechanisms should follow the actual single-user, current-value requirement.

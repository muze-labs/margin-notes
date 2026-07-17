# Security and Privacy

Margin notes may contain private thoughts, quotations, personal identifiers, or sensitive material. Privacy is a core product property, not an optional deployment concern.

## Privacy defaults

- Local notes stay in the browser unless the user explicitly chooses another destination.
- Connecting to Solid does not publish or migrate notes automatically.
- Submission does not imply publication.
- Public sources are read-only unless a separate capability says otherwise.
- The UI must show where a new or edited note will be saved.

## Threat boundaries

### Host page

The embedded component runs in a page controlled by another party. Unless isolated, that page may observe DOM interaction and browser storage accessible to its origin. The project must document this limitation and consider isolation strategies where they remain practical.

### Remote linked data

Loaded RDF is untrusted input. The application must handle:

- unexpectedly large graphs;
- malformed values;
- hostile labels or markup;
- cyclic links;
- links to unrelated or private resources;
- bodies with unsafe media types.

Rendered content must not become executable HTML without an explicit sanitisation boundary.

### Authentication tokens

Session material stays within the authentication and transport layer. It must not enter linked-data subjects, logs, error reports, or component props unnecessarily.

### Permissions

The application should request the least access needed. Permission changes must identify the affected resource and intended audience. WAC and ACP differences must not be hidden when they change the outcome.

### Residential code

Remote modifications are code, not data decoration. They require explicit opt-in, provenance, review where possible, a recovery path, and a way to disable a broken overlay.

## Logging

Development diagnostics must avoid note bodies, access tokens, and private resource URLs by default. Production logging should prefer operation identifiers and typed error categories.

## Security tests

At minimum, test:

- unsafe note body rendering;
- permission denied on read and write;
- public source attempting to inject executable content;
- oversized or cyclic data;
- a malicious or broken residential overlay;
- accidental publication or migration paths;
- loss of local data during failed Solid save.

# Proposal 0001 - Solid Client Developer Experience

**Status:** Draft  
**Design pressure:** DP-003  
**Owning repository:** `solid-tools`  
**Active application slice:** `docs/CURRENT_SLICE.md`

## Concrete application need

Margin-notes should be able to connect to a reader's WebID, discover a per-page Solid notes resource, read and write Turtle, and recover notes after reload. The application should not need to understand OAuth retry internals or low-level graph corruption patterns to avoid silently losing notes.

## Current attempt

The application currently composes:

```js
createSolidNotesConnection({
  webId,
  pageUrl,
  callbackUrl,
})
```

That returns the discovered notes resource URL and the Solid API client used for storage. The older `createSolidResourceStore()` adapter and the connection/discovery path exposed defensive behavior that should move into the libraries once the correct owning layer is clear:

- popup OAuth helper wiring;
- write-only forced authorization to avoid retrying consumed request bodies;
- stale localStorage access-token recovery before returning a protected resource's 401;
- cached dynamic client registrations whose redirect URI no longer matches the current app callback;
- popup-blocker/user-activation handling when login is requested after async discovery;
- rejection of non-document JSON such as OAuth's `"false"` placeholder;
- filtering incomplete annotation shells;
- recovery of conventional note parts when linking triples are missing.

## Boundary diagnosis

The margin-notes component owns annotation policy, not OAuth transport semantics. It should validate that a loaded subject is a complete margin note, but it should not need to know that a middleware-triggered retry can disturb a request body stream or that a cancelled OAuth flow can return a successful response whose body is the string `"false"`.

Likewise, OLDM/Metro-OLDM should make graph round-tripping and malformed linked-data shapes easier to inspect. When application code writes nested graph objects, missing parent-to-child predicates should be hard to miss in tests or diagnostics.

## Proposed API

### JSFS-Solid

Expose the browser OAuth popup flow at the Solid client boundary:

```js
import { authorizePopup, popupHandleRedirect } from '@muze-labs/jsfs-solid'
```

This has already been added locally and should remain part of the supported browser-facing API if accepted.

### Metro-OAuth2 and Metro-OIDC

Make middleware-triggered authorization retries safe for requests with bodies.

Possible acceptable behaviors:

- clone or buffer replayable bodies before the first unauthenticated attempt;
- skip unauthenticated probing for non-replayable body requests;
- throw a clear Metro error before the first request when a retry would be unsafe.

OAuth failure or cancellation should reject or return a non-OK response. It should not look like a valid `200` resource response with body `"false"`.

### Metro-Solid or JSFS-Solid

Surface Solid fetch/load failures as typed errors or typed results that preserve the operation, resource URL, status, and underlying response:

```js
{
  operation: 'load',
  resourceUrl,
  status,
  response,
}
```

Applications should not have to infer whether `null`, `false`, empty text, a `404`, or an OAuth placeholder means "no resource", "not connected", or "bad data".

### OLDM or Metro-OLDM

Provide diagnostics or shape helpers for graph documents that contain likely orphaned related subjects. A minimal first step could be a utility that asserts required linked-data paths:

```js
shape.assert(graph, {
  type: 'oa$Annotation',
  required: [
    'oa$hasBody',
    'oa$hasTarget.oa$hasSelector',
  ],
})
```

The app can still decide what counts as a margin note, but the library should make missing links visible.

## Example use from the application

The desired margin-notes code should be closer to:

```js
const connection = await createSolidNotesConnection({ webId, pageUrl, callbackUrl })
await notesService.connect({
  solid: connection.solid,
  resources: {
    notes: {
      url: connection.resourceUrl
    }
  }
})
await notesService.sync('notes')
```

No application option should be needed solely to avoid disturbed request streams.

## Alternatives considered

### Keep it in the application

This works as a defensive stopgap, but it teaches every application author the same accidental details: OAuth retry behavior, placeholder response bodies, and linked-data graph repair. That is poor stack ergonomics.

### Build a full SimplySolid workspace now

A workspace may eventually be the right boundary for source-aware multi-resource behavior, but it is larger than the current failure. The immediate pressure is transport safety and data-shape signalling.

## Explicit non-goals

- Do not define the final margin-notes sharing model.
- Do not require SimplySolid before the app has multi-source save pressure.
- Do not make OLDM enforce the Web Annotation vocabulary globally.
- Do not hide WAC/ACP permission differences behind one generic permission flag.

## Contract tests

Metro-OAuth2 or Metro-OIDC:

- A `PUT` with a body that receives a 401/403 during auth probing does not retry a disturbed body stream.
- A non-replayable body request either authorizes before sending or fails with a clear Metro error.
- A request with a stored access token that receives an invalid-token 401 challenge refreshes or reauthorizes before returning the protected resource's 401.
- A cached dynamic client registration is reused only when it supports the redirect URI requested by the current app instance.
- Popup authorization can use a caller-opened window and rejects when the popup is blocked instead of leaving the app pending.
- A cancelled popup/login does not resolve as a `200` resource response with body `"false"`.

JSFS-Solid:

- `authorizePopup` and `popupHandleRedirect` are exported from the Solid client package and browser bundle.

Metro-Solid or JSFS-Solid:

- Missing resource, unauthorized resource, failed authorization, and invalid resource data are distinguishable by callers.

OLDM or Metro-OLDM:

- A graph containing an annotation subject plus conventional body/target/selector resources but missing linking predicates can be diagnosed.
- Shape assertions can report the exact missing linked-data path.

## Application validation

These current tests should continue passing with less application-specific defensive code:

- `test/browser-mounted.test.js`: connect, save Turtle, remount, reconnect, reload saved notes.
- `test/solid-resource-store.test.js`: reject OAuth placeholder data and recover or diagnose missing linking triples.
- `test/annotation-model.test.js`: incomplete annotation shells are not treated as margin notes.

## Compatibility and migration

Existing application data may contain damaged note resources from earlier development. The margin-notes app should keep its recovery path until a migration or cleanup step has repaired those files.

Transport-layer fixes should preserve existing successful OAuth flows. Any change to OAuth cancellation/error return values should be documented as a correctness fix.

## Documentation changes

- Document popup OAuth helpers in `jsfs-solid`.
- Document retry safety expectations in Metro-OAuth2 and Metro-OIDC.
- Document Metro-Solid/JSFS-Solid error result conventions.
- Document any OLDM shape diagnostic helpers.
- Add a book note about library boundaries discovered by real Solid storage pressure.

## Outcome

Pending. The application has temporary guards and tests; the library proposal is ready for a `solid-tools` implementation pass.

## WebID prefix failure — 2026-10-30

A real WebID responds with `Content-Type: text/turtle` and declares prefixes
`<http://>` and `<https://>` for terms such as `n1:localhost`. N3 parses these,
but OLDM rejects the namespace string before expansion with `Missing HTTP host`.
The application also installed RDF middleware twice; that composition is fixed
by letting Metro-Solid own it.

The smallest library fix belongs in OLDM's IRI helpers: resolve prefix namespaces
using generic IRI syntax, and validate the complete identifier after expansion.
Keep existing validation for complete HTTP identifiers. Apply the same namespace
rule to the small Turtle adapter. Add core expansion/shortening tests, both
adapters' parse/write round trips, and a sanitized profile fixture in the app's
real-client integration test. No profile rewriting or application parser fallback.

The prefix repair is implemented and verified in both adapters. The application
uses a context with explicitly declared `pim` and `mn` prefixes to read native
profile/preferences graphs regardless of document prefixes. A fixture reproduces
the public profile's namespace pattern without storing personal profile data.
The full application suite passes with the packed OLDM fix. Real authenticated
Pod save/reload validation remains pending publication.

## Consumed token request body — 2026-10-30

After real authorization, OIDC reads the token POST grant type after forwarding
the request. Browser fetch has already consumed the body, so cloning it fails.
The owning boundary is Metro-OIDC's token-response observer: inspect grant type
before dispatch, then validate the response using that captured value. No app
workaround or token-validation relaxation is needed. Existing login/refresh
contract tests must consume request bodies like a transport, and application
integration must exercise authenticated preferences discovery.

The native-response integration also exposed a second defect: `res.data` may be
a `ReadableStream`, so its being an object does not mean JSON was already parsed.
The token observer now parses a cloned native response stream and leaves the
original response readable by OAuth2. Login, refresh with/without an ID token,
and invalid-token rejection tests use consumed request bodies and native token
responses. The app integration reproduces authorization and protected preference
reading with the real installed stack and a mock issuer.

## Spent authorization codes after failed exchanges — 2026-10-30

The prior token-response crash can happen after the issuer has already redeemed
the code. OAuth2 only deleted cached authorization codes after successful token
processing, so a later Connect skipped login and retried the spent code. The
reported immediate `invalid_grant` is consistent with this sequence. The library
must retire an authorization code when dispatching its exchange, even when the
response fails, is lost, or cannot be processed. Keep the error visible and ask
for a new authorization on the next attempt, without silently replaying codes.
Contract tests cover a lost response, an invalid_grant response and malformed
successful token data, followed by a successful new login.

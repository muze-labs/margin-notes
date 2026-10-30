# Build scripts

- `build.mjs` — Bundle the app with its Turtle backend; reject N3 in the browser output. Emit readable JavaScript and a source map.
- `oldm-loader.mjs` — Apply the same application-only backend resolution to Node tests.
- `dev.mjs` — Serve the repository and built example application.
- `compare-turtle.mjs` — Build and test N3 and Turtle independently in a temporary copy. `npm run test:turtle` uses the installed adapter; an optional package-directory argument selects a candidate adapter. See [the comparison](../docs/experiments/turtle-backend.md).

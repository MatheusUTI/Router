# Current State

- The application is a React SPA powered by an Express backend via Vite middleware.
- Vercel deployments are configured with standard Serverless Functions.
- `VERCEL-RUNTIME-FIX-001` removed `"type": "module"`, restoring Node's ability to initialize standard Express applications.
- `VERCEL-RUNTIME-FIX-002` refactored `server/createApp.ts` to implement 100% pure import-time execution. Initialization tasks (like Supabase connection and environment DNS lookups) were deferred to runtime execution, preventing Vercel Function Invocation failures during cold starts.
- `VERCEL-RUNTIME-FIX-003` aligned the Vercel serverless entrypoint module format: bundled `api/index.ts` into a self-contained CommonJS artifact using esbuild.
- `VERCEL-RUNTIME-FIX-004` resolved the path conflict in Vercel CLI.
- `VERCEL-RUNTIME-FIX-005` established API routing before SPA fallback.
- `VERCEL-RUNTIME-FIX-006` resolved deployment validation errors on Vercel by removing unsupported negative lookahead regex `/((?!api($|/)).*)` and adopting official Vercel route patterns (`/api/:path*` -> `/api`, `/:path*` -> `/index.html`). Order-based rewrite precedence guarantees `/api/*` requests reach the serverless Express app (`api/index.ts`), static assets are served normally, and non-API deep links route to `/index.html`.
- SSW 455 integration is stable, robust, and correctly separates parsing, orchestration, and polling.
- SSW 101 integration is in place with resilient gateways.
- Contract test suite covers Vercel serverless bootstrap and confirms stable behavior.

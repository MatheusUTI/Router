# Current State

- The application is a React SPA powered by an Express backend via Vite middleware.
- Vercel deployments are configured with standard Serverless Functions.
- `VERCEL-RUNTIME-FIX-001` removed `"type": "module"`, restoring Node's ability to initialize standard Express applications.
- `VERCEL-RUNTIME-FIX-002` refactored `server/createApp.ts` to implement 100% pure import-time execution. Initialization tasks (like Supabase connection and environment DNS lookups) were deferred to runtime execution, preventing Vercel Function Invocation failures during cold starts.
- `VERCEL-RUNTIME-FIX-003` aligned the Vercel serverless entrypoint module format: bundled `api/index.ts` into a self-contained CommonJS artifact using esbuild.
- `VERCEL-RUNTIME-FIX-004` resolved the path conflict in Vercel CLI.
- `VERCEL-RUNTIME-FIX-005` established API routing before SPA fallback.
- `VERCEL-RUNTIME-FIX-006` resolved deployment validation errors on Vercel by removing unsupported negative lookahead regex `/((?!api($|/)).*)` and adopting official Vercel route patterns (`/api/:path*` -> `/api`, `/:path*` -> `/index.html`).
- `VERCEL-RUNTIME-FIX-007` solved the runtime CommonJS syntax crash (`Cannot use import statement outside a module`) in production Vercel functions. Relocated the TypeScript source entrypoint to `server/vercel.ts`, removed conflicting `api/index.ts`, and bundled the production Serverless Function directly into `api/index.cjs` via esbuild. Pure CommonJS execution was verified natively via `test/runtime.cjs.test.js`, guaranteeing that all HTTP methods (GET, POST) on `/api/*` reach the Express application.
- SSW 455 integration is stable, robust, and correctly separates parsing, orchestration, and polling.
- SSW 101 integration is in place with resilient gateways.
- Contract test suite covers Vercel serverless bootstrap and confirms stable behavior.
- `DEPLOY-ARCH-001` replaced Vercel Serverless Functions with a persistent Node.js architecture hosted on Render, leaving Vercel purely for frontend hosting. The frontend now communicates securely via `VITE_API_BASE_URL` with explicitly configured CORS headers on the Express server.
- `LOCAL-ARCH-001` estabeleceu o direcionamento para Local-First. Atual dependência de Dexie para armazenamento offline e de Supabase para login e dados em nuvem identificada. O roadmap de migração (LOCAL-DB-001 até LOCAL-FIRST-001) foi mapeado, nenhuma funcionalidade foi quebrada.

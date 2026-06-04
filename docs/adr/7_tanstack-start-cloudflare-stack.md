# ADR-007: Vite React SPA + Hono Workers as the Application Platform

**Date**: 2026-05-06  
**Status**: Accepted (supersedes original TanStack Start decision)  
**Updated**: 2026-06 — reflects actual implementation (Vite + React Router + Hono)

## Context

The application must run in browser environments that support Web NFC and Web Crypto while still offering low-latency APIs for session grants, policy checks, and sync. The platform choice must satisfy four constraints:

1. Frontend and backend should be implemented in a unified TypeScript-first stack with minimal integration friction.
2. Hosting should provide global edge distribution and straightforward CI/CD.
3. The backend needs a relational store (SQLite-compatible) for tenant data, transactions, and audit.
4. The frontend must support offline-first operation as a PWA with Service Worker caching.

## Decision

The application platform is:

- **Frontend framework**: React 19 + Vite + TanStack Router + TanStack Query
- **Backend framework**: Hono (TypeScript, edge-first) on Cloudflare Workers
- **Hosting**: Cloudflare Pages (frontend SPA) + Cloudflare Workers (API)
- **Database**: Cloudflare D1 (SQLite, edge-distributed)
- **ORM**: Drizzle ORM (D1 adapter, typed schema, migrations)
- **Analytics**: Cloudflare Analytics Engine (sync metrics, client errors)
- **Local storage**: IndexedDB via Dexie.js (structured) + raw IndexedDB (journal, session)

**Explicit non-choices:**
- No Cloudflare KV (not needed — D1 handles all persistence)
- No Cloudflare R2 (no large object storage needed)
- No TanStack Start (moved to client-only SPA with separate API worker)
- No Next.js

## Consequences

**Positive:**

- Single Cloudflare deployment target for both frontend and API — simple CI/CD
- Hono on Workers provides sub-50ms cold start and global edge distribution
- D1 provides managed SQLite without separate database infrastructure
- Vite provides fast development builds and efficient production bundles
- Drizzle provides type-safe schema with migration support for D1
- React + TanStack Router gives file-based routing with type safety

**Negative:**

- D1 is single-region write leader (eventually consistent reads at edge) — acceptable for current scale
- Workers have CPU time limits (50ms free, 30s paid) — must avoid expensive operations
- Vendor lock-in to Cloudflare ecosystem — migration would require rewriting bindings
- No server-side rendering — but not needed for an offline-first PWA

**Risks:**

- D1 transaction semantics are limited compared to PostgreSQL — must design around single-statement atomicity where possible
- Workers memory limits (128MB) constrain in-memory operations — acceptable for API-sized payloads

## Alternatives Considered

| Option                             | Reason Rejected                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **TanStack Start (full-stack)**    | SSR not needed for offline PWA. Separate SPA + API is simpler and better understood.                    |
| **Next.js + Vercel**               | Split platform assumption. Workers + D1 integration is more natural on Cloudflare.                      |
| **Express/Fastify on VM**          | More operational overhead. No edge distribution without additional infra.                                |
| **Remix**                          | SSR-oriented. Offline-first PWA doesn't benefit from server rendering.                                   |
| **Supabase (PostgreSQL)**          | Adds external database dependency. D1 is sufficient and co-located with Workers.                        |

## References

- System Design §16: [Infrastructure Stack](../system-design/16_infrastructure-stack.md)
- Tech Specs §16: [Infrastructure Stack](../tech-specs/16_infrastructure-stack.md)
- `wrangler.api.jsonc` — Worker configuration
- `wrangler.jsonc` — Pages configuration
- `package.json` — dependency list

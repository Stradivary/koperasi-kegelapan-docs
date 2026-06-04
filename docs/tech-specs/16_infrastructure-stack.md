# 16. Infrastructure Stack

This section describes the deployment pattern and runtime for the application.

## Platform architecture

| Component        | Technology                              | Role                                              |
| ---------------- | --------------------------------------- | ------------------------------------------------- |
| Frontend         | React SPA (Vite build), Cloudflare Pages| Static SPA with client-side routing               |
| Backend API      | Cloudflare Workers (Hono framework)     | Edge-deployed API for auth, sync, grants, admin   |
| Database         | Cloudflare D1 (SQLite)                  | Primary server-side persistence                   |
| Analytics        | Cloudflare Analytics Engine             | Sync event tracking, client error monitoring      |
| Local storage    | IndexedDB via Dexie.js                  | Client-side offline data replica and outbox       |
| Secret storage   | Cloudflare Workers Secrets              | Master key (`SESSION_MASTER_KEY`)                 |

## Deployment pattern

- **Frontend**: served from Cloudflare Pages (`koperasi-kegelapan-app`). Single SPA build, role-based routing (`/admin`, `/station`, `/gate`, `/terminal`, `/kiosk`, `/scout`, `/superadmin`).
- **Backend**: single Cloudflare Worker (`koperasi-kegelapan-api`) handling all `/api/*` routes. Uses Hono framework for routing and middleware.
- **Database**: single D1 database (`koperasi-kegelapan`) shared across all tenants. Tenant isolation enforced at application level via `tenantId` scoping.
- **Migrations**: Drizzle ORM migration files in `/drizzle` directory, applied via Wrangler CLI.
- **Observability**: Cloudflare Workers logs with invocation-level logging enabled.

## Local-first storage and multitenancy

- Per-tenant local replicas stored in IndexedDB via Dexie.js, including: users (members), cards, transaction log, sync cursors, and outbox.
- The outbox pattern queues offline transactions with `syncStatus: "pending"`. On connectivity, `syncPush` uploads pending entries to the server.
- Sync pull uses cursor-based pagination to incrementally fetch server changes without re-downloading the full dataset.
- Pending outbox entries are NOT overwritten during sync pull (conflict avoidance — local pending state takes priority).
- `tenantId` scoping is enforced on all local data via compound IndexedDB indexes.

## Backend API structure

```
/api/auth/token          POST  (public, rate-limited)
/api/auth/refresh        POST  (public, rate-limited)
/api/tenants             GET   (public — tenant directory)
/api/client-errors       POST  (semi-public)
─── verifyToken middleware ───
/api/session-grant       GET   (authenticated)
/api/policy              GET   (authenticated)
/api/reconcile           POST  (authenticated)
/api/accounts            GET/POST (authenticated)
/api/cards               GET/POST (authenticated)
/api/sync/push           POST  (authenticated, rate-limited, analytics)
/api/sync/pull           GET   (authenticated, rate-limited, analytics)
/api/sync/devices        GET   (authenticated)
/api/sync/push-entities  POST  (authenticated)
/api/superadmin/*        GET/POST/PATCH (superadmin auth guard)
```

## Middleware stack (request processing order)

1. `corsMiddleware` — CORS headers for all `/api/*` routes
2. `deviceBlockCheck` — reject requests from blocked devices (pre-auth, extracts deviceId from token without signature verification)
3. `authRateLimit` — rate limiting on `/api/auth/*` (prevents brute force)
4. `verifyToken` — JWT HMAC-SHA256 signature and expiry verification
5. `syncRateLimit` — 60 req/min per device_id on `/api/sync/*`
6. `syncAnalytics` — Analytics Engine data point per sync request

## Latency requirements

| Operation              | Target latency | Notes                                |
| ---------------------- | -------------- | ------------------------------------ |
| Static asset delivery  | < 200 ms       | Cloudflare Pages CDN (300+ PoPs)     |
| NFC card read+validate | < 500 ms       | Local crypto (Web Crypto API)        |
| NFC card write         | < 1 s          | NFC write + re-read verify           |
| Session grant issuance | < 200 ms       | Edge worker, single HMAC computation |
| Sync push batch        | < 2 s          | Up to 500 transactions               |
| Sync pull page         | < 1 s          | Up to 500 items per entity type      |
| Block enforcement      | < 50 ms        | Local IndexedDB check                |

## Availability requirements

- Offline operation continues for all NFC card operations while a valid session grant exists (up to 24h).
- The app clearly indicates connectivity state and sync status.
- Local state is authoritative for in-flight transactions until sync push succeeds.
- Backend unavailability does not block card read/write operations.
- Device blocking takes effect on next API call (no real-time push needed).

## Data model (D1 tables)

| Table            | Primary Key                      | Rows per tenant (est.) |
| ---------------- | -------------------------------- | ---------------------- |
| `tenants`        | `tenant_id`                      | 1 per koperasi         |
| `accounts`       | `account_id`                     | 5-20 operators         |
| `users`          | `(tenant_id, user_id)`           | 100-10,000 members     |
| `cards`          | `(tenant_id, card_id)`           | 100-10,000 cards       |
| `devices`        | `device_id`                      | 3-10 devices           |
| `auth_sessions`  | `session_id`                     | active sessions only   |
| `session_grants` | `grant_id`                       | historical grants      |
| `transaction_log`| `id` (auto)                      | grows unbounded        |
| `audit_log`      | `id` (auto)                      | reconciliation events  |
| `sync_cursors`   | `(tenant_id, device_id, entity)` | 3 per device           |
| `card_events`    | `id` (auto)                      | SSE event log          |

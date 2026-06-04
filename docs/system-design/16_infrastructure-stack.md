# 16. Infrastructure & Stack

## Runtime and platform

| Component           | Technology                        | Purpose                                              |
| ------------------- | --------------------------------- | ---------------------------------------------------- |
| Backend API         | Cloudflare Workers (Hono)         | Edge-deployed API with zero-trust architecture       |
| Database            | Cloudflare D1 (SQLite)            | Persistent storage for tenants, accounts, cards, transactions, audit log |
| Frontend hosting    | Cloudflare Pages                  | Static SPA hosting with global CDN                   |
| Analytics           | Cloudflare Analytics Engine       | Sync event tracking and client error monitoring      |
| Observability       | Cloudflare Workers Logs           | Invocation logs for debugging and audit              |
| Local storage       | IndexedDB (Dexie.js)              | Client-side offline data replica and outbox          |
| Secret management   | Cloudflare Workers Secrets        | SESSION_MASTER_KEY stored as encrypted secret        |

## App stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Frontend       | React 18+ / TypeScript / Vite                           |
| NFC            | Web NFC API (NDEFReader/Writer)                         |
| Cryptography   | Web Crypto API (AES-GCM, HMAC-SHA256, HKDF, PBKDF2)   |
| State          | Zustand + React hooks                                   |
| Local DB       | Dexie.js (IndexedDB wrapper)                            |
| Routing        | React Router                                            |
| UI Components  | shadcn/ui + Tailwind CSS                                |
| Backend        | Hono (TypeScript, edge-first framework)                 |
| ORM            | Drizzle ORM (D1 adapter)                                |
| Auth           | Custom JWT (HMAC-SHA256) + PBKDF2 password hashing      |
| Schema         | Drizzle schema definitions with migration support       |

## Deployment model

- **Backend**: Single Cloudflare Worker (`koperasi-kegelapan-api`) serving all API routes under `/api/*`.
- **Frontend**: Cloudflare Pages SPA (`koperasi-kegelapan-app`) with client-side routing.
- **Database**: Single D1 database (`koperasi-kegelapan`) shared across all tenants. Tenant isolation enforced at application level via `tenantId` scoping in all queries.
- **Multi-tenant**: Shared infrastructure with logical tenant isolation. All storage tables include `tenantId` foreign key. JWT tokens embed `tenantId` as authoritative source.
- **Client apps**: Single SPA build with role-based routing. Station, Gate, Terminal, Kiosk, Scout, Admin, and Superadmin are different route trees within the same deployment.
- **Global edge**: Cloudflare Workers run at 300+ edge locations for low-latency API responses.

## Middleware stack (request processing order)

1. `corsMiddleware` — CORS headers for all `/api/*` routes
2. `deviceBlockCheck` — Reject requests from blocked devices (pre-auth, extracts deviceId from token without verification)
3. `authRateLimit` — Rate limiting on `/api/auth/*` endpoints
4. `verifyToken` — JWT signature and expiry verification for protected routes
5. `syncRateLimit` — 60 req/min per device_id on `/api/sync/*` endpoints
6. `syncAnalytics` — Analytics Engine tracking for sync operations

## Data model (D1 tables)

| Table            | Primary Key                      | Purpose                                     |
| ---------------- | -------------------------------- | ------------------------------------------- |
| `tenants`        | `tenant_id`                      | Koperasi tenant registry                    |
| `accounts`       | `account_id`                     | Operator accounts with role and credentials |
| `users`          | `(tenant_id, user_id)`           | Card member records (per-tenant)            |
| `cards`          | `(tenant_id, card_id)`           | Card registry with balance/status tracking  |
| `devices`        | `device_id`                      | Registered device fingerprints              |
| `auth_sessions`  | `session_id`                     | Active auth sessions with refresh tokens    |
| `session_grants` | `grant_id`                       | Issued NFC session grants                   |
| `transaction_log`| `id` (auto)                      | All synced transactions (per-tenant)        |
| `audit_log`      | `id` (auto)                      | Reconciliation audit trail                  |
| `sync_cursors`   | `(tenant_id, device_id, entity)` | Per-device sync pagination state            |
| `card_events`    | `id` (auto)                      | SSE-broadcast card status change events     |

## Offline architecture

- Client apps maintain a full local replica in IndexedDB (members, cards, transaction log).
- An outbox pattern queues offline transactions for sync push when connectivity returns.
- Sync pull uses cursor-based pagination to incrementally fetch server changes.
- Pending outbox entries are not overwritten during sync pull (conflict avoidance).
- Device block status is cached locally and checked before each API call.

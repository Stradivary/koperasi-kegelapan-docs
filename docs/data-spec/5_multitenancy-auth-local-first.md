# 5. Multitenancy, Auth & Local-first Storage

This section defines the data contracts for multi-tenant isolation, authentication/authorization, and the local-first client storage model.

> ⚠️ This spec is aligned with the **code-frozen implementation** as of June 2026.

## Tenant isolation rules

- Every tenant-owned backend row includes `tenant_id` as a foreign key to the `tenants` table.
- The JWT access token's `tenantId` claim is the **authoritative source** for all API scoping — the server never trusts client-supplied tenant identifiers.
- A user requesting a session grant for a different tenant receives HTTP 403.
- Cards are cryptographically bound to their tenant via `tenantBind` (FNV-32a hash of tenantId in the card header). Cross-tenant card usage is rejected at the validation layer with "Kartu anda tidak terdaftar".
- Session keys are derived tenant-scoped: `HMAC(masterKey, tenantId:keyVersion)` → tenant key → session key. Cross-tenant key collision is cryptographically impossible.
- Tenant statuses: `active` (normal), `suspended` (login blocked for non-superadmin), `archived` (fully frozen).

## Authentication data model

| Entity        | Stored where                       | Notes                                                                                 |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| Password hash | `accounts.password_hash`           | PBKDF2-SHA256, 100k iterations. Format: `pbkdf2$saltHex$hashHex` or `iters:salt:hash` |
| Access token  | Client memory only                 | JWT HMAC-SHA256, 1h expiry. Contains: accountId, tenantId, role, deviceId             |
| Refresh token | `auth_sessions.refresh_token_hash` | SHA-256 hash stored. Token rotated on each refresh. Single-use.                       |
| Session grant | Client memory only                 | 24h lifetime. Contains session key, allowedOps, signature. Never persisted.           |
| Device record | `devices` table                    | Fingerprint hash, userAgent, platform. Registered at login time.                      |

### Auth flow

1. `POST /api/auth/token` — username + password + tenantSlug + deviceFingerprint → JWT + refresh token
2. JWT is used for all subsequent API calls (1h lifetime)
3. `POST /api/auth/refresh` — sessionId + refreshToken → new JWT + rotated refresh token
4. `GET /api/session-grant` — JWT → session grant for NFC operations (24h)
5. Session grant stored in memory, used for card encryption/decryption/signing

### Device blocking

- `devices.blocked_until` field. If `blocked_until > now`, the device is rejected by `deviceBlockCheck` middleware.
- Blocking revokes all active `auth_sessions` for that device.
- Client-side `isDeviceBlocked()` check prevents sync operations before API calls.
- Block duration: 60 seconds to 365 days (configurable by superadmin).

## Local-first storage (IndexedDB via Dexie.js)

The client maintains a tenant-scoped local replica in IndexedDB, managed through Dexie.js. The key stores are:

### `users` (members)

| Field        | Type   | Index                             | Description                     |
| ------------ | ------ | --------------------------------- | ------------------------------- |
| `tenantId`   | string | compound: `[tenantId+userId]`     | Tenant scope                    |
| `userId`     | string |                                   | 8-char member ID                |
| `name`       | string |                                   | Member display name             |
| `status`     | string | compound: `[tenantId+syncStatus]` | active/suspended/closed/deleted |
| `createdAt`  | number |                                   | Creation timestamp              |
| `updatedAt`  | number |                                   | Last server update              |
| `syncStatus` | string |                                   | `synced` or `pending`           |

### `cards`

| Field        | Type   | Index                             | Description            |
| ------------ | ------ | --------------------------------- | ---------------------- |
| `tenantId`   | string | compound: `[tenantId+cardId]`     | Tenant scope           |
| `cardId`     | string |                                   | Card identifier (hex)  |
| `userId`     | string |                                   | Optional linked member |
| `status`     | string | compound: `[tenantId+syncStatus]` | Card health status     |
| `balance`    | number |                                   | Last synced balance    |
| `counter`    | number |                                   | Last synced counter    |
| `keyVersion` | number |                                   | Key version            |
| `syncStatus` | string |                                   | `synced` or `pending`  |

### `transactionLog`

| Field          | Type   | Index                                 | Description              |
| -------------- | ------ | ------------------------------------- | ------------------------ |
| `id`           | number | auto                                  | Local auto-ID            |
| `tenantId`     | string | compound: `[tenantId+cardId+counter]` | Tenant scope             |
| `cardId`       | string |                                       | Card identifier          |
| `counter`      | number |                                       | Transaction counter      |
| `type`         | string |                                       | debit/credit/checkin/etc |
| `amount`       | number |                                       | Transaction amount       |
| `balanceAfter` | number |                                       | Balance after            |
| `timestamp`    | number |                                       | Transaction time         |
| `hash`         | string |                                       | Chain hash (hex)         |
| `syncStatus`   | string | compound: `[tenantId+syncStatus]`     | `synced` or `pending`    |
| `syncedAt`     | number |                                       | When synced to server    |

### `syncCursors`

| Field        | Type   | Index                             | Description                        |
| ------------ | ------ | --------------------------------- | ---------------------------------- |
| `tenantId`   | string | compound: `[tenantId+entityType]` | Tenant scope                       |
| `entityType` | string |                                   | `members`, `cards`, `transactions` |
| `lastCursor` | string |                                   | Last known cursor                  |
| `updatedAt`  | number |                                   | Last sync time                     |

## Outbox pattern

- Offline transactions are stored in `transactionLog` with `syncStatus: "pending"`.
- On connectivity, `syncPush` uploads pending entries via `POST /api/sync/push` with idempotency keys.
- On success, entries are updated to `syncStatus: "synced"` with `syncedAt` timestamp.
- Pending entries are **never overwritten during sync pull** — local pending state takes priority over server state.

## Sync pull merge rules

- `syncPull` fetches server changes via `GET /api/sync/pull` with cursor-based pagination (500 items per page per entity).
- Members: upserted into `users` table by `[tenantId, userId]`, skipping locally pending entries.
- Cards: upserted into `cards` table by `[tenantId, cardId]`, skipping locally pending entries.
- Transactions: merged into `transactionLog`, skipping entries where `[cardId, counter]` has pending outbox status.
- Cursors are updated in `syncCursors` table after successful merge.

## Retry and error handling

- Sync pull retries up to 5 times with exponential backoff (1s → 2s → 4s → 8s → 16s, capped at 60s).
- HTTP 401 → abort, signal re-authentication required.
- HTTP 429 → respect `Retry-After` header.
- HTTP 5xx → retryable server error.
- `DeviceBlockedError` → abort immediately, no retry.

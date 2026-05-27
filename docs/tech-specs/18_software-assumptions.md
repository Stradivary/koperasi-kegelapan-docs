# 18. Software Assumptions

This section consolidates the authoritative runtime and design assumptions for the Koperasi Kegelapan NFC wallet system. These assumptions are the ground truth that all other spec layers depend on. Any change here has downstream impact on system design, security, and API contracts.

---

## 1. Tenancy & Deployment

- The application supports both **Single-Tenant** and **Multi-Tenant** deployments, online or offline.
- A tenant can assign its role to a different device if the tenant was previously registered online.
- In **offline / Single-Tenant mode**, all roles (Admin, Gate, Terminal, Scout) operate from a single device.
- Each tenant has a unique `slug` used as a URL-friendly public identifier.
- Tenant lifecycle statuses: `active`, `suspended`, `archived` — only `active` tenants can be used for login.
- A tenant running in `local` (offline-only) mode can be upgraded to `synced` mode when connectivity is available.
- Timezone is stored per-tenant (default: `Asia/Jakarta`) for reporting and display purposes.

---

## 2. Membership & Cards

- Membership cards are issued exclusively by the cooperative, using a front/back cover format defined by the cooperative.
- A single member may hold more than one membership card if registered by an admin.
- Blocking (suspending) a member automatically blocks all cards affiliated with that member.
- If a card is lost, the member must notify the cooperative. The last check-in/check-out admin validates the information in the Transaction Log as justification for re-issuing a new card with zero balance.
- **Card ID**: 6 bytes (48-bit), randomly generated, stored as a hex string in the database.
- Each card carries a `tenantBind` field (FNV-32a hash of `tenantId`) validated on every scan — cards from other tenants are rejected.
- Card statuses: `ACTIVE`, `BLOCKED_TAMPER`, `BLOCKED_FRAUD`, `BLOCKED_EXPIRED`, `BLOCKED_ADMIN`.
- Blocked cards cannot perform any operation (check-in, check-out, debit, top-up) until reset by an admin.
- Cards have an `expiresAt` field — expired cards are rejected at validation time.
- Cards carry a `keyVersion` that must match the session grant — mismatch causes rejection (key rotation scenario).
- The User ID on a card is stored as an 8-character alphanumeric ASCII string in the binary payload.

---

## 3. Transactions & Balance

- The Transaction Log on a card records: **Top-up**, **Check-in**, and **Check-out** events, including activity type, timestamp, and amount.
- Minimum balance required at check-in: **Rp 10,000**.
- Minimum balance after check-out: **Rp 0** (no negative balance allowed).
- Parking fee is calculated per hour, rounded up: **Rp 2,000/hour**.
- Checkout fee = `ceil(duration_in_hours) × Rp 2,000`.
- Maximum amount per transaction encodable on the card: **16,777,215** (uint24 max, ~Rp 16.7 million).
- Maximum balance storable on the card: **4,294,967,295** (uint32 max, ~Rp 4.29 billion).
- Card counter uses uint64 (bigint) — practically no overflow risk.
- Each transaction produces a unique idempotency key (`tenantId:cardIdHex:counter`) to prevent duplication during sync.
- The on-card transaction log stores a maximum of **5 entries** (ring buffer) — the full log lives in the server/IndexedDB.
- Each log entry on the card has a chain hash (SHA-256 truncated to 4 bytes) linking it to the previous entry for tamper detection.

---

## 4. State Machine & Operation Flow

Card states: `IDLE`, `CHECKED_IN`, `STATION_OPERATION`, `CHECKED_OUT`.

Valid state transitions:

| From                | To                  | Trigger                        |
| ------------------- | ------------------- | ------------------------------ |
| `IDLE`              | `CHECKED_IN`        | `gate_checkin`                 |
| `IDLE`              | `CHECKED_OUT`       | `force_checkout`               |
| `CHECKED_IN`        | `STATION_OPERATION` | `terminal_start`               |
| `CHECKED_IN`        | `CHECKED_OUT`       | `gate_checkout`                |
| `CHECKED_IN`        | `CHECKED_OUT`       | `force_checkout`               |
| `STATION_OPERATION` | `CHECKED_IN`        | `terminal_end`                 |
| `STATION_OPERATION` | `CHECKED_OUT`       | `force_checkout`               |
| `CHECKED_OUT`       | `IDLE`              | `admin_reset` / `gate_checkin` |

- **Session timeout**: 24 hours + 1 hour clock-drift tolerance. After expiry the card is treated as expired and only `checkout` / `force_checkout` are allowed.
- Invalid transitions are rejected by the engine; the card is not written.
- `admin_reset` returns the card to `IDLE` with the session cleared (`startTime=0`, `endTime=0`, `terminalId=0`).

---

## 5. NFC & Hardware

- The application uses the **Web NFC API** (`NDEFReader`) — available only in Chrome on Android over HTTPS.
- Card format: **NTAG215-compatible** (wire format: 280 bytes = 216-byte buffer + 64-byte trailer).
- Full card format (dual-buffer): 496 bytes = 216×2 buffers + 64-byte trailer — used for recovery scenarios.
- **Dual-buffer (A/B) design** with an active pointer in the trailer enables atomic writes and recovery from incomplete writes.
- A **write-ahead journal** is persisted to IndexedDB _before_ the physical NFC write. If the write fails, recovery is attempted on the next scan.
- After an NFC write, a **verification read** confirms the data was written correctly.
- If verification fails, the journal is retained and recovery is retried on the next tap.
- **Rapid-tap debounce**: scans are ignored if the interval is < 1 second (except during writing).
- NFC writes have **1 automatic retry** on I/O error (card briefly removed).
- **Pending write timeout**: if the card is not re-tapped within the timeout window, the operation is cancelled.
- **Post-write auto-reset**: after a successful write, state returns to idle after a configurable timeout.

---

## 6. Security & Cryptography

- Cards are encrypted using **AES-256-GCM** (schema version ≥ 2).
- Key derivation uses **HKDF-SHA256** from the session key + card ID:
  - Encryption key: `HKDF(sessionKey, cardId, "enc", 32 bytes)`
  - Auth key (HMAC): `HKDF(sessionKey, cardId, "auth", 32 bytes)`
  - Nonce: `HKDF(sessionKey, cardId‖counter, "nonce", 12 bytes)` — counter-bound to prevent nonce reuse.
- The trailer HMAC (8-byte truncated SHA-256) validates the integrity of the entire buffer + trailer anchor.
- The counter bind in the trailer must match the lower 32 bits of the wallet counter — tamper detection.
- Chain hashes on log entries use SHA-256 truncated to 4 bytes — detects modification or deletion of log entries.
- Session grants carry `allowedOps` that restrict operations per role/device.
- Session grants carry `expiresAt` — operations are rejected if the grant has expired.
- Password hashing uses **PBKDF2-SHA256** (100,000 iterations) — compatible between server and client.
- **Constant-time comparison** is used for password verification and HMAC verification.
- Access tokens currently use a JWT-like format without a cryptographic signature (relies on HTTPS transport) — noted for production upgrade.

---

## 7. Roles & Access

| Role         | Capabilities                                                                     |
| ------------ | -------------------------------------------------------------------------------- |
| `gate`       | Automatic check-in — validates card, checks minimum balance, applies check-in    |
| `terminal`   | Automatic check-out — calculates parking fee, deducts balance, applies check-out |
| `scout`      | Read-only — inspect card, view balance and transaction log, no writes            |
| `kiosk`      | Debit/purchase — select amount, deduct balance, also register new cards          |
| `station`    | Full management — issue cards, top-up, block/unblock, reset state, recovery      |
| `admin`      | Full management (same as station) plus member and card administration            |
| `superadmin` | Cross-tenant management                                                          |

- Each role receives a session grant with a distinct `allowedOps` set — the engine rejects operations outside the grant.
- Gate and Scout use `lenient: true` mode in the NFC card hook — more tolerant of edge cases.

---

## 8. Synchronisation (Online / Offline)

- **Online database** and **local IndexedDB** are used for transaction logs, member records, and card management.
- Members can access a **Digital Passbook** by entering their cooperative's code/slug.
- Sync strategy: **push-first** — push entities + transactions first, then pull the latest data from the server.
- **Sync debounce**: 5 seconds after the last local mutation before triggering sync.
- **Periodic pull**: every 30 seconds to capture changes from other devices.
- **Retry**: exponential backoff (1 s → 60 s max), up to 5 consecutive attempts.
- Sync is triggered automatically on: visibility change (tab becomes active), `online` event, and initial mount.
- **Conflict resolution**: server wins on pull — entities with pending local changes are skipped.
- Push uses idempotency keys — duplicates are accepted silently (`accepted: true`).
- **Stale counter detection**: the server rejects transactions if the counter ≤ the last counter known to the server.
- **Batch size limit**: maximum 500 transactions per push request.
- Sync pull uses cursor-based pagination (500 records per page) with a `hasMore` flag.
- Entity push (members + cards) is best-effort — failure does not halt transaction push.
- If a device is blocked, all sync operations are cancelled (client-side check before every request).
- If there is no access token (local-only tenant), sync pull is skipped without error.

---

## 9. Device Management

- Devices are registered with a fingerprint hash, user agent, and platform.
- Devices have a `blockedUntil` timestamp — if it is in the future, all API requests are rejected (HTTP 403).
- Unregistered devices are allowed through (backward compatibility).
- **Rate limiting**: 60 requests per minute per device (sliding window, in-memory on the Worker isolate).
- Rate limit exceeded: HTTP 429 with a `Retry-After` header.
- Auth sessions are bound to a device — refresh tokens are per-device.
- The client stores the device ID in the tenant context (IndexedDB) and includes it in the JWT for all API calls.

---

## 10. Data Persistence & Storage

### Client-side (Browser)

| Store                   | Contents                                                                                                                           | Schema version |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **IndexedDB (raw)**     | Tenant context, card snapshots, write journal, policy cache, session grant cache, auth tokens, local tenant config, local accounts | v5             |
| **Dexie (IDB wrapper)** | Users, cards, transaction log, sync cursors, device info, audit log, session grants                                                | v6             |
| **React Query cache**   | Hydrated from Dexie on every navigation and after a successful sync                                                                | —              |

- Write journal uses a composite key `[tenantId, cardIdHex]` — one pending write per card at a time.
- Sync cursors are stored per entity type per tenant — enables incremental pull.

### Server-side

| Store                           | Contents                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare D1** (SQLite)      | All master data: tenants, accounts, users, cards, transaction_log, devices, auth_sessions, session_grants, audit_log, sync_cursors, card_events |
| **Cloudflare Analytics Engine** | Sync metrics (latency, status, batch sizes) and client errors                                                                                   |

- The server-side transaction log has a unique constraint on `[tenantId, cardId, counter]` — prevents duplication.

---

## 11. Infrastructure & Deployment

| Component   | Technology                                                     |
| ----------- | -------------------------------------------------------------- |
| Frontend    | Vite SPA (React 19 + TanStack Router/Query) → Cloudflare Pages |
| API         | Hono framework on Cloudflare Workers with D1 binding           |
| Database    | Cloudflare D1 (SQLite-compatible, edge-distributed)            |
| PWA         | `vite-plugin-pwa` + `workbox-window` for offline capability    |
| Build tools | Vite, TypeScript 6, oxlint, oxfmt, Vitest, Playwright (E2E)    |

- HTTPS is required — Web NFC API is only available in a secure context.
- CORS middleware is applied to all `/api/*` routes.
- Observability: Cloudflare Workers logs + Analytics Engine datasets.

---

## 12. Known Limitations & Constraints

| Constraint                     | Detail                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Web NFC availability           | Chrome on Android only — iOS and desktop browsers are not supported                                                  |
| In-memory rate limiter         | Per Worker isolate — not shared across isolates (acceptable for single-instance deployments)                         |
| Unsigned access token          | JWT-like format without cryptographic signature — relies on HTTPS transport security; flagged for production upgrade |
| Truncated HMAC (8 bytes)       | Trade-off between security and NFC tag space                                                                         |
| Truncated chain hash (4 bytes) | Low collision probability for 5 entries, but not cryptographically strong                                            |
| Dual-buffer recovery           | Only works if at least one buffer is valid — if both buffers are corrupt, the card cannot be recovered               |
| Offline multi-device           | Not supported — only one device can serve all roles in offline mode                                                  |
| Stale session grant cache      | If the server performs a key rotation, cards will be rejected until the grant is refreshed                           |
| Maximum transaction amount     | Rp 16,777,215 (uint24 limit on the log entry amount field)                                                           |
| Card name length               | Limited to 24 bytes UTF-8 — longer names are truncated                                                               |
| User ID length                 | Limited to 8 bytes ASCII — must be a short alphanumeric string                                                       |

---

## References

- [System Design §4: Card State Machine](../system-design/4_card-state-machine.md)
- [System Design §8: Cryptographic Model](../system-design/8_crypto-model.md)
- [Tech Specs §6: State Machine & Session Rules](6_state-machine-session-rules.md)
- [Tech Specs §9: Risk & Financial Limits](9_risk-financial-limits.md)
- [Tech Specs §16: Infrastructure Stack](16_infrastructure-stack.md)
- [Data Spec §5: Multitenancy, Auth & Local-first Storage](../data-spec/5_multitenancy-auth-local-first.md)
- [ADR-008: Local-First Terminal Architecture](../adr/8_local-first-terminal-architecture.md)
- [ADR-011: Outbox-First Reconciliation Sync](../adr/11_outbox-first-reconciliation-sync.md)
- [ADR-012: Cloudflare Distribution Only](../adr/12_cloudflare-distribution-only.md)

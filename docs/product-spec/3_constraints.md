# 3. Constraints

## Hardware constraints

- **Card type**: NXP NTAG215 (primary) / NTAG216 (extended). ISO 14443-3A, NFC Forum Type 2.
- **Storage**: 496 usable bytes on NTAG215 — structured as two 216-byte double buffers + one 64-byte trailer. All card state (balance, session, log, authentication trailer) must fit within this limit.
- **Double buffering**: Two full payload buffers (A and B) with an active pointer in the trailer. Enables crash-safe writes — if a write is interrupted, the inactive buffer preserves the previous valid state.
- **No secure element**: the card has no hardware-backed encryption or tamper protection. The system is **tamper-evident**, not tamper-proof. AES-GCM encryption and HMAC integrity protect the card body.
- **No native app**: all terminal and gate interaction runs in a browser using Web NFC and Web Crypto APIs. No iOS NFC write support (Web NFC is Android/Chrome only at time of writing).
- **Card schema version**: v4 is current. Cards below v4 are rejected with "Schema version mismatch".

## Financial constraints

| Constraint                      | Value            | Rationale                                                     |
| ------------------------------- | ---------------- | ------------------------------------------------------------- |
| Maximum storable balance        | Rp 16,000,000    | Hard ceiling imposed by `uint24` log amount field (max 16,777,215); `MAX_BALANCE` constant |
| Maximum single transaction      | Rp 16,000,000    | Hardware limit; constrained by uint24 log entry field         |
| Policy: single transaction cap  | Rp 1,000,000     | Per-tenant configurable backend policy default (`maxTransactionAmount`) |
| Policy: daily cumulative limit  | Rp 5,000,000     | Per-tenant configurable backend policy default (`maxDailyTotal`) |
| Maximum top-up amount           | Rp 2,000,000     | Enforced client-side and server-side (`MAX_TOPUP_AMOUNT`)     |
| Minimum top-up amount           | Rp 2,000         | Enforced client-side and server-side (`MIN_TOPUP_AMOUNT`)     |
| Minimum issuance balance        | Rp 2,000         | Minimum balance when issuing a new card (`MIN_ISSUANCE_BALANCE`) |
| Minimum balance before check-in | Rp 10,000        | Card must have at least this balance to check in (`MIN_BALANCE_BEFORE_CHECKIN`) |
| Parking rate                    | Rp 2,000/hour    | Calculated at checkout: hours (rounded up) × rate (`PARKING_RATE_PER_HOUR`) |

> Financial limits are enforced at two levels: hardware limits are checked at write time on the client, and policy limits are configurable per tenant and enforced at reconciliation/sync push. See [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md) for enforcement mechanisms.

## Connectivity constraints

- **Terminals, gates, and kiosks are offline-first.** They must function without backend access for the duration of a session grant.
- **Session grants have bounded lifetimes (24 hours).** A terminal without a valid session grant cannot authorise transactions. Clock drift tolerance of 1 hour is built into expiry checks.
- **Session keys are tenant-scoped and deterministic.** All devices in the same tenant derive the same session key from the master key, enabling any device to read/write cards encrypted by any other device in that tenant.
- **Top-ups are always online.** No balance credit operation may proceed without a live backend connection. The `topupOnlineOnly` policy flag enforces this.
- **Sync push/pull occurs when connectivity returns.** Offline events are batched and uploaded via `POST /api/sync/push`. Server data is pulled via `GET /api/sync/pull` with cursor-based pagination.
- **Exponential backoff on sync failures.** Up to 5 retry attempts with 1s initial backoff, doubling each attempt (capped at 60s).
- **Device block check before each sync request.** If a device is blocked, sync operations abort immediately.

## Security constraints

- The card is an untrusted storage medium. Every read must re-validate: HMAC integrity, counter-bind consistency, tenant-bind match, and chain hash integrity.
- A card showing a failed HMAC or counter-bind validation is treated as tampered. A tenant-bind mismatch indicates an unregistered/foreign card.
- Session keys are derived server-side via HMAC-SHA256: `masterKey → HMAC(tenantId:keyVersion) → HMAC("session-key")`. Terminals never receive or store raw master keys.
- Card body (identity, wallet, session, logs) is encrypted with AES-GCM using the session key, card ID, and counter as nonce material (schema v2+).
- Block enforcement is dual-source: both the on-card status field and the local IndexedDB card record are checked before any write operation.
- JWT access tokens are HMAC-SHA256 signed with 1-hour expiry. Refresh tokens are device-bound and rotated on each use.
- Password storage uses PBKDF2-SHA256 with 100,000 iterations.

## Card state constraints

The card state machine has 4 states with defined transitions:

| State              | Allowed Transitions                                    |
| ------------------ | ------------------------------------------------------ |
| IDLE               | → CHECKED_IN (gate_checkin), → CHECKED_OUT (force_checkout) |
| CHECKED_IN         | → STATION_OPERATION (terminal_start), → CHECKED_OUT (gate_checkout, force_checkout) |
| STATION_OPERATION  | → CHECKED_IN (terminal_end), → CHECKED_OUT (force_checkout) |
| CHECKED_OUT        | → IDLE (admin_reset, gate_checkin)                     |

**Card statuses** (independent from card state):
- `ACTIVE` (0) - normal operation
- `BLOCKED_TAMPER` (1) - tamper detected
- `BLOCKED_FRAUD` (2) - fraud flagged
- `BLOCKED_EXPIRED` (3) - card expired
- `BLOCKED_ADMIN` (4) - administratively blocked

Only cards with `ACTIVE` status may undergo state transitions (except `admin_reset`).

## Operational constraints

- The system supports 5 distinct client apps (Station, Gate, Terminal, Kiosk, Scout) plus Admin and Superadmin UIs, without requiring native app installation.
- Cards in any `BLOCKED_*` status may not be reactivated on-card — physical reissue is required (except via `applyResetState` for admin operations).
- The `applyBlockStatus` operation writes the blocked status back to the physical card when the local DB indicates the card is blocked but on-card status is still ACTIVE, ensuring offline enforcement.
- Clock drift between terminal and backend of up to 1 hour is acceptable during offline sessions (built into `isSessionExpired` check).
- Session expiry is 24 hours from last activity. After 24h + 1h drift tolerance, only checkout/force_checkout transitions are allowed.
- Sync push batches are limited to 500 transactions per request.
- Sync pull pages return up to 500 items per entity type (members, cards, transactions).

## Multi-tenancy constraints

- Every data entity (users, cards, transactions, devices, sessions) is scoped to a `tenantId`.
- Tenant isolation is enforced at the JWT level — the token's `tenantId` is authoritative for all API requests.
- Cards are cryptographically bound to their tenant via an FNV-32a hash of the tenantId stored in the card header (`tenantBind`). A card from a different tenant is rejected with a tenant mismatch error.
- Tenants have statuses: `active`, `suspended`, `archived`. Non-active tenants prevent non-superadmin login.
- Session key derivation includes tenantId, ensuring cryptographic tenant isolation — a session key from one tenant cannot decrypt cards from another.

> ⚠️ Downstream impact: changes to any constraint in this section must be reflected in [System Design §2 Hardware Constraints](../system-design/2_hardware-constraints.md) and [System Design §3 Security Model](../system-design/3_security-model.md).

# 13. Role-specific App Models

## Permission matrix

| Operation                 | Admin | Station | Gate | Terminal | Kiosk | Scout | Superadmin |
| ------------------------- | ----- | ------- | ---- | -------- | ----- | ----- | ---------- |
| Read card state           | ✓     | ✓       | ✓    | ✓        | ✓     | ✓     | −          |
| Issue / initialise card   | ✓     | ✓       | −    | −        | −     | −     | −          |
| Top-up balance (credit)   | ✓     | ✓       | −    | −        | −     | −     | −          |
| Check-in (open session)   | ✓     | ✓       | ✓    | −        | −     | −     | −          |
| Check-out (close session) | ✓     | ✓       | −    | ✓        | −     | −     | −          |
| Debit transaction         | ✓     | −       | −    | ✓        | ✓     | −     | −          |
| Block card (admin op)     | ✓     | ✓       | −    | −        | −     | −     | −          |
| Reset card state          | ✓     | ✓       | −    | −        | −     | −     | −          |
| View transaction logs     | ✓     | ✓       | ✓    | ✓        | ✓     | ✓     | −          |
| Sync push/pull            | ✓     | ✓       | ✓    | ✓        | ✓     | −     | −          |
| Manage members            | ✓     | ✓       | −    | −        | −     | −     | −          |
| Manage cards (CRUD)       | ✓     | ✓       | −    | −        | −     | −     | −          |
| Manage tenants            | −     | −       | −    | −        | −     | −     | ✓          |
| Manage accounts (cross-tenant) | −  | −      | −    | −        | −     | −     | ✓          |
| Block/unblock devices     | −     | −       | −    | −        | −     | −     | ✓          |

(✓ = allowed, − = not allowed)

## Role → Allowed Ops (from `roleOps.ts`)

| Role      | `allowedOps` in session grant                    |
| --------- | ------------------------------------------------ |
| admin     | read, debit, credit, checkin, checkout, admin, station |
| station   | read, credit, checkin, checkout, admin           |
| gate      | read, checkin                                    |
| terminal  | read, debit, checkout                            |
| kiosk     | read, debit                                      |
| scout     | read                                             |

## Admin

- **Purpose**: full koperasi tenant management — members, cards, devices, accounts, settings, and all card operations.
- **Operations**: all card operations (read, debit, credit, checkin, checkout, admin, station). Full CRUD on members, cards, and operator accounts within the tenant.
- **UI mode**: authenticated admin interface with full navigation (AdminLayout). Routes under `/admin`.
- **Offline behavior**: can operate card operations offline within session grant. CRUD operations require connectivity.

## Station

- **Purpose**: card issuance, top-up, and lifecycle management.
- **Operations**: register new cards (initialise); top-up balance (credit); check-in/checkout; admin operations (reset, block). Always requires online connectivity for balance credits.
- **UI mode**: authenticated staff interface (AdminLayout). Routes under `/station`.
- **Key access**: holds a session grant with `credit`, `checkin`, `checkout`, `admin` permissions.
- **Constraint**: top-up (credit) operations are structurally online-only because station operators must verify against the backend.

## Gate

- **Purpose**: session lifecycle — checking members in at entry points.
- **Operations**: read card state; check-in (`IDLE → CHECKED_IN`). Note: checkout is NOT in gate's `allowedOps` — checkout is handled by terminal/admin.
- **UI mode**: kiosk-style interface (KioskLayout) for rapid tap interactions. Routes under `/gate`.
- **Offline behavior**: operates offline within session grant. Only `read` and `checkin` operations.
- **Key access**: holds a session grant with `["read", "checkin"]`.

## Terminal

- **Purpose**: transaction processing at point of service (debit + checkout).
- **Operations**: read and validate card state; perform debit transactions; perform checkout (with parking fee calculation). Queue offline events for sync.
- **UI mode**: operator-facing transaction screen (KioskLayout). Routes under `/terminal`.
- **Offline behavior**: fully offline-capable. Queues debit/checkout events in outbox for sync push when connectivity returns.
- **Key access**: holds a session grant with `["read", "debit", "checkout"]`.

## Kiosk

- **Purpose**: self-service debit terminal for unmanned points.
- **Operations**: read and validate card state; perform debit transactions only. No checkout capability.
- **UI mode**: simplified self-service interface (KioskLayout). Routes under `/kiosk`.
- **Offline behavior**: fully offline-capable within session grant.
- **Key access**: holds a session grant with `["read", "debit"]`.

## Scout

- **Purpose**: member-facing self-service information kiosk.
- **Operations**: read balance, session state, and transaction log. No writes.
- **UI mode**: read-only interface (KioskLayout). Routes under `/scout`.
- **Authentication**: none required — uses anonymous session grant.
- **Key access**: anonymous session grant with `["read"]` only. Can decrypt and validate cards but cannot write.

## Superadmin

- **Purpose**: platform-level infrastructure management across all tenants.
- **Operations**: manage tenants (create, view, change status: active/suspended/archived); manage accounts (create, view, change status, change password); manage devices (view per-tenant, block/unblock).
- **UI mode**: authenticated admin interface (AdminLayout). Routes under `/superadmin`.
- **Authentication**: requires `superadmin` role in DB. Can authenticate without specifying a tenant slug. Bypasses tenant active status check.
- **Card access**: none — superadmin does not interact with NFC cards directly.
- **API routes**: `/api/superadmin/tenants`, `/api/superadmin/accounts`, `/api/superadmin/devices`.

## Authentication model

All roles (except scout) authenticate via `POST /api/auth/token`:
- **Input**: `username`, `password`, `tenantSlug` (optional for superadmin), `deviceFingerprint` (optional)
- **Output**: JWT access token (1h), refresh token (device-bound), account details
- **Refresh**: `POST /api/auth/refresh` with `sessionId` + `refreshToken` → new access token + rotated refresh token

Session grants for NFC operations are requested separately after authentication via `GET /api/session-grant?tenantId=X&role=Y&deviceId=Z`.

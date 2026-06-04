# 13. Client Roles & Apps

## Roles and apps

| Role        | App            | Layout     | Route Prefix  | Allowed Card Ops                              |
| ----------- | -------------- | ---------- | ------------- | --------------------------------------------- |
| admin       | Admin UI       | AdminLayout| /admin        | read, debit, credit, checkin, checkout, admin, station |
| station     | Station app    | AdminLayout| /station      | read, credit, checkin, checkout, admin         |
| gate        | Gate app       | KioskLayout| /gate         | read, checkin                                  |
| terminal    | Terminal app   | KioskLayout| /terminal     | read, debit, checkout                          |
| kiosk       | Kiosk app      | KioskLayout| /kiosk        | read, debit                                    |
| scout       | Scout app      | KioskLayout| /scout        | read                                           |
| superadmin  | Superadmin UI  | AdminLayout| /superadmin   | (API-level management, no card ops)            |

All interactive roles run inside an explicit tenant context (except superadmin which operates cross-tenant). A valid operating session requires both an authenticated user session and an enrolled device identity.

## Responsibilities

- **Admin** manages the koperasi tenant: operator accounts, devices, cards, members, transactions, and settings. Has full card operation capability.
- **Station** registers new cards (initialisation), loads value (top-up), issues and blocks cards, and performs check-in/checkout. Always online.
- **Gate** handles entry workflows — check-in only. Validates card status/balance before allowing check-in. Operates offline within session grant.
- **Terminal** performs debit and checkout operations within a session. Operates offline within session grant.
- **Kiosk** is a simplified self-service terminal for debit operations only. Operates offline within session grant. No checkout capability.
- **Scout** provides read-only member balance and transaction history. Uses an anonymous session grant — no authentication required. Cannot modify card state.
- **Superadmin** manages platform infrastructure: tenants (CRUD, status), accounts (CRUD, password reset), devices (view, block/unblock). No direct card interaction.

## Session model

- Devices are identified by a fingerprint hash computed from browser characteristics (userAgent, platform). Device registration occurs at login time via the auth endpoint.
- Human operators authenticate with username + password + tenant slug. No second factor is implemented.
- The backend issues a JWT access token (1 hour expiry, HMAC-SHA256 signed) containing `accountId`, `tenantId`, `role`, and `deviceId`.
- A refresh token (bound to device and session) allows token renewal without re-authentication. Tokens are rotated on each refresh.
- A separate session grant (24h lifetime) is requested via `GET /api/session-grant` and provides the cryptographic session key needed for card operations.
- Offline operation is allowed only while both the access token (or its cached credentials) and the session grant are valid.
- Superadmin accounts bypass tenant slug requirement and tenant active status check during authentication.

## Scout anonymous access

The Scout app is the only client that operates without user authentication:
- It requests a session grant with `role=scout` and receives an anonymous grant.
- The grant contains only `["read"]` in `allowedOps`.
- No `accountId` or `deviceId` binding is enforced.
- The session key allows card decryption and validation but not write operations.

## Device management

- Devices are registered in the `devices` table with: `deviceId`, `tenantId`, `accountId`, `fingerprintHash`, `userAgent`, `platform`, `lastSeenAt`, `blockedUntil`.
- A blocked device (`blockedUntil > now`) is rejected by the `deviceBlockCheck` middleware on all API routes.
- Device blocking also revokes all active auth sessions for that device.
- The client-side `isDeviceBlocked()` check prevents sync operations before making API calls.

## Tenant isolation

- All data access is scoped to the authenticated user's `tenantId` (extracted from JWT).
- A user cannot request a session grant for a tenant other than their own (403 response).
- Cards are cryptographically bound to their tenant via `tenantBind` (FNV-32a hash). A card from a different tenant fails validation with a tenant mismatch error.
- Session keys are tenant-scoped: `HMAC(masterKey, tenantId:keyVersion)` → tenant key → session key. Cross-tenant key reuse is cryptographically impossible.

# 2. Authentication & Authorization

> ⚠️ This spec reflects the **code-frozen implementation** as of June 2026. MFA, device key pairs, and WebAuthn are NOT implemented. Authentication is username + password only.

## Authentication model (implemented)

Authentication uses a single layer: **operator credentials** (username + password + tenant slug).

| Layer             | What is proved                                             | Mechanism                                           |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Operator identity | The human has valid credentials for the claimed tenant role | Password verified via PBKDF2-SHA256 (100k iterations) |
| Device enrollment | This browser is registered with the koperasi               | Device fingerprint (hash, userAgent, platform) registered at login time |

The backend issues a short-lived **JWT access token** (1h) and a **refresh token** (device-bound) after password verification succeeds.

---

## Role-scoped authorization

Every authorization check enforces:

1. `tenantId` from the JWT matches the resource being accessed (except superadmin which is cross-tenant).
2. `role` in the JWT determines the permitted operations.
3. Account `status` must be `active`.

No API endpoint accepts `tenantId` from the request body as authoritative. Tenant scope is always read from the verified JWT.

### Permission matrix

| Permission                     | admin | station | gate | terminal | kiosk | scout | superadmin |
| ------------------------------ | :---: | :-----: | :--: | :------: | :---: | :---: | :--------: |
| Read card state                |   ✓   |    ✓    |  ✓   |    ✓     |   ✓   |   ✓   |     −      |
| Issue / initialise card        |   ✓   |    ✓    |  −   |    −     |   −   |   −   |     −      |
| Top-up balance (credit)        |   ✓   |    ✓    |  −   |    −     |   −   |   −   |     −      |
| Debit transaction              |   ✓   |    −    |  −   |    ✓     |   ✓   |   −   |     −      |
| Check-in                       |   ✓   |    ✓    |  ✓   |    −     |   −   |   −   |     −      |
| Check-out                      |   ✓   |    ✓    |  −   |    ✓     |   −   |   −   |     −      |
| Block card / admin ops         |   ✓   |    ✓    |  −   |    −     |   −   |   −   |     −      |
| Sync push/pull                 |   ✓   |    ✓    |  ✓   |    ✓     |   ✓   |   −   |     −      |
| Manage accounts within tenant  |   ✓   |    −    |  −   |    −     |   −   |   −   |     −      |
| Manage tenants (cross-tenant)  |   −   |    −    |  −   |    −     |   −   |   −   |     ✓      |
| Manage accounts (cross-tenant) |   −   |    −    |  −   |    −     |   −   |   −   |     ✓      |
| Block/unblock devices          |   −   |    −    |  −   |    −     |   −   |   −   |     ✓      |

(✓ = allowed, − = denied)

---

## Token lifecycle (implemented)

### Access token (JWT)

- **Algorithm**: HMAC-SHA256 signed with `SESSION_MASTER_KEY`
- **TTL**: 1 hour
- **Claims**: `accountId`, `tenantId`, `role`, `deviceId`, `iat`, `exp`
- **Storage**: Client memory only (not persisted)
- **Revocation**: Not implemented (relies on short TTL); device block check provides immediate cutoff

### Refresh token

- **TTL**: 7 days (based on `auth_sessions.expires_at`)
- **Storage server-side**: SHA-256 hash in `auth_sessions.refresh_token_hash`
- **Storage client-side**: Local state (not encrypted)
- **Rotation**: Every successful refresh rotates to a new token (single-use)
- **Replay detection**: Reusing a rotated refresh token triggers session investigation

---

## Device management (implemented)

- Devices are identified by a browser fingerprint hash (computed from userAgent + platform).
- Device registration occurs automatically at login when `deviceFingerprint` is provided.
- A device record stores: `deviceId`, `tenantId`, `accountId`, `fingerprintHash`, `userAgent`, `platform`, `lastSeenAt`, `blockedUntil`.
- **Device blocking**: superadmin can block a device for 60s–365d. Blocking revokes all auth sessions and rejects all API calls via `deviceBlockCheck` middleware.
- Client-side `isDeviceBlocked()` check prevents sync operations proactively.

---

## Superadmin authentication

- Superadmin accounts authenticate without `tenantSlug` (can omit it).
- Superadmin bypasses tenant active status check (can log in even if their assigned tenant is suspended).
- Superadmin authorization is verified via **defense-in-depth DB lookup**: even with a valid JWT, the `requireSuperadmin` function re-checks the account's role in the database at request time.
- Superadmin cannot perform NFC card operations (no session grant with card ops).

---

## Scout anonymous access

- Scout is the only role that does NOT require authentication.
- `GET /api/session-grant?role=scout&tenantId=X` returns an anonymous grant with `allowedOps: ["read"]`.
- No `accountId` or `deviceId` binding is enforced for scout grants.
- Scout cannot write to cards, sync data, or access any authenticated endpoint.

---

## Not implemented (aspirational)

The following security features are NOT part of the current implementation:

- **MFA / TOTP / WebAuthn**: No second factor. Auth is password-only.
- **Device key pairs / ECDSA challenges**: Devices use fingerprint hash, not cryptographic identity.
- **Encrypted refresh token storage**: Refresh tokens are not encrypted at rest on client.
- **Account lockout after failed attempts**: Rate limiting exists but no progressive lockout.
- **Password complexity requirements**: No server-side password policy enforcement beyond "non-empty".

---

## Cross-references

- API Spec §2: [Authentication](../api-spec/2_auth.md)
- Data Spec §3: [`auth_sessions` table](../data-spec/3_backend-db-schema.md)
- Data Spec §5: [Multitenancy, Auth & Local-first Storage](../data-spec/5_multitenancy-auth-local-first.md)
- Tech Specs §12: [Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)

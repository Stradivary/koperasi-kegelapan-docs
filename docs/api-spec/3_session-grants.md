# 3. Session Grants

A session grant authorises a client to perform NFC card operations for 24 hours. It includes a deterministic tenant-scoped session key, allowed operations, and a backend signature.

> See [Tech Specs §12](../tech-specs/12_key-hierarchy-session-grants.md) for key derivation details.

## `GET /api/session-grant`

Request a session grant. Requires authentication (except for scout role).

**Query parameters**:

| Param      | Required | Notes                                                    |
| ---------- | -------- | -------------------------------------------------------- |
| `tenantId` | Yes      | Must match the authenticated user's tenant (enforced)    |
| `role`     | No       | If `"scout"`, anonymous access is allowed                |
| `deviceId` | No       | Defaults to token's deviceId or "unknown"                |

**Authenticated response** (`200`):

```json
{
  "keyVersion": 1,
  "sessionKey": "<base64-encoded 32-byte key>",
  "expiresAt": 1778323200,
  "allowedOps": ["read", "debit", "checkout"],
  "tenantId": "tenant_xyz",
  "accountId": "acc_abc123",
  "deviceId": "dev_456",
  "signature": "<base64url HMAC signature>"
}
```

**Scout (anonymous) response** — when `role=scout`, no authentication required:

```json
{
  "keyVersion": 1,
  "sessionKey": "<base64-encoded 32-byte key>",
  "expiresAt": 1778323200,
  "allowedOps": ["read"],
  "tenantId": "tenant_xyz",
  "accountId": "scout-anonymous",
  "deviceId": "unknown",
  "signature": "<base64url HMAC signature>"
}
```

**Error responses**:

| Code  | Error                    | Cause                                           |
| ----- | ------------------------ | ----------------------------------------------- |
| `400` | tenantId required        | Missing tenantId query parameter                |
| `401` | Authentication required  | No valid token (non-scout roles)                |
| `403` | Forbidden: tenant mismatch | Requested tenantId differs from token's tenant |

**Implementation details**:
- Session key is deterministic: `HMAC(HMAC(masterKey, tenantId:keyVersion), "session-key")`. All devices in the same tenant get the same session key.
- Grant lifetime: 24 hours from issuance.
- `allowedOps` is derived from the authenticated role via `roleToOps()`.
- Signature covers: `{keyVersion, expiresAt, allowedOps, accountId, deviceId}` signed with the tenant key.

**Allowed ops per role**:

| Role     | allowedOps                                     |
| -------- | ---------------------------------------------- |
| admin    | read, debit, credit, checkin, checkout, admin, station |
| station  | read, credit, checkin, checkout, admin         |
| gate     | read, checkin                                  |
| terminal | read, debit, checkout                          |
| kiosk    | read, debit                                    |
| scout    | read                                           |

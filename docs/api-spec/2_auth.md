# 2. Authentication

## `POST /api/auth/token`

Exchange operator credentials for an authenticated session. Rate-limited.

**Request body**:

```json
{
  "username": "operator1",
  "password": "securepass",
  "tenantSlug": "koperasi-kegelapan",
  "deviceFingerprint": {
    "hash": "a1b2c3d4...",
    "userAgent": "Mozilla/5.0...",
    "platform": "Android"
  }
}
```

| Field              | Required | Notes                                                       |
| ------------------ | -------- | ----------------------------------------------------------- |
| `username`         | Yes      | Operator username                                           |
| `password`         | Yes      | Operator password (verified via PBKDF2-SHA256)              |
| `tenantSlug`       | No*      | Required for non-superadmin accounts. Superadmin can omit.  |
| `deviceFingerprint`| No       | If provided, registers/upserts device and creates auth session |

**Success response** (`200`):

```json
{
  "accountId": "acc_abc123",
  "tenantId": "tenant_xyz",
  "tenantSlug": "koperasi-kegelapan",
  "tenantName": "Koperasi Kegelapan",
  "role": "admin",
  "accessToken": "<JWT>",
  "deviceId": "dev_456",
  "sessionId": "sess_789",
  "refreshToken": "<token>",
  "expiresAt": 1778236800
}
```

Fields `deviceId`, `sessionId`, `refreshToken`, `expiresAt` are only present when `deviceFingerprint` is provided.

**Error responses**:

| Code  | Error                    | Cause                                    |
| ----- | ------------------------ | ---------------------------------------- |
| `400` | username and password required | Missing required fields            |
| `401` | Invalid credentials      | Wrong username or password               |
| `401` | Tenant inactive          | Tenant status is not "active" (non-superadmin) |
| `404` | Tenant not found         | tenantSlug doesn't match any tenant      |

**Notes**:
- Without `tenantSlug`, only `superadmin` accounts can authenticate.
- Superadmin bypasses tenant active status check.
- Password verification uses PBKDF2-SHA256 (100,000 iterations) with constant-time comparison.
- Device fingerprint triggers device registration in the `devices` table.

---

## `POST /api/auth/refresh`

Rotate refresh token and issue a new access token.

**Request body**:

```json
{
  "sessionId": "sess_789",
  "refreshToken": "<current refresh token>"
}
```

**Success response** (`200`):

```json
{
  "accessToken": "<new JWT>",
  "refreshToken": "<new rotated refresh token>",
  "sessionId": "sess_789",
  "expiresAt": 1778240400
}
```

**Error responses**:

| Code  | Error                 | Cause                                      |
| ----- | --------------------- | ------------------------------------------ |
| `400` | sessionId and refreshToken required | Missing required fields     |
| `401` | Token expired or revoked | Refresh token has expired, been revoked, or already rotated |
| `401` | Account inactive      | Account status is no longer "active"       |
| `404` | Session not found      | sessionId doesn't exist                    |

**Notes**:
- Refresh tokens are single-use. Each refresh rotates to a new token.
- Reusing an old refresh token (replay) results in session revocation.
- The new access token includes updated `accountId`, `tenantId`, `role`, `deviceId`.

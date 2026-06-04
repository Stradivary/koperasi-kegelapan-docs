# 7. Superadmin

All superadmin endpoints require a valid JWT token where the account has `role: "superadmin"` in the database. The authorization check (`requireSuperadmin`) decodes the token, looks up the account in the DB, and verifies the role is `superadmin` — defense-in-depth beyond just the JWT claim.

## Tenants

### `GET /api/superadmin/tenants`

List all tenants with pagination and search.

**Query parameters**: `page`, `pageSize`, `search`

**Response** (`200`):

```json
{
  "data": [
    {
      "tenantId": "tenant_xyz",
      "slug": "koperasi-kegelapan",
      "name": "Koperasi Kegelapan",
      "status": "active",
      "timezone": "Asia/Jakarta",
      "createdAt": 1746600000,
      "updatedAt": 1746600000
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

### `POST /api/superadmin/tenants`

Create a new tenant.

**Request body**: `{ name, slug, timezone?, status? }`

### `GET /api/superadmin/tenants/:tenantId`

Get tenant detail including counts.

### `PATCH /api/superadmin/tenants/:tenantId/status`

Change tenant status.

**Request body**:

```json
{ "status": "suspended" }
```

Valid values: `active`, `suspended`, `archived`.

---

## Accounts

### `GET /api/superadmin/accounts`

List all accounts across all tenants with pagination and search.

**Query parameters**: `page`, `pageSize`, `search`

### `POST /api/superadmin/accounts`

Create a new account.

**Request body**: `{ username, password, role, tenantId, status? }`

### `PATCH /api/superadmin/accounts/:accountId/status`

Change account status.

**Request body**: `{ "status": "suspended" }` or `{ "status": "active" }`

### `POST /api/superadmin/accounts/:accountId/change-password`

Reset an account's password.

**Request body**: `{ "newPassword": "newSecurePass" }`

---

## Devices

### `GET /api/superadmin/devices?tenantId=X`

List all devices for a specific tenant.

**Query parameters**: `tenantId` (required)

### `POST /api/superadmin/devices/:deviceId/block`

Block a device for a specified duration. Also revokes all active auth sessions for the device.

**Request body**:

```json
{ "durationSeconds": 86400 }
```

Duration must be between 60 (1 minute) and 31,536,000 (365 days).

**Response** (`200`):

```json
{
  "blocked": true,
  "deviceId": "dev_456",
  "blockedUntil": 1778323200,
  "sessionsRevoked": 2
}
```

### `POST /api/superadmin/devices/:deviceId/unblock`

Remove the block from a device.

**Response** (`200`):

```json
{
  "blocked": false,
  "deviceId": "dev_456",
  "blockedUntil": null
}
```

---

## Common error responses

| Code  | Error                                              | Cause                    |
| ----- | -------------------------------------------------- | ------------------------ |
| `401` | Authentication required                            | Missing or invalid token |
| `403` | Insufficient permissions. Superadmin role required.| Account is not superadmin|
| `404` | Device/Tenant/Account not found                    | Resource doesn't exist   |
| `400` | Validation error                                   | Invalid request body     |

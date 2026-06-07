# 9. Accounts

Endpoints for managing operator accounts within the authenticated tenant. Requires authentication.

## `GET /api/accounts`

List accounts for the authenticated tenant.

**Response** (`200`): array of account records.

## `POST /api/accounts`

Create a new account within the authenticated tenant.

**Request body**:

```json
{
  "username": "operator_new",
  "password": "securepass",
  "role": "terminal",
  "tenantId": "tenant_xyz"
}
```

Valid roles: `admin`, `station`, `gate`, `terminal`, `scout`, `kiosk`

**Notes**:

- Password is hashed with PBKDF2-SHA256 (100,000 iterations) before storage.
- Account is created with `status: "active"` by default.
- Username must be unique across the system.

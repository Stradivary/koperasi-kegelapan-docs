# 6. Sync

The sync system is the primary data exchange mechanism between client apps and the backend. It uses cursor-based pagination for pulls and idempotent batched pushes.

All sync endpoints require authentication and are rate-limited (60 req/min per device_id).

## `POST /api/sync/push`

Upload offline transactions to the server. Idempotent via `idempotencyKey`.

**Request body**:

```json
{
  "tenantId": "tenant_xyz",
  "transactions": [
    {
      "cardId": "a1b2c3d4e5f6",
      "userId": "GJWt7u3g",
      "counter": 17,
      "type": "debit",
      "amount": 15000,
      "balanceAfter": 485000,
      "timestamp": 1746690000,
      "hash": "deadbeef",
      "terminalId": 42,
      "deviceId": "dev_456",
      "idempotencyKey": "tenant_xyz:a1b2c3d4e5f6:17"
    }
  ]
}
```

**Validation rules** (per transaction):

- Required fields: `cardId`, `counter`, `type`, `amount`, `balanceAfter`, `timestamp`, `hash`, `idempotencyKey`
- Valid types: `debit`, `credit`, `checkin`, `checkout`, `topup`, `admin`
- `amount`: 0 ≤ amount ≤ 16,000,000
- `balanceAfter`: 0 ≤ balanceAfter ≤ 16,000,000
- `counter`: 0 ≤ counter ≤ 65,535
- Type-specific: `topup` requires amount ≥ 2,000 and ≤ 2,000,000; `credit` requires amount ≥ 2,000

**Success response** (`200`):

```json
{
  "accepted": 3,
  "rejected": [
    {
      "key": "tenant_xyz:a1b2c3d4e5f6:18",
      "reason": "stale_counter"
    }
  ],
  "serverCursor": "1746690100"
}
```

**Rejection reasons**:

- `malformed_event` — missing required fields or invalid type
- `invalid_amount` — amount out of range
- `invalid_balance` — balanceAfter out of range
- `invalid_counter` — counter out of range
- `topup_amount_below_minimum` / `topup_amount_exceeds_limit` — top-up range violation
- `issuance_amount_below_minimum` — credit below Rp 2,000
- `stale_counter` — counter ≤ server's known counter for this card
- `internal_error` — unexpected server error

**Notes**:

- Maximum batch size: 500 transactions per request. Returns 400 if exceeded.
- Duplicate `idempotencyKey` entries are silently accepted (idempotent).
- Token's `tenantId` is authoritative (payload's `tenantId` is logged but ignored).
- `serverCursor` is the current server Unix timestamp for client cursor tracking.

---

## `GET /api/sync/pull`

Fetch server-side changes since the client's last known cursors. Cursor-based pagination.

**Query parameters**:

| Param           | Required | Notes                              |
| --------------- | -------- | ---------------------------------- |
| `tenantId`      | No       | Logged; token's tenantId is used   |
| `membersCursor` | No       | Unix timestamp cursor (default: 0) |
| `cardsCursor`   | No       | Unix timestamp cursor (default: 0) |
| `txCursor`      | No       | Unix timestamp cursor (default: 0) |

**Success response** (`200`):

```json
{
  "members": {
    "data": [
      {
        "tenantId": "tenant_xyz",
        "userId": "GJWt7u3g",
        "name": "Siti Rahayu",
        "status": "active",
        "createdAt": 1746600000,
        "updatedAt": 1746690000
      }
    ],
    "cursor": "1746690000",
    "hasMore": false
  },
  "cards": {
    "data": [...],
    "cursor": "1746690000",
    "hasMore": false
  },
  "transactions": {
    "data": [...],
    "cursor": "1746690000",
    "hasMore": true
  }
}
```

**Pagination**: each entity type returns up to 500 items per page. If `hasMore: true`, the client should call again with the updated cursor values.

---

## `GET /api/sync/devices`

List all devices and server entity counts for the authenticated tenant.

**Success response** (`200`):

```json
{
  "devices": [
    {
      "deviceId": "dev_456",
      "tenantId": "tenant_xyz",
      "accountId": "acc_abc123",
      "fingerprintHash": "a1b2c3...",
      "userAgent": "Mozilla/5.0...",
      "platform": "Android",
      "lastSeenAt": 1746690000,
      "blockedUntil": null,
      "createdAt": 1746600000
    }
  ],
  "serverCounts": {
    "members": 150,
    "cards": 200,
    "transactions": 5000
  }
}
```

---

## `POST /api/sync/push-entities`

Push member/card entity changes to the server (used for station operations that create/update members and cards).

**Request body**: entity-specific payload (members, cards, or both).

**Notes**: This endpoint is mounted under the sync route and handles entity-level sync distinct from transaction sync.

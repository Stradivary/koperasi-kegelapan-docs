# 5. Cards

Card endpoints for UID checking and status management. Requires authentication.

## `GET /api/cards/check-uid`

Check if a card UID is already registered in the system (across all tenants).

**Query parameters**:

| Param | Required | Notes                                          |
| ----- | -------- | ---------------------------------------------- |
| `uid` | Yes      | Card UID in hex format (8-14 hex characters)   |

**Success response** (`200`):

```json
{ "exists": true, "tenantId": "tenant_xyz" }
```

or:

```json
{ "exists": false }
```

**Error responses**:

| Code  | Error                                            | Cause                   |
| ----- | ------------------------------------------------ | ----------------------- |
| `400` | uid query parameter is required                  | Missing uid             |
| `400` | Invalid UID format: must be 8-14 hex characters  | Invalid hex format      |

**Notes**:
- UID is normalized (lowercase, non-hex characters stripped) before lookup.
- Cards with `status: "deleted"` are excluded from the search.
- Searches across all tenants (used during card issuance to prevent duplicates).

---

## `POST /api/cards/:cardId/block`

Block a card by changing its server-side status. Triggers a `card_status_change` event for SSE broadcast.

**Request body**:

```json
{
  "reason": "blocked_admin",
  "changedBy": "operator1"
}
```

| Field      | Required | Notes                                                                 |
| ---------- | -------- | --------------------------------------------------------------------- |
| `reason`   | Yes      | One of: `blocked_admin`, `blocked_tamper`, `blocked_fraud`, `blocked_expired` |
| `changedBy`| Yes      | Identifier of the operator performing the block                       |

**Success response** (`200`):

```json
{
  "success": true,
  "cardId": "a1b2c3d4e5f6",
  "status": "blocked_admin",
  "changedBy": "operator1",
  "timestamp": 1746700000
}
```

**Error responses**:

| Code  | Error                   | Cause                                    |
| ----- | ----------------------- | ---------------------------------------- |
| `400` | reason is required      | Missing or invalid reason                |
| `400` | changedBy is required   | Missing changedBy                        |
| `400` | Invalid reason          | Reason not in valid list                 |
| `401` | Authentication required | Missing or invalid token                 |
| `404` | Card not found          | cardId not found in the tenant           |

**Implementation details**:
- Updates the card's `status` field in the `cards` table to the corresponding enum value (e.g., `BLOCKED_ADMIN`).
- Inserts a `card_status_change` event into the `card_events` table for SSE broadcast to other devices.
- The block takes effect on the server side immediately. Client devices will receive the updated status on next sync pull.
- To write the block status to the physical card, the next terminal that reads it will detect the mismatch (local DB shows blocked, on-card shows ACTIVE) and use `applyBlockStatus` to write the block to the card.
- Card UID is scoped to the authenticated tenant (token's `tenantId`).

---

## Card registration (via sync push-entities)

Card registration (creating a new card record on the server) is handled through `POST /api/sync/push-entities` rather than a dedicated cards endpoint. When a station issues a new card:

1. Station writes the initial payload to the physical NFC card locally.
2. Station creates a local IndexedDB card record with `syncStatus: "pending"`.
3. On next sync, the card record is pushed to the server via the entity sync mechanism.

This approach maintains the offline-first architecture — card issuance doesn't require immediate connectivity.

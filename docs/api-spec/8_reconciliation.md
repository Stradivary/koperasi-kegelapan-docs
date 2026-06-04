# 8. Reconciliation (Legacy)

> **Note**: The primary transaction sync mechanism is `POST /api/sync/push` (see [§6 Sync](6_sync.md)). The reconciliation endpoint is an older endpoint that remains available for backward compatibility.

## `POST /api/reconcile`

Upload offline events for reconciliation. Requires authentication.

**Request body**:

```json
{
  "terminalId": 42,
  "events": [
    {
      "cardId": "a1b2c3d4e5f6",
      "counter": 17,
      "type": "debit",
      "amount": 15000,
      "balanceAfter": 485000,
      "timestamp": 1746690000,
      "hash": "deadbeef",
      "idempotencyKey": "tenant_xyz:a1b2c3d4e5f6:17"
    }
  ]
}
```

**Response** (`200`):

```json
{
  "accepted": 3,
  "rejected": 1,
  "flags": [
    {
      "cardId": "a1b2c3d4e5f6",
      "counter": 18,
      "reason": "duplicate_counter"
    }
  ]
}
```

**Rejection reasons**:
- `malformed_event` — missing required fields
- `missing_tenant_id` — cannot determine tenant from event or idempotencyKey
- `duplicate_counter` — event with this card_id + counter already exists in audit_log
- `internal_error` — unexpected server error

**Notes**:
- Events are persisted to the `audit_log` table (separate from `transaction_log`).
- Card balance is updated if the event has a newer counter.
- Tenant ID is extracted from either the event's `tenantId` field or parsed from the `idempotencyKey` (format: `tenantId:cardIdHex:counter`).

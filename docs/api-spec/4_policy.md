# 4. Policy

The policy endpoint returns per-tenant risk limits and configuration. Requires authentication.

> See [Tech Specs §9](../tech-specs/9_risk-financial-limits.md) for enforcement rules.

## `GET /api/policy`

**Query parameters**:

| Param      | Required | Notes                            |
| ---------- | -------- | -------------------------------- |
| `tenantId` | Yes      | Tenant to fetch policy for       |

**Response** (`200`):

```json
{
  "tenantId": "tenant_xyz",
  "maxTransactionAmount": 1000000,
  "maxDailyTotal": 5000000,
  "topupOnlineOnly": true,
  "allowedTxTypes": ["debit", "credit", "checkin", "checkout"],
  "sessionTimeoutHours": 24
}
```

**Field descriptions**:

| Field                  | Type     | Default     | Description                              |
| ---------------------- | -------- | ----------- | ---------------------------------------- |
| `tenantId`             | string   | —           | Tenant identifier                        |
| `maxTransactionAmount` | number   | 1,000,000   | Policy cap per single transaction (Rp)   |
| `maxDailyTotal`        | number   | 5,000,000   | Policy cap per day cumulative (Rp)       |
| `topupOnlineOnly`      | boolean  | true        | Whether top-ups require online connectivity |
| `allowedTxTypes`       | string[] | [debit, credit, checkin, checkout] | Permitted transaction types |
| `sessionTimeoutHours`  | number   | 24          | Session timeout in hours                 |

**Error responses**:

| Code  | Error                   | Cause                      |
| ----- | ----------------------- | -------------------------- |
| `401` | Authentication required | No valid token             |

**Implementation note**: These policy values are served via `getDefaultPolicy(tenantId)` from `src/core/auth/policy.ts`. Currently returns hardcoded defaults — per-tenant policy customization is a future enhancement. The values are **not enforced at transaction time**; enforcement relies on hardcoded constants in the state machine engine and sync push validation.

## Caching recommendation

- Fetch policy on session grant renewal.
- Use cached policy for UI display (e.g., showing limits to operators).
- Hardware-enforced limits (from constants) take precedence over policy values.

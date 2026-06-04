# 1. Overview

## Base URL

All endpoints are relative to the backend service root:

```
https://<deployment-host>/api/
```

Production: Cloudflare Worker deployed as `koperasi-kegelapan-api`.

## Authentication

Authenticated requests use a bearer token (JWT, HMAC-SHA256 signed, 1h expiry):

```
Authorization: Bearer <access-token>
```

The JWT payload contains: `accountId`, `tenantId`, `role`, `deviceId`, `iat`, `exp`.

## Middleware stack

All `/api/*` routes pass through middleware in this order:

1. **CORS** — preflight handling for all API routes
2. **Device block check** — extracts deviceId from token (without signature verification); rejects blocked devices
3. **Auth rate limit** — applied to `/api/auth/*` only (brute-force protection)
4. **Token verification** — validates JWT signature and expiry (applied to all protected routes below `/api/auth` and `/api/tenants`)
5. **Sync rate limit** — 60 req/min per device_id on `/api/sync/*`
6. **Sync analytics** — Cloudflare Analytics Engine tracking on `/api/sync/*`

## Public routes (no token required)

- `POST /api/auth/token` — login
- `POST /api/auth/refresh` — token refresh
- `GET /api/tenants` — public tenant directory
- `POST /api/client-errors` — client error reporting

## Protected routes (JWT required)

All other `/api/*` routes require a valid JWT.

## Common response codes

| Code  | Meaning               |
| ----- | --------------------- |
| `200` | OK                    |
| `400` | Bad Request           |
| `401` | Unauthorized          |
| `403` | Forbidden             |
| `404` | Not Found             |
| `429` | Too Many Requests     |
| `500` | Internal Server Error |

Error response format:

```json
{
  "error": "Human-readable error description"
}
```

Some endpoints also include a `code` field for programmatic error handling.

## Offline behaviour

Terminals continue working when the backend is unavailable. The backend is required only for:

- Initial authentication and token refresh
- Session grant issuance
- Sync push/pull (deferred until connectivity returns)
- Card registration and top-up (station operations)
- Administrative operations (accounts, devices, tenants)

All NFC card read/write operations are performed locally using the cached session grant.

# 10. Tenants (Public Directory)

The tenants endpoint provides a public directory of available koperasi tenants. Used by login screens and scout apps before authentication.

## `GET /api/tenants`

List active tenants. **No authentication required.**

**Response** (`200`):

```json
[
  {
    "tenantId": "tenant_xyz",
    "slug": "koperasi-kegelapan",
    "name": "Koperasi Kegelapan",
    "status": "active"
  }
]
```

**Notes**:

- This is a public endpoint (no JWT required) registered before the `verifyToken` middleware.
- Used by the login screen to populate tenant selection.
- Used by the scout app to discover available tenants for anonymous access.
- Only returns tenants visible to public access (implementation may filter by status).

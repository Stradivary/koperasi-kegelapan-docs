# 2. Users & Roles

## Role table

| Role                 | Description                                                                                                                                        | Trust Level                                                                              | App              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------- |
| **Member**           | Cardholder. Uses an NFC card as a prepaid wallet. May check their own balance and history via Scout. Cannot modify card state directly.            | Untrusted - card contents are unverified until cryptographically validated               | Scout (read-only)|
| **Koperasi admin**   | Tenant administrator for a single koperasi. Manages operator accounts, devices, policies, members, cards, and audit access for that koperasi.     | Trusted within tenant scope only                                                         | Admin UI         |
| **Terminal operator** | Staff at a point-of-sale. Executes debits and checkouts. Operates primarily offline within a session grant.                                       | Conditionally trusted - terminal acts within the scope of a backend-issued session grant | Terminal app     |
| **Gate operator**    | Staff managing entry points. Validates card status and performs check-in operations.                                                               | Conditionally trusted - same session grant model as terminal                             | Gate app         |
| **Station operator** | Administrative staff. Registers new cards, tops up balances, issues and blocks cards, performs check-in/checkout. Always requires backend connectivity. | Trusted - all station operations are online and backend-validated                    | Station app      |
| **Superadmin**       | Platform-level administrator. Manages tenants (create, suspend, archive), manages all accounts cross-tenant, blocks/unblocks devices.             | Authoritative - full cross-tenant access, bypasses tenant status checks                  | Superadmin UI    |
| **System (backend)** | Issues session grants, validates sync batches, enforces financial limits, maintains the audit log, derives key material.                          | Authoritative - the root of trust for all policy and key material                        | Cloudflare Workers API |

## Role constraints

- A **member** may never write to their own card - all writes are performed by operator-role apps.
- Every authenticated human actor (except superadmin) belongs to exactly one koperasi tenant. All permissions, cards, devices, and reports are scoped to the currently selected tenant.
- A **terminal operator** may only execute operations permitted by the current session grant (`read`, `debit`, `checkout`). The grant is bound to the tenant and the logged-in operator.
- A **gate operator** may only execute `read` and `checkin` operations via the session grant.
- A **station operator** has full card operations (`read`, `credit`, `checkin`, `checkout`, `admin`) and must be online to issue a session grant; no offline top-ups are permitted.
- A **koperasi admin** inherits all station operations plus cross-device management within their tenant. They may create, suspend, and rotate credentials for operators and devices inside their own tenant. They may not access other tenants.
- A **superadmin** can authenticate without specifying a tenant. They can manage tenants (create, activate, suspend, archive), manage all accounts across tenants, view and block/unblock devices, and change account passwords. Superadmin bypasses tenant active status checks.
- The **backend** is the only entity that issues or rotates key material. Session keys are derived deterministically from a master key, tenant ID, and key version - all devices in the same tenant share the same session key to enable offline card operations.

## Role → Allowed Operations mapping

| Role      | Allowed Ops                                      |
| --------- | ------------------------------------------------ |
| terminal  | read, debit, checkout                            |
| gate      | read, checkin                                    |
| scout     | read                                             |
| station   | read, credit, checkin, checkout, admin           |
| admin     | read, debit, credit, checkin, checkout, admin, station |
| superadmin| (API-level access, not card operations)          |

## Role interactions

```
Member card
    │
    ├─── read ──────────────► Scout app (member view, read-only, anonymous session grant)
    │
    ├─── read + debit + checkout ► Terminal app (within tenant-scoped session grant)
    │
    ├─── read + checkin ────► Gate app (check-in only)
    │
    └─── register + top-up + admin ► Station app (online only)
                                    │
                       Koperasi admin / operator login
                                    │
                                    └─── sync + audit ► Backend API
                                                            │
                                              Superadmin ───┘ (cross-tenant management)
```

## Authentication model

- Login requires `username`, `password`, and `tenantSlug` (except superadmin who can omit tenantSlug).
- Successful login returns a signed JWT access token (1 hour expiry) and optionally a refresh token bound to a device fingerprint.
- Session grants for card operations are requested separately via `GET /api/session-grant` with the authenticated token.
- Scout app uses an anonymous session grant (no authentication required, read-only operations).
- Device fingerprint integration: each login registers/upserts a device record for tracking and block enforcement.

> See [System Design §13 Client Roles](../system-design/13_client-roles.md) for the technical breakdown of each app's card access permissions.

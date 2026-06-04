# ADR-018: Single/Multi-Tenant with Offline-to-Synced Upgrade Path

**Date**: 2026-06-01  
**Status**: Accepted

## Context

The system must serve two deployment modes:

1. **Offline-only (single tenant)**: A single koperasi operates from one device with no internet. All roles (admin, gate, terminal, scout) run on the same device. Data lives entirely in IndexedDB.

2. **Online multi-tenant**: Multiple koperasi tenants share the Cloudflare backend. Each tenant can have multiple devices. Data syncs between devices via the push/pull API.

A koperasi may start in offline mode (testing, initial setup, poor connectivity area) and later decide to connect to the backend. The transition must not lose existing local data.

## Decision

Support both single-tenant offline and multi-tenant online modes with an **upgrade path from local to synced**:

**Offline-only mode:**
- Tenant is created locally in IndexedDB with a generated `tenantId`
- Accounts, members, cards created locally with `syncStatus: "pending"`
- No API calls made — `syncPull` skips if no access token exists
- Session grants generated locally using a local master key (client-side HMAC derivation)
- All roles function from a single device

**Online mode:**
- Tenant registered on backend (superadmin or self-registration)
- Device authenticates via `POST /api/auth/token` with tenant slug
- Session grants fetched from `GET /api/session-grant` (server-derived)
- Data syncs bidirectionally via push/pull

**Upgrade path (local → synced):**
1. Operator registers the tenant on the backend (or admin creates it via superadmin)
2. Operator logs in with server credentials from the device
3. Local pending entities (members, cards, transactions) are pushed to server via entity sync
4. Server assigns canonical IDs and acknowledges
5. Subsequent operations sync normally

**Key design choices:**
- 1 tenant can be registered on multiple devices if it has been online-enrolled at least once
- Offline-only mode has no device limit enforcement (single device assumption)
- Tenant `slug` is the public identifier used for login — must be unique globally
- Local-only tenants use `getAccessToken() === null` as the check to skip sync

## Consequences

**Positive:**

- Koperasi can start immediately without internet — no setup dependency on backend
- Upgrade to online mode preserves all existing data
- Multi-device operation enabled once tenant is registered online
- Graceful degradation — if connectivity is lost, the system continues in offline mode

**Negative:**

- Local-only mode has no backup — if the device is lost, data is gone
- Session grants in offline mode use locally-derived keys — less secure than server-issued
- The upgrade path requires careful conflict handling if the same cardId exists both locally and on server
- No inter-device sync in offline mode — single device only

**Risks:**

- Data loss if offline device fails before upgrade to synced mode
- Duplicate entity creation if upgrade is attempted multiple times — mitigated by idempotency keys
- Local-only session grants have no server-side revocation capability

## Alternatives Considered

| Option                           | Reason Rejected                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| **Online-only (no offline mode)**| Target users include rural/venue koperasi with no reliable internet. Blocks adoption.   |
| **Offline-only (no upgrade)**    | Limits growth — koperasi that want multi-device must start over.                        |
| **Hybrid from day 1 (always sync)** | Requires internet for initial setup. Chicken-and-egg for rural deployments.          |
| **Export/import migration**      | Manual data transfer is error-prone and user-unfriendly.                                |

## References

- Product Spec §3: [Constraints - Connectivity](../product-spec/3_constraints.md)
- System Design §16: [Infrastructure Stack](../system-design/16_infrastructure-stack.md)
- Data Spec §5: [Multitenancy, Auth & Local-first Storage](../data-spec/5_multitenancy-auth-local-first.md)
- assumptions.md §1: Tenancy & Deployment

# 8. Backend & Frontend Interfaces

This section defines the application contract between the browser UI, terminal flows, NFC card payloads, and optional backend sync services. It is written as a practical developer reference for building the app with TanStack Start on the frontend and a lightweight backend layer where needed.

## Purpose

- Make frontend, terminal, and backend responsibilities explicit.
- Keep the card format and API behavior stable and easy to implement.
- Provide a shared reference for developers and documentation readers.

## Frontend architecture

- Build the app using TanStack Start conventions: routing, query caching, and state management.
- Use Web NFC to interact with the card and Web Crypto to validate encryption and authentication.
- Show clear workflows for reading card details, creating transactions, and reconciling offline events.
- Store local-first tenant data in IndexedDB: operator session snapshot, card cache, policy cache, and reconciliation outbox. `localStorage` is not sufficient for durable terminal state.
- Prefer browser-local execution for terminal workflows; remote calls are only needed for optional sync, audit upload, tenant bootstrap, or policy refresh.
- Support three UI modes:
  - **Member view**: read-only balance, history, and card status.
  - **Terminal mode**: write-enabled flow for transactions, check-ins, and reconciliation.
  - **Admin view**: manage tenants, users, and system settings.
- Require an explicit tenant selector after login, with scoped path (e.g., `/tenant/:tenantId/terminal`) to ensure all operations are tenant-aware.

## Backend architecture

- Provide a lightweight optional sync/orchestration layer rather than a full transaction runtime.
- Run as a Nitro-compatible service with API routes for session grants, policy data, reconciliation, and audit logging when remote sync is required.
- Issue and rotate session grants and key versions.
- Authenticate both devices and human operators, manage tenant-scoped risk rules, and validate high-risk operations.
- Reconcile offline card events and persist operational logs.
- Expose a stable API that frontend and terminal code can depend on for sync and bootstrapping.
- Materialize tenant-scoped read models so terminals can hydrate local state quickly after reconnect.
- Do not require backend availability for core card transaction flow while a cached valid local grant exists.

## Interface contracts

### Session grants

- Issued by the backend with `keyVersion`, expiry, permitted operations, and backend signature.
- Bound to `tenantId`, `accountId`, `deviceId`, role scope, and permitted operations.
- Kept temporarily by terminals; never stored permanently on the card.
- Validated by the frontend before allowing any state-changing write.

### Local-first sync

- The client maintains a per-tenant local replica for cards, policies, account profile, and unsent reconciliation events.
- Writes created offline enter an outbox with deterministic idempotency keys.
- Reconnect flow uploads the outbox first, then pulls server checkpoints for the active tenant.
- Conflict resolution is server-authoritative for backend records and card-authoritative for unreconciled offline balance until reconciliation completes.

### Card payloads

- Include current balance, status, replay counter, session pointer, and authentication trailer.
- Are read by the frontend and validated locally before the app makes decisions.
- Are rejected as suspicious if cryptographic validation fails.

## API endpoints

Full endpoint definitions - payloads, error codes, and constraints - are in the [API Spec](../api-spec/index.md):

| Endpoint                          | Section                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `POST /api/auth/token`            | [API Spec §2 Authentication](../api-spec/2_auth.md)               |
| `GET /api/session-grant`          | [API Spec §3 Session Grants](../api-spec/3_session-grants.md)     |
| `GET /api/policy`                 | [API Spec §4 Policy](../api-spec/4_policy.md)                     |
| `POST /api/cards`                 | [API Spec §5 Cards](../api-spec/5_cards.md)                       |
| `GET /api/cards/:cardId`          | [API Spec §5 Cards](../api-spec/5_cards.md)                       |
| `POST /api/cards/:cardId/topup`   | [API Spec §5 Cards](../api-spec/5_cards.md)                       |
| `POST /api/cards/:cardId/block`   | [API Spec §5 Cards](../api-spec/5_cards.md)                       |
| `POST /api/cards/:cardId/reissue` | [API Spec §5 Cards](../api-spec/5_cards.md)                       |
| `POST /api/reconcile`             | [API Spec §8 Reconciliation](../api-spec/8_reconciliation.md)     |
| `POST /api/sync/push`             | [API Spec §6 Sync](../api-spec/6_sync.md)                         |

## Terminal behavior

- Confirm card state and status before every transaction.
- Enforce status, session, and risk rules in the terminal workflow.
- Use the A/B buffer process for safe card writes.
- Queue reconciliation events and upload them when backend connectivity is restored.

## UX guidance

- Display simple, user-facing messages such as `Card blocked`, `Session expired`, `Pending reconciliation`, and `Invalid card state`.
- Hide low-level cryptographic details from users.
- Keep terminal, station, and gate flows consistent across screens.

## Developer guidance

- Keep schema and interface definitions aligned between frontend and backend.
- Prefer shared type generation or schema references (e.g., Zod schemas or OpenAPI types) to avoid frontend/backend drift.
- Document all card field or API schema changes in the spec before deployment.
- Treat the frontend as the canonical place for card validation logic, with backend policies used for trusted decisions and session management.
- See ADR-008, ADR-010, ADR-011, and ADR-012 for the local-first, tenant-scoped terminal architecture and sync model.

> Note: future enhancement may add more advanced session, device, and reconciliation metadata while preserving the local-first terminal experience.

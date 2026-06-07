# 3. Backend DB Schema

The backend uses **Cloudflare D1 (SQLite)** as its persistence layer, managed via **Drizzle ORM** with migration support. The schema lives in `src/infrastructure/persistence/drizzle/schema.ts`.

> This schema is the **server-side projection** of card state. It is not the source of truth for offline balance — the card is. The backend schema becomes authoritative only after sync push reconciles the offline state.

> Tenant isolation is mandatory. Every business table carries `tenant_id`, and all queries scope by the authenticated user's `tenantId` from the JWT token.

> ⚠️ This spec is aligned with the **code-frozen implementation** as of June 2026.

---

## Table overview

| Table             | Purpose                                     | Primary Key                      |
| ----------------- | ------------------------------------------- | -------------------------------- |
| `tenants`         | Koperasi tenant registry                    | `tenant_id`                      |
| `accounts`        | Operator accounts with role and credentials | `account_id`                     |
| `users`           | Card member records (per-tenant)            | `(tenant_id, user_id)`           |
| `cards`           | Card registry with balance/status tracking  | `(tenant_id, card_id)`           |
| `devices`         | Registered device fingerprints              | `device_id`                      |
| `auth_sessions`   | Active auth sessions with refresh tokens    | `session_id`                     |
| `session_grants`  | Issued NFC session grants                   | `grant_id`                       |
| `transaction_log` | All synced transactions (per-tenant)        | `id` (autoincrement)             |
| `audit_log`       | Reconciliation audit trail (legacy)         | `id` (autoincrement)             |
| `sync_cursors`    | Per-device sync pagination state            | `(tenant_id, device_id, entity)` |
| `card_events`     | SSE-broadcast card status change events     | `id` (autoincrement)             |

---

## `tenants`

| Column       | Type    | Constraints                      | Description                            |
| ------------ | ------- | -------------------------------- | -------------------------------------- |
| `tenant_id`  | TEXT    | PK                               | Stable koperasi identifier             |
| `slug`       | TEXT    | UNIQUE, NOT NULL                 | Human-readable URL-safe slug for login |
| `name`       | TEXT    | NOT NULL                         | Koperasi display name                  |
| `status`     | TEXT    | NOT NULL, default 'active'       | `active`, `suspended`, `archived`      |
| `timezone`   | TEXT    | NOT NULL, default 'Asia/Jakarta' | Default timezone                       |
| `created_at` | INTEGER | NOT NULL (unixepoch)             | Creation timestamp                     |
| `updated_at` | INTEGER | NOT NULL (unixepoch)             | Last modification timestamp            |

---

## `accounts`

| Column          | Type    | Constraints                | Description                                                                |
| --------------- | ------- | -------------------------- | -------------------------------------------------------------------------- |
| `account_id`    | TEXT    | PK                         | Stable account identifier                                                  |
| `tenant_id`     | TEXT    | FK → tenants, NOT NULL     | Owning koperasi                                                            |
| `username`      | TEXT    | UNIQUE, NOT NULL           | Login username                                                             |
| `password_hash` | TEXT    | NOT NULL                   | PBKDF2-SHA256 hash (format: `pbkdf2$saltHex$hashHex` or `iters:salt:hash`) |
| `role`          | TEXT    | NOT NULL                   | `admin`, `station`, `gate`, `terminal`, `scout`, `superadmin`              |
| `status`        | TEXT    | NOT NULL, default 'active' | `active`, `suspended`                                                      |
| `created_at`    | INTEGER | NOT NULL (unixepoch)       | Creation timestamp                                                         |
| `updated_at`    | INTEGER | NOT NULL (unixepoch)       | Last modification timestamp                                                |

---

## `users`

| Column       | Type    | Constraints                | Description                                |
| ------------ | ------- | -------------------------- | ------------------------------------------ |
| `tenant_id`  | TEXT    | FK → tenants, NOT NULL     | Owning koperasi                            |
| `user_id`    | TEXT    | NOT NULL                   | 8-char alphanumeric ID                     |
| `name`       | TEXT    | NOT NULL                   | Full member name                           |
| `status`     | TEXT    | NOT NULL, default 'active' | `active`, `suspended`, `closed`, `deleted` |
| `created_at` | INTEGER | NOT NULL (timestamp)       | Creation timestamp                         |
| `updated_at` | INTEGER | NOT NULL (timestamp)       | Last modification                          |

**PK**: `(tenant_id, user_id)`

---

## `cards`

| Column             | Type    | Constraints                | Description                                                                                          |
| ------------------ | ------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `tenant_id`        | TEXT    | FK → tenants, NOT NULL     | Owning koperasi                                                                                      |
| `card_id`          | BLOB    | NOT NULL                   | 6-byte card identifier (binary)                                                                      |
| `user_id`          | TEXT    |                            | Optional linked member                                                                               |
| `status`           | TEXT    | NOT NULL, default 'active' | `active`, `ACTIVE`, `BLOCKED_TAMPER`, `BLOCKED_FRAUD`, `BLOCKED_EXPIRED`, `BLOCKED_ADMIN`, `deleted` |
| `balance`          | INTEGER | NOT NULL, default 0        | Last synced balance (IDR)                                                                            |
| `counter`          | INTEGER | NOT NULL, default 0        | Last synced counter value                                                                            |
| `key_version`      | INTEGER | NOT NULL, default 1        | Key version at issuance                                                                              |
| `created_at`       | INTEGER | NOT NULL (timestamp)       | Issuance timestamp                                                                                   |
| `last_activity_at` | INTEGER |                            | Last synced transaction timestamp                                                                    |
| `expires_at`       | INTEGER |                            | Card expiry timestamp                                                                                |
| `notes`            | TEXT    |                            | Operator notes or block reason                                                                       |
| `updated_at`       | INTEGER | NOT NULL (unixepoch)       | Last modification (used as sync cursor)                                                              |

**PK**: `(tenant_id, card_id)`

---

## `devices`

| Column             | Type    | Constraints             | Description                               |
| ------------------ | ------- | ----------------------- | ----------------------------------------- |
| `device_id`        | TEXT    | PK                      | Computed device identifier                |
| `tenant_id`        | TEXT    | FK → tenants, NOT NULL  | Owning koperasi                           |
| `account_id`       | TEXT    | FK → accounts, NOT NULL | Operator who enrolled this device         |
| `fingerprint_hash` | TEXT    | NOT NULL                | Browser fingerprint hash                  |
| `user_agent`       | TEXT    | NOT NULL                | Device user agent                         |
| `platform`         | TEXT    | NOT NULL                | Device platform                           |
| `last_seen_at`     | INTEGER | NOT NULL                | Last API activity timestamp               |
| `blocked_until`    | INTEGER |                         | If set, device is blocked until this time |
| `created_at`       | INTEGER | NOT NULL                | Registration timestamp                    |

**Index**: `(tenant_id, account_id)`

---

## `auth_sessions`

| Column               | Type    | Constraints             | Description                           |
| -------------------- | ------- | ----------------------- | ------------------------------------- |
| `session_id`         | TEXT    | PK                      | Unique session identifier             |
| `tenant_id`          | TEXT    | FK → tenants, NOT NULL  | Tenant scope                          |
| `account_id`         | TEXT    | FK → accounts, NOT NULL | Operator account                      |
| `device_id`          | TEXT    | FK → devices, NOT NULL  | Bound device                          |
| `refresh_token_hash` | TEXT    | NOT NULL                | SHA-256 hash of current refresh token |
| `expires_at`         | INTEGER | NOT NULL                | Session expiry timestamp              |
| `revoked_at`         | INTEGER |                         | If set, session has been revoked      |
| `created_at`         | INTEGER | NOT NULL                | Creation timestamp                    |

**Indexes**: `(device_id)`, `(tenant_id, account_id)`

---

## `transaction_log`

The primary transaction record, populated via `POST /api/sync/push`.

| Column            | Type    | Constraints            | Description                                                |
| ----------------- | ------- | ---------------------- | ---------------------------------------------------------- |
| `id`              | INTEGER | PK (autoincrement)     | Internal sequence ID                                       |
| `tenant_id`       | TEXT    | FK → tenants, NOT NULL | Tenant scope                                               |
| `card_id`         | TEXT    | NOT NULL               | Card identifier (hex string)                               |
| `user_id`         | TEXT    |                        | Optional linked member                                     |
| `counter`         | INTEGER | NOT NULL               | Transaction counter                                        |
| `type`            | TEXT    | NOT NULL               | `debit`, `credit`, `checkin`, `checkout`, `topup`, `admin` |
| `amount`          | INTEGER | NOT NULL               | Transaction amount (IDR)                                   |
| `balance_after`   | INTEGER | NOT NULL               | Balance after transaction                                  |
| `timestamp`       | INTEGER | NOT NULL               | Transaction timestamp (Unix seconds)                       |
| `hash`            | TEXT    | NOT NULL               | Chain hash (hex)                                           |
| `terminal_id`     | INTEGER |                        | Source terminal ID                                         |
| `device_id`       | TEXT    | FK → devices           | Source device                                              |
| `idempotency_key` | TEXT    | UNIQUE, NOT NULL       | Deduplication key                                          |
| `flagged`         | INTEGER | NOT NULL, default 0    | Whether flagged for review                                 |
| `created_at`      | INTEGER | NOT NULL               | Server receipt timestamp                                   |

**Unique constraint**: `(tenant_id, card_id, counter)`
**Indexes**: `(tenant_id, card_id)`, `(tenant_id, created_at)`

---

## `audit_log`

Legacy reconciliation audit trail (populated via `POST /api/reconcile`).

| Column          | Type    | Constraints             | Description              |
| --------------- | ------- | ----------------------- | ------------------------ |
| `id`            | INTEGER | PK (autoincrement)      | Internal ID              |
| `tenant_id`     | TEXT    | FK → tenants, NOT NULL  | Tenant scope             |
| `card_id`       | BLOB    | NOT NULL                | Card identifier (binary) |
| `counter`       | INTEGER | NOT NULL                | Event counter            |
| `type`          | TEXT    | NOT NULL                | Transaction type         |
| `amount`        | INTEGER | NOT NULL, default 0     | Amount                   |
| `balance_after` | INTEGER | NOT NULL                | Balance after            |
| `timestamp`     | INTEGER | NOT NULL                | Event timestamp          |
| `hash`          | BLOB    | NOT NULL                | Chain hash (binary)      |
| `terminal_id`   | INTEGER |                         | Source terminal          |
| `flagged`       | INTEGER | NOT NULL, default false | Whether flagged          |
| `created_at`    | INTEGER | NOT NULL (unixepoch)    | Server receipt timestamp |

---

## `sync_cursors`

| Column        | Type    | Constraints            | Description                        |
| ------------- | ------- | ---------------------- | ---------------------------------- |
| `tenant_id`   | TEXT    | FK → tenants, NOT NULL | Tenant scope                       |
| `device_id`   | TEXT    | FK → devices, NOT NULL | Device scope                       |
| `entity_type` | TEXT    | NOT NULL               | `members`, `cards`, `transactions` |
| `last_cursor` | TEXT    | NOT NULL               | Last known cursor value            |
| `updated_at`  | INTEGER | NOT NULL               | Last update timestamp              |

**PK**: `(tenant_id, device_id, entity_type)`

---

## `card_events`

| Column             | Type    | Constraints            | Description                                                                 |
| ------------------ | ------- | ---------------------- | --------------------------------------------------------------------------- |
| `id`               | INTEGER | PK (autoincrement)     | Event ID                                                                    |
| `tenant_id`        | TEXT    | FK → tenants, NOT NULL | Tenant scope                                                                |
| `card_id`          | TEXT    | NOT NULL               | Target card                                                                 |
| `event_type`       | TEXT    | NOT NULL               | `card_status_change`, `member_update`, `transaction`, `checkin`, `checkout` |
| `payload`          | TEXT    | NOT NULL               | JSON-encoded event payload                                                  |
| `source_device_id` | TEXT    |                        | Device that originated the event                                            |
| `created_at`       | INTEGER | NOT NULL               | Event timestamp                                                             |

**Index**: `(tenant_id, created_at)`

---

## `session_grants`

| Column        | Type    | Constraints             | Description              |
| ------------- | ------- | ----------------------- | ------------------------ |
| `grant_id`    | TEXT    | PK                      | Unique grant identifier  |
| `tenant_id`   | TEXT    | FK → tenants, NOT NULL  | Tenant scope             |
| `account_id`  | TEXT    | FK → accounts, NOT NULL | Issued to this account   |
| `device_id`   | TEXT    | NOT NULL                | Issued to this device    |
| `key_version` | INTEGER | NOT NULL                | Key version used         |
| `allowed_ops` | TEXT    | NOT NULL                | JSON-encoded allowed ops |
| `expires_at`  | INTEGER | NOT NULL (timestamp)    | Grant expiry             |
| `issued_at`   | INTEGER | NOT NULL (unixepoch)    | Grant issuance           |

---

## Cross-references

- Card field definitions: [Data Spec §2 Card Binary Schema](2_card-binary-schema.md)
- Multitenant and local-first storage rules: [Data Spec §5 Multitenancy, Auth & Local-first Storage](5_multitenancy-auth-local-first.md)
- Status codes and transition rules: [Tech Specs §15 Status Codes & Block Rules](../tech-specs/15_status-codes-block-rules.md)
- Sync API: [API Spec §6 Sync](../api-spec/6_sync.md)
- Reconciliation API: [API Spec §8 Reconciliation](../api-spec/8_reconciliation.md)
- Financial limits enforced at sync push: [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)

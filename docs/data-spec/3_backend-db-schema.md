# 3. Backend DB Schema

The backend uses a lightweight SQL database (SQLite or equivalent) to persist tenant metadata, accounts, member profiles, and the backend projection of issued cards.

> This schema is the **server-side projection** of card state. It is not the source of truth for offline balance - the card is. The backend schema becomes authoritative only after reconciliation.

> Tenant isolation is mandatory. Every business table below carries `tenant_id`, and every unique key that identifies a tenant-owned record must be unique inside a tenant scope unless explicitly marked global.
>
> For local persistence and SQLite guidance, see [ADR-009](../adr/9_indexeddb-local-persistence.md).

---

## Simplified table overview

| Table      | Purpose                                     |
| ---------- | ------------------------------------------- |
| `tenants`  | Cooperative tenant metadata                 |
| `accounts` | Authenticated operator/admin login accounts |
| `users`    | Cooperative members / wallet holders        |
| `cards`    | Backend projection of issued card state     |

> The following tables are deferred until later design iterations: `account_memberships`, `devices`, `auth_sessions`, `audit_log`, `reconciliation_batches`, `key_versions`, and optional event-history tables.

---

## `tenants`

| Column       | Type        | Constraints                  | Description                                  |
| ------------ | ----------- | ---------------------------- | -------------------------------------------- |
| `tenant_id`  | `UUID`      | PK, NOT NULL                 | Stable koperasi identifier                   |
| `slug`       | `TEXT`      | UNIQUE, NOT NULL             | Human-readable tenant slug used during login |
| `name`       | `TEXT`      | NOT NULL                     | Legal or public koperasi name                |
| `status`     | `TEXT`      | NOT NULL, default `'active'` | `active`, `suspended`, `closed`              |
| `timezone`   | `TEXT`      | NOT NULL                     | Default reporting timezone                   |
| `created_at` | `TIMESTAMP` | NOT NULL                     | Tenant creation timestamp                    |
| `updated_at` | `TIMESTAMP` | NOT NULL                     | Last modification timestamp                  |

**Notes:**

- `slug` values are never reused after tenant creation.
- `closed` tenants are immutable except for export and audit actions.

---

## `accounts`

| Column          | Type        | Constraints                        | Description                          |
| --------------- | ----------- | ---------------------------------- | ------------------------------------ |
| `account_id`    | `UUID`      | PK, NOT NULL                       | Stable human account identifier      |
| `tenant_id`     | `UUID`      | FK → `tenants.tenant_id`, NOT NULL | Owning koperasi                      |
| `username`      | `TEXT`      | UNIQUE, NOT NULL                   | Login name or email                  |
| `display_name`  | `TEXT`      | NOT NULL                           | Human-readable account name          |
| `password_hash` | `TEXT`      | NOT NULL                           | Argon2id or equivalent password hash |
| `role`          | `TEXT`      | NOT NULL, default `'operator'`     | `admin`, `operator`                  |
| `status`        | `TEXT`      | NOT NULL, default `'active'`       | `active`, `suspended`, `locked`      |
| `last_login_at` | `TIMESTAMP` |                                    | Most recent successful login         |
| `created_at`    | `TIMESTAMP` | NOT NULL                           | Account creation timestamp           |
| `updated_at`    | `TIMESTAMP` | NOT NULL                           | Last modification timestamp          |

**Notes:**

- Password reset tokens and OTP challenge state should live in a dedicated auth subsystem or short-TTL cache, not in business tables.
- `password_hash` must never be replicated to client storage.

---

## `users`

| Column       | Type        | Constraints                        | Description                                             |
| ------------ | ----------- | ---------------------------------- | ------------------------------------------------------- |
| `tenant_id`  | `UUID`      | FK → `tenants.tenant_id`, NOT NULL | Owning koperasi                                         |
| `user_id`    | `INTEGER`   | NOT NULL                           | Backend-assigned member ID; matches card `userId` field |
| `name`       | `TEXT`      | NOT NULL                           | Full member name                                        |
| `status`     | `TEXT`      | NOT NULL, default `'active'`       | `active`, `suspended`, `closed`                         |
| `created_at` | `TIMESTAMP` | NOT NULL                           | Account creation timestamp                              |
| `updated_at` | `TIMESTAMP` | NOT NULL                           | Last modification timestamp                             |

**Notes:**

- A suspended or closed user account prevents new card issuance but does not automatically block existing cards.
- `user_id` values are never reused inside the same tenant.

**Constraints:**

```sql
PRIMARY KEY (tenant_id, user_id)
```

---

## `cards`

| Column             | Type        | Constraints                        | Description                                                                           |
| ------------------ | ----------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| `tenant_id`        | `UUID`      | FK → `tenants.tenant_id`, NOT NULL | Owning koperasi                                                                       |
| `card_id`          | `BLOB(6)`   | NOT NULL                           | 6-byte card identifier set at issuance                                                |
| `user_id`          | `INTEGER`   | NOT NULL                           | Owning user                                                                           |
| `status`           | `TEXT`      | NOT NULL, default `'ACTIVE'`       | Mirrors card `status` field; see [status codes](2_card-binary-schema.md#status-codes) |
| `balance`          | `INTEGER`   | NOT NULL, default `0`              | Last known balance after reconciliation (IDR)                                         |
| `counter`          | `INTEGER`   | NOT NULL, default `0`              | Most recent reconciled `counter`; used to detect replay                               |
| `key_version`      | `INTEGER`   | NOT NULL                           | Key version written to the card at issuance or re-issuance                            |
| `created_at`       | `TIMESTAMP` | NOT NULL                           | Issuance timestamp                                                                    |
| `last_activity_at` | `TIMESTAMP` |                                    | Timestamp of most recently reconciled event                                           |
| `expires_at`       | `TIMESTAMP` | NOT NULL                           | Card expiry, mirrors trailer `expiresAt`                                              |
| `notes`            | `TEXT`      |                                    | Operator notes or block reason narrative                                              |

**Notes:**

- `balance` and `counter` reflect the **last reconciled state**, not necessarily the current card state. A card may have offline transactions not yet submitted.
- Status changes (`BLOCKED_*`, `ACTIVE`) applied by reconciliation or station operations are written here.
- `card_id` is never reused inside a tenant. Re-issued cards receive the same `card_id` with updated fields.

**Constraints:**

```sql
PRIMARY KEY (tenant_id, card_id),
FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, user_id),
CHECK (balance >= 0),
CHECK (balance <= 16000000),
CHECK (status IN ('ACTIVE','BLOCKED_TAMPER','BLOCKED_FRAUD','BLOCKED_EXPIRED','BLOCKED_ADMIN'))
```

---

## Indexes

```sql
CREATE INDEX idx_cards_tenant_user_id ON cards (tenant_id, user_id);
CREATE INDEX idx_accounts_tenant_username ON accounts (tenant_id, username);
CREATE INDEX idx_users_tenant_user_id ON users (tenant_id, user_id);
CREATE INDEX idx_tenants_slug ON tenants (slug);
```

---

## Cross-references

- Card field definitions: [Data Spec §2 Card Binary Schema](2_card-binary-schema.md)
- Multitenant and local-first storage rules: [Data Spec §5 Multitenancy, Auth & Local-first Storage](5_multitenancy-auth-local-first.md)
- Status codes and transition rules: [Tech Specs §15 Status Codes & Block Rules](../tech-specs/15_status-codes-block-rules.md)
- Reconciliation API payload: [API Spec §6 Reconciliation](../api-spec/6_reconciliation.md)
- Financial limits enforced at reconciliation: [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)

> Note: future iterations may add richer device enrollment, session management, and audit/reconciliation metadata while preserving the local-first, tenant-scoped core model.

# 4. Encoding Conventions & Versioning

This section defines the canonical encoding rules that apply to all card binary fields and backend data, plus the versioning and migration contract for the card layout schema.

> Upstream source: [Tech Specs §3 Card Storage Model - Encoding conventions](../tech-specs/3_card-storage-model.md).

---

## Binary encoding rules (card payload)

| Rule                 | Detail                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Byte order**       | Little-endian for all multi-byte integer fields (`uint16`, `uint32`, `uint64`, `uint24`)                                       |
| **Timestamps**       | UTC seconds since Unix epoch, stored as `uint32`; valid range: year 2024–2106                                                  |
| **String fields**    | UTF-8, null-padded to fill the fixed byte allocation; max 23 meaningful bytes for `name` (1 byte reserved for null terminator) |
| **Currency amounts** | Integer IDR (Indonesian Rupiah), no decimal component; stored as `uint32` for balance, `uint24` for log `amount`               |
| **Reserved fields**  | Must be written as all-zero bytes; readers must ignore reserved content rather than rejecting it                               |
| **`uint24`**         | 3-byte unsigned integer, little-endian (not a native CPU type; written/read as 3 separate bytes)                               |
| **Boolean flags**    | Single bits within flag bytes; unset bits are `0`                                                                              |

---

## JSON encoding rules (API payloads)

| Rule                      | Detail                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **`cardId`**              | Hex-encoded string of the 6-byte value, lowercase, no prefix (e.g. `"a1b2c3d4e5f6"`)                        |
| **`hash` / `chain_hash`** | Hex-encoded string of the 4-byte truncated hash, lowercase                                                  |
| **Timestamps**            | `uint32` seconds in API payloads (integer, not ISO-8601 string); backend stores as `TIMESTAMPTZ` internally |
| **Amounts**               | Integer IDR; no floating-point values anywhere in the financial pipeline                                    |
| **`sessionKey`**          | Base64-encoded 32-byte key (standard base64, with padding)                                                  |
| **`signature`**           | Base64-encoded bytes (standard base64, with padding)                                                        |

---

## Card layout schema versioning

The `version` byte in the Header block identifies the card binary layout version. This allows future layout changes without requiring all cards to be re-issued simultaneously.

| Version | Description                                | Status      |
| ------- | ------------------------------------------ | ----------- |
| `4`     | Current production layout (AES-GCM + HMAC) | **Current** |

**Rules for version upgrades:**

1. A new version may only add fields in currently reserved regions or append new blocks after the existing layout.
2. A new version must not change the offset or type of any existing field.
3. Terminals must reject cards with a `version` value they do not recognise.
4. A version bump requires a new ADR documenting the change and a migration path for existing cards.

---

## Key version lifecycle

`keyVersion` in the trailer identifies which server-side key set was used for HMAC derivation. It is a `uint8` value (1–255).

| Lifecycle event           | Effect on cards                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| New key version activated | New cards issued with the new version; existing cards remain valid until re-issued            |
| Key version retired       | No new cards; existing cards continue to operate normally                                     |
| Key version revoked       | All cards with this version are treated as untrusted; must be re-issued at next station visit |

Key material is never stored on the card or in the backend database. It is stored in an external secrets manager and accessed only by the backend service at runtime.

> See [System Design §12 Key Trust Model](../system-design/12_key-trust-model.md) and [Tech Specs §12 Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md) for derivation details.

---

## Migration rules (backend schema)

| Migration type               | Procedure                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Adding a nullable column     | Standard `ALTER TABLE ADD COLUMN`; no downtime required                                        |
| Adding a non-nullable column | Add as nullable, backfill, then add NOT NULL constraint in a separate step                     |
| Renaming a column            | Add new column, dual-write, migrate reads, drop old column (blue/green or behind feature flag) |
| Changing a column type       | Never in place; always add new column, migrate, drop old                                       |
| Dropping a column            | Only after all application code referencing it has been deployed and verified absent           |

**Invariants:**

- `audit_log` is **append-only**. No migration may UPDATE or DELETE existing audit log rows.
- `cards.card_id` and `users.user_id` are **immutable primary keys**. They must never be changed or reused.

---

## Chain hash formula (reference)

For each log entry `n`:

```
hash[n] = SHA-256(timestamp_n || amount_n || balanceAfter_n || flags_n || hash[n-1])[0..3]
```

The hash input is a 16-byte buffer:

- bytes 0-3: `timestamp` (uint32, little-endian)
- bytes 4-6: `amount` (uint24, little-endian)
- bytes 7-10: `balanceAfter` (uint32, little-endian)
- byte 11: `flags` (uint8)
- bytes 12-15: `prevHash` (4 bytes)

Initialisation for the first entry:

```
hash[0]_prev = Uint8Array(4)  (4 zero bytes)
```

> Full chain integrity rules: [Tech Specs §14 Transaction Log Format](../tech-specs/14_transaction-log-format.md).

# 3. Card Storage Model

## Zones

- **Active Buffer**: Primary state storage. Identified by `activePtr` in the trailer.
- **Shadow Buffer**: Secondary state for atomic A/B writes. Becomes the new active buffer after a successful write and pointer flip.
- **Trailer / Meta**: Metadata, HMAC, and active buffer pointer. Occupies the last 64 bytes of the usable NFC memory.

Target size: **496 bytes** on NTAG215.

For NTAG215, each active or shadow buffer must fit inside **216 bytes**, with the trailer occupying the remaining **64 bytes**.

## Wire format

For NFC writes, a compact **wire format** of 280 bytes is used: `[activeBuffer (216 B)] + [trailer (64 B)]`. Only the active buffer and trailer are transmitted; the inactive shadow buffer is not written.

## Encoding conventions

- All multi-byte integer fields are **little-endian** unless noted otherwise.
- Timestamps are **UTC seconds** stored as `uint32` (seconds since Unix epoch).
- String fields (`name`) are **UTF-8**, null-padded to fill the fixed allocation.
- The `userId` field is stored as **8 bytes of raw ASCII** (alphanumeric characters).
- `balance` and `lastBalance` are stored in the smallest currency unit (e.g., integer Rupiah, no decimals).
- Reserved fields must be zeroed on write and ignored on read.

## Payload fields

The active and shadow buffers each have a fixed size of **216 bytes** on NTAG215. The trailer/meta block is separate and occupies **64 bytes**.

### Header Block (16 bytes)

| Field        | Size | Type   | Description                                                                                                                                                                 |
| ------------ | ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `magic`      | 4 B  | uint32 | Fixed 4-byte magic value `0x4B4F5057` ("KOPW") for payload identification                                                                                                   |
| `version`    | 1 B  | uint8  | Card layout schema version (current: `4`)                                                                                                                                   |
| `type`       | 1 B  | uint8  | Payload type or product class identifier (current: `0x01` cooperative wallet)                                                                                               |
| `cardId`     | 6 B  | bytes  | Unique card identifier, set at issuance                                                                                                                                     |
| `tenantBind` | 4 B  | uint32 | FNV-32a hash of tenant ID. `0` = unbound legacy card. Enables multi-tenant scoping without storing the full tenant string on-card. Preserves 4-byte alignment of the block. |

### Identity Block (48 bytes)

| Field       | Size | Type   | Description                                                                                                                                                |
| ----------- | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`      | 24 B | UTF-8  | Cardholder display name, null-padded (max 23 meaningful bytes)                                                                                             |
| `userId`    | 8 B  | ASCII  | 8-character alphanumeric user identifier (e.g. "GJWt7u3g"); backend join key                                                                               |
| `gender`    | 1 B  | uint8  | Gender code: `0` = unspecified, `1` = male, `2` = female (application-defined)                                                                             |
| `status`    | 1 B  | uint8  | Card status code (see [§15](15_status-codes-block-rules.md))                                                                                               |
| `reserved`  | 2 B  | -      | Padding. Must be zeroed on write; ignored on read.                                                                                                         |
| `createdAt` | 4 B  | uint32 | Card issuance timestamp (UTC seconds)                                                                                                                      |
| `reserved`  | 8 B  | -      | Reserved for future fields (e.g. nationality code, extended user metadata). Must be zeroed on write; ignored on read. Pads the Identity Block to 48 bytes. |

### Wallet + Runtime Block (24 bytes)

| Field           | Size | Type   | Description                                                             |
| --------------- | ---- | ------ | ----------------------------------------------------------------------- |
| `balance`       | 4 B  | uint24 | Current balance in smallest currency unit (3B value + 1B padding) |
| `lastBalance`   | 4 B  | uint24 | Balance before the most recent transaction; used for rollback detection (3B value + 1B padding) |
| `counter`       | 8 B  | uint64 | Monotonically increasing write counter; never decremented               |
| `lastTimestamp` | 4 B  | uint32 | Timestamp of the most recent write (UTC seconds)                        |
| `state`         | 1 B  | uint8  | Card lifecycle state (see [§6](6_state-machine-session-rules.md))       |
| `flags`         | 1 B  | uint8  | Feature and operational flags (see below)                               |
| `reserved`      | 2 B  | -      | Padding to 24 bytes. Must be zeroed on write; ignored on read.          |

#### Flags (1 byte)

| Bits | Name               | Description                                                   |
| ---- | ------------------ | ------------------------------------------------------------- |
| 0    | `offlineSession`   | `1` = most recent write occurred while terminal was offline   |
| 1    | `pendingReconcile` | `1` = one or more log entries not yet reconciled with backend |
| 7:2  | reserved           | Must be zeroed on write; ignored on read                      |

### Session Block (16 bytes)

| Field        | Size | Type   | Description                                                                                                                                                                              |
| ------------ | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startTime`  | 4 B  | uint32 | Session open timestamp (UTC seconds)                                                                                                                                                     |
| `endTime`    | 4 B  | uint32 | Session close timestamp; zero if session is open                                                                                                                                         |
| `terminalId` | 4 B  | uint32 | Identifier of the terminal that opened the session                                                                                                                                       |
| `reserved`   | 4 B  | -      | Pads the Session Block to 16 bytes for alignment. Reserved for future session fields (e.g. gateId that performed check-in, session type flag). Must be zeroed on write; ignored on read. |

### Logs (80 bytes - 5 entries × 16 bytes each)

See [§14](14_transaction-log-format.md) for full log entry definition and chain integrity rules.

| Field          | Size | Type   | Description                                  |
| -------------- | ---- | ------ | -------------------------------------------- |
| `timestamp`    | 4 B  | uint32 | Absolute Unix timestamp (UTC seconds)        |
| `amount`       | 3 B  | uint24 | Transaction amount in smallest currency unit |
| `balanceAfter` | 4 B  | uint24 | Balance after this transaction (3B value + 1B padding)  |
| `flags`        | 1 B  | uint8  | Transaction type and operational flags       |
| `hash`         | 4 B  | bytes  | Truncated SHA-256 chain hash                 |

Capacity: **5 entries** on NTAG215 (stored as a ring buffer). An all-zero `hash` field serves as the empty-slot sentinel.

### Trailer / Meta (64 bytes)

Offsets are relative to the trailer start.

| Field         | Offset | Size | Type   | Description                                                                      |
| ------------- | ------ | ---- | ------ | -------------------------------------------------------------------------------- |
| `expiresAt`   | 0      | 4 B  | uint32 | Card expiry timestamp (UTC seconds)                                              |
| `keyVersion`  | 4      | 1 B  | uint8  | Version of the key set used to encrypt and authenticate this card                |
| `reserved`    | 5      | 3 B  | -      | Reserved; zero on write                                                          |
| `rootHash`    | 8      | 6 B  | bytes  | Truncated SHA-256 over the full log chain; anchors log sequence to current state |
| `reserved`    | 14     | 2 B  | -      | Reserved; zero on write                                                          |
| `counterBind` | 16     | 4 B  | uint32 | Lower 32 bits of `counter` included in HMAC input for replay resistance          |
| `HMAC`        | 20     | 8 B  | bytes  | Truncated HMAC-SHA256 over payload and trailer fields                            |
| `activePtr`   | 28     | 1 B  | uint8  | `0` = buffer A is active; `1` = buffer B is active                               |
| `padding`     | 29     | 35 B | -      | Zero-padded to fill 64 bytes                                                     |

## Size summary

| Region                          | Size      |
| ------------------------------- | --------- |
| Header                          | 16 B      |
| Identity                        | 48 B      |
| Wallet + Runtime                | 24 B      |
| Session                         | 16 B      |
| Logs                            | 80 B      |
| Unused buffer space             | 32 B      |
| **Buffer total**                | **216 B** |
| Trailer / Meta                  | 64 B      |
| **Total (2× buffer + trailer)** | **496 B** |

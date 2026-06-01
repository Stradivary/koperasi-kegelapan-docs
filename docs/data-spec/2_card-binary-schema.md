# 2. Card Binary Schema

The NFC card payload is a 496-byte binary structure stored on an NTAG215 chip. It is divided into three physical regions: **Buffer A**, **Buffer B** (A/B shadow pair), and a shared **Trailer / Meta** block.

> Upstream sources: [System Design §5 Data Layout](../system-design/5_data-layout.md), [Tech Specs §3 Card Storage Model](../tech-specs/3_card-storage-model.md).

---

## Memory map

| Region         | Byte range | Size  | Description                                             |
| -------------- | ---------- | ----- | ------------------------------------------------------- |
| Buffer A       | 0–215      | 216 B | Active or shadow card state (determined by `activePtr`) |
| Buffer B       | 216–431    | 216 B | Active or shadow card state (the other buffer)          |
| Trailer / Meta | 432–495    | 64 B  | Cryptographic anchors, key version, buffer pointer      |

`activePtr = 0` means Buffer A is the current authoritative state. `activePtr = 1` means Buffer B is current.

### Wire format (compact)

For NFC writes, a compact **wire format** of 280 bytes is used: `[activeBuffer (216 B)] + [trailer (64 B)]`. This avoids writing the inactive shadow buffer and fits comfortably within NTAG215 constraints.

---

## Buffer layout (216 bytes per buffer)

Each buffer contains the following blocks in fixed order:

| Block            | Offset | Size | Description                                         |
| ---------------- | ------ | ---- | --------------------------------------------------- |
| Header           | 0      | 16 B | Magic bytes, schema version, card ID, tenant bind   |
| Identity         | 16     | 48 B | Cardholder name, user ID, gender, status, createdAt |
| Wallet + Runtime | 64     | 24 B | Balance, counter, session state                     |
| Session          | 88     | 16 B | Session open/close timestamps, terminal ID          |
| Log region       | 104    | 80 B | Ring buffer of 5 transaction log entries × 16 B     |
| Unused           | 184    | 32 B | Remaining buffer space (zeroed)                     |

### Header Block (16 bytes)

| Field        | Offset | Size | Type   | Description                            | Constraints                                               |
| ------------ | ------ | ---- | ------ | -------------------------------------- | --------------------------------------------------------- |
| `magic`      | 0      | 4 B  | uint32 | Fixed payload identifier               | Must equal `0x4B4F5057` ("KOPW"); reject card if mismatch |
| `version`    | 4      | 1 B  | uint8  | Card layout schema version             | Current: `4`; reject if unsupported version               |
| `type`       | 5      | 1 B  | uint8  | Payload product class                  | Current: `0x01` (cooperative wallet)                      |
| `cardId`     | 6      | 6 B  | bytes  | Unique card identifier set at issuance | Immutable after issuance; used as backend join key        |
| `tenantBind` | 12     | 4 B  | uint32 | FNV-32a hash of tenant ID              | `0` = unbound legacy card; used for multi-tenant scoping  |

### Identity Block (48 bytes)

| Field       | Offset | Size | Type   | Description                                              | Constraints                                      |
| ----------- | ------ | ---- | ------ | -------------------------------------------------------- | ------------------------------------------------ |
| `name`      | 16     | 24 B | UTF-8  | Cardholder display name, null-padded                     | Max 23 meaningful bytes + null terminator        |
| `userId`    | 40     | 8 B  | ASCII  | Alphanumeric user ID (e.g. "GJWt7u3g")                   | 8-char ID; set at issuance; backend join key     |
| `gender`    | 48     | 1 B  | uint8  | Gender code: `0` = unspecified, `1` = male, `2` = female | Application-defined; not used in financial logic |
| `status`    | 49     | 1 B  | uint8  | Card health status code                                  | See [status codes table](#status-codes) below    |
| `reserved`  | 50     | 2 B  | -      | Padding                                                  | Must be zeroed on write; ignored on read         |
| `createdAt` | 52     | 4 B  | uint32 | Issuance timestamp (UTC seconds)                         | Immutable after issuance                         |
| `reserved`  | 56     | 8 B  | -      | Reserved                                                 | Must be zeroed on write; ignored on read         |

#### Status codes

| Value | Name              | Description                              |
| ----- | ----------------- | ---------------------------------------- |
| `0`   | `ACTIVE`          | Normal operation                         |
| `1`   | `BLOCKED_TAMPER`  | Cryptographic or chain integrity failure |
| `2`   | `BLOCKED_FRAUD`   | Suspicious behaviour detected            |
| `3`   | `BLOCKED_EXPIRED` | Card past its `expiresAt` date           |
| `4`   | `BLOCKED_ADMIN`   | Manually decommissioned by operator      |

> Full transition rules: [Tech Specs §15 Status Codes & Block Rules](../tech-specs/15_status-codes-block-rules.md).

### Wallet + Runtime Block (24 bytes)

| Field           | Offset | Size | Type   | Description                                             | Constraints                                                       |
| --------------- | ------ | ---- | ------ | ------------------------------------------------------- | ----------------------------------------------------------------- |
| `balance`       | 64     | 4 B  | uint32 | Current balance in smallest currency unit (integer IDR) | Max `4,000,000,000`; effective ceiling is Rp 16,000,000 by policy |
| `lastBalance`   | 68     | 4 B  | uint32 | Balance before most recent transaction                  | Used for rollback detection; must equal previous `balance`        |
| `counter`       | 72     | 8 B  | uint64 | Monotonically increasing write counter                  | Never decremented; starts at `0` at issuance; anti-replay key     |
| `lastTimestamp` | 80     | 4 B  | uint32 | Timestamp of most recent write (UTC seconds)            | Must not be earlier than previous `lastTimestamp`                 |
| `state`         | 84     | 1 B  | uint8  | Card lifecycle / session state                          | See [session state codes](#session-state-codes) below             |
| `flags`         | 85     | 1 B  | uint8  | Feature and operational flags                           | See [flags layout](#flags-layout) below                           |
| `reserved`      | 86     | 2 B  | -      | Padding to 24 bytes                                     | Must be zeroed on write; ignored on read                          |

#### Session state codes

| Value | Name                | Description                                 |
| ----- | ------------------- | ------------------------------------------- |
| `0`   | `IDLE`              | No active session; card is at rest          |
| `1`   | `CHECKED_IN`        | Active session opened by a gate check-in    |
| `2`   | `STATION_OPERATION` | Mid-session operation at a station terminal |
| `3`   | `CHECKED_OUT`       | Session closed by a gate check-out          |

> Full state machine and transition rules: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md), [Tech Specs §6 State Machine & Session Rules](../tech-specs/6_state-machine-session-rules.md).

#### Flags layout

> The 1-byte flags field is defined as follows.

| Bits | Name               | Description                                                   |
| ---- | ------------------ | ------------------------------------------------------------- |
| 0    | `offlineSession`   | `1` = most recent write occurred while terminal was offline   |
| 1    | `pendingReconcile` | `1` = one or more log entries not yet reconciled with backend |
| 7:2  | reserved           | Must be zeroed on write; ignored on read                      |

### Session Block (16 bytes)

| Field        | Offset | Size | Type   | Description                            | Constraints                                              |
| ------------ | ------ | ---- | ------ | -------------------------------------- | -------------------------------------------------------- |
| `startTime`  | 88     | 4 B  | uint32 | Session open timestamp (UTC seconds)   | Set on `CHECKED_IN`; used as chain initialisation anchor |
| `endTime`    | 92     | 4 B  | uint32 | Session close timestamp (UTC seconds)  | Zero while session is open; set on `CHECKED_OUT`         |
| `terminalId` | 96     | 4 B  | uint32 | ID of terminal that opened the session | Backend-assigned terminal identifier                     |
| `reserved`   | 100    | 4 B  | -      | Reserved                               | Must be zeroed on write; ignored on read                 |

### Log Region (80 bytes - 5 entries × 16 bytes)

Fixed-capacity ring buffer. When full, the oldest entry is overwritten. Current write position is tracked implicitly via `rootHash` in the trailer.

> Full log entry definition, chain formula, and integrity rules: [Tech Specs §14 Transaction Log Format](../tech-specs/14_transaction-log-format.md).

**Log entry (16 bytes):**

| Field          | Offset (within entry) | Size | Type   | Description                           | Constraints                                                                      |
| -------------- | --------------------- | ---- | ------ | ------------------------------------- | -------------------------------------------------------------------------------- |
| `timestamp`    | 0                     | 4 B  | uint32 | Absolute Unix timestamp (UTC seconds) | Transaction time                                                                 |
| `amount`       | 4                     | 3 B  | uint24 | Transaction amount (integer IDR)      | `0` for state-only transitions (check-in/out)                                    |
| `balanceAfter` | 7                     | 4 B  | uint32 | Balance after this transaction        | Must be consistent with prior `balance` and `amount`                             |
| `flags`        | 11                    | 1 B  | uint8  | Transaction type + flags              | See [log flags table](#log-flags) below                                          |
| `hash`         | 12                    | 4 B  | bytes  | Truncated SHA-256 chain hash          | `SHA256(timestamp \|\| amount \|\| balanceAfter \|\| flags \|\| prevHash)[0..3]` |

#### Log flags

> The `flags` field packs transaction type and status flags into a single byte.

| Bits | Name          | Values                                                                         |
| ---- | ------------- | ------------------------------------------------------------------------------ |
| 3:0  | `txType`      | `0x0` debit, `0x1` credit/top-up, `0x2` check-in, `0x3` check-out, `0x4` admin |
| 4    | `offlineFlag` | `1` = offline transaction                                                      |
| 5    | `suspectFlag` | `1` = terminal flagged as suspicious                                           |
| 7:6  | reserved      | Must be zero on write                                                          |

#### Sentinel detection

An all-zero `hash` field (4 bytes of `0x00`) indicates an empty log slot. The decoder stops reading entries when it encounters this sentinel.

---

## Trailer / Meta (64 bytes, offset 432)

The trailer is written **last** in every update cycle. It cryptographically binds the active buffer and is the only block read to determine which buffer is authoritative.

Offsets below are **relative to the trailer start** (absolute offset 432 in full format, or 216 in wire format).

| Field         | Offset | Size | Type   | Description                                            | Constraints                                                                           |
| ------------- | ------ | ---- | ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `expiresAt`   | 0      | 4 B  | uint32 | Card expiry timestamp (UTC seconds)                    | Card is `BLOCKED_EXPIRED` if current time > `expiresAt`                               |
| `keyVersion`  | 4      | 1 B  | uint8  | Key set version used to encrypt/authenticate this card | Determines which master key is used for HMAC derivation                               |
| `reserved`    | 5      | 3 B  | -      | Reserved                                               | Must be zeroed on write                                                               |
| `rootHash`    | 8      | 6 B  | bytes  | Truncated SHA-256 of the most recent log entry hash    | Chain head; ties log sequence to trailer HMAC                                         |
| `reserved`    | 14     | 2 B  | -      | Reserved                                               | Must be zeroed on write                                                               |
| `counterBind` | 16     | 4 B  | uint32 | Lower 32 bits of `counter` included in HMAC input      | Anti-replay binding in the HMAC                                                       |
| `HMAC`        | 20     | 8 B  | bytes  | Truncated HMAC-SHA256 over payload and trailer fields  | Covers: active buffer bytes + `expiresAt` + `keyVersion` + `rootHash` + `counterBind` |
| `activePtr`   | 28     | 1 B  | uint8  | Active buffer pointer: `0` = Buffer A, `1` = Buffer B  | Flipped only after new buffer is fully written and verified                           |
| `padding`     | 29     | 35 B | -      | Zero-padding to fill 64 bytes                          | Must be zeroed on write                                                               |

---

## Size summary

| Region         | Size      |
| -------------- | --------- |
| Buffer A       | 216 B     |
| Buffer B       | 216 B     |
| Trailer / Meta | 64 B      |
| **Total**      | **496 B** |

> This fits within the 504-byte usable user memory of an NTAG215 (126 pages × 4 bytes after lock and configuration bytes), leaving 8 bytes reserved beyond the 496-byte payload.

### Wire format summary

| Region         | Size      |
| -------------- | --------- |
| Active buffer  | 216 B     |
| Trailer / Meta | 64 B      |
| **Total**      | **280 B** |

> The wire format is used for all NFC writes. Only the active buffer and trailer are transmitted; the inactive shadow buffer is not written.

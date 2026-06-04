# 5. Data Layout

## Zones

The card payload is divided into three physical zones, each with a distinct role:

| Zone                        | Size (NTAG215) | Purpose                                                                                                                                                              |
| --------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zone A - Active Buffer**  | 216 bytes      | The currently authoritative copy of card state. All reads use this zone. Identified by `activePtr` in the trailer.                                                   |
| **Zone B - Shadow Buffer**  | 216 bytes      | A mirror of Zone A used as the write target during an update. Becomes the new active zone after a write is fully verified. Never read directly by application logic. |
| **Zone C - Trailer / Meta** | 64 bytes       | Cryptographic anchors and metadata that bind Zones A and B. Contains the HMAC, `rootHash`, `activePtr`, and `keyVersion`. Always written last.                       |

**Why three zones?** NFC writes are not atomic - a tap interruption mid-write can leave partial state. Zones A and B implement an A/B buffer pattern: Zone A is never touched until Zone B has been fully written and verified. Zone C's `activePtr` is flipped only after verification succeeds. This guarantees the card always has exactly one known-good state. See [§9 Write Strategy](9_write-strategy.md).

## Wire format

For NFC writes, a compact **wire format** of 280 bytes is used: `[activeBuffer (216 B)] + [trailer (64 B)]`. This avoids transmitting the inactive shadow buffer and reduces write time.

## Core payload structure

### Header Block (16 bytes)

Identifies the card and binds it to a tenant. Fields: `magic`, `version`, `type`, `cardId`, `tenantBind`.

- `magic` is `0x4B4F5057` ("KOPW") - a fixed sentinel used to reject non-wallet cards or corrupted reads.
- `version` is the schema version (currently `4`). Terminals must reject cards with unsupported versions.
- `tenantBind` is the FNV-32a hash of the tenant ID. A value of `0` indicates an unbound legacy card. This enables multi-tenant scoping without storing the full tenant string on-card.

### Identity Block (48 bytes)

Holds the cardholder's static identity and the card's current health status. Fields: `name` (24 B), `userId` (8 B ASCII), `gender`, `status`, `createdAt`.

- `name` is a null-padded UTF-8 string (max 23 meaningful bytes).
- `userId` is an 8-character alphanumeric identifier (e.g. "GJWt7u3g"), stored as raw ASCII bytes. This is the backend join key for the user account.
- `status` is the card health code (ACTIVE, BLOCKED\_\*, etc. - see [§11](11_card-status-enforcement.md)). It is stored in the identity block because it must be readable even when the wallet state is otherwise invalid.

### Wallet + Runtime Block (24 bytes)

Holds the live financial state and write-ordering fields. Fields: `balance`, `lastBalance`, `counter` (monotonic uint64), `lastTimestamp`, `state`, `flags`.

- `counter` is a `uint64` that increments on every write and is never decremented. It is the primary anti-replay control.
- `lastBalance` and `lastTimestamp` are the balance and timestamp from the previous write, allowing the terminal to detect inconsistency without reading the full log chain.
- `state` is the session lifecycle position (IDLE, CHECKED_IN, STATION_OPERATION, CHECKED_OUT - see [§4](4_card-state-machine.md)).
- `flags` is a single byte with bit flags for `offlineSession` and `pendingReconcile`.

### Session Block (16 bytes)

Bounds the current session window. Fields: `startTime`, `endTime`, `terminalId`.

- `startTime` is set when the gate checks in. It is used as the anchor for the log chain hash (first entry's `prevHash` is derived from `startTime`).
- `endTime` is zero while the session is open and set to the checkout timestamp when the gate checks out.
- `terminalId` is a uint32 recording which terminal opened the session, for audit purposes.

### Log Region (80 bytes - 5 entries × 16 bytes)

Fixed-capacity ring buffer of transaction log entries. Each entry records a value change and a chain hash linking it to the previous entry. Capacity is 5 entries, bounded by available card storage.

Each log entry uses absolute timestamps (uint32 Unix seconds) rather than relative deltas, and a 4-byte truncated SHA-256 chain hash. An all-zero hash field serves as the empty-slot sentinel.

### Trailer / Meta (64 bytes)

Holds verification anchors and key material references. Fields: `expiresAt`, `keyVersion`, `rootHash`, `counterBind`, `HMAC`, `activePtr`.

- `rootHash` is a 6-byte field storing the hash of the most recent log entry (padded from the 4-byte chain hash). It ties the entire log sequence to the HMAC-protected trailer.
- `counterBind` stores the lower 32 bits of the monotonic counter, binding the HMAC to the current write generation.
- `activePtr` selects which zone (A or B) is the authoritative buffer for this read.
- `HMAC` is 8 bytes — a truncated HMAC-SHA256 over the encrypted buffer + trailer anchor fields.
- The trailer uses relative offsets with reserved/padding regions between fields for alignment and future extensibility.

> Exact field sizes, types, and byte offsets: [Data Spec §2 Card Binary Schema](../data-spec/2_card-binary-schema.md).

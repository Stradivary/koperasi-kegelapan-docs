# 14. Transaction Log Format

## Log entry definition (16 bytes)

| Field          | Size | Type   | Description                                                         |
| -------------- | ---- | ------ | ------------------------------------------------------------------- |
| `timestamp`    | 4 B  | uint32 | Absolute Unix timestamp (UTC seconds) of the transaction            |
| `amount`       | 3 B  | uint24 | Transaction amount in smallest currency unit; unsigned              |
| `balanceAfter` | 4 B  | uint32 | Balance after this transaction; used for consistency checks         |
| `flags`        | 1 B  | uint8  | Transaction type and operational flags (see below)                  |
| `hash`         | 4 B  | bytes  | Truncated SHA-256 chain hash linking this entry to the previous one |

**Total per entry: 16 bytes. Capacity on NTAG215: 5 entries (80 bytes).**

## `flags` field (1 byte)

| Bits | Name          | Values / Meaning                                                                         |
| ---- | ------------- | ---------------------------------------------------------------------------------------- |
| 3:0  | `txType`      | `0x0` = debit, `0x1` = credit/top-up, `0x2` = check-in, `0x3` = check-out, `0x4` = admin |
| 4    | `offlineFlag` | `1` = transaction was processed offline without backend confirmation                     |
| 5    | `suspectFlag` | `1` = terminal flagged this transaction as potentially suspicious                        |
| 7:6  | reserved      | Must be zero on write; ignored on read                                                   |

## Ring buffer

- Logs are stored in a fixed-size ring buffer of 5 slots.
- When the buffer is full, the oldest entry is overwritten.
- The current write position is tracked implicitly by the `rootHash` trailer field (which always equals the hash of the most recent entry).
- On readback, the terminal reconstructs the chain from the anchor and validates each entry in order.
- An all-zero `hash` field (4 bytes of `0x00`) indicates an empty log slot (sentinel). The decoder stops reading entries when it encounters this sentinel.

## Chain initialization and integrity

- The first entry in a chain uses **4 zero bytes** (`Uint8Array(4)`) as the initial `prevHash`.
- Each subsequent entry: `hash[n] = SHA256(timestamp || amount || balanceAfter || flags || hash[n-1])[0..3]`
- The hash input is a 16-byte buffer:
  - bytes 0-3: `timestamp` (uint32, little-endian)
  - bytes 4-6: `amount` (uint24, little-endian)
  - bytes 7-10: `balanceAfter` (uint32, little-endian)
  - byte 11: `flags` (uint8)
  - bytes 12-15: `prevHash` (4 bytes)
- `rootHash` in the trailer stores the hash of the most recent log entry (4 bytes, zero-padded to 6 bytes).
- After a ring buffer wrap, the chain continues from the surviving entries. The overwritten entries are no longer verifiable, but each surviving entry's chain is intact from its predecessor.

## Integrity guarantees

- Any modification to a log entry invalidates its hash and all subsequent hashes.
- The `rootHash` trailer field ties the chain head to the overall card authentication (HMAC).
- A chain break is a hard tamper condition (see [§5](5_tamper-detection-validation.md)).

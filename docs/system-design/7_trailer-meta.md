# 7. Trailer / Meta

The trailer is a 64-byte block stored after the two payload buffers. It stores verification anchors and metadata that bind the card's state to its cryptographic proofs.

## Fields and purpose

| Field         | Offset | Size    | Purpose                                                                                          |
| ------------- | ------ | ------- | ------------------------------------------------------------------------------------------------ |
| `expiresAt`   | 0      | 4 bytes | Bounds the card payload lifetime; the card is rejected for new operations after this timestamp   |
| `keyVersion`  | 4      | 1 byte  | Identifies the key set used to derive card keys; enables key rotation without re-issuance        |
| `reserved_1`  | 5      | 3 bytes | Padding for alignment and future use                                                             |
| `rootHash`    | 8      | 6 bytes | The chain head of the transaction log (last entry's 4-byte hash, zero-padded to 6); anchors the entire log sequence |
| `reserved_2`  | 14     | 2 bytes | Padding for alignment                                                                            |
| `counterBind` | 16     | 4 bytes | Lower 32 bits of the wallet's monotonic counter; binds the HMAC to the current write generation  |
| `HMAC`        | 20     | 8 bytes | Truncated HMAC-SHA256 authentication tag; verified on every read                                 |
| `activePtr`   | 28     | 1 byte  | Selects which of the two payload buffers (A=0, B=1) is currently authoritative                   |

## Integrity model

The HMAC computation covers: `[encrypted buffer (216 bytes)] + [expiresAt (4B) + keyVersion (1B) + rootHash (6B) + counterBind (4B)]`. This is a total of 231 bytes of input.

Any modification to a trailer field — including `counterBind` or `keyVersion` — or to any byte of the encrypted buffer, invalidates the HMAC and is treated as a tamper event. The `activePtr` field is NOT included in the HMAC input (it is written last during the buffer flip and determines which buffer to validate).

> Exact field sizes and byte offsets: [Tech Specs §3 Card Storage Model](../tech-specs/3_card-storage-model.md).

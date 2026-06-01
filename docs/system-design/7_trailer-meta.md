# 7. Trailer / Meta

The trailer stores verification anchors and metadata that bind the card's state to its cryptographic proofs.

## Fields and purpose

| Field         | Purpose                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `expiresAt`   | Bounds the card payload lifetime; the card is rejected for new operations after this timestamp   |
| `keyVersion`  | Identifies the key set used to derive card keys; enables key rotation without re-issuance        |
| `rootHash`    | The chain head of the transaction log; anchors the entire log sequence                           |
| `counterBind` | Binds the monotonic write counter into trailer integrity, preventing counter rollback attacks    |
| `activePtr`   | Selects which of the two payload buffers (A or B) is currently authoritative                     |
| `HMAC`        | Authentication tag covering all trailer fields and the encrypted payload; verified on every read |

## Integrity model

All trailer fields are included in the HMAC computation. Any modification to a trailer field - including `activePtr` or `keyVersion` - invalidates the HMAC and is treated as a tamper event.

> Exact field sizes and byte offsets: [Tech Specs §3 Card Storage Model](../tech-specs/3_card-storage-model.md).

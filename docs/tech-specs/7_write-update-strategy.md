# 7. Write & Update Strategy

## A/B buffer pattern

1. Determine the currently inactive buffer using `activePtr` from the trailer (`0` → buffer B is inactive; `1` → buffer A is inactive).
2. Construct the updated payload in memory (do not touch the card yet).
3. Increment the write `counter` and set `lastTimestamp`.
4. Derive the encryption key and nonce from the session key and new counter value.
5. Encrypt the payload with AES-256-GCM.
6. Compute the HMAC over the encrypted payload and updated trailer fields.
7. Write the encrypted payload to the **inactive buffer** on the card.
8. Read back the written bytes and verify they match the expected ciphertext.
9. Verify HMAC of the written data.
10. Only after verification passes: flip `activePtr` in the trailer to point to the newly written buffer.
11. Queue a reconciliation event with the transaction details.

## Benefits

- **Atomic commits**: the active buffer is only swapped after the new buffer is fully verified.
- **Crash recovery**: a power loss or tap interruption during steps 7–9 leaves the old active buffer intact.
- **Corruption isolation**: a bad write to the inactive buffer never corrupts the readable state.

## Failure recovery

| Failure point                | Recovery action                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Write fails during step 7    | Retry write to inactive buffer; old active buffer remains valid               |
| Readback mismatch (step 8)   | Retry up to one time; if still mismatched, abort and do not flip pointer      |
| HMAC mismatch after readback | Treat as write failure; do not flip pointer; log event                        |
| `activePtr` flip fails       | Retry flip; if it fails, the card is in an ambiguous state - log and escalate |
| Card removed mid-write       | On next tap, old active buffer is still valid; inactive buffer may be partial |

## Safety rules

- Never flip `activePtr` until readback and HMAC verification both pass.
- Preserve the previous active buffer contents until the new buffer is fully validated.
- If a partial write is detected on the inactive buffer at session start, log it but do not treat it as tamper unless the active buffer fails validation.
- Do not increment the counter until the write is known to have succeeded.

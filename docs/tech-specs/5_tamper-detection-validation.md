# 5. Tamper Detection & Validation

## Validation sequence

Run checks in this order on every card read. The actual implementation in `readAndValidateCard` and `validateCard` (`pipelineEngine.ts`) follows this sequence:

0. **Uninitialised card pre-check** — if the `magic` field is all `0x00` or all `0xFF`, treat the card as uninitialised (not tampered) and halt. Display "Unactivated card" to the user. Do not proceed to step 1. See [System Design §18](../system-design/18_card-initialisation-state.md).
1. **Schema version check** — reject if `version < 4` ("Schema version mismatch") or `version > 4` ("Unrecognized schema version"). Not treated as tamper.
2. **Key version check** — reject if card's `keyVersion` does not match the session grant's `keyVersion` ("Key version mismatch: card=X, grant=Y"). Not treated as tamper.
3. **AES-GCM decryption** (v2+ only) — decrypt card body using session key, card ID, and counter-bind from trailer. If decryption fails (GCM auth tag invalid), the payload decode will throw and result in `tamper: true`.
4. **Payload decode** — decode binary wire format into structured `CardPayload`. Failure here with "Payload decode failed" sets `tamper: true`.
5. **HMAC verification** — recompute HMAC over the encrypted active buffer + trailer anchor fields (`expiresAt`, `keyVersion`, `rootHash`, `counterBind`). If mismatch: `tamper: true`, reason: "HMAC verification failed".
6. **Counter-bind check** — verify `lower32(wallet.counter) == trailer.counterBind`. If mismatch: `tamper: true`, reason: "Counter bind mismatch".
7. **Tenant-bind check** — verify `FNV-32a(sessionGrant.tenantId) == header.tenantBind`. If mismatch: `tamper: false`, reason: "Kartu anda tidak terdaftar" (card not registered in this tenant).
8. **Chain hash validation** — walk log entries, recompute each hash from zero-anchor, verify each matches stored hash. If mismatch: `tamper: true`, reason: "Chain hash invalid".

## Failure conditions

Mark a card as tampered (`tamper: true` in return value) when any of the following are true:

- HMAC mismatch ("HMAC verification failed")
- AES-GCM decryption/decode failure ("Payload decode failed")
- Counter-bind mismatch ("Counter bind mismatch")
- Log chain hash mismatch at any position ("Chain hash invalid")

The following are **non-tamper rejections** (`tamper: false` or undefined):

- Schema version below 4 or above 4
- Key version mismatch between card and session grant
- Tenant-bind mismatch (card from different koperasi)
- Session grant expired
- Card status blocked

## Response to tamper detection

- **Do not write to the card.**
- Set the card status to `BLOCKED_TAMPER` (code `1`) on the next successful authenticated write if the card is still operable.
- Log the event with tamper type, `cardId`, `counter`, and `terminalId` for backend reconciliation.
- Display a generic blocked message to the user; do not expose cryptographic details.
- If the card cannot be written (e.g., read fails completely), report the event to the backend immediately.

## Log chain

- Each log entry includes a 4-byte truncated hash field.
- `hash[n] = SHA256(timestamp || amount || balanceAfter || flags || hash[n-1])[0..3]`
- The chain is anchored with **4 zero bytes** as the initial `prevHash`: `hash[0]` uses `Uint8Array(4)` (all zeros) as the previous hash input.
- Each subsequent entry uses the previous entry's 4-byte hash as input.
- The trailer `rootHash` stores the hash of the most recent log entry (the chain head), zero-padded to 6 bytes.
- An all-zero hash field serves as the empty-slot sentinel during decoding.

## Validation guarantees

- Any single-bit modification to a log entry invalidates the chain from that point forward.
- `rootHash` in the trailer ties the entire log sequence to current card state.
- Trailer HMAC binds the root hash, counter, active pointer, and metadata, preventing selective replay of a valid historical trailer with a modified payload.

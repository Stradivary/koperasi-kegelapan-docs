# 10. Verification Rules

Every card read must re-verify the entire card state from scratch. No cached assumption about a previously valid read may be carried forward.

## Tamper conditions

A card is treated as tampered (`tamper: true`) if any of the following fail:

- **HMAC integrity** — the truncated 8-byte HMAC-SHA256 over the encrypted buffer + trailer anchor fields does not match (`"HMAC verification failed"`)
- **Counter-bind consistency** — the lower 32 bits of `wallet.counter` do not match `trailer.counterBind` (`"Counter bind mismatch"`)
- **Chain hash integrity** — any entry in the transaction log chain produces a hash inconsistent with the stored hash value (`"Chain hash invalid"`)

## Non-tamper rejections

These failures are validation errors but do NOT set `tamper: true`:

- **Schema version mismatch** — card version is below 4 (old format) or above 4 (unrecognized future format)
- **Key version mismatch** — card's `keyVersion` differs from the session grant's `keyVersion` (indicates key rotation, not attack)
- **Tenant-bind mismatch** — FNV-32a hash of the session's `tenantId` doesn't match the card's `tenantBind` field. This indicates a card from a different koperasi, displayed as "Kartu anda tidak terdaftar" (card not registered)
- **AES-GCM decryption failure** — if AES-GCM auth tag verification fails during decryption, the payload decode will throw (caught as `"Payload decode failed"` with `tamper: true`)

## Additional checks (post-validation)

- **Session grant expiry** — the grant's `expiresAt` must be in the future
- **Card status** — only `ACTIVE` (0) cards may undergo write operations
- **State transition validity** — requested transitions must conform to the state machine (see [§4](4_card-state-machine.md))
- **Session expiry** — cards in active states for >25h are expired (only checkout allowed)
- **Balance checks** — minimum balance for check-in (Rp 10,000), sufficient balance for checkout fee

## Response to a failed verification

- **Tamper detected** (`tamper: true`): Do not write to the card. The UI escalates the card status. The terminal reports the tamper event. Display a blocked/tamper message.
- **Non-tamper rejection**: Do not write to the card. Display an appropriate user-facing message (e.g., "card not registered", "session expired", "insufficient balance").
- **Block enforcement**: If the card is blocked (via on-card status OR local DB record), reject all write operations immediately.

> Exact ordered validation sequence with field-level checks: [Tech Specs §5 Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md).

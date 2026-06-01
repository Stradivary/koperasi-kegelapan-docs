# 18. Card Initialisation State

## What "uninitialised" means

A factory-fresh NXP NTAG215/216 card has no wallet payload written. Its data pages contain all `0x00` bytes (or `0xFF` after a full erase). This is distinct from a tampered card, which once held a valid payload that was subsequently modified.

An uninitialised card:

- Has no `magic` sentinel value at the expected offset
- Has no `version` field
- Cannot pass any cryptographic check - but should not be treated as a tamper event

## Detection rule

Before running the full tamper validation sequence, readers must run a pre-check:

```
IF payload[magic_offset .. magic_offset+4] == 0x00000000
   OR payload[magic_offset .. magic_offset+4] == 0xFFFFFFFF
THEN
   state = UNINITIALISED
   halt (do not proceed to tamper validation)
```

If the magic field contains any other value that does not match the expected sentinel, **then** the card fails the magic check and is treated as tampered.

## Allowed operations on an uninitialised card

| App      | Allowed? | Behaviour                                                                              |
| -------- | -------- | -------------------------------------------------------------------------------------- |
| Scout    | ✅ Read  | Display "Unactivated card" message. No write.                                          |
| Gate     | ❌       | Reject with "Card not registered" before check-in.                                     |
| Terminal | ❌       | Reject any write attempt.                                                              |
| Station  | ✅ Write | Initialise card - write magic, version, identity block, and zero-state wallet payload. |

## Initialisation write (Station only)

A Station performs the first write to an uninitialised card. This write:

1. Sets the `magic` sentinel and `version`.
2. Populates the identity block (`userId`, `name`, `status = ACTIVE`, `createdAt`).
3. Sets `balance = 0`, `counter = 0`, `state = IDLE`.
4. Writes an empty log region and a fresh trailer with a valid `HMAC` and `keyVersion`.
5. Logs the issuance event to the backend.

After this write the card is no longer uninitialised and will pass the magic check on all subsequent reads.

## Why this is separate from tamper detection

The tamper detection sequence (see [Tech Specs §5](../tech-specs/5_tamper-detection-validation.md)) assumes a valid magic and version field. Applying cryptographic checks to a blank card would produce false `BLOCKED_TAMPER` escalations on every new card presented. The uninitialised pre-check gates entry into the validation sequence, preventing this.

> ⚠️ Downstream impact: [Tech Specs §5 Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md) must include this pre-check as step 0 in the validation sequence. See also [Product Spec AC-08](../product-spec/4_acceptance-criteria.md).

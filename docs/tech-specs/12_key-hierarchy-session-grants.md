# 12. Key Hierarchy & Session Grants

## Key hierarchy

```
Backend Master Key (HSM)
  └─ Station/Gate Provisioning Key  (per deployment zone)
       └─ Terminal Session Key         (per grant, 1–24h TTL)
            └─ Card Encryption Key      (derived per card via HKDF)
            └─ Card Auth (HMAC) Key     (derived per card via HKDF)
```

- The master key is stored in an HSM and never leaves it.
- Provisioning keys are issued to station and gate devices during commissioning.
- Terminal session keys are short-lived grants issued by the backend on demand.
- Per-card keys are derived on-device; they are never transmitted or stored.

## Session grants

A session grant is a signed object that allows a terminal to operate for a limited period.

| Field        | Type     | Description                                                    |
| ------------ | -------- | -------------------------------------------------------------- |
| `keyVersion` | uint8    | Identifies the key set for deriving card keys                  |
| `sessionKey` | 32 bytes | The terminal session key for this grant                        |
| `expiresAt`  | uint32   | UTC seconds; grant is invalid after this time                  |
| `allowedOps` | string[] | Operations the terminal may perform (e.g., `debit`, `checkin`) |
| `signature`  | bytes    | Backend ECDSA or HMAC signature over the above fields          |

- Terminals store session grants in memory only; they must not persist to disk or browser storage.
- The card never receives or stores the session key directly.
- The terminal validates the grant signature before using it.

## Key derivation

Per-card keys are derived from the session key and card identity:

```
encryptionKey = HKDF-SHA256(ikm=sessionKey, salt=cardId, info="enc",  length=32)
authKey       = HKDF-SHA256(ikm=sessionKey, salt=cardId, info="auth", length=32)
nonce         = HKDF-SHA256(ikm=sessionKey, salt=cardId || counter,  info="nonce", length=12)
```

- `cardId` is the 6-byte identifier from the card header block.
- `counter` is the 8-byte write counter; nonce derivation binds it to prevent nonce reuse across writes.
- The `info` strings domain-separate the three derived values.

## Rotation procedure

See [§11](11_deployment-maintenance.md) for the full key rotation deployment procedure. The key invariant is:

> The backend must serve session grants for both the old and new `keyVersion` values throughout the migration window.

## Compromise response

- If a session key is compromised: revoke the grant immediately at the backend; all terminals must re-authenticate.
- If a provisioning key is compromised: rotate the provisioning key and reissue all terminal grants derived from it.
- If the master key is compromised: emergency rotation of all key material; all cards require re-keying at a station.

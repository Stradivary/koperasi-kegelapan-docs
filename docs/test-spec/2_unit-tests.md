# 2. Unit Tests

All unit tests run with Vitest. Each suite below lists the assertions that must exist. Assertions are expressed as `given / when / then` and each one references the upstream spec claim it proves.

---

## 2.1 Key derivation

**Module**: `crypto/keyDerivation`

**Traces to**: [Tech Specs §4](../tech-specs/4_cryptography.md) Cryptography, [Security Spec §3](../security-spec/3_cryptographic-controls.md) Cryptographic Controls

| ID      | Given                                                    | When                            | Then                                                                         |
| ------- | -------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| U-KD-01 | A known `sessionKey` (32 bytes) and `cardId` (6 bytes)   | `deriveEncryptionKey` is called | The output matches the HKDF-SHA256 test vector for `info="enc"`              |
| U-KD-02 | The same inputs                                          | `deriveAuthKey` is called       | The output matches the HKDF-SHA256 test vector for `info="auth"`             |
| U-KD-03 | The same inputs and a `counter` value                    | `deriveNonce` is called         | The output matches the HKDF-SHA256 test vector for `info="nonce"` (12 bytes) |
| U-KD-04 | `cardId` values that differ by one byte                  | Both `encryptionKey` outputs    | They must not be equal (domain separation)                                   |
| U-KD-05 | Counters `n` and `n+1` for the same card and session key | Both `nonce` outputs            | They must not be equal (nonce uniqueness guarantee)                          |

---

## 2.2 AES-GCM encryption and decryption

**Module**: `crypto/aesgcm`

**Traces to**: [Tech Specs §4](../tech-specs/4_cryptography.md), [ADR §2](../adr/2_aes-gcm.md) AES-GCM, [Security Spec §3](../security-spec/3_cryptographic-controls.md)

| ID       | Given                                              | When                                            | Then                                                   |
| -------- | -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| U-AES-01 | A known plaintext buffer and derived key           | `encrypt` is called                             | Ciphertext length = plaintext length + 16-byte GCM tag |
| U-AES-02 | The ciphertext from U-AES-01                       | `decrypt` is called with the same key and nonce | The decrypted output matches the original plaintext    |
| U-AES-03 | The ciphertext from U-AES-01 with one byte flipped | `decrypt` is called                             | A `GcmTagMismatch` error is thrown                     |
| U-AES-04 | A valid ciphertext                                 | `decrypt` is called with a different key        | A `GcmTagMismatch` error is thrown                     |
| U-AES-05 | A valid ciphertext                                 | `decrypt` is called with a different nonce      | A `GcmTagMismatch` error is thrown                     |

---

## 2.3 HMAC computation and verification

**Module**: `crypto/hmac`

**Traces to**: [Tech Specs §4](../tech-specs/4_cryptography.md), [ADR §2](../adr/2_aes-gcm.md), [Security Spec §3](../security-spec/3_cryptographic-controls.md)

| ID        | Given                                              | When                                        | Then                                                   |
| --------- | -------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| U-HMAC-01 | A known auth key and ordered set of trailer fields | `computeHmac` is called                     | The first 8 bytes of HMAC-SHA256 match the test vector |
| U-HMAC-02 | A valid card trailer                               | `verifyHmac` is called with the correct key | Returns `true`                                         |
| U-HMAC-03 | A trailer with one trailer field modified          | `verifyHmac` is called                      | Returns `false`                                        |
| U-HMAC-04 | A trailer with the `HMAC` field itself modified    | `verifyHmac` is called                      | Returns `false`                                        |

---

## 2.4 Card validation sequence

**Module**: `validation/cardValidator`

**Traces to**: [Tech Specs §5](../tech-specs/5_tamper-detection-validation.md) Tamper Detection & Validation (steps 0–8)

Each step must be independently testable by passing a card payload with only that step's failure condition triggered.

| ID        | Step                | Given                                            | When                 | Then                                                     |
| --------- | ------------------- | ------------------------------------------------ | -------------------- | -------------------------------------------------------- |
| U-VAL-00  | Pre-check           | Card bytes are all `0x00`                        | `validate` is called | Returns `{ state: 'uninitialised' }`; no error           |
| U-VAL-01  | Schema version      | `version` field is `3` (below minimum)           | `validate` is called | Returns `{ valid: false, reason: "Schema version mismatch" }` |
| U-VAL-01b | Schema version      | `version` field is `5` (above current)           | `validate` is called | Returns `{ valid: false, reason: "Unrecognized schema version" }` |
| U-VAL-02  | Key version         | Card `keyVersion` ≠ grant `keyVersion`           | `validate` is called | Returns `{ valid: false, tamper: false }` with key version mismatch reason |
| U-VAL-03  | AES-GCM decryption  | Ciphertext has one byte flipped                  | `validate` is called | Returns `{ valid: false, tamper: true }` with decode failure |
| U-VAL-04  | HMAC                | Trailer `HMAC` field is corrupted                | `validate` is called | Returns `{ valid: false, tamper: true, reason: "HMAC verification failed" }` |
| U-VAL-05  | Counter-bind        | `counterBind` ≠ `lower32(wallet.counter)`        | `validate` is called | Returns `{ valid: false, tamper: true, reason: "Counter bind mismatch" }` |
| U-VAL-06  | Tenant-bind         | `tenantBind` ≠ FNV-32a(sessionGrant.tenantId)   | `validate` is called | Returns `{ valid: false, tamper: false }` with unregistered card message |
| U-VAL-07  | Chain hash          | Log entry `n` has `hash` modified                | `validate` is called | Returns `{ valid: false, tamper: true, reason: "Chain hash invalid" }` |

---

## 2.5 Card state machine

**Module**: `state-machine/cardStateMachine`

**Traces to**: [Tech Specs §6](../tech-specs/6_state-machine-session-rules.md) State Machine & Session Rules, [System Design §4](../system-design/4_card-state-machine.md)

| ID      | From                 | Trigger                                                | Then                                               |
| ------- | -------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| U-SM-01 | `IDLE`               | Gate check-in (valid grant with `checkin`)             | State = `CHECKED_IN`; log entry appended           |
| U-SM-02 | `CHECKED_IN`         | Terminal begins transaction (valid grant with `debit`) | State = `STATION_OPERATION`                        |
| U-SM-03 | `STATION_OPERATION`  | Debit committed                                        | State returns to `CHECKED_IN`; balance decremented |
| U-SM-04 | `CHECKED_IN`         | Gate check-out (valid grant with `checkout`)           | State = `CHECKED_OUT`                              |
| U-SM-05 | `IDLE`               | Debit attempted (no `checkin`)                         | Throws `InvalidStateTransition`                    |
| U-SM-06 | `CHECKED_IN`         | Grant expired                                          | Throws `SessionExpired`; no write                  |
| U-SM-07 | `IDLE`               | Top-up attempted offline                               | Throws `TopupRequiresConnectivity`                 |
| U-SM-08 | Any                  | Card in `BLOCKED_*` status                             | Throws `CardBlocked`; no write                     |

---

## 2.6 Financial limit enforcement

**Module**: `limits/limitEnforcer`

**Traces to**: [Tech Specs §9](../tech-specs/9_risk-financial-limits.md) Risk & Financial Limits, [Security Spec §7](../security-spec/7_financial-risk-controls.md)

| ID       | Given                                                                     | When                              | Then                                                          |
| -------- | ------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| U-LIM-01 | Proposed debit of Rp 500,000; current policy single-tx limit Rp 1,000,000 | `checkSingleTransaction`          | Passes                                                        |
| U-LIM-02 | Proposed debit of Rp 1,000,001                                            | `checkSingleTransaction`          | Throws `ExceedsSingleTransactionLimit`                        |
| U-LIM-03 | Post-transaction balance would be Rp 16,000,001                           | `checkBalanceCeiling`             | Throws `ExceedsBalanceCeiling`                                |
| U-LIM-04 | Daily cumulative so far Rp 1,800,000; new debit Rp 300,000                | `checkDailyLimit` (offline cache) | Returns `{ wouldBreach: true, flagForReview: true }`          |
| U-LIM-05 | Policy cache expired                                                      | `checkDailyLimit`                 | Returns `{ stalePolicy: true }`; debit is allowed but flagged |

---

## 2.7 Local-first reconciliation outbox

**Module**: `outbox/reconciliationOutbox`

**Traces to**: [Data Spec §5](../data-spec/5_multitenancy-auth-local-first.md) Local-first Storage, [Tech Specs §8](../tech-specs/8_backend-frontend-interfaces.md) Backend & Frontend Interfaces

| ID       | Given                                                       | When                       | Then                                                              |
| -------- | ----------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| U-OBX-01 | A committed debit event                                     | `enqueue` is called        | Row exists in `reconciliationOutbox` with `syncState = 'pending'` |
| U-OBX-02 | A pending outbox row                                        | `markSending` is called    | `syncState = 'sending'`                                           |
| U-OBX-03 | A `sending` row and a successful server response            | `markAcked` is called      | `syncState = 'acked'`                                             |
| U-OBX-04 | The same event enqueued twice with the same `outboxId`      | Second `enqueue`           | No duplicate row; idempotent                                      |
| U-OBX-05 | A `sending` row and a server `4xx` response after 5 retries | `markDeadLetter` is called | `syncState = 'dead_letter'`; `lastError` populated                |
| U-OBX-06 | Tenant logout                                               | `clearTenant` is called    | All rows for that `tenantId` are deleted                          |

---

## 2.8 Auth token parsing and scope checking

**Module**: `auth/tokenVerifier`

**Traces to**: [Security Spec §2](../security-spec/2_authentication-authorization.md) Authentication & Authorization, [API Spec §2](../api-spec/2_auth.md)

| ID        | Given                                       | When                                  | Then                                                          |
| --------- | ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| U-AUTH-01 | A valid signed access token                 | `parse` is called                     | Returns `{ tenantId, accountId, deviceId, roles, expiresAt }` |
| U-AUTH-02 | A token past its `expiresAt`                | `parse` is called                     | Throws `TokenExpired`                                         |
| U-AUTH-03 | A token with a forged signature             | `parse` is called                     | Throws `InvalidSignature`                                     |
| U-AUTH-04 | A valid token with role `terminal_operator` | `assertPermission('debit')` is called | Passes                                                        |
| U-AUTH-05 | A valid token with role `scout`             | `assertPermission('debit')` is called | Throws `InsufficientPermission`                               |
| U-AUTH-06 | A valid token for `tenantId = A`            | `assertTenant('B')` is called         | Throws `TenantMismatch`                                       |

---

## 2.9 Binary encoding and decoding

**Module**: `codec/cardCodec`

**Traces to**: [Data Spec §2](../data-spec/2_card-binary-schema.md) Card Binary Schema, [Data Spec §4](../data-spec/4_encoding-conventions.md) Encoding Conventions

| ID       | Given                                             | When               | Then                                                       |
| -------- | ------------------------------------------------- | ------------------ | ---------------------------------------------------------- |
| U-COD-01 | A structured card object with known field values  | `encode` is called | The byte array matches the reference fixture byte-for-byte |
| U-COD-02 | A reference fixture byte array                    | `decode` is called | The structured object matches the source field values      |
| U-COD-03 | A byte array with correct `counter` in big-endian | `decode`           | The `counter` field is correctly parsed as `uint64`        |
| U-COD-04 | A byte array shorter than the minimum schema size | `decode`           | Throws `InvalidPayloadLength`                              |

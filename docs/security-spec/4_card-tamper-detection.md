# 4. Card Tamper Detection

## Security classification of validation failures

Each failure condition maps to a security event severity.

| Failure                  | Condition                                         | Severity                                 |
| ------------------------ | ------------------------------------------------- | ---------------------------------------- |
| Magic / version mismatch | `magic` ≠ expected value or `version` unsupported | Medium - may be unformatted card         |
| HMAC mismatch            | Recomputed HMAC does not match trailer            | **Critical** - active tamper             |
| GCM decryption failure   | AES-GCM tag check fails                           | **Critical** - active tamper             |
| Counter rollback         | On-card counter ≤ last known counter              | **Critical** - replay or rollback attack |
| Timestamp rollback       | `lastTimestamp` > `now + drift_allowance`         | High - potential rollback                |
| Balance inconsistency    | Balance ≠ expected from log chain                 | **Critical** - active tamper             |
| Log chain hash mismatch  | Any chain hash fails recomputation                | **Critical** - log tampering             |
| Root hash mismatch       | Trailer `rootHash` ≠ computed chain head          | **Critical** - active tamper             |
| Key version unknown      | No grant available for the card's `keyVersion`    | High - offline or re-key needed          |
| Status blocked           | `status` field is any `BLOCKED_*` value           | Informational - expected state           |

---

## Response policy

| Condition                                     | Terminal action                                                                                        | Backend action                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| HMAC / GCM / chain / balance critical failure | Set `BLOCKED_TAMPER` on next authenticated write; if write not possible, report to backend immediately | Log tamper event; flag card; queue for operator review |
| Counter rollback                              | Refuse all operations; report to backend                                                               | Log replay event; flag for investigation               |
| Timestamp rollback                            | Refuse write; log locally                                                                              | Reconciliation flags event on upload                   |
| Key version unknown (online)                  | Request fresh session grant                                                                            | Issue grant for current `keyVersion`                   |
| Key version unknown (offline)                 | Refuse write; display generic error                                                                    | Receive report at next reconciliation                  |
| Blocked status                                | Allow read; refuse all writes                                                                          | No action unless reconciliation detects escalation     |

**Do not expose the specific failure reason to the end user.** Display `Card blocked` or `Card error - contact staff`. Detailed failure data belongs in operator and backend logs only.

---

## Tamper event log fields

Every tamper event submitted to the backend must include:

| Field         | Description                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `tenantId`    | Owning koperasi                                                                                         |
| `cardId`      | Card identifier (hex)                                                                                   |
| `terminalId`  | Reporting terminal                                                                                      |
| `accountId`   | Operator on session at time of detection                                                                |
| `eventType`   | One of: `tamper`, `replay`, `rollback`, `chain_break`, `balance_mismatch`                               |
| `detectedAt`  | Terminal-local timestamp                                                                                |
| `counter`     | On-card counter value at time of detection                                                              |
| `failureStep` | Validation step number from [Tech Specs §5](../tech-specs/5_tamper-detection-validation.md) that failed |

Tamper events must be queued in the local outbox if the terminal is offline and submitted as part of the next reconciliation batch.

---

## Unverified-state rule

After any validation failure, the terminal must treat the card as **unverified**. The terminal must not:

- Display the balance as authoritative.
- Initiate any debit or credit.
- Update its local card snapshot.
- Allow a new session to proceed on that card without a full re-read and re-validation.

---

## Physical card security

- NTAG215/216 has no hardware-level write protection. The system must be **tamper-evident**, not tamper-proof.
- A tag with a countered password lock (NTAG215 `PWD_AUTH` / `AUTH0`) may optionally be used to slow down amateur modification but must not be relied upon as a security control.
- Cards that fail physical NFC read (I/O error, partial response) must be treated as unreadable and reported, not silently skipped.

---

## Cross-references

- Tech Specs §5: [Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md)
- System Design §3: [Security Model](../system-design/3_security-model.md)
- System Design §10: [Verification Rules](../system-design/10_verification-rules.md)
- API Spec §7: [Terminal Reports](../api-spec/7_terminal-reports.md)

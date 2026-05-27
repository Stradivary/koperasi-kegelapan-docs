# 5. Offline Trust Model

## Trust hierarchy during offline operation

When the backend is unreachable, authority degrades in a controlled way. No new authority may be granted offline; existing grants expire on schedule.

```
Backend (authoritative, online)
  └─ Issues signed session grant
       └─ Terminal uses grant until expiresAt
            └─ Card holds signed payload state
                 └─ All writes re-verify payload before committing
```

The terminal acts on the grant it holds. Once the grant expires, the terminal must refuse all write operations regardless of connectivity.

---

## Session grant security properties

| Property        | Implementation                                                                        |
| --------------- | ------------------------------------------------------------------------------------- |
| Authenticity    | Backend ECDSA / HMAC-SHA256 signature; terminal validates before use                  |
| Scope binding   | Grant contains `tenantId`, `accountId`, `deviceId`, `allowedOps`                      |
| Time bounding   | `expiresAt` enforced by terminal clock; drift allowance ≤ 1 hour                      |
| Non-persistence | Session key held in process memory only; never written to disk                        |
| Single-device   | Grant is bound to the issuing `deviceId`; sharing grants across devices is detectable |

---

## Replay attack mitigations

| Attack vector                    | Mitigation                                                                  |
| -------------------------------- | --------------------------------------------------------------------------- |
| Replaying an old card read       | Monotonic write counter; terminal rejects counter ≤ last known              |
| Replaying a reconciliation batch | `UNIQUE (tenant_id, card_id, counter)` in `audit_log`                       |
| Replaying a session grant        | Grants are bound to `deviceId`; backend tracks last-used counter per device |
| Replaying a top-up request       | Top-ups require live backend validation; no offline credit allowed          |

---

## Worst-case offline exposure

The maximum financial exposure from a compromised terminal operating entirely offline is bounded by:

`E_max = n_terminals × Rp 5,000,000 × ceil(TTL / session length)`

Where:

- `n_terminals` is the number of compromised terminals
- Rp 5,000,000 is the recommended balance cap (backend policy)
- `TTL` is the session grant TTL (backend-controlled, 1–24 hours)

Reducing the grant TTL is the primary control for reducing offline exposure. The risk triad — balance ceiling, TTL, and reconciliation frequency — must be reviewed together whenever any one value changes. See [ADR §6](../adr/6_balance-ceiling.md).

---

## Operator session offline behaviour

An operator session (refresh token + cached tenant context) allows the app to remain open across brief connectivity loss. However:

- A cached operator session does not extend session grant authority beyond `expiresAt`.
- If the operator session expires offline, the terminal must queue pending reconciliation events and display a re-login prompt before the next write.
- A tenant switch must not inherit any session grant from the previous tenant, even if that grant has not expired.

---

## Stale grant detection

The backend may revoke a session grant before its `expiresAt` if:

- The device is suspended.
- The account membership is revoked or suspended.
- The tenant is suspended.
- A key version is revoked.

A terminal that receives `401 Unauthorized` on any call must discard its current grant, clear session key material from memory, and require a full re-authentication before any further write operation.

---

## Cross-references

- ADR §4: [Offline Trust Model](../adr/4_offline-trust-model.md)
- ADR §6: [Balance Ceiling](../adr/6_balance-ceiling.md)
- Tech Specs §12: [Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)
- Security Spec §2: [Authentication & Authorization](2_authentication-authorization.md)

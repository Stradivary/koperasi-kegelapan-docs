# 1. Overview

## Threat model

The system must protect the financial value stored on NFC cards and the tenant data stored in the backend and on-device cache against the following categories of attacker.

### Card-level threats

| Threat                       | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| Full card read               | Any standard NFC reader can dump all bytes from an NTAG215/216          |
| Card cloning                 | A valid card image is copied byte-for-byte onto a blank chip            |
| Arbitrary byte modification  | An attacker writes crafted bytes to an unprotected card                 |
| State replay                 | A valid older card image is re-presented after newer transactions exist |
| Counter / timestamp rollback | The monotonic counter or timestamp is overwritten with a lower value    |
| Log chain tampering          | A log entry is modified, inserted, deleted, or reordered                |
| Invalid state transition     | Checkout from `IDLE`, debit while `CHECKED_OUT`, etc.                   |

### Auth and session threats

| Threat               | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| Credential stuffing  | Automated operator password guessing from leaked credential lists  |
| Token theft          | Access token or refresh token extracted from client memory/storage |
| Session fixation     | Attacker reuses a valid session after operator logout              |
| Tenant cross-access  | Operator authenticated to tenant A reads or writes tenant B data   |
| Privilege escalation | A `scout`-role token is used to perform station operations         |
| Device compromise    | A blocked device continues to operate with cached session grant    |
| Refresh token replay | An already-rotated refresh token is reused                         |

### Infrastructure threats

| Threat              | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| Secrets leakage     | Master key committed to version control or logged in plaintext                |
| Database breach     | Unauthorised read of D1 tables exposes member PII or card state               |
| Replay of sync push | A captured sync push batch is submitted a second time                         |
| Sync push fraud     | A terminal submits crafted events to credit a card without a valid card write |

---

## OWASP Top 10 coverage

| OWASP Category                  | Mitigation in this system                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control       | Tenant-scoped RBAC; every request validated against `tenantId` + role scope; no direct object references without ownership check |
| A02 Cryptographic Failures      | AES-256-GCM + HMAC-SHA256 on card payload; PBKDF2-SHA256 for passwords; no plaintext secrets in storage or logs                  |
| A03 Injection                   | All database queries use parameterised statements; no dynamic SQL from user input                                                |
| A04 Insecure Design             | Offline-first model reviewed in [ADR §4](../adr/4_offline-trust-model.md); session grant TTL bounds offline fraud exposure       |
| A05 Security Misconfiguration   | Per-tenant data scoping; secrets via Cloudflare Workers Secrets; tenant isolation enforced in all queries                        |
| A06 Vulnerable Components       | Dependency audits in CI; pinned lockfiles; automated SCA in pipeline                                                             |
| A07 Identity & Auth Failures    | Password auth + device fingerprinting; short-lived access tokens (1h); refresh token rotation; device block enforcement          |
| A08 Software & Data Integrity   | Session grant signed by backend; card payload authenticated via HMAC; log chain provides append-only tamper evidence             |
| A09 Logging & Monitoring        | Immutable `audit_log`; tamper events trigger immediate operator notification; monitoring on anomalous reconciliation rates       |
| A10 Server-Side Request Forgery | No server-initiated external HTTP calls driven by user input                                                                     |

---

## Trust boundaries

```
[ Cardholder ]
      │  presents physical card (untrusted)
      ▼
[ NFC Card ]  ─── untrusted storage; every read re-validates all cryptographic proofs
      │
      │  NFC read/write
      ▼
[ Terminal / Gate / Kiosk / Station app ]  ─── conditionally trusted (within session grant scope)
      │  JWT access token + device fingerprint
      ▼
[ Backend API (Cloudflare Workers) ]  ─── trusted; root of policy and key material
      │
      ▼
[ D1 database + Workers Secrets ]  ─── authoritative; master key in Workers Secrets
```

Any data crossing a boundary is re-authenticated at the receiving side. No boundary crossing is implicitly trusted.

---

## Security goals

1. **Detect** any unauthorised modification of card data on every read before acting on it.
2. **Bound** the worst-case damage from a lost, stolen, or cloned card to the session grant window.
3. **Isolate** each koperasi tenant so a compromise of one tenant cannot affect another.
4. **Authenticate** both the device and the human operator before issuing any write-capable session.
5. **Audit** every value-changing event with a signed, sequenced, and immutable record.
6. **Minimise** PII stored on the card and in client-side storage.

---

## Cross-references

- System Design §3: [Security Model](../system-design/3_security-model.md)
- ADR §4: [Offline Trust Model](../adr/4_offline-trust-model.md)
- ADR §2: [AES-GCM](../adr/2_aes-gcm.md)

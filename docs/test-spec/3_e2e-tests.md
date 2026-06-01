# 3. E2E Tests

All E2E tests run with Playwright against a Miniflare backend, a seeded SQLite database, and a mock NFC reader fixture. Each scenario traces to one or more acceptance criteria from [Product Spec §4](../product-spec/4_acceptance-criteria.md) or to a security control from the Security Spec.

---

## 3.1 Offline transaction flow

**Traces to**: AC-01, AC-02, AC-03 ([Product Spec §4](../product-spec/4_acceptance-criteria.md))

### E2E-TXN-01 - Successful offline debit

```
Given a terminal with a valid session grant (role: terminal_operator)
  And an enrolled device with an active operator session
  And the mock NFC reader returns a valid CHECKED_IN card payload
  And the backend is unreachable (network interceptor blocks all /api calls)
When the operator initiates a debit of Rp 500,000
Then the card payload written by the NFC writer has balance decremented by Rp 500,000
  And a log entry is appended to the card with the correct counter and chain hash
  And the reconciliation outbox contains one pending row
  And no backend API call was made
```

### E2E-TXN-02 - Expired session grant blocks write

```
Given a terminal with an expired session grant (expiresAt in the past)
  And a valid CHECKED_IN card
When the operator initiates any write operation
Then the terminal displays a session-expired error
  And no write is issued to the NFC writer
  And the operator is prompted to refresh the session grant
```

### E2E-TXN-03 - Reconciliation upload on reconnect

```
Given a terminal with 5 pending outbox rows from offline operation
  And the backend becomes reachable
When the reconnect handler triggers a sync
Then POST /api/reconcile is called with all 5 events in one batch
  And all 5 rows are marked as acked in the outbox
  And the cardSnapshot store is updated with the new reconciled state
```

---

## 3.2 Tamper and fraud detection

**Traces to**: AC-04, AC-05, AC-06 ([Product Spec §4](../product-spec/4_acceptance-criteria.md)), [Security Spec §4](../security-spec/4_card-tamper-detection.md)

### E2E-TMPR-01 - Byte-modified card triggers BLOCKED_TAMPER

```
Given the mock NFC reader returns a card with one byte in the encrypted payload flipped
When a terminal or gate app reads the card
Then the validation sequence fails at GCM decryption (step 4)
  And the app displays a generic blocked error to the user
  And the terminal attempts to write BLOCKED_TAMPER status on the next authenticated write
  And a tamper event report is queued in the outbox
```

### E2E-TMPR-02 - Cloned card rejected by counter check

```
Given a valid card with counter = 42 was previously read by the terminal (counter cached)
  And the mock NFC reader returns the same card with counter still = 42 (a clone scenario)
When the terminal reads the card
Then the validation sequence fails at counter check (step 5)
  And the event is flagged as 'replay' in the tamper report queue
  And the user sees a generic card error
```

### E2E-TMPR-03 - Blocked card refuses writes

```
Given the mock NFC reader returns a card with status = BLOCKED_TAMPER
When a station operator attempts to top-up the card
Then the app rejects the operation before any NFC write
  And the UI displays "Card blocked"
  And no NFC write is issued
```

---

## 3.3 Member experience

**Traces to**: AC-07, AC-08 ([Product Spec §4](../product-spec/4_acceptance-criteria.md))

### E2E-MEMBER-01 - Scout view displays balance without write

```
Given an authenticated scout session
  And the mock NFC reader returns a valid IDLE card
When the member taps the card
Then the app displays the balance and last 10 transactions
  And no NFC write is issued (NFC writer mock receives zero calls)
  And the card's counter is unchanged
```

### E2E-MEMBER-02 - Uninitialised card shows activation prompt

```
Given the mock NFC reader returns a card with all bytes = 0x00
When any app reads the card
Then the validation pre-check detects the uninitialised state
  And the app displays "Unactivated card"
  And no error is thrown
  And no NFC write is issued
```

---

## 3.4 Financial limits

**Traces to**: AC-09, AC-10 ([Product Spec §4](../product-spec/4_acceptance-criteria.md)), [Security Spec §7](../security-spec/7_financial-risk-controls.md)

### E2E-LIM-01 - Single transaction above limit rejected at write time

```
Given a terminal with a valid session grant
  And a valid CHECKED_IN card with balance Rp 3,000,000
When the operator initiates a debit of Rp 1,000,001
Then the terminal rejects the transaction before issuing any NFC write
  And the error message indicates the single-transaction limit was exceeded
  And the card state is unchanged
  And no outbox row is created
```

### E2E-LIM-02 - Offline top-up blocked

```
Given a station terminal
  And the backend is unreachable
When the operator attempts a top-up of any amount
Then the station rejects the operation immediately
  And the error message indicates backend connectivity is required for top-ups
  And no NFC write is issued
```

### E2E-LIM-03 - Daily limit breach flagged at reconciliation

```
Given a card with Rp 1,800,000 of debit events already reconciled for today
  And a reconciliation batch containing a new Rp 300,000 debit for the same card
When POST /api/reconcile is called
Then the backend accepts the batch
  And the Rp 300,000 event has review_flag = true in audit_log
  And the response body includes the flagged event count
```

---

## 3.5 Session lifecycle

**Traces to**: AC-11, AC-12 ([Product Spec §4](../product-spec/4_acceptance-criteria.md))

### E2E-SES-01 - Gate check-in transitions card to CHECKED_IN

```
Given a gate app with a valid session grant (role: gate_operator)
  And the mock NFC reader returns a valid IDLE card
When the gate tap event fires
Then the NFC writer writes a payload with state = CHECKED_IN
  And a checkin log entry is appended with the correct counter
```

### E2E-SES-02 - Stale session detected and flagged

```
Given the mock NFC reader returns a card with state = CHECKED_IN
  And lastTimestamp in the session block is > 24 hours ago
When any terminal or gate reads the card
Then the app detects the stale session
  And prompts the operator to resolve it before any further operation
  And no write proceeds until the operator acknowledges
```

---

## 3.6 Audit and reconciliation

**Traces to**: AC-13, AC-14 ([Product Spec §4](../product-spec/4_acceptance-criteria.md))

### E2E-AUD-01 - Audit log entry exists for every committed value change

```
Given a terminal that committed a debit of Rp 200,000 (counter = 7)
  And the batch was successfully reconciled
When the backend audit_log is queried for (tenantId, cardId, counter = 7)
Then exactly one row exists with txType = 'debit', amount = 200000, chain_hash populated,
     tenant_id correct, and account_id of the operator
```

### E2E-AUD-02 - Limit-breaching event flagged, others accepted

```
Given a reconciliation batch with 3 events:
     event A: Rp 200,000 (daily total so far: Rp 1,600,000)
     event B: Rp 300,000 (would push daily total to Rp 1,900,000)
     event C: Rp 200,000 (would push daily total to Rp 2,100,000 - breaches Rp 2,000,000)
When POST /api/reconcile is called
Then the response accepted = 3, flagged = 1 (event C)
  And only event C has review_flag = true in audit_log
  And events A and B have review_flag = false
```

---

## 3.7 Tenant isolation

**Traces to**: [Security Spec §2](../security-spec/2_authentication-authorization.md), [Data Spec §5](../data-spec/5_multitenancy-auth-local-first.md)

### E2E-ISO-01 - Cross-tenant card lookup blocked

```
Given an operator authenticated to tenant A (token carries tenantId = A)
  And a card that belongs to tenant B
When GET /api/cards/:cardId is called with that card's ID
Then the backend returns 404 Not Found
  And no data from tenant B is disclosed
  And a cross_tenant_attempt event is logged server-side
```

### E2E-ISO-02 - Cross-tenant reconciliation blocked

```
Given an operator authenticated to tenant A
  And a reconciliation batch containing a cardId that belongs to tenant B
When POST /api/reconcile is called
Then the event for the tenant-B card is rejected with reason 'invalid_card'
  And the batch result shows rejected = 1
  And no audit_log row is written for the tenant-B card
```

---

## 3.8 Authentication and MFA flows

**Traces to**: [Security Spec §2](../security-spec/2_authentication-authorization.md) Authentication & Authorization, [API Spec §2](../api-spec/2_auth.md)

### E2E-AUTH-01 - Successful login with TOTP

```
Given a valid operator account in tenant "koperasi-kegelapan" with MFA mode 'required'
  And a valid enrolled device
When POST /api/auth/token is called with correct password and valid TOTP code
Then the response contains accessToken, refreshToken, tenantId, and account.roles
  And an auth_sessions row is created in the database
```

### E2E-AUTH-02 - Login fails without MFA for required-MFA role

```
Given an operator with role station_operator (MFA required)
When POST /api/auth/token is called without otpCode
Then the response is 401 Unauthorized with error = 'mfa_required'
  And no token is issued
```

### E2E-AUTH-03 - Token rotation on refresh

```
Given an active operator session with refresh token R1
When POST /api/auth/refresh is called with R1
Then a new refreshToken R2 is returned
  And R1 is revoked (marked used in auth_sessions)
  And a subsequent call with R1 returns 401 Unauthorized
```

### E2E-AUTH-04 - Stolen refresh token detected

```
Given refresh token R1 was rotated to R2 (R1 is now revoked)
When a second call with R1 is made (simulating a stolen-then-replayed token)
Then the backend revokes all sessions for that device
  And subsequent calls with R2 also return 401 Unauthorized
```

### E2E-AUTH-05 - Operator logout clears server and client state

```
Given an authenticated operator session
When the operator triggers logout
Then POST /api/auth/logout is called and the auth_sessions row is revoked
  And the client IndexedDB operatorSession store is cleared for the active tenant
  And the client tenantContext store is cleared
  And a subsequent API call with the old accessToken returns 401
```

### E2E-AUTH-06 - Suspended account cannot log in

```
Given an operator account with status = 'suspended'
When POST /api/auth/token is called with correct credentials
Then the response is 403 Forbidden with error = 'account_suspended'
```

### E2E-AUTH-07 - Tenant switch forces re-login

```
Given an operator authenticated to tenant A
When the tenant selector switches to tenant B
Then the current tenant-A session grant is discarded from memory
  And the operator-A session context is cleared from IndexedDB
  And the user is prompted to authenticate with tenant-B credentials
```

---

## 3.9 RBAC enforcement

**Traces to**: [Security Spec §2](../security-spec/2_authentication-authorization.md) Permission matrix

### E2E-RBAC-01 - Scout role cannot request session grant

```
Given an operator authenticated with role = scout
When GET /api/session-grant is called
Then the response is 403 Forbidden with error = 'insufficient_role'
```

### E2E-RBAC-02 - Terminal operator cannot issue a card

```
Given an operator authenticated with role = terminal_operator
When POST /api/cards is called with a valid payload
Then the response is 403 Forbidden with error = 'insufficient_role'
```

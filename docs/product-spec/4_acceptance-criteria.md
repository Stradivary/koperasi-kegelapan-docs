# 4. Acceptance Criteria

Each criterion is tagged with the spec layer it traces to. Test assertions for these criteria belong in Test Spec (Layer 7 - not yet written).

## Offline transaction flow

- [x] **AC-01** - Given a terminal with a valid session grant and a card in `CHECKED_IN` state, when the operator initiates a debit within the hardware limit (Rp 16,000,000), then the balance is decremented on the card via `applyDebit`, a signed log entry is appended with chain hash, and the card is re-encrypted and HMAC-signed — without any backend call.

  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md), [Tech Specs §6 State Machine & Session Rules](../tech-specs/6_state-machine-session-rules.md)

- [x] **AC-02** - Given a terminal with an expired session grant (beyond 24h + 1h drift tolerance), when any write operation is attempted, then `isWriteEligible` returns `eligible: false` with reason "Session grant expired" and the terminal rejects the operation.

  > Traces to: [System Design §12 Key Trust Model](../system-design/12_key-trust-model.md), [Tech Specs §12 Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)

- [x] **AC-03** - Given a terminal that has accumulated offline events, when it reconnects and submits a sync push batch via `POST /api/sync/push`, then the backend accepts all events with valid idempotency keys and non-stale counters. Events with stale counters are rejected individually without blocking the batch. Events breaching policy limits are flagged for review.

  > Traces to: [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)

## Tamper & fraud detection

- [x] **AC-04** - Given a card with any byte modified outside a valid write path, when a terminal or gate reads the card via `readAndValidateCard`, then the HMAC verification fails and the `validateCard` function returns `{ valid: false, reason: "HMAC verification failed", tamper: true }`. The UI escalates the card.

  > Traces to: [System Design §3 Security Model](../system-design/3_security-model.md), [Tech Specs §5 Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md)

- [x] **AC-05** - Given a cloned card (identical byte-for-byte copy of a valid card), when the clone is presented at a second terminal after the original has been used, then the counter-bind mismatch (`counterBindLower !== payload.trailer.counterBind`) causes validation to fail with `tamper: true`.

  > Traces to: [System Design §10 Verification Rules](../system-design/10_verification-rules.md)

- [x] **AC-06** - Given a card with any `BLOCKED_*` status (BLOCKED_TAMPER, BLOCKED_FRAUD, BLOCKED_EXPIRED, BLOCKED_ADMIN), when any write operation is attempted by any app, then `isWriteEligible` rejects with "Card blocked: status=N" and `validateTransition` rejects with "Card is not active". The block enforcement layer (`enforceBlockOnCheckin`/`enforceBlockOnCheckout`) also rejects before any state change.

  > Traces to: [System Design §11 Card Status Enforcement](../system-design/11_card-status-enforcement.md), [Tech Specs §15 Status Codes & Block Rules](../tech-specs/15_status-codes-block-rules.md)

## Member experience

- [x] **AC-07** - Given an authenticated (or anonymous) member using the Scout app, when they tap their card, then the card is read and validated using an anonymous session grant (read-only). Their current balance, transaction log entries, and card status are displayed without any write to the card.

  > Traces to: [System Design §13 Client Roles](../system-design/13_client-roles.md)

- [x] **AC-08** - Given a card that has never been initialized (no valid magic bytes), when scanned by any app, then the NFC classification layer identifies it as `blank` or `corrupted` rather than throwing an error, and the UI displays an appropriate "unactivated card" state.

  > Traces to: [System Design §18 Card Initialisation State](../system-design/18_card-initialisation-state.md)

## Financial limits

- [x] **AC-09** - Given a top-up request exceeding Rp 2,000,000 (`MAX_TOPUP_AMOUNT`) or below Rp 2,000 (`MIN_TOPUP_AMOUNT`), when the station evaluates the transaction via `validateTopup`, then it is rejected with a localized Indonesian error message without touching the card.

  > Traces to: [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)

- [x] **AC-10** - Given a top-up request from any terminal while offline (no backend connectivity), when the operator attempts to load balance, then the operation is blocked because top-up requires a `credit` operation which is only in the `station` and `admin` role's allowed ops, and requires online connectivity (`topupOnlineOnly` policy).

  > Traces to: [3. Constraints - Connectivity](3_constraints.md)

- [x] **AC-10b** - Given a card with balance below Rp 10,000 (`MIN_BALANCE_BEFORE_CHECKIN`), when a gate check-in is attempted, then `validateTransition` rejects with "Insufficient balance for check-in".

  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md)

## Session lifecycle

- [x] **AC-11** - Given a card in `IDLE` state, when a gate tap occurs (trigger: `gate_checkin`), then the card transitions to `CHECKED_IN` via `applyCheckin`, the session start time is recorded, and a log entry with `TxType.CHECKIN` is appended.

  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md)

- [x] **AC-11b** - Given a card in `CHECKED_OUT` state, when a gate tap occurs (trigger: `gate_checkin`), then the card transitions back to `IDLE` (via the CHECKED_OUT → IDLE transition) ready for a fresh session.

  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md)

- [x] **AC-12** - Given a card that has been in `CHECKED_IN` or `STATION_OPERATION` for more than 25 hours (24h timeout + 1h drift tolerance), when any terminal or gate reads the card, then `isSessionExpired` returns true. Only `gate_checkout` and `force_checkout` transitions are still permitted; all other operations are rejected with "Session expired".

  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md)

- [x] **AC-12b** - Given a card in `CHECKED_IN` state, when a checkout occurs via gate (`gate_checkout`) or force (`force_checkout`), then `applyCheckout` calculates the parking fee (hours rounded up × Rp 2,000), decrements the balance, sets state to `CHECKED_OUT`, records end time, and appends a `TxType.CHECKOUT` log entry.

  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md)

## Audit & reconciliation

- [x] **AC-13** - Given any value change committed to a card, when the terminal syncs offline events via `POST /api/sync/push`, then a transaction log entry exists in the backend with tenant ID, card ID, counter value, type, amount, balance after, timestamp, hash, terminal ID, device ID, and idempotency key.

  > Traces to: [System Design §6 Log Chain Model](../system-design/6_log-chain-model.md), [Tech Specs §14 Transaction Log Format](../tech-specs/14_transaction-log-format.md)

- [x] **AC-14** - Given a sync push batch containing a transaction that would breach policy limits, when the backend processes the batch, then the breaching event is individually flagged (`flagged` field) in the transaction log and the operator is notified, but non-breaching events in the same batch are accepted independently.

  > Traces to: [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)

## Tenant & device management

- [x] **AC-15** - Given a superadmin with valid credentials, when they access `GET /api/superadmin/tenants`, then all tenants across the platform are listed with pagination and search support. The superadmin can create, view details, and change status (active/suspended/archived) of any tenant.

  > Traces to: Superadmin API routes

- [x] **AC-16** - Given a superadmin, when they block a device via `POST /api/superadmin/devices/:deviceId/block` with a duration (60s to 365 days), then the device is blocked, all active auth sessions for that device are revoked, and any sync operation from that device is immediately rejected via the `deviceBlockCheck` middleware.

  > Traces to: Device management, Security constraints

- [x] **AC-17** - Given a terminal whose device has been blocked, when it attempts any API call, then the `deviceBlockCheck` middleware rejects the request. On the client side, `isDeviceBlocked()` check prevents sync operations before they start.

  > Traces to: Device management, Security constraints

## Sync & data consistency

- [x] **AC-18** - Given a terminal that has been offline, when connectivity returns and `syncPull` is invoked, then the client fetches members, cards, and transactions updated since the last cursor, merges them into local IndexedDB (skipping entities with pending outbox entries to avoid overwriting local changes), and updates sync cursors.

  > Traces to: Sync system design

- [x] **AC-19** - Given a sync push with a duplicate idempotency key, when the backend processes it, then the duplicate is silently accepted (idempotent) without creating a second record.

  > Traces to: Sync push idempotency

# 4. Acceptance Criteria

Each criterion is tagged with the spec layer it traces to. Test assertions for these criteria belong in Test Spec (Layer 7 - not yet written).

## Offline transaction flow

- [ ] **AC-01** - Given a terminal with a valid session grant and a card in `CHECKED_IN` state, when the operator initiates a debit within the single-transaction limit, then the balance is decremented on the card and a signed log entry is appended, without any backend call.

  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md), [Tech Specs §6 State Machine & Session Rules](../tech-specs/6_state-machine-session-rules.md)

- [ ] **AC-02** - Given a terminal with an expired session grant, when any write operation is attempted, then the terminal rejects the operation and prompts the operator to refresh the grant.

  > Traces to: [System Design §12 Key Trust Model](../system-design/12_key-trust-model.md), [Tech Specs §12 Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)

- [ ] **AC-03** - Given a card that has accumulated offline events, when the terminal reconnects and submits a reconciliation batch, then the backend accepts all events within policy limits and flags any breach for review without blocking the card automatically.
  > Traces to: [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)

## Tamper & fraud detection

- [ ] **AC-04** - Given a card with any byte modified outside a valid write path, when a terminal or gate reads the card, then the cryptographic validation fails and the card is escalated to `BLOCKED_TAMPER` status before any value change is committed.

  > Traces to: [System Design §3 Security Model](../system-design/3_security-model.md), [Tech Specs §5 Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md)

- [ ] **AC-05** - Given a cloned card (identical byte-for-byte copy of a valid card), when the clone is presented at a second terminal, then the monotonic counter mismatch causes the clone to be rejected and flagged as a replay attempt.

  > Traces to: [System Design §10 Verification Rules](../system-design/10_verification-rules.md)

- [ ] **AC-06** - Given a card in `BLOCKED_TAMPER`, `BLOCKED_FRAUD`, or `EXPIRED` status, when any write operation is attempted by any app, then the operation is denied and the card state is not modified.
  > Traces to: [System Design §11 Card Status Enforcement](../system-design/11_card-status-enforcement.md), [Tech Specs §15 Status Codes & Block Rules](../tech-specs/15_status-codes-block-rules.md)

## Member experience

- [ ] **AC-07** - Given an authenticated member using the Scout app, when they tap their card, then their current balance, last 10 transactions, and card status are displayed without any write to the card.

  > Traces to: [System Design §13 Client Roles](../system-design/13_client-roles.md)

- [ ] **AC-08** - Given a card that has never been tapped, when a member taps it in Scout, then the app displays an "unactivated card" state rather than an error.
  > Traces to: [System Design §18 Card Initialisation State](../system-design/18_card-initialisation-state.md)

## Financial limits

- [ ] **AC-09** - Given a debit request exceeding Rp 1,000,000, when the terminal evaluates the transaction, then it is rejected at write time without touching the card.

  > Traces to: [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)

- [ ] **AC-10** - Given a top-up request from a Station terminal while offline, when the operator attempts to load balance, then the operation is blocked with a clear error indicating online connectivity is required.
  > Traces to: [3. Constraints - Connectivity](3_constraints.md)

## Session lifecycle

- [ ] **AC-11** - Given a card in `IDLE` state, when a gate tap occurs, then the card transitions to `CHECKED_IN` and the transition is logged.

  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md)

- [ ] **AC-12** - Given a card that has been in `CHECKED_IN` for more than 24 hours without a `CHECKED_OUT`, when any terminal or gate reads the card, then the session is treated as stale and the operator is prompted to resolve it before proceeding.
  > Traces to: [System Design §4 Card State Machine](../system-design/4_card-state-machine.md)

## Audit & reconciliation

- [ ] **AC-13** - Given any value change committed to a card, when an operator queries the backend audit log, then a signed, sequenced log entry exists for that event with card ID, counter value, amount, timestamp, and hash.

  > Traces to: [System Design §6 Log Chain Model](../system-design/6_log-chain-model.md), [Tech Specs §14 Transaction Log Format](../tech-specs/14_transaction-log-format.md)

- [ ] **AC-14** - Given a reconciliation batch containing an event that would breach the daily limit, when the backend processes the batch, then the breaching event is flagged in the audit log and the operator is notified, but non-breaching events in the same batch are accepted.
  > Traces to: [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)

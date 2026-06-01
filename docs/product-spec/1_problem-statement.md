# 1. Problem Statement

## What breaks today

Cashless payment systems in venue-based environments - transit gates, event spaces, canteens - typically require continuous backend connectivity to process each transaction. When connectivity fails, terminals either block all transactions or fall back to untracked cash. Neither outcome is acceptable for operators who need a reliable, auditable flow.

Standard NFC payment cards (e.g., EMV contactless) rely on a secure element and a network-authorised terminal. This model requires expensive hardware certification and per-transaction network round trips. It is unsuitable for low-cost, high-density deployments in connectivity-constrained environments.

## Who is hurt

- **Members** cannot transact when the terminal is offline, even though they have valid prepaid credit.
- **Operators** lose revenue and audit visibility during connectivity gaps.
- **Reconciliation teams** lack a tamper-evident trail to dispute fraudulent or erroneous offline events.

## Why this system exists

The offline NFC wallet stores **balance, session state, and a tamper-evident log directly on the card**. This allows terminals to authorise transactions without a live backend connection, using cryptographic proofs to bound the trust placed in the card-held state.

The system does not eliminate trust in the backend - it **defers it**. Terminals operate within a backend-issued session grant, and all offline events are reconciled when connectivity returns. Fraud risk is bounded by the session scope and financial limits, not by continuous connectivity.

## Success definition

The system succeeds when:

- A terminal can complete a debit or check-in transaction with no network access and the event is later reconciled without discrepancy.
- Tamper, clone, or replay attempts on a card are detected before any value change is committed.
- A lost or stolen card causes bounded financial exposure within the session grant scope.
- Operators can trace every value change on a card back to a signed, sequenced log entry.

> ⚠️ Downstream impact: any change to the offline-first trust model here requires updates to [System Design §3 Security Model](../system-design/3_security-model.md) and [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md).

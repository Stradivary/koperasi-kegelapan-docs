# 1. Problem Statement

## What breaks today

Cashless payment systems in venue-based environments - parking gates, event spaces, canteens - typically require continuous backend connectivity to process each transaction. When connectivity fails, terminals either block all transactions or fall back to untracked cash. Neither outcome is acceptable for operators who need a reliable, auditable flow.

Standard NFC payment cards (e.g., EMV contactless) rely on a secure element and a network-authorised terminal. This model requires expensive hardware certification and per-transaction network round trips. It is unsuitable for low-cost, high-density deployments in connectivity-constrained environments.

## Who is hurt

- **Members** cannot transact when the terminal is offline, even though they have valid prepaid credit.
- **Operators** lose revenue and audit visibility during connectivity gaps.
- **Koperasi administrators** lack real-time visibility into cross-device operations and cannot enforce policy when terminals are offline.

## Why this system exists

The offline NFC wallet stores **balance, session state, and a tamper-evident log directly on the card** (NTAG215, 496 bytes). This allows terminals to authorise transactions without a live backend connection, using cryptographic proofs (AES-GCM encryption + HMAC integrity + chain hashing) to bound the trust placed in the card-held state.

The system does not eliminate trust in the backend - it **defers it**. Terminals operate within a backend-issued session grant (24-hour lifetime, tenant-scoped deterministic key), and all offline events are reconciled when connectivity returns via cursor-based sync push/pull. Fraud risk is bounded by the session scope, financial limits, and per-tenant policy enforcement at sync time.

## Success definition

The system succeeds when:

- A terminal can complete a debit or check-in transaction with no network access and the event is later reconciled without discrepancy via `POST /api/sync/push`.
- Tamper, clone, or replay attempts on a card are detected before any value change is committed (HMAC failure, counter-bind mismatch, chain hash validation).
- A lost or stolen card causes bounded financial exposure within the hardware and policy limits (max balance Rp 16,000,000 hardware / Rp 5,000,000 policy daily cap).
- Operators can trace every value change on a card back to a signed, sequenced log entry with card ID, counter, amount, balance, timestamp, and chain hash.
- Multiple koperasi tenants operate on the same platform with full cryptographic and data isolation (tenant-bound session keys, FNV-32a tenant bind on card).
- Superadmin can manage the platform cross-tenant: create/suspend tenants, manage accounts, block compromised devices.

> ⚠️ Downstream impact: any change to the offline-first trust model here requires updates to [System Design §3 Security Model](../system-design/3_security-model.md) and [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md).

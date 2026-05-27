# 10. Implementation Notes

## Data layout and compatibility

- Use fixed-size fields on the card for predictable parsing. Do not use variable-length structures.
- All multi-byte integers are little-endian. String fields are null-padded UTF-8 (see [§3](3_card-storage-model.md)).
- Reserve `version` and feature flag fields to allow safe schema upgrades without breaking deployed cards.
- When the card format changes, increment `version` and update the parser to handle both the old and new layout during a migration window.

## Validation and error handling

- Run the full tamper detection sequence (see [§5](5_tamper-detection-validation.md)) on every card read before displaying data or allowing writes.
- Treat any unexpected or invalid card payload as suspicious: log it, show a user-friendly blocked message, and do not write.
- Surface detailed validation failure codes in developer/debug logs; never expose raw cryptographic errors to end users.
- Use specific error types for different failure categories (HMAC fail, counter rollback, chain break, etc.) to simplify debugging and alerting.

## Browser platform notes

- **Web NFC** (`NDEFReader`) is only available in Chrome on Android (as of 2026). Desktop browsers and iOS are not supported. Design the terminal flow to degrade gracefully on unsupported browsers by showing a clear capability error.
- **Web Crypto** (`crypto.subtle`) is widely supported. Use `importKey` + `deriveKey` with HKDF for key derivation and `encrypt`/`decrypt` with AES-GCM for payload operations.
- NFC reads and writes are asynchronous; always await them and handle `AbortError` (e.g., card removed mid-operation) explicitly.
- Browser storage for offline events should use **IndexedDB** for reliability; `localStorage` has size limits and is synchronous.

## Stack guidance

- **Frontend**: use TanStack Start for routing, query caching, and UI state management. Use TanStack Query for API calls and optimistic updates.
- **Backend**: use Nitro APIs for lightweight session grants, policy endpoints, and reconciliation where remote sync is required, but keep the core terminal flow local-first.
- Treat Cloudflare primarily as a static distribution/CDN layer for frontend assets; do not make backend availability a dependency for active terminal transactions.
- See ADR-009 and ADR-012 for browser persistence and Cloudflare distribution guidance.
- Share interface contracts between frontend and backend through common Zod schemas or generated TypeScript types to prevent drift.
- Avoid duplicating card parsing logic; keep a single canonical implementation that both the terminal flow and the member view import.

## Deployment and rollout

- Keep key rotation and session rules in backend control so changes do not require frontend redeploys.
- Roll out card format or API changes in a backward-compatible way: support the old format until all cards are migrated.
- Document every schema and field change in this spec **before** deploying updates.
- Use feature flags or `version`-gated logic to enable new card features without breaking existing cards in the field.

> Note: future enhancement may introduce stronger session and device management, richer reconciliation tracking, and broader offline cache schema evolution.

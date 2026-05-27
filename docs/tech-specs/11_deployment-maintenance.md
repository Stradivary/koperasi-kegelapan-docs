# 11. Deployment & Maintenance

## Card lifecycle

| Stage        | Action                                                                          | Actor              |
| ------------ | ------------------------------------------------------------------------------- | ------------------ |
| Issuance     | Write initial payload with `IDLE` state, zero balance, and current `keyVersion` | Station            |
| Activation   | First check-in transitions card to `CHECKED_IN`                                 | Gate               |
| Top-up       | Station writes new balance; backend validates and logs                          | Station            |
| Re-keying    | Station rewrites card with updated `keyVersion` when key rotation requires it   | Station            |
| Block        | Set status code in identity block on next authenticated write                   | Terminal / Backend |
| Decommission | Mark `BLOCKED_ADMIN`; shred or recycle physical card                            | Operator           |

## Operations

- Reissue cards when `BLOCKED_TAMPER` or `BLOCKED_FRAUD`; do not unblock programmatically.
- Track `keyVersion` per card in the backend to know which cards need re-keying after a key rotation.
- Monitor for elevated rates of tamper events, invalid state transitions, or reconciliation failures from specific terminals.
- Update frontend and terminal logic for new `keyVersion` rules before rotating keys in production.

## Key rotation procedure

1. Generate a new master key version in the backend HSM.
2. Deploy updated backend with the new key version available alongside the old one.
3. Update frontend to accept session grants for both old and new key versions.
4. Schedule a re-keying window during which station terminals rewrite all active cards with the new `keyVersion`.
5. After the migration window, retire the old key version at the backend.

## Deployment checklist

- [ ] Card format changes are reflected in `version` field and documented in [§3](3_card-storage-model.md).
- [ ] API schema changes are documented in [§8](8_backend-frontend-interfaces.md) before merge.
- [ ] New `keyVersion` is available at the backend before any cards are written with it.
- [ ] Frontend and terminal builds are deployed before issuing cards with the new layout.
- [ ] Reconciliation queue is flushed before a backend migration that changes event schemas.

## Rollback

- If a card format change causes widespread validation failures, the backend can serve the old session grant format while the frontend is rolled back.
- Keep at least one previous card format version parseable by the frontend for a minimum of 90 days after a layout change.
- Backend API versioning (`/v1/`, `/v2/`) should be used for breaking interface changes to allow gradual frontend rollover.

## Monitoring

- Alert on: tamper event rate > 0.1% of daily taps, reconciliation failure rate > 1%, expired session grant usage, and terminal authentication failures.
- Log every block event with `cardId`, `reason`, `terminalId`, and `timestamp` for audit.
- Maintain an audit trail of all issuance, block, and key rotation events for at least 2 years.

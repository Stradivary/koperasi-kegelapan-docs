# Security Spec Index

This folder defines **what is trusted, what is protected, and how threats are mitigated** for the offline NFC wallet system.

> Security Spec is Layer 6. It depends on Tech Specs (Layer 3) for behaviour rules, API Spec (Layer 4) for interface contracts, and Data Spec (Layer 5) for storage boundaries.

> ⚠️ This spec is aligned with the **code-frozen implementation** as of June 2026. Features described as "not yet implemented" represent aspirational security enhancements.

## Sections

1. [Overview](1_overview.md) — threat model, trust boundaries, security goals
2. [Authentication & Authorization](2_authentication-authorization.md) — password auth, device fingerprinting, tenant-scoped RBAC, token lifecycle
3. [Cryptographic Controls](3_cryptographic-controls.md) — AES-GCM, HMAC-SHA256, HKDF, PBKDF2, nonce policy, key lifecycle
4. [Card Tamper Detection](4_card-tamper-detection.md) — validation sequence, security events, incident response
5. [Offline Trust Model](5_offline-trust-model.md) — session grant security, replay protection, bounding offline exposure
6. [Data Protection](6_data-protection.md) — storage classification, PII minimisation, IndexedDB security, tenant isolation
7. [Financial Risk Controls](7_financial-risk-controls.md) — limit enforcement chain, monitoring, fraud signals

## Upstream sources

- System Design §3: [Security Model](../system-design/3_security-model.md)
- System Design §12: [Key Trust Model](../system-design/12_key-trust-model.md)
- Tech Specs §4: [Cryptography](../tech-specs/4_cryptography.md)
- Tech Specs §5: [Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md)
- Tech Specs §12: [Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)
- Data Spec §5: [Multitenancy, Auth & Local-first Storage](../data-spec/5_multitenancy-auth-local-first.md)
- API Spec §2: [Authentication](../api-spec/2_auth.md)

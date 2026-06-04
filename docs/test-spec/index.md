# Test Spec Index

This folder defines **what proves correctness** for the offline NFC wallet system. Every test assertion traces to a spec claim from Layers 1–6.

> Test Spec is Layer 7. It depends on all layers above it. A failing test indicates either a defect in the implementation or a gap in the upstream spec.

## Sections

1. [Overview](1_overview.md) - testing philosophy, test types, tooling, environments, coverage requirements
2. [Unit Tests](2_unit-tests.md) - cryptographic primitives, validation sequence, state machine, financial limits, local-first outbox, auth token verification
3. [E2E Tests](3_e2e-tests.md) - offline transaction flow, tamper detection, session lifecycle, sync push/pull, tenant isolation, auth flows

## Spec coverage matrix

| Spec layer                                                                          | Covered by                                                               |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [Product Spec §4](../product-spec/4_acceptance-criteria.md) Acceptance Criteria     | E2E tests - all 19 acceptance criteria have a corresponding E2E scenario |
| [System Design §3](../system-design/3_security-model.md) Security Model             | Unit tests (crypto, tamper); E2E tests (tamper, session expiry)          |
| [Tech Specs §4](../tech-specs/4_cryptography.md) Cryptography                       | Unit tests - key derivation, HMAC, nonce, AES-GCM                        |
| [Tech Specs §5](../tech-specs/5_tamper-detection-validation.md) Tamper Detection    | Unit tests - each of the 10 validation steps; E2E - tamper scenario      |
| [Tech Specs §6](../tech-specs/6_state-machine-session-rules.md) State Machine       | Unit tests - each transition; E2E - session lifecycle                    |
| [Tech Specs §9](../tech-specs/9_risk-financial-limits.md) Risk Limits               | Unit tests - limit enforcement; E2E - limit breach behaviour             |
| [API Spec §2](../api-spec/2_auth.md) Authentication                                 | E2E - auth flow, tenant switching, token rotation                        |
| [Data Spec §5](../data-spec/5_multitenancy-auth-local-first.md) Local-first Storage | Unit tests - outbox, checkpoint, snapshot stores                         |
| [Security Spec §2](../security-spec/2_authentication-authorization.md) Auth & AuthZ | E2E - RBAC enforcement, cross-tenant access attempt                      |
| [Security Spec §4](../security-spec/4_card-tamper-detection.md) Tamper Detection    | E2E - tamper report flow                                                 |
| [Security Spec §7](../security-spec/7_financial-risk-controls.md) Financial Risk    | E2E - limit breach flagging and operator notification                    |

## Upstream sources

- Product Spec §4: [Acceptance Criteria](../product-spec/4_acceptance-criteria.md)
- Tech Specs §5: [Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md)
- Security Spec: [docs/security-spec/](../security-spec/index.md)

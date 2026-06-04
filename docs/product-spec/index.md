# Product Spec Index

This folder defines **what the offline NFC wallet must do and why** — from the perspective of users, operators, and the business. It is the authoritative source for acceptance criteria and scope boundaries.

> Product spec focuses on goals and constraints. System Design (Layer 2) and Tech Specs (Layer 3) explain how those goals are achieved.

> ⚠️ This spec is aligned with the **code-frozen implementation** as of June 2026. Any future changes to the implementation should be reflected here.

## Sections

1. [Problem Statement](1_problem-statement.md) — Why the system exists and what it solves
2. [Users & Roles](2_users-and-roles.md) — 6 roles: member, admin, terminal, gate, station, superadmin
3. [Constraints](3_constraints.md) — Hardware, financial, connectivity, security, state, and multi-tenancy constraints
4. [Acceptance Criteria](4_acceptance-criteria.md) — 19 testable acceptance criteria covering offline flow, tamper detection, financial limits, session lifecycle, audit, tenant management, and sync
5. [Out of Scope](5_out-of-scope.md) — Explicit exclusions (EMV, native apps, KYC, real-time fraud, multi-currency, P2P, weekly limits)

## Downstream layers

- System Design: [docs/system-design/](../system-design/index.md)
- Tech Specs: [docs/tech-specs/](../tech-specs/index.md)

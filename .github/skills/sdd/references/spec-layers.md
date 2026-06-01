# Spec Layers - Definitions, Templates, and Folder Conventions

---

## Layer 1 - Product Spec

**Purpose**: Defines what must exist and why. Written from the user/business perspective.  
**Audience**: All stakeholders, PMs, developers, QA.  
**Folder**: `docs/product-spec/`

### Must Answer

- What problem does this solve?
- Who are the users and what are their roles?
- What are the hard constraints (regulatory, physical, financial)?
- What does success look like (acceptance criteria)?

### Template

```markdown
# [Feature / System Name] - Product Spec

## Problem Statement

[One paragraph: what breaks, who is hurt, why it matters]

## Users & Roles

| Role | Description | Trust Level |
| ---- | ----------- | ----------- |
| ...  | ...         | ...         |

## Constraints

- [Hard constraint 1]
- [Hard constraint 2]

## Acceptance Criteria

- [ ] Given [context], when [action], then [outcome]
- [ ] ...

## Out of Scope

- [Explicitly excluded feature]
```

---

## Layer 2 - System Design

**Purpose**: Conceptual model of how the system works. Hardware constraints, state machines, security assumptions, trust model.  
**Audience**: Architects, senior engineers.  
**Folder**: `docs/system-design/`

### Must Answer

- What are the physical/hardware constraints?
- What states can the system be in?
- What is the threat model and trust hierarchy?
- What are the key design trade-offs?

### Template

```markdown
# [Component] - System Design

## Objective

[One sentence: what this component achieves]

## Constraints

- [Hardware / platform constraint]
- [Environmental / deployment constraint]

## State Model

| State | Description | Transitions |
| ----- | ----------- | ----------- |
| ...   | ...         | ...         |

## Trust Model

- Trusted: [list]
- Untrusted: [list]
- Conditionally trusted: [list]

## Design Decisions

| Decision | Rationale | Trade-off |
| -------- | --------- | --------- |
| ...      | ...       | ...       |
```

---

## Layer 3 - Tech Specs

**Purpose**: Implementation reference. Exact behavior, rules, error handling, formats.  
**Audience**: Developers building the system.  
**Folder**: `docs/tech-specs/`

### Must Answer

- What does each function/module do precisely?
- What are the input/output contracts?
- What are the error states and recovery paths?
- What are the performance and safety limits?

### Template

```markdown
# [Module / Feature] - Tech Spec

## Overview

[Brief: what this spec covers]

## Behavior

### [Sub-feature]

- Input: [type, constraints]
- Output: [type, guarantees]
- Errors: [conditions → responses]

## Rules

1. [Invariant or business rule]
2. ...

## Limits

| Parameter | Value | Rationale |
| --------- | ----- | --------- |
| ...       | ...   | ...       |
```

---

## Layer 4 - API Spec

**Purpose**: Contract between services (frontend ↔ backend, backend ↔ card, service ↔ service).  
**Audience**: Frontend and backend developers.  
**Folder**: `docs/api-spec/`

### Must Answer

- What endpoints/operations exist?
- What are the request/response schemas?
- What auth is required?
- What errors can be returned?

### Template

````markdown
# [Service] API Spec

## Base URL

`/api/v1/`

## Authentication

[Session token / HMAC / none - and how it is obtained]

## Endpoints

### POST /[resource]

**Purpose**: [one line]

**Request**

```json
{
  "field": "type - description"
}
```
````

**Response 200**

```json
{
  "field": "type - description"
}
```

**Errors**
| Code | Condition |
|------|-----------|
| 400 | [reason] |
| 403 | [reason] |
| 409 | [reason] |

````

---

## Layer 5 - Data Spec

**Purpose**: What is stored, where, and in what format. Schemas, layouts, migrations.
**Audience**: Backend developers, DB admins, embedded/card developers.
**Folder**: `docs/data-spec/`

### Must Answer
- What entities exist and what fields do they have?
- What are the storage constraints (size, encoding)?
- How does data evolve over versions?
- What is the canonical serialization format?

### Template

```markdown
# [Entity / Storage Area] - Data Spec

## Overview
[Where this data lives and who owns it]

## Schema

| Field | Type | Size | Description | Constraints |
|-------|------|------|-------------|-------------|
| ...   | ...  | ...  | ...         | ...         |

## Encoding
[Binary layout / JSON schema / SQL DDL]

## Versioning
| Version | Change | Migration |
|---------|--------|-----------|
| v1      | initial | -        |
| v2      | added X | [steps]  |
````

---

## Layer 6 - Security Spec

**Purpose**: What is trusted, what is protected, and how. Threat model, auth flows, OWASP mitigations.  
**Audience**: Security reviewers, architects, developers.  
**Folder**: `docs/security-spec/`

### Must Answer

- What are the threat actors and attack vectors?
- What cryptographic primitives are used and why?
- What data must be protected at rest and in transit?
- How are keys managed and rotated?
- Which OWASP Top 10 risks are mitigated and how?

### Template

```markdown
# [System] - Security Spec

## Threat Actors

| Actor | Capability | Motivation |
| ----- | ---------- | ---------- |
| ...   | ...        | ...        |

## Attack Vectors & Mitigations

| Attack | Vector | Mitigation | Residual Risk |
| ------ | ------ | ---------- | ------------- |
| ...    | ...    | ...        | ...           |

## Cryptographic Primitives

| Purpose | Algorithm | Key Size | Rationale |
| ------- | --------- | -------- | --------- |
| ...     | ...       | ...      | ...       |

## Key Management

- Key derivation: [method]
- Key storage: [location, protection]
- Rotation policy: [trigger, process]

## OWASP Coverage

| Risk                      | Applies | Mitigation |
| ------------------------- | ------- | ---------- |
| A01 Broken Access Control | Y/N     | ...        |
| A02 Crypto Failures       | Y/N     | ...        |
| A03 Injection             | Y/N     | ...        |
| A04 Insecure Design       | Y/N     | ...        |
| A07 Auth Failures         | Y/N     | ...        |
```

---

## Layer 7 - Test Spec

**Purpose**: What proves the system is correct. Assertions mapped to spec claims.  
**Audience**: QA, developers, CI owners.  
**Folder**: `docs/test-spec/`

### Must Answer

- What does each test verify (linked to which spec claim)?
- What are the preconditions and expected outcomes?
- What are the edge and failure cases?
- What is the coverage target?

### Template

```markdown
# [Feature] - Test Spec

## Coverage Targets

- Unit: [%]
- Integration: [%]
- E2E: [critical paths listed]

## Test Cases

### TC-[NNN]: [Short description]

- **Spec reference**: [Layer N, §section]
- **Precondition**: [system state before]
- **Action**: [what triggers the test]
- **Expected**: [exact outcome]
- **Edge cases**: [variations]
```

---

## Cross-cutting - ADRs (Architecture Decision Records)

**Purpose**: Record significant decisions, their context, and consequences.  
**Folder**: `docs/adr/`

### Template

```markdown
# ADR-[NNN]: [Decision Title]

**Date**: YYYY-MM-DD  
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-NNN

## Context

[What situation forced this decision]

## Decision

[What was decided]

## Consequences

- Positive: [...]
- Negative: [...]
- Risks: [...]

## Alternatives Considered

| Option | Reason Rejected |
| ------ | --------------- |
| ...    | ...             |
```

---

## Folder Scaffold (_category_.json)

Each `docs/` subfolder needs a `_category_.json` for Docusaurus:

```json
{
  "label": "Layer Name",
  "position": N,
  "link": {
    "type": "doc",
    "id": "folder-name/index"
  }
}
```

Positions:

1. `product-spec` → 1
2. `system-design` → 2
3. `tech-specs` → 3
4. `api-spec` → 4
5. `data-spec` → 5
6. `security-spec` → 6
7. `test-spec` → 7
8. `adr` → 8

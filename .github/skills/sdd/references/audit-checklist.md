# SDD Audit Checklist

Use this checklist to audit spec coverage for any feature or system.

## Per-Layer Audit Questions

### Layer 1 - Product Spec

- [ ] Is the problem statement written from the user's perspective?
- [ ] Are all roles and trust levels listed?
- [ ] Are hard constraints (financial, physical, regulatory) explicit?
- [ ] Does each acceptance criterion follow Given/When/Then?
- [ ] Is "Out of Scope" explicitly stated?

### Layer 2 - System Design

- [ ] Are hardware/platform constraints documented?
- [ ] Is the full state machine drawn out (states + transitions)?
- [ ] Is the trust model explicit (trusted / untrusted / conditional)?
- [ ] Are key design trade-offs recorded with rationale?
- [ ] Do design decisions reference Product Spec constraints?

### Layer 3 - Tech Specs

- [ ] Does every module have input/output contracts?
- [ ] Are all error states and recovery paths documented?
- [ ] Are numeric limits (sizes, counts, timeouts) listed with rationale?
- [ ] Does each rule trace back to System Design?

### Layer 4 - API Spec

- [ ] Is every endpoint documented (method, path, auth, request, response)?
- [ ] Are all error codes enumerated with conditions?
- [ ] Does every field have a type and constraint?
- [ ] Is versioning strategy stated?

### Layer 5 - Data Spec

- [ ] Is every stored entity schematized (fields, types, sizes)?
- [ ] Is the serialization format canonical and documented?
- [ ] Are migration paths defined for schema changes?
- [ ] Does every field map to a Tech Spec rule?

### Layer 6 - Security Spec

- [ ] Are threat actors and capabilities listed?
- [ ] Is every cryptographic primitive justified?
- [ ] Is key lifecycle (creation, storage, rotation, revocation) documented?
- [ ] Are relevant OWASP Top 10 risks assessed?

### Layer 7 - Test Spec

- [ ] Does every acceptance criterion (Layer 1) have a test case?
- [ ] Does every Tech Spec rule have at least one test assertion?
- [ ] Are edge/failure cases tested?
- [ ] Are coverage targets defined?

## Cross-cutting

- [ ] Are ADRs written for every significant decision?
- [ ] Do lower-layer specs reference the layer above them?
- [ ] Are stale sections marked with `> ⚠️ Stale - updated in [ref]`?
- [ ] Does each folder have an `index.md` with a table of contents?

## Status Key

| Symbol | Meaning                                       |
| ------ | --------------------------------------------- |
| ✅     | Complete - all checklist items pass           |
| ⚠️     | Partial - exists but gaps identified          |
| ❌     | Missing - layer does not exist for this scope |
| 🚧     | Draft - in progress, marked at top of doc     |

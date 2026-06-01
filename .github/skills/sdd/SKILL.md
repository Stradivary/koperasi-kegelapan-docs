---
name: sdd
description: "Spec Driven Development (SDD) skill. Use when: writing specs, creating system design, writing tech specs, writing product requirements, writing API specs, writing data schemas, writing security specs, writing test specs, writing ADRs, auditing missing specs, reviewing spec coverage, generating code from specs, ensuring spec consistency, spec-first development, documentation-driven development."
argument-hint: "What to spec: a feature, system, or gap audit"
---

# Spec Driven Development (SDD)

SDD means every implementation decision traces back to a written spec. Code is never ahead of the spec - the spec is the source of truth.

## Spec Layer Hierarchy

There are **7 layers** of spec. Each layer depends on the one above it. Code is always the last layer.

```
1. Product Spec        → What must exist and why (user goals, constraints)
2. System Design       → How the system thinks (model, state, trust, architecture)
3. Tech Specs          → How the system behaves (interfaces, formats, rules)
4. API Spec            → Contract between services (endpoints, payloads, errors)
5. Data Spec           → What is stored and how (schemas, layouts, migrations)
6. Security Spec       → What is trusted and protected (threats, auth, mitigations)
7. Test Spec           → What proves correctness (assertions mapped to spec claims)
```

> Deployment and ADRs are cross-cutting and can appear at any layer.

See [spec-layers.md](./references/spec-layers.md) for full definitions and templates per layer.

---

## Workflow

### Step 1 - Audit Existing Specs

Scan the workspace for spec coverage across all 7 layers. Report a table:

| Layer         | Status                       | Location | Gaps  |
| ------------- | ---------------------------- | -------- | ----- |
| Product Spec  | ✅ / ⚠️ partial / ❌ missing | path     | notes |
| System Design | ...                          |          |       |
| Tech Specs    | ...                          |          |       |
| API Spec      | ...                          |          |       |
| Data Spec     | ...                          |          |       |
| Security Spec | ...                          |          |       |
| Test Spec     | ...                          |          |       |

Use the folder conventions from [spec-layers.md](./references/spec-layers.md).

### Step 2 - Identify the Target

From the user's argument (feature, system, gap):

- Determine which layers are needed for this scope.
- Identify which layers have **conflicting or stale** content.
- List which layers are **missing entirely**.

### Step 3 - Write Specs Top-Down

Always write (or update) from Layer 1 downward. Never write a lower layer without its parent.

For each layer to write:

1. Load the template from [spec-layers.md](./references/spec-layers.md)
2. Extract constraints from the layer above
3. Draft the spec section by section
4. Cross-link down to dependent layers (e.g., "See Tech Spec §4")
5. Mark `> ⚠️ Downstream impact:` where a change invalidates lower specs

### Step 4 - Consistency Check

After writing, verify:

- [ ] Every claim in Layer N is traceable to a Layer N-1 source
- [ ] Every interface in Tech Specs has a matching entry in API Spec
- [ ] Every stored field in Data Spec appears in Tech Specs
- [ ] Every security assumption in Security Spec is listed in System Design
- [ ] Every acceptance criterion in Product Spec has a Test Spec assertion

### Step 5 - Code Generation Gate

Before generating any code:

- Confirm Layers 1–3 exist for the feature
- Confirm the relevant Data Spec and API Spec entries exist
- If gaps remain, **write the spec first**, then generate code

---

## Folder Conventions (this workspace)

```
docs/
  product-spec/         # Layer 1
  system-design/        # Layer 2
  tech-specs/           # Layer 3
  api-spec/             # Layer 4
  data-spec/            # Layer 5
  security-spec/        # Layer 6
  test-spec/            # Layer 7
  adr/                  # Cross-cutting decisions
```

Each folder should have:

- `index.md` - table of contents + purpose statement
- `_category_.json` - Docusaurus sidebar config
- Numbered files: `1_topic.md`, `2_topic.md`, ...

---

## Section Numbering Convention

Follow the pattern already established in this workspace:

```
1_overview.md
2_<first-major-topic>.md
...
N_<last-topic>.md
index.md
```

Titles use sentence case. File names use kebab-case with numeric prefix.

---

## Quality Gates

A spec is **complete** when it answers:

- **Who** uses this (roles, trust level)
- **What** it does (behavior, not implementation)
- **Why** it exists (constraints, goals)
- **How** it fails (error cases, edge cases)
- **What** proves it works (test assertions or acceptance criteria)

A spec is **draft** if any of the above are missing. Mark drafts with `> 🚧 Draft - missing: [list]` at the top.

---

## Output Format - Recommendations via Interactive Prompt

After EVERY response (audit, write, consistency check, or any step), always call the `vscode_askQuestions` tool to present a "What's next?" prompt to the user.

Use this exact tool call pattern:

```
vscode_askQuestions({
  questions: [
    {
      header: "What's next?",
      question: "Choose the next action:",
      options: [
        { label: "<short verb phrase>", description: "@sdd <full ready-to-run prompt>" },
        ...
      ],
      allowFreeformInput: true
    }
  ]
})
```

Rules for generating the "What's next?" options:

1. Always include 3–5 options, ordered by recommended priority (most important first).
2. Derive options from the actual gaps or outputs of the current response - never use generic placeholders.
3. The `label` should be a short verb phrase (e.g., "Write Product Spec", "Add ADR for A/B buffer").
4. The `description` must be a complete, ready-to-run `@sdd` prompt the user can copy and run.
5. Include one "Run consistency check" option if any spec layer was just written or updated.
6. Always include a "Re-run audit" option as the last choice.

### Example (after an audit)

```
vscode_askQuestions({
  questions: [
    {
      header: "What's next?",
      question: "Choose the next action:",
      options: [
        { label: "Write Product Spec", description: "@sdd write product spec for NFC wallet" },
        { label: "Write Test Spec", description: "@sdd write test spec for card tamper validation" },
        { label: "Write ADR for A/B buffer", description: "@sdd write ADR for A/B buffer write strategy" },
        { label: "Write Security Spec", description: "@sdd write security spec for NFC wallet with OWASP coverage" },
        { label: "Re-run audit", description: "@sdd audit" }
      ],
      allowFreeformInput: true
    }
  ]
})
```

---

## Example Prompts

- `@sdd audit` - Run Step 1 and report spec coverage
- `@sdd write product spec for [feature]` - Layer 1 for a feature
- `@sdd write API spec for [endpoint]` - Layer 4 for an interface
- `@sdd check consistency` - Run Step 4 across all existing layers
- `@sdd write ADR for [decision]` - Document an architecture decision

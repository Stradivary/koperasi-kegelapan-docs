# Koperasi Kegelapan NFC Wallet — Documentation

Offline NFC wallet system — system design and technical specifications, built with [Docusaurus](https://docusaurus.io/) and authored using [Spec Driven Development (SDD)](#spec-driven-development-sdd).

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Docusaurus Commands](#docusaurus-commands)
- [Spec Driven Development (SDD)](#spec-driven-development-sdd)
  - [Spec Layer Hierarchy](#spec-layer-hierarchy)
  - [Using the @sdd Skill](#using-the-sdd-skill)
  - [SDD Workflow](#sdd-workflow)
  - [Quality Gates](#quality-gates)
- [Contributing](#contributing)

---

## Getting Started

### Prerequisites

- Node.js >= 20
- [Yarn](https://yarnpkg.com/)

### Installation

```bash
yarn install
```

### Local Development

```bash
yarn start
```

Opens a local dev server at `http://localhost:3000` with live reload.

### Production Build

```bash
yarn build
```

Generates a static site into the `build/` directory.

### Serve Production Build Locally

```bash
yarn serve
```

---

## Project Structure

```
docs/
  product-spec/       # Layer 1 — What must exist and why
  system-design/      # Layer 2 — How the system thinks
  tech-specs/         # Layer 3 — How the system behaves
  api-spec/           # Layer 4 — Service contracts
  data-spec/          # Layer 5 — Storage schemas and layouts
  adr/                # Architecture Decision Records (cross-cutting)
src/
  css/                # Custom Docusaurus theme styles
docusaurus.config.js  # Site configuration
sidebars.js           # Sidebar navigation config
```

Each spec folder follows this convention:

| File                          | Purpose                               |
| ----------------------------- | ------------------------------------- |
| `index.md`                    | Table of contents + purpose statement |
| `_category_.json`             | Docusaurus sidebar display config     |
| `1_topic.md`, `2_topic.md`, … | Numbered spec documents               |

---

## Docusaurus Commands

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `yarn start`              | Start local dev server with hot reload |
| `yarn build`              | Build static site to `build/`          |
| `yarn serve`              | Serve the built site locally           |
| `yarn clear`              | Clear Docusaurus cache                 |
| `yarn write-translations` | Extract translatable strings           |
| `yarn write-heading-ids`  | Add explicit heading IDs to all docs   |

---

## Spec Driven Development (SDD)

This repository uses **Spec Driven Development** — every implementation decision traces back to a written spec. Code is never ahead of the spec; the spec is the source of truth.

### Spec Layer Hierarchy

There are **7 layers** of spec. Each layer depends on the one above it. Code is always the last layer.

```
1. Product Spec     → What must exist and why (user goals, constraints)
2. System Design    → How the system thinks (model, state, trust, architecture)
3. Tech Specs       → How the system behaves (interfaces, formats, rules)
4. API Spec         → Contract between services (endpoints, payloads, errors)
5. Data Spec        → What is stored and how (schemas, layouts, migrations)
6. Security Spec    → What is trusted and protected (threats, auth, mitigations)
7. Test Spec        → What proves correctness (assertions mapped to spec claims)
```

> ADRs are cross-cutting and can appear at any layer.

---

### Using the @sdd Skill

This repo ships a GitHub Copilot **`@sdd` skill** in `.github/skills/sdd/`. Invoke it in VS Code Copilot Chat to audit, write, or review specs.

#### Example prompts

| Goal                    | Prompt                                                    |
| ----------------------- | --------------------------------------------------------- |
| Audit all spec layers   | `@sdd audit all spec layers for the NFC wallet system`    |
| Write a missing spec    | `@sdd write the security spec for the key trust model`    |
| Check spec consistency  | `@sdd consistency check between tech-specs and api-spec`  |
| Write a new ADR         | `@sdd write an ADR for switching from AES-CBC to AES-GCM` |
| Review a single layer   | `@sdd review system-design for gaps`                      |
| Generate code from spec | `@sdd generate code — confirm layers 1–5 exist first`     |

#### When to use @sdd

- Writing a new feature? Run the audit first to find which layers need updating.
- Adding an API endpoint? The API Spec and Data Spec must exist before any code.
- Changing a security assumption? Update System Design → Tech Specs → Security Spec in order.
- Unsure where to start? `@sdd audit all spec layers` gives you a full coverage table.

---

### SDD Workflow

#### 1. Audit existing specs

Run `@sdd audit all spec layers` to get a coverage table:

| Layer         | Status                       | Location              | Gaps |
| ------------- | ---------------------------- | --------------------- | ---- |
| Product Spec  | ✅ / ⚠️ partial / ❌ missing | `docs/product-spec/`  | —    |
| System Design | …                            | `docs/system-design/` | —    |
| Tech Specs    | …                            | `docs/tech-specs/`    | —    |
| API Spec      | …                            | `docs/api-spec/`      | —    |
| Data Spec     | …                            | `docs/data-spec/`     | —    |
| Security Spec | …                            | `docs/security-spec/` | —    |
| Test Spec     | …                            | `docs/test-spec/`     | —    |

#### 2. Write specs top-down

Always write (or update) from Layer 1 downward. Never write a lower layer without its parent in place.

```
Product Spec → System Design → Tech Specs → API Spec → Data Spec → Security Spec → Test Spec
```

#### 3. Consistency check before code

Before any code is generated:

- Layers 1–3 must exist for the feature.
- The relevant Data Spec and API Spec entries must exist.
- If gaps remain → write the spec first, then generate code.

---

### Quality Gates

A spec is **complete** when it answers all five questions:

| Question           | Must answer                            |
| ------------------ | -------------------------------------- |
| **Who**            | Roles and trust level                  |
| **What**           | Behavior, not implementation           |
| **Why**            | Constraints and goals                  |
| **How it fails**   | Error cases and edge cases             |
| **What proves it** | Test assertions or acceptance criteria |

A spec is **draft** if any of the above are missing. Mark drafts with:

```md
> 🚧 Draft — missing: [list what is missing]
```

---

## Contributing

1. Fork the repository and create a feature branch.
2. Run `@sdd audit all spec layers` before making any spec changes.
3. Write or update specs **top-down** (see [SDD Workflow](#sdd-workflow)).
4. Run `yarn build` to validate all links and markdown before submitting a PR.
5. Add or update an ADR in `docs/adr/` if a significant architectural decision was made.

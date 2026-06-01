---
name: sdd-implementor
description: "Spec Driven Implementor skill. Use when: generating frontend code from specs, generating backend code from specs, implementing MVVM, implementing SOLID principles, applying design patterns, applying architecture patterns, scaffolding repositories, scaffolding services, scaffolding ViewModels, mapping data specs to models, mapping API specs to controllers, implementing Clean Architecture, implementing Hexagonal Architecture, implementing CQRS, implementing Repository Pattern, implementing Observer pattern, implementing Factory pattern, implementing Strategy pattern, code generation from spec, spec to code, spec to class, spec to interface, spec to component."
argument-hint: "Spec layer, feature name, or pattern to apply (e.g. 'auth flow', 'MVVM for card screen', 'backend repo layer')"
---

# Spec Driven Implementor (SDD → Code)

This skill bridges the SDD spec hierarchy into working frontend and backend code. Every class, interface, and component must trace to a spec claim. Code is never ahead of the spec.

> Prerequisite: Run the `sdd` skill first if specs are missing or incomplete.

---

## Design Pattern Subskills

Each subskill maps to a reference file. Load the relevant one before generating code.

### Frontend Patterns

| Subskill      | Trigger Words                                                              | Reference                                                                        |
| ------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| MVVM (hooks)  | ViewModel, data binding, reactive state, custom hook, useViewModel         | [./references/patterns/mvvm.md](./references/patterns/mvvm.md)                   |
| Flux / Redux  | Store, action, reducer, dispatcher, unidirectional data flow, RTK, Zustand | [./references/patterns/flux-redux.md](./references/patterns/flux-redux.md)       |
| Atomic Design | Atoms, molecules, organisms, templates, design system, component library   | [./references/patterns/atomic-design.md](./references/patterns/atomic-design.md) |
| React Query   | Server state, data fetching, cache, stale, mutation, TanStack              | [./references/patterns/react-query.md](./references/patterns/react-query.md)     |

### Backend Patterns

| Subskill               | Trigger Words                                                              | Reference                                                                                  |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Clean Architecture     | Use cases, entities, interface adapters, frameworks layer, dependency rule | [./references/patterns/clean-architecture.md](./references/patterns/clean-architecture.md) |
| Hexagonal Architecture | Ports, adapters, domain, driven, driving                                   | [./references/patterns/hexagonal.md](./references/patterns/hexagonal.md)                   |
| Repository Pattern     | Data access abstraction, IRepository, unit of work, ORM                    | [./references/patterns/repository.md](./references/patterns/repository.md)                 |
| CQRS                   | Command, query, read model, write model, separate handlers                 | [./references/patterns/cqrs.md](./references/patterns/cqrs.md)                             |
| Event Sourcing         | Event store, aggregate, replay, append-only log                            | [./references/patterns/event-sourcing.md](./references/patterns/event-sourcing.md)         |
| Service Layer          | Application service, domain service, orchestration                         | [./references/patterns/service-layer.md](./references/patterns/service-layer.md)           |

### Cross-Cutting Design Principles

| Subskill             | Trigger Words                                                                           | Reference                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SOLID                | Single responsibility, open/closed, Liskov, interface segregation, dependency inversion | [./references/principles/solid.md](./references/principles/solid.md)                               |
| DRY / KISS / YAGNI   | Don't repeat, keep simple, you aren't gonna need it                                     | [./references/principles/dry-kiss-yagni.md](./references/principles/dry-kiss-yagni.md)             |
| Dependency Injection | IoC container, constructor injection, interface binding                                 | [./references/principles/dependency-injection.md](./references/principles/dependency-injection.md) |

### GoF (Gang of Four) Patterns

| Subskill                   | Category   | Trigger Words                                       | Reference                                                                                  |
| -------------------------- | ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Factory / Abstract Factory | Creational | create object, factory method, abstract factory     | [./references/gof/factory.md](./references/gof/factory.md)                                 |
| Builder                    | Creational | step by step construction, fluent builder           | [./references/gof/builder.md](./references/gof/builder.md)                                 |
| Singleton                  | Creational | single instance, global access                      | [./references/gof/singleton.md](./references/gof/singleton.md)                             |
| Adapter                    | Structural | wrapper, incompatible interface, legacy integration | [./references/gof/adapter.md](./references/gof/adapter.md)                                 |
| Decorator                  | Structural | wrapping behavior, middleware, chain                | [./references/gof/decorator.md](./references/gof/decorator.md)                             |
| Facade                     | Structural | simplify interface, subsystem, wrapper              | [./references/gof/facade.md](./references/gof/facade.md)                                   |
| Proxy                      | Structural | lazy loading, access control, logging wrapper       | [./references/gof/proxy.md](./references/gof/proxy.md)                                     |
| Observer                   | Behavioral | event, listener, subscription, reactive, pub/sub    | [./references/gof/observer.md](./references/gof/observer.md)                               |
| Strategy                   | Behavioral | interchangeable algorithm, policy, swappable        | [./references/gof/strategy.md](./references/gof/strategy.md)                               |
| Command                    | Behavioral | encapsulate request, undo/redo, queue               | [./references/gof/command.md](./references/gof/command.md)                                 |
| State                      | Behavioral | state machine, transition, lifecycle                | [./references/gof/state.md](./references/gof/state.md)                                     |
| Chain of Responsibility    | Behavioral | pipeline, middleware, handler chain                 | [./references/gof/chain-of-responsibility.md](./references/gof/chain-of-responsibility.md) |
| Template Method            | Behavioral | algorithm skeleton, override steps                  | [./references/gof/template-method.md](./references/gof/template-method.md)                 |
| Iterator                   | Behavioral | traverse collection, cursor                         | [./references/gof/iterator.md](./references/gof/iterator.md)                               |

---

## Workflow

### Step 1 - Read the Spec

Load the relevant spec layers for the feature scope:

```
Layer 1 → Product Spec      docs/product-spec/
Layer 2 → System Design     docs/system-design/
Layer 3 → Tech Specs        docs/tech-specs/
Layer 4 → API Spec          docs/api-spec/
Layer 5 → Data Spec         docs/data-spec/
Layer 6 → Security Spec     docs/security-spec/
```

Extract:

- **Entities / models** from Data Spec and Tech Specs
- **Interfaces / contracts** from API Spec and Tech Specs
- **Behavioral rules** from System Design (state machine, trust model)
- **Constraints** from Product Spec and Security Spec

### Step 2 - Choose Architecture Pattern

Ask or infer from the user's argument which pattern stack to apply:

| Stack                  | Recommended Pattern                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| React SPA (Vite / CRA) | Flux/Redux (RTK) + Atomic Design + Repository hook layer                                                                                |
| TanStack Start         | React Query + TanStack Router + Repository + SOLID - see [./references/stacks/tanstack-start.md](./references/stacks/tanstack-start.md) |
| Next.js full-stack     | React Query + Repository + SOLID                                                                                                        |
| React + complex domain | MVVM hooks + Zustand + Clean Architecture slices                                                                                        |

Load the relevant subskill reference files from the tables above.

### Step 3 - Map Spec to Structure

For each spec entity/interface, produce a mapping table before writing code:

| Spec Claim                | Layer            | Implementation Unit    | Pattern            |
| ------------------------- | ---------------- | ---------------------- | ------------------ |
| `Card` data layout        | Data Spec §3     | `Card` model/entity    | Repository         |
| `POST /session`           | API Spec §3      | `SessionController`    | MVC / Handler      |
| State machine transitions | System Design §4 | `CardStateMachine`     | State Pattern      |
| Balance ceiling rule      | Tech Specs §9    | `BalanceCeilingPolicy` | Strategy Pattern   |
| Write buffer strategy     | System Design §9 | `WriteBufferService`   | Strategy + Command |

### Step 4 - Scaffold Frontend

Using the chosen frontend pattern (MVVM hooks / Flux-Redux / React Query):

1. Load the pattern reference file.
2. Generate folder structure from [./references/scaffolds/frontend-structure.md](./references/scaffolds/frontend-structure.md).
3. Create:
   - **Models** - map from Data Spec entities
   - **ViewModels / Stores / Hooks** - map from Tech Spec behaviors
   - **Pages / Components** - map from Product Spec user flows
   - **Services / Repositories** - map from API Spec endpoints
4. Annotate each class with `// Spec: [layer §section]` trace comments.

### Step 5 - Scaffold Backend

Using the chosen backend pattern (Clean Arch / Hexagonal / MVC / etc.):

1. Load the pattern reference file.
2. Generate folder structure from [./references/scaffolds/backend-structure.md](./references/scaffolds/backend-structure.md).
3. Create:
   - **Domain Entities** - from Data Spec
   - **Use Cases / Application Services** - from Tech Spec behavioral rules
   - **Controllers / Handlers** - from API Spec endpoints
   - **Repository interfaces + implementations** - from Data Spec storage model
   - **DTOs / Request-Response objects** - from API Spec payloads
   - **Policies / Rules** - from Security Spec and Product Spec constraints
4. Annotate each class with `// Spec: [layer §section]` trace comments.

### Step 6 - Apply SOLID Check

After scaffolding, review each generated unit:

- [ ] **S** - Does each class have one reason to change?
- [ ] **O** - Are extension points open (interfaces/abstractions) rather than modifying existing classes?
- [ ] **L** - Do subtypes honor contracts of their parent?
- [ ] **I** - Are interfaces focused (not forcing unused method implementations)?
- [ ] **D** - Do high-level modules depend on abstractions, not concretions?

See [./references/principles/solid.md](./references/principles/solid.md) for per-violation fix patterns.

### Step 7 - Spec Traceability Audit

After implementation:

| Spec Claim | Implemented In | Test Coverage |
| ---------- | -------------- | ------------- |
| ...        | ...            | ✅ / ❌       |

- Every public method should trace to a spec claim.
- Every spec constraint should have a corresponding validation or policy.
- Flag any code with no spec source as `// TODO: Spec missing`.

---

## Quick Reference - Pattern Selection Rules

```
UI state management    → MVVM hooks (Zustand) | Redux RTK (predictable) | React Query (server state)
Data access            → Repository Pattern (always)
Complex business rules → Strategy or Chain of Responsibility
Object creation        → Factory when >1 variant; Builder when >3 params
Event-driven systems   → Observer / Event Sourcing
Multi-step pipelines   → Chain of Responsibility / Decorator
Permission/auth rules  → Proxy / Decorator
State machines         → State Pattern (map directly from System Design §4)
Cross-cutting concerns → Decorator / Middleware
```

---

## Folder Conventions (this workspace)

```
src/
  features/<feature>/
    types/              # Data Spec → TypeScript interfaces
    repositories/       # API/Data Spec → IRepository + impl
    queries/            # React Query hooks (server state)
    viewmodels/         # MVVM ViewModel hooks (client UI state)
    store/              # Redux slice (shared UI state)
    components/         # Pages, organisms, molecules, atoms
    utils/              # Pure helpers, state machine helpers
  shared/
    components/         # Atomic Design system-wide atoms/molecules
    hooks/              # Shared utility hooks
    types/              # Common TypeScript types
  di/
    container.ts        # Composition root - interface bindings
```

Each generated file should begin with a spec trace header:

```
// Feature: <feature name>
// Spec: <layer> §<section> - <claim summary>
// Pattern: <design pattern applied>
```

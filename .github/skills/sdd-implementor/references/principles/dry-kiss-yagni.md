# DRY / KISS / YAGNI

## DRY - Don't Repeat Yourself

> Every piece of knowledge must have a single, unambiguous, authoritative representation.

**Violation signals:** Same validation logic in controller AND service AND model.

**Fix:** Extract into a shared `CardValidator` or domain method. One source of truth.

**SDD link:** If a rule appears in two spec sections, one should reference the other. Same in code.

---

## KISS - Keep It Simple, Stupid

> The simplest solution that satisfies the spec is correct. Complexity is a liability.

**Violation signals:** Abstract factory of factories for a feature with one implementation.

**Fix:** Implement the direct solution. Add abstraction only when a second variant actually appears.

**SDD link:** Do not add indirection beyond what the spec requires at this layer.

---

## YAGNI - You Aren't Gonna Need It

> Don't implement features or abstractions until the spec requires them.

**Violation signals:** "I'll add a plugin system in case we need it later."

**Fix:** Implement exactly what Layer 1–3 specs define. Flag future needs as ADRs, not code.

**SDD link:** Code generation gate - if there is no spec for it, don't build it.

---

## Checklist

- [ ] Is this logic duplicated elsewhere? → Extract it.
- [ ] Is this abstraction used in more than one place? → If no, remove it.
- [ ] Is this feature in a spec? → If no, don't build it.

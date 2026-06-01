# SOLID Principles

## S - Single Responsibility Principle

> A class should have one, and only one, reason to change.

**Violation signals:** A class imports both HTTP clients AND database adapters AND sends emails.

**Fix:** Extract into `CardRepository`, `EmailNotifier`, `CardController` - one concern each.

**SDD mapping:** Each Tech Spec behavioral rule → one class. Each API endpoint → one controller method.

---

## O - Open/Closed Principle

> Open for extension, closed for modification.

**Violation signals:** Adding a new payment method requires modifying `PaymentService` switch/if-else.

**Fix:** Define `IPaymentStrategy` interface; each payment method is a concrete strategy. Add new methods without touching existing code.

**SDD mapping:** System Design §constraints → use interfaces at every decision point defined in specs.

---

## L - Liskov Substitution Principle

> Subtypes must be substitutable for their base types without altering correctness.

**Violation signals:** `AdminCard extends Card` but throws `NotSupportedError` on `debit()`.

**Fix:** Don't inherit for code reuse - inherit only for behavioral contracts. Use composition otherwise.

**SDD mapping:** System Design §card-state-machine → all card types must honor state transition contracts.

---

## I - Interface Segregation Principle

> Clients should not be forced to depend on interfaces they do not use.

**Violation signals:** `ICardRepository` has `findByUid`, `sendEmail`, `generateReport`, `auditLog`.

**Fix:** Split into `ICardRepository`, `IEmailService`, `IReportGenerator`, `IAuditLogger`.

**SDD mapping:** API Spec domains → one interface per domain aggregate.

---

## D - Dependency Inversion Principle

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

**Violation signals:** Use case imports `PrismaClient` directly.

**Fix:** Use case depends on `ICardRepository` (interface). `PrismaCardRepository` implements it and is injected at the infrastructure layer.

**SDD mapping:** Tech Specs §interfaces define all repository/service interfaces. These are the abstractions.

---

## SOLID Quick Audit Checklist

After generating code, check each file:

- [ ] Does this file import from a lower/outer layer directly? (violates D)
- [ ] Does this file have more than one "reason to change"? (violates S)
- [ ] Are there switch/if-else blocks dispatching on type? (violates O → use Strategy or Factory)
- [ ] Is this interface used fully by all implementors? (violates I if not)
- [ ] Do subclasses honor all parent contracts? (violates L if not)

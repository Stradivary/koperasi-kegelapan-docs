# Chain of Responsibility Pattern

## Purpose

Pass a request along a chain of handlers. Each handler decides to process the request or pass it to the next handler. Decouples senders from receivers and allows dynamic chains.

## SDD Trigger

- Security Spec validation pipeline (auth → rate limit → permission → business rule).
- Tech Specs §5 - tamper detection validation: multiple sequential checks on card data.
- Any spec that defines ordered validation steps or middleware pipeline.
- NestJS Pipes and Guards are Chain of Responsibility implementations.

## Code Template (TypeScript - validation pipeline)

```ts
// Spec: Tech Specs §5 - Tamper detection validation chain
// Pattern: Chain of Responsibility

export interface ICardValidator {
  setNext(validator: ICardValidator): ICardValidator;
  validate(card: Card, context: ValidationContext): ValidationResult;
}

abstract class BaseCardValidator implements ICardValidator {
  private next: ICardValidator | null = null;

  setNext(validator: ICardValidator): ICardValidator {
    this.next = validator;
    return validator;
  }

  protected passToNext(card: Card, context: ValidationContext): ValidationResult {
    return this.next?.validate(card, context) ?? { valid: true };
  }
}

export class CardStatusValidator extends BaseCardValidator {
  validate(card: Card, context: ValidationContext): ValidationResult {
    // Spec: System Design §11 - card status enforcement
    if (card.status === "blocked") {
      return { valid: false, reason: "Card is blocked" };
    }
    return this.passToNext(card, context);
  }
}

export class BalanceCeilingValidator extends BaseCardValidator {
  validate(card: Card, context: ValidationContext): ValidationResult {
    // Spec: Tech Specs §9 - risk/financial limits
    if (card.balance > card.ceiling) {
      return { valid: false, reason: "Balance exceeds ceiling" };
    }
    return this.passToNext(card, context);
  }
}

export class HashChainValidator extends BaseCardValidator {
  validate(card: Card, context: ValidationContext): ValidationResult {
    // Spec: Tech Specs §5 - tamper detection
    if (!card.isHashChainValid()) {
      return { valid: false, reason: "Hash chain integrity failure" };
    }
    return this.passToNext(card, context);
  }
}

// Build the chain
const validationChain = new CardStatusValidator();
validationChain.setNext(new BalanceCeilingValidator()).setNext(new HashChainValidator());

const result = validationChain.validate(card, context);
```

## Rules

- Each handler has a single responsibility - one validation concern per class.
- Order of the chain matters - document which checks run first and why.
- The chain should terminate cleanly - either a handler processes it or a null object at the end returns a default result.

## Antipatterns

- One giant handler that checks everything (defeats the pattern).
- Chain that silently drops requests without indicating they were unhandled.

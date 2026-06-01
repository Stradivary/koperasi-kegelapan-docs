# Builder Pattern

## Purpose

Constructs complex objects step-by-step. Separates construction from representation. Use when an object has more than 3 constructor parameters or requires conditional assembly.

## SDD Trigger

- Any Data Spec entity with many optional fields.
- Constructing test fixtures or DTO objects with many fields.
- Building request payloads for API Spec endpoints with optional parameters.

## Code Template (TypeScript)

```ts
// Spec: Data Spec §card - Card initialisation
// Pattern: Builder

export class CardBuilder {
  private uid: string = "";
  private memberId: string = "";
  private balance: number = 0;
  private status: CardStatus = "initial";
  private ceiling: number = 500_000;
  private issuedAt: Date = new Date();

  withUid(uid: string): this {
    this.uid = uid;
    return this;
  }
  withMemberId(id: string): this {
    this.memberId = id;
    return this;
  }
  withBalance(amount: number): this {
    this.balance = amount;
    return this;
  }
  withStatus(status: CardStatus): this {
    this.status = status;
    return this;
  }
  withCeiling(ceiling: number): this {
    this.ceiling = ceiling;
    return this;
  }
  withIssuedAt(date: Date): this {
    this.issuedAt = date;
    return this;
  }

  build(): Card {
    if (!this.uid) throw new Error("Card uid is required");
    if (!this.memberId) throw new Error("Card memberId is required");
    return new Card(
      this.uid,
      this.memberId,
      this.balance,
      this.status,
      this.ceiling,
      this.issuedAt,
    );
  }
}

// Usage
const card = new CardBuilder()
  .withUid("A1B2C3")
  .withMemberId("MBR-001")
  .withCeiling(1_000_000)
  .build();
```

## When to Use vs. Factory

| Scenario                                 | Pattern              |
| ---------------------------------------- | -------------------- |
| >3 optional params, fluent assembly      | Builder              |
| Choose between concrete types at runtime | Factory              |
| Simple fixed-param construction          | Constructor directly |

## Antipatterns

- Builder with no validation in `build()` - missing required fields should throw, not silently produce invalid objects.
- Builder that leaks mutable internal state before `build()` is called.

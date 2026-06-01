# Template Method Pattern

## Purpose

Define the skeleton of an algorithm in a base class, deferring some steps to subclasses. Subclasses override specific steps without changing the overall algorithm structure.

## SDD Trigger

- Any Tech Spec behavior that has a fixed sequence of steps but variable implementations of individual steps.
- System Design §9 - write strategy: the write sequence is fixed (validate → prepare → write → verify) but implementation varies.
- Multiple report formats (System Design §16 infrastructure stack) that share the same generation pipeline.

## Code Template (TypeScript)

```ts
// Spec: System Design §9 - Write strategy (fixed sequence, variable impl)
// Pattern: Template Method

export abstract class CardWriteOperation {
  // Template method - defines the fixed algorithm
  async execute(card: Card, data: CardData): Promise<void> {
    await this.validate(card, data); // Step 1 - always runs
    await this.prepare(card, data); // Step 2 - always runs
    await this.write(card, data); // Step 3 - varies by strategy
    await this.verify(card); // Step 4 - always runs
  }

  protected async validate(card: Card, data: CardData): Promise<void> {
    // Spec: Tech Specs §5 - tamper detection before write
    if (!card.isHashChainValid()) throw new TamperDetectedError();
  }

  protected async verify(card: Card): Promise<void> {
    // Default: re-read and compare
    const readBack = await this.read(card.uid);
    if (!readBack) throw new WriteVerificationError();
  }

  // Abstract steps - subclasses must implement
  protected abstract prepare(card: Card, data: CardData): Promise<void>;
  protected abstract write(card: Card, data: CardData): Promise<void>;
  protected abstract read(uid: string): Promise<CardData | null>;
}

export class BufferedCardWrite extends CardWriteOperation {
  protected async prepare(card: Card, data: CardData): Promise<void> {
    // Spec: ADR §1 - AB buffer: prepare buffer A
    await card.prepareBufferA(data);
  }
  protected async write(card: Card, data: CardData): Promise<void> {
    await card.commitBufferA();
  }
  protected async read(uid: string): Promise<CardData | null> {
    return card.readBufferA();
  }
}
```

## When to Use vs. Strategy

| Pattern         | Use When                                                         |
| --------------- | ---------------------------------------------------------------- |
| Template Method | Algorithm skeleton is fixed, only steps vary; prefer inheritance |
| Strategy        | The entire algorithm is swappable; prefer composition            |

> Prefer **Strategy over Template Method** in TypeScript - composition is more testable than inheritance.

## Antipatterns

- Deep inheritance hierarchies (more than 2 levels) - switch to Strategy + composition.
- Template method that calls abstract methods conditionally based on flags.

# Strategy Pattern

## Purpose

Define a family of interchangeable algorithms/behaviors behind a common interface. Select the algorithm at runtime without changing the client.

## SDD Trigger

Any spec constraint that says "depending on X, the system does Y differently" → Strategy.

Examples from this workspace:

- System Design §9 write-strategy → `IWriteStrategy` with `BufferedWrite` and `DirectWrite`
- Tech Specs §9 risk limits → `ILimitPolicy` with `BalanceCeilingPolicy`, `DailyCapPolicy`
- ADR §1 AB buffer → `IBufferStrategy`

## Structure

```
IStrategy
  ├── ConcreteStrategyA
  └── ConcreteStrategyB

Context
  - strategy: IStrategy
  + execute(): void
```

## Code Template (TypeScript)

```ts
// Spec: System Design §9 - Write strategy
// Pattern: Strategy

export interface IWriteStrategy {
  write(card: Card, data: CardData): Promise<void>;
}

export class BufferedWriteStrategy implements IWriteStrategy {
  async write(card: Card, data: CardData): Promise<void> {
    // Spec: ADR §1 - AB buffer write
    await card.writeToBuffer(data);
  }
}

export class DirectWriteStrategy implements IWriteStrategy {
  async write(card: Card, data: CardData): Promise<void> {
    await card.writeDirectly(data);
  }
}

export class CardWriteService {
  constructor(private strategy: IWriteStrategy) {}

  async update(card: Card, data: CardData): Promise<void> {
    await this.strategy.write(card, data);
  }
}
```

## When to Use vs. Other Patterns

- Use **Strategy** when behavior varies per runtime condition.
- Use **Template Method** when the algorithm skeleton is fixed but steps vary.
- Use **Chain of Responsibility** when multiple handlers may process in sequence.

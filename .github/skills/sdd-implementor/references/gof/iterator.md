# Iterator Pattern

## Purpose

Provide a way to sequentially access elements of a collection without exposing its underlying representation.

## SDD Trigger

- Paginated API responses from API Spec - iterate pages without the caller managing cursors.
- Tech Specs §14 - transaction log: iterate log entries in hash-chain order without exposing the storage structure.
- Any Data Spec collection that has complex traversal logic (filtered, ordered, paginated).

## Code Template (TypeScript - Async Iterator for paginated API)

```ts
// Spec: API Spec §6 - Reconciliation log pagination
// Pattern: Iterator (async generator)

export async function* transactionLogIterator(
  repo: ITransactionLogRepository,
  cardUid: string,
  pageSize = 20,
): AsyncGenerator<TransactionLog> {
  let cursor: string | null = null;

  do {
    const page = await repo.listByCard(cardUid, { cursor, limit: pageSize });
    for (const entry of page.items) {
      yield entry;
    }
    cursor = page.nextCursor ?? null;
  } while (cursor !== null);
}

// Usage - caller never manages pagination
for await (const log of transactionLogIterator(repo, "CARD-001")) {
  console.log(log.amount, log.timestamp);
}
```

## Code Template (TypeScript - Iterable collection class)

```ts
// Pattern: Iterator (Symbol.iterator)

export class TransactionLogCollection implements Iterable<TransactionLog> {
  constructor(private readonly entries: TransactionLog[]) {}

  [Symbol.iterator](): Iterator<TransactionLog> {
    let index = 0;
    const entries = this.entries;
    return {
      next(): IteratorResult<TransactionLog> {
        if (index < entries.length) {
          return { value: entries[index++], done: false };
        }
        return { value: undefined as any, done: true };
      },
    };
  }

  // Convenience: iterate in reverse (newest first)
  *reversed(): Generator<TransactionLog> {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      yield this.entries[i];
    }
  }
}
```

## In Practice (TypeScript)

Most iteration needs in TypeScript are already served by:

- Array methods: `map`, `filter`, `reduce`, `flatMap`
- `for...of` with `Symbol.iterator`
- Async generators (`async function*`) for paginated or streamed data

Implement a custom Iterator class only when traversal logic is complex enough to warrant encapsulation.

## Antipatterns

- Exposing raw array indices to callers who then implement their own traversal.
- Iterator that modifies the underlying collection during iteration.

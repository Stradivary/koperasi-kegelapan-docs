# Dependency Injection

## Purpose

Supply dependencies to a class from outside rather than having the class construct them. Enables testing, swapping implementations, and enforces DIP from SOLID.

## SDD Trigger

- Every `IRepository`, `IService`, or `IPolicy` interface defined in Tech Specs → inject, never construct directly.
- Security Spec - crypto providers must be injectable to allow key rotation without code changes.

## Constructor Injection (preferred)

```ts
// Pattern: Dependency Injection (Constructor)

export class ProcessPaymentUseCase {
  constructor(
    private readonly cardRepo: ICardRepository, // Tech Specs §3
    private readonly logRepo: ITransactionLogRepository, // Tech Specs §14
    private readonly policy: ILimitPolicy, // Tech Specs §9
  ) {}
}
```

## DI Container Setup (NestJS)

```ts
@Module({
  providers: [
    ProcessPaymentUseCase,
    { provide: ICardRepository, useClass: PrismaCardRepository },
    { provide: ILimitPolicy, useClass: BalanceCeilingPolicy },
  ],
})
export class CardModule {}
```

## DI in React (Context + Custom Hook)

```ts
// Composition root - src/di/container.ts
import { PrismaCardRepository } from "../infrastructure/prisma-card-repository";
import { BalanceCeilingPolicy } from "../domain/policies/balance-ceiling-policy";

export const cardRepository: ICardRepository = new PrismaCardRepository();
export const limitPolicy: ILimitPolicy = new BalanceCeilingPolicy();
```

```tsx
// React Context provider wraps the app
const CardRepoContext = React.createContext<ICardRepository>(cardRepository);

export function useCardRepository(): ICardRepository {
  return React.useContext(CardRepoContext);
}
```

## Rules

- Inject interfaces, not concrete classes.
- Never import concrete infrastructure classes inside React components or hooks.
- Register bindings at the composition root (`src/di/container.ts` or NestJS module).
- In React: use Context + custom hooks for DI. In NestJS: use `@Injectable()` with module `providers`.
- Prefer constructor injection over property injection for required dependencies.

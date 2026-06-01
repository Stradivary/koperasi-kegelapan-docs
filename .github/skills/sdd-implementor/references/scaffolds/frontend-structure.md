# Frontend Scaffold Structure

Frontend stack: **React + TypeScript + Web**. All scaffolds use `.tsx`/`.ts` files.

Use this reference when scaffolding a frontend feature from SDD specs.

## React + TypeScript - Feature-Sliced Structure (recommended)

```
src/
  features/
    <feature>/                         # e.g. cardManagement
      api/
        cardApi.ts                     # Raw fetch/axios - API Spec endpoints
      queries/
        useCardQuery.ts                # React Query - server state
        useCardMutations.ts            # React Query mutations
      repositories/
        ICardRepository.ts             # Interface - no framework deps
        cardRepository.ts              # Implements ICardRepository via cardApi
      viewmodels/
        useCardViewModel.ts            # MVVM ViewModel hook (client UI state)
      store/
        cardSlice.ts                   # Redux slice for UI state (not server state)
        cardSelectors.ts
      components/
        CardDetailPage.tsx             # Page - Atomic: Template/Page
        CardDetail.tsx                 # Atomic: Organism
        CardStatusBadge.tsx            # Atomic: Molecule
        CardBalanceDisplay.tsx         # Atomic: Atom wrapper
      types/
        card.types.ts                  # Data Spec entity interfaces
      utils/
        cardState.helpers.ts           # State pattern helpers
  shared/
    components/                        # Atomic Design atoms/molecules shared globally
      ui/
        Badge.tsx
        Button.tsx
        Card.tsx
    hooks/
      useDebounce.ts
      usePagination.ts
    types/
      api.types.ts
      common.types.ts
    repositories/
      http.client.ts                   # Axios/fetch base instance
  di/
    container.ts                       # Composition root - bind interfaces to impls
```

## Layer Responsibilities

| Layer           | Imports from                 | Must NOT import               |
| --------------- | ---------------------------- | ----------------------------- |
| `types/`        | nothing                      | anything                      |
| `repositories/` | `types/`, `api/`             | React, components, store      |
| `queries/`      | `repositories/`, React Query | store, components             |
| `viewmodels/`   | `repositories/`, `types/`    | React components, JSX         |
| `store/`        | `types/`                     | repositories, queries         |
| `components/`   | all of the above             | nothing from sibling features |

## File Header Convention

Every generated file should start with:

```ts
// Feature: <feature-name>
// Spec:    <layer> §<section> - <claim>
// Pattern: <design pattern>
```

## When to Use React Query vs. Zustand/Redux

| Data Type                     | Tool                                    |
| ----------------------------- | --------------------------------------- |
| API responses, server state   | React Query (`useQuery`, `useMutation`) |
| UI state (modals, selections) | Zustand store or Redux slice            |
| Shared cross-feature UI state | Redux slice                             |
| Form state                    | React Hook Form + Zod                   |

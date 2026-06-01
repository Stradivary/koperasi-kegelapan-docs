# React Query (TanStack Query) - Server State Pattern

## Purpose

Manages **server state** (remote data fetching, caching, synchronisation, mutations) separately from **client/UI state** (Redux/Zustand). Eliminates manual loading/error state boilerplate for API calls.

## When to Use vs. Redux/Zustand

| Concern                                          | Tool                        |
| ------------------------------------------------ | --------------------------- |
| Remote data (API responses, cache)               | React Query                 |
| Client UI state (modals, selections, form steps) | Zustand / Redux             |
| Derived UI state from server data                | React Query `select` option |

## Layer Mapping from SDD

| Spec Layer           | React Query Role                      |
| -------------------- | ------------------------------------- |
| API Spec endpoints   | Query keys + `queryFn` / `mutationFn` |
| Tech Spec behaviors  | `onSuccess` / `onMutate` side effects |
| Data Spec entities   | Typed query return values             |
| System Design §trust | `staleTime` / `cacheTime` settings    |

## Folder Structure

```
src/features/<feature>/
  api/
    cardApi.ts             # Raw fetch/axios functions (no React Query here)
  queries/
    useCardQuery.ts        # useQuery hooks
    useCardMutations.ts    # useMutation hooks
  types/
    card.types.ts
```

## Query Template (React + TypeScript)

```ts
// Spec: API Spec §5 GET /cards/{uid}
// Pattern: React Query - server state

import { useQuery } from "@tanstack/react-query";
import type { ICardRepository } from "../repositories/ICardRepository";

export const CARD_KEYS = {
  all: ["cards"] as const,
  byUid: (uid: string) => ["cards", uid] as const,
};

export function useCardQuery(uid: string, repo: ICardRepository) {
  return useQuery({
    queryKey: CARD_KEYS.byUid(uid),
    queryFn: () => repo.findByUid(uid),
    staleTime: 30_000, // Spec: System Design §17 - time validation assumptions
    enabled: Boolean(uid),
  });
}
```

## Mutation Template

```ts
// Spec: API Spec §5 POST /cards/{uid}/block
// Pattern: React Query - mutation

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useBlockCardMutation(repo: ICardRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, reason }: { uid: string; reason: string }) => repo.block(uid, reason),
    onSuccess: (_, { uid }) => {
      // Invalidate so the card re-fetches with new status
      queryClient.invalidateQueries({ queryKey: CARD_KEYS.byUid(uid) });
    },
  });
}
```

## Rules

- Query functions (`queryFn`) must call repository interfaces, not raw `fetch` directly.
- Never store server state in Redux/Zustand - that creates two sources of truth.
- Use `queryKey` arrays that match the API Spec resource hierarchy (e.g. `['cards', uid]`).
- Set `staleTime` based on System Design freshness requirements (offline trust model §4).

## Antipatterns

- Mixing server state into Redux slices alongside client UI state.
- Writing `isLoading`, `data`, `error` state manually when React Query already provides them.
- Calling `fetch` directly inside components instead of through a repository.

## Code Template

```dart
// Spec: System Design §4 - Card state machine
// Pattern: BLoC

// Events
abstract class CardEvent {}
class LoadCard extends CardEvent {
  final String uid;
  LoadCard(this.uid);
}
class BlockCard extends CardEvent {
  final String reason;
  BlockCard(this.reason);
}

// States
abstract class CardState {}
class CardInitial extends CardState {}
class CardLoading extends CardState {}
class CardLoaded extends CardState {
  final Card card;
  CardLoaded(this.card);
}
class CardBlocked extends CardState {
  final String reason;
  CardBlocked(this.reason);
}
class CardError extends CardState {
  final String message;
  CardError(this.message);
}

// BLoC
class CardBloc extends Bloc<CardEvent, CardState> {
  final ICardRepository _repository;

  CardBloc(this._repository) : super(CardInitial()) {
    on<LoadCard>(_onLoadCard);
    on<BlockCard>(_onBlockCard);
  }

  Future<void> _onLoadCard(LoadCard event, Emitter<CardState> emit) async {
    emit(CardLoading());
    try {
      final card = await _repository.findByUid(event.uid);
      emit(CardLoaded(card));
    } catch (e) {
      emit(CardError(e.toString()));
    }
  }
}
```

## Rules

- One BLoC per feature screen (single responsibility).
- BLoC must NOT import Flutter widgets.
- Inject repository via constructor (DIP).
- States map directly to System Design §4 state machine entries.

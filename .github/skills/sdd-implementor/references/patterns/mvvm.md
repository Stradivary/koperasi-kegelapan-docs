# MVVM - Model-View-ViewModel (React + TypeScript)

## Purpose

Separates UI rendering (View) from UI logic (ViewModel hook) from data (Model/Repository). The ViewModel is a **custom React hook** that encapsulates state and actions; the component binds to it reactively.

## Layer Mapping from SDD

| Spec Layer              | MVVM Layer         | Implementation                                       |
| ----------------------- | ------------------ | ---------------------------------------------------- |
| Data Spec entities      | Model              | TypeScript `interface Card`, `interface Transaction` |
| Tech Spec behaviors     | ViewModel          | `useCardViewModel`, `useSessionViewModel` hooks      |
| Product Spec user flows | View               | React pages and components                           |
| API Spec endpoints      | Repository/Service | `cardRepository.ts`, `sessionService.ts`             |

## Folder Structure

```
src/features/<feature>/
  types/
    card.types.ts              # Data Spec entity interface
  repositories/
    ICardRepository.ts         # Interface - no framework deps
    cardRepository.ts          # Implementation (fetch / RTK Query)
  viewmodels/
    useCardViewModel.ts        # MVVM ViewModel hook
  components/
    CardDetailPage.tsx         # View - consumes ViewModel hook
    CardStatusBadge.tsx        # Pure presentational component
```

## ViewModel Hook Rules (SOLID-aligned)

- ViewModel hook must NOT contain JSX - no UI code.
- Exposes only state and named dispatch functions - never raw state setters.
- One ViewModel hook per page/feature (single responsibility).
- ViewModel calls repository interfaces, never concrete `fetch` calls directly (DIP).
- Returns a strongly typed object, not a loose tuple.

## Code Template (React + TypeScript + Zustand)

```ts
// Spec: Tech Specs §6 - Card session state
// Pattern: MVVM - ViewModel hook (Zustand)

import { create } from "zustand";
import type { ICardRepository } from "../repositories/ICardRepository";

interface CardViewState {
  status: "idle" | "loading" | "loaded" | "error";
  card: Card | null;
  error: string | null;
}

interface CardViewModel extends CardViewState {
  loadCard: (uid: string) => Promise<void>;
  blockCard: (uid: string, reason: string) => Promise<void>;
}

export function createCardViewModel(repo: ICardRepository) {
  return create<CardViewModel>((set) => ({
    status: "idle",
    card: null,
    error: null,

    loadCard: async (uid) => {
      set({ status: "loading" });
      try {
        const card = await repo.findByUid(uid);
        set({ status: "loaded", card });
      } catch (e) {
        set({ status: "error", error: String(e) });
      }
    },

    blockCard: async (uid, reason) => {
      // Spec: System Design §15 - blocked status rules
      await repo.block(uid, reason);
      set((s) => ({ card: s.card ? { ...s.card, status: "blocked" } : null }));
    },
  }));
}
```

## Code Template (React + TypeScript + useReducer)

```ts
// Spec: Tech Specs §6 - Card session state
// Pattern: MVVM - ViewModel hook (useReducer)

type CardState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; card: Card }
  | { status: "error"; message: string };

type CardAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; card: Card }
  | { type: "LOAD_ERROR"; message: string }
  | { type: "BLOCK" };

function cardReducer(state: CardState, action: CardAction): CardState {
  switch (action.type) {
    case "LOAD_START":
      return { status: "loading" };
    case "LOAD_SUCCESS":
      return { status: "loaded", card: action.card };
    case "LOAD_ERROR":
      return { status: "error", message: action.message };
    case "BLOCK":
      if (state.status !== "loaded") return state;
      return { ...state, card: { ...state.card, status: "blocked" } };
    default:
      return state;
  }
}

export function useCardViewModel(repo: ICardRepository) {
  const [state, dispatch] = useReducer(cardReducer, { status: "idle" });

  const loadCard = useCallback(
    async (uid: string) => {
      dispatch({ type: "LOAD_START" });
      try {
        const card = await repo.findByUid(uid);
        dispatch({ type: "LOAD_SUCCESS", card });
      } catch (e) {
        dispatch({ type: "LOAD_ERROR", message: String(e) });
      }
    },
    [repo],
  );

  return { state, loadCard };
}
```

## Antipatterns to Avoid

- Business logic (`fetch`, validation, rule enforcement) inside React components.
- Direct `fetch()` or `axios` calls inside ViewModel hooks - use Repository.
- Sharing one ViewModel hook across unrelated pages.
- Returning raw state setters from the hook - always wrap in named functions.

# Flux / Redux Pattern

## Purpose

Unidirectional data flow: UI dispatches Actions → Reducers produce new State → UI re-renders from State. Prevents spaghetti state mutations across components.

## Layer Mapping from SDD

| Spec Layer                  | Redux Layer                        |
| --------------------------- | ---------------------------------- |
| Data Spec entities          | State shape / slice                |
| Tech Spec behaviors         | Thunks / Sagas / Effects           |
| API Spec endpoints          | RTK Query endpoints / async thunks |
| System Design state machine | Reducer transitions                |
| Product Spec user flows     | Component → dispatch calls         |

## Folder Structure (RTK - Redux Toolkit)

```
src/features/<feature>/
  store/
    cardSlice.ts          # State + reducers + actions
    cardSelectors.ts      # Memoized selectors
    cardThunks.ts         # Async operations → API Spec calls
  api/
    cardApi.ts            # RTK Query service
```

## Slice Template (TypeScript + RTK)

```ts
// Spec: System Design §4 - Card state machine
// Pattern: Flux/Redux - Slice

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CardState {
  status: "idle" | "loading" | "loaded" | "error";
  card: Card | null;
  error: string | null;
}

const initialState: CardState = { status: "idle", card: null, error: null };

export const cardSlice = createSlice({
  name: "card",
  initialState,
  reducers: {
    cardLoaded: (state, action: PayloadAction<Card>) => {
      state.status = "loaded";
      state.card = action.payload;
    },
    cardBlocked: (state, action: PayloadAction<string>) => {
      // Spec: System Design §15 - blocked status rules
      if (state.card) state.card.status = "blocked";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCardThunk.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loadCardThunk.fulfilled, (state, action) => {
        state.status = "loaded";
        state.card = action.payload;
      });
  },
});
```

## Rules

- Reducers must be pure functions (no side effects, no API calls).
- Async logic goes in Thunks/Sagas/Effects - not in reducers or components.
- Selectors should be memoized (`createSelector`) for derived state.
- State shape maps directly to Data Spec entity structure.

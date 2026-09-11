import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';

import { tokenStorage } from '@/lib/token-storage';

import { api } from './api';
import { authSlice, signedIn, signedOut } from './auth-slice';

// Persistance du jeton : ecrit a la connexion ; efface a la deconnexion, avec le cache API
// (pour ne jamais afficher les donnees d'un compte precedent).
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: signedIn,
  effect: (action) => tokenStorage.set(action.payload),
});
listener.startListening({
  actionCreator: signedOut,
  effect: async (_action, { dispatch }) => {
    await tokenStorage.clear();
    dispatch(api.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listener.middleware).concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

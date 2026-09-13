import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { tokenStorage, type StoredSession } from '@/lib/token-storage';

type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  refreshToken: string | null;
}

const initialState: AuthState = { status: 'restoring', token: null, refreshToken: null };

// Relit la session persistee au demarrage de l'app.
export const restoreSession = createAsyncThunk('auth/restoreSession', () => tokenStorage.get());

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Connexion, inscription et renouvellement silencieux passent par ici : la session
    // persistee est ainsi toujours le dernier couple de jetons recu.
    signedIn: (state, action: PayloadAction<StoredSession>) => {
      state.status = 'signedIn';
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
    signedOut: (state) => {
      state.status = 'signedOut';
      state.token = null;
      state.refreshToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.token = action.payload?.token ?? null;
        state.refreshToken = action.payload?.refreshToken ?? null;
        state.status = action.payload ? 'signedIn' : 'signedOut';
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = 'signedOut';
      });
  },
});

export const { signedIn, signedOut } = authSlice.actions;

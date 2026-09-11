import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { tokenStorage } from '@/lib/token-storage';

type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  token: string | null;
}

const initialState: AuthState = { status: 'restoring', token: null };

// Relit le jeton persiste au demarrage de l'app.
export const restoreSession = createAsyncThunk('auth/restoreSession', () => tokenStorage.get());

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn: (state, action: PayloadAction<string>) => {
      state.status = 'signedIn';
      state.token = action.payload;
    },
    signedOut: (state) => {
      state.status = 'signedOut';
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.token = action.payload;
        state.status = action.payload ? 'signedIn' : 'signedOut';
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = 'signedOut';
      });
  },
});

export const { signedIn, signedOut } = authSlice.actions;

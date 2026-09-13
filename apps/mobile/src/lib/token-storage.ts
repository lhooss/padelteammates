import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'padelteammates.token';
const REFRESH_KEY = 'padelteammates.refreshToken';

export interface StoredSession {
  token: string; // jeton d'acces, courte duree
  refreshToken: string; // jeton de session de cet appareil
}

// Session conservee dans le trousseau (iOS Keychain / Android Keystore).
export const tokenStorage = {
  async get(): Promise<StoredSession | null> {
    const [token, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    // Sans jeton de session, le jeton d'acces ne survivrait pas a son expiration :
    // on repart d'une session vide plutot que d'afficher une app qui tombera en panne.
    return token && refreshToken ? { token, refreshToken } : null;
  },

  async set(session: StoredSession): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, session.token),
      SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken),
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  },
};

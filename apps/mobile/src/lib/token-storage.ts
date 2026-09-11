import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'padelteammates.token';

// Jeton JWT conserve dans le trousseau (iOS Keychain / Android Keystore).
export const tokenStorage = {
  get: (): Promise<string | null> => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string): Promise<void> => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: (): Promise<void> => SecureStore.deleteItemAsync(TOKEN_KEY),
};

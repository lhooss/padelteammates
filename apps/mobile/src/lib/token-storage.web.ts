// SecureStore n'existe pas sur le web : on se rabat sur localStorage (usage dev / demo).
// Absent lors du rendu statique : chaque acces est protege.
const TOKEN_KEY = 'padelteammates.token';
const REFRESH_KEY = 'padelteammates.refreshToken';

export interface StoredSession {
  token: string; // jeton d'acces, courte duree
  refreshToken: string; // jeton de session de cet appareil
}

type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function storage(): WebStorage | undefined {
  try {
    return (globalThis as { localStorage?: WebStorage }).localStorage;
  } catch {
    return undefined;
  }
}

export const tokenStorage = {
  get: async (): Promise<StoredSession | null> => {
    const store = storage();
    const token = store?.getItem(TOKEN_KEY);
    const refreshToken = store?.getItem(REFRESH_KEY);
    // Sans jeton de session, le jeton d'acces ne survivrait pas a son expiration.
    return token && refreshToken ? { token, refreshToken } : null;
  },

  set: async (session: StoredSession): Promise<void> => {
    const store = storage();
    store?.setItem(TOKEN_KEY, session.token);
    store?.setItem(REFRESH_KEY, session.refreshToken);
  },

  clear: async (): Promise<void> => {
    const store = storage();
    store?.removeItem(TOKEN_KEY);
    store?.removeItem(REFRESH_KEY);
  },
};

// SecureStore n'existe pas sur le web : on se rabat sur localStorage (usage dev / demo).
// Absent lors du rendu statique : chaque acces est protege.
const TOKEN_KEY = 'padelteammates.token';

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
  get: async (): Promise<string | null> => storage()?.getItem(TOKEN_KEY) ?? null,
  set: async (token: string): Promise<void> => storage()?.setItem(TOKEN_KEY, token),
  clear: async (): Promise<void> => storage()?.removeItem(TOKEN_KEY),
};

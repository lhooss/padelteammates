import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { API_URL } from '@/config/api-url';

// Message lisible a partir d'une erreur RTK Query (format API : { error: { code, message } }).
export function errorMessage(error: FetchBaseQueryError | SerializedError | undefined): string | null {
  if (!error) return null;
  if ('status' in error) {
    if (error.status === 'FETCH_ERROR') return `Impossible de joindre le serveur (${API_URL}).`;
    const message = (error.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (message) return readableValidationMessage(message);
    return `Erreur ${String(error.status)}`;
  }
  return error.message ?? 'Erreur inattendue';
}

// Les erreurs de validation Zod de l'API arrivent en JSON : { champ: [messages] }.
function readableValidationMessage(message: string): string {
  try {
    const fields = JSON.parse(message) as Record<string, string[]>;
    return Object.values(fields).flat()[0] ?? message;
  } catch {
    return message;
  }
}

// Premier message par champ, a partir de `zodError.flatten().fieldErrors`.
export function firstFieldErrors(fieldErrors: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const first = messages?.[0];
    if (first) out[field] = first;
  }
  return out;
}

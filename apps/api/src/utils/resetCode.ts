import { createHash, randomInt } from 'node:crypto';

// Duree de vie volontairement courte : un code de 6 chiffres n'offre qu'un million
// de combinaisons, sa valeur tient a sa breve existence.
export const RESET_CODE_TTL_MINUTES = 15;
// Au-dela, la demande est brulee : six chiffres se devineraient sinon.
export const RESET_MAX_ATTEMPTS = 5;

// Code a 6 chiffres, tire avec un generateur cryptographique (pas Math.random).
export function createResetCode(): { code: string; hash: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return { code, hash: hashResetCode(code) };
}

// Seule l'empreinte est stockee : une lecture de la base ne donne pas les codes.
export function hashResetCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

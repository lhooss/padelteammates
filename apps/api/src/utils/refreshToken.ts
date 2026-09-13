import { createHash, randomBytes } from 'node:crypto';

// Jeton opaque de 256 bits. Seule son empreinte est conservee en base : meme lue,
// la table ne permet pas de rejouer une session.
export function createRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashRefreshToken(raw) };
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
